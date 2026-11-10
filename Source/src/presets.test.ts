import motions from './features/library/catalog/motion-transitions.json' with { type: 'json' };
import { describe, it, expect } from 'vitest';
import { defaults } from './types';
import { gradeColor } from './features/preview/color';
import {
  filterPresets,
  titlePresets,
  transitionPresets,
  matchesPreset,
} from './features/library/presets';
import { revealKinds, revealThreshold } from './features/preview/transitions';

describe('creative collection search', () => {
  it('offers distinct, searchable titles, looks, and transitions', () => {
    expect(new Set(titlePresets.map((p) => p.style)).size).toBe(86);
    expect(new Set(transitionPresets.map((p) => p.kind)).size).toBe(transitionPresets.length);
    expect(new Set(filterPresets.map((p) => p.name)).size).toBe(filterPresets.length);
    expect(filterPresets.filter((p) => p.originalFilter).length).toBeGreaterThan(50);
    expect(matchesPreset(filterPresets.find((p) => p.name === 'Sepia')!, ' vintage ')).toBe(true);
    expect(matchesPreset(titlePresets[0], 'unmatched')).toBe(false);
    expect(revealKinds).toEqual(
      transitionPresets
        .slice(2)
        .filter((p) => !motions.some((motion) => motion.kind === p.kind))
        .map((p) => p.kind),
    );
  });
});

describe('creative color and spatial rendering', () => {
  it('keeps neutral color identity and gives negative/sepia their expected channels', () => {
    gradeColor([0.2, 0.4, 0.6], defaults).forEach((value, i) =>
      expect(value).toBeCloseTo([0.2, 0.4, 0.6][i]),
    );
    gradeColor([0.2, 0.4, 0.6], { ...defaults, invert: 1 }).forEach((value, i) =>
      expect(value).toBeCloseTo([0.8, 0.6, 0.4][i]),
    );
    const [r, g, b] = gradeColor([0.4, 0.4, 0.4], { ...defaults, sepia: 1 });
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    for (const preset of filterPresets) {
      expect(
        gradeColor([0, 0.5, 1], preset).every((v) => v >= 0 && v <= 1 && Number.isFinite(v)),
      ).toBe(true);
    }
  });
  it('reveals the correct side and preserves spatial coverage', () => {
    expect(revealThreshold('wipe_right', 0.25, 0.5)).toBe(0.25);
    expect(revealThreshold('wipe_left', 0.25, 0.5)).toBe(0.75);
    expect(revealThreshold('wipe_up', 0.5, 0.25)).toBe(0.75);
    expect(revealThreshold('wipe_down', 0.5, 0.25)).toBe(0.25);
    expect(revealThreshold('iris_open', 0.5, 0.5)).toBe(0);
    expect(revealThreshold('iris_close', 0.5, 0.5)).toBe(1);
    for (const kind of revealKinds) {
      const thresholds = Array.from({ length: 100 }, (_, i) =>
        revealThreshold(kind, ((i % 10) + 0.5) / 10, (Math.floor(i / 10) + 0.5) / 10),
      );
      expect(thresholds.every((v) => v >= 0 && v <= 1)).toBe(true);
      expect(thresholds.some((v) => v < 0.5) && thresholds.some((v) => v > 0.5)).toBe(true);
    }
  });
});
