import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'src/features/library/catalog/motion-transitions.json');
const inventoryPath = path.join(root, 'docs/filmora-local-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const motions = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).filter(
  (item) => !item.kind.startsWith('local_'),
);
const key = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = new Map([
  ['fade', 'fade'],
  ['fadetoblack', 'fade'],
  ['dissolve', 'dissolve'],
  ['linearwipe', 'wipe_right'],
]);
const existing = new Map(motions.map((item) => [key(item.name), item.kind]));
const categories = [
  'Speed Blur',
  'Zoom',
  'Glitch',
  'Fade&Dissolve',
  '3D',
  'Slides',
  'Brush',
  'Smoke',
  'MG',
  'Gold&Luxury',
  'Light',
  'Warp',
  'Stylize',
  'Ripple & Dissolve',
];

function category(entry) {
  const found = categories.find((value) => entry.categories.includes(value));
  if (found) return found;
  if (/zoom/i.test(entry.name)) return 'Zoom';
  if (/whirl|twirl/i.test(entry.name)) return 'Warp';
  return 'Classic';
}
function direction(name, variant) {
  if (/down right/i.test(name)) return [0.7, 0.7];
  if (/up right/i.test(name)) return [0.7, -0.7];
  if (/left/i.test(name)) return [-1, 0];
  if (/right/i.test(name)) return [1, 0];
  if (/down/i.test(name)) return [0, 1];
  if (/up/i.test(name)) return [0, -1];
  return [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ][variant % 4];
}
const profiles = {
  'Dispersion Blur': { blur: 0.2, warp: 0.2 },
  'Fast Wipe Left': { dx: -0.7, dy: 0, mask: 2 },
  'Fast Wipe Right': { dx: 0.7, dy: 0, mask: 2 },
  Drop: { dx: 0, dy: 1, mask: 2 },
  Erase: { dx: 0, dy: 0, mask: 2 },
  'Skew Right Split': { dx: 0.4, spin: -0.4, mask: 1 },
  'Fast Zoom': { zoom: 1.8, blur: 0.12 },
  'Fast Zoom in': { zoom: 2.2, blur: 0.1 },
  'Slow Zoom': { zoom: 0.4, blur: 0.02 },
  'Basic Zoom In': { zoom: 0.6, blur: 0 },
  'Left Eye Zoom': { zoom: 1.1, dx: -0.2 },
  'Parallax Smooth Zoom In': { zoom: 0.8, dx: 0.12, dy: -0.05 },
  'Glitch line': { glitch: 0.18, pixel: 0 },
  'Signal Error Transition 03': { glitch: 0.24, pixel: 0.06 },
  'Mask Blend': { mask: 4, blur: 0.08 },
  'Evaporate 1': { mask: 4, blur: 0.16, dy: -0.15 },
  'Metallic Silver Grace 09': { flash: 0.4, grayscale: 1, mask: 3 },
  'Roll Clockwise': { dx: 0, dy: 0, spin: 1.57 },
  'Flip Up': { dy: -1, zoom: -0.5, spin: 0 },
  'Shape Transition 60': { mask: 6, spin: 0.6 },
  'Phantom parallax zoom down': { zoom: 0.7, dy: 0.25 },
  'Phantom parallax zoom in': { zoom: 1.5, blur: 0.2 },
  'Phantom parallax zoom up': { zoom: 0.7, dy: -0.25 },
  'Zoom Ghost': { zoom: 0.5, blur: 0.25 },
  'Simple Roll 11': { dx: -0.7, dy: -0.7, blur: 0.07 },
  Push: { dx: 1, dy: 0, blur: 0 },
  'Lens Zoom': { zoom: 0.9, warp: 0.5 },
  'Wormhole 3': { zoom: 2.4, warp: 1.2, spin: 0.4 },
  Twirl: { spin: 2.8, warp: 0.4 },
  Doorway: { mask: 1, zoom: 0.3 },
  'Fade Single Track': { blur: 0.01 },
};
function motionProfile(name, variant) {
  const d = { dx: 0, dy: 0, zoom: 0, blur: 0, spin: 0, warp: 0 };
  if (/zoom|wormhole|warp|orb/i.test(name)) {
    d.zoom = /out/i.test(name) ? -0.55 : 0.7 + variant * 0.13;
    d.blur = /fuzzy|ghost|phantom/i.test(name) ? 0.16 : 0.06;
  }
  if (/roll|flip|turn|slide|swing|push|wind|motion blur|shift|slideshow/i.test(name)) {
    [d.dx, d.dy] = direction(name, variant);
    d.blur = /blur|wind/i.test(name) ? 0.15 : 0.04;
  }
  if (/rotary|whirl|twirl|clockwise|flip|turn|slideshow/i.test(name))
    d.spin = 0.35 + variant * 0.17;
  if (/fisheye|warp|wormhole|orb|morph|lens/i.test(name)) d.warp = 0.3 + variant * 0.06;
  if (/blur|evaporate|dissolve|morph|halo/i.test(name)) d.blur = Math.max(d.blur, 0.12);
  if (/fade dissolve up/i.test(name)) d.dy = -0.35;
  if (/halo/i.test(name)) d.warp = 0.2;
  return d;
}
function surfaceProfile(name) {
  const d = { flash: 0, pixel: 0, glitch: 0, mask: 0 };
  if (/flash|lightning|cinematic|silver/i.test(name)) d.flash = 0.8;
  if (/glitch|signal/i.test(name)) {
    d.glitch = 0.12;
    d.pixel = 0.035;
  }
  if (/pixelate|blocks/i.test(name)) d.pixel = 0.1;
  if (/door|box/i.test(name)) d.mask = 1;
  if (/wipe|erase|skew|drop|slide/i.test(name)) d.mask = 2;
  if (/pinwheel/i.test(name)) d.mask = 3;
  if (/brush|evaporate|wind|mask blend/i.test(name)) d.mask = 4;
  if (/floral|orb/i.test(name)) d.mask = 5;
  if (/rectangle|shape|metropolis/i.test(name)) d.mask = 6;
  if (/fade grayscale/i.test(name)) d.grayscale = 1;
  if (/color dissolve/i.test(name)) d.tint = 0.35;
  if (/fade 2/i.test(name)) d.flash = 0.45;
  return d;
}
function profile(entry, index) {
  const name = entry.name;
  const variant = Number(name.match(/(\d+)$/)?.[1] || 1);
  return {
    kind: `local_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    category: category(entry),
    ...motionProfile(name, variant),
    ...surfaceProfile(name),
    seed: index + 1,
    ...profiles[name],
  };
}

inventory.entries.forEach((entry, index) => {
  const normalized = key(entry.name);
  const kind = aliases.get(normalized) || existing.get(normalized);
  if (kind) {
    entry.kind = kind;
    return;
  }
  const item = profile(entry, index);
  motions.push(item);
  existing.set(normalized, item.kind);
  entry.kind = item.kind;
});
const originalPrograms = JSON.parse(
  fs.readFileSync(path.join(root, 'src/features/preview/ported/manifest.json'), 'utf8'),
);
const available = new Set(
  originalPrograms.filter((entry) => entry.status === 'shader').map((entry) => entry.kind),
);
const retained = new Set(
  JSON.parse(fs.readFileSync(catalogPath, 'utf8')).map((entry) => entry.kind),
);
const selectable = motions.filter((entry) => retained.has(entry.kind) || available.has(entry.kind));
fs.writeFileSync(catalogPath, `${JSON.stringify(selectable, null, 2)}\n`);
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(
  `${inventory.entries.length} local resources inventoried; ${selectable.length} motion presets.`,
);
