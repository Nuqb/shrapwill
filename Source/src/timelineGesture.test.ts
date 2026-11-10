import { describe, it, expect } from 'vitest';
import { defaults, emptySnapshot, type Clip } from './types';
import { clampGestureDelta, gestureTracks, linkedClipIds, type Gesture } from './timelineGesture';
function fixture() {
  const p = emptySnapshot().project;
  const make = (id: string, start: number, link: string | null): Clip => ({
    id,
    name: id,
    start,
    duration: 60,
    sourceIn: 1,
    link,
    mediaId: null,
    audioEnabled: false,
    props: { ...defaults },
    title: { text: id, style: 'plain', fontSize: 60, color: '#ffffff', imagePath: null },
    transition: null,
  });
  p.tracks[0].clips = [make('a', 30, 'pair'), make('b', 120, null)];
  p.tracks[1].clips = [make('audio', 15, 'pair')];
  p.tracks.unshift({ ...p.tracks[0], id: 'upper', name: 'Video 2', clips: [] });
  return p;
}
function move(): Gesture {
  const p = fixture();
  return {
    id: 'a',
    edge: 'move',
    startX: 0,
    delta: 20,
    track: 'upper',
    sourceTrack: 'v1',
    origin: p.tracks[1].clips[0],
    ids: ['a'],
  };
}
describe('live timeline gestures', () => {
  it('does not apply the local delta a second time when the committed project arrives', () => {
    const p = fixture(),
      g = move();
    const committed = { ...p, tracks: gestureTracks(p, g) };
    expect(gestureTracks(committed, g)).toBe(committed.tracks);
  });
  it('shows the clip in the destination lane before committing without mutating the project', () => {
    const p = fixture(),
      g = move(),
      view = gestureTracks(p, g);
    expect(view[0].clips[0].id).toBe('a');
    expect(view[0].clips[0].start).toBe(50);
    expect(view[1].clips.map((c) => c.id)).toEqual(['b']);
    expect(p.tracks[0].clips).toEqual([]);
    expect(p.tracks[1].clips[0].start).toBe(30);
  });
  it('keeps linked audio on its own lane while moving its timing with the video', () => {
    const view = gestureTracks(fixture(), move());
    expect(view[2].clips[0].id).toBe('audio');
    expect(view[2].clips[0].start).toBe(35);
    expect(linkedClipIds(fixture(), ['a'])).toEqual(['a', 'audio']);
  });
  it('clamps the whole linked group at frame zero', () => {
    const p = fixture(),
      g = move();
    g.delta = -100;
    expect(clampGestureDelta(p, g, g.delta)).toBe(-15);
    const view = gestureTracks(p, g);
    expect(view[0].clips[0].start).toBe(15);
    expect(view[2].clips[0].start).toBe(0);
  });
  it('transfers selected clips from the grabbed lane while retaining other selected lanes', () => {
    const p = fixture(),
      g = move();
    g.ids = ['b', 'a', 'audio'];
    g.id = 'b';
    g.origin = p.tracks[1].clips[1];
    const view = gestureTracks(p, g);
    expect(view[0].clips.map((c) => c.id)).toEqual(['a', 'b']);
    expect(view[2].clips.map((c) => c.id)).toEqual(['audio']);
  });
  it('does not preview a vertical drop into a locked or incompatible lane', () => {
    const p = fixture(),
      g = move();
    p.tracks[0].locked = true;
    expect(gestureTracks(p, g)[1].clips.length).toBe(2);
    p.tracks[0].locked = false;
    g.track = 'a1';
    expect(gestureTracks(p, g)[1].clips.length).toBe(2);
  });
  it('previews linked trims with source timing and at least one remaining frame', () => {
    const p = fixture(),
      g = move();
    g.edge = 'left';
    g.delta = 100;
    expect(clampGestureDelta(p, g, 100)).toBe(59);
    const view = gestureTracks(p, g);
    expect(view[1].clips[0].duration).toBe(1);
    expect(view[2].clips[0].duration).toBe(1);
    expect(view[1].clips[0].sourceIn).toBeCloseTo(1 + 59 / 30);
    expect(gestureTracks(p, null)).toBe(p.tracks);
  });
});
