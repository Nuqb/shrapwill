import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { defaults } from '../src/types.ts';
import { sourceRoot, qaDir, debugUrl } from './test-support/paths.mjs';

const images = path.join(sourceRoot, 'docs/images');
await fs.mkdir(images, { recursive: true });
const photos = ['beach-surfer', 'mountain-road', 'coastal-sunset', 'city-river'];
const names = ['Coastal morning', 'Mountain drive', 'Golden hour', 'Riverside walk'];
const assets = photos.map((name, index) => ({
  id: `photo-${index}`,
  path: path.join(sourceRoot, 'src/features/library/art/assets', `${name}.jpg`),
  name: names[index],
  kind: 'image',
  duration: 5,
  width: 1280,
  height: 720,
  hasAudio: false,
  previewPath: path.join(sourceRoot, 'src/features/library/art/assets', `${name}.jpg`),
  thumbnailPath: path.join(sourceRoot, 'src/features/library/art/assets', `${name}.jpg`),
  waveform: [],
  missing: false,
}));
const clips = assets.map((asset, index) => ({
  id: `shot-${index}`,
  mediaId: asset.id,
  name: asset.name,
  start: index * 120,
  duration: 150,
  sourceIn: 0,
  link: null,
  audioEnabled: false,
  props: { ...defaults },
  title: null,
  transition: index ? { kind: 'dissolve', frames: 30 } : null,
}));
const title = {
  id: 'title',
  mediaId: null,
  name: 'WEEKEND ESCAPE',
  start: 0,
  duration: 110,
  sourceIn: 0,
  link: null,
  audioEnabled: false,
  props: { ...defaults },
  transition: null,
  title: {
    text: 'WEEKEND ESCAPE',
    style: 'lower',
    fontSize: 60,
    color: '#ffffff',
    imagePath: null,
  },
};
const track = (id, name, kind, clips) => ({
  id,
  name,
  kind,
  clips,
  locked: false,
  muted: false,
  visible: true,
});
const project = {
  version: 1,
  magneticTimeline: false,
  id: 'readme-demo',
  name: 'Weekend escape',
  width: 1280,
  height: 720,
  fps: { num: 30, den: 1 },
  assets,
  tracks: [
    track('titles', 'Titles', 'video', [title]),
    track('picture', 'Picture', 'video', clips),
    track('audio', 'Audio', 'audio', []),
  ],
};
const filename = path.join(qaDir, 'Readme-demo.cutline');
await fs.writeFile(filename, JSON.stringify(project));
const browser = await chromium.connectOverCDP(debugUrl());
try {
  const page = browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(({ path }) => window.__TAURI_INTERNALS__.invoke('open_project', { path }), {
    path: filename,
  });
  if (await page.locator('.launcher').count())
    await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
  await page.getByRole('button', { name: 'Media', exact: true }).click();
  await page.locator('[data-clip-id="shot-0"]').click();
  await expect(page.getByTestId('preview-canvas')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(images, 'editor-overview.jpg'),
    type: 'jpeg',
    quality: 88,
  });
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const original = page
    .locator('.filter-preset')
    .filter({ has: page.locator('strong', { hasText: /^Original$/ }) });
  await original.click();
  await expect(page.locator('.preview-panel .panel-heading')).toContainText('Filter preview');
  if (await page.locator('.play-button svg.lucide-pause').count())
    await page.locator('.play-button').click();
  await page.mouse.move(960, 40);
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(images, 'preset-preview.jpg'),
    type: 'jpeg',
    quality: 88,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  await page.locator('[data-clip-id="title"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(images, 'titles-timeline.jpg'),
    type: 'jpeg',
    quality: 88,
  });
  console.log('Captured three authentic editor screenshots using bundled sample photography.');
} finally {
  await browser.close();
}
