import { qaDir, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const qa = qaDir;
const b = await chromium.connectOverCDP(debugUrl(9223));
const p = b.contexts()[0].pages()[0];
const call = (cmd, args = {}) =>
  p.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const project = JSON.parse(await fs.readFile(path.join(qa, 'Validation.cutline'), 'utf8'));
const original = project.tracks
  .flatMap((t) => t.clips)
  .find((c) => c.mediaId && project.assets.find((a) => a.id === c.mediaId)?.name.includes('Red'));
project.id = crypto.randomUUID();
project.name = '100 precise cuts';
project.width = 64;
project.height = 64;
project.fps = { num: 30000, den: 1001 };
project.assets = project.assets.filter((a) => a.id === original.mediaId);
project.tracks = [
  {
    id: crypto.randomUUID(),
    name: 'Video 1',
    kind: 'video',
    locked: false,
    muted: false,
    visible: true,
    clips: Array.from({ length: 100 }, (_, i) => ({
      ...original,
      id: crypto.randomUUID(),
      start: i,
      duration: 1,
      sourceIn: 0,
      audioEnabled: false,
      link: null,
      transition: null,
    })),
  },
];
const projectPath = path.join(qa, 'Installed-timing.cutline');
await fs.writeFile(projectPath, JSON.stringify(project));
await call('open_project', { path: projectPath });
await p.evaluate(async () => {
  window.__finalJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback(
    (e) => (window.__finalJobs[e.payload.id] = e.payload),
  );
  await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
const output = path.join(qa, 'Installed-100-cuts.mp4');
const id = await call('start_export', {
  path: output,
  settings: { width: 64, height: 64, quality: 'draft', encoder: 'software' },
});
let result;
for (let attempt = 0; attempt < 600; attempt++) {
  result = await p.evaluate((id) => window.__finalJobs[id], id);
  if (result && result.status !== 'running') break;
  await p.waitForTimeout(100);
}
if (result?.status !== 'complete') throw Error(JSON.stringify(result));
const metadata = JSON.parse(
  execFileSync(
    path.join(qa, 'installed/ffprobe.exe'),
    ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', output],
    { encoding: 'utf8', windowsHide: true },
  ),
);
const video = metadata.streams.find((s) => s.codec_type === 'video');
const duration = +metadata.format.duration;
if (+video.nb_read_frames !== 100 || Math.abs(duration - (100 * 1001) / 30000) > 1001 / 30000)
  throw Error('Installed fractional-frame export failed');
await fs.writeFile(
  path.join(qa, 'installed-results.json'),
  JSON.stringify(
    {
      passed: true,
      frames: +video.nb_read_frames,
      duration,
      checks: [
        'NSIS installation',
        'installed app launch with PATH limited to Windows',
        'bundled FFmpeg and FFprobe',
        '100 consecutive one-frame edits at 29.97 fps',
        'exact frame count and duration',
      ],
    },
    null,
    2,
  ),
);
console.log(`PASS: installed app, bundled tools, 100 frames, ${duration} seconds`);
await b.close();
