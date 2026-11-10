import inventory from '../docs/filmora-local-inventory.json' with { type: 'json' };
import { unavailableOriginal } from '../src/features/preview/ported/availability.ts';
import { hasPortedShader, portedShader } from '../src/features/preview/ported/registry.ts';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { filterPresets, titlePresets, transitionPresets } from '../src/features/library/presets.ts';
import { videoEffects } from '../src/features/library/videoEffects.ts';
import { timecode as formatTimecode } from '../src/types.ts';

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
if (process.env.SHRAPWILL_GRAPH_ONLY)
  await page.evaluate(() => {
    window.__graphTrace = [];
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function (...args) {
      const program = this.getParameter(this.CURRENT_PROGRAM);
      const time = this.getUniformLocation(program, 'u_global_time');
      const record = time
        ? {
            time: this.getUniform(program, time),
            resolution: this.getUniform(program, this.getUniformLocation(program, 'iResolution')),
          }
        : null;
      const result = draw.apply(this, args);
      if (record) {
        record.error = this.getError();
        window.__graphTrace.push(record);
        if (window.__graphTrace.length > 12) window.__graphTrace.shift();
      }
      return result;
    };
  });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const fixture = JSON.parse(await fs.readFile(path.join(qaDir, 'Validation.cutline'), 'utf8'));
const clips = fixture.tracks.flatMap((t) => t.clips);
const red = clips.find((c) => c.name.startsWith('Red'));
const blue = clips.find((c) => c.name === 'Blue silent.mp4');
const ffmpeg = path.resolve('src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe');

function freshProject(name, clips) {
  return {
    ...structuredClone(fixture),
    id: name,
    name,
    magneticTimeline: false,
    tracks: [{ ...fixture.tracks.find((t) => t.kind === 'video'), id: `${name}-track`, clips }],
  };
}
function sampleClip(template, id, start, duration) {
  return {
    ...structuredClone(template),
    id,
    start,
    duration,
    sourceIn: 0,
    link: null,
    audioEnabled: false,
    transition: null,
  };
}
async function openFixture(project, name) {
  const file = path.join(qaDir, `${name}.cutline`);
  await fs.writeFile(file, JSON.stringify(project));
  await call('open_project', { path: file });
  if (await page.locator('.launcher').count()) await page.locator('.launcher-top>button').click();
  await page.getByLabel('Preview quality', { exact: true }).selectOption('360');
}
async function exportProject(name) {
  const file = path.join(qaDir, `${name}.mp4`);
  const id = await call('start_export', {
    path: file,
    settings: { width: 640, height: 360, quality: 'high', encoder: 'software' },
  });
  await page.waitForFunction(
    (id) => window.__creativeJobs[id]?.status && window.__creativeJobs[id].status !== 'running',
    id,
    { timeout: 600000 },
  );
  const job = await page.evaluate((id) => window.__creativeJobs[id], id);
  if (job.status !== 'complete') throw Error(JSON.stringify(job));
  return file;
}
async function seek(frame) {
  // Use the editor's ruler; scroll it into range without changing the user's zoom preference.
  await page.locator('.timeline-scroll').evaluate((el, frame) => {
    el.scrollLeft = Math.max(0, frame * 1.5 - 250);
  }, frame);
  const offset = await page.locator('.timeline-scroll').evaluate((el) => el.scrollLeft);
  const bounds = await page.locator('.timeline-scroll').boundingBox();
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

  const timecode = formatTimecode(frame, { num: 30, den: 1 });
  await page.waitForFunction(
    (expected) => document.querySelector('.player-status>span')?.textContent === expected,
    timecode,
  );
  await page.waitForTimeout(450);
}
async function previewPixels() {
  const png = await page
    .getByTestId('preview-canvas')
    .evaluate((el) => el.toDataURL('image/png').split(',')[1]);
  // Match the delivered video's 4:2:0 chroma sampling before comparing sharp reveal edges.
  // This keeps the same color tolerances and avoids treating chroma subsampling as a mask error.
  const rgb = execFileSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-vf',
      'scale=640:360:flags=bilinear,format=yuv420p,format=rgb24',
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      'pipe:1',
    ],
    { input: Buffer.from(png, 'base64'), maxBuffer: 8 * 1024 * 1024, windowsHide: true },
  );
  const pixels = [];
  for (let y = 12; y < 360; y += 24) {
    for (let x = 12; x < 640; x += 24)
      pixels.push({ x, y, rgb: [...rgb.slice((y * 640 + x) * 3, (y * 640 + x) * 3 + 3)] });
  }
  return pixels;
}
function referencePixels(file, frame) {
  return execFileSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      Math.floor(frame / 30).toString(),
      '-i',
      file,
      '-vf',
      `select=eq(n\\,${frame % 30})`,
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
}
function pixelErrors(pixels, output) {
  const errors = pixels.map(
    ({ x, y, rgb }) =>
      rgb.reduce(
        (sum, value, channel) => sum + Math.abs(value - output[(y * 640 + x) * 3 + channel]),
        0,
      ) / 3,
  );
  return {
    meanAbsoluteChannelError: errors.reduce((sum, value) => sum + value, 0) / errors.length,
    fractionWithin16: errors.filter((error) => error < 16).length / errors.length,
  };
}
async function compare(file, frame, label) {
  await seek(frame);
  const output = referencePixels(file, frame);
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    result = { label, frame, ...pixelErrors(await previewPixels(), output) };
    if (result.meanAbsoluteChannelError < 10 && result.fractionWithin16 > 0.85) return result;
    // A newly visible decoder can publish its first texture after the initial seek.
    // Keep the same frame and tolerance, and allow that texture to become ready.
    await page.waitForTimeout(450);
  }
  await page.screenshot({ path: path.join(qaDir, 'creative-render-mismatch.png') });
  await fs.writeFile(
    path.join(qaDir, 'creative-render-mismatch.json'),
    JSON.stringify(
      {
        result,
        trace: await page.evaluate(() => window.__graphTrace),
        pixels: await previewPixels(),
        reference: [...output],
      },
      null,
      2,
    ),
  );
  throw Error(`Creative render mismatch: ${JSON.stringify(result)}`);
}

await page.evaluate(async () => {
  window.__creativeJobs = {};
  const handler = window.__TAURI_INTERNALS__.transformCallback((e) => {
    window.__creativeJobs[e.payload.id] = e.payload;
  });
  await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', {
    event: 'job',
    target: { kind: 'Any' },
    handler,
  });
});
const results = [];
const localOnly = process.argv.includes('--local-transitions');
const colorOnly = process.argv.includes('--color-transitions');
const portedOnly = process.argv.includes('--ported-only');
const originalMedia = process.argv.includes('--original-media');
const colorCases = new Set([
  'Flash',
  'Fade Grayscale',
  'Color Dissolve 1',
  'Metallic Silver Grace 09',
  'Warp Zoom 3',
  'Glitch Blocks',
  'Brush And Ink Transition 34',
  'Whirl 2',
  'Doorway',
  'Simple Roll 7',
]);
const localKinds = new Set(inventory.entries.map((entry) => entry.kind));
const testedTransitions = originalMedia
  ? [
      ...filterPresets.filter((p) => p.originalFilter),
      ...videoEffects.filter((p) => p.originalEffect),
    ]
  : localOnly
    ? transitionPresets.filter(
        (item) => localKinds.has(item.kind) && (!colorOnly || colorCases.has(item.name)),
      )
    : transitionPresets;
const supportedTransitions = testedTransitions.filter(
  (item) =>
    (originalMedia ||
      (!unavailableOriginal(item.kind) && (!portedOnly || hasPortedShader(item.kind)))) &&
    (!process.env.SHRAPWILL_PROGRAM_FILTER ||
      new RegExp(process.env.SHRAPWILL_PROGRAM_FILTER, 'i').test(item.name)) &&
    (!process.env.SHRAPWILL_GRAPH_ONLY ||
      portedShader(item.originalFilter || item.originalEffect || item.kind)?.passes?.length ||
      item.name === 'Random Block'),
);
if (localOnly) {
  const image = path.join(qaDir, 'local-transition-pattern.png');
  execFileSync(
    ffmpeg,
    ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=1', '-frames:v', '1', image],
    { windowsHide: true },
  );
  fixture.assets.push({
    ...fixture.assets.find((asset) => asset.id === blue.mediaId),
    id: 'local-pattern',
    name: 'Transition pattern',
    kind: 'image',
    path: image,
    previewPath: image,
    thumbnailPath: null,
    width: 640,
    height: 360,
    hasAudio: false,
  });
}
const transitions = supportedTransitions.flatMap((preset, index) => {
  if (originalMedia) {
    const clip = sampleClip(blue, `original-${index}`, index * 12, 12);
    const { name, category, description, ...settings } = preset;
    clip.name = name;
    clip.mediaId = 'local-pattern';
    clip.props = { ...clip.props, ...settings };
    if (index === 3 || index === 6)
      Object.assign(clip.props, {
        cropLeft: 0.05,
        cropTop: 0.04,
        scale: 0.78,
        rotation: 10,
        x: 25,
        brightness: 0.06,
        contrast: 1.1,
      });
    return [clip];
  }
  const outgoing = sampleClip(red, `out-${index}`, index * 12, 8);
  const incoming = sampleClip(blue, `in-${index}`, index * 12 + 4, 8);
  incoming.transition = { kind: preset.kind, frames: 4 };
  if (localOnly) {
    incoming.mediaId = 'local-pattern';
    Object.assign(incoming.props, { brightness: 0.06, contrast: 1.1, saturation: 0.9 });
  }
  if (index === 3 || index === 6)
    Object.assign(incoming.props, {
      cropLeft: 0.05,
      cropTop: 0.04,
      scale: 0.78,
      rotation: 10,
      x: 25,
    });
  return [outgoing, incoming];
});
await openFixture(freshProject('Creative transitions', transitions), 'Creative-transitions');
const transitionFile = await exportProject('Creative-transitions');
for (const [index, preset] of supportedTransitions.entries()) {
  for (const local of [0, 2, 5])
    results.push(await compare(transitionFile, index * 12 + 4 + local, `${preset.name}/${local}`));
}

if (localOnly) {
  await page.getByRole('button', { name: 'Transitions', exact: true }).click();
  if ((await page.locator('.transition-preset').count()) !== transitionPresets.length)
    throw Error('Local transition cards missing');
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error('Local transition library overflows');
    await page.screenshot({ path: path.join(qaDir, `local-transitions-${size.width}.png`) });
  }
  for (const category of ['Speed Blur', 'Zoom', 'Glitch', '3D', 'Brush']) {
    await page
      .locator('.preset-categories')
      .getByRole('button', { name: category, exact: true })
      .click();
    if (
      (await page.locator('.transition-preset').count()) !==
      transitionPresets.filter((item) => item.category === category).length
    )
      throw Error(`Incorrect category count: ${category}`);
  }
  if (errors.length) throw Error(errors.join('\n'));
  await fs.writeFile(
    path.join(
      qaDir,
      originalMedia
        ? 'original-media-export-results.json'
        : colorOnly
          ? 'local-transition-colors-results.json'
          : 'local-transitions-results.json',
    ),
    JSON.stringify(
      {
        passed: true,
        sourceEntries: inventory.entries.length,
        distinctEffects: supportedTransitions.length,
        scope: process.env.SHRAPWILL_GRAPH_ONLY
          ? 'independent render stages and stable block noise'
          : 'full catalog',
        comparisons: results,
        checks: [
          'patterned source',
          'preview/export parity',
          'category coverage',
          'desktop layouts',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${supportedTransitions.length} ${originalMedia ? 'original filters/effects' : 'local transitions'}; ${results.length} patterned preview/export comparisons`,
  );
  await browser.close();
  process.exit(0);
}
const effects = filterPresets.map((preset, index) => {
  const clip = sampleClip(blue, `look-${index}`, index * 3, 3);
  const { name, category, description, ...adjustments } = preset;
  clip.name = name;
  Object.assign(clip.props, adjustments);
  return clip;
});
await openFixture(freshProject('Creative looks', effects), 'Creative-looks');
const effectFile = await exportProject('Creative-looks');
for (const [index, preset] of filterPresets.entries())
  results.push(await compare(effectFile, index * 3 + 1, preset.name));

await call('new_project', {
  name: 'Creative titles',
  width: 640,
  height: 360,
  fps: { num: 30, den: 1 },
});
let snapshot = (await call('startup')).snapshot;
const trackId = snapshot.project.tracks[0].id;
for (const [index, preset] of titlePresets.entries()) {
  snapshot = await call('edit', {
    operation: { type: 'add_title', style: preset.style, track_id: trackId, start: index * 3 },
  });
  const title = snapshot.project.tracks[0].clips.at(-1);
  await call('edit', {
    operation: { type: 'trim', id: title.id, edge: 'right', frame: index * 3 + 3 },
  });
}
await call('save', { path: path.join(qaDir, 'Creative-titles.cutline') });
const titleFile = await exportProject('Creative-titles');
for (const [index, preset] of titlePresets.entries())
  results.push(await compare(titleFile, index * 3 + 1, preset.name));

await page.getByRole('button', { name: 'Titles', exact: true }).click();
if ((await page.locator('.title-preset').count()) !== titlePresets.length)
  throw Error('Missing title cards');
await page.getByLabel('Search presets').fill('neon');
if ((await page.locator('.title-preset').count()) !== 1) throw Error('Title search failed');
await page.getByLabel('Search presets').fill('no-such-preset');
if (!(await page.locator('.preset-empty').count())) throw Error('Search empty state missing');
await page.getByLabel('Search presets').fill('');
await page.getByRole('button', { name: 'Social', exact: true }).click();
if (
  (await page.locator('.title-preset').count()) !==
  titlePresets.filter((p) => p.category === 'Social').length
)
  throw Error('Title category filter failed');
await page.getByRole('button', { name: 'All', exact: true }).click();
for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  await page.setViewportSize(size);
  await page.screenshot({ path: path.join(qaDir, `creative-titles-${size.width}.png`) });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error('Creative workspace overflows');
}
await page.getByRole('button', { name: 'Filters', exact: true }).click();
if ((await page.locator('.filter-preset').count()) !== filterPresets.length)
  throw Error('Missing filter cards');
await page.screenshot({ path: path.join(qaDir, 'creative-effects.png') });
await page.getByRole('button', { name: 'Transitions', exact: true }).click();
if ((await page.locator('.transition-preset').count()) !== transitionPresets.length)
  throw Error('Missing transition cards');
await page.screenshot({ path: path.join(qaDir, 'creative-transitions.png') });

// Exercise the actual card/inspector actions in addition to render-fixture coverage.
await openFixture(
  freshProject('Creative controls', [
    sampleClip(red, 'control-out', 0, 32),
    sampleClip(blue, 'control-in', 32, 32),
  ]),
  'Creative-controls',
);
await page.locator('.timeline-scroll').evaluate((el) => {
  el.scrollLeft = 0;
});
await page.locator('[data-clip-id="control-in"]').click();
await page.locator('.transition-preset.wipe_right').dblclick();
await page.waitForTimeout(200);
snapshot = (await call('startup')).snapshot;
let control = snapshot.project.tracks[0].clips.find((c) => c.id === 'control-in');
if (control.start !== 17 || control.transition.kind !== 'wipe_right')
  throw Error('Transition card did not apply');
await page.getByLabel('Transition duration', { exact: true }).fill('8');
await page.getByLabel('Transition duration', { exact: true }).blur();
await page.waitForTimeout(200);
control = (await call('startup')).snapshot.project.tracks[0].clips.find(
  (c) => c.id === 'control-in',
);
if (control.start !== 24 || control.transition.frames !== 8)
  throw Error('Transition duration did not commit');
await page.getByRole('button', { name: 'Filters', exact: true }).click();
await page
  .locator('.filter-preset')
  .filter({ has: page.locator('strong', { hasText: /^Negative$/ }) })
  .dblclick();
await page.waitForTimeout(200);
control = (await call('startup')).snapshot.project.tracks[0].clips.find(
  (c) => c.id === 'control-in',
);
if (control.props.invert !== 1 || control.transition.frames !== 8)
  throw Error('Effect card did not preserve transition');
await call('history', { direction: 'undo' });
control = (await call('startup')).snapshot.project.tracks[0].clips.find(
  (c) => c.id === 'control-in',
);
if (control.props.invert !== 0) throw Error('Effect undo failed');
await page.getByRole('button', { name: 'Titles', exact: true }).click();
await page.locator('.title-preset.neon').dblclick();
await page.waitForTimeout(300);
snapshot = (await call('startup')).snapshot;
const addedTitle = snapshot.project.tracks.flatMap((t) => t.clips).find((c) => c.title);
if (addedTitle?.title.style !== 'neon') throw Error('Title card did not insert');
await page.locator(`[data-clip-id="${addedTitle.id}"]`).click();
await page.getByLabel('Title style', { exact: true }).selectOption('retro');
await page.waitForTimeout(200);
const restyled = (await call('startup')).snapshot.project.tracks
  .flatMap((t) => t.clips)
  .find((c) => c.id === addedTitle.id);
if (restyled.title.style !== 'retro' || restyled.title.text !== addedTitle.title.text)
  throw Error('Title style did not preserve words');
if (errors.length) throw Error(errors.join('\n'));
await fs.writeFile(
  path.join(qaDir, 'creative-results.json'),
  JSON.stringify(
    {
      passed: true,
      results,
      checks: [
        'all titles rasterize',
        'all looks and transitions preview/export',
        'transformed and cropped reveals',
        'preset search/categories/empty state',
        '1366 and 1920 layouts',
        'title/effect/transition card actions, restyling, duration, and undo',
      ],
    },
    null,
    2,
  ),
);
console.log(`PASS: creative library; ${results.length} preview/export frame comparisons`);
await browser.close();
