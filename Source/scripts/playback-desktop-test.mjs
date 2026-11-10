import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { defaults } from '../src/types.ts';
const b = await chromium.connectOverCDP(debugUrl());
const page = b.contexts()[0].pages()[0];
const logs = [];
page.on('console', (m) => logs.push(m.text()));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
await page.evaluate(() => {
  window.__audioProbe = [];
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (destination, ...args) {
    if (destination instanceof AudioDestinationNode) {
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 1024;
      window.__audioProbe.push({ context: this.context, analyser, node: this });
      connect.call(this, analyser);
      connect.call(analyser, destination);
      return destination;
    }
    return connect.call(this, destination, ...args);
  };
});
const fixture = JSON.parse(await fs.readFile(path.join(qaDir, 'Validation.cutline'), 'utf8'));
const asset = fixture.assets.find((a) => a.hasAudio);
const clip = fixture.tracks.flatMap((t) => t.clips).find((c) => c.mediaId === asset.id);
const project = {
  ...fixture,
  id: 'playback-qa',
  name: 'Playback QA',
  assets: [asset],
  tracks: [
    {
      ...fixture.tracks.find((t) => t.kind === 'video'),
      clips: [
        {
          ...clip,
          id: 'audible',
          start: 0,
          duration: 90,
          sourceIn: 0,
          audioEnabled: true,
          props: defaults,
          title: null,
          transition: null,
        },
      ],
    },
  ],
};
const file = path.join(qaDir, 'Playback.cutline');
await fs.writeFile(file, JSON.stringify(project));
await call('open_project', { path: file });
if (await page.locator('.launcher').count())
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const signal = () =>
  page.evaluate(() =>
    Math.max(
      0,
      ...window.__audioProbe.map(({ analyser }) => {
        const a = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(a);
        return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) / a.length);
      }),
    ),
  );
async function setRange(label, value) {
  await page.getByLabel(label, { exact: true }).evaluate((input, n) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, n);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
}
async function playFromStart(source = false) {
  if (await page.locator('.play-button svg.lucide-pause').count())
    await page.locator('.play-button').click();
  if (source) await setRange('Source position', 0);
  else {
    await page.locator('.player-status').click();
    await page.keyboard.press('Home');
  }
  await page.locator('.play-button').click();
  await expect.poll(signal, { timeout: 6000, intervals: [80, 100] }).toBeGreaterThan(0.01);
}
await playFromStart();
await expect
  .poll(() =>
    page.getByRole('meter', { name: 'Preview audio level' }).getAttribute('aria-valuenow'),
  )
  .not.toBe('0');
await page.getByTitle('Mute track', { exact: true }).click();
await expect.poll(signal).toBeLessThan(0.001);
await page.getByTitle('Unmute track', { exact: true }).click();
await expect.poll(signal).toBeGreaterThan(0.01);
await page.locator('.play-button').click();
const before = (await call('startup')).snapshot;
await page.locator('.media-image').first().click();
await expect(page.locator('.preview-panel .panel-heading')).toContainText('Source');
await expect(page.locator('video[controls],audio[controls]')).toHaveCount(0);
await playFromStart(true);
await page.getByTitle('Mute preview', { exact: true }).click();
await expect.poll(signal).toBeLessThan(0.001);
await page.getByTitle('Unmute preview', { exact: true }).click();
await expect.poll(signal).toBeGreaterThan(0.01);
await setRange('Preview volume', 0);
await expect.poll(signal).toBeLessThan(0.001);
await setRange('Preview volume', 100);
await playFromStart(true);
await page.locator('.play-button').click();
await setRange('Source position', 30);
await page.keyboard.press('ArrowRight');
await expect(page.getByLabel('Source position', { exact: true })).toHaveValue('31');
await page.getByLabel('Source position', { exact: true }).focus();
await page.keyboard.press('Space');
await expect.poll(signal).toBeGreaterThan(0.01);
await page.keyboard.press('Space');
await expect(page.locator('.play-button svg.lucide-play')).toBeVisible();
await page.getByLabel('Preview volume', { exact: true }).focus();
await page.keyboard.press('Space');
await expect.poll(signal).toBeGreaterThan(0.01);
await page.keyboard.press('Space');

const unchanged = (await call('startup')).snapshot;
for (const key of ['project', 'revision', 'dirty', 'canUndo', 'canRedo'])
  expect(unchanged[key]).toEqual(before[key]);
await expect.poll(() => page.evaluate(() => window.__audioProbe.length)).toBe(1);
await page.getByTitle('Full-screen preview', { exact: true }).click();
await expect
  .poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('preview-panel')))
  .toBe(true);
await expect(page.locator('.play-button')).toBeVisible();
await page.keyboard.press('Escape');
await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
const back = page.getByRole('button', { name: 'Back to timeline', exact: true });
if (await back.count()) await back.click();
await playFromStart();
await page.locator('.play-button').click();
await page.locator('[data-clip-id="audible"]').click();
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await page
  .locator('.filter-preset')
  .filter({ has: page.locator('strong', { hasText: /^Original$/ }) })
  .click();
await expect.poll(signal).toBeGreaterThan(0.01);
await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
await page.getByRole('button', { name: 'Effects', exact: true }).click();
await expect.poll(signal).toBeLessThan(0.001);
await page
  .locator('.video-effect-preset')
  .filter({ has: page.locator('strong', { hasText: /^RGB split$/ }) })
  .click();
await expect.poll(signal).toBeGreaterThan(0.01);
await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
// The handle must remain over the sticky ruler, including while vertically scrolling tracks.
await page.locator('.player-status').click();
await page.keyboard.press('Home');
const handle = page.getByRole('button', { name: 'Timeline playhead', exact: true });
await expect(handle).toBeVisible();
const bounds = await handle.boundingBox();
await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + 8);
await page.mouse.down();
await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + 8, { steps: 6 });
await page.mouse.up();
await expect(page.locator('.player-status>span:first-child')).not.toHaveText('00:00:00:00');
const held = await handle.boundingBox();
await page.mouse.move(held.x + held.width / 2, held.y + 8);
await page.mouse.down();
await page.keyboard.press('Escape');
const cancelled = await page.locator('.player-status>span:first-child').textContent();
await page.mouse.move(held.x + held.width / 2 + 100, held.y + 8, { steps: 4 });
await page.mouse.up();
await expect(page.locator('.player-status>span:first-child')).toHaveText(cancelled);
const afterDrag = (await call('startup')).snapshot;
expect(afterDrag.revision).toBe(unchanged.revision);
for (let i = 0; i < 9; i++) await call('edit', { operation: { type: 'add_track', kind: 'video' } });
await page.locator('.timeline-scroll').evaluate((el) => (el.scrollTop = 180));
await expect(handle).toBeVisible();
const hit = await handle.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return document.elementFromPoint(r.x + r.width * 0.75, r.y + 8) === el;
});
expect(hit).toBe(true);
for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(size);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(qaDir, `playback-controls-${size.width}.png`) });
}
await call('new_project', {
  name: 'Audio restart',
  width: 640,
  height: 360,
  fps: { num: 30, den: 1 },
});
await call('open_project', { path: file });
await playFromStart();
await page.locator('.play-button').click();
const directFile = path.join(qaDir, 'Playback-direct.cutline');
await fs.writeFile(
  directFile,
  JSON.stringify({
    ...project,
    id: 'playback-direct',
    assets: [{ ...asset, previewPath: asset.path }],
  }),
);
await call('open_project', { path: directFile });
await playFromStart();
await page.locator('.play-button').click();
expect(await page.evaluate(() => window.__audioProbe.length)).toBe(1);
expect(errors).toEqual([]);
expect(
  logs.filter((message) =>
    /CORS|AudioContext was not allowed|MediaElementAudioSource.*zero/i.test(message),
  ),
).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'playback-controls-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'measured timeline/source/effect-preview audio output',
        'track mute',
        'master mute/volume',
        'audio meter',
        'shared source transport',
        'frame stepping',
        'no native controls',
        'fullscreen transport',
        'source history isolation',
        'source/timeline/project switching',
        'single audio context',
        'visible draggable playhead',
        'vertical scrolling',
        '1366/1920 layouts',
      ],
    },
    null,
    2,
  ),
);
console.log(
  'PASS: real audio signal, shared editor controls, mute/volume, source isolation, and visible draggable playhead',
);
await b.close();
