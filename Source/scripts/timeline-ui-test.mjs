import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { qaDir, sourceRoot } from './test-support/paths.mjs';

const directory = path.join(qaDir, 'timeline-ui');
fs.mkdirSync(directory, { recursive: true });
const server = await createServer({
  root: sourceRoot,
  cacheDir: path.join(directory, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0] + 'scripts/timeline-ui.html');
  const divider = page.getByRole('slider', { name: 'Filter comparison divider' });
  await expect(divider).toBeVisible();
  const zoom = page.getByLabel('Timeline zoom', { exact: true });
  const fitDifference = async () =>
    Math.abs(Number(await zoom.inputValue()) - Number(await zoom.getAttribute('min')));
  await expect.poll(fitDifference).toBeLessThan(1e-9);
  const pixels = () =>
    page.getByTestId('preview-canvas').evaluate((canvas) => {
      const gl = canvas.getContext('webgl2');
      const data = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const sampled = [];
      for (let i = 0; i < data.length; i += 400) sampled.push(...data.slice(i, i + 3));
      return sampled;
    });
  await expect
    .poll(async () => Math.max(...(await pixels())), { timeout: 30000 })
    .toBeGreaterThan(50);
  await divider.focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(100);
  const original = await pixels();
  await page.keyboard.press('End');
  await page.waitForTimeout(100);
  const filtered = await pixels();
  expect(filtered).not.toEqual(original);
  expect(Math.max(...filtered)).toBeGreaterThan(50);
  await page.keyboard.press('ArrowLeft');
  const rect = await page.locator('.filter-comparison').boundingBox();
  const handle = await divider.boundingBox();
  await page.mouse.move(handle.x, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.25, rect.y + rect.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(divider).toHaveAttribute('aria-valuenow', '25');
  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await page.locator('[data-action="zoom_fit"]').click();
    await expect
      .poll(() =>
        page.locator('.timeline-scroll').evaluate((host) => host.scrollWidth - host.clientWidth),
      )
      .toBeLessThanOrEqual(2);
    await page.screenshot({ path: path.join(directory, `timeline-comparison-${width}.png`) });
  }
  const lane = page.locator('.track-lane').first();
  const box = await lane.boundingBox();
  const ppf = Number(await lane.getAttribute('data-ppf'));
  const ruler = await page.locator('.ruler').boundingBox();
  await page.mouse.click(box.x + 900 * ppf + 4, ruler.y + 15);
  await expect.poll(() => page.evaluate(() => window.timelineFixture.frame())).toBe(900);
  await page.locator('[data-action="snapping"]').click();
  await page.mouse.click(box.x + 900 * ppf + 4, ruler.y + 15);
  await expect.poll(() => page.evaluate(() => window.timelineFixture.frame())).not.toBe(900);
  await page.locator('[data-action="auto_ripple"]').click();
  await expect
    .poll(() => page.evaluate(() => window.timelineFixture.project().autoRipple))
    .toBe(true);
  await expect(page.locator('[data-action="magnetic_timeline"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('[data-action="magnetic_timeline"]')).toHaveText('');
  await page.locator('.track-head').first().click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Add Video Track', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Add Audio Track', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.timelineFixture.project().tracks.length))
    .toBe(3);
  await expect(page.locator('.timeline-footer')).not.toContainText('to play');
  await page.locator('.timeline-footer').evaluate((footer) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(footer);
    selection.removeAllRanges();
    selection.addRange(range);
    window.copiedText = false;
    document.addEventListener(
      'copy',
      () => {
        window.copiedText = true;
      },
      { once: true },
    );
  });
  const before = await page.evaluate(() => window.timelineFixture.dispatched().length);
  await page.keyboard.press('Control+c');
  expect(await page.evaluate(() => window.copiedText)).toBe(true);
  expect(await page.evaluate(() => window.timelineFixture.dispatched().length)).toBe(before);
  await page.locator('[data-clip-id="photo"]').click();
  expect(await page.evaluate(() => window.getSelection().toString())).toBe('');
  await page.locator('[data-action="zoom_in"]').click();
  await expect.poll(fitDifference).toBeGreaterThan(0.001);
  await page.evaluate(() =>
    window.timelineFixture.replaceProject({
      ...window.timelineFixture.project(),
      id: 'opened-project',
    }),
  );
  await expect.poll(fitDifference).toBeLessThan(1e-9);
  expect(errors).toEqual([]);
  console.log(
    'PASS: actual compositor filter/original pixels, divider dragging, bounded zoom, playhead snap, independent controls and track menus at both workspace sizes',
  );
} finally {
  await browser?.close();
  await server.close();
}
