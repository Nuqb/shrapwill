import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { importFixtures } from './test-support/import-fixtures.mjs';
await importFixtures();
const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
await page.evaluate(async () => {
  window.__importBench = { jobs: {}, start: performance.now() };
  for (const event of ['editor-changed', 'job']) {
    const handler = window.__TAURI_INTERNALS__.transformCallback((e) => {
      const state = window.__importBench;
      if (event === 'job') state.jobs[e.payload.id] = e.payload;
      else if (e.payload.project.assets.length && !state.firstAssetMs)
        state.firstAssetMs = performance.now() - state.start;
    });
    await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
      event,
      target: { kind: 'Any' },
      handler,
    });
  }
});
const hashBefore = (await import('node:crypto'))
  .createHash('sha256')
  .update(await fs.readFile(path.join(qaDir, 'Import-latency-60s.mp4')))
  .digest('hex');
await page.evaluate(() => (window.__importBench.start = performance.now()));
const jobId = await call('import_media', {
  paths: [path.join(qaDir, 'Import-latency-60s.mp4')],
  quality: 720,
});
await page.locator('.media-card').waitFor({ timeout: 120000 });
await page.locator('.add-media').first().click();
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
    gl.readPixels(
      Math.floor(canvas.width * 0.4),
      Math.floor(canvas.height * 0.4),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    if (pixel[0] + pixel[1] + pixel[2] < 50) return false;
    window.__importBench.firstPictureMs ??= performance.now() - window.__importBench.start;
    return true;
  },
  {},
  { timeout: 120000 },
);
await page.waitForFunction((id) => window.__importBench.jobs[id]?.status === 'complete', jobId, {
  timeout: 120000,
});
const result = await page.evaluate(() => ({
  firstAssetMs: window.__importBench.firstAssetMs,
  firstPictureMs: window.__importBench.firstPictureMs,
}));
const state = (await call('startup')).snapshot;
result.previewUsesOriginal = state.project.assets[0].previewPath === state.project.assets[0].path;
const hashAfter = (await import('node:crypto'))
  .createHash('sha256')
  .update(await fs.readFile(path.join(qaDir, 'Import-latency-60s.mp4')))
  .digest('hex');
if (hashBefore !== hashAfter) throw Error('Original file changed');
console.log(JSON.stringify(result));
await fs.writeFile(
  path.join(
    qaDir,
    'import-benchmark-' + (process.env.SHRAPWILL_IMPORT_BENCH_LABEL || 'current') + '.json',
  ),
  JSON.stringify(result, null, 2),
);
await browser.close();
