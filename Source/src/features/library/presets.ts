import motionTransitions from './catalog/motion-transitions.json' with { type: 'json' };
import extraTitles from './catalog/titles.json' with { type: 'json' };
import extraTransitions from './catalog/transitions.json' with { type: 'json' };
import extraFilters from './catalog/filters.json' with { type: 'json' };
import type { Properties } from '../../types';
import originals from '../preview/ported/manifest.json' with { type: 'json' };
import originalEffects from '../preview/ported/effects-manifest.json' with { type: 'json' };
import { originalPresetCategory } from './presetCategories.ts';
import { compareFilters } from './filterOrder.ts';

export const titlePresets = [
  { style: 'plain', name: 'Simple title', sample: 'YOUR STORY', category: 'Openers' },
  { style: 'lower', name: 'Lower third', sample: 'A new perspective', category: 'Openers' },
  { style: 'cinematic', name: 'Cinema', sample: 'AFTER HOURS', category: 'Quotes' },
  { style: 'caption', name: 'Bold caption', sample: 'MAKE IT HAPPEN', category: 'Social' },
  { style: 'headline', name: 'Headline', sample: 'THE NEXT CHAPTER', category: 'Quotes' },
  { style: 'outline', name: 'Outline', sample: 'STAND OUT', category: 'Social' },
  { style: 'neon', name: 'Neon', sample: 'NIGHT LIGHTS', category: 'Social' },
  { style: 'label', name: 'Location tag', sample: 'SOMEWHERE NEW', category: 'Openers' },
  { style: 'quote', name: 'Pull quote', sample: 'Find your own way.', category: 'Quotes' },
  { style: 'minimal', name: 'Minimal', sample: 'less, but better', category: 'Quotes' },
  { style: 'retro', name: 'Retro', sample: 'GOOD TIMES', category: 'Social' },
  { style: 'credits', name: 'End credits', sample: 'MADE BY YOU', category: 'Openers' },
  ...extraTitles,
];

const transitionUtilities = new Set(
  originals.filter((entry) => entry.utility || entry.aliasOf).map((entry) => entry.kind),
);
export const transitionPresets = [
  { kind: 'fade', name: 'Fade to black', category: 'Classic' },
  { kind: 'dissolve', name: 'Cross dissolve', category: 'Classic' },
  { kind: 'wipe_left', name: 'Wipe left', category: 'Directional' },
  { kind: 'wipe_right', name: 'Wipe right', category: 'Directional' },
  { kind: 'wipe_up', name: 'Wipe up', category: 'Directional' },
  { kind: 'wipe_down', name: 'Wipe down', category: 'Directional' },
  { kind: 'iris_open', name: 'Iris open', category: 'Geometric' },
  { kind: 'iris_close', name: 'Iris close', category: 'Geometric' },
  { kind: 'blinds', name: 'Venetian blinds', category: 'Geometric' },
  { kind: 'checker', name: 'Checker reveal', category: 'Geometric' },
  ...extraTransitions,
  ...motionTransitions,
].filter((entry) => !transitionUtilities.has(entry.kind));

type LookAdjustments = Pick<
  Properties,
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'warmth'
  | 'tint'
  | 'sepia'
  | 'invert'
  | 'posterize'
  | 'originalFilter'
  | 'filterStrength'
>;
export const neutralColor: LookAdjustments = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  tint: 0,
  sepia: 0,
  invert: 0,
  posterize: 0,
  originalFilter: '',
  filterStrength: 1,
};
function look(
  name: string,
  category: string,
  description: string,
  adjustments: Partial<LookAdjustments>,
) {
  return { name, category, description, ...neutralColor, ...adjustments };
}
const builtInFilters = [
  look('Original', 'Essentials', 'Reset all picture color effects', {}),
  look('Monochrome', 'Essentials', 'Clean black and white', { contrast: 1.08, saturation: 0 }),
  look('Soft light', 'Essentials', 'Gentle, lifted shadows', {
    brightness: 0.05,
    contrast: 0.88,
    saturation: 0.9,
  }),
  look('Vivid', 'Essentials', 'Rich color and contrast', {
    brightness: 0.01,
    contrast: 1.12,
    saturation: 1.28,
  }),
  look('Golden hour', 'Cinema', 'Warm afternoon light', {
    warmth: 0.65,
    brightness: 0.03,
    contrast: 1.06,
  }),
  look('Cool evening', 'Cinema', 'Crisp blue shadows', {
    warmth: -0.55,
    contrast: 1.08,
    saturation: 0.85,
  }),
  look('Faded film', 'Vintage', 'Muted color, lifted blacks', {
    contrast: 0.78,
    saturation: 0.72,
    warmth: 0.25,
  }),
  look('Sepia', 'Vintage', 'Warm archival tones', { sepia: 1, contrast: 0.95 }),
  look('Silver screen', 'Cinema', 'Dramatic monochrome', {
    saturation: 0,
    contrast: 1.55,
    brightness: -0.03,
  }),
  look('Dreamy', 'Cinema', 'Airy pastel color', {
    contrast: 0.75,
    brightness: 0.08,
    saturation: 0.8,
    tint: -0.12,
  }),
  look('Summer', 'Social', 'Bright, sunlit color', {
    saturation: 1.4,
    warmth: 0.4,
    brightness: 0.04,
  }),
  look('Rose', 'Social', 'A soft pink cast', { tint: -0.45, warmth: 0.2, contrast: 0.94 }),
  look('Emerald', 'Cinema', 'Moody green tones', {
    tint: 0.38,
    warmth: -0.18,
    saturation: 0.7,
    brightness: -0.03,
  }),
  look('Instant photo', 'Vintage', 'Warm, faded keepsakes', {
    sepia: 0.3,
    saturation: 0.85,
    contrast: 0.85,
    warmth: 0.2,
  }),
  look('Noir', 'Cinema', 'Deep blacks and hard light', {
    saturation: 0,
    contrast: 1.8,
    brightness: -0.08,
  }),
  look('Negative', 'Experimental', 'Invert the picture colors', { invert: 1 }),
  look('Poster', 'Experimental', 'Graphic, stepped colors', { posterize: 5, saturation: 1.3 }),
  look('Electric', 'Experimental', 'Bold color separation', {
    posterize: 4,
    contrast: 1.25,
    tint: -0.3,
    saturation: 1.8,
  }),
  ...extraFilters.map(({ name, category, description, ...settings }) =>
    look(name, category, description, settings),
  ),
];
const originalFilters = originalEffects
  .filter((e) => e.status === 'shader' && e.family === 'filter' && !e.aliasOf && !e.legacy)
  .map((e) =>
    look(e.name, originalPresetCategory(e), `${originalPresetCategory(e)} color treatment`, {
      originalFilter: e.kind,
    }),
  );
const originalFilterNames = new Set(
  originalFilters.map((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
);
export const filterPresets = [
  builtInFilters[0],
  ...originalFilters,
  ...builtInFilters
    .slice(1)
    .filter((e) => !originalFilterNames.has(e.name.toLowerCase().replace(/[^a-z0-9]/g, ''))),
].sort(compareFilters);
export type FilterPreset = (typeof filterPresets)[number];
export function matchesPreset(
  item: { name: string; category: string; description?: string },
  search: string,
) {
  return `${item.name} ${item.category} ${item.description || ''}`
    .toLowerCase()
    .includes(search.trim().toLowerCase());
}
