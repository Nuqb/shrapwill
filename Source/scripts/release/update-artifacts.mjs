import fs from 'node:fs';
import path from 'node:path';
import { createHash, sign } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { once } from 'node:events';
import { Zip, ZipDeflate } from 'fflate';

export const packageMagic = Buffer.from('SHRAPWILL-UPDATE-1\n');
export function stableVersion(tag) {
  const match = /^v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(tag);
  if (!match) throw Error('Choose a stable release tag such as v1.2.3.');
  return match[1];
}
export async function fileInfo(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Release inputs must be regular files.');
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return { size: stat.size, sha256: hash.digest('hex') };
}
export async function createUpdatePackage({ version, files, destination }) {
  stableVersion(version);
  const names = new Set();
  for (const file of files) {
    if (!packagePath(file.name) || names.has(file.name.toLowerCase()))
      throw Error('Unsafe or duplicate package path.');
    names.add(file.name.toLowerCase());
  }
  if (
    files.length > 128 ||
    !['shrapwill.exe', 'shrapwill-launcher.exe', 'ffmpeg.exe', 'ffprobe.exe'].every((name) =>
      names.has(name),
    )
  )
    throw Error('The package is missing required application files.');
  const entries = [];
  for (const file of files) entries.push({ path: file.name, ...(await fileInfo(file.file)) });
  if (
    entries.some((entry) => entry.size === 0) ||
    entries.reduce((sum, entry) => sum + entry.size, 0) > 8 * 1024 ** 3
  )
    throw Error('The update package exceeds its file-size limits.');
  const header = Buffer.from(JSON.stringify({ version, files: entries }));
  if (header.length > 128 * 1024) throw Error('Too many update package files.');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(header.length);
  const compressed = createGzip({ level: 6 });
  const complete = pipeline(compressed, fs.createWriteStream(destination));
  const write = async (chunk) => {
    if (!compressed.write(chunk)) await once(compressed, 'drain');
  };
  try {
    await write(packageMagic);
    await write(length);
    await write(header);
    for (const file of files)
      for await (const chunk of fs.createReadStream(file.file)) await write(chunk);
    compressed.end();
    await complete;
  } catch (error) {
    compressed.destroy(error);
    await complete.catch(() => {});
    throw error;
  }
  return fileInfo(destination);
}
export function packagePath(name) {
  if (['shrapwill.exe', 'shrapwill-launcher.exe', 'ffmpeg.exe', 'ffprobe.exe'].includes(name))
    return true;
  const parts = name.split('/');
  return (
    parts.length === 2 &&
    ['notices', 'icons'].includes(parts[0]) &&
    name.length < 180 &&
    parts.every(
      (part) =>
        /^[a-zA-Z0-9._-]+$/.test(part) &&
        !['.', '..'].includes(part) &&
        !part.endsWith('.') &&
        !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(part.split('.')[0]),
    )
  );
}
export function signRelease(release, key) {
  const payload = Buffer.from(JSON.stringify(release));
  return {
    payload: payload.toString('base64'),
    signature: sign(null, payload, key).toString('base64'),
  };
}
export async function portableZip({ files, launcher, version, editorHash, destination }) {
  const directory = `releases/shrapwill-${version}-${editorHash.slice(0, 12)}`;
  const handle = fs.openSync(destination, 'w');
  const finished = new Promise((resolve, reject) => {
    const zip = new Zip((error, chunk, final) => {
      if (error) reject(error);
      else {
        fs.writeSync(handle, chunk);
        if (final) resolve();
      }
    });
    const add = (name, chunks) => {
      const entry = new ZipDeflate(name, { level: 6 });
      zip.add(entry);
      for (const chunk of chunks) entry.push(chunk);
      entry.push(new Uint8Array(), true);
    };
    function* chunks(file) {
      const input = fs.openSync(file, 'r'),
        buffer = Buffer.alloc(64 * 1024);
      try {
        let count;
        while ((count = fs.readSync(input, buffer)) > 0) yield buffer.subarray(0, count);
      } finally {
        fs.closeSync(input);
      }
    }
    try {
      add('shrapwill.exe', chunks(launcher));
      add('current-release.txt', [Buffer.from(`${directory}/shrapwill.exe\n`)]);
      for (const file of files) add(`${directory}/${file.name}`, chunks(file.file));
      zip.end();
    } catch (error) {
      reject(error);
    }
  });
  try {
    await finished;
  } finally {
    fs.closeSync(handle);
  }
}
