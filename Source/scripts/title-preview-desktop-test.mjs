import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { titlePresets } from '../src/features/library/presets.ts';
import titleCategories from '../src/features/library/catalog/title-categories.json' with { type: 'json' };

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const snapshot = async () => (await call('startup')).snapshot;
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByLabel('Project name', { exact: true }).fill('Title preview QA');
await page.getByRole('button', { name: '9:16 Portrait', exact: true }).click();
await page.locator('.new-dialog select').selectOption('30000/1001');
await page.getByRole('button', { name: 'Create project', exact: true }).click();
await page.getByRole('button', { name: 'Titles', exact: true }).click();
const categoryNav = page.getByRole('navigation', { name: 'Titles categories' });
await expect(categoryNav.locator(':scope > ul > li > button')).toHaveText([
  'Title Effects',
  'Title Templates',
]);
await page.screenshot({ path: path.join(qaDir, 'title-category-groups.png') });
for (const group of titleCategories) {
  const heading = categoryNav.getByRole('button', { name: group.name, exact: true });
  await expect(heading).toHaveAttribute('aria-expanded', 'false');
  await heading.click();
  await expect(heading).toHaveAttribute('aria-expanded', 'true');
  const branch = heading.locator('..');
  await expect(branch.locator(':scope > ul > li > button')).toHaveText(
    group.children.map((child) => child.name),
  );
}
await categoryNav.getByRole('button', { name: 'WordArt', exact: true }).click();
await expect(categoryNav.getByRole('button', { name: 'Multicolor', exact: true })).toBeVisible();
await categoryNav.getByRole('button', { name: 'Multicolor', exact: true }).click();
await expect(page.locator('.title-preset')).toHaveCount(0);
await expect(page.locator('.preset-empty')).toContainText('No titles are available');
await categoryNav.getByRole('button', { name: 'Neon', exact: true }).click();
await expect(page.locator('.title-preset.neon')).toBeVisible();
await expect(page.locator('.title-preset.retro')).toHaveCount(0);
await page.screenshot({ path: path.join(qaDir, 'title-category-tree.png') });
await categoryNav.getByRole('button', { name: 'All', exact: true }).click();
await expect(page.locator('.title-preset .preset-description')).toHaveCount(0);
await expect(page.locator('.title-browser-hint')).toHaveCount(0);
const before = await snapshot();
const timelineTime = await page.locator('.player-status>span:first-child').textContent();

for (const preset of titlePresets) {
  await page.locator(`.title-preset.${preset.style}`).click();
  await expect(page.locator('.panel-heading').filter({ hasText: 'Title preview' })).toBeVisible();
  await expect(page.locator('.player-status>span:first-child')).toContainText(preset.name);
  // Verify title pixels are drawn by the real compositor, including in an empty project.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="preview-canvas"]');
    const gl = canvas.getContext('webgl2');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let bright = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 100) bright++;
    return bright > 100;
  });
  await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
}
await page.locator('.play-button').click();
await expect(page.locator('.play-button svg.lucide-play')).toBeVisible();
const paused = await page.locator('.player-status>span:first-child').textContent();
await page.waitForTimeout(150);
await expect(page.locator('.player-status>span:first-child')).toHaveText(paused);
await page.keyboard.press('ArrowRight');
await expect(page.locator('.player-status>span:first-child')).not.toHaveText(paused);
await page.keyboard.press('Space');
await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
await expect(page.locator('.player-status')).toContainText('1080 × 1920');
await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
await expect(page.locator('.player-status>span:first-child')).toHaveText(timelineTime);
const after = await snapshot();
for (const key of ['project', 'dirty', 'revision', 'canUndo', 'canRedo'])
  expect(after[key]).toEqual(before[key]);

await page.locator('.title-preset.neon').click();
await page.locator('.title-preset.retro').click();
await expect(page.locator('.player-status>span:first-child')).toContainText('Retro');
await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
await page.locator('.play-button').click();
for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(size);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(qaDir, `title-preview-${size.width}.png`) });
}

await page.locator('.title-preset.neon').dblclick();
await expect(page.getByRole('button', { name: 'Back to timeline', exact: true })).toHaveCount(0);
await page.waitForTimeout(200);
const inserted = await snapshot();
const titles = inserted.project.tracks.flatMap((t) => t.clips).filter((c) => c.title);
expect(titles).toHaveLength(1);
expect(titles[0].title.style).toBe('neon');
expect(inserted.revision).toBe(before.revision + 1);
await page.locator('.title-preset.retro').click();
await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
await page.locator(`[data-clip-id="${titles[0].id}"]`).click();
await expect(page.getByRole('button', { name: 'Back to timeline', exact: true })).toHaveCount(0);
const timelineBeforePlayback = await page.locator('.player-status>span:first-child').textContent();
await page.locator('.play-button').click();
await expect(page.locator('.player-status>span:first-child')).not.toHaveText(
  timelineBeforePlayback,
);
await page.locator('.play-button').click();
await call('history', { direction: 'undo' });
expect((await snapshot()).project.tracks).toEqual(before.project.tracks);
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'title-preview-results.json'),
  JSON.stringify(
    {
      passed: true,
      presets: titlePresets.length,
      checks: [
        'real title pixels',
        'empty project',
        'portrait/rational rate',
        'transport and shortcuts',
        'no project/history changes',
        'playhead preserved',
        'latest selection',
        'single insert and undo',
        '1366 and 1920 layouts',
      ],
    },
    null,
    2,
  ),
);
console.log(
  'PASS: Filmora category order, nesting, filtering, title preview, transport, isolation, insertion, and layouts',
);
await browser.close();
