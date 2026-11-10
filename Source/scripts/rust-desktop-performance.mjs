// Run only through test-desktop.mjs, which owns an isolated editor process.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { qaDir, debugUrl } from './test-support/paths.mjs';

const directory = path.join(qaDir, 'rust-conversion');
fs.mkdirSync(directory, { recursive: true });
const reference = JSON.parse(fs.readFileSync(path.join(qaDir, 'Validation.cutline'), 'utf8'));
const project = { ...reference, id: 'rust-performance', name: 'Generated performance project' };
project.assets = Array.from({ length: 100 }, (_, i) => ({
  ...reference.assets[0],
  id: `asset-${i}`,
  waveform: Array.from({ length: 1800 }, (_, sample) => ((sample + i) % 100) / 100),
}));
project.tracks = reference.tracks.slice(0, 1).map((track) => ({
  ...track,
  locked: false,
  clips: Array.from({ length: 1000 }, (_, i) => ({
    ...track.clips[0],
    id: `clip-${i}`,
    mediaId: `asset-${i % 100}`,
    start: i * 30,
    duration: 30,
    sourceIn: 0,
    link: null,
  })),
}));
const fixture = path.join(directory, 'desktop-fixture.cutline');
fs.writeFileSync(fixture, JSON.stringify(project));
const version = await fetch(`${debugUrl()}/json/version`).then((response) => response.json());
const browser = await chromium.connectOverCDP(version.webSocketDebuggerUrl);
const page = browser
  .contexts()[0]
  .pages()
  .find((p) => p.url().includes('tauri.localhost'));
assert.ok(page, 'isolated editor page');
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const invoke = (command, args = {}) =>
  page.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), {
    command,
    args,
  });
await invoke('open_project', { path: fixture });
if (await page.locator('.launcher-top>button').count())
  await page.locator('.launcher-top>button').click();
await page.waitForFunction(() =>
  document.querySelector('.header-project button')?.textContent.includes('Generated performance'),
);
const runs = [];
for (let run = 0; run < 5; run++) {
  await invoke('open_project', { path: fixture });
  await page.waitForFunction(() =>
    document.querySelector('.header-project button')?.textContent.includes('Generated performance'),
  );
  const times = await page.evaluate(async (run) => {
    const results = [];
    for (let i = 0; i < 25; i++) {
      const name = `Performance ${run}-${i}`;
      const started = performance.now();
      let observer, timer;
      const updated = new Promise((resolve, reject) => {
        const check = () => {
          if (document.querySelector('.header-project button')?.textContent.includes(name))
            resolve();
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true });
        timer = setTimeout(
          () => reject(Error('Editor did not display the acknowledged edit')),
          5000,
        );
      });
      try {
        await Promise.all([
          updated,
          window.__TAURI_INTERNALS__.invoke('edit', {
            operation: { type: 'rename', name },
            compact: true,
          }),
        ]);
        if (i >= 5) results.push(performance.now() - started);
      } finally {
        observer.disconnect();
        clearTimeout(timer);
      }
    }
    return results;
  }, run);
  times.sort((a, b) => a - b);
  runs.push({ medianMs: times[10], p95Ms: times[19], samplesMs: times });
}
assert.deepEqual(errors, []);
const snapshot = await invoke('startup');
assert.equal(snapshot.snapshot.project.tracks[0].clips.length, 1000);
const label = process.env.SHRAPWILL_RUST_PERF_LABEL || 'after';
fs.writeFileSync(
  path.join(directory, `desktop-${label}.json`),
  JSON.stringify({ clips: 1000, runs }, null, 2),
);
console.log(
  JSON.stringify({ label, runs: runs.map(({ medianMs, p95Ms }) => ({ medianMs, p95Ms })) }),
);
await browser.close();
