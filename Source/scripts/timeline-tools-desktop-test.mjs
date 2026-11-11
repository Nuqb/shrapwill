import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { qaDir, debugUrl } from './test-support/paths.mjs';

const project = JSON.parse(await fs.readFile(path.join(qaDir, 'Validation.cutline'), 'utf8'));
const image = project.assets.find((asset) => asset.kind === 'image');
const main = project.tracks.find(
  (track) => track.kind === 'video' && track.clips.some((clip) => clip.mediaId === image.id),
);
const original = main.clips.find((clip) => clip.mediaId === image.id);
main.clips = [900, 1800].map((duration, index) => ({
  ...structuredClone(original),
  id: `timeline-tool-${index}`,
  name: `Photo ${index + 1}`,
  start: index * 900,
  duration,
  sourceIn: 0,
  link: null,
  transition: null,
}));
project.tracks = [main];
project.magneticTimeline = false;
project.autoRipple = false;
project.id = 'timeline-tools-regression';
const fixture = path.join(qaDir, 'Timeline-tools.cutline');
await fs.writeFile(fixture, JSON.stringify(project));
const browser = await chromium.connectOverCDP(debugUrl(), { timeout: 90000 });
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const state = async () => (await call('startup')).snapshot;
await call('open_project', { path: fixture });
if (await page.locator('.launcher').count()) await page.locator('.launcher-top>button').click();
await page.waitForSelector('.timeline-clip');
const zoom = page.getByLabel('Timeline zoom', { exact: true });
await expect
  .poll(async () =>
    Math.abs(Number(await zoom.inputValue()) - Number(await zoom.getAttribute('min'))),
  )
  .toBeLessThan(1e-9);
const first = page.locator('[data-clip-id="timeline-tool-0"]');
for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(size);
  await page.locator('[data-action="zoom_fit"]').click();
  await expect
    .poll(async () =>
      Math.abs(Number(await zoom.inputValue()) - Number(await zoom.getAttribute('min'))),
    )
    .toBeLessThan(1e-9);
  await zoom.focus();
  await page.keyboard.press('Home');
  const extent = await page.locator('.timeline-scroll').evaluate((host) => {
    host.scrollLeft = 1e9;
    return { viewport: host.clientWidth, extent: host.scrollWidth, left: host.scrollLeft };
  });
  assert(extent.extent <= extent.viewport + 2, JSON.stringify(extent));
  assert(extent.left <= 2);
  assert.equal(await page.locator('[data-action="magnetic_timeline"]').innerText(), '');
  await page.screenshot({ path: path.join(qaDir, `timeline-tools-${size.width}.png`) });
}
const revision = (await state()).revision;
const box = await first.boundingBox();
await page.mouse.move(box.x + 40, box.y + 35);
await page.mouse.down();
await page.mouse.move(box.x + 85, box.y + 35, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(250);
assert.equal((await state()).revision, revision);
assert.equal((await state()).project.tracks[0].clips[0].start, 0);

const snap = page.locator('[data-action="snapping"]');
if ((await snap.getAttribute('aria-pressed')) !== 'true') await snap.click();
const lane = page.locator('.track-lane').first();
const ppf = Number(await lane.getAttribute('data-ppf'));
const laneBox = await lane.boundingBox();
const ruler = await page.locator('.ruler').boundingBox();
const targetX = laneBox.x + 900 * ppf + 4;
await page.mouse.move(targetX, ruler.y + 15);
await page.mouse.down();
await page.mouse.up();
await expect(page.locator('.ruler-corner')).toHaveText('00:00:30:00');
await snap.click();
await page.mouse.click(targetX, ruler.y + 15);
await expect(page.locator('.ruler-corner')).not.toHaveText('00:00:30:00');

await page.locator('[data-action="auto_ripple"]').click();
await expect.poll(async () => (await state()).project.autoRipple).toBe(true);
assert.equal((await state()).project.magneticTimeline, false);
await call('edit', {
  operation: { type: 'trim', id: 'timeline-tool-0', edge: 'right', frame: 600 },
});
assert.equal((await state()).project.tracks[0].clips[1].start, 600);
await call('history', { direction: 'undo' });
await page.locator('[data-action="auto_ripple"]').click();

await page.locator('.track-head').first().click({ button: 'right' });
await expect(page.getByRole('menuitem', { name: 'Add Video Track', exact: true })).toBeVisible();
await expect(page.getByRole('menuitem', { name: 'Add Audio Track', exact: true })).toBeVisible();
assert(!(await page.getByRole('menu').innerText()).includes('Undo restores them'));
await page.getByRole('menuitem', { name: 'Add Audio Track', exact: true }).click();
await expect.poll(async () => (await state()).project.tracks.length).toBe(2);
await call('history', { direction: 'undo' });
assert(!(await page.locator('.timeline-footer').innerText()).includes('to play'));
await page.locator('.timeline-footer').evaluate((footer) => {
  const range = document.createRange();
  range.selectNodeContents(footer);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  window.__copiedTimelineText = false;
  document.addEventListener(
    'copy',
    () => {
      window.__copiedTimelineText = true;
    },
    { once: true },
  );
});
await page.keyboard.press('Control+c');
assert(await page.evaluate(() => window.__copiedTimelineText));
await page.evaluate(() => window.getSelection().removeAllRanges());

await first.click();
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await page
  .locator('.filter-preset')
  .filter({ has: page.locator('strong', { hasText: /^Sepia$/ }) })
  .click();
const divider = page.getByRole('slider', { name: 'Filter comparison divider' });
await expect(divider).toBeVisible();
await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
await page.locator('.play-button').click();
const pixels = () =>
  page.getByTestId('preview-canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    const output = [];
    for (const x of [0.2, 0.4, 0.6, 0.8]) {
      const rgba = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width * x),
        Math.floor(canvas.height * 0.5),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rgba,
      );
      output.push(...rgba.slice(0, 3));
    }
    return output;
  });
await divider.focus();
await page.keyboard.press('Home');
await page.waitForTimeout(150);
const unfiltered = await pixels();
await page.keyboard.press('End');
await page.waitForTimeout(150);
const filtered = await pixels();
assert.notDeepEqual(filtered, unfiltered);
assert(Math.max(...filtered) > 25);
assert(Math.max(...unfiltered) > 25);
await page.keyboard.press('ArrowLeft');
await expect(divider).toHaveAttribute('aria-valuenow', '99');
const comparison = await page.locator('.filter-comparison').boundingBox();
const handle = await divider.boundingBox();
await page.mouse.move(handle.x, handle.y + handle.height / 2);
await page.mouse.down();
await page.mouse.move(comparison.x + comparison.width * 0.25, handle.y + handle.height / 2, {
  steps: 8,
});
await page.mouse.up();
await expect(divider).toHaveAttribute('aria-valuenow', '25');
for (const width of [1366, 1920]) {
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
  await page.screenshot({ path: path.join(qaDir, `filter-comparison-${width}.png`) });
}
assert.deepEqual(errors, []);
await fs.writeFile(
  path.join(qaDir, 'timeline-tools-results.json'),
  JSON.stringify({ passed: true, filtered, unfiltered }),
);
console.log(
  'PASS: bounded zoom/scroll, independent ripple, overlap rollback, playhead snap, track menus, text copy and filter comparison',
);
await browser.close();
