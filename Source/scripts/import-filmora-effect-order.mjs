import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { downloads, read, displayName } from './filmora-resources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const profile = path.dirname(path.dirname(downloads));
const tree = JSON.parse(read(path.join(profile, 'Download/Category/en/categoryTree.json')));
const video = tree.en
  .find((entry) => entry.slug === 'effect_root_en')
  .children.find((entry) => entry.slug === 'effect_VideoEffects_en');
const manifest = JSON.parse(
  read(path.join(root, 'src/features/preview/ported/effects-manifest.json')),
).filter((entry) => entry.family === 'effect' && !entry.aliasOf && !entry.legacy);
const normalize = (name) =>
  displayName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const byName = new Map(manifest.map((entry) => [normalize(entry.name), entry.name]));
const byId = new Map();
for (const folder of ['filter', 'overlay', 'videoeffects']) {
  const base = path.join(downloads, folder);
  if (!fs.existsSync(base)) continue;
  for (const entry of fs.readdirSync(base)) {
    const file = path.join(base, entry, 'resinfo.json');
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(read(file));
    const name = byName.get(normalize(data.titles?.en || data.slug));
    if (name) byId.set(String(data.id), name);
  }
}
const database = new DatabaseSync(path.join(profile, 'resInfo.db'), { readOnly: true });
const pages = database.prepare('SELECT pageInfo_key, pageInfo_json FROM resourcePageInfos').all();
const categories = [...video.children]
  .sort((a, b) => a.list_order - b.list_order)
  .map((entry) => {
    const prefix = `en_Cache_Id_${entry.id}_${entry.slug}_PageIndex_`;
    const cached = pages
      .filter(
        (page) =>
          page.pageInfo_key.startsWith(prefix) && page.pageInfo_key.endsWith('_supportClient_'),
      )
      .sort(
        (a, b) =>
          Number(a.pageInfo_key.slice(prefix.length).split('_')[0]) -
          Number(b.pageInfo_key.slice(prefix.length).split('_')[0]),
      );
    const names = cached
      .flatMap((page) => JSON.parse(page.pageInfo_json).list || [])
      .map(
        (resource) =>
          byId.get(String(resource.id)) ||
          byName.get(normalize(resource.titles?.en || resource.slug)),
      )
      .filter(Boolean);
    return { name: entry.title.trim(), names: [...new Set(names)] };
  });
database.close();
const ordered = new Set(categories.flatMap((category) => category.names));
const unmatched = manifest.map((entry) => entry.name).filter((name) => !ordered.has(name));
fs.writeFileSync(
  path.join(root, 'src/features/library/catalog/filmora-effect-order.json'),
  JSON.stringify({ categories, unmatched }, null, 2) + '\n',
);
console.log(
  `${categories.length} Filmora categories; ${ordered.size} ordered effects; ${unmatched.length} without cached placement.`,
);
