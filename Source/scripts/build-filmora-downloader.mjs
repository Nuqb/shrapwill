import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'scripts/filmora-downloader');
const output = path.join(root, '../Outputs/FilmoraDownloader');
const compiler = path.join(
  process.env.WINDIR || 'C:/Windows',
  'Microsoft.NET/Framework64/v4.0.30319/csc.exe',
);
fs.mkdirSync(output, { recursive: true });
const executable = path.join(output, 'FilmoraDownloader.exe');
execFileSync(
  compiler,
  [
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/optimize+',
    '/reference:System.Drawing.dll',
    '/reference:System.Windows.Forms.dll',
    ...['UIAutomationClient.dll', 'UIAutomationTypes.dll', 'WindowsBase.dll'].map(
      (name) => `/reference:${path.join(path.dirname(compiler), 'WPF', name)}`,
    ),
    `/resource:${path.join(source, 'download-reference.png')},DownloadReference`,
    `/out:${executable}`,
    ...fs
      .readdirSync(source)
      .filter((name) => name.endsWith('.cs'))
      .map((name) => path.join(source, name)),
  ],
  { stdio: 'inherit', windowsHide: true },
);
execFileSync(executable, ['--self-test'], { windowsHide: true });
console.log(fs.readFileSync(path.join(output, 'self-test.txt'), 'utf8'));
console.log(executable);
