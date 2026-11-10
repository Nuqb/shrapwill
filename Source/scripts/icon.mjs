import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = path.resolve(
  process.argv[2] || path.join(root, 'src-tauri/icons/shrapwill-master.png'),
);
if (!fs.existsSync(master)) throw new Error(`Missing icon master: ${master}`);
const output = fs.mkdtempSync(path.join(root, '../icon-build-'));
const result = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'icon', master, '--output', output],
  { cwd: root, stdio: 'inherit', windowsHide: true },
);
if (result.status !== 0) process.exit(result.status || 1);
const iconDir = path.join(root, 'src-tauri/icons');
fs.mkdirSync(iconDir, { recursive: true });
fs.copyFileSync(path.join(output, 'icon.ico'), path.join(iconDir, 'icon.ico'));
fs.copyFileSync(master, path.join(iconDir, 'icon.png'));
const small = path.join(output, '128x128@2x.png');
fs.mkdirSync(path.join(root, 'src/assets'), { recursive: true });
fs.copyFileSync(
  fs.existsSync(small) ? small : master,
  path.join(root, 'src/assets/shrapwill-icon.png'),
);
console.log(`Windows icon written to ${iconDir}`);
