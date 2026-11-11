import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { sourceRoot, qaDir, debugUrl } from './test-support/paths.mjs';

const suites = {
  window: 'window-desktop-test.mjs',
  'timeline-tools': 'timeline-tools-desktop-test.mjs',
  animation: 'animation-desktop-test.mjs',
  'inspector-render': 'render-compare.mjs',
  'inspector-style': 'inspector-style-desktop-test.mjs',
  audio: 'audio-desktop-test.mjs',
  'speed-color': 'speed-color-desktop-test.mjs',
  'rust-performance': 'rust-desktop-performance.mjs',
  readme: 'capture-readme.mjs',
  layout: 'layout-desktop-test.mjs',
  playback: 'playback-desktop-test.mjs',
  settings: 'settings-desktop-test.mjs',
  tracks: 'tracks-desktop-test.mjs',
  shortcuts: 'shortcuts-desktop-test.mjs',
  magnetic: 'magnetic-desktop-test.mjs',
  editing: 'desktop-test.mjs',
  gestures: 'gesture-test.mjs',
  render: 'render-compare.mjs',
  originals: 'render-compare.mjs',
  jobs: 'native-jobs-test.mjs',
  creative: 'creative-desktop-test.mjs',
  'local-transitions': 'creative-desktop-test.mjs',
  'local-transition-colors': 'creative-desktop-test.mjs',
  titles: 'title-preview-desktop-test.mjs',
  effects: 'effects-desktop-test.mjs',
  'effect-order': 'effect-order-desktop-test.mjs',
  presets: 'preset-preview-desktop-test.mjs',
  covers: 'covers-desktop-test.mjs',
  'original-ports': 'original-ports-desktop-test.mjs',
  'original-effects': 'original-ports-desktop-test.mjs',
  'original-media-export': 'creative-desktop-test.mjs',
  'original-media-controls': 'effects-desktop-test.mjs',
  'original-export': 'creative-desktop-test.mjs',
  importbench: 'import-benchmark.mjs',
  imports: 'imports-desktop-test.mjs',
  librarydrag: 'library-drag-desktop-test.mjs',
  phone: 'phone-playback-desktop-test.mjs',
  close: 'close-desktop-test.mjs',
  'close-discard': 'close-desktop-test.mjs',
};
const selected = process.argv.slice(2);
const names = selected.length
  ? selected
  : ['tracks', 'shortcuts', 'magnetic', 'gestures', 'editing'];
const executable = path.resolve(process.env.SHRAPWILL_TEST_EXE || currentEditor());
function currentEditor() {
  const appDirectory = path.join(sourceRoot, '../App');
  const reference = path.join(appDirectory, 'current-release.txt');
  if (!fs.existsSync(reference)) return path.join(appDirectory, 'shrapwill.exe');
  const filename = fs.readFileSync(reference, 'utf8').trim().replaceAll('\\', '/');
  const flat = /^shrapwill-[a-zA-Z0-9._-]+\.exe$/.test(filename);
  const versioned = /^releases\/shrapwill-[a-zA-Z0-9._-]+\/shrapwill\.exe$/.test(filename);
  if ((!flat && !versioned) || filename.split('/').some((part) => part.endsWith('.')))
    throw Error('Invalid current release reference.');
  return path.join(appDirectory, filename);
}
if (!fs.existsSync(executable)) throw Error(`Build the desktop app first: ${executable}`);
if (!fs.existsSync(path.join(qaDir, 'Validation.cutline')))
  throw Error(`Generate QA fixtures first: ${qaDir}`);
process.env.SHRAPWILL_DEBUG_PORT ||= '9240';

function completed(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(Error(`Test process exited ${code}`)),
    );
  });
}

async function ready(child) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw Error('The test editor exited before startup.');
    try {
      if ((await fetch(`${debugUrl()}/json/version`)).ok) return;
    } catch {
      /* WebView2 is still starting. */
    }
    await setTimeout(200);
  }
  throw Error('The test editor did not expose its debugging endpoint.');
}

async function run(name) {
  if (!suites[name]) throw Error(`Unknown suite: ${name}`);
  const occupied = await fetch(`${debugUrl()}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((response) => response.ok)
    .catch(() => false);
  if (occupied)
    throw Error('The debugging port is already in use. Choose another SHRAPWILL_DEBUG_PORT.');
  const profile = fs.mkdtempSync(path.join(qaDir, `quality-${name}-`));
  const child = spawn(executable, [], {
    windowsHide: true,
    env: {
      ...process.env,
      CUTLINE_HOME: profile,
      WEBVIEW2_USER_DATA_FOLDER: path.join(profile, 'webview'),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${process.env.SHRAPWILL_DEBUG_PORT}`,
    },
    stdio: 'ignore',
  });
  try {
    await ready(child);
    const args =
      name === 'inspector-render'
        ? ['--inspector']
        : name === 'original-media-controls'
          ? ['--original-smoke']
          : name === 'original-media-export'
            ? ['--local-transitions', '--original-media']
            : name === 'original-effects'
              ? ['--effects']
              : name === 'original-export'
                ? ['--local-transitions', '--ported-only']
                : name === 'local-transition-colors'
                  ? ['--local-transitions', '--color-transitions']
                  : name === 'local-transitions'
                    ? ['--local-transitions']
                    : name === 'close'
                      ? ['save-event']
                      : name === 'close-discard'
                        ? ['discard']
                        : name === 'originals'
                          ? ['direct']
                          : [];
    await completed(
      spawn(process.execPath, [path.join(sourceRoot, 'scripts', suites[name]), ...args], {
        cwd: sourceRoot,
        env: process.env,
        stdio: 'inherit',
        windowsHide: true,
      }),
    );
  } finally {
    // Only our isolated QA process is terminated; never discover/stop a user's editor.
    if (child.exitCode === null) child.kill();
    await setTimeout(300);
  }
}

for (const name of names) await run(name);
