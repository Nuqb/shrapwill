import { qaDir, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const qa = qaDir;
const b = await chromium.connectOverCDP(debugUrl(9223));
const p = b.contexts()[0].pages()[0];
const call = (cmd, args = {}) =>
  p.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
await p.evaluate(async () => {
  window.__cacheJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback(
    (e) => (window.__cacheJobs[e.payload.id] = e.payload),
  );
  await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
await call('new_project', {
  name: 'Cache recovery',
  width: 640,
  height: 360,
  fps: { num: 30, den: 1 },
});
const id = await call('import_media', {
  paths: [path.join(qa, "Red café's clip.mp4")],
  quality: 720,
});
await p.waitForFunction((id) => window.__cacheJobs[id]?.status === 'complete', id);
let s = (await call('startup')).snapshot;
s = await call('edit', {
  operation: {
    type: 'add_clip',
    media_id: s.project.assets[0].id,
    track_id: s.project.tracks[0].id,
    start: 0,
  },
});
const savepath = path.join(qa, 'Cache-recovery.cutline');
await call('save', { path: savepath });
const preview = s.project.assets[0].previewPath;
const backup = preview + '.test-backup';
await fs.rename(preview, backup);
await call('open_project', { path: savepath });
let restored = null;
for (let attempt = 0; attempt < 100; attempt++) {
  const current = (await call('startup')).snapshot;
  const candidate = current.project.assets[0]?.previewPath;
  if (candidate && current.render?.clips[0]?.previewReady) {
    try {
      await fs.access(candidate);
      restored = candidate;
      break;
    } catch {}
  }
  await p.waitForTimeout(100);
}
if (!restored) throw Error('Preview did not regenerate within ten seconds');
await fs.unlink(backup);
await fs.writeFile(
  path.join(qa, 'cache-recovery-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'missing proxy detection',
        'on-demand background rebuild',
        'preview ready state restored',
      ],
    },
    null,
    2,
  ),
);
console.log('PASS: evicted preview is regenerated on demand');
await b.close();
