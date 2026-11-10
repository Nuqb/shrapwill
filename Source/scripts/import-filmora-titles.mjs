import fs from 'node:fs';
import path from 'node:path';
import { installation, downloads, read, files } from './filmora-resources.mjs';
import {
  convertStyle,
  fingerprint,
  normalizedName,
  unsupportedStyle,
} from './filmora-title-support.mjs';

const root = path.resolve(import.meta.dirname, '..');
const catalogPath = path.join(root, 'src/features/library/catalog/titles.json');
const catalog = JSON.parse(read(catalogPath));
const names = new Set(catalog.map((entry) => normalizedName(entry.name)));
const signatures = new Set(
  catalog.map(({ name, style, sample, category, ...design }) => fingerprint(design)),
);
const records = [];
const styleRoot = path.join(
  process.env.SHRAPWILL_FILMORA_INSTALLATION || installation,
  'configs/TextStyle',
);

function importStyle(entry) {
  const file = path.join(styleRoot, path.basename(entry.config));
  const text = JSON.parse(JSON.parse(read(file)).TextStyle);
  const record = {
    type: 'text-style',
    name: entry.title,
    category: entry.category,
    source: path.basename(file),
  };
  const reason = unsupportedStyle(text);
  if (reason) return { ...record, status: 'pending', reason };
  const design = convertStyle(text);
  const style = `filmora_text_${fingerprint(design).slice(0, 16)}`;
  if (catalog.some((preset) => preset.style === style && preset.name === entry.title))
    return { ...record, status: 'imported', style, fingerprint: fingerprint(design) };
  const duplicate = names.has(normalizedName(entry.title)) || signatures.has(fingerprint(design));
  // A plain face without a treatment is already offered by Simple title.
  if (entry.title === 'Text_style_none' || duplicate)
    return { ...record, status: 'duplicate', style };
  catalog.push({
    style,
    name: entry.title,
    sample: 'YOUR STORY',
    category: entry.category,
    ...design,
  });
  names.add(normalizedName(entry.title));
  signatures.add(fingerprint(design));
  return { ...record, status: 'imported', style, fingerprint: fingerprint(design) };
}

for (const entry of JSON.parse(read(path.join(styleRoot, 'default_setting.json'))))
  records.push(importStyle(entry));

for (const kind of ['title', 'resTextAnimation', 'resTitlePreset', 'resVFXText']) {
  const folder = path.join(process.env.SHRAPWILL_FILMORA_DOWNLOADS || downloads, kind);
  if (!fs.existsSync(folder)) continue;
  for (const entry of fs.readdirSync(folder).sort()) {
    const directory = path.join(folder, entry);
    if (!fs.statSync(directory).isDirectory()) continue;
    const metadata = path.join(directory, 'resinfo.json');
    const info = fs.existsSync(metadata) ? JSON.parse(read(metadata)) : {};
    const payloads = files(path.join(directory, 'Data')).map((file) => path.basename(file));
    records.push({
      type: kind,
      name: info.titles?.en || entry,
      categories: (info.categories || []).map((category) => category.name),
      source: `${kind}/${entry}`,
      payloads,
      status: 'pending',
      reason: payloads.length
        ? 'Timeline/text animation adapter required'
        : 'No local template payload',
    });
  }
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(
  path.join(root, 'docs/filmora-title-inventory.json'),
  JSON.stringify({ records }, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    records.reduce((counts, record) => {
      counts[record.status] = (counts[record.status] || 0) + 1;
      return counts;
    }, {}),
  ),
);
