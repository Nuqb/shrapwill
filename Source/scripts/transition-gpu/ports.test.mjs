import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const directory = path.resolve(import.meta.dirname, '../../src/features/preview/ported');
const manifest = ['manifest.json', 'effects-manifest.json'].flatMap((file) =>
  JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
);

test('lossless browser mask frames preserve full-range original video channels', () => {
  const ffmpeg = path.resolve(
    import.meta.dirname,
    '../../src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe',
  );
  for (const kind of [
    'local_cinematic_digital_slideshow_transition_07',
    'local_glitch_intro_transition_07',
    'local_metallic_silver_grace_09',
  ]) {
    const group = manifest.find((entry) => entry.kind === kind).textures[0],
      frame = Math.floor(group.frameCount / 2);
    const decode = (name, filters = []) =>
      execFileSync(
        ffmpeg,
        [
          '-v',
          'error',
          '-threads',
          '2',
          '-i',
          path.join(directory, 'assets', name),
          ...filters,
          '-frames:v',
          '1',
          '-pix_fmt',
          'rgba',
          '-f',
          'rawvideo',
          'pipe:1',
        ],
        { windowsHide: true, maxBuffer: 40 * 1024 * 1024 },
      );
    const original = decode(group.files[0], ['-vf', `select=eq(n\\,${frame})`]),
      browser = decode(group.browserFrames[frame]);
    assert.equal(original.length, group.width * group.height * 4);
    assert.equal(Buffer.compare(original, browser), 0, kind);
  }
});
test('original transition resources retain their exact recorded bytes', () => {
  for (const entry of manifest) {
    const bytes = fs.readFileSync(path.join(directory, 'originals', entry.sourceFile));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sourceHash, entry.name);
    for (const dependency of entry.sources ?? []) {
      const original = fs.readFileSync(path.join(directory, 'originals', dependency.sourceFile));
      assert.equal(
        createHash('sha256').update(original).digest('hex'),
        dependency.sourceHash,
        entry.name,
      );
    }
  }
});

test('original texture assets retain their exact content hashes', () => {
  for (const entry of manifest)
    for (const group of entry.textures || [])
      for (const name of [...group.files, ...(group.browserFrames ?? [])]) {
        const bytes = fs.readFileSync(path.join(directory, 'assets', name));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), path.parse(name).name, name);
      }
});

test('bundled render graphs have a complete local asset closure', () => {
  const registry = fs.readFileSync(
    path.resolve(directory, '../../../../crates/core/src/texture_assets.rs'),
    'utf8',
  );
  for (const entry of manifest) {
    assert.ok(!/^[a-z]:|^\\\\|^\//i.test(entry.sourceFile), entry.name);
    for (const group of entry.textures ?? [])
      for (const file of group.files) {
        assert.match(file, /^[a-f0-9]{64}\.(?:png|bmp|jpg|jpeg|f32|mp4|webp)$/i);
        assert.ok(registry.includes(file), `Missing embedded resource for ${entry.name}`);
      }
  }
});

test('standalone subject analysis retains pinned runtime, models and licenses', () => {
  const runtime = path.resolve(import.meta.dirname, '../../src-tauri/binaries/vision');
  const origin = JSON.parse(fs.readFileSync(path.join(runtime, 'origin.json'), 'utf8'));
  for (const entry of origin.entries) {
    const bytes = fs.readFileSync(path.join(runtime, entry.name));
    assert.equal(bytes.length, entry.bytes, entry.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.name);
  }
});

test('original LUT values are preserved without reducing color precision', () => {
  for (const entry of manifest.filter((entry) => entry.sourceType === 'cube')) {
    const text = fs.readFileSync(path.join(directory, 'originals', entry.sourceFile), 'utf8');
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.split('#')[0].trim())
      .filter((line) => /^[+-]?(?:\d|\.\d)/.test(line))
      .map((line) => line.split(/\s+/).map(Number));
    const bytes = fs.readFileSync(path.join(directory, 'assets', entry.textures[0].files[0]));
    assert.equal(bytes.length, rows.length * 16);
    for (const [index, row] of rows.entries())
      for (let channel = 0; channel < 3; channel++)
        assert.equal(bytes.readFloatLE(index * 16 + channel * 4), Math.fround(row[channel]));
  }
});

test('bundled graphics runtime retains its recorded bytes and license', () => {
  const runtime = path.resolve(import.meta.dirname, '../../src-tauri/binaries/ported-angle');
  const origin = JSON.parse(fs.readFileSync(path.join(runtime, 'origin.json'), 'utf8'));
  for (const entry of origin.entries) {
    const bytes = fs.readFileSync(path.join(runtime, entry.name));
    assert.equal(bytes.length, entry.bytes, entry.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.name);
  }
  const license = fs.readFileSync(path.resolve(runtime, '../../notices/ANGLE.txt'), 'utf8');
  assert.match(license, /ANGLE Project Authors/);
  assert.match(license, /Redistribution and use/);
});
