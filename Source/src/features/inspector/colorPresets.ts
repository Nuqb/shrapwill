import sources from '../library/catalog/color-source.json';
import { defaultGrade } from '../preview/grading';
import { neutralColor } from '../library/presets';
import type { Properties } from '../../types';
export const colorPresetNames = sources.map((p) => p.name);
export function applyColorPreset(value: Properties, index: number): Properties {
  const source = sources[index];
  if (!source) return value;
  const values = source.values as Record<string, unknown>;
  const read = (key: string) => Number(values[key] || 0);
  const signed = (key: string) => Math.min(1, Math.max(-1, read(key) / 100));
  const grade = defaultGrade();
  grade.exposure = Math.min(4, Math.max(-4, read('u_exposure') / 25));
  grade.vibrance = signed('u_vibrance');
  grade.highlights = signed('u_highLight');
  grade.shadows = signed('u_shadow');
  grade.whites = signed('u_whiteLevel');
  grade.blacks = signed('u_blackLevel');
  grade.hsl = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'].map(
    (color) => [
      signed(`${color}_hueVal`),
      signed(`${color}_satVal`),
      signed(`${color}_brightnessVal`),
    ],
  );
  return {
    ...value,
    ...neutralColor,
    grade,
    brightness: signed('u_brightness'),
    contrast: 1 + signed('u_contrast'),
    saturation: 1 + signed('u_saturation'),
    warmth: signed('u_temperature'),
    tint: signed('u_tint'),
    vignette: Math.max(0, Math.min(1, Math.abs(read('amount')) / 100)),
  };
}
