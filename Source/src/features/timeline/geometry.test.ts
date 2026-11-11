import { describe, expect, it } from 'vitest';
import { emptySnapshot, defaults, type Clip } from '../../types';
import { timelineBounds, snapPlayhead } from './geometry';

function project() {
  const p = emptySnapshot().project;
  p.tracks[0].clips = [{ id: 'a', start: 0, duration: 2700, props: defaults } as Clip];
  return p;
}
describe('timeline extent and snapping', () => {
  it('fits a 90 second clip with a small bounded tail at either workspace size', () => {
    for (const width of [900, 1600]) {
      const bounds = timelineBounds(project(), width);
      expect(bounds.length).toBeGreaterThan(90);
      expect(bounds.length).toBeLessThan(96);
      expect(bounds.minZoom * 45 * bounds.length).toBeLessThan(width);
    }
  });
  it('reduces the extent after deleting content and keeps empty timelines finite', () => {
    const p = project();
    const old = timelineBounds(p, 900);
    p.tracks[0].clips = [];
    const next = timelineBounds(p, 900);
    expect(next.length).toBeLessThan(old.length);
    expect(Number.isFinite(next.minZoom)).toBe(true);
  });
  it('snaps the playhead to either clip edge within eight screen pixels', () => {
    expect(snapPlayhead(project(), 2696, 1)).toBe(2700);
    expect(snapPlayhead(project(), 2690, 1)).toBe(2690);
    expect(snapPlayhead(project(), 3, 1)).toBe(0);
    expect(snapPlayhead(project(), 2690, 0.5)).toBe(2700);
  });
});
