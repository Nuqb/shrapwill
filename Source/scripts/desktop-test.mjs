import { qaDir, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const qa = qaDir;
const browser = await chromium.connectOverCDP(debugUrl(9223));
const context = browser.contexts()[0];
const pages = context.pages();
const page = pages.find((p) => p.url().includes('tauri.localhost')) || pages[0];
if (!page) throw Error('No Cutline window found');
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const invoke = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
if (!(await page.locator('.launcher').count())) await page.locator('.app-header .brand').click();
await page.waitForSelector('.launcher');
await page.screenshot({ path: path.join(qa, 'launcher.png') });
const state = await invoke('startup');
if (!state.snapshot) throw Error('Rust bridge unavailable');
await invoke('open_project', { path: path.join(qa, 'Validation.cutline') });
await page.locator('.launcher-top>button').click();
await page.waitForSelector('.timeline-clip');
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(qa, 'editor-initial.png') });
const canvas = page.locator('[data-testid="preview-canvas"]');
const pixels = await canvas.evaluate((el) => {
  const g = el.getContext('webgl2');
  const b = new Uint8Array(4);
  g.readPixels(
    Math.floor(el.width / 2),
    Math.floor(el.height / 2),
    1,
    1,
    g.RGBA,
    g.UNSIGNED_BYTE,
    b,
  );
  return [...b];
});
if (pixels[0] < 50 || pixels[0] <= pixels[1])
  throw Error(`Preview expected a red scene, got ${pixels}`);
const before = await invoke('startup');
const clips = before.snapshot.project.tracks.flatMap((t) => t.clips);
const video = before.snapshot.project.tracks.find(
  (t) => t.kind === 'video' && t.clips.some((c) => !c.title),
);
const clip = video.clips[0];
await page
  .getByRole('button', { name: `${clip.name}, ${video.name}`, exact: true })
  .first()
  .click();
await page.getByRole('button', { name: 'Color', exact: true }).click();
await page
  .locator('.color-inspector summary')
  .filter({ hasText: /^Light$/ })
  .click();
const brightness = page.getByLabel('Brightness', { exact: true });
await brightness.focus();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Tab');
await page.waitForTimeout(250);
const after = await invoke('startup');
if (
  after.snapshot.project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id).props
    .brightness <= clip.props.brightness
)
  throw Error('Color edit did not reach Rust');
await page.keyboard.press('Control+z');
await page.waitForTimeout(200);
const afterUndo = await invoke('startup');
if (
  Math.abs(
    afterUndo.snapshot.project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id).props
      .brightness - clip.props.brightness,
  ) > 0.0001
)
  throw Error('Undo failed');
await page.getByRole('button', { name: 'Titles', exact: true }).click();
const titleButton = page.locator('.title-preset.plain');
await titleButton.click();
await page.waitForTimeout(500);
await page.locator('.timeline-clip.title-clip').first().click();
await page.getByRole('button', { name: 'Video', exact: true }).click();
const title = page.getByLabel('Title text', { exact: true });
await title.fill('CUTLINE / A FIRST EDIT');
await title.blur();
await page.waitForTimeout(400);
const saved = path.join(qa, 'Desktop-saved.cutline');
await invoke('save', { path: saved });
const disk = JSON.parse(await fs.readFile(saved, 'utf8'));
if (!disk.tracks.some((t) => t.clips.some((c) => c.title?.text === 'CUTLINE / A FIRST EDIT')))
  throw Error('Title save failed');
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(350);
await page.screenshot({ path: path.join(qa, 'editor-1920.png') });
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(350);
await page.screenshot({ path: path.join(qa, 'editor-1366.png') });
const overflow = await page.evaluate(() => ({
  width: innerWidth,
  scroll: document.documentElement.scrollWidth,
  main: document.querySelector('.editor-main').getBoundingClientRect().toJSON(),
}));
if (overflow.scroll > overflow.width) throw Error('Workspace overflows at 1366px');
await page.locator('.app-header [data-action="export_video"]').click();
await page.waitForSelector('.export-dialog');
await page.screenshot({ path: path.join(qa, 'export-dialog.png') });
await page.getByRole('button', { name: 'Close export dialog', exact: true }).click();
await invoke('open_project', { path: path.join(qa, 'Validation.cutline') });
await page.waitForTimeout(300);
await page.locator('.timeline-scroll').evaluate((e) => (e.scrollLeft = 0));
await page.locator('.timeline-clip').first().click();
const keyframeBefore = await page.locator('.player-status>span').first().textContent();
await page.keyboard.press('Space');
await page.waitForTimeout(1100);
await page.keyboard.press('Space');
const keyframeAfter = await page.locator('.player-status>span').first().textContent();
if (keyframeAfter === keyframeBefore) throw Error('Playback clock did not advance');
const fatal = errors.filter((e) => !e.includes('ERR_ABORTED'));
if (fatal.length) throw Error(`Browser errors: ${fatal.join('\n')}`);
await fs.writeFile(
  path.join(qa, 'desktop-results.json'),
  JSON.stringify(
    {
      passed: true,
      previewPixel: pixels,
      viewport: overflow,
      checks: [
        'Rust bridge',
        'source media preview',
        'WebGL rendering',
        'color control',
        'undo through keyboard',
        'title creation and editing',
        'save to disk',
        '1920 and 1366 layouts',
        'export dialog',
        'playback clock',
      ],
      errors,
    },
    null,
    2,
  ),
);
console.log('PASS: native desktop UI and Rust bridge');
await browser.close();
