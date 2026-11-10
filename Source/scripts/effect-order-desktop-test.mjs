import { chromium, expect } from '@playwright/test';
import { debugUrl, qaDir } from './test-support/paths.mjs';
import path from 'node:path';

const browser = await chromium.connectOverCDP(debugUrl());
try {
  const page = browser.contexts()[0].pages()[0];
  await page.evaluate(
    (file) => window.__TAURI_INTERNALS__.invoke('open_project', { path: file }),
    path.join(qaDir, 'Validation.cutline'),
  );
  await page.getByTitle('Back to editor', { exact: true }).click();
  await expect(page.locator('.launcher-backdrop')).toHaveCount(0);
  await page.getByRole('button', { name: 'Effects', exact: true }).click();
  const categories = page.getByRole('navigation', { name: 'Effects categories' });
  await expect(categories.getByRole('button').first()).toHaveText('All');
  await expect(categories.getByRole('button').nth(1)).toHaveText('Trending');
  await categories.getByRole('button', { name: 'Shake', exact: true }).click();
  await expect(page.locator('.preset-grid strong').nth(0)).toHaveText('Extreme');
  await expect(page.locator('.preset-grid strong').nth(1)).toHaveText('Mild');
  await expect(page.locator('.preset-grid strong').nth(2)).toHaveText('Heartbeat');
  await categories.getByRole('button', { name: 'Object Outline', exact: true }).click();
  await expect(page.locator('.preset-empty')).toHaveText(
    'No effects from this category have been ported yet.',
  );
  await categories.getByRole('button', { name: 'All', exact: true }).click();
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: path.join(qaDir, `effect-order-${width}.png`) });
  }
  console.log('PASS: Filmora category order, card order, empty categories and both layouts');
} finally {
  await browser.close();
}
