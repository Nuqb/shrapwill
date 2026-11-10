import { describe, it, expect } from 'vitest';
import { createMediaSource, refreshMediaSource } from './features/preview/mediaSource';
import { sourcePlayback } from './features/preview/sourcePlayback';
import { defaults, type MediaAsset } from './types';
const asset: MediaAsset = {
  id: 'portrait',
  name: 'Portrait.mp4',
  path: 'portrait.mp4',
  previewPath: null,
  thumbnailPath: null,
  kind: 'video',
  duration: 2.5,
  width: 1080,
  height: 1920,
  hasAudio: true,
  waveform: [],
  missing: false,
};
const fps = { num: 30000, den: 1001 };
describe('shared media source previews', () => {
  it('uses source dimensions and audible neutral settings without changing the asset', () => {
    const before = structuredClone(asset);
    const source = createMediaSource(asset, fps);
    expect(source.plan).toMatchObject({ width: 1080, height: 1920, fps, duration: 75 });
    expect(source.plan.clips[0]).toMatchObject({
      audible: true,
      previewReady: true,
      kind: 'video',
      source: asset.path,
      clip: { audioEnabled: true, sourceIn: 0, start: 0, props: defaults },
    });
    expect(source.plan.clips[0].clip.props).not.toBe(defaults);
    expect(asset).toEqual(before);
  });
  it('preserves the frame, pause state, and request when compatible media arrives', () => {
    const source = { ...createMediaSource(asset, fps), frame: 43, playing: false };
    const next = refreshMediaSource(source, { ...asset, previewPath: 'compatible.mp4' });
    expect(next).toMatchObject({
      frame: 43,
      playing: false,
      requestId: source.requestId,
      path: 'compatible.mp4',
    });
    expect(next.plan.clips[0].source).toBe('compatible.mp4');
    expect(source.plan.clips[0].source).toBe(asset.path);
    expect(refreshMediaSource(next, { ...asset, previewPath: 'compatible.mp4' })).toBe(next);
  });
  it('routes source transport shortcuts through the isolated preview state', () => {
    const source = createMediaSource(asset, fps);
    expect(sourcePlayback(source, 'end')).toMatchObject({ frame: 74, playing: false });
    expect(sourcePlayback({ ...source, frame: 74, playing: false }, 'play_pause')).toMatchObject({
      frame: 0,
      playing: true,
    });
    expect(source.frame).toBe(0);
  });
  it('distinguishes images and audio without introducing browser controls', () => {
    const image = createMediaSource({ ...asset, kind: 'image', hasAudio: false }, fps);
    expect(image.playing).toBe(false);
    expect(image.plan.clips[0].audible).toBe(false);
    const audio = createMediaSource({ ...asset, kind: 'audio', width: 0, height: 0 }, fps);
    expect(audio.plan.clips[0].kind).toBe('audio');
    expect(audio.plan.clips[0].audible).toBe(true);
    expect(audio.playing).toBe(true);
  });
});
