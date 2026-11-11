import type { RenderClip, RenderPlan } from '../../types';
import { fpsOf } from '../../types';

export function duckGain(plan: RenderPlan, target: RenderClip, frame: number) {
  if (target.clip.props.audio?.ducking) return 1;
  let gain = 1;
  const fps = fpsOf(plan.fps);
  for (const rc of plan.clips) {
    const c = rc.clip;
    const from = c.start + (c.props.audio?.duckFadePosition ?? 0) * fps;
    const to = from + c.duration;
    if (
      !rc.audible ||
      !c.props.audio?.ducking ||
      c.id === target.clip.id ||
      (c.link && c.link === target.clip.link) ||
      from >= target.clip.start + target.clip.duration ||
      to <= target.clip.start
    )
      continue;
    const duration = c.props.audio.duckFadeDuration ?? 0.33;
    const position = c.props.audio.duckFadeSplit ?? 0.24242424242424243;
    const attack = Math.max(0.001, duration * position);
    const release = Math.max(0.001, duration * (1 - position));
    const strength = Math.max(
      0,
      Math.min(1, (frame - from) / fps / attack, (to - frame) / fps / release),
    );
    gain = Math.min(gain, 1 - (1 - 10 ** (-c.props.audio.duckAmount / 20)) * strength);
  }
  return gain;
}
