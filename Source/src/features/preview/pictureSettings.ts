import type { Properties } from '../../types';
import { defaultGrade } from './grading.ts';
/** Bypass sections without changing their stored adjustments. */
export function effectivePictureSettings<T extends Pick<Properties, 'grade' | 'video'>>(
  value: T,
): T {
  const p = { ...value, grade: { ...defaultGrade(), ...value.grade } } as T & Partial<Properties>;
  const g = p.grade!;
  if (p.video?.transformEnabled === false) {
    p.x = 0;
    p.y = 0;
    p.scale = 1;
    p.rotation = 0;
    p.video = { ...p.video, heightScale: 1, flipHorizontal: false, flipVertical: false };
  }
  if (p.video?.compositingEnabled === false) p.opacity = 1;
  const enabled = (key: string) => g.enabled?.[key] !== false;
  if (!enabled('LUT')) p.originalFilter = '';
  if (!enabled('Color')) {
    p.warmth = 0;
    p.tint = 0;
    p.saturation = 1;
    g.vibrance = 0;
  }
  if (!enabled('Light')) {
    p.brightness = 0;
    p.contrast = 1;
    g.exposure = 0;
    g.highlights = 0;
    g.shadows = 0;
    g.whites = 0;
    g.blacks = 0;
  }
  if (!enabled('Adjust')) {
    g.sharpen = 0;
    p.sepia = 0;
    p.invert = 0;
    p.posterize = 0;
  }
  if (!enabled('Vignette')) {
    p.vignette = 0;
    g.vignetteSettings = defaultGrade().vignetteSettings;
  }
  if (!enabled('HSL')) g.hsl = defaultGrade().hsl;
  if (!enabled('Curves')) g.curves = defaultGrade().curves;
  if (!enabled('Hue/Saturation Curves')) g.secondaryCurves = defaultGrade().secondaryCurves;
  if (!enabled('Color Wheels')) g.wheels = defaultGrade().wheels;
  if (!enabled('HDR Color Wheel')) g.hdrWheels = defaultGrade().hdrWheels;
  return p;
}
