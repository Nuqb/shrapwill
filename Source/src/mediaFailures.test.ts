import { describe, it, expect, vi } from 'vitest';
import { watchMediaEvents, requestMediaFallback } from './features/preview/mediaFailures';
import { defaults, type RenderClip } from './types';

const clip: RenderClip = {
  source: 'original.mp4',
  trackId: 'video',
  kind: 'video',
  width: 640,
  height: 360,
  audible: true,
  previewReady: true,
  clip: {
    id: 'clip',
    mediaId: 'media',
    name: 'Shot',
    start: 0,
    duration: 90,
    sourceIn: 0,
    link: null,
    audioEnabled: true,
    props: defaults,
    title: null,
    transition: null,
  },
};

describe('compatible preview fallback', () => {
  it('requests one conversion for a decoder error and redraws when data is ready', () => {
    const target = new EventTarget() as unknown as HTMLVideoElement;
    const notify = vi.fn();
    watchMediaEvents(target, clip, notify);
    target.dispatchEvent(new Event('loadeddata'));
    expect(notify).toHaveBeenCalledWith();
    target.dispatchEvent(new Event('error'));
    target.dispatchEvent(new Event('error'));
    expect(notify.mock.calls.filter((args) => args[0] === 'media')).toHaveLength(1);
  });
  it('drains failed media so a paused render cannot enqueue conversions every frame', () => {
    const renderer = { failedMedia: new Set(['a', 'b']) },
      request = vi.fn();
    requestMediaFallback(renderer, request);
    requestMediaFallback(renderer, request);
    expect(request).toHaveBeenCalledExactlyOnceWith(['a', 'b'], true);
    expect(renderer.failedMedia.size).toBe(0);
  });
});
