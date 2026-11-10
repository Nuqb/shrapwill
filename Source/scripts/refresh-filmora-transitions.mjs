import fs from 'node:fs';
import path from 'node:path';
import { downloads, read } from './filmora-resources.mjs';

const inventoryFile = path.resolve(import.meta.dirname, '../docs/filmora-local-inventory.json');
const inventory = JSON.parse(read(inventoryFile));
const sources = new Set(inventory.entries.map((entry) => entry.source));
const kinds = new Set(inventory.entries.map((entry) => entry.kind));
const folder = path.join(downloads, 'transition');
for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
  if (!item.isDirectory()) continue;
  const source = `Download/Filmora/transition/${item.name}`;
  const metadataFile = path.join(folder, item.name, 'resinfo.json');
  if (sources.has(source) || !fs.existsSync(metadataFile)) continue;
  const info = JSON.parse(read(metadataFile));
  const name = info.titles?.en || info.slug || item.name;
  const kind = `local_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')}`;
  if (kinds.has(kind)) continue;
  inventory.entries.push({
    name,
    resourceId: info.id,
    source,
    categories: (info.categories || []).map((category) => category.name),
    kind,
  });
  kinds.add(kind);
  sources.add(source);
}
fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2) + '\n');
console.log(`${inventory.entries.length} transition resources inventoried`);
