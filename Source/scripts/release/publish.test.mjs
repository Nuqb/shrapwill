import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishRelease } from './publish.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shrapwill-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const executable = path.join(root, 'build.exe');
  const launcher = path.join(root, 'launcher.exe');
  const appDirectory = path.join(root, 'App');
  fs.writeFileSync(executable, 'first completed build');
  fs.writeFileSync(launcher, 'stable launcher');
  return { executable, launcher, appDirectory, version: '0.8.0' };
}

test('same-version rebuilds update the pointer and preserve the previous executable', (t) => {
  const options = fixture(t);
  const first = publishRelease(options);
  fs.writeFileSync(options.executable, 'new completed build');
  const second = publishRelease(options);
  assert.notEqual(first, second);
  assert.equal(fs.readFileSync(first, 'utf8'), 'first completed build');
  assert.equal(fs.readFileSync(second, 'utf8'), 'new completed build');
  assert.equal(
    fs.readFileSync(path.join(options.appDirectory, 'current-release.txt'), 'utf8').trim(),
    path.basename(second),
  );
  assert.equal(
    fs.readFileSync(path.join(options.appDirectory, 'shrapwill.exe'), 'utf8'),
    'stable launcher',
  );
});

test('missing builds and corrupt published files never change the current reference', (t) => {
  const options = fixture(t);
  const first = publishRelease(options);
  const pointer = path.join(options.appDirectory, 'current-release.txt');
  const before = fs.readFileSync(pointer, 'utf8');
  assert.throws(() => publishRelease({ ...options, executable: `${options.executable}.missing` }));
  assert.equal(fs.readFileSync(pointer, 'utf8'), before);
  fs.writeFileSync(first, 'corrupted');
  assert.throws(() => publishRelease(options), /integrity/);
  assert.equal(fs.readFileSync(pointer, 'utf8'), before);
});

test('migration preserves the previous entry point and publishing is repeatable', (t) => {
  const options = fixture(t);
  fs.mkdirSync(options.appDirectory);
  fs.writeFileSync(path.join(options.appDirectory, 'shrapwill.exe'), 'original editor');
  const first = publishRelease(options);
  assert.equal(publishRelease(options), first);
  const backup = fs
    .readdirSync(options.appDirectory)
    .find((file) => file.startsWith('previous-entry-'));
  assert.equal(fs.readFileSync(path.join(options.appDirectory, backup), 'utf8'), 'original editor');
  assert.deepEqual(
    fs.readdirSync(options.appDirectory).filter((file) => file.endsWith('.tmp')),
    [],
  );
});
