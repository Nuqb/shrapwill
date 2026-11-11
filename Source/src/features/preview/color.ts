import type { Clip, Properties } from '../../types';
import { effectivePictureSettings } from './pictureSettings.ts';
import { applyGrade } from './grading.ts';
export function opacityAt(c: Clip, frame: number) {
  let a = c.props.opacity;
  const t = c.transition;
  if (t && ['fade', 'dissolve'].includes(t.kind)) {
    a *= Math.min(1, Math.max(0, (frame - c.start) / t.frames));
    if (t.kind === 'fade') a *= Math.min(1, Math.max(0, (c.start + c.duration - frame) / t.frames));
  }
  return a;
}
type ColorProperties = Pick<
  Properties,
  | 'video'
  | 'brightness'
  | 'grade'
  | 'contrast'
  | 'saturation'
  | 'warmth'
  | 'tint'
  | 'sepia'
  | 'invert'
  | 'posterize'
  | 'filterStrength'
>;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function gradeColor(rgb: number[], properties: ColorProperties) {
  return gradeEffective(rgb, effectivePictureSettings(properties));
}
function gradeEffective(rgb: number[], p: ColorProperties) {
  const l = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const base = rgb.map((x) => (l + (x - l) * p.saturation - 0.5) * p.contrast + 0.5 + p.brightness);
  base[0] += (p.warmth || 0) * 0.12;
  base[1] += (p.tint || 0) * 0.12;
  base[2] -= (p.warmth || 0) * 0.12;
  const sepia = [
    base[0] * 0.393 + base[1] * 0.769 + base[2] * 0.189,
    base[0] * 0.349 + base[1] * 0.686 + base[2] * 0.168,
    base[0] * 0.272 + base[1] * 0.534 + base[2] * 0.131,
  ];
  return applyGrade(base, p.grade).map((x, i) => {
    let value = clamp(x + (sepia[i] - x) * (p.sepia || 0));
    value += (1 - 2 * value) * (p.invert || 0);
    if (p.posterize >= 2) value = Math.round(value * (p.posterize - 1)) / (p.posterize - 1);
    return rgb[i] + (clamp(value) - rgb[i]) * (p.filterStrength ?? 1);
  });
}
export function makeLut(c: Clip) {
  const properties = effectivePictureSettings(c.props);
  const out = new Uint8Array(17 * 17 * 17 * 3);
  let n = 0;
  for (let b = 0; b < 17; b++)
    for (let g = 0; g < 17; g++)
      for (let r = 0; r < 17; r++) {
        for (const x of gradeEffective([r / 16, g / 16, b / 16], properties))
          out[n++] = Math.round(x * 255);
      }
  return out;
}
