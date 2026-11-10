import { describe, expect, it } from 'vitest';
import { playbackCandidates } from './features/preview/playbackIndex';
import { defaults, type PlaybackIndex, type RenderPlan } from './types';

function plan(intervals: [number, number][]): RenderPlan {
  const clips = intervals.map(([start, duration], i) => ({
    clip: {
      id: String(i),
      name: String(i),
      mediaId: 'm',
      start,
      duration,
      sourceIn: 0,
      link: null,
      audioEnabled: true,
      props: defaults,
      title: null,
      transition: null,
    },
    trackId: 't',
    kind: 'video' as const,
    source: 'generated.mp4',
    width: 640,
    height: 360,
    audible: true,
    previewReady: true,
  }));
  const order = clips
    .map((_, i) => i)
    .sort((a, b) => clips[a].clip.start - clips[b].clip.start || a - b);
  const index: PlaybackIndex = { order, maxEnds: order.map(() => 0) };
  const fill = (first: number, end: number): number => {
    if (first === end) return -Infinity;
    const mid = first + Math.floor((end - first) / 2),
      clip = clips[order[mid]].clip;
    return (index.maxEnds[mid] = Math.max(
      clip.start + clip.duration,
      fill(first, mid),
      fill(mid + 1, end),
    ));
  };
  fill(0, clips.length);
  return {
    width: 640,
    height: 360,
    duration: 3000,
    fps: { num: 30000, den: 1001 },
    clips,
    playbackIndex: index,
  };
}
function matchesScan(p: RenderPlan, frames: number[]) {
  for (const frame of frames) {
    const indexed = playbackCandidates(p, frame);
    const scanned = playbackCandidates({ ...p, playbackIndex: undefined }, frame);
    if (scanned.active.length > 8) {
      expect(indexed.active.length).toBeGreaterThan(8);
      expect(indexed.upcoming).toEqual([]);
    } else expect(indexed).toEqual(scanned);
  }
}
describe('Rust-prepared playback interval lookup', () => {
  it('preserves half-open boundaries, render order, backwards seeks and fractional timing', () => {
    matchesScan(
      plan([
        [30, 30],
        [0, 30],
        [30, 1],
        [60, 90],
      ]),
      [60, 30, 29.999, 0, 31, 150, 149.999],
    );
  });
  it('preserves preload order rather than choosing the earliest start first', () => {
    matchesScan(
      plan([
        [20, 10],
        [10, 10],
        [5, 10],
        [15, 10],
      ]),
      [0, 4, 5, 10, 20, 30],
    );
  });
  it('handles empty timelines and too many overlapping players', () => {
    matchesScan(plan([]), [0, 100]);
    matchesScan(plan(Array.from({ length: 100 }, () => [0, 100])), [0, 50, 100]);
  });
  it('bounds preload results when thousands of clips begin together', () => {
    matchesScan(plan(Array.from({ length: 10000 }, () => [1, 100])), [0, 0.5, 1, 101]);
  });
  it('matches a scan across generated mixed-duration timelines and seeks', () => {
    const intervals: [number, number][] = Array.from({ length: 500 }, (_, i) => [
      (i * 127) % 2800,
      1 + ((i * 17) % 80),
    ]);
    matchesScan(
      plan(intervals),
      Array.from({ length: 500 }, (_, i) => (i * 97.13) % 3000),
    );
  });
});
