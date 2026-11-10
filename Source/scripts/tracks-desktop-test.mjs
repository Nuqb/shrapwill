import { qaDir, outputPath, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Use an isolated profile and the smoke example's generated Validation.cutline.
const qa = qaDir,
  browser = await chromium.connectOverCDP(debugUrl(9230));
const page = browser.contexts()[0].pages()[0],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const state = async () => (await call('startup')).snapshot;
const wait = () => page.waitForTimeout(140);
const selector = (name) => page.getByRole('button', { name: `Select track ${name}`, exact: true });
const clip = (id) => page.locator(`[data-clip-id="${id}"]`);
const menu = (name) => page.getByRole('menu', { name, exact: true });
const press = async (keys) => {
  await page.locator('.timeline-caption').click();
  await page.keyboard.press(keys);
  await wait();
};
const count = (s) => s.project.tracks.flatMap((t) => t.clips).length;
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForSelector('.launcher');
await call('open_project', { path: path.join(qa, 'Validation.cutline') });
await page.locator('.launcher-top>button').click();
await page.waitForSelector('.timeline-clip');
const original = await state(),
  main = original.project.tracks.find((t) => t.kind === 'video' && t.clips.some((c) => !c.title)),
  audio = original.project.tracks.find((t) => t.kind === 'audio'),
  titles = original.project.tracks.find((t) => t.clips.some((c) => c.title));
// Empty lane space and header padding are full-track selectors; controls retain their actions.
const laneOf = (id) => page.locator(`[data-track="${id}"] .track-lane`);
const frameBefore = await page.locator('.ruler-corner').innerText(),
  revisionBefore = (await state()).revision;
await laneOf(main.id).click({ position: { x: 600, y: 35 } });
assert.equal(await selector(main.name).getAttribute('aria-pressed'), 'true');
await laneOf(audio.id).click({ position: { x: 600, y: 35 }, modifiers: ['Control'] });
assert.equal(await selector(audio.name).getAttribute('aria-pressed'), 'true');
assert.equal(await selector(main.name).getAttribute('aria-pressed'), 'true');
await laneOf(audio.id).click({ position: { x: 600, y: 35 }, modifiers: ['Control'] });
assert.equal(await selector(audio.name).getAttribute('aria-pressed'), 'false');
assert.equal(await page.locator('.ruler-corner').innerText(), frameBefore);
assert.equal((await state()).revision, revisionBefore);
await page.locator(`[data-track="${audio.id}"] .track-head`).click({ position: { x: 130, y: 65 } });
assert.equal(await selector(audio.name).getAttribute('aria-pressed'), 'true');
assert.equal(await selector(main.name).getAttribute('aria-pressed'), 'false');
await selector(main.name).click();
await page.getByRole('button', { name: `Lock ${audio.name}`, exact: true }).click();
await wait();
assert.equal(await selector(main.name).getAttribute('aria-pressed'), 'true');
assert.equal(await selector(audio.name).getAttribute('aria-pressed'), 'false');
await page.getByRole('button', { name: `Unlock ${audio.name}`, exact: true }).click();
await wait();
await selector(main.name).click();
assert.equal(await selector(main.name).getAttribute('aria-pressed'), 'true');
await selector(audio.name).click({ modifiers: ['Control'] });
assert.equal(await selector(audio.name).getAttribute('aria-pressed'), 'true');
assert.equal(await selector(main.name).getAttribute('aria-pressed'), 'true');
await selector(audio.name).click({ modifiers: ['Control'] });
assert.equal(await selector(audio.name).getAttribute('aria-pressed'), 'false');
await selector(audio.name).click({ modifiers: ['Control'] });
await selector(main.name).click({ button: 'right' });
await menu('Track actions').waitFor();
assert.match(await menu('Track actions').innerText(), /2 tracks selected/);
const revision = (await state()).revision;
await menu('Track actions')
  .getByRole('menuitem', { name: /Delete selected tracks/ })
  .click();
await wait();
let s = await state();
assert.equal(s.project.tracks.length, original.project.tracks.length - 2);
assert.equal(s.revision, revision + 1);
assert.equal(s.project.tracks[0].id, titles.id);
await press('Control+z');
s = await state();
assert.equal(s.project.tracks.length, original.project.tracks.length);
assert.equal(count(s), count(original));
// Keyboard deletion uses track selection rather than a stale clip selection.
await selector(audio.name).click();
await page.keyboard.press('Delete');
await wait();
s = await state();
assert(!s.project.tracks.some((t) => t.id === audio.id));
assert.equal(s.project.tracks.find((t) => t.id === main.id).clips.length, main.clips.length);
await press('Control+z');
await page.getByRole('button', { name: `Lock ${audio.name}`, exact: true }).click();
await wait();
await selector(main.name).click();
await selector(audio.name).click({ modifiers: ['Control'] });
await selector(main.name).click({ button: 'right' });
assert.equal(
  await menu('Track actions')
    .getByRole('menuitem', { name: /Delete selected tracks/ })
    .isDisabled(),
  true,
);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: `Unlock ${audio.name}`, exact: true }).click();
await wait();
// Right-click preserves a Ctrl-selected clip group and exposes actual delete commands.
const first = main.clips[0],
  second = main.clips[1];
await clip(first.id).click({ position: { x: 12, y: 30 } });
await clip(second.id).click({ position: { x: 12, y: 30 }, modifiers: ['Control'] });
await clip(first.id).click({ button: 'right', position: { x: 12, y: 30 } });
await menu('Clip actions').waitFor();
assert.match(await menu('Clip actions').innerText(), /2 clips selected/);
await menu('Clip actions')
  .getByRole('menuitem', { name: /Delete selected clips/ })
  .click();
await wait();
s = await state();
assert(
  !s.project.tracks.flatMap((t) => t.clips).some((c) => c.id === first.id || c.id === second.id),
);
await press('Control+z');
// Single clicks browse presets without editing the project.
await press('Alt+3');
const beforeTitles = await state();
await page.locator('.title-preset.plain').click();
await page.locator('.title-preset.lower').click();
assert.equal(count(await state()), count(beforeTitles));
assert.equal((await state()).project.tracks.length, beforeTitles.project.tracks.length);
await press('Control+t');
await wait();
s = await state();
assert.equal(s.project.tracks.length, beforeTitles.project.tracks.length);
assert.equal(count(s), count(beforeTitles) + 1);
await press('Control+t');
await wait();
s = await state();
assert.equal(s.project.tracks.length, beforeTitles.project.tracks.length);
assert.equal(count(s), count(beforeTitles) + 2);
await press('Control+z');
await press('Control+z');
await page.locator('.title-preset.plain').dblclick();
await wait();
assert.equal(count(await state()), count(beforeTitles) + 1);
await press('Control+z');
// A drag is previewed on the destination lane before Rust receives the single commit.
await call('edit', { operation: { type: 'add_track', kind: 'video' } });
await wait();
s = await state();
const target = s.project.tracks[0],
  title = titles.clips[0];
await press('s');
await page.locator('.timeline-scroll').evaluate((el) => (el.scrollTop = 0));
await wait();
let box = await clip(title.id).boundingBox(),
  lane = await page.locator(`[data-track="${target.id}"] .track-lane`).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + 32);
await page.mouse.down();
const beforeDrag = await state();
await page.mouse.move(box.x + box.width / 2 + 30, lane.y + 32, { steps: 7 });
await wait();
assert.equal(
  await page.locator(`[data-track="${target.id}"] [data-clip-id="${title.id}"]`).count(),
  1,
);
assert.equal((await state()).revision, beforeDrag.revision);
assert(
  (await state()).project.tracks
    .find((t) => t.id === titles.id)
    .clips.some((c) => c.id === title.id),
);
await page.screenshot({ path: outputPath('Shrapwill-live-track-drag.png') });
await page.mouse.up();
await wait();
s = await state();
assert.equal(s.revision, beforeDrag.revision + 1);
assert(s.project.tracks.find((t) => t.id === target.id).clips.some((c) => c.id === title.id));
await press('Control+z');
assert(
  (await state()).project.tracks
    .find((t) => t.id === titles.id)
    .clips.some((c) => c.id === title.id),
);
// Escape cancels a drag and restores the original lane without adding history.
box = await clip(title.id).boundingBox();
lane = await page.locator(`[data-track="${target.id}"] .track-lane`).boundingBox();
const beforeCancel = await state();
await page.mouse.move(box.x + box.width / 2, box.y + 30);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2, lane.y + 30, { steps: 5 });
await wait();
await page.keyboard.press('Escape');
await page.mouse.up();
await wait();
assert.equal((await state()).revision, beforeCancel.revision);
assert.equal(
  await page.locator(`[data-track="${titles.id}"] [data-clip-id="${title.id}"]`).count(),
  1,
);
// Preset drops honor the lane under the pointer and never create a surprise lane.
const beforeDrop = await state();
await page
  .locator('.title-preset.lower')
  .dragTo(page.locator(`[data-track="${target.id}"] .track-lane`), {
    targetPosition: { x: 200, y: 30 },
  });
await wait();
s = await state();
assert.equal(s.project.tracks.length, beforeDrop.project.tracks.length);
assert.equal(s.project.tracks.find((t) => t.id === target.id).clips.length, 1);
await selector(target.name).click();
await selector(titles.name).click({ modifiers: ['Control'] });
await selector(target.name).click({ button: 'right' });
await menu('Track actions').waitFor();
await page.screenshot({ path: outputPath('Shrapwill-track-selection.png') });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
await call('new_project', {
  name: 'Empty lane selection QA',
  width: 1920,
  height: 1080,
  fps: { num: 30, den: 1 },
});
await wait();
await page.locator('.timeline-scroll').evaluate((el) => {
  el.scrollTop = 0;
  el.scrollLeft = 0;
});
const hint = await page.locator('.timeline-drop-hint').boundingBox();
await page.mouse.click(hint.x + hint.width / 2, hint.y + hint.height / 2);
assert.equal(await selector('Video 1').getAttribute('aria-pressed'), 'true');
assert.deepEqual(errors, []);
await fs.writeFile(
  path.join(qa, 'track-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'empty lane full-track selection',
        'Ctrl lane selection',
        'header padding selection',
        'selection does not seek or edit',
        'track buttons retain actions',
        'empty-project hint selection',
        'track click selection',
        'Ctrl toggle selection',
        'multi-track context deletion',
        'single undo',
        'keyboard track deletion',
        'locked track protection',
        'Ctrl clip selection and context deletion',
        'title single-click selection',
        'explicit title insertion',
        'title lane reuse',
        'double-click title insertion',
        'live vertical drag before commit',
        'single commit on release',
        'Escape drag cancellation',
        'title drop target',
        '1366x768 layout',
      ],
      errors,
    },
    null,
    2,
  ),
);
console.log(
  'PASS: track and clip selection/deletion, title reuse, targeted drops and live vertical dragging',
);
await browser.close();
