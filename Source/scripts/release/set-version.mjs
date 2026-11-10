import fs from 'node:fs';
import path from 'node:path';
import { sourceRoot } from './update-key.mjs';
import { stableVersion } from './update-artifacts.mjs';

const version = stableVersion(process.env.SHRAPWILL_RELEASE_TAG || process.argv[2] || '');
for (const name of ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json']) {
  const file = path.join(sourceRoot, name),
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = version;
  if (name === 'package-lock.json') value.packages[''].version = version;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
const manifest = path.join(sourceRoot, 'src-tauri/Cargo.toml');
fs.writeFileSync(
  manifest,
  fs
    .readFileSync(manifest, 'utf8')
    .replace(/(\[package\][\s\S]*?\nversion = )"[^"]+"/, `$1"${version}"`),
);
const lock = path.join(sourceRoot, 'Cargo.lock');
fs.writeFileSync(
  lock,
  fs
    .readFileSync(lock, 'utf8')
    .replace(/(\[\[package\]\]\s+name = "shrapwill"\s+version = )"[^"]+"/, `$1"${version}"`),
);
console.log(`Set Shrapwill release version to ${version}.`);
