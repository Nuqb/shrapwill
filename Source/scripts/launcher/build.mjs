import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export function buildLauncher(root) {
  const source = path.join(root, 'scripts/launcher/ShrapwillLauncher.cs');
  const icon = path.join(root, 'src-tauri/icons/icon.ico');
  const destination = path.join(root, 'target/launcher/shrapwill.exe');
  const newestInput = Math.max(fs.statSync(source).mtimeMs, fs.statSync(icon).mtimeMs);
  if (fs.existsSync(destination) && fs.statSync(destination).mtimeMs >= newestInput)
    return destination;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  compileWindowsExecutable({ source, destination, extra: [`/win32icon:${icon}`] });
  return destination;
}

export function compileWindowsExecutable({ source, destination, extra = [] }) {
  const compiler = path.join(
    process.env.WINDIR || 'C:/Windows',
    'Microsoft.NET/Framework64/v4.0.30319/csc.exe',
  );
  const result = spawnSync(
    compiler,
    [
      '/nologo',
      '/target:winexe',
      '/optimize+',
      '/reference:System.Windows.Forms.dll',
      ...extra,
      `/out:${destination}`,
      source,
    ],
    { stdio: 'inherit', windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Launcher compilation failed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildLauncher(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
}
