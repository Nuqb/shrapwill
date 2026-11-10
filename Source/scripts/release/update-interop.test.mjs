import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { unzipSync } from 'fflate';
import { createUpdatePackage, signRelease, portableZip } from './update-artifacts.mjs';

test('Rust verifies and stages Node release artifacts, and rejects tampering', async (t) => {
  const source = path.resolve(import.meta.dirname, '../..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shrapwill interop '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'App');
  fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, 'current-release.txt'), 'previous.exe\n');
  const files = ['shrapwill.exe', 'shrapwill-launcher.exe', 'ffmpeg.exe', 'ffprobe.exe'].map(
    (name) => {
      const file = path.join(root, name);
      fs.writeFileSync(file, `generated fixture ${name}`);
      return { name, file };
    },
  );
  const archive = path.join(root, 'update.gz');
  const artifact = await createUpdatePackage({ version: '1.2.3', files, destination: archive });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const url = 'https://github.com/Nuqb/shrapwill/releases/download/v1.2.3/fixture.gz';
  const release = {
    schemaVersion: 1,
    repository: 'Nuqb/shrapwill',
    version: '1.2.3',
    tag: 'v1.2.3',
    notes: 'Fixture',
    portable: { ...artifact, url },
    installer: { ...artifact, url },
  };
  const manifest = path.join(root, 'manifest.json');
  fs.writeFileSync(manifest, JSON.stringify(signRelease(release, privateKey)));
  const key = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64');
  const build = spawnSync(
    'cargo',
    ['build', '-p', 'shrapwill-updater', '--example', 'verify_fixture', '--offline'],
    { cwd: source, encoding: 'utf8', windowsHide: true },
  );
  assert.equal(build.status, 0, build.stderr);
  const executable = path.join(
    source,
    'target/debug/examples/verify_fixture' + (process.platform === 'win32' ? '.exe' : ''),
  );
  const run = () =>
    spawnSync(executable, [manifest, key, archive, app], { encoding: 'utf8', windowsHide: true });
  const verified = run();
  assert.equal(verified.status, 0, verified.error?.message || verified.stderr);
  const staged = verified.stdout.trim();
  for (const file of files)
    assert.deepEqual(fs.readFileSync(path.join(staged, file.name)), fs.readFileSync(file.file));
  assert.equal(fs.readFileSync(path.join(app, 'current-release.txt'), 'utf8'), 'previous.exe\n');
  const zip = path.join(root, 'portable.zip');
  await portableZip({
    files,
    launcher: files[1].file,
    version: '1.2.3',
    editorHash: '0123456789abcdef',
    destination: zip,
  });
  const unpacked = unzipSync(fs.readFileSync(zip));
  const reference = Buffer.from(unpacked['current-release.txt']).toString().trim();
  assert.deepEqual(Buffer.from(unpacked[reference]), fs.readFileSync(files[0].file));
  const tampered = fs.readFileSync(archive);
  tampered[20] ^= 1;
  fs.writeFileSync(archive, tampered);
  assert.notEqual(run().status, 0);
});
