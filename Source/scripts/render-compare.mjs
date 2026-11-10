import { qaDir, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const qa = qaDir,
  ff = path.resolve('src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe');
const b = await chromium.connectOverCDP(debugUrl(9223));
const p = b.contexts()[0].pages()[0];
const call = (cmd, args = {}) =>
  p.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
let fixturePath = path.join(qa, 'Validation.cutline');
if (process.argv.includes('direct')) {
  const project = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  project.id += '-direct-preview';
  project.assets.forEach((asset) => {
    asset.previewPath = asset.path;
  });
  fixturePath = path.join(qa, 'Direct-preview-validation.cutline');
  await fs.writeFile(fixturePath, JSON.stringify(project));
}
await call('open_project', { path: fixturePath });
if (await p.locator('.launcher').count()) await p.locator('.launcher-top>button').click();
let s = (await call('startup')).snapshot;
const blue = s.project.tracks.flatMap((t) => t.clips).find((c) => c.name === 'Blue silent.mp4');
await call('edit', {
  operation: {
    type: 'properties',
    id: blue.id,
    props: {
      ...blue.props,
      scale: 0.65,
      rotation: 10,
      x: 65,
      y: -35,
      opacity: 0.85,
      cropLeft: 0.05,
      cropTop: 0.04,
      brightness: 0.05,
      contrast: 0.93,
      saturation: 0.8,
    },
  },
});
await p.evaluate(async () => {
  window.__compareJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback(
    (e) => (window.__compareJobs[e.payload.id] = e.payload),
  );
  await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
const file = path.join(qa, 'Compare.mp4');
const id = await call('start_export', {
  path: file,
  settings: { width: 640, height: 360, quality: 'high', encoder: 'software' },
});
await p.waitForFunction(
  (id) => window.__compareJobs[id] && window.__compareJobs[id].status !== 'running',
  id,
  { timeout: 120000 },
);
const job = await p.evaluate((id) => window.__compareJobs[id], id);
if (job.status !== 'complete') throw Error(JSON.stringify(job));
await p.locator('.timeline-scroll').evaluate((el) => (el.scrollLeft = 0));
const results = [];
for (const f of [12, 45, 82, 105, 140]) {
  await p.locator('.ruler').click({ position: { x: 142 + f * 1.5, y: 14 } });
  await p.waitForTimeout(450);
  const expected = `00:00:${String(Math.floor(f / 30)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
  const actual = await p.locator('.player-status>span').first().textContent();
  if (actual !== expected) throw Error(`Seek expected ${expected}, got ${actual}`);
  const preview = await p.locator('canvas').evaluate((el) => {
    const gl = el.getContext('webgl2');
    const data = [];
    for (let y = 12; y < 360; y += 24)
      for (let x = 12; x < 640; x += 24) {
        const pixel = new Uint8Array(4);
        gl.readPixels(
          Math.floor(((x + 0.5) / 640) * el.width),
          Math.floor((1 - (y + 0.5) / 360) * el.height),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel,
        );
        data.push({ x, y, rgb: [...pixel.slice(0, 3)] });
      }
    return data;
  });
  const output = execFileSync(
    ff,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file,
      '-vf',
      `select=eq(n\\,${f})`,
      '-frames:v',
      '1',
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      'pipe:1',
    ],
    { maxBuffer: 8 * 1024 * 1024, windowsHide: true },
  );
  const errors = preview.map(({ x, y, rgb }) => {
    const idx = (y * 640 + x) * 3;
    return (
      (Math.abs(rgb[0] - output[idx]) +
        Math.abs(rgb[1] - output[idx + 1]) +
        Math.abs(rgb[2] - output[idx + 2])) /
      3
    );
  });
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const within = errors.filter((e) => e < 16).length / errors.length;
  results.push({ frame: f, meanAbsoluteChannelError: mean, fractionWithin16: within });
}
await fs.writeFile(
  path.join(qa, 'render-comparison.json'),
  JSON.stringify(
    {
      passed: results.every((r) => r.meanAbsoluteChannelError < 10 && r.fractionWithin16 > 0.85),
      results,
      description:
        'Sparse RGB comparisons of WebGL preview and H.264 export, including title, LUT, crop, scale, position, rotation, opacity, dissolve and still image.',
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results));
if (results.some((r) => r.meanAbsoluteChannelError >= 10 || r.fractionWithin16 <= 0.85))
  throw Error('Preview/export comparison exceeded tolerance');
const audio = execFileSync(
  ff,
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    file,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '8000',
    '-f',
    's16le',
    'pipe:1',
  ],
  { maxBuffer: 2 * 1024 * 1024, windowsHide: true },
);
const rms = (sec) => {
  let n = 0;
  for (let i = Math.floor(sec * 8000); i < Math.floor((sec + 0.1) * 8000); i++) {
    const v = audio.readInt16LE(i * 2);
    n += v * v;
  }
  return Math.sqrt(n / 800);
};
if (rms(1.5) < 100 || rms(3.5) > 10) throw Error('Audio timeline timing did not match the video');
console.log('PASS: preview/export picture and audio timing');
await b.close();
