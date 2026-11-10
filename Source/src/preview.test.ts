import { describe, it, expect } from 'vitest';
import { makeLut, opacityAt } from './Preview';
import { defaults, timecode, seconds, type Clip } from './types';
const clip = (): Clip => ({
  id: 'c',
  name: 'Picture',
  mediaId: 'm',
  start: 30,
  duration: 90,
  sourceIn: 0,
  link: null,
  audioEnabled: false,
  props: { ...defaults },
  title: null,
  transition: null,
});
describe('preview and export semantics', () => {
  it('keeps the identity LUT and red-fastest cube order', () => {
    const lut = makeLut(clip());
    expect([...lut.slice(0, 3)]).toEqual([0, 0, 0]);
    expect([...lut.slice(3, 6)]).toEqual([16, 0, 0]);
    expect([...lut.slice(-3)]).toEqual([255, 255, 255]);
  });
  it('desaturates with the same Rec. 709 coefficients as the Rust LUT', () => {
    const c = clip();
    c.props.saturation = 0;
    const lut = makeLut(c);
    expect([...lut.slice(16 * 3, 16 * 3 + 3)]).toEqual([54, 54, 54]);
  });
  it('uses incoming alpha for a dissolve and two envelopes for a fade', () => {
    const c = clip();
    c.transition = { kind: 'dissolve', frames: 15 };
    expect(opacityAt(c, 30)).toBe(0);
    expect(opacityAt(c, 37.5)).toBe(0.5);
    expect(opacityAt(c, 60)).toBe(1);
    c.transition.kind = 'fade';
    expect(opacityAt(c, 112.5)).toBe(0.5);
  });
  it('preserves rational timing without floating point accumulation', () => {
    expect(seconds(18000, { num: 30000, den: 1001 })).toBe(600.6);
    expect(timecode(301, { num: 30, den: 1 })).toBe('00:00:10:01');
  });
});
