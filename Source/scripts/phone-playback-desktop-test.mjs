import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { qaDir, sourceRoot, debugUrl } from './test-support/paths.mjs';
import { importFixtures } from './test-support/import-fixtures.mjs';

// An explicit path permits a read-only check of a user's recording. By default use
// generated HEVC with portrait rotation, so this suite never needs personal media.
async function phoneFile() {
  if (process.env.SHRAPWILL_PHONE_FILE) return process.env.SHRAPWILL_PHONE_FILE;
  const { common } = await importFixtures();
  const ffmpeg = path.join(sourceRoot, 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe');
  const short = path.join(qaDir, 'Phone-HEVC-short.mp4');
  const phone = path.join(qaDir, 'Phone-HEVC-101s.mp4');
  if (await fs.stat(phone).catch(() => null)) return phone;
  execFileSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-y',
      '-i',
      common,
      '-t',
      '2',
      '-c:v',
      'libx265',
      '-preset',
      'ultrafast',
      '-x265-params',
      'log-level=error:pools=2',
      '-tag:v',
      'hvc1',
      '-c:a',
      'aac',
      short,
    ],
    { windowsHide: true },
  );
  execFileSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-y',
      '-stream_loop',
      '-1',
      '-i',
      short,
      '-t',
      '101',
      '-c',
      'copy',
      '-metadata:s:v:0',
      'rotate=90',
      phone,
    ],
    { windowsHide: true },
  );
  return phone;
}
const recording = await phoneFile();
const before = await fs.stat(recording);
const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
await page.evaluate(async () => {
  window.__phoneBench = { jobs: {}, start: performance.now() };
  for (const event of ['editor-changed', 'job']) {
    const handler = window.__TAURI_INTERNALS__.transformCallback((e) => {
      const bench = window.__phoneBench;
      if (event === 'job') bench.jobs[e.payload.id] = e.payload;
      else if (e.payload.project.assets.length)
        bench.firstAssetMs ??= performance.now() - bench.start;
    });
    await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
      event,
      target: { kind: 'Any' },
      handler,
    });
  }
});
await page.evaluate(() => (window.__phoneBench.start = performance.now()));
await call('import_media', { paths: [recording], quality: 720 });
await expect(page.locator('.media-card')).toBeVisible();
let state = (await call('startup')).snapshot;
expect(state.project.assets[0].previewPath).toBe(state.project.assets[0].path);
const from = await page.locator('.media-image').boundingBox(),
  lane = await page.locator('.track-row.video .track-lane').first().boundingBox();
await page.mouse.move(from.x + 25, from.y + 25);
await page.mouse.down();
await page.mouse.move(lane.x + 5, lane.y + 30, { steps: 15 });
await expect(page.locator('.library-drop-preview')).toBeVisible();
await page.mouse.up();
await page.waitForFunction(
  () => {
    const canvas = document.querySelector('[data-testid="preview-canvas"]'),
      gl = canvas?.getContext('webgl2', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      });
    if (!gl) return false;
    const pixel = new Uint8Array(4);
    let brightness = 0;
    for (const x of [0.45, 0.5, 0.55])
      for (const y of [0.25, 0.5, 0.75]) {
        gl.readPixels(
          Math.floor(canvas.width * x),
          Math.floor(canvas.height * y),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel,
        );
        brightness = Math.max(brightness, pixel[0] + pixel[1] + pixel[2]);
      }
    if (brightness < 25) return false;
    window.__phoneBench.firstPictureMs ??= performance.now() - window.__phoneBench.start;
    return true;
  },
  {},
  { timeout: 10000 },
);
await page.locator('.media-image').click();
await expect(page.locator('.preview-panel .panel-heading')).toContainText('Source');
await expect(page.locator('video[controls]')).toHaveCount(0);
await expect(page.locator('.player-status .subtle')).toContainText(
  `${state.project.assets[0].width} \u00d7 ${state.project.assets[0].height}`,
);
const sourceFrame = Math.round((80 * state.project.fps.num) / state.project.fps.den);
await page.getByLabel('Source position', { exact: true }).evaluate((input, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
    input,
    String(value),
  );
  input.dispatchEvent(new Event('input', { bubbles: true }));
}, sourceFrame);
await expect(page.getByLabel('Source position', { exact: true })).toHaveValue(String(sourceFrame));
await page.waitForTimeout(200);
await page.waitForFunction(
  () => Object.values(window.__phoneBench.jobs).every((j) => j.status !== 'running'),
  {},
  { timeout: 120000 },
);
state = (await call('startup')).snapshot;
expect(state.project.assets[0].previewPath).toBe(state.project.assets[0].path);
const metrics = await page.evaluate(() => ({
  firstAssetMs: window.__phoneBench.firstAssetMs,
  firstPictureMs: window.__phoneBench.firstPictureMs,
  jobs: Object.values(window.__phoneBench.jobs).map((j) => ({ kind: j.kind, status: j.status })),
}));
const after = await fs.stat(recording);
expect(after.size).toBe(before.size);
expect(after.mtimeMs).toBe(before.mtimeMs);
expect(errors).toEqual([]);
const result = {
  ...metrics,
  duration: state.project.assets[0].duration,
  bytes: after.size,
  previewUsesOriginal: true,
  mouseDrop: true,
  portraitPlayback: true,
  seekTo80Seconds: true,
  originalUnchanged: true,
};
await fs.writeFile(
  path.join(
    qaDir,
    process.env.SHRAPWILL_PHONE_FILE
      ? 'phone-recording-results.json'
      : 'phone-fixture-results.json',
  ),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
await browser.close();
