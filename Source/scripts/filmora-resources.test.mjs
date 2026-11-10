import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { retainLegacyPrograms, writeAssetRegistry } from './filmora-resources.mjs';

test('incremental imports preserve verified identifiers despite changed scan order', () => {
  const previous = [
    { kind: 'saved', name: 'Soft Light', sourceHash: 'original', status: 'shader' },
  ];
  const current = [
    { kind: 'replacement', name: 'Soft-Light', status: 'shader' },
    { kind: 'new', name: 'New Look', status: 'shader' },
  ];
  const result = retainLegacyPrograms(current, previous);
  assert.deepEqual(result[0], previous[0]);
  assert.equal(result.find((entry) => entry.kind === 'replacement').legacy, true);
  assert.equal(result.find((entry) => entry.kind === 'new').legacy, undefined);
});

test('native resources include renderable saved presets and exclude disabled payloads', () => {
  const qa = path.resolve(import.meta.dirname, '../../QA');
  fs.mkdirSync(qa, { recursive: true });
  const root = fs.mkdtempSync(path.join(qa, 'asset-registry-'));
  const ported = path.join(root, 'src/features/preview/ported');
  fs.mkdirSync(path.join(ported, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(root, 'crates/core/src'), { recursive: true });
  const manifest = [
    { status: 'shader', textures: [{ files: ['ready.png'] }] },
    { status: 'shader', legacy: true, textures: [{ files: ['saved.png'] }] },
    { status: 'requires-script', textures: [{ files: ['unfinished.mp4'] }] },
  ];
  fs.writeFileSync(path.join(ported, 'manifest.json'), JSON.stringify(manifest));
  for (const name of ['ready.png', 'saved.png', 'unfinished.mp4'])
    fs.writeFileSync(path.join(ported, 'assets', name), 'fixture');
  writeAssetRegistry(root);
  const registry = fs.readFileSync(path.join(root, 'crates/core/src/texture_assets.rs'), 'utf8');
  assert.match(registry, /ready\.png/);
  assert.match(registry, /saved\.png/);
  assert.doesNotMatch(registry, /unfinished\.mp4/);
});
