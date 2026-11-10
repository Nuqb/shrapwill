import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateKeyPairSync, verify } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import {
  packageMagic,
  stableVersion,
  createUpdatePackage,
  signRelease,
  packagePath,
} from './update-artifacts.mjs';

test('stable release tags reject prereleases, traversal and shell text', () => {
  assert.equal(stableVersion('v1.2.3'), '1.2.3');
  for (const value of [
    'v01.2.3',
    '1.2',
    'v1.2.3-beta',
    'v1.2.3+meta',
    '../v1.2.3',
    'v1.2.3;whoami',
  ])
    assert.throws(() => stableVersion(value));
});
test('packages reject paths outside their application allowlist', () => {
  for (const value of [
    '../project.cutline',
    'notices/../project',
    'C:/secret',
    'notices/NUL.txt',
    'notices/a.',
    'notices/a:b',
    'icons/a/b',
    '.release-keys/updater-private.pem',
  ])
    assert.equal(packagePath(value), false, value);
  assert.equal(packagePath('notices/FFmpeg-COPYING.GPLv3.txt'), true);
});
test('signed payload bytes are authenticated without reserializing JSON', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const signed = signRelease(
    { version: '1.2.3', notes: 'A saved project stays local.' },
    privateKey,
  );
  const payload = Buffer.from(signed.payload, 'base64'),
    signature = Buffer.from(signed.signature, 'base64');
  assert.equal(verify(null, payload, publicKey, signature), true);
  payload[0] ^= 1;
  assert.equal(verify(null, payload, publicKey, signature), false);
});
test('streamed portable package contains exact declared bytes and excludes other files', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shrapwill-update-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = ['shrapwill.exe', 'shrapwill-launcher.exe', 'ffmpeg.exe', 'ffprobe.exe'].map(
    (name) => {
      const file = path.join(root, name);
      fs.writeFileSync(file, `generated fixture ${name}`);
      return { name, file };
    },
  );
  const destination = path.join(root, 'update.gz');
  await createUpdatePackage({ version: '1.2.3', files, destination });
  const bytes = gunzipSync(fs.readFileSync(destination));
  assert.deepEqual(bytes.subarray(0, packageMagic.length), packageMagic);
  const headerLength = bytes.readUInt32LE(packageMagic.length);
  const begin = packageMagic.length + 4;
  const header = JSON.parse(bytes.subarray(begin, begin + headerLength));
  assert.deepEqual(
    header.files.map((file) => file.path),
    files.map((file) => file.name),
  );
  let offset = begin + headerLength;
  for (const file of header.files) {
    assert.deepEqual(
      bytes.subarray(offset, offset + file.size),
      fs.readFileSync(path.join(root, file.path)),
    );
    offset += file.size;
  }
  assert.equal(offset, bytes.length);
  await assert.rejects(
    createUpdatePackage({ version: '1.2.3', files: [...files, files[0]], destination }),
    /duplicate/,
  );
});
test('release key files are excluded from Git and source archives', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const sourcePackaging = fs.readFileSync(path.join(root, 'scripts/package-source.mjs'), 'utf8');
  assert.ok(sourcePackaging.includes("'config'"));
  assert.ok(!sourcePackaging.includes("'.release-keys'"));
  assert.ok(fs.readFileSync(path.join(root, '.gitignore'), 'utf8').includes('.release-keys/'));
});
