import { describe, it, expect } from 'vitest';
import groups from './features/library/catalog/preset-categories.json';
import originals from './features/preview/ported/effects-manifest.json';
import { originalPresetCategory } from './features/library/presetCategories';
import { filterPresets, titlePresets, transitionPresets } from './features/library/presets';
import { videoEffects } from './features/library/videoEffects';
describe('functional library categories', () => {
  it('includes bundled cinematic LUTs without duplicate filter names', () => {
    const names = filterPresets.map((entry) => entry.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    expect(new Set(names).size).toBe(names.length);
    for (const name of ['007 Series', 'B&W Film', 'Warm Film', 'Star Wars']) {
      expect(filterPresets.find((entry) => entry.name === name)?.category).toBe('Cinematic');
    }
    expect(filterPresets.find((entry) => entry.name === 'Canvas')?.category).toBe('Material');
    expect(filterPresets.find((entry) => entry.name === 'Urban Shine')?.category).toBe(
      'After Dark',
    );
  });
  it('retains supplied Filmora categories and uses local categories for unclassified resources', () => {
    expect(originalPresetCategory({ family: 'effect', name: 'Bokeh Blur', category: 'Lens' })).toBe(
      'Lens',
    );
    expect(
      originalPresetCategory({ family: 'effect', name: 'Bokeh Blur', category: 'Filmora' }),
    ).toBe('Blur');
  });
  it('explicitly categorizes every selectable imported filter and effect exactly once', () => {
    for (const family of ['filter', 'effect'] as const) {
      const listed = Object.values(groups[family]).flat();
      const ready = originals.filter(
        (entry) =>
          entry.status === 'shader' && entry.family === family && !entry.aliasOf && !entry.legacy,
      );
      expect(new Set(listed).size).toBe(listed.length);
      expect([...listed].sort()).toEqual(ready.map((entry) => entry.name).sort());
    }
  });
  it('groups presets by behavior instead of their source application', () => {
    expect(originalPresetCategory({ family: 'filter', name: 'Black & White 3' })).toBe(
      'Black & White',
    );
    expect(originalPresetCategory({ family: 'effect', name: 'Bokeh Blur' })).toBe('Blur');
    expect(originalPresetCategory({ family: 'effect', name: 'Glitch Discolor 02' })).toBe('Glitch');
    expect(originalPresetCategory({ family: 'effect', name: 'AI Caption Pop' })).toBe('Text');
    for (const item of [...filterPresets, ...videoEffects, ...titlePresets, ...transitionPresets]) {
      expect(item.category).not.toMatch(/filmora/i);
      if ('description' in item)
        expect(item.description).not.toMatch(/original.*(?:code|lut)|filmora/i);
    }
  });
});
