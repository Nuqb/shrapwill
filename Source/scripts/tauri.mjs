import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { publishApp } from './publish-app.mjs';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const cli = path.join(path.dirname(require.resolve('@tauri-apps/cli/package.json')), 'tauri.js');
const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const development = args.some((arg) => ['--debug', '--help', '-h'].includes(arg));
if (args[0] === 'build' && !development) {
  const targetIndex = args.indexOf('--target');
  const target =
    targetIndex >= 0
      ? args[targetIndex + 1]
      : args.find((arg) => arg.startsWith('--target='))?.slice(9);
  const targetDirectory = path.resolve(process.env.CARGO_TARGET_DIR || 'target');
  const profileIndex = args.indexOf('--profile');
  const profile =
    profileIndex >= 0
      ? args[profileIndex + 1]
      : args.find((arg) => arg.startsWith('--profile='))?.slice(10) || 'release';
  publishApp(path.join(targetDirectory, target || '', profile, 'shrapwill.exe'));
}
