import { chromium, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { defaultGrade } from '../src/features/preview/grading.ts';
import { gradeColor } from '../src/features/preview/color.ts';
const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const invoke = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const snapshot = async () => (await invoke('startup')).snapshot;
await invoke('open_project', { path: path.join(qaDir, 'Validation.cutline') });
if (await page.locator('.launcher').count()) await page.locator('.launcher-top>button').click();
const before = (await snapshot()).project;
const track = before.tracks.find((t) => t.kind === 'video' && t.clips.some((c) => !c.title));
const clip = track.clips.find((c) => !c.title);
const asset = before.assets.find((a) => a.id === clip.mediaId);
const hash = async () =>
  createHash('sha256')
    .update(await fs.readFile(asset.path))
    .digest('hex');
const originalHash = await hash();
await page
  .getByRole('button', { name: `${clip.name}, ${track.name}`, exact: true })
  .first()
  .click();
await page.getByRole('button', { name: 'Speed', exact: true }).click();
await expect(page.getByLabel('Speed multiplier', { exact: true })).toBeVisible();
await page.screenshot({ path: path.join(qaDir, 'speed-color-Uniform-Speed.png') });
await page.getByRole('tab', { name: 'Speed Ramping', exact: true }).click();
await page.getByRole('radio', { name: 'Montage', exact: true }).click();
await expect(page.getByRole('img', { name: 'Speed ramp graph' })).toBeVisible();
await page.screenshot({ path: path.join(qaDir, 'speed-color-Speed-Ramping.png') });
await expect(page.getByRole('switch', { name: 'Reverse Speed', exact: true })).toHaveCount(0);
await expect(page.getByRole('button', { name: 'Apply speed', exact: true })).toHaveCount(0);
await expect(page.getByLabel('Speed multiplier', { exact: true })).toHaveCount(0);
await expect
  .poll(
    async () =>
      (await snapshot()).project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id).props
        .speed?.points.length ?? 0,
    { timeout: 120000 },
  )
  .toBeGreaterThan(0);
await invoke('history', { direction: 'undo' });
await page.getByRole('tab', { name: 'Uniform Speed', exact: true }).click();
await page.getByLabel('Speed multiplier', { exact: true }).fill('2');
await page.getByLabel('Speed multiplier', { exact: true }).blur();
await expect
  .poll(
    async () =>
      (await snapshot()).project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id).props
        .speed?.rate,
    { timeout: 120000 },
  )
  .toBe(2);
await expect(page.getByLabel('Speed multiplier', { exact: true })).toBeEnabled({ timeout: 120000 });
await page.getByLabel('Speed multiplier', { exact: true }).fill('3');
await page.getByLabel('Speed multiplier', { exact: true }).blur();
await expect
  .poll(
    async () =>
      (await snapshot()).project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id).props
        .speed?.rate,
    { timeout: 120000 },
  )
  .toBe(3);
const retimed = (await snapshot()).project.tracks
  .flatMap((t) => t.clips)
  .find((c) => c.id === clip.id);
if (retimed.mediaId === clip.mediaId || Math.abs(retimed.duration - clip.duration / 3) > 3)
  throw Error('Speed did not update source and duration');
if ((await hash()) !== originalHash) throw Error('Original media changed');
await invoke('history', { direction: 'undo' });
await invoke('history', { direction: 'undo' });
const undone = (await snapshot()).project.tracks
  .flatMap((t) => t.clips)
  .find((c) => c.id === clip.id);
if (undone.mediaId !== clip.mediaId || undone.duration !== clip.duration)
  throw Error('Speed undo failed');
await page.getByRole('button', { name: 'Color', exact: true }).click();
for (const name of ['HSL', 'Curves', 'Color Wheels', 'HDR', 'Basic']) {
  await page.getByRole('tab', { name, exact: true }).click();
  await page.screenshot({ path: path.join(qaDir, `speed-color-${name.replaceAll(' ', '-')}.png`) });
}
const grade = defaultGrade();
grade.exposure = 0.5;
grade.hsl[0] = [0.1, -0.2, 0.1];
grade.wheels[0] = [0.2, -0.1, 0];
grade.curves[2][2] = 0.6;
grade.secondaryCurves[1][2] = 0.6;
grade.secondaryCurves[3][1] = 0.4;
grade.hdrWheels[2] = [0.1, -0.1, 0.2];
grade.enabled = { Light: false, HSL: false };
await invoke('edit', {
  operation: { type: 'properties', id: clip.id, props: { ...clip.props, grade } },
});
const props = (await snapshot()).project.tracks
  .flatMap((t) => t.clips)
  .find((c) => c.id === clip.id).props;
const lut = await invoke('clip_lut', { id: clip.id });
let index = 0;
for (let b = 0; b < 17; b++)
  for (let g = 0; g < 17; g++)
    for (let r = 0; r < 17; r++)
      for (const value of gradeColor([r / 16, g / 16, b / 16], props)) {
        if (Math.abs(value - lut[index++]) > 1e-6) throw Error('Preview/export grading mismatch');
      }
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
]) {
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: path.join(qaDir, `speed-color-${width}.png`) });
}
console.log(
  'Speed UI, source preservation, undo, color tabs, and preview/export LUT agreement passed',
);
await browser.close();
