import { chromium, expect } from '@playwright/test';
import path from 'node:path';
import { debugUrl, outputPath, qaDir } from './test-support/paths.mjs';

const browser = await chromium.connectOverCDP(debugUrl(), { timeout: 120000 });
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (command, args = {}) =>
  page.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), {
    command,
    args,
  });
const windowCall = (name) => call(`plugin:window|${name}`, { label: 'main' });

await page.waitForSelector('.launcher');
expect(await windowCall('is_decorated')).toBe(false);
await expect(page.getByRole('button', { name: 'Close window', exact: true })).toBeVisible();
if (await windowCall('is_maximized'))
  await page.getByRole('button', { name: 'Restore window', exact: true }).click();
await page.getByRole('button', { name: 'Maximize window', exact: true }).click();
await expect.poll(() => windowCall('is_maximized')).toBe(true);
await page.getByRole('button', { name: 'Restore window', exact: true }).click();
await expect.poll(() => windowCall('is_maximized')).toBe(false);

// The exposed header must remain draggable even while the home screen is open.
const region = page.locator('.header-project');
await expect(region).toBeVisible();
// A first mouse-down enters Windows' native drag loop, which can consume the
// remote driver's second click. Exercise that second mouse-down explicitly;
// Tauri's real drag-region listener still performs the native window action.
await region.dispatchEvent('mousedown', { button: 0, detail: 2 });
await expect.poll(() => windowCall('is_maximized')).toBe(true);
await region.dispatchEvent('mousedown', { button: 0, detail: 2 });
await expect.poll(() => windowCall('is_maximized')).toBe(false);

await page.locator('.launcher-top [data-action="settings"]').click();
await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
expect(
  await page
    .locator('.shortcut-backdrop:not([data-overlay-exit])')
    .evaluate((el) => getComputedStyle(el).backdropFilter),
).toBe('none');
await expect(page.locator('[data-overlay-exit]')).toHaveCount(0);
await page.mouse.move(500, 24);
await page.screenshot({ path: outputPath('Shrapwill-shortcuts-neutral.png') });
await page.getByRole('button', { name: 'Close keyboard shortcut settings' }).click();
await call('open_project', { path: path.join(qaDir, 'Validation.cutline') });
await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
await expect(page.locator('[data-overlay-exit]')).toHaveCount(0);
await page.mouse.move(500, 24);
await page.screenshot({ path: outputPath('Shrapwill-integrated-header.png') });

// Exercise the actual custom close button with dirty state, preserving user work.
await call('edit', { operation: { type: 'rename', name: 'Window control QA' } });
await page.getByRole('button', { name: 'Close window', exact: true }).click();
await expect(page.getByRole('alertdialog')).toBeVisible();
await page.getByRole('button', { name: /^Keep editing/ }).click();
expect((await call('startup')).snapshot.dirty).toBe(true);
await page.getByRole('button', { name: 'Minimize window', exact: true }).click();
await expect.poll(() => windowCall('is_minimized')).toBe(true);
expect(errors).toEqual([]);
console.log(
  'PASS: integrated window controls, drag-region double-click, shortcut backdrop and guarded close',
);
await browser.close();
