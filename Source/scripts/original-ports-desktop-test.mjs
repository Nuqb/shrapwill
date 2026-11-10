import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceRoot, qaDir, debugUrl } from './test-support/paths.mjs';

const effectsOnly = process.argv.includes('--effects');
const productionOnly = process.argv.includes('--production-only');
const standalone =
  Boolean(process.env.SHRAPWILL_REFERENCE_BROWSER) || process.argv.includes('--standalone');
const allPrograms = JSON.parse(
  fs.readFileSync(
    path.join(
      sourceRoot,
      `src/features/preview/ported/${effectsOnly ? 'effects-manifest' : 'manifest'}.json`,
    ),
    'utf8',
  ),
);
const manifest = process.env.SHRAPWILL_PROGRAM_FILTER
  ? allPrograms.filter((entry) =>
      new RegExp(process.env.SHRAPWILL_PROGRAM_FILTER, 'i').test(entry.name),
    )
  : allPrograms;
const work =
  process.env.SHRAPWILL_REFERENCE_WORK || fs.mkdtempSync(path.join(qaDir, 'original-reference-'));
const shaders = path.join(work, 'shaders');
const reference = path.join(work, 'reference');
const productionReference = path.join(work, 'production-reference');
fs.mkdirSync(shaders, { recursive: true });
for (const entry of manifest.filter((entry) => entry.status === 'shader')) {
  fs.writeFileSync(path.join(shaders, `${entry.kind}.frag`), `${entry.preamble}\n${entry.body}`);
  fs.writeFileSync(
    path.join(shaders, `${entry.kind}.frag.json`),
    JSON.stringify({
      sceneInputs: entry.sceneInputs ?? 2,
      textures: entry.textures ?? [],
      passes: entry.passes ?? [],
      analysis: entry.analysis,
      switchInput: entry.switchInput,
      curves: entry.curves,
    }),
  );
  for (const group of entry.textures ?? [])
    for (const name of group.files)
      fs.copyFileSync(
        path.join(sourceRoot, 'src/features/preview/ported/assets', name),
        path.join(shaders, name),
      );
}
const buildRoot = path.join(sourceRoot, 'target/debug/build');
const helpers = fs
  .readdirSync(buildRoot)
  .filter((name) => name.startsWith('cutline-core-'))
  .map((name) => path.join(buildRoot, name, 'out/transition-gpu.exe'))
  .filter((file) => fs.existsSync(file))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
if (!helpers.length) throw Error('Build the core GPU helper first.');
const renderer = path.join(work, 'transition-gpu.exe');
fs.copyFileSync(helpers[0], renderer);
for (const name of [
  'onnxruntime.dll',
  'onnxruntime_providers_shared.dll',
  'human_segmentation_pphumanseg_2023mar.onnx',
  'face_detection_yunet_2023mar.onnx',
])
  fs.copyFileSync(path.join(sourceRoot, 'src-tauri/binaries/vision', name), path.join(work, name));
for (const name of ['libEGL.dll', 'libGLESv2.dll'])
  fs.copyFileSync(
    path.join(sourceRoot, 'src-tauri/binaries/ported-angle', name),
    path.join(work, name),
  );
const server = await createServer({
  root: sourceRoot,
  cacheDir: path.join(work, 'vite-cache'),
  server: {
    host: '127.0.0.1',
    port: Number(process.env.SHRAPWILL_REFERENCE_PORT || 5173),
    hmr: false,
    watch: { ignored: ['**/*'] },
  },
});
const browser = standalone
  ? await chromium.launch({
      ...(process.env.SHRAPWILL_REFERENCE_BROWSER
        ? { executablePath: process.env.SHRAPWILL_REFERENCE_BROWSER }
        : { channel: 'msedge' }),
      headless: true,
    })
  : await chromium.connectOverCDP(debugUrl());
try {
  await server.listen();
  const page = standalone ? await browser.newPage() : browser.contexts()[0].pages()[0];
  let scenePixels = null;
  if (process.env.SHRAPWILL_VISION_FIXTURES) {
    scenePixels = ['face.jpg', 'person.jpg'].map((name) =>
      Array.from(
        execFileSync(
          path.join(sourceRoot, 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe'),
          [
            '-v',
            'error',
            '-i',
            path.join(qaDir, 'vision-smoke', name),
            '-vf',
            'scale=128:72:force_original_aspect_ratio=decrease,pad=128:72:(ow-iw)/2:(oh-ih)/2',
            '-frames:v',
            '1',
            '-pix_fmt',
            'rgba',
            '-f',
            'rawvideo',
            'pipe:1',
          ],
          { windowsHide: true },
        ),
      ),
    );
    const results = [];
    for (const [index, mode] of ['face', 'person'].entries()) {
      const pixels = [];
      for (let row = 71; row >= 0; row--)
        pixels.push(...scenePixels[index].slice(row * 128 * 4, (row + 1) * 128 * 4));
      results.push(
        await page.evaluate(
          (frame) => window.__TAURI_INTERNALS__.invoke('analyze_transition_frame', { frame }),
          { mode, width: 128, height: 72, pixels },
        ),
      );
    }
    if (results[0].eye.every((value) => value === 0.5))
      throw Error('Actual desktop eye detection remained at the fallback anchor');
    const mask = Buffer.from(results[1].mask, 'base64');
    if (!mask.some((value, i) => i % 4 === 3 && value > 0))
      throw Error('Actual desktop person detection returned an empty mask');
    fs.writeFileSync(
      path.join(work, 'vision-ipc-check.json'),
      JSON.stringify({
        eye: results[0].eye,
        foreground: Array.from(mask).filter((value, i) => i % 4 === 3 && value > 0).length,
      }),
    );
  }
  await page.exposeFunction('portScenes', () => scenePixels);
  let analysisIndex = 0;
  await page.exposeFunction('portAnalyze', (frame) => {
    const number = analysisIndex++,
      input = path.join(work, `analysis-${number}.rgba`),
      output = path.join(work, `analysis-${number}.json`);
    fs.writeFileSync(input, Buffer.from(frame.pixels));
    execFileSync(
      renderer,
      ['--analyze', frame.mode, String(frame.width), String(frame.height), input, output],
      { windowsHide: true, timeout: 15000 },
    );
    return JSON.parse(fs.readFileSync(output, 'utf8'));
  });
  await page.goto(
    `${server.resolvedUrls.local[0]}scripts/ports/validation.html${effectsOnly ? '?effects' : ''}`,
  );
  await page.waitForFunction(() => window.portTest);
  const inputs = await page.evaluate(() => window.portTest.inputs);
  const a = path.join(work, 'a.rgba'),
    b = path.join(work, 'b.rgba');
  fs.writeFileSync(a, Buffer.from(inputs[0]));
  fs.writeFileSync(b, Buffer.from(inputs[1]));
  if (!process.env.SHRAPWILL_REFERENCE_WORK)
    execFileSync(
      renderer,
      [
        '--reference-es',
        shaders,
        a,
        b,
        productionReference,
        '128',
        '72',
        path.join(sourceRoot, 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe'),
      ],
      {
        windowsHide: true,
        timeout: 600000,
        stdio: 'pipe',
      },
    );

  if (!productionOnly)
    execFileSync(
      renderer,
      [
        '--reference',
        shaders,
        a,
        b,
        reference,
        '128',
        '72',
        path.join(sourceRoot, 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe'),
      ],
      { windowsHide: true, timeout: 600000, stdio: 'pipe' },
    );
  const results = [];
  for (const entry of manifest.filter((entry) => entry.status === 'shader')) {
    try {
      let worst = 0,
        worstProduction = 0;
      const random =
        /\b(?:random\w*|rand\w*|noise\w*|normalizedRandom|rnm)\s*\(/i.test(entry.body) ||
        (/fract\s*\(/.test(entry.body) && /43758/.test(entry.body));
      const tolerance = random ? 12 : 5;
      for (let phase = 0; phase <= 6; phase++) {
        const actual = await page.evaluate(
          ({ kind, phase }) => window.portTest.render(kind, phase),
          {
            kind: entry.kind,
            phase,
          },
        );
        const expected = fs.readFileSync(
          path.join(
            productionOnly ? productionReference : reference,
            `${entry.kind}-${phase}.rgba`,
          ),
        );
        let error = 0;
        for (let i = 0; i < expected.length; i++)
          if (i % 4 !== 3) error += Math.abs(actual[i] - expected[i]);
        const mean = error / (128 * 72 * 3);
        const production = fs.readFileSync(
          path.join(productionReference, `${entry.kind}-${phase}.rgba`),
        );
        let productionError = 0;
        for (let i = 0; i < production.length; i++)
          if (i % 4 !== 3) productionError += Math.abs(actual[i] - production[i]);
        const productionMean = productionError / (128 * 72 * 3);
        worstProduction = Math.max(worstProduction, productionMean);
        worst = Math.max(worst, mean);
        if (productionMean > tolerance || (!random && mean > tolerance)) {
          if (entry.textures?.some((group) => group.format === 'video')) {
            const decoded = await page.evaluate(
              (kind) => window.portTest.videoFrames(kind),
              entry.kind,
            );
            fs.writeFileSync(
              path.join(work, 'video-diagnostic.json'),
              JSON.stringify({ kind: entry.kind, phase, decoded }),
            );
            console.log(
              'Video diagnostic:',
              path.join(work, 'video-diagnostic.json'),
              decoded.map((x) => (x ? { time: x.time, frame: x.frame } : null)),
            );
          }
          fs.writeFileSync(path.join(work, 'mismatch-actual.rgba'), Buffer.from(actual));
          fs.writeFileSync(path.join(work, 'mismatch-expected.rgba'), expected);
          throw Error(
            `Original shader mismatch ${entry.name}, phase ${phase}: desktop GL error ${mean}, production error ${productionMean}; ${work}`,
          );
        }
      }
      results.push({
        name: entry.name,
        worstMeanError: worst,
        worstProductionError: worstProduction,
        randomBackendVariation: random && worst > tolerance,
        tolerance,
      });
    } catch (error) {
      results.push({ name: entry.name, error: String(error) });
    }
    fs.writeFileSync(path.join(work, 'comparison-progress.json'), JSON.stringify(results));
    if (results.length % 100 === 0) console.log(`Compared ${results.length} programs`);
  }
  const failures = results.filter((result) => result.error);
  fs.writeFileSync(
    path.join(
      qaDir,
      effectsOnly ? 'original-effects-shader-results.json' : 'original-shader-results.json',
    ),
    JSON.stringify(
      {
        passed: !failures.length,
        renderingHosts: productionOnly ? ['WebGL', 'ANGLE'] : ['WebGL', 'ANGLE', 'desktop OpenGL'],
        filter: process.env.SHRAPWILL_PROGRAM_FILTER ?? null,
        programs: results.length,
        frames: results.length * 7,
        results,
      },
      null,
      2,
    ),
  );
  if (failures.length) throw Error(JSON.stringify(failures, null, 2));
  console.log(
    `PASS: ${results.length} original shader programs; ${results.length * 7} ${productionOnly ? 'WebGL/ANGLE' : 'desktop OpenGL/WebGL/ANGLE'} frame comparisons`,
  );
} finally {
  await browser.close();
  await server.close();
}
