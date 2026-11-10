import { previewPhotoIndex } from './features/library/art/photoSelection';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  previewFilter,
  previewVideoEffect,
  previewTransition,
  selectedPresetPlan,
  applyPreviewPreset,
} from './app/actions/presetPreview';
import { previewTitle } from './app/actions/titlePreview';
import type { ActionContext } from './app/actions/types';
import {
  defaults,
  emptySnapshot,
  type Clip,
  type PreviewSource,
  type RenderPlan,
  type Edit,
} from './types';
import { filterPresets } from './features/library/presets';
import { videoEffects } from './features/library/videoEffects';
import { playbackPosition } from './features/preview/playbackClock';
import { updatePresetTuning, tunePreviewPlan } from './app/actions/presetTuning';
import { hoverFrame } from './features/library/art/timing';
import { gradeColor } from './features/preview/color';

vi.mock('./services/desktop/client', () => ({ call: vi.fn() }));
import { call } from './services/desktop/client';
const plan: RenderPlan = {
  width: 1920,
  height: 1080,
  fps: { num: 30, den: 1 },
  duration: 150,
  clips: [],
};
const clip: Clip = {
  id: 'clip',
  name: 'Selected shot',
  mediaId: 'media',
  start: 90,
  duration: 240,
  sourceIn: 1,
  props: { ...defaults, warmth: 0.3, shake: 0.025, scale: 0.8 },
  title: null,
  transition: { kind: 'fade', frames: 15 },
  link: null,
  audioEnabled: true,
};
function context(selected = false) {
  let source: PreviewSource | null = null;
  const ctx = {
    p: emptySnapshot().project,
    presetTuning: { transitionSeconds: 2, filterStrength: 0.6, effectStrength: 0.6 },
    setPresetTuning: vi.fn((next) => {
      ctx.presetTuning = next;
    }),
    render: selected
      ? {
          ...plan,
          clips: [
            {
              clip,
              trackId: 'video',
              kind: 'video',
              source: 'prepared.mp4',
              width: 1920,
              height: 1080,
              audible: true,
              previewReady: true,
            },
          ],
        }
      : null,
    selectedClip: selected ? clip : null,
    selectedTrack: { kind: 'video', locked: false },
    setSource: (
      next: PreviewSource | null | ((s: PreviewSource | null) => PreviewSource | null),
    ) => {
      source = typeof next === 'function' ? next(source) : next;
      ctx.source = source;
    },
    source: null as PreviewSource | null,
    setPlaying: vi.fn(),
    setTitlePreset: vi.fn(),
    setFrame: vi.fn(),
    notify: vi.fn(),
    edit: vi.fn(async (_edit: Edit) => undefined),
  };
  return { ctx: ctx as unknown as ActionContext, current: () => source };
}
beforeEach(() => vi.mocked(call).mockReset());
describe('sample preset previews', () => {
  it('previews a filter without editing or seeking the project', async () => {
    vi.mocked(call).mockResolvedValue(plan);
    const { ctx, current } = context();
    await previewFilter(ctx, filterPresets.find((p) => p.name === 'Sepia')!);
    expect(current()).toMatchObject({
      kind: 'preset',
      presetKind: 'filter',
      presetKey: 'Sepia',
      playing: true,
      plan,
    });
    expect(call).toHaveBeenCalledWith('preview_preset', {
      options: {
        sampleIndex: previewPhotoIndex('Sepia'),
        properties: {
          ...defaults,
          sepia: 1,
          contrast: 0.95,
        },
        transitionKind: null,
      },
    });
    expect(ctx.edit).not.toHaveBeenCalled();
    expect(ctx.setFrame).not.toHaveBeenCalled();
  });
  it('uses two-shot native previews for transitions even with a selection', async () => {
    vi.mocked(call).mockResolvedValue(plan);
    const { ctx, current } = context(true);
    await previewTransition(ctx, 'wipe_right');
    expect(call).toHaveBeenCalledWith('preview_preset', {
      options: {
        properties: defaults,
        transitionKind: 'wipe_right',
        sampleIndex: previewPhotoIndex('wipe_right'),
      },
    });
    expect(current()).toMatchObject({ presetKind: 'transition', presetKey: 'wipe_right' });
    expect(ctx.edit).not.toHaveBeenCalled();
  });
});
describe('selected clip preset isolation', () => {
  it('clones only the selected shot and retains its other settings', async () => {
    const { ctx, current } = context(true);
    const before = structuredClone(ctx.render);
    await previewVideoEffect(ctx, videoEffects.find((p) => p.name === 'RGB split')!);
    expect(call).not.toHaveBeenCalled();
    expect(current()).toMatchObject({
      playing: true,
      plan: {
        duration: 150,
        clips: [
          {
            audible: true,
            clip: {
              start: 0,
              sourceIn: 1,
              transition: null,
              props: { warmth: 0.3, rgbSplit: 0.012, shake: 0, scale: 0.8 },
            },
          },
        ],
      },
    });
    expect(ctx.render).toEqual(before);
    expect(ctx.edit).not.toHaveBeenCalled();
  });
  it('honors muted clips and retains their original fade timing in the bounded preview', () => {
    const { ctx } = context(true);
    ctx.render!.clips[0].audible = false;
    const preview = selectedPresetPlan(ctx, { sepia: 1 })!;
    expect(preview.clips[0].audible).toBe(false);
    expect(preview.clips[0].clip.audioEnabled).toBe(ctx.selectedClip!.audioEnabled);
    expect(preview.clips[0].clip.duration).toBe(ctx.selectedClip!.duration);
    expect(preview.duration).toBeLessThan(preview.clips[0].clip.duration);
  });
  it('falls back to sample media when the selected shot is not ready', () => {
    const { ctx } = context(true);
    ctx.render!.clips[0] = { ...ctx.render!.clips[0], previewReady: false };
    expect(selectedPresetPlan(ctx, { sepia: 1 })).toBeNull();
  });
});
describe('preset selection and explicit apply', () => {
  it('does not let a late filter response replace a newer title preview', async () => {
    let resolve!: (plan: RenderPlan) => void;
    vi.mocked(call)
      .mockReturnValueOnce(
        new Promise<RenderPlan>((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValueOnce(plan);
    const { ctx, current } = context();
    const pending = previewFilter(ctx, filterPresets[0]);
    await previewTitle(ctx, 'neon');
    resolve(plan);
    await pending;
    expect(current()).toMatchObject({ kind: 'title', name: 'Neon' });
  });
  it('applies a preview exactly once through the existing editing action', async () => {
    const { ctx } = context(true);
    await previewFilter(ctx, filterPresets.find((p) => p.name === 'Sepia')!);
    applyPreviewPreset(ctx);
    expect(ctx.edit).toHaveBeenCalledTimes(1);
    expect(ctx.edit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'properties',
        id: clip.id,
        props: expect.objectContaining({ sepia: 1, shake: 0.025 }),
      }),
    );
    expect(ctx.source).toBeNull();
  });
});
describe('rendered source playback clock', () => {
  it('starts a freshly selected preview at zero and clamps the last frame', () => {
    const fps = { num: 30000, den: 1001 };
    expect(
      playbackPosition({
        state: { plan, frame: 0, playing: true },
        clock: { frame: 0, time: 5000 },
        now: 5000,
        fps,
      }).frame,
    ).toBe(0);
    expect(
      playbackPosition({
        state: { plan, frame: 0, playing: true },
        clock: { frame: 0, time: 5000 },
        now: 6001,
        fps,
      }).frame,
    ).toBe(30);
    expect(
      playbackPosition({
        state: { plan, frame: 0, playing: true },
        clock: { frame: 0, time: 0 },
        now: 10000,
        fps,
      }),
    ).toEqual({ frame: 149, ended: true });
  });
});

describe('preset tuning carries from preview to the timeline', () => {
  it('retains changes made while sample media is loading', async () => {
    let resolve!: (value: RenderPlan) => void;
    vi.mocked(call).mockReturnValue(
      new Promise<RenderPlan>((done) => {
        resolve = done;
      }),
    );
    const { ctx, current } = context();
    const pending = previewFilter(ctx, filterPresets[1]);
    updatePresetTuning(ctx, 'filterStrength', 0.35);
    const sample = context(true).ctx.render!;
    resolve(sample);
    await pending;
    expect(current()).toMatchObject({
      strength: 0.35,
      plan: { clips: [{ clip: { props: { filterStrength: 0.35 } } }] },
    });
    expect(ctx.edit).not.toHaveBeenCalled();
  });
  it('applies the chosen strength and keeps the other family intact', async () => {
    const { ctx, current } = context(true);
    await previewVideoEffect(ctx, videoEffects.find((p) => p.name === 'RGB split')!);
    updatePresetTuning(ctx, 'effectStrength', 0.25);
    expect(current()).toMatchObject({
      plan: { clips: [{ clip: { props: { effectStrength: 0.25, filterStrength: 1 } } }] },
    });
    applyPreviewPreset(ctx);
    expect(ctx.edit).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ effectStrength: 0.25, filterStrength: 1 }),
      }),
    );
  });
  it('retimes transition scenes with half-second holds at rational frame rates', async () => {
    const { ctx } = context(true);
    const sample = ctx.render!;
    sample.clips.push(structuredClone(sample.clips[0]));
    sample.fps = { num: 30000, den: 1001 };
    vi.mocked(call).mockResolvedValue(sample);
    await previewTransition(ctx, 'wipe_right');
    updatePresetTuning(ctx, 'transitionSeconds', 3);
    const tuned = tunePreviewPlan(sample, ctx.source!);
    expect(tuned.duration).toBe(120);
    expect(
      tuned.clips.map((rc) => [rc.clip.start, rc.clip.duration, rc.clip.transition?.frames]),
    ).toEqual([
      [0, 105, undefined],
      [15, 105, 90],
    ]);
    applyPreviewPreset(ctx);
    expect(ctx.edit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'set_transition', frames: 90 }),
    );
  });
  it('shows smooth hover timing with holds and honors reduced motion stills', () => {
    expect([0, 250, 500, 1000, 1500, 2500, 2750, 3000].map((t) => hoverFrame(t, 2, true))).toEqual([
      0, 0, 0, 15, 30, 60, 60, 0,
    ]);
    expect(hoverFrame(1000, 2, false)).toBe(20);
    expect(hoverFrame(1000, 5, false)).toBe(50);
  });
  it('mixes color strength with the unprocessed picture', () => {
    const rgb = [0.2, 0.4, 0.7],
      props = { ...defaults, sepia: 1 };
    expect(gradeColor(rgb, { ...props, filterStrength: 0 })).toEqual(rgb);
    const full = gradeColor(rgb, props),
      partial = gradeColor(rgb, { ...props, filterStrength: 0.6 });
    partial.forEach((value, i) => expect(value).toBeCloseTo(rgb[i] + (full[i] - rgb[i]) * 0.6));
  });
});
