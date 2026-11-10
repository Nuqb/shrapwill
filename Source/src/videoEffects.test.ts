import { describe, it, expect, vi } from 'vitest';
import { applyVideoEffect } from './app/actions/videoEffects';
import { applyFilter } from './app/actions/editing';
import type { ActionContext } from './app/actions/types';
import { defaults, type Clip, type Edit } from './types';
import { filterPresets } from './features/library/presets';
import { videoEffects, legacyEffectStyles } from './features/library/videoEffects';
import { tabs } from './app/config';

function context() {
  const clip: Clip = {
    id: 'clip',
    mediaId: 'media',
    name: 'Picture',
    start: 30,
    duration: 90,
    sourceIn: 1,
    link: null,
    audioEnabled: false,
    title: null,
    transition: { kind: 'fade', frames: 15 },
    props: {
      ...defaults,
      brightness: 0.2,
      scale: 0.8,
      shake: 0.03,
      wave: 0.02,
      vignette: 0.4,
      scanlines: 0.25,
    },
  };
  const edit = vi.fn(async (_operation: Edit) => undefined),
    notify = vi.fn();
  const ctx = {
    selectedClip: clip,
    presetTuning: { transitionSeconds: 2, filterStrength: 0.6, effectStrength: 0.6 },
    selectedTrack: { kind: 'video' },
    edit,
    notify,
    setSource: vi.fn(),
  };
  return { ctx: ctx as unknown as ActionContext, edit, notify, clip };
}
describe('separate color filters and video effects', () => {
  it('exposes distinct libraries and actual spatial/motion presets', () => {
    expect(tabs.map((tab) => tab.name)).toEqual(expect.arrayContaining(['Filters', 'Effects']));
    expect(filterPresets.length).toBeGreaterThan(150);
    expect(videoEffects.some((p) => p.mosaic > 0)).toBe(true);
    expect(videoEffects.some((p) => p.rgbSplit > 0)).toBe(true);
    expect(videoEffects.some((p) => p.shake > 0)).toBe(true);
    expect(videoEffects.some((p) => p.mirror === 1)).toBe(true);
  });
});
describe('distinct effect families', () => {
  it('limits camera motion to explicitly named motion effects and exposes ten different styles', () => {
    expect(videoEffects.filter((effect) => effect.shake > 0).map((effect) => effect.name)).toEqual([
      'Camera shake',
      'Glitch shake',
    ]);
    expect(
      new Set(
        legacyEffectStyles
          .filter((effect) => (effect.effectStyle ?? 0) > 0)
          .map((effect) => effect.effectStyle),
      ).size,
    ).toBe(10);
    expect(
      videoEffects
        .filter((effect) => effect.effectStyle > 0)
        .every(
          (effect) =>
            effect.shake === 0 &&
            effect.wave === 0 &&
            effect.scanlines === 0 &&
            effect.rgbSplit === 0,
        ),
    ).toBe(true);
  });
});

describe('independent filter and effect edits', () => {
  it('applies and resets effects while retaining color, transforms, and clip timing', () => {
    const { ctx, edit, clip } = context();
    applyVideoEffect(ctx, videoEffects.find((p) => p.name === 'RGB split')!);
    expect(edit).toHaveBeenLastCalledWith({
      type: 'properties',
      id: 'clip',
      props: {
        ...clip.props,
        effectStrength: 0.6,
        mosaic: 0,
        rgbSplit: 0.012,
        shake: 0,
        mirror: 0,
        wave: 0,
        vignette: 0,
        scanlines: 0,
      },
    });
    applyVideoEffect(ctx, videoEffects[0]);
    expect(edit.mock.calls.at(-1)?.[0]).toMatchObject({
      props: {
        brightness: 0.2,
        scale: 0.8,
        mosaic: 0,
        rgbSplit: 0,
        shake: 0,
        mirror: 0,
        wave: 0,
        vignette: 0,
        scanlines: 0,
      },
    });
  });
});
describe('filter edits preserve video effects', () => {
  it('applies and resets filters while retaining video effects', () => {
    const { ctx, edit } = context();
    applyFilter(ctx, filterPresets.find((p) => p.name === 'Sepia')!);
    expect(edit.mock.calls.at(-1)?.[0]).toMatchObject({
      props: { shake: 0.03, wave: 0.02, vignette: 0.4, scanlines: 0.25, sepia: 1, scale: 0.8 },
    });
    applyFilter(ctx, filterPresets[0]);
    expect(edit.mock.calls.at(-1)?.[0]).toMatchObject({
      props: { shake: 0.03, wave: 0.02, vignette: 0.4, scanlines: 0.25, sepia: 0, brightness: 0 },
    });
  });
  it('does not apply picture effects to audio clips', () => {
    const { ctx, edit, notify } = context();
    ctx.selectedTrack = { ...ctx.selectedTrack!, kind: 'audio' };
    applyVideoEffect(ctx, videoEffects[1]);
    applyFilter(ctx, filterPresets[1]);
    expect(edit).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
