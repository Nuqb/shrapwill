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
  window.__qaJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback(
    (event) => (window.__qaJobs[event.payload.id] = event.payload),
  );
  window.__qaListener = await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
async function job(id) {
  await p.waitForFunction(
    (id) => window.__qaJobs[id] && window.__qaJobs[id].status !== 'running',
    id,
    { timeout: 120000 },
  );
  return p.evaluate((id) => window.__qaJobs[id], id);
}
await call('new_project', {
  name: 'Native import and export',
  width: 640,
  height: 360,
  fps: { num: 30, den: 1 },
});
let id = await call('import_media', {
  paths: [
    path.join(qa, "Red café's clip.mp4"),
    path.join(qa, 'Blue silent.mp4'),
    path.join(qa, 'Warm still.png'),
  ],
  quality: 360,
});
let result = await job(id);
if (result.status !== 'complete') throw Error(JSON.stringify(result));
let s = (await call('startup')).snapshot;
const video = s.project.tracks[0].id;
for (let i = 0; i < 2; i++)
  s = await call('edit', {
    operation: {
      type: 'add_clip',
      media_id: s.project.assets[i].id,
      track_id: video,
      start: i * 90,
    },
  });
id = await call('start_export', {
  path: path.join(qa, 'Native-export.mp4'),
  settings: { width: 640, height: 360, quality: 'draft', encoder: 'software' },
});
result = await job(id);
if (result.status !== 'complete') throw Error(JSON.stringify(result));
if ((await fs.stat(path.join(qa, 'Native-export.mp4'))).size < 1000)
  throw Error('Export file missing');
await call('autosave');
const recovery = await call('startup');
if (!recovery.recovery) throw Error('Recovery save missing');
await call('recover_project');
if ((await call('startup')).snapshot.project.assets.length !== 3)
  throw Error('Recovery lost media');
const missingProject = JSON.parse(await fs.readFile(path.join(qa, 'Validation.cutline'), 'utf8'));
missingProject.assets[0].path = path.join(qa, 'missing-source.mp4');
await fs.writeFile(path.join(qa, 'Missing.cutline'), JSON.stringify(missingProject));
s = await call('open_project', { path: path.join(qa, 'Missing.cutline') });
if (!s.project.assets[0].missing) throw Error('Missing media was not detected');
id = await call('relink_media', {
  mediaId: s.project.assets[0].id,
  path: path.join(qa, "Red café's clip.mp4"),
  quality: 360,
});
result = await job(id);
if (result.status !== 'complete' || (await call('startup')).snapshot.project.assets[0].missing)
  throw Error('Relink failed');
id = await call('import_media', { paths: [path.join(qa, 'broken.mp4')], quality: 360 });
result = await job(id);
if (result.status !== 'failed') throw Error('Invalid import should fail');
await call('open_project', { path: path.join(qa, 'Reference-100-clips.cutline') });
const dest = path.join(qa, 'Preserve-on-cancel.mp4');
await fs.writeFile(dest, 'PRESERVE');
id = await call('start_export', {
  path: dest,
  settings: { width: 1920, height: 1080, quality: 'high', encoder: 'software' },
});
await call('cancel_job', { id });
result = await job(id);
if (result.status !== 'cancelled') throw Error('Export cancellation failed');
if ((await fs.readFile(dest, 'utf8')) !== 'PRESERVE')
  throw Error('Cancellation replaced an existing destination');
await fs.writeFile(
  path.join(qa, 'native-jobs-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'native import job and progress',
        'three media types',
        'editing through Rust commands',
        'native export job',
        'autosave recovery',
        'missing media detection',
        'relink job',
        'invalid import failure',
        'export cancellation',
        'destination preservation',
      ],
    },
    null,
    2,
  ),
);
console.log('PASS: native jobs, save/recovery, relinking, cancellation');
await b.close();
