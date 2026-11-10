import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { importFixtures } from './test-support/import-fixtures.mjs';

const files = await importFixtures();
const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0],
  errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const snapshot = async () => (await call('startup')).snapshot;
const hash = async (file) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const originalHash = await hash(files.common);
await page.getByRole('button', { name: 'New project', exact: true }).click();
await page.getByRole('button', { name: 'Create project', exact: true }).click();
await page.evaluate(async () => {
  window.__importJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback((event) => {
    window.__importJobs[event.payload.id] = event.payload;
  });
  await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
async function waitJob(id, status = 'complete') {
  await page.waitForFunction(
    (id) => window.__importJobs[id]?.status && window.__importJobs[id].status !== 'running',
    id,
    { timeout: 120000 },
  );
  const job = await page.evaluate((id) => window.__importJobs[id], id);
  expect(job.status, job.message).toBe(status);
}
async function add(paths) {
  return call('import_media', { paths, quality: 720 });
}
async function idle() {
  await page.waitForFunction(
    () => Object.values(window.__importJobs).every((job) => job.status !== 'running'),
    {},
    { timeout: 120000 },
  );
}
let job = await add([files.common]);
await waitJob(job);
const imported = await snapshot(),
  asset = imported.project.assets[0];
expect(asset.previewPath).toBe(asset.path);
await idle();
const revision = imported.revision;
await waitJob(await add([files.common]));
expect((await snapshot()).project.assets).toHaveLength(1);
expect((await snapshot()).revision).toBe(revision);

// Both heavy workers are occupied; metadata must still be able to add another file.
const busyA = await call('prepare_compatible_preview', { quality: 720, mediaIds: [asset.id] });
const busyB = await call('prepare_compatible_preview', { quality: 1080, mediaIds: [asset.id] });
await page.waitForFunction(
  ([a, b]) =>
    window.__importJobs[a]?.status === 'running' && window.__importJobs[b]?.status === 'running',
  [busyA, busyB],
);
const start = performance.now();
await waitJob(await add([files.image]));
const busyImportMs = performance.now() - start;
expect(busyImportMs).toBeLessThan(2000);
expect((await snapshot()).project.assets).toHaveLength(2);
for (const id of [busyA, busyB]) await call('cancel_job', { id });
for (const id of [busyA, busyB]) await waitJob(id, 'cancelled');
await idle();

// Exercise compatible-preview replacement while source playback is paused at five seconds.
await page.evaluate(() => {
  const create = document.createElement.bind(document);
  document.createElement = (name, ...args) => {
    const el = create(name, ...args);
    if (name === 'video') window.__sourceVideo = el;
    return el;
  };
});
await page.locator('.media-image').first().click();
const sourcePosition = page.getByLabel('Source position', { exact: true });
await sourcePosition.evaluate((input) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '150');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await expect(sourcePosition).toHaveValue('150');
await page.waitForFunction(() => window.__sourceVideo?.readyState >= 2);
await page.evaluate(() => window.__sourceVideo.dispatchEvent(new Event('error')));
await expect
  .poll(async () => (await snapshot()).project.assets[0].previewPath, { timeout: 120000 })
  .not.toBe(asset.path);
await page.waitForFunction(
  () =>
    window.__sourceVideo?.currentSrc.includes('preview.mp4') &&
    window.__sourceVideo.readyState >= 2,
);
await expect(sourcePosition).toHaveValue('150');
expect(await page.evaluate(() => window.__sourceVideo.paused)).toBe(true);
expect(await page.evaluate(() => window.__sourceVideo.currentTime)).toBeCloseTo(5, 0);
await expect(page.locator('.play-button svg.lucide-play')).toBeVisible();
await page.getByRole('button', { name: 'Back to timeline', exact: true }).click();
await idle();

// Finishing a background conversion after Undo must not resurrect an imported asset.
const known = await page.evaluate(() => Object.keys(window.__importJobs));
await waitJob(await add([files.fallback]));
await page.waitForFunction(
  (known) =>
    Object.values(window.__importJobs).some(
      (job) =>
        !known.includes(job.id) &&
        job.kind === 'preview' &&
        job.status === 'running' &&
        job.progress > 0,
    ),
  known,
);
await call('history', { direction: 'undo' });
const undone = await snapshot();
expect(undone.project.assets).toHaveLength(2);
await idle();
expect((await snapshot()).project).toEqual(undone.project);
expect((await snapshot()).revision).toBe(undone.revision);

await waitJob(await add([files.audio, files.broken]), 'failed');
await idle();
const partial = await snapshot();
expect(partial.project.assets).toHaveLength(3);
const audio = partial.project.assets.find((a) => a.kind === 'audio');
expect(audio.previewPath).toBe(audio.path);
expect(audio.waveform.length).toBeGreaterThan(0);

const priorJobs = await page.evaluate(() => Object.keys(window.__importJobs));
await waitJob(await add([files.switching]));
await page.waitForFunction(
  (known) =>
    Object.values(window.__importJobs).some(
      (job) =>
        !known.includes(job.id) &&
        job.kind === 'preview' &&
        job.status === 'running' &&
        job.progress > 0,
    ),
  priorJobs,
);
await call('new_project', {
  name: 'After import cancellation',
  width: 1280,
  height: 720,
  fps: { num: 30, den: 1 },
});
await idle();
expect((await snapshot()).project.assets).toHaveLength(0);
expect(await hash(files.common)).toBe(originalHash);
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(qaDir, 'fast-import-results.json'),
  JSON.stringify(
    {
      passed: true,
      busyImportMs,
      checks: [
        'direct original playback',
        'duplicate imports',
        'metadata bypasses occupied heavy workers',
        'fallback conversion',
        'source position/pause preserved',
        'undo is not overwritten by background work',
        'partial import failures',
        'project switch cancellation',
        'original bytes preserved',
      ],
    },
    null,
    2,
  ),
);
console.log(
  `PASS: fast import, fallback, undo/cancellation, original preservation; busy-queue add ${Math.round(busyImportMs)} ms`,
);
await browser.close();
