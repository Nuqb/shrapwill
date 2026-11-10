import fs from 'node:fs';
import path from 'node:path';
import {
  installation,
  downloads,
  files,
  hash,
  read,
  decoded,
  metadata,
  parameters,
  deferGlobalInitializers,
  writeAssetRegistry,
  displayName,
  retainLegacyPrograms,
} from './filmora-resources.mjs';
import { importLut } from './filmora-luts.mjs';
import { importHost, preserveHostFiles } from './filmora-host.mjs';
import { stabilizeRandomBlock } from './filmora-random.mjs';

const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, 'src/features/preview/ported');
const origins = path.join(target, 'originals');
const assets = path.join(target, 'assets');
fs.mkdirSync(assets, { recursive: true });
const manifest = [];
const manifestFile = path.join(target, 'effects-manifest.json');
const previous = (fs.existsSync(manifestFile) ? JSON.parse(read(manifestFile)) : []).map(
  (entry) => {
    if (entry.passes?.length === 1 && entry.passes[0].inputs.length === 1 && entry.textures.length)
      entry.passes[0].inputs = [0, ...entry.textures.map((_, index) => index + 2)];
    return entry;
  },
);
const seen = new Map();
const names = new Map();
const inventory = [];
function texture(file) {
  const bytes = fs.readFileSync(file),
    name = hash(bytes) + path.extname(file).toLowerCase();
  fs.writeFileSync(path.join(assets, name), bytes);
  return name;
}
function textures(config, directory) {
  return (config.TEXTURES || []).map((item) => {
    if (item.TYPE !== 'image') throw Error(`texture type ${item.TYPE}`);
    const match = item.FILE.match(/\[(\d+)\]/);
    const count = match ? Number(match[1]) : 1;
    const names = Array.from({ length: count }, (_, i) =>
      match ? item.FILE.replace(match[0], String(i).padStart(4, '0')) : item.FILE,
    );
    return { files: names.map((name) => texture(path.join(directory, name))) };
  });
}
function importLutDefinition(all, lutName, info, entry) {
  const lut = all.find((file) => path.basename(file).toLowerCase() === lutName.toLowerCase());
  if (!lut) {
    entry.status = 'missing-lut';
    return;
  }
  const imported = importLut(lut, info, target);
  imported.legacy = false;
  imported.name = displayName(imported.name);
  if (seen.has(imported.sourceHash)) {
    entry.status = 'duplicate';
    entry.aliasOf = seen.get(imported.sourceHash);
    return;
  }
  imported.aliasOf = names.get(info.name.toLowerCase().replace(/[^a-z0-9]/g, '')) || '';
  names.set(info.name.toLowerCase().replace(/[^a-z0-9]/g, ''), imported.kind);
  manifest.push(imported);
  seen.set(imported.sourceHash, imported.kind);
  entry.status = 'shader';
  entry.kind = imported.kind;
  return;
}

function shaderDefinition(all, definition, entry) {
  const configs = [...definition.matchAll(/<ConfigFile>([^<]+)<\/ConfigFile>/g)].map(
    (match) => match[1],
  );
  if (/<HumanSegment\b/.test(definition)) {
    entry.status = 'requires-human-segmentation';
    return;
  }
  if (configs.length !== 1) {
    entry.status = 'multi-pass-definition';
    return;
  }
  const configFile = all.find(
    (file) => path.basename(file).toLowerCase() === configs[0].toLowerCase(),
  );
  if (!configFile) {
    entry.status = 'missing-config';
    return;
  }
  let config;
  try {
    config = JSON.parse(read(configFile));
  } catch {
    entry.status = 'invalid-config';
    return;
  }
  let shader = all.find(
    (file) => path.basename(file).toLowerCase() === config.OPENGL?.toLowerCase(),
  );
  if (!shader && !config.OPENGL) {
    const sameName = all.filter(
      (file) =>
        path.extname(file) === '.frag' &&
        path.parse(file).name.toLowerCase() === config.NAME?.toLowerCase(),
    );
    if (sameName.length === 1) shader = sameName[0];
  }
  if (!shader) {
    entry.status = 'no-glsl-source';
    return;
  }
  return { configFile, config, shader };
}

function adaptShader(shader, config, info) {
  const adapted = deferGlobalInitializers(decoded(shader));
  if (!config.OPENGL)
    adapted.adaptations.push('used the bundled GLSL file matching the configured effect name');
  let body = adapted.body;
  if (info.name === 'Vintage') {
    body = body.replace(/\bcolor\.([xyz])\s*\/\s*255\.0/g, 'float(color.$1) / 255.0');
    adapted.adaptations.push(
      'made desktop GLSL integer-to-float division casts explicit for GLSL ES',
    );
  }
  return { body, adaptations: adapted.adaptations };
}

function shaderInputs({ body, config, configFile, entry, host }) {
  const params = parameters(config);
  const code = body.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const extra = [...code.matchAll(/PREFIX\(\s*(\w+)\s*\)/g)]
    .map((m) => m[1])
    .filter(
      (name) =>
        !['global_time', 'total_time', 'total_len', 'current_pos'].includes(name) &&
        !(name in params.defaults) &&
        !host?.passes.every((stage) => stage.body.includes('#define param_' + name + ' ')),
    );
  if (extra.length) {
    entry.status = `requires-parameters:${[...new Set(extra)].join(',')}`;
    return;
  }
  let maps;
  try {
    maps = textures(config, path.dirname(configFile));
  } catch (error) {
    entry.status = `requires-textures:${error.message}`;
    return;
  }
  const inputs = [...new Set([...code.matchAll(/\bINPUT(\d+)\s*\(/g)].map((m) => Number(m[1])))];
  if (!host && Math.max(...inputs) > 1 + maps.length) {
    entry.status = 'missing-inputs';
    return;
  }
  return { params, maps };
}

function registerShader({ info, group, entry, shader, body, adaptations, params, maps, host }) {
  if (host?.bindTextures) host.passes[0].inputs = [0, ...maps.map((_, index) => index + 2)];
  const key = hash(
    Buffer.from(JSON.stringify([body, params.preamble, maps, ...(host ? [host.passes] : [])])),
  );
  if (seen.has(key)) {
    entry.status = 'duplicate';
    entry.aliasOf = seen.get(key);
    return;
  }
  const kind =
    'filmora_' +
    info.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') +
    '_' +
    key.slice(0, 8);
  const sourceFile = kind + '.frag',
    bytes = fs.readFileSync(shader);
  fs.writeFileSync(path.join(origins, sourceFile), bytes);
  const family =
    group.name === 'filters' ||
    (!/global_time|current_pos/.test(body) && (body.match(/\bINPUT1\s*\(/g) || []).length === 1)
      ? 'filter'
      : 'effect';
  const nameKey = info.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliasOf = names.get(nameKey) || '';
  if (!aliasOf) names.set(nameKey, kind);
  const status = 'shader';
  manifest.push({
    kind,
    name: displayName(info.name),
    category: info.category,
    family,
    status,
    sourceFile,
    sourceHash: hash(bytes),
    body,
    ...params,
    textures: maps,
    sceneInputs: 1,
    ...(host
      ? {
          passes: host.passes.map((stage) => ({
            ...stage,
            body: params.preamble + '\n' + stage.body,
          })),
          sources: preserveHostFiles(host, origins, kind),
        }
      : {}),
    aliasOf,
    legacy: false,
    adaptations: [
      'normalized line endings',
      'bound original default parameters and texture inputs',
      ...adaptations,
      ...(host?.adaptations ?? []),
    ],
  });
  seen.set(key, kind);
  entry.status = status;
  entry.kind = kind;
}

function importDirectory(directory, group) {
  const info = metadata(directory);
  const entry = {
    ...info,
    source: path.relative(group.base, directory).replaceAll('\\', '/'),
    group: group.name,
  };
  inventory.push(entry);
  const all = files(directory),
    xml = all.find((file) => path.basename(file).toLowerCase() === 'filter.xml');
  if (!xml) {
    entry.status = 'no-filter-definition';
    return;
  }
  const definition = read(xml),
    lutName = definition.match(/<LutFile>([^<]+)<\/LutFile>/)?.[1];
  if (lutName) {
    importLutDefinition(all, lutName, info, entry);
    return;
  }
  const loaded = shaderDefinition(all, definition, entry);
  if (!loaded) return;
  const { configFile, config, shader } = loaded;
  let { body, adaptations } = adaptShader(shader, config, info);
  if (!body.includes('FUNCNAME')) {
    entry.status = 'custom-shader-entry';
    return;
  }
  const hasScript = all.some((file) => file.endsWith('.effect'));
  const host = hasScript ? importHost({ all, body, name: info.name }) : undefined;
  if (hasScript && !host) {
    entry.status = 'requires-script';
    return;
  }
  const inputs = shaderInputs({ body, config, configFile, entry, host });
  if (inputs && info.name === 'Random Block') {
    const adapted = stabilizeRandomBlock(body, inputs.params.defaults.size, assets);
    body = adapted.body;
    inputs.maps.push(adapted.texture);
    adaptations.push(
      'precomputed the original per-block random expression as float32 data for consistent cross-host sampling',
    );
  }
  if (inputs) registerShader({ info, group, entry, shader, body, adaptations, ...inputs, host });
}
for (const group of [
  { base: path.join(downloads, 'filter'), name: 'effects' },
  { base: path.join(downloads, 'resFilterNew'), name: 'filters' },
  { base: path.join(downloads, 'overlay'), name: 'overlays' },
  { base: path.join(downloads, 'videoeffects'), name: 'effects' },
  { base: path.join(downloads, 'arstickers'), name: 'body' },
  { base: path.join(downloads, 'resMuscle'), name: 'body' },
  { base: path.join(installation, 'resources/wfx_effect/nle_default'), name: 'bundled' },
])
  for (const item of fs
    .readdirSync(group.base, { withFileTypes: true })
    .filter((d) => d.isDirectory())) {
    try {
      importDirectory(path.join(group.base, item.name), group);
    } catch (error) {
      console.log(item.name, error.message);
    }
  }
fs.writeFileSync(
  path.join(target, 'effects-manifest.json'),
  JSON.stringify(retainLegacyPrograms(manifest, previous), null, 2) + '\n',
);
fs.writeFileSync(
  path.join(root, 'docs/filmora-effects-inventory.json'),
  JSON.stringify(inventory, null, 2) + '\n',
);
writeAssetRegistry(root);
await import('./import-filmora-filter-library.mjs');
const statuses = {};
for (const entry of inventory) statuses[entry.status] = (statuses[entry.status] || 0) + 1;
console.log(
  JSON.stringify(
    {
      programs: manifest.length,
      filters: manifest.filter((e) => e.family === 'filter').length,
      effects: manifest.filter((e) => e.family === 'effect').length,
      statuses,
    },
    null,
    2,
  ),
);
