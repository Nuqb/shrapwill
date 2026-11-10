import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { filterPresets, transitionPresets } from '../src/features/library/presets.ts';
import { videoEffects } from '../src/features/library/videoEffects.ts';
import { unavailableOriginal } from '../src/features/preview/ported/availability.ts';

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const snapshot = async () => (await call('startup')).snapshot;
function editingState(snapshot) {
  const { render: _render, project, ...history } = snapshot;
  return {
    ...history,
    project: {
      ...project,
      assets: project.assets.map(
        ({ previewPath: _preview, thumbnailPath: _thumbnail, waveform: _waveform, ...asset }) =>
          asset,
      ),
    },
  };
}
const status = page.locator('.player-status>span:first-child');
const apply = page.getByRole('button', { name: 'Apply to selected clip', exact: true });
const back = page.getByRole('button', { name: 'Back to timeline', exact: true });
const catalog = [
  { tab: 'Filters', heading: 'Filter preview', selector: '.filter-preset', items: filterPresets },
  {
    tab: 'Effects',
    heading: 'Effect preview',
    selector: '.video-effect-preset',
    items: videoEffects,
  },
  {
    tab: 'Transitions',
    heading: 'Transition preview',
    selector: '.transition-preset',
    items: transitionPresets.filter((item) => !unavailableOriginal(item.kind)),
  },
];
if (process.env.SHRAPWILL_PREVIEW_SAMPLE_ONLY) {
  const samples = new Set([
    'Original',
    'Sepia',
    '1977',
    'Canvas',
    'None',
    'RGB split',
    'Bokeh Blur',
    'Glow Effect',
    'Fisheye',
    'Camera shake',
  ]);
  for (const group of catalog)
    group.items = group.items.filter((item, index) => index < 5 || samples.has(item.name));
}
function card(selector, name) {
  return page
    .locator(selector)
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) });
}
async function pixels() {
  return page.getByTestId('preview-canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2'),
      sample = [];
    for (let y = 0.1; y < 1; y += 0.1)
      for (let x = 0.1; x < 1; x += 0.1) {
        const rgba = new Uint8Array(4);
        gl.readPixels(
          Math.floor(x * canvas.width),
          Math.floor(y * canvas.height),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          rgba,
        );
        sample.push(...rgba.slice(0, 3));
      }
    return sample;
  });
}
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
const empty = await snapshot();
const initialTime = await status.textContent();
const signatures = {};
for (const group of catalog) {
  await page.getByRole('button', { name: group.tab, exact: true }).click();
  await expect(page.locator(`${group.selector} .preset-description`)).toHaveCount(0);
  for (const preset of group.items) {
    await card(group.selector, preset.name).click();
    await expect(page.locator('.preview-panel .panel-heading')).toContainText(group.heading);
    await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
    await expect(status).toContainText(`${preset.name} · Sample`);
    await expect(apply).toBeDisabled();
    await expect
      .poll(async () => Math.max(...(await pixels())), {
        message: `${group.tab}: ${preset.name} should publish its first picture`,
        timeout: 5000,
      })
      .toBeGreaterThan(50);
    const sample = await pixels();
    signatures[preset.name] = sample.join(',');
  }
  await page.locator('.play-button').click();
  await expect(page.locator('.play-button svg.lucide-play')).toBeVisible();
  const paused = await status.textContent();
  await page.waitForTimeout(100);
  await expect(status).toHaveText(paused);
  await page.keyboard.press('ArrowRight');
  await expect(status).not.toHaveText(paused);
  await page.locator('.library-content').evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: path.join(qaDir, `preset-preview-${group.tab.toLowerCase()}-1366.png`),
  });
}
expect(signatures.Original).not.toBe(signatures.Sepia);
expect(signatures.None).not.toBe(signatures['RGB split']);
await page.setViewportSize({ width: 1920, height: 1080 });
await page.screenshot({ path: path.join(qaDir, 'preset-preview-1920.png') });
await back.click();
await expect(status).toHaveText(initialTime);
expect(await snapshot()).toEqual(empty);

await page.getByRole('button', { name: 'Effects', exact: true }).click();
await card('.video-effect-preset', 'Camera shake').click();
await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
await page.waitForTimeout(120);
const moving = (await pixels()).join(',');
await page.waitForTimeout(220);
expect((await pixels()).join(',')).not.toBe(moving);
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await card('.filter-preset', 'Sepia').click();
await page.getByRole('button', { name: 'Transitions', exact: true }).click();
await card('.transition-preset', 'Checker reveal').click();
await expect(status).toContainText('Checker reveal · Sample');
await expect(page.getByLabel('Transition preview duration')).toHaveValue('2');
await page.getByLabel('Transition preview duration').fill('3');
await page.getByLabel('Transition preview duration').blur();
await expect(page.locator('.play-button svg.lucide-pause')).toBeVisible();
await page.locator('.play-button').click();
await page.keyboard.press('Home');
const first = (await pixels()).join(',');
await page.keyboard.press('End');
await expect(status).toContainText('00:00:03:29');
await page.waitForTimeout(100);
expect((await pixels()).join(',')).not.toBe(first);
await back.click();
expect(await snapshot()).toEqual(empty);

await call('open_project', { path: path.join(qaDir, 'Validation.cutline') });
await page.getByLabel('Preview quality', { exact: true }).selectOption('360');
const opened = await snapshot();
const videoTrack = opened.project.tracks.find(
  (t) => t.kind === 'video' && t.clips.some((c) => c.mediaId),
);
const selected = videoTrack.clips.find((c) => c.mediaId);
await page.locator(`[data-clip-id="${selected.id}"]`).click();
const before = await snapshot();
const timelineTime = await status.textContent();
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await card('.filter-preset', 'Sepia').click();
await expect(status).toContainText(`Sepia · ${selected.name}`);
await expect(page.getByLabel('Preset preview strength')).toHaveValue('60');
await page.getByLabel('Preset preview strength').fill('35');
await expect(apply).toBeEnabled();
expect(editingState(await snapshot())).toEqual(editingState(before));
await apply.click();
await expect(back).toHaveCount(0);
const currentClip = async () =>
  (await snapshot()).project.tracks.flatMap((t) => t.clips).find((c) => c.id === selected.id);
await expect.poll(async () => (await currentClip()).props.sepia).toBe(1);
expect((await currentClip()).props.filterStrength).toBe(0.35);
expect((await snapshot()).revision).toBe(before.revision + 1);
await expect(status).toHaveText(timelineTime);
await call('history', { direction: 'undo' });
expect((await currentClip()).props).toEqual(selected.props);

await page.getByRole('button', { name: 'Effects', exact: true }).click();
const beforeEffect = await snapshot();
await card('.video-effect-preset', 'RGB split').dblclick();
await expect.poll(async () => (await currentClip()).props.rgbSplit).toBe(0.012);
expect((await currentClip()).props.effectStrength).toBe(0.6);
await page.waitForTimeout(200);
await expect(back).toHaveCount(0);
expect((await snapshot()).revision).toBe(beforeEffect.revision + 1);
await call('history', { direction: 'undo' });
expect((await currentClip()).props).toEqual(selected.props);

await page.getByRole('button', { name: 'Transitions', exact: true }).click();
await card('.transition-preset', 'Fade to black').click();
await page.getByLabel('Transition preview duration').fill('1.25');
await apply.click();
await expect
  .poll(async () => (await currentClip()).transition?.frames)
  .toBe(Math.min(38, selected.duration));
if (selected.duration < 38)
  await expect(
    page.getByText(/Transition shortened to .* seconds to fit the clips\./),
  ).toBeVisible();
await call('history', { direction: 'undo' });
await card('.transition-preset', 'Fade to black').click();
await page.getByLabel('Transition preview duration').fill('0.75');
await apply.click();
await expect.poll(async () => (await currentClip()).transition?.frames).toBe(23);
await call('history', { direction: 'undo' });
expect((await currentClip()).transition).toEqual(selected.transition);

await call('edit', { operation: { type: 'set_track', id: videoTrack.id, locked: true } });
const locked = await snapshot();
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await card('.filter-preset', 'Monochrome').click();
await expect(apply).toBeDisabled();
await expect(status).toContainText('Monochrome');
await back.click();
expect(editingState(await snapshot())).toEqual(editingState(locked));
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'preset-preview-results.json'),
  JSON.stringify(
    {
      passed: true,
      presets: catalog.reduce((sum, group) => sum + group.items.length, 0),
      checks: [
        'empty project samples',
        'all card subtitles removed',
        'selected clip preview',
        'no timeline/history mutation',
        'playback and frame stepping',
        'animated effects',
        'two-shot transitions',
        'latest selection',
        'explicit apply and undo',
        'double-click applies once',
        'locked clip preview',
        '1366 and 1920 layouts',
      ],
    },
    null,
    2,
  ),
);
console.log(
  `PASS: ${catalog.reduce((sum, group) => sum + group.items.length, 0)} transition/filter/effect previews, explicit apply, and timeline isolation`,
);
await browser.close();
