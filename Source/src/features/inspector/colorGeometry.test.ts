import { describe, expect, it } from 'vitest';
import { wheelColor, wheelPosition } from './colorGeometry';
import { filterIconPaths, characterIconPaths } from './voiceIconPaths';
import catalog from '../audio/presets.json';
describe('grading wheel geometry', () => {
  it('keeps the center neutral and round-trips hue and strength', () => {
    expect(wheelColor(0, 0)).toEqual([0, 0, 0]);
    for (const [x, y] of [
      [0.4, 0.2],
      [-0.5, 0.2],
      [0.3, -0.6],
      [-0.2, -0.7],
    ]) {
      const rgb = wheelColor(x, y);
      expect(rgb.reduce((sum, n) => sum + n, 0)).toBeCloseTo(0);
      const position = wheelPosition(rgb);
      expect(position[0]).toBeCloseTo(x);
      expect(position[1]).toBeCloseTo(y);
    }
  });
  it('bounds a drag outside the wheel to valid grading values', () => {
    const rgb = wheelColor(100, -100);
    expect(rgb.every((n) => Number.isFinite(n) && n >= -1 && n <= 1)).toBe(true);
    expect(Math.hypot(...wheelPosition(rgb))).toBeCloseTo(1);
  });
});
it('covers every voice preset with a distinct authored SVG drawing', () => {
  for (const [catalogKeys, paths] of [
    [Object.keys(catalog.filters), filterIconPaths],
    [Object.keys(catalog.characters), characterIconPaths],
  ] as const) {
    expect(Object.keys(paths).sort()).toEqual([...catalogKeys].sort());
    expect(new Set(Object.values(paths)).size).toBe(catalogKeys.length);
    expect(Object.values(paths).every((path) => path.startsWith('M') && path.length > 20)).toBe(
      true,
    );
  }
});
