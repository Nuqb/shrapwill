import { describe, it, expect, vi } from 'vitest';
import { previewTitle } from './app/actions/titlePreview';
import { sourcePlayback } from './features/preview/sourcePlayback';
import type { ActionContext } from './app/actions/types';
import { type PreviewSource, type RenderPlan } from './types';

vi.mock('./services/desktop/client', () => ({ call: vi.fn() }));
import { call } from './services/desktop/client';

const plan: RenderPlan = {
  width: 1080,
  height: 1920,
  fps: { num: 30000, den: 1001 },
  duration: 150,
  clips: [],
};
function context() {
  let source: PreviewSource | null = null;
  const ctx = {
    setTitlePreset: vi.fn(),
    setPlaying: vi.fn(),
    notify: vi.fn(),
    setSource: (
      next: PreviewSource | null | ((s: PreviewSource | null) => PreviewSource | null),
    ) => {
      source = typeof next === 'function' ? next(source) : next;
    },
  };
  return { ctx: ctx as unknown as ActionContext, current: () => source };
}
function deferredPlan() {
  let resolve!: (plan: RenderPlan) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<RenderPlan>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
describe('library title preview', () => {
  it('loads a playing source without editing or seeking the timeline', async () => {
    vi.mocked(call).mockResolvedValueOnce(plan);
    const { ctx, current } = context();
    await previewTitle(ctx, 'neon');
    expect(call).toHaveBeenLastCalledWith('preview_title', { style: 'neon' });
    expect(current()).toMatchObject({ kind: 'title', name: 'Neon', frame: 0, playing: true, plan });
    expect(ctx.setPlaying).toHaveBeenCalledWith(false);
  });
});
describe('title preview request cancellation', () => {
  it('still loads if playback controls are used while the preview is preparing', async () => {
    const request = deferredPlan();
    vi.mocked(call).mockReturnValueOnce(request.promise);
    const { ctx, current } = context();
    const pending = previewTitle(ctx, 'neon');
    const source = current();
    if (source?.kind !== 'title') throw Error('Expected preparing title');
    ctx.setSource(sourcePlayback(source, 'next_frame')!);
    request.resolve(plan);
    await pending;
    expect(current()).toMatchObject({ name: 'Neon', plan, playing: true });
  });
});

describe('title preview request cancellation', () => {
  it('keeps the newest selection when responses finish out of order', async () => {
    const first = deferredPlan(),
      second = deferredPlan();
    vi.mocked(call).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { ctx, current } = context();
    const a = previewTitle(ctx, 'neon'),
      b = previewTitle(ctx, 'retro');
    second.resolve(plan);
    await b;
    first.resolve({ ...plan, width: 640 });
    await a;
    expect(current()).toMatchObject({ name: 'Retro', plan });
  });
  it('does not reopen a preview after returning to timeline or inserting a title', async () => {
    const request = deferredPlan();
    vi.mocked(call).mockReturnValueOnce(request.promise);
    const { ctx, current } = context();
    const pending = previewTitle(ctx, 'neon');
    ctx.setSource(null);
    request.resolve(plan);
    await pending;
    expect(current()).toBeNull();
  });
  it('preserves another source when a title request fails', async () => {
    const request = deferredPlan();
    vi.mocked(call).mockReturnValueOnce(request.promise);
    const { ctx, current } = context();
    const pending = previewTitle(ctx, 'neon');
    const media: PreviewSource = {
      kind: 'media',
      mediaKind: 'image',
      name: 'Photo',
      path: 'photo.png',
      mediaId: 'photo',
      requestId: 'photo-preview',
      plan,
      frame: 0,
      playing: false,
    };
    ctx.setSource(media);
    request.reject(Error('Cannot prepare title'));
    await pending;
    expect(current()).toBe(media);
    expect(ctx.notify).toHaveBeenCalledWith('Error: Cannot prepare title');
  });
});
describe('title source playback shortcuts', () => {
  const source: Extract<PreviewSource, { kind: 'title' }> = {
    kind: 'title',
    requestId: 'test-preview',
    name: 'Neon',
    frame: 0,
    playing: true,
    plan,
  };
  it('pauses, steps with rational frame rate, and clamps at both ends', () => {
    expect(sourcePlayback(source, 'play_pause')?.playing).toBe(false);
    expect(sourcePlayback(source, 'previous_frame')?.frame).toBe(0);
    expect(sourcePlayback(source, 'next_second')).toMatchObject({ frame: 30, playing: false });
    expect(sourcePlayback({ ...source, frame: 140 }, 'next_second')?.frame).toBe(149);
  });
  it('replays from the start and leaves editing shortcuts to the editor', () => {
    expect(sourcePlayback({ ...source, frame: 149, playing: false }, 'play_pause')).toMatchObject({
      frame: 0,
      playing: true,
    });
    expect(sourcePlayback(source, 'add_title')).toBeUndefined();
    expect(sourcePlayback({ ...source, plan: null, playing: false }, 'play_pause')?.playing).toBe(
      false,
    );
  });
});
