import { chromium, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { qaDir, debugUrl } from './test-support/paths.mjs';

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
await page.getByRole('button', { name: 'Transitions', exact: true }).click();
const card = (name) =>
  page
    .locator('.transition-preset')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`, 'i') }) });
async function picture(name) {
  const item = card(name);
  await item.scrollIntoViewIfNeeded();
  await page.mouse.move(1000, 500);
  const canvas = item.locator('canvas');
  await expect(canvas).toHaveAttribute('data-frame', '20');
  await expect(canvas).not.toHaveAttribute('data-unavailable', 'true');
  return canvas.evaluate((element) => element.toDataURL());
}
for (const [a, b] of [
  ['Wipe up', 'Wipe down'],
  ['Wipe left', 'Wipe right'],
  ['Fisheye Roll Up', 'Fisheye Roll Down'],
  ['Flip Roll Left', 'Flip Roll Right'],
  ['Warp Zoom 3', 'Warp Zoom 6'],
  ['Halo Blur', 'Rotary Zoom'],
]) {
  expect(await picture(a), `${a} and ${b} need different covers`).not.toBe(await picture(b));
}
await expect(page.locator('.transition-symbol')).toHaveCount(0);
const target = card('Fisheye Roll Up');
await target.scrollIntoViewIfNeeded();
await target.hover();
const canvas = target.locator('canvas');
await expect.poll(async () => canvas.getAttribute('data-frame')).not.toBe('20');
const first = await canvas.evaluate((element) => element.toDataURL());
await expect.poll(async () => canvas.evaluate((element) => element.toDataURL())).not.toBe(first);
const smoothFrames = await canvas.evaluate(async (element) => {
  const frames = new Set();
  const started = performance.now();
  await new Promise((resolve) => {
    const sample = () => {
      frames.add(element.dataset.frame);
      if (performance.now() - started < 1800) requestAnimationFrame(sample);
      else resolve();
    };
    sample();
  });
  return frames.size;
});
expect(
  smoothFrames,
  'hover should advance smoothly beyond the former seven frames',
).toBeGreaterThan(15);
await page.mouse.move(1000, 500);
await expect(canvas).toHaveAttribute('data-frame', '20');
await page.emulateMedia({ reducedMotion: 'reduce' });
await target.hover();
await expect(canvas).toHaveAttribute('data-frame', '20');
await page.waitForTimeout(250);
await expect(canvas).toHaveAttribute('data-frame', '20');
await page.emulateMedia({ reducedMotion: 'no-preference' });
for (const width of [1366, 1920]) {
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
  await page.getByLabel('Search presets').fill('Roll');
  await page.locator('.library-content').evaluate((element) => (element.scrollTop = 0));
  await page.mouse.move(1000, 500);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(qaDir, `transition-covers-${width}.png`) });
}
await page.getByLabel('Search presets').fill('');
await page.getByRole('button', { name: 'Effects', exact: true }).click();
const images = [];
for (const name of [
  'None',
  'Soft blur',
  'Soft glow',
  'Edge outline',
  'Emboss',
  'Film grain',
  'Halftone dots',
  'Fisheye',
  'Swirl',
  'Kaleidoscope',
  'Bokeh Blur',
  'Iris Blur',
  'Comic Book',
  'Glow Effect',
  'Random Block',
]) {
  const item = page
    .locator('.video-effect-preset')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`, 'i') }) });
  await item.scrollIntoViewIfNeeded();
  await page.mouse.move(1000, 500);
  await expect(item.locator('canvas')).toHaveAttribute('data-frame', '50');
  images.push(await item.locator('canvas').evaluate((element) => element.toDataURL()));
}
expect(new Set(images).size).toBe(images.length);
await page.locator('.library-content').evaluate((element) => (element.scrollTop = 0));
await page.screenshot({ path: path.join(qaDir, 'effect-covers.png') });
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'covers-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'actual renderer covers',
        'opposite directions',
        'hover animation',
        'reduced motion',
        'distinct effect thumbnails',
        'desktop layouts',
      ],
    },
    null,
    2,
  ),
);
console.log(
  'PASS: rendered covers, opposite directions, hover animation, reduced motion and distinct effect thumbnails',
);
await browser.close();
