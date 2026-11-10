import { describe, expect, it } from 'vitest';
import inventory from '../docs/filmora-local-inventory.json' with { type: 'json' };
import motions from './features/library/catalog/motion-transitions.json' with { type: 'json' };
import { transitionPresets } from './features/library/presets';
import originals from './features/preview/ported/manifest.json' with { type: 'json' };

const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
describe('local Filmora transition coverage', () => {
  it('represents every discovered resource once, including overlaps and aliases', () => {
    const kinds = transitionPresets.map((item) => item.kind);
    const names = transitionPresets.map((item) => normalized(item.name));
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(new Set(names).size).toBe(names.length);
    expect(inventory.entries.length).toBeGreaterThanOrEqual(112);
    for (const entry of inventory.entries)
      if (
        originals.some(
          (item) =>
            item.kind === entry.kind && item.status === 'shader' && !item.utility && !item.aliasOf,
        )
      )
        expect(kinds).toContain(entry.kind);
    const blocks = inventory.entries.filter((entry) => entry.name === 'Glitch Blocks');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe(blocks[1].kind);
    expect(inventory.entries.find((entry) => entry.name === 'Dissolve')?.kind).toBe('dissolve');
    expect(inventory.entries.find((entry) => entry.name === 'Fade')?.kind).toBe('fade');
  });
  it('has distinct bounded render settings and retains existing serialized identifiers', () => {
    const fields = [
      'dx',
      'dy',
      'zoom',
      'blur',
      'spin',
      'warp',
      'flash',
      'pixel',
      'glitch',
      'mask',
      'grayscale',
      'tint',
    ] as const;
    const settings = motions.map((item) => JSON.stringify(fields.map((field) => item[field] || 0)));
    expect(new Set(settings).size).toBeGreaterThanOrEqual(100);
    for (const item of motions) {
      expect(item.zoom).toBeGreaterThan(-1);
      expect(item.blur).toBeGreaterThanOrEqual(0);
      expect(item.blur).toBeLessThanOrEqual(0.25);
      for (const field of fields) expect(Number.isFinite(item[field] || 0)).toBe(true);
    }
    for (const kind of ['warp_zoom_3', 'round_zoom_out', 'cross_roll_4', 'simple_roll_7']) {
      expect(motions.some((item) => item.kind === kind)).toBe(true);
    }
  });
});
