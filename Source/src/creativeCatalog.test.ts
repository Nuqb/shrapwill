import { revealKinds } from './features/preview/transitions';
import { describe, expect, it } from 'vitest';
import {
  filterPresets,
  titlePresets,
  transitionPresets,
  neutralColor,
} from './features/library/presets';
import { videoEffects, neutralVideoEffects } from './features/library/videoEffects';
import titles from './features/library/catalog/titles.json' with { type: 'json' };
import { revealThreshold } from './features/preview/transitions';
import { gradeColor } from './features/preview/color';

function settingsKey(item: Record<string, unknown>, keys: string[]) {
  return JSON.stringify(keys.map((key) => item[key]));
}
function maskSignature(kind: string) {
  const values = Array.from({ length: 37 * 23 }, (_, i) =>
    revealThreshold(kind, ((i % 37) + 0.5) / 37, (Math.floor(i / 37) + 0.5) / 23),
  );
  expect(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  expect(values.some((value) => value < 0.25)).toBe(true);
  expect(values.some((value) => value > 0.75)).toBe(true);
  return values.map((value) => value.toFixed(5)).join(',');
}

function expectEffectBounds(preset: (typeof videoEffects)[number]) {
  const limits = {
    mosaic: 0.25,
    rgbSplit: 0.1,
    shake: 0.1,
    mirror: 1,
    wave: 0.1,
    vignette: 1,
    scanlines: 1,
    effectStyle: 10,
    effectAmount: 1,
  };
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    expect(preset[key]).toBeGreaterThanOrEqual(0);
    expect(preset[key]).toBeLessThanOrEqual(limits[key]);
  }
}

describe('expanded creative catalog', () => {
  it('ships over 300 usable presets with unique identifiers and render settings', () => {
    expect(
      titlePresets.length +
        transitionPresets.length +
        filterPresets.length +
        videoEffects.length -
        2,
    ).toBeGreaterThanOrEqual(300);
    for (const items of [titlePresets, transitionPresets, filterPresets, videoEffects]) {
      expect(new Set(items.map((item) => item.name)).size).toBe(items.length);
    }
    expect(
      new Set(filterPresets.map((item) => settingsKey(item, Object.keys(neutralColor)))).size,
    ).toBe(filterPresets.length);
    expect(
      new Set(videoEffects.map((item) => settingsKey(item, Object.keys(neutralVideoEffects)))).size,
    ).toBe(videoEffects.length);
    const fields = ['base', 'position', 'spacing', 'weight', 'family', 'color', 'accent'];
    expect(new Set(titles.map((item) => settingsKey(item, fields))).size).toBe(titles.length);
  });
  it('gives every reveal a distinct sampled mask with bounded coverage', () => {
    const signatures = revealKinds.map((kind) => maskSignature(kind));
    expect(new Set(signatures).size).toBe(signatures.length);
  });
  it('keeps catalog values within core bounds and produces distinct color output', () => {
    const samples = [
      [0.15, 0.42, 0.8],
      [0.81, 0.36, 0.21],
      [0.52, 0.7, 0.31],
    ];
    // Original shaders/LUTs run on the GPU and are covered by native-render comparisons.
    const scalarFilters = filterPresets.filter((preset) => !preset.originalFilter);
    const signatures = scalarFilters.map((preset) =>
      samples
        .flatMap((rgb) => gradeColor(rgb, preset))
        .map((value) => value.toFixed(5))
        .join(','),
    );
    expect(new Set(signatures).size).toBe(scalarFilters.length);
    videoEffects.forEach(expectEffectBounds);
  });
});
