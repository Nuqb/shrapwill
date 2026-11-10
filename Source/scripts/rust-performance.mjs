// Isolated generated workloads. Does not connect to a user's running editor.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { sourceRoot, qaDir } from './test-support/paths.mjs';

const directory = path.join(qaDir, 'rust-conversion');
fs.mkdirSync(directory, { recursive: true });
const executable = path.join(sourceRoot, 'target/release/examples/engine_benchmark.exe');
const server = await createServer({
  root: sourceRoot,
  cacheDir: path.join(directory, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } },
});
let browser;
const results = [];
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto(`${server.resolvedUrls.local[0]}scripts/rust-performance.html`);
  const records = JSON.parse(
    execFileSync(executable, ['100', 'replay'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }),
  );
  const replayed = await page.evaluate(async (records) => {
    const { EditorStateStore } = await import('/src/services/desktop/stateUpdates.ts');
    const store = new EditorStateStore(async () => {
      throw Error('Unexpected resync');
    });
    const states = [];
    for (const record of records) states.push(await store.receive(record.update));
    return states;
  }, records);
  for (const [i, record] of records.entries()) {
    if (record.expected.render) record.expected.render.playbackIndex ??= null;
    if (replayed[i].render) replayed[i].render.playbackIndex ??= null;
    assert.deepEqual(replayed[i], record.expected, `Rust/browser update replay ${i}`);
  }
  console.log('Rust/browser update replay: 10 exact state matches');
  for (const size of [100, 1000, 10000]) {
    const fixture = JSON.parse(
      execFileSync(executable, [String(size), 'index'], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
    const runs = [];
    for (let run = 0; run < 5; run++)
      runs.push(
        await page.evaluate(async (plan) => {
          const { playbackCandidates } = await import('/src/features/preview/playbackIndex.ts');
          const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
          const samples = (operation, count, batch = 50) => {
            for (let i = 0; i < 100; i++) operation(i);
            return Array.from({ length: count }, (_, i) => {
              const start = performance.now();
              for (let j = 0; j < batch; j++) operation(i * batch + j);
              return (performance.now() - start) / batch;
            });
          };
          const withoutIndex = { ...plan, playbackIndex: undefined };
          const frame = (i) => (i * 17.3) % plan.duration;
          for (let i = 0; i < 1000; i++) {
            const old = playbackCandidates(withoutIndex, frame(i)),
              next = playbackCandidates(plan, frame(i));
            if (JSON.stringify(old) !== JSON.stringify(next))
              throw Error('Playback index changed composition/preloading');
          }
          const scan = samples((i) => playbackCandidates(withoutIndex, frame(i)), 40, 1000);
          const indexed = samples((i) => playbackCandidates(plan, frame(i)), 40, 1000);
          const serialized = JSON.stringify(plan.playbackIndex);
          const parsing = samples(() => JSON.parse(serialized), 40);
          const jsBuild = samples(() => {
            const order = plan.clips.map((_, i) => i);
            order.sort((a, b) => plan.clips[a].clip.start - plan.clips[b].clip.start || a - b);
            const index = {
              order,
              maxEnds: order.map(() => 0),
            };
            const fill = (first, end) => {
              if (first === end) return -Infinity;
              const mid = first + Math.floor((end - first) / 2);
              return (index.maxEnds[mid] = Math.max(
                plan.clips[order[mid]].clip.start + plan.clips[order[mid]].clip.duration,
                fill(first, mid),
                fill(mid + 1, end),
              ));
            };
            fill(0, order.length);
            return index;
          }, 40);
          return {
            scanMedianMs: median(scan),
            indexedMedianMs: median(indexed),
            parseMedianMs: median(parsing),
            jsBuildMedianMs: median(jsBuild),
            indexJsonBytes: serialized.length,
          };
        }, fixture),
      );
    results.push({
      clips: size,
      rustBuildMedianMs: fixture.rustBuildMedianMs,
      rustSerializeMedianMs: fixture.rustSerializeMedianMs,
      runs,
    });
  }
  fs.writeFileSync(path.join(directory, 'playback.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser?.close();
  await server.close();
}
