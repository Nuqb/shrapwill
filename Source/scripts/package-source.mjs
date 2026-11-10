import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Zip, ZipDeflate } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const destination = path.resolve(
  process.argv[2] || path.join(root, `../Outputs/Shrapwill-${version}-source.zip`),
);
const rootFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'LICENSE',
  '.gitignore',
  '.editorconfig',
  '.prettierrc.json',
  '.prettierignore',
  'Cargo.toml',
  'Cargo.lock',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
];
const directories = ['src', 'crates', 'src-tauri', 'scripts', 'docs', '.cursor'];

function entries(relative) {
  const full = path.join(root, relative);
  if (relative.replaceAll('\\', '/').startsWith('src-tauri/gen')) return [];
  const stats = fs.lstatSync(full);
  if (stats.isSymbolicLink()) throw Error(`Source packaging does not follow links: ${relative}`);
  if (!stats.isDirectory()) return [{ full, relative, stats }];
  return fs
    .readdirSync(full)
    .sort()
    .flatMap((name) => entries(path.join(relative, name)));
}

function addFile(zip, item) {
  const entry = new ZipDeflate(`Shrapwill-source/${item.relative.replaceAll('\\', '/')}`, {
    level: 6,
  });
  entry.mtime = item.stats.mtime;
  zip.add(entry);
  const input = fs.openSync(item.full, 'r');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  try {
    let count;
    while ((count = fs.readSync(input, buffer)) > 0) entry.push(buffer.subarray(0, count));
    entry.push(new Uint8Array(), true);
  } finally {
    fs.closeSync(input);
  }
}

function packageSource() {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = path.join(path.dirname(destination), `shrapwill-source-${randomUUID()}.zip`);
  const output = fs.openSync(temporary, 'wx');
  try {
    const zip = new Zip((error, data) => {
      if (error) throw error;
      fs.writeSync(output, data);
    });
    for (const item of [...rootFiles, ...directories].flatMap(entries)) addFile(zip, item);
    zip.end();
    fs.fsyncSync(output);
  } catch (error) {
    fs.closeSync(output);
    fs.unlinkSync(temporary);
    throw error;
  }
  fs.closeSync(output);
  fs.renameSync(temporary, destination);
  console.log(`${destination} (${fs.statSync(destination).size} bytes)`);
}

packageSource();
