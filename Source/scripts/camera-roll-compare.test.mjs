import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inventory, compare } from './camera-roll-compare.mjs';

test('ignores folder layout, checks sizes, and verifies every duplicate candidate', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'camera-compare-'));
  try {
    const source = path.join(root, 'source');
    const target = path.join(root, 'target');
    await fs.mkdir(source);
    await fs.mkdir(path.join(target, 'nested'), { recursive: true });
    await fs.writeFile(path.join(source, 'photo.jpg'), 'real');
    await fs.writeFile(path.join(target, 'PHOTO.JPG'), 'fake');
    await fs.writeFile(path.join(target, 'nested', 'photo.jpg'), 'real');
    await fs.writeFile(path.join(source, 'absent.mov'), 'missing');
    await fs.writeFile(path.join(source, 'size.jpg'), 'longer');
    await fs.writeFile(path.join(target, 'size.jpg'), 'x');
    await fs.writeFile(path.join(source, 'collision.jpg'), 'abcd');
    await fs.writeFile(path.join(target, 'collision.jpg'), 'efgh');
    const [left, right] = await Promise.all([inventory(source), inventory(target)]);
    const fast = await compare(left, right);
    const verified = await compare(left, right, true);
    const status = (result, name) => result.rows.find((row) => row.name === name).status;
    assert.equal(status(fast, 'photo.jpg'), 'likely-copy');
    assert.equal(status(verified, 'photo.jpg'), 'verified-copy');
    assert.equal(status(verified, 'absent.mov'), 'missing');
    assert.equal(status(verified, 'size.jpg'), 'different-size');
    assert.equal(status(fast, 'collision.jpg'), 'likely-copy');
    assert.equal(status(verified, 'collision.jpg'), 'not-verified');
    assert.equal(verified.errors.length, 0);
    await fs.writeFile(path.join(source, 'photo.jpg'), 'changed');
    const changed = await compare(left, right, true);
    assert.equal(status(changed, 'photo.jpg'), 'not-verified');
    assert.ok(changed.errors.some((error) => error.message.includes('changed')));
    assert.equal((await inventory(path.join(root, 'nonexistent'))).errors.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
