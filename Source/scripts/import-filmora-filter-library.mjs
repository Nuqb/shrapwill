import fs from 'node:fs';
import path from 'node:path';
import { installation, read, hash, writeAssetRegistry } from './filmora-resources.mjs';
import { importLut } from './filmora-luts.mjs';

// Incremental import: keep verified programs and saved identifiers intact.
const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, 'src/features/preview/ported');
const manifestFile = path.join(target, 'effects-manifest.json');
const manifest = JSON.parse(read(manifestFile));
const groupsFile = path.join(root, 'src/features/library/catalog/preset-categories.json');
const groups = JSON.parse(read(groupsFile));
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const active = manifest.filter((e) => !e.legacy);
const names = new Set(active.filter((e) => e.family === 'filter').map((e) => normalize(e.name)));
const hashes = new Set(active.map((e) => e.sourceHash));
const directory = path.join(installation, 'resources/wfx_effect/material/CubeLUTFiles');
const added = [];
for (const file of fs.readdirSync(directory).filter((name) => /\.cube$/i.test(name))) {
  const name = path.parse(file).name;
  const source = path.join(directory, file);
  if (names.has(normalize(name)) || hashes.has(hash(fs.readFileSync(source)))) continue;
  const entry = importLut(source, { name, category: 'Cinematic' }, target);
  const previousIndex = manifest.findIndex((item) => item.kind === entry.kind);
  if (previousIndex !== -1) manifest.splice(previousIndex, 1);
  manifest.push({ ...entry, legacy: false });
  names.add(normalize(name));
  hashes.add(entry.sourceHash);
  added.push(name);
}

// Preserve meaningful local package categories; bundled resources lack those labels.
for (const entry of manifest.filter(
  (e) => e.family === 'filter' && e.status === 'shader' && !e.aliasOf && !e.legacy,
)) {
  if (!entry.category || /^(Filmora|New)$/i.test(entry.category)) continue;
  for (const names of Object.values(groups.filter)) {
    const index = names.indexOf(entry.name);
    if (index !== -1) names.splice(index, 1);
  }
  (groups.filter[entry.category] ??= []).push(entry.name);
}
for (const [category, names] of Object.entries(groups.filter)) {
  if (!names.length) delete groups.filter[category];
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(groupsFile, JSON.stringify(groups, null, 2) + '\n');
writeAssetRegistry(root);
console.log(JSON.stringify({ added, totalAdded: added.length }));
