import presets from '../library/catalog/animation-presets.json';
import type { Clip } from '../../types';
import { effectivePictureSettings } from './pictureSettings';
export const animationPresets = presets;
export function animatedPicture(clip: Clip, frame: number, width: number, height: number) {
  const motion = animationAt(clip, frame);
  const base = effectivePictureSettings(clip.props);
  return {
    motion,
    props: {
      ...base,
      x: base.x + motion.x * width,
      y: base.y + motion.y * height,
      rotation: base.rotation + motion.rotation,
      opacity: base.opacity * motion.opacity,
    },
  };
}
export function animationAt(clip: Clip, frame: number) {
  const result = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 };
  const a = clip.props.animation;
  if (!a) return result;
  const elapsed = frame - clip.start;
  const duration = Math.min(a.frames, clip.duration / 2);
  for (const [id, progress] of [
    [a.keyframe, elapsed / clip.duration],
    [a.inPreset, elapsed / duration],
    [a.outPreset, (elapsed - clip.duration + duration) / duration],
  ] as const) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) continue;
    const t = Math.max(0, Math.min(1, progress));
    for (const [key, points] of Object.entries(preset.curves)) {
      const pair = points.slice(1).findIndex((p) => t <= p[0]);
      const index = pair < 0 ? points.length - 2 : pair;
      const [left, right] = [points[index], points[index + 1]];
      const v =
        left[1] +
        (right[1] - left[1]) *
          Math.max(0, Math.min(1, (t - left[0]) / Math.max(1e-9, right[0] - left[0])));
      if (key === 'Position_x') result.x += v - 0.5;
      if (key === 'Position_y') result.y += v - 0.5;
      if (key === 'Scale_x') result.scaleX *= v / 100;
      if (key === 'Scale_y') result.scaleY *= v / 100;
      if (key === 'Rotation') result.rotation += v;
      if (key === 'Opacity') result.opacity *= v / 100;
    }
  }
  return result;
}
