import { describe, expect, it } from 'vitest';
import { applyGrade, defaultGrade } from './grading';
describe('color grading', () => {
  it('keeps neutral grades exact', () =>
    expect(applyGrade([0.1, 0.5, 0.9], defaultGrade())).toEqual([0.1, 0.5, 0.9]));
  it('adds one exposure stop and applies channel curves', () => {
    const g = defaultGrade();
    g.exposure = 1;
    expect(applyGrade([0.1, 0.2, 0.3], g)).toEqual([0.2, 0.4, 0.6]);
    g.curves[1] = [0, 0, 0, 0, 0];
    expect(applyGrade([0.1, 0.2, 0.3], g)[0]).toBe(0);
  });
  it('changes red HSL without affecting cyan', () => {
    const g = defaultGrade();
    g.hsl[0][1] = -1;
    expect(applyGrade([1, 0, 0], g)[0]).toBeLessThan(1);
    expect(applyGrade([0, 1, 1], g)).toEqual([0, 1, 1]);
  });
});
