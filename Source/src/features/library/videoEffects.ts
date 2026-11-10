import extraEffects from './catalog/effects.json' with { type: 'json' };
import type { Properties } from '../../types';
import originals from '../preview/ported/effects-manifest.json' with { type: 'json' };
import { originalPresetCategory } from './presetCategories.ts';
import filmoraOrder from './catalog/filmora-effect-order.json' with { type: 'json' };

export type VideoEffectSettings = Pick<
  Properties,
  | 'mosaic'
  | 'rgbSplit'
  | 'shake'
  | 'mirror'
  | 'wave'
  | 'vignette'
  | 'scanlines'
  | 'effectStyle'
  | 'effectAmount'
  | 'originalEffect'
  | 'effectStrength'
>;
export const neutralVideoEffects: VideoEffectSettings = {
  mosaic: 0,
  rgbSplit: 0,
  shake: 0,
  mirror: 0,
  wave: 0,
  vignette: 0,
  scanlines: 0,
  effectStyle: 0,
  effectAmount: 0,
  originalEffect: '',
  effectStrength: 1,
};
function effect(
  name: string,
  category: string,
  description: string,
  settings: Partial<VideoEffectSettings>,
) {
  return { name, category, description, ...neutralVideoEffects, ...settings };
}
const bundledEffects = extraEffects.map(({ name, category, description, ...settings }) =>
  effect(name, category, description, settings),
);
export const legacyEffectStyles = bundledEffects.filter((effect) => effect.effectStyle > 0);
const builtInEffects = [
  effect('None', 'Essentials', 'Remove video effects; keep your color filter', {}),
  ...bundledEffects.filter((effect) => effect.effectStyle > 0),
  effect('Mosaic', 'Stylize', 'Break the picture into square pixel blocks', { mosaic: 0.035 }),
  effect('RGB split', 'Glitch', 'Separate the red and blue channels sideways', { rgbSplit: 0.012 }),
  effect('Camera shake', 'Motion', 'Fast handheld movement with a safe zoom', { shake: 0.005 }),
  effect('Glitch shake', 'Glitch', 'Combine camera movement and RGB separation', {
    shake: 0.012,
    rgbSplit: 0.018,
  }),
  effect('Mirror split', 'Distortion', 'Reflect the picture around its center', { mirror: 1 }),
  ...bundledEffects.filter((effect) => effect.effectStyle === 0),
];
const originalEffects = originals
  .filter((e) => e.status === 'shader' && e.family === 'effect' && !e.aliasOf && !e.legacy)
  .map((e) =>
    effect(e.name, originalPresetCategory(e), `${originalPresetCategory(e)} video effect`, {
      originalEffect: e.kind,
    }),
  );
const originalNames = new Set(
  originalEffects.map((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
);
export const videoEffects = [
  builtInEffects[0],
  ...originalEffects,
  ...builtInEffects
    .slice(1)
    .filter((e) => !originalNames.has(e.name.toLowerCase().replace(/[^a-z0-9]/g, ''))),
];
export type VideoEffectPreset = (typeof videoEffects)[number];
export const videoEffectCategories = [
  ...filmoraOrder.categories,
  { name: 'Other imported effects', names: filmoraOrder.unmatched },
  {
    name: 'Shrapwill',
    names: videoEffects.filter((entry) => !entry.originalEffect).map((entry) => entry.name),
  },
];
