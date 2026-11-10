import { qaDir, outputPath, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Run only in an isolated test profile, with the smoke example's Validation.cutline present.
const qa = qaDir;
const project = JSON.parse(await fs.readFile(path.join(qa, 'Validation.cutline'), 'utf8'));
const main = project.tracks.find(
  (t) => t.kind === 'video' && t.clips.some((c) => c.mediaId && !c.title),
);
const audio = project.tracks.find((t) => t.kind === 'audio');
const original = structuredClone(main.clips[0]);
const originalAudio = structuredClone(audio.clips[0]);
main.clips = ['First', 'Middle', 'Last'].map((name, i) => ({
  ...structuredClone(original),
  id: `mag-video-${i}`,
  name,
  start: i * 60,
  duration: 30,
  sourceIn: i,
  link: `mag-link-${i}`,
  transition: null,
}));
audio.clips = main.clips.map((c, i) => ({
  ...structuredClone(originalAudio),
  id: `mag-audio-${i}`,
  name: c.name,
  start: c.start,
  duration: c.duration,
  sourceIn: c.sourceIn,
  link: c.link,
  transition: null,
}));
const overlay = project.tracks.find((t) => t.kind === 'video' && t !== main);
overlay.clips = overlay.clips
  .slice(0, 1)
  .map((c) => ({ ...c, start: 45, duration: 30, link: null }));
project.tracks = [overlay, main, audio];
project.id = 'magnetic-native-test';
project.name = 'Magnetic timeline';
project.magneticTimeline = false;
const fixture = path.join(qa, 'Magnetic-validation.cutline');
await fs.writeFile(fixture, JSON.stringify(project, null, 2));
const browser = await chromium.connectOverCDP(debugUrl(9228));
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const state = async () => (await call('startup')).snapshot;
const starts = (s, id) =>
  s.project.tracks
    .find((t) => t.id === id)
    .clips.map((c) => c.start)
    .sort((a, b) => a - b);
const wait = () => page.waitForTimeout(120);
const press = async (keys) => {
  await page.locator('.timeline-caption').click();
  await page.keyboard.press(keys);
  await wait();
};
const magnet = page.locator('.timeline [data-action="magnetic_timeline"]');
const check = async (expected) => {
  const s = await state();
  assert.deepEqual(starts(s, main.id), expected);
  assert.deepEqual(starts(s, audio.id), expected);
  assert.equal(s.project.tracks[0].clips[0].start, 45);
  return s;
};
await page.waitForSelector('.launcher');
await call('open_project', { path: fixture });
await page.locator('.launcher-top>button').click();
assert.equal((await state()).project.magneticTimeline, false);
await magnet.hover();
await page.getByRole('tooltip').waitFor();
assert.match(await page.getByRole('tooltip').innerText(), /Magnetic timeline.*main track magnet/s);
assert.match(await page.getByRole('tooltip').innerText(), /Shift\+M/);
await magnet.click();
await wait();
await check([0, 30, 60]);
assert.equal(await magnet.getAttribute('aria-pressed'), 'true');
await page.getByRole('button', { name: 'Middle, ' + main.name, exact: true }).click();
await page.keyboard.press('Delete');
await wait();
await check([0, 30]);
await press('Control+z');
await check([0, 30, 60]);
await press('Control+y');
await check([0, 30]);
await press('Control+z');
// Exercise the real trim handle, not just a backend edit.
await press('s');
const first = page.getByRole('button', { name: 'First, ' + main.name, exact: true });
const edge = await first.locator('.trim-handle.right').boundingBox();
await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2);
await page.mouse.down();
await page.mouse.move(edge.x + edge.width / 2 - 15, edge.y + edge.height / 2, { steps: 5 });
await page.mouse.up();
await wait();
let s = await check([0, 20, 50]);
assert.equal(
  s.project.tracks.find((t) => t.id === main.id).clips.find((c) => c.id === 'mag-video-0').duration,
  20,
);
await press('Control+z');
await check([0, 30, 60]);
// A split retains content; deleting the cut piece closes its gap.
await press('c');
const middle = page.getByRole('button', { name: 'Middle, ' + main.name, exact: true });
const box = await middle.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + 30);
await wait();
await check([0, 30, 45, 60]);
await press('v');
await page.keyboard.press('Delete');
await wait();
await check([0, 30, 45]);
await press('Control+z');
await press('Control+z');
await check([0, 30, 60]);
// A main-track insert shifts its neighbors rather than covering them.
await call('edit', {
  operation: { type: 'add_clip', media_id: original.mediaId, track_id: main.id, start: 30 },
});
await wait();
s = await state();
assert.deepEqual(starts(s, main.id), [0, 30, 120, 150]);
assert.deepEqual(starts(s, audio.id), [0, 120, 150]);
await press('Control+z');
await check([0, 30, 60]);
// Disabled mode keeps manual gaps, and re-enabling closes them immediately.
await press('Shift+m');
await page.getByRole('button', { name: 'Middle, ' + main.name, exact: true }).click();
await page.keyboard.press('Delete');
await wait();
await check([0, 60]);
await press('Shift+m');
await check([0, 30]);
const saved = path.join(qa, 'Magnetic-saved.cutline');
await call('save', { path: saved });
await call('open_project', { path: saved });
await wait();
assert.equal((await state()).project.magneticTimeline, true);
await check([0, 30]);
// The new action participates in the same keybinding settings as every other tool.
await press('Control+Comma');
await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
const settings = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
await settings.getByLabel('Search shortcuts').fill('magnetic');
const row = settings.locator('[data-command="magnetic_timeline"]');
await row.getByRole('button', { name: /Change .* shortcut 1/ }).click();
await page.keyboard.press('Control+Alt+m');
await wait();
await settings.getByRole('button', { name: 'Save shortcuts', exact: true }).click();
await press('Control+Alt+m');
assert.equal((await state()).project.magneticTimeline, false);
await press('Shift+m');
assert.equal((await state()).project.magneticTimeline, false);
await press('Control+Alt+m');
await page.setViewportSize({ width: 1366, height: 768 });
await magnet.hover();
await page.getByRole('tooltip').waitFor();
assert.match(await page.getByRole('tooltip').innerText(), /Ctrl\+Alt\+M/);
const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
if (await dismiss.count()) await dismiss.click();
await page.screenshot({ path: outputPath('Shrapwill-magnetic-timeline.png') });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
assert.deepEqual(errors, []);
await fs.writeFile(
  path.join(qa, 'magnetic-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'enable existing gaps',
        'hover tooltip',
        'ordinary delete',
        'linked audio',
        'overlay timing unchanged',
        'undo/redo',
        'pointer trim',
        'razor cut and delete',
        'nonoverlapping insertion',
        'disable and reenable',
        'save and reopen',
        'custom binding and tooltip',
        '1366x768 layout',
      ],
      errors,
    },
    null,
    2,
  ),
);
console.log(
  'PASS: magnetic main-track editing, linked audio, project persistence and custom shortcuts',
);
await browser.close();
