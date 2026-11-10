import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const installation = 'H:/Video Editing/Wondershare/Wondershare Filmora/15.6.4.20299';
const defaultDownloads = path.join(
  process.env.APPDATA,
  'Wondershare/Wondershare Filmora/Download/Filmora',
);
const settingsFile = path.join(
  process.env.APPDATA,
  'Wondershare/Wondershare Filmora/FilmoraSettings.xml',
);
const configuredFolder = fs.existsSync(settingsFile)
  ? fs
      .readFileSync(settingsFile, 'utf8')
      .match(/<DownloadFileFolder>([^<]+)<\/DownloadFileFolder>/)?.[1]
  : undefined;
export const downloads =
  process.env.SHRAPWILL_FILMORA_DOWNLOADS ||
  (configuredFolder ? path.join(configuredFolder, 'Filmora') : defaultDownloads);
export function files(directory) {
  return fs.existsSync(directory)
    ? fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory()
            ? files(path.join(directory, entry.name))
            : [path.join(directory, entry.name)],
        )
    : [];
}
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const displayName = (name) =>
  name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
export function retainLegacyPrograms(current, previous) {
  // Installed pack order must not replace verified presets or saved identifiers.
  const kinds = new Set(previous.map((entry) => entry.kind));
  const nameKey = (entry) => entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = new Set(previous.filter((entry) => !entry.legacy && !entry.aliasOf).map(nameKey));
  return [
    ...previous,
    ...current
      .filter((entry) => !kinds.has(entry.kind))
      .map((entry) => {
        if (names.has(nameKey(entry))) return { ...entry, legacy: true };
        names.add(nameKey(entry));
        return entry;
      }),
  ];
}
export const read = (file) => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
export function decoded(file) {
  let text = read(file);
  if (/^[\w+/=\s]+$/.test(text)) {
    const candidate = Buffer.from(text.replace(/\s/g, ''), 'base64').toString('utf8');
    if (/FUNCNAME|Running\(/.test(candidate)) text = candidate;
  }
  return text.replace(/\r\n?/g, '\n');
}
export function metadata(directory) {
  const file = path.join(directory, 'resinfo.json');
  if (!fs.existsSync(file)) return { name: path.basename(directory), category: 'Filmora' };
  const data = JSON.parse(read(file));
  // Copy only public display metadata; resource records can contain unrelated private fields.
  return {
    name: data.titles?.en || data.slug || path.basename(directory),
    category:
      data.categories?.find((category) => !/archive|download|trending|test/i.test(category.name))
        ?.name || 'Filmora',
  };
}
export function parameters(config) {
  const defaults = {};
  const lines = [];
  for (const p of config.PARAMS || []) {
    let value = p.DEFAULT;
    if (typeof value === 'number' && ['int', 'float', 'bool'].includes(p.TYPE)) {
      value = p.TYPE === 'float' && Number.isInteger(value) ? `${value}.0` : String(value);
    } else if (Array.isArray(value) && /^vec[234]$/.test(p.TYPE)) {
      value = `${p.TYPE}(${value.map((n) => (Number.isInteger(n) ? `${n}.0` : n)).join(',')})`;
    } else continue;
    defaults[p.NAME] = p.DEFAULT;
    lines.push(`#define param_${p.NAME} ${value}`);
  }
  return { defaults, preamble: lines.join('\n') };
}
export function importTextures(config, directory, destination) {
  fs.mkdirSync(destination, { recursive: true });
  return (config.TEXTURES || []).map((item) => {
    if (item.TYPE !== 'image') throw Error(`Unsupported texture type ${item.TYPE}`);
    const sequence = item.FILE.match(/\[(\d+)\]/),
      count = sequence ? Number(sequence[1]) : 1;
    return {
      files: Array.from({ length: count }, (_, index) => {
        const file = path.join(
          directory,
          sequence ? item.FILE.replace(sequence[0], String(index).padStart(4, '0')) : item.FILE,
        );
        const bytes = fs.readFileSync(file),
          name = hash(bytes) + path.extname(file).toLowerCase();
        fs.writeFileSync(path.join(destination, name), bytes);
        return name;
      }),
    };
  });
}
export function writeAssetRegistry(root) {
  const folder = 'src/features/preview/ported/assets';
  const nativeFiles = new Set(
    ['manifest.json', 'effects-manifest.json'].flatMap((name) => {
      const file = path.join(root, 'src/features/preview/ported', name);
      return fs.existsSync(file)
        ? JSON.parse(read(file))
            .filter((entry) => ['shader', 'requires-host-random-semantics'].includes(entry.status))
            .flatMap((entry) => (entry.textures ?? []).flatMap((group) => group.files))
        : [];
    }),
  );
  const entries = fs
    .readdirSync(path.join(root, folder))
    .filter((name) => nativeFiles.has(name))
    .sort()
    .map((name) => `        "${name}" => Some(include_bytes!("../../../${folder}/${name}")),`);
  fs.writeFileSync(
    path.join(root, 'crates/core/src/texture_assets.rs'),
    `// Generated original texture asset lookup; project paths are never accepted.\npub(crate) fn get(name:&str)->Option<&'static [u8]> {\n    match name {\n${entries.join('\n')}\n        _=>None,\n    }\n}\n`,
  );
}
export function deferGlobalInitializers(body) {
  const assignments = [];
  const masked = body.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) =>
    match.replace(/[^\n]/g, ' '),
  );
  const edits = [];
  let depth = 0,
    offset = 0;
  for (const line of masked.split('\n')) {
    if (depth === 0) {
      const match = line.match(/^(\s*)(float|int|bool|vec[234]|mat[234])\s+(\w+)\s*=\s*([^;]+);/);
      if (match) {
        const original = body.slice(offset, offset + match[0].length);
        const expression = original.slice(original.indexOf('=') + 1).trim();
        assignments.push(`${match[3]} = ${expression}`);
        edits.push({
          start: offset,
          end: offset + match[0].length,
          text: `${match[1]}${match[2]} ${match[3]};`,
        });
      }
    }
    depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    offset += line.length + 1;
  }
  for (const edit of edits.reverse())
    body = body.slice(0, edit.start) + edit.text + body.slice(edit.end);
  if (assignments.length)
    body = body.replace(/(vec4\s+FUNCNAME\s*\([^)]*\)\s*\{)/, `$1\n${assignments.join('\n')}`);
  return {
    body,
    adaptations: assignments.length
      ? ['deferred global initializers to the shader entry; expressions unchanged']
      : [],
  };
}
