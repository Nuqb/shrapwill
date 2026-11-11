import { describe, expect, it } from 'vitest';
import { defaults, type RenderClip, type RenderPlan } from '../../types';
import { audioDefaults } from '../audio/settings';
import { duckGain } from './audioDucking';

function clip(id: string, start: number, ducking = false): RenderClip {
  return {
    kind: 'audio',
    trackId: 'audio',
    source: '',
    width: 0,
    height: 0,
    audible: true,
    previewReady: true,
    clip: {
      id,
      mediaId: 'media',
      name: id,
      start,
      duration: 60,
      sourceIn: 0,
      link: null,
      audioEnabled: true,
      title: null,
      transition: null,
      props: { ...defaults, audio: { ...audioDefaults, ducking } },
    },
  };
}
function plan(clips: RenderClip[]): RenderPlan {
  return { width: 64, height: 64, fps: { num: 30, den: 1 }, duration: 150, clips };
}
describe('foreground ducking', () => {
  it('uses smooth attack/release and exact reduction without multiplying overlaps', () => {
    const music = clip('music', 0);
    music.clip.duration = 150;
    const voice = clip('voice', 30);
    const other = clip('other-voice', 30, true);
    voice.clip.props.audio!.ducking = true;
    const p = plan([music, voice, other]);
    expect(duckGain(p, music, 0)).toBe(1);
    expect(duckGain(p, music, 30)).toBe(1);
    expect(duckGain(p, music, 31)).toBeGreaterThan(10 ** (-12 / 20));
    expect(duckGain(p, music, 45)).toBeCloseTo(10 ** (-12 / 20));
    expect(duckGain(p, music, 89)).toBeGreaterThan(10 ** (-12 / 20));
    expect(duckGain(p, music, 90)).toBe(1);
    expect(duckGain(p, voice, 45)).toBe(1);
  });
  it('ignores muted foregrounds, linked clips, and clips that do not overlap', () => {
    const music = clip('music', 0);
    const voice = clip('voice', 0, true);
    const p = plan([music, voice]);
    voice.audible = false;
    expect(duckGain(p, music, 30)).toBe(1);
    voice.audible = true;
    voice.clip.link = music.clip.link = 'linked';
    expect(duckGain(p, music, 30)).toBe(1);
    voice.clip.link = null;
    voice.clip.start = 60;
    expect(duckGain(p, music, 65)).toBe(1);
  });
  it('shifts the ducking start time without changing its fade shape', () => {
    const music = clip('music', 0);
    music.clip.duration = 150;
    const voice = clip('voice', 30, true);
    const p = plan([music, voice]);
    const original = duckGain(p, music, 45);
    voice.clip.props.audio!.duckFadePosition = 1;
    expect(duckGain(p, music, 45)).toBe(1);
    expect(duckGain(p, music, 75)).toBeCloseTo(original);
    expect(duckGain(p, music, 120)).toBe(1);
  });
});
