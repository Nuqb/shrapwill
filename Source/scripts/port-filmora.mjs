import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { importMediaTransition, importMetallic } from './filmora-media-transitions.mjs';
import { deferGlobalInitializers, downloads } from './filmora-resources.mjs';
import { importHost, preserveHostFiles } from './filmora-host.mjs';
import { importTextures, writeAssetRegistry } from './filmora-resources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/filmora-local-inventory.json'), 'utf8'),
);
const destination = path.join(root, 'src/features/preview/ported');
fs.mkdirSync(path.join(destination, 'originals'), { recursive: true });
const download = path.dirname(path.dirname(downloads));
const installation = 'H:/Video Editing/Wondershare/Wondershare Filmora';

function files(directory) {
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
function sourceText(file) {
  let source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!source.includes('FUNCNAME') && /^[A-Za-z0-9+/=\s]+$/.test(source)) {
    const decoded = Buffer.from(source.replace(/\s/g, ''), 'base64').toString('utf8');
    if (decoded.includes('FUNCNAME')) source = decoded;
  }
  return source.replace(/\r\n?/g, '\n');
}
function primaryShader(entries) {
  const shaders = entries.filter((file) => file.endsWith('.frag'));
  for (const file of entries.filter((file) => path.basename(file).toLowerCase() === 'filter.xml')) {
    const names = [
      ...fs.readFileSync(file, 'utf8').matchAll(/<ConfigFile>([^<]+)<\/ConfigFile>/g),
    ].map((match) => match[1]);
    if (names.length !== 1) continue;
    const config = entries.find(
      (file) => path.basename(file).toLowerCase() === names[0].toLowerCase(),
    );
    if (!config) continue;
    const settings = JSON.parse(fs.readFileSync(config, 'utf8').replace(/^\uFEFF/, ''));
    const shader = shaders.find(
      (file) => path.basename(file).toLowerCase() === settings.OPENGL?.toLowerCase(),
    );
    if (shader) return shader;
  }
  return shaders.length === 1 ? shaders[0] : undefined;
}
const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'));
const used = new Set();
const existingKinds = new Set(
  JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8')).map(
    (entry) => entry.kind,
  ),
);
for (const entry of inventory.entries) {
  if (existingKinds.has(entry.kind)) continue;
  if (used.has(entry.kind)) continue;
  const directory = path.join(
    entry.source.startsWith('15.') ? installation : download,
    entry.source,
  );
  const entries = files(directory);
  if (!existingKinds.has(entry.kind) && !primaryShader(entries)) continue;
  const metallic = importMetallic(entry, entries, destination);
  if (metallic) {
    manifest.push(metallic);
    used.add(entry.kind);
    continue;
  }
  let shader = primaryShader(entries);
  const translated = { local_wind: 'Wind', local_rectangle_zoom_in: 'Rect_zoom_in' }[entry.kind];
  if (!shader && translated)
    shader = entries.find((file) => path.basename(file) === `${translated}.cl`);
  if (!shader) {
    const media = importMediaTransition(entry, entries, destination);
    if (media) {
      manifest.push(media);
      used.add(entry.kind);
    }
    continue;
  }
  let body =
    translated && shader.endsWith('.cl')
      ? fs.readFileSync(
          path.join(root, 'scripts/transition-gpu/ports', `${translated}.frag`),
          'utf8',
        )
      : sourceText(shader);
  const adaptations = ['normalized line endings'];
  if (translated)
    adaptations.push(
      'OpenCL image I/O and vector syntax translated to GLSL; equations and constants preserved',
    );
  if (entry.kind === 'cross_zoom') {
    body = body.replace('float strength = Sinusoidal_easeInOut', 'strength = Sinusoidal_easeInOut');
    adaptations.push('removed duplicate local declaration; expression unchanged');
  }
  if (['round_zoom_out', 'local_fade_single_track'].includes(entry.kind)) {
    const declarations = [];
    body = body.replace(
      /^(?:float progress = PREFIX\(global_time\)\/PREFIX\(total_time\);|vec2 resolution = iResolution;)\s*$/gm,
      (line) => {
        declarations.push(line.trim());
        return '';
      },
    );
    body = body.replace(/(vec4\s+FUNCNAME\s*\([^)]*\)\s*\{)/, `$1\n${declarations.join('\n')}`);
    adaptations.push(
      'moved two uniform-dependent initializers into the transition function; expressions unchanged',
    );
  }
  const deferred = deferGlobalInitializers(body);
  body = deferred.body;
  adaptations.push(...deferred.adaptations);
  if (!body.includes('FUNCNAME')) continue;
  const inputs = [...new Set([...body.matchAll(/\b(INPUT\d+)\s*\(/g)].map((match) => match[1]))];
  const params = [...new Set([...body.matchAll(/PREFIX\((\w+)\)/g)].map((match) => match[1]))];
  const defaults = {};
  let textures = [];
  for (const file of entries.filter((file) => file.endsWith('.conf'))) {
    const config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (config.OPENGL?.toLowerCase() !== path.basename(shader).toLowerCase()) continue;
    try {
      textures = importTextures(config, path.dirname(file), path.join(destination, 'assets'));
    } catch {
      textures = [];
    }
    for (const parameter of config.PARAMS || []) {
      if (typeof parameter.DEFAULT === 'number' && ['int', 'float'].includes(parameter.TYPE)) {
        defaults[parameter.NAME] = { type: parameter.TYPE, value: parameter.DEFAULT };
      }
    }
  }
  const preamble = Object.entries(defaults)
    .map(
      ([name, parameter]) =>
        `#define param_${name} ${parameter.type === 'float' && Number.isInteger(parameter.value) ? `${parameter.value}.0` : parameter.value}`,
    )
    .join('\n');
  const extra = params.filter(
    (name) =>
      !['global_time', 'total_time', 'total_len', 'current_pos'].includes(name) && !defaults[name],
  );
  const host = importHost({ all: entries, body, name: entry.name, sceneInputs: 2 });
  const status = host
    ? 'shader'
    : entries.some((file) => file.endsWith('.effect'))
      ? 'requires-script'
      : inputs.some((name) => Number(name.slice(5)) > 2 + textures.length)
        ? 'requires-textures'
        : extra.length
          ? 'requires-parameters'
          : 'shader';
  if (host) adaptations.push(...host.adaptations);
  if (host?.sequence === 'lightning') textures[0].timing = 'lightning';
  const bytes = fs.readFileSync(shader);
  const sourceFile = `${entry.kind}${path.extname(shader)}`;
  fs.writeFileSync(path.join(destination, 'originals', sourceFile), bytes);
  manifest.push({
    kind: entry.kind,
    name: entry.name,
    sourceFile,
    sourceHash: createHash('sha256').update(bytes).digest('hex'),
    status,
    inputs,
    params,
    defaults,
    preamble,
    adaptations,
    body,
    utility: entry.kind === 'local_mask_blend',
    sceneInputs: 2,
    ...(host
      ? {
          passes: host.passes.map((stage) => ({ ...stage, body: preamble + '\n' + stage.body })),
          sources: preserveHostFiles(host, path.join(destination, 'originals'), entry.kind),
          analysis: host.analysis,
          switchInput: host.switchInput,
          curves: host.curves,
        }
      : {}),
    textures: host?.textures ?? textures,
  });
  used.add(entry.kind);
}
// Retain the early unnumbered project ID without displaying a duplicate card.
const warp = manifest.find((entry) => entry.kind === 'local_warp_zoom_1');
if (warp && !manifest.some((entry) => entry.kind === 'warp_zoom'))
  manifest.push({ ...warp, kind: 'warp_zoom', name: 'Warp Zoom (legacy ID)', aliasOf: warp.kind });
fs.writeFileSync(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeAssetRegistry(root);
console.log(manifest.map(({ name, status }) => ({ name, status })));
console.log(
  `${manifest.filter((entry) => entry.status === 'shader').length} self-contained shaders; ${manifest.length} shader resources.`,
);
