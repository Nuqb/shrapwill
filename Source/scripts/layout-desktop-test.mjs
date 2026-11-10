import { chromium, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { transitionPresets } from '../src/features/library/presets.ts';
const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const width = (locator) => locator.evaluate((element) => element.getBoundingClientRect().width);
async function drag(name, dx, dy = 0, cancel = false) {
  const handle = page.getByRole('separator', { name, exact: true }),
    box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
  if (cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveClass(/resizing/);
}
async function openInfo() {
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('button', { name: 'Project info…', exact: true }).click();
}
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
const initial = (await call('startup')).snapshot;
await expect(page.locator('.inspector')).toHaveCount(0);
await page.getByRole('button', { name: 'Transitions', exact: true }).click();
await expect(page.locator('.transition-preset .transition-port-tag')).toHaveCount(0);
const categories = page.getByRole('navigation', { name: 'Transitions categories' });
await expect(categories).toBeVisible();
const positions = await categories
  .getByRole('button')
  .evaluateAll((elements) =>
    elements.map((element) => ({ x: element.offsetLeft, y: element.offsetTop })),
  );
expect(new Set(positions.map((point) => point.x)).size).toBe(1);
expect(positions.every((point, i) => i === 0 || point.y > positions[i - 1].y)).toBe(true);
await categories.getByRole('button', { name: 'Zoom', exact: true }).click();
await expect(page.locator('.transition-preset')).toHaveCount(
  transitionPresets.filter((item) => item.category === 'Zoom').length,
);
await categories.getByRole('button', { name: 'All', exact: true }).click();
await page.getByLabel('Search presets').fill('Cross Roll 3');
await expect(page.locator('.transition-preset')).toHaveCount(1);
await page.getByLabel('Search presets').fill('');
for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(viewport);
  await drag('Resize library', 600 - (await width(page.locator('.library'))));
  expect(await width(page.locator('.library'))).toBeGreaterThan(590);
  expect(await width(page.locator('.preview-panel'))).toBeGreaterThan(319);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByLabel('Search presets').blur();
  await page.mouse.move(viewport.width - 120, 180);
  await page.screenshot({ path: path.join(qaDir, `workspace-transitions-${viewport.width}.png`) });
}
const beforeCancel = await width(page.locator('.library'));
for (const tab of ['Titles', 'Filters', 'Effects']) {
  await page.getByRole('button', { name: tab, exact: true }).click();
  const nav = page.getByRole('navigation', { name: `${tab} categories` });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button', { name: /filmora/i })).toHaveCount(0);
  await expect(page.locator('.library .transition-port-tag')).toHaveCount(0);
  const categories = await nav
    .getByRole('button')
    .evaluateAll((elements) =>
      elements.map((element) => ({ x: element.offsetLeft, y: element.offsetTop })),
    );
  expect(new Set(categories.map((point) => point.x)).size).toBe(1);
  await expect(page.locator('.title-browser-hint')).toHaveCount(0);
  await expect(page.locator('.library-toolbar [data-action="add_title"]')).toHaveCount(0);
  if (tab === 'Filters') {
    await nav.getByRole('button', { name: 'Black & White', exact: true }).click();
    await expect(
      page
        .locator('.filter-preset')
        .filter({ has: page.locator('strong', { hasText: 'Black & White 3' }) }),
    ).toBeVisible();
    await nav.getByRole('button', { name: 'All', exact: true }).click();
  }
  if (tab === 'Effects') {
    await nav.getByRole('button', { name: 'Blur', exact: true }).click();
    await expect(
      page
        .locator('.video-effect-preset')
        .filter({ has: page.locator('strong', { hasText: 'Bokeh Blur' }) }),
    ).toBeVisible();
    await nav.getByRole('button', { name: 'All', exact: true }).click();
  }
  await expect(nav.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(qaDir, `workspace-${tab.toLowerCase()}-1920.png`) });
}
await page.getByRole('button', { name: 'Transitions', exact: true }).click();
await drag('Resize library', 130, 0, true);
expect(await width(page.locator('.library'))).toBeCloseTo(beforeCancel, 0);
await openInfo();
await expect(page.getByRole('dialog', { name: 'Project info', exact: true })).toContainText(
  'Resolution',
);
await page.keyboard.press('Delete');
expect((await call('startup')).snapshot).toEqual(initial);
await page.keyboard.press('Escape');
await expect(page.getByRole('dialog')).toHaveCount(0);
await expect(page.locator('#menu-view')).toBeFocused();
await expect(page.locator('.inspector')).toHaveCount(0);
await openInfo();
await page.getByRole('button', { name: 'Done', exact: true }).click();
const divider = await page
  .getByRole('separator', { name: 'Resize library', exact: true })
  .boundingBox();
await page.mouse.move(divider.x + 3, divider.y + 100);
await page.mouse.down();
await page.mouse.move(divider.x + 33, divider.y + 100);
await call('open_project', { path: path.join(qaDir, 'Validation.cutline') });
await expect(page.locator('body')).not.toHaveClass(/resizing/);
const stoppedWidth = await width(page.locator('.library'));
await page.mouse.move(divider.x + 100, divider.y + 100);
await page.mouse.up();
expect(await width(page.locator('.library'))).toBeCloseTo(stoppedWidth, 0);
const state = await call('startup'),
  track = state.snapshot.project.tracks.find((track) => track.kind === 'video'),
  clip = track.clips[0];
await page
  .getByRole('button', { name: `${clip.name}, ${track.name}`, exact: true })
  .first()
  .click();
await expect(page.locator('.inspector')).toBeVisible();
await drag('Resize inspector', -220);
expect(await width(page.locator('.inspector'))).toBeGreaterThan(480);
await page.setViewportSize({ width: 1366, height: 768 });
expect(await width(page.locator('.preview-panel'))).toBeGreaterThan(319);
expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
await page.setViewportSize({ width: 1920, height: 1080 });
const before = await width(page.locator('.inspector'));
await page.getByRole('separator', { name: 'Resize inspector', exact: true }).focus();
await page.keyboard.press('ArrowRight');
expect(await width(page.locator('.inspector'))).toBeCloseTo(before - 20, 0);
await drag('Resize timeline', 0, -2000);
expect((await page.locator('.workspace').boundingBox()).height).toBeGreaterThanOrEqual(199);
expect(
  await page
    .locator('.editor-main')
    .evaluate((element) => element.scrollHeight - element.clientHeight),
).toBeLessThanOrEqual(1);
await page.getByRole('button', { name: 'View', exact: true }).click();
await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
await expect(page.getByRole('separator', { name: 'Resize library', exact: true })).toHaveAttribute(
  'aria-valuenow',
  '320',
);
await drag('Resize library', 240);
const stored = await page.evaluate(() => localStorage.getItem('cutline-layout'));
await page.reload();
await page.waitForSelector('.app-shell');
expect(await page.evaluate(() => localStorage.getItem('cutline-layout'))).toBe(stored);
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'workspace-layout-results.json'),
  JSON.stringify({
    passed: true,
    checks: [
      'vertical transition categories',
      'no transition source badges',
      'library grows beyond 480px',
      'inspector auto-hide',
      'inspector and timeline resizing',
      'keyboard resize',
      'Escape cancellation',
      'window bounds',
      'layout persistence',
      'on-demand Project Info',
      'history isolation',
      '1366/1920 layouts',
    ],
  }),
);
console.log(
  'PASS: transition sidebar, flexible panels, Project Info menu, persistence and editing isolation',
);
await browser.close();
