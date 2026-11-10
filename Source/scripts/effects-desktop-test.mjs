import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { defaults } from '../src/types.ts';
import { filterPresets } from '../src/features/library/presets.ts';
import { videoEffects } from '../src/features/library/videoEffects.ts';

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const snapshot = async () => (await call('startup')).snapshot;
const ffmpeg = path.resolve('src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe');
const picture = path.join(qaDir, 'Effect-pattern.png');
execFileSync(
  ffmpeg,
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=s=640x360:r=30',
    '-frames:v',
    '1',
    picture,
  ],
  { windowsHide: true },
);
const transparent = path.join(qaDir, 'Effect-alpha.png');
execFileSync(
  ffmpeg,
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    picture,
    '-vf',
    "format=gbrap,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(X,W/3),0,160)',format=rgba",
    '-frames:v',
    '1',
    transparent,
  ],
  { windowsHide: true },
);
const fixture = JSON.parse(await fs.readFile(path.join(qaDir, 'Validation.cutline'), 'utf8'));
const originalSmoke = process.argv.includes('--original-smoke');
const originalFisheye = videoEffects.find((effect) => effect.name === 'Fisheye');
const originalColor = filterPresets.find((filter) => filter.name === '1977');
if (!originalFisheye || !originalColor) throw Error('Original preset fixtures are missing');
const selectedEffects = originalSmoke
  ? [
      videoEffects.find((effect) => effect.name === 'Color Glitch'),
      videoEffects.find((effect) => effect.name.toLowerCase() === 'tvwall'),
      {
        ...originalFisheye,
        ...originalColor,
        name: 'Original transparent compound',
        transparent: true,
      },
      { ...originalFisheye, ...originalColor, name: 'Original transitioned compound' },
      {
        ...videoEffects.find((effect) => effect.name === 'Bokeh Blur'),
        ...filterPresets.find((filter) => filter.name === 'Blue Skies'),
        name: 'Graph transparent compound',
        transparent: true,
      },
      {
        ...videoEffects.find((effect) => effect.name === 'Glow Effect'),
        ...filterPresets.find((filter) => filter.name === 'Charcoal'),
        name: 'Graph transitioned compound',
      },
    ]
  : videoEffects;
const scenarios = [
  ...selectedEffects,
  {
    name: 'Transparent Fisheye',
    effectStyle: 8,
    effectAmount: 0.7,
    mosaic: 0,
    mirror: 0,
    rgbSplit: 0,
    shake: 0,
    transparent: true,
  },
  { name: 'Combined crop and rotation', mosaic: 0.025, mirror: 1, rgbSplit: 0.01, shake: 0.015 },
  {
    name: 'Transparent RGB mirror',
    mosaic: 0,
    mirror: 1,
    rgbSplit: 0.025,
    shake: 0.025,
    transparent: true,
  },
];
if (process.env.SHRAPWILL_STRENGTH_CASES) {
  const presets = [
    videoEffects.find((p) => p.name === 'RGB split'),
    videoEffects.find((p) => p.name === 'Soft blur'),
    videoEffects.find((p) => p.name === 'Bokeh Blur'),
    videoEffects.find((p) => p.name === 'Glow Effect'),
    originalFisheye,
    originalColor,
    filterPresets.find((p) => p.name === 'Sepia'),
  ];
  scenarios.splice(
    0,
    scenarios.length,
    ...presets.flatMap((preset) =>
      [0, 0.6, 1].map((strength) => ({
        ...preset,
        name: `${preset.name} strength ${strength}`,
        effectStrength: strength,
        filterStrength: strength,
        transparent: preset.name === 'Glow Effect',
      })),
    ),
  );
}
const project = {
  ...fixture,
  id: 'effects-qa',
  name: 'Video effects QA',
  width: 640,
  height: 360,
  fps: { num: 30, den: 1 },
  magneticTimeline: false,
  assets: [
    {
      id: 'pattern',
      path: picture,
      previewPath: picture,
      thumbnailPath: picture,
      name: 'Pattern',
      kind: 'image',
      duration: 5,
      width: 640,
      height: 360,
      hasAudio: false,
      missing: false,
      waveform: [],
    },
  ],
  tracks: [
    {
      id: 'effects-track',
      name: 'Video 1',
      kind: 'video',
      visible: true,
      muted: false,
      locked: false,
      clips: scenarios.map((effect, index) => ({
        id: `effect-${index}`,
        mediaId: effect.transparent ? 'alpha' : 'pattern',
        name: effect.name,
        start: effect.name.endsWith('transitioned compound') ? index * 3 - 2 : index * 3,
        duration: effect.name.endsWith('transitioned compound') ? 5 : 3,
        sourceIn: 0,
        link: null,
        audioEnabled: false,
        title: null,
        transition: effect.name.endsWith('transitioned compound')
          ? { kind: effect.name.startsWith('Graph') ? 'local_halo_blur' : 'warp_zoom_3', frames: 2 }
          : effect.name === 'Combined crop and rotation'
            ? { kind: 'wipe_right', frames: 2 }
            : null,
        props: {
          ...defaults,
          mosaic: effect.mosaic,
          rgbSplit: effect.rgbSplit,
          shake: effect.shake,
          mirror: effect.mirror,
          wave: effect.wave ?? 0,
          vignette: effect.vignette ?? 0,
          scanlines: effect.scanlines ?? 0,
          effectStyle: effect.effectStyle ?? 0,
          effectAmount: effect.effectAmount ?? 0,
          originalEffect: effect.originalEffect ?? '',
          originalFilter: effect.originalFilter ?? '',
          effectStrength: effect.effectStrength ?? 1,
          filterStrength: effect.filterStrength ?? 1,
          sepia: effect.sepia ?? 0,
          contrast: effect.contrast ?? 1,
          ...(effect.name.endsWith('transitioned compound')
            ? {
                cropLeft: 0.05,
                cropTop: 0.04,
                scale: 0.78,
                rotation: 10,
                x: 25,
                brightness: 0.06,
                contrast: 1.1,
              }
            : {}),
          ...(index === scenarios.length - 1
            ? { cropLeft: 0.05, cropTop: 0.04, scale: 0.78, rotation: 10, x: 25, warmth: 0.2 }
            : {}),
        },
      })),
    },
  ],
};
project.assets.push({
  ...project.assets[0],
  id: 'alpha',
  path: transparent,
  previewPath: transparent,
  thumbnailPath: transparent,
});
// An invisible layer creates export interval boundaries midway through Camera shake.
project.tracks.push({
  ...project.tracks[0],
  id: 'boundary-track',
  name: 'Boundary',
  clips: [
    {
      ...project.tracks[0].clips[0],
      id: 'boundary',
      start:
        Math.max(
          0,
          scenarios.findIndex((effect) => effect.name === 'Camera shake'),
        ) *
          3 +
        1,
      duration: 1,
      props: { ...defaults, opacity: 0 },
    },
  ],
});
const file = path.join(qaDir, 'Video-effects.cutline');
await fs.writeFile(file, JSON.stringify(project));
await call('open_project', { path: file });
if (await page.locator('.launcher').count())
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
await page.getByLabel('Preview quality', { exact: true }).selectOption('360');

await page.getByRole('button', { name: 'Filters', exact: true }).click();
await expect(page.locator('.filter-preset')).toHaveCount(filterPresets.length);
await expect(page.locator('.video-effect-preset')).toHaveCount(0);
await page.keyboard.press('Alt+5');
await expect(page.locator('.video-effect-preset')).toHaveCount(videoEffects.length);
await page.getByRole('button', { name: 'Shrapwill', exact: true }).click();
await expect(page.locator('.video-effect-preset')).toHaveCount(
  videoEffects.filter((p) => !p.originalEffect).length,
);
await page.getByRole('button', { name: 'All', exact: true }).click();
await page.getByLabel('Search presets').fill('channel');
await expect(page.locator('.video-effect-preset')).toHaveCount(
  videoEffects.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes('channel')).length,
);
await page.getByLabel('Search presets').fill('');
await page.locator('[data-clip-id="effect-0"]').click();
await expect(page.getByLabel('Effect style', { exact: true }).locator('option')).toHaveCount(11);
const choose = (selector, name) =>
  page
    .locator(selector)
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) })
    .dblclick();
const currentClip = async () => (await snapshot()).project.tracks[0].clips[0];
await choose('.video-effect-preset', 'RGB split');
await expect.poll(async () => (await currentClip()).props.rgbSplit).toBe(0.012);
await page.keyboard.press('Alt+6');
await expect(page.locator('.filter-preset')).toHaveCount(filterPresets.length);
await choose('.filter-preset', 'Sepia');
await expect.poll(async () => (await currentClip()).props.sepia).toBe(1);
expect((await currentClip()).props.rgbSplit).toBe(0.012);
await page.getByRole('button', { name: 'Reset video effects', exact: true }).click();
await expect.poll(async () => (await currentClip()).props.rgbSplit).toBe(0);
expect((await currentClip()).props.sepia).toBe(1);
await call('history', { direction: 'undo' });
await expect.poll(async () => (await currentClip()).props.rgbSplit).toBe(0.012);
await page.getByRole('button', { name: 'Color', exact: true }).click();
await page.getByRole('button', { name: 'Reset color', exact: true }).click();
await expect.poll(async () => (await currentClip()).props.sepia).toBe(0);
expect((await currentClip()).props.rgbSplit).toBe(0.012);
await page.getByRole('button', { name: 'Video', exact: true }).click();
await page.getByLabel('RGB separation', { exact: true }).fill('2.2');
await page.getByLabel('RGB separation', { exact: true }).blur();
await expect.poll(async () => (await currentClip()).props.rgbSplit).toBe(0.022);
await page.getByLabel('Mirror split', { exact: true }).selectOption('1');
await expect.poll(async () => (await currentClip()).props.mirror).toBe(1);
const saved = path.join(qaDir, 'Effects-controls-saved.cutline');
await call('save', { path: saved });
const disk = JSON.parse(await fs.readFile(saved, 'utf8'));
expect(disk.tracks[0].clips[0].props.rgbSplit).toBe(0.022);
await page.getByRole('button', { name: 'Effects', exact: true }).click();
await choose('.video-effect-preset', 'Fisheye');
await expect
  .poll(async () => (await currentClip()).props.originalEffect)
  .toBe(originalFisheye.originalEffect);
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await choose('.filter-preset', '1977');
await expect
  .poll(async () => (await currentClip()).props.originalFilter)
  .toBe(originalColor.originalFilter);
expect((await currentClip()).props.originalEffect).toBe(originalFisheye.originalEffect);
await call('save', { path: saved });
await call('open_project', { path: saved });
expect((await currentClip()).props.originalFilter).toBe(originalColor.originalFilter);
expect((await currentClip()).props.originalEffect).toBe(originalFisheye.originalEffect);
await page.getByRole('button', { name: 'Effects', exact: true }).click();
await page.locator('[data-clip-id="effect-0"]').click();
await choose('.video-effect-preset', 'Soft glow');
await expect.poll(async () => (await currentClip()).props.effectStyle).toBe(2);
expect((await currentClip()).props.originalEffect).toBe('');
expect((await currentClip()).props.shake).toBe(0);
expect((await currentClip()).props.rgbSplit).toBe(0);
await page.getByLabel('Style strength', { exact: true }).fill('50');
await page.getByLabel('Style strength', { exact: true }).blur();
await expect.poll(async () => (await currentClip()).props.effectAmount).toBe(0.5);
await page.getByRole('button', { name: 'Reset video effects', exact: true }).click();
await expect.poll(async () => (await currentClip()).props.effectStyle).toBe(0);
await call('history', { direction: 'undo' });
await expect.poll(async () => (await currentClip()).props.effectStyle).toBe(2);
await call('save', { path: saved });
await call('open_project', { path: saved });
expect((await currentClip()).props.effectAmount).toBe(0.5);
await call('open_project', { path: file });

await page.evaluate(async () => {
  window.__effectJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback((e) => {
    window.__effectJobs[e.payload.id] = e.payload;
  });
  await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
const output = path.join(qaDir, 'Video-effects.mp4');
const job = await call('start_export', {
  path: output,
  settings: { width: 640, height: 360, quality: 'high', encoder: 'software' },
});
await page.waitForFunction(
  (id) => window.__effectJobs[id]?.status && window.__effectJobs[id].status !== 'running',
  job,
  { timeout: 600000 },
);
expect(await page.evaluate((id) => window.__effectJobs[id].status, job)).toBe('complete');

async function seek(frame) {
  const bounds = await page.locator('.timeline-scroll').boundingBox();
  await page.locator('.timeline-scroll').evaluate((el, frame) => {
    el.scrollLeft = Math.max(0, frame * 1.5 - 250);
  }, frame);
  const offset = await page.locator('.timeline-scroll').evaluate((el) => el.scrollLeft);
  await page.mouse.click(bounds.x + 142 + frame * 1.5 - offset, bounds.y + 14);
  // WebView pointer coordinates round to whole pixels at the default 1.5 px/frame zoom.
  // Correct that subframe rounding using the editor's actual frame-step shortcuts.
  await page.waitForTimeout(50);
  const displayed = await page.locator('.player-status>span:first-child').textContent();
  const [hours, minutes, seconds, frames] = displayed.split(':').map(Number);
  const current = ((hours * 60 + minutes) * 60 + seconds) * 30 + frames;
  if (Math.abs(frame - current) <= 2) {
    for (let i = 0; i < Math.abs(frame - current); i++) {
      await page.keyboard.press(frame > current ? 'ArrowRight' : 'ArrowLeft');
    }
  }

  const expected = `00:00:${String(Math.floor(frame / 30)).padStart(2, '0')}:${String(frame % 30).padStart(2, '0')}`;
  await expect(page.locator('.player-status>span:first-child')).toHaveText(expected);
  await page.waitForTimeout(150);
}
async function previewPixels() {
  return page.getByTestId('preview-canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const samples = [];
    for (let y = 4; y < 356; y += 8)
      for (let x = 4; x < 636; x += 8) {
        const at = ((canvas.height - 1 - y) * canvas.width + x) * 4;
        samples.push({ x, y, rgb: [pixels[at], pixels[at + 1], pixels[at + 2]] });
      }
    return samples;
  });
}
async function compare(frame, label) {
  await seek(frame);
  const preview = await previewPixels();
  const reference = execFileSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      output,
      '-vf',
      `select=eq(n\\,${frame})`,
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
  const errors = preview.map(({ x, y, rgb }) =>
    rgb.reduce((sum, value, c) => sum + Math.abs(value - reference[(y * 640 + x) * 3 + c]) / 3, 0),
  );
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const within = errors.filter((error) => error < 20).length / errors.length;
  const result = { label, frame, mean, within };
  if (mean >= 12 || within <= 0.85)
    throw Error(`Effect render mismatch: ${JSON.stringify(result)}`);
  return result;
}
const comparisons = [];
for (const [index, effect] of scenarios.entries())
  for (const local of [0, 1, 2])
    comparisons.push(await compare(project.tracks[0].clips[index].start + local, effect.name));
await page.getByRole('button', { name: 'Effects', exact: true }).click();
await page.locator('[data-clip-id="effect-5"]').click();
await seek(16);
await page.locator('.library-content').evaluate((element) => {
  element.scrollTop = 0;
});
await page.getByRole('heading', { name: 'Video effects', exact: true }).scrollIntoViewIfNeeded();
for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(size);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(qaDir, `video-effects-${size.width}.png`) });
}
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(
    qaDir,
    originalSmoke ? 'original-media-controls-results.json' : 'video-effects-results.json',
  ),
  JSON.stringify(
    {
      passed: true,
      comparisons,
      checks: [
        'separate libraries',
        'search/categories',
        'independent resets',
        'strength controls',
        'undo',
        'save',
        'shortcuts',
        'layouts',
      ],
    },
    null,
    2,
  ),
);
console.log(
  `PASS: separate filters/effects; ${comparisons.length} spatial and animated preview/export comparisons`,
);
await browser.close();
