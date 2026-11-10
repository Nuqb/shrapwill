import { describe, expect, it } from 'vitest';
import { graphDimensions } from './features/preview/ported/RenderGraph';
import manifest from './features/preview/ported/manifest.json';
import effects from './features/preview/ported/effects-manifest.json';
import { videoPhase } from './features/preview/ported/SequenceTiming';

describe('independent render graphs', () => {
  it('preserves the original integer frame rate and float precision on short packed-video transitions', () => {
    const sequence = { timing: 'integer-fps', frameCount: 50 };
    expect(videoPhase(sequence, 0.5, 4 / 30)).toBe(24 / 50);
    expect(videoPhase(sequence, 0.5, 3)).toBe(24 / 50);
  });
  it('keeps original half-size and fixed portrait processing while restoring the output size', () => {
    expect(
      graphDimensions(
        [
          { body: '', inputs: [0], scale: 0.5 },
          { body: '', inputs: [-1] },
        ],
        1920,
        1080,
      ),
    ).toEqual([
      [960, 540],
      [1920, 1080],
    ]);
    expect(
      graphDimensions(
        [
          { body: '', inputs: [0], size: [548, 308] },
          { body: '', inputs: [-1] },
        ],
        720,
        1280,
      ),
    ).toEqual([
      [308, 548],
      [720, 1280],
    ]);
  });
  it('rejects cycles, invalid dimensions and excessive intermediate memory before allocation', () => {
    expect(() => graphDimensions([{ body: '', inputs: [-1] }], 128, 72)).toThrow(/earlier/);
    expect(() =>
      graphDimensions(
        [
          { body: '', inputs: [0], size: [0, 2] },
          { body: '', inputs: [-1] },
        ],
        128,
        72,
      ),
    ).toThrow(/dimensions/);
    expect(() =>
      graphDimensions(
        [
          { body: '', inputs: [0] },
          { body: '', inputs: [-1] },
        ],
        7680,
        7680,
      ),
    ).toThrow(/memory/);
  });
  it('validates every bundled graph without an installed source application', () => {
    let graphs = 0;
    for (const entry of [...manifest, ...effects]) {
      if (!('passes' in entry) || !entry.passes?.length) continue;
      expect(() => graphDimensions(entry.passes, 1920, 1080)).not.toThrow();
      graphs++;
    }
    expect(graphs).toBeGreaterThan(35);
  });
  it('bounds the original six-level HDR bloom at 4K and rejects oversized stage lists', () => {
    const fast = manifest.find((entry) => entry.kind === 'local_fast_motion_blur_right')!;
    expect(graphDimensions(fast.passes!, 3840, 2160)).toHaveLength(14);
    expect(() =>
      graphDimensions(
        Array.from({ length: 33 }, () => ({ body: '', inputs: [0] })),
        128,
        72,
      ),
    ).toThrow(/stage count/);
  });
});
