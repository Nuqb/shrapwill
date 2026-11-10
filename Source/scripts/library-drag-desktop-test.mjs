import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl, outputPath } from './test-support/paths.mjs';
import { importFixtures } from './test-support/import-fixtures.mjs';

const files = await importFixtures();
const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const state = async () => (await call('startup')).snapshot;
const clips = (s) => s.project.tracks.flatMap((t) => t.clips);
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
await call('import_media', { paths: [files.common, files.audio], quality: 720 });
await expect(page.locator('.media-card')).toHaveCount(2);
await expect(page.locator('.media-card').first().locator('img')).toBeVisible();
let s = await state();
const video = s.project.tracks.find((t) => t.kind === 'video');
const audio = s.project.tracks.find((t) => t.kind === 'audio');
const lane = (id) => page.locator(`[data-track="${id}"] .track-lane`);
async function drag(source, trackId, offset = 90) {
  const from = await source.boundingBox(),
    to = await lane(trackId).boundingBox();
  await page.mouse.move(from.x + 20, from.y + Math.min(15, from.height / 2));
  await page.mouse.down();
  await page.mouse.move(to.x + offset, to.y + 35, { steps: 20 });
}
const card = page.locator('.media-card').first();
const before = s.revision;
await drag(card.locator('img'), video.id);
await expect(page.locator('.library-drop-preview')).toBeVisible();
expect((await state()).revision).toBe(before);
const expectedFrame = await page
  .locator('.library-drop-preview')
  .evaluate((el) => Math.round(parseFloat(el.style.left) / Number(el.parentElement.dataset.ppf)));
await page.mouse.up();
await expect.poll(async () => clips(await state()).length).toBe(1);
s = await state();
expect(clips(s)[0].start).toBe(expectedFrame);
expect(s.revision).toBe(before + 1);
await expect(page.getByRole('button', { name: 'Back to timeline', exact: true })).toHaveCount(0);
await call('history', { direction: 'undo' });
expect(clips(await state())).toHaveLength(0);
// Name drags work too; cancellation/outside release must not edit or open a preview.
await drag(card.locator('.media-name'), video.id);
await expect(page.locator('.library-drop-preview')).toBeVisible();
await page.keyboard.press('Escape');
await page.mouse.up();
expect((await state()).revision).toBe(before + 2);
await expect(page.locator('.library-drag-ghost')).toHaveCount(0);
await drag(card.locator('.media-name'), video.id);
await page.mouse.move(700, 80, { steps: 5 });
await page.mouse.up();
expect(clips(await state())).toHaveLength(0);
await call('edit', { operation: { type: 'set_track', id: video.id, locked: true } });
const lockedRevision = (await state()).revision;
await drag(card.locator('.media-image'), video.id);
await expect(page.locator('.library-drop-preview')).toHaveCount(0);
await page.mouse.up();
expect((await state()).revision).toBe(lockedRevision);
await call('edit', { operation: { type: 'set_track', id: video.id, locked: false } });
// The thumbnail remains a normal source-preview button when it is clicked.
await card.locator('.media-image').click();
await expect(page.locator('.preview-panel .panel-heading')).toContainText('Source');
await expect(page.getByLabel('Source position', { exact: true })).toBeVisible();
await drag(page.locator('.media-card').nth(1).locator('.media-image'), video.id);
await expect(page.locator('.library-drop-preview')).toHaveCount(0);
await page.mouse.up();
await drag(page.locator('.media-card').nth(1).locator('.media-image'), audio.id);
await expect(page.locator('.library-drop-preview')).toBeVisible();
await page.mouse.up();
await expect.poll(async () => clips(await state()).length).toBe(1);
expect((await state()).project.tracks.find((t) => t.id === audio.id).clips).toHaveLength(1);
await call('history', { direction: 'undo' });
// Video audio can still be dragged onto an audio lane.
await drag(card.locator('.media-image'), audio.id);
await page.mouse.up();
await expect.poll(async () => clips(await state()).length).toBe(1);
await call('history', { direction: 'undo' });
// Placing unsupported media must work even while its full proxy is still preparing.
await call('import_media', { paths: [files.fallback], quality: 1080 });
await expect(page.locator('.media-card')).toHaveCount(3);
const preparing = page.locator('.media-card').filter({ hasText: path.basename(files.fallback) });
expect(
  (await state()).project.assets.find((a) => a.name === path.basename(files.fallback)).previewPath,
).toBeNull();
await drag(preparing.locator('.media-image'), video.id);
await expect(page.locator('.library-drop-preview')).toBeVisible();
await page.mouse.up();
await expect.poll(async () => clips(await state()).length).toBe(1);
await call('history', { direction: 'undo' });
await page.getByRole('button', { name: 'Titles', exact: true }).click();
await drag(page.locator('.title-preset').first(), video.id);
await expect(page.locator('.library-drop-preview')).toBeVisible();
await page.mouse.up();
await expect.poll(async () => clips(await state()).length).toBe(1);
expect(clips(await state())[0].title).toBeTruthy();
await call('history', { direction: 'undo' });
// Native OS drop subscription remains enabled after replacing internal browser dragging.
await page.evaluate(
  async (path) =>
    window.__TAURI_INTERNALS__.invoke('plugin:event|emit', {
      event: 'tauri://drag-drop',
      payload: { paths: [path], position: { x: 100, y: 100 } },
    }),
  files.image,
);
await page.getByRole('button', { name: 'Media', exact: true }).click();
await expect(page.locator('.media-card')).toHaveCount(4);
for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(size);
  await drag(card.locator('.media-image'), video.id);
  await expect(page.locator('.library-drop-preview')).toBeVisible();
  await page.screenshot({ path: outputPath(`Shrapwill-0.8.1-drag-${size.width}.png`) });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'library-drag-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'real mouse image and name dragging',
        'visible placement before release',
        'one undoable drop',
        'Escape and outside cancellation',
        'locked/incompatible lanes',
        'normal source click',
        'audio and video-audio drops',
        'title drop',
        'drop before compatible playback is ready',
        'native Windows drop subscription',
      ],
    },
    null,
    2,
  ),
);
console.log('Library mouse dragging checks passed');
await browser.close();
