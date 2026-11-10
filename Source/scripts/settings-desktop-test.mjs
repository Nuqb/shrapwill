import { chromium, expect } from '@playwright/test';
import { debugUrl, outputPath } from './test-support/paths.mjs';

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const dialog = () => page.getByRole('dialog');
const openSettings = async () => {
  await page.locator('.launcher-top [data-action="settings"]').click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
};

await page.waitForSelector('.launcher');
await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('orange');
await openSettings();
await expect(page.locator('.settings-category')).toHaveCount(2);
await page.screenshot({ path: outputPath('Shrapwill-settings-categories.png') });
await page.getByRole('button', { name: 'Appearance', exact: true }).click();
await expect(page.locator('.theme-card')).toHaveCount(10);
for (const name of [
  'Amber',
  'Coral',
  'Rose',
  'Violet',
  'Indigo',
  'Blue',
  'Cyan',
  'Mint',
  'Lime',
  'Orange',
]) {
  const card = page.getByRole('button', { name: new RegExp(`^${name}`) });
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe(name.toLowerCase());
  const colors = await page.evaluate(() => ({
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    preview: getComputedStyle(document.querySelector('.theme-card[aria-pressed="true"]'))
      .getPropertyValue('--theme-accent')
      .trim(),
    primary: getComputedStyle(document.querySelector('.export-button')).backgroundColor,
    expected: getComputedStyle(
      document.querySelector('.theme-card[aria-pressed="true"] .theme-preview > span:nth-child(2)'),
    ).backgroundColor,
  }));
  expect(colors.accent).toBe(colors.preview);
  await expect
    .poll(() =>
      page.locator('.export-button').evaluate((button) => getComputedStyle(button).backgroundColor),
    )
    .toBe(colors.expected);
}
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
]) {
  await page.setViewportSize({ width, height });
  const bounds = await dialog().boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
  await page.screenshot({ path: outputPath(`Shrapwill-themes-${width}.png`) });
}
await page.getByRole('button', { name: 'Violet', exact: true }).click();
await page.reload();
await page.waitForSelector('.launcher');
await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('violet');
await openSettings();
await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
const search = page.getByRole('textbox', { name: 'Search shortcuts' });
await expect(search).not.toBeFocused();
await expect(dialog()).toBeFocused();
await expect(page.getByText('MAKE IT YOUR OWN')).toHaveCount(0);
await expect(page.locator('.shortcut-description')).toHaveCount(0);
await search.click();
await search.fill('razor');
await expect(page.locator('.shortcut-row')).toHaveCount(1);
expect(await search.evaluate((input) => getComputedStyle(input).outlineStyle)).toBe('none');
expect(
  await page.locator('.shortcut-search').evaluate((label) => getComputedStyle(label).boxShadow),
).not.toBe('none');
await page.screenshot({ path: outputPath('Shrapwill-shortcut-search-focus.png') });
await page.getByRole('button', { name: 'Back to settings' }).click();
await page.getByRole('button', { name: 'Appearance', exact: true }).click();
await page.keyboard.press('Escape');
await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
await page.keyboard.press('Shift+Tab');
await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeFocused();
await page.keyboard.press('Tab');
await expect(page.getByRole('button', { name: 'Close settings', exact: true })).toBeFocused();
await page.keyboard.press('Escape');
await expect(dialog()).toHaveCount(0);
await expect(page.locator('.launcher-top [data-action="settings"]')).toBeFocused();
await page.evaluate(() => localStorage.setItem('shrapwill-theme-v1', 'invalid-theme'));
await page.reload();
await page.waitForSelector('.launcher');
await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('orange');
expect(errors).toEqual([]);
console.log(
  'Settings categories, all ten accents, persistence, fallback, focus, search, and both viewport sizes passed.',
);
await browser.close();
