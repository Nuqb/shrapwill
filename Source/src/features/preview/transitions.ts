import { designs, designThreshold, designExpression } from './revealDesigns';
import type { Clip } from '../../types';

export const revealKinds = [
  'wipe_left',
  'wipe_right',
  'wipe_up',
  'wipe_down',
  'iris_open',
  'iris_close',
  'blinds',
  'checker',
  ...designs.map((d) => d.kind),
];
export function revealProgress(c: Clip, frame: number) {
  return c.transition ? Math.max(0, Math.min(1, (frame - c.start) / c.transition.frames)) : 1;
}
export function revealThreshold(kind: string, x: number, y: number) {
  const design = designs.find((d) => d.kind === kind);
  if (design) return designThreshold(design, x, y);
  switch (kind) {
    case 'wipe_left':
      return 1 - x;
    case 'wipe_right':
      return x;
    case 'wipe_up':
      return 1 - y;
    case 'wipe_down':
      return y;
    case 'iris_open':
      return Math.hypot(x - 0.5, y - 0.5) * Math.SQRT2;
    case 'iris_close':
      return 1 - Math.hypot(x - 0.5, y - 0.5) * Math.SQRT2;
    case 'blinds':
      return (y * 8) % 1;
    case 'checker':
      return ((Math.floor(x * 8) + Math.floor(y * 6)) % 2) * 0.5 + ((x * 8) % 1) * 0.5;
    default:
      return 0;
  }
}
// The same normalized, clip-local masks are implemented in render/transitions.rs.
export const revealShader = `
uniform int reveal;
uniform float progress;
uniform vec4 cropRect;
float revealAlpha(vec2 point) {
  if (reveal == 0 || progress >= 1.) return 1.;
  if (progress <= 0.) return 0.;
  vec2 p = (point - cropRect.xy) / cropRect.zw;
  float threshold = 0.;
  if (reveal == 1) threshold = 1. - p.x;
  if (reveal == 2) threshold = p.x;
  if (reveal == 3) threshold = 1. - p.y;
  if (reveal == 4) threshold = p.y;
  if (reveal == 5) threshold = length(p - .5) * sqrt(2.);
  if (reveal == 6) threshold = 1. - length(p - .5) * sqrt(2.);
  if (reveal == 7) threshold = fract(p.y * 8.);
  if (reveal == 8) threshold = mod(floor(p.x * 8.) + floor(p.y * 6.), 2.) * .5 + fract(p.x * 8.) * .5;
  ${designs.map((d, i) => `if (reveal == ${i + 9}) threshold = ${designExpression(d)};`).join('\n')}
  return progress > threshold ? 1. : 0.;
}`;
