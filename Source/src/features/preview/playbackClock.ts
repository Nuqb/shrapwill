import { type FrameRate } from '../../types';
import type { Props } from './types';

export function playbackPosition({
  state,
  clock,
  now,
  fps,
}: {
  state: Pick<Props, 'frame' | 'playing' | 'plan'>;
  clock: { frame: number; time: number };
  now: number;
  fps: FrameRate;
}) {
  if (!state.playing || !state.plan) return { frame: state.frame, ended: false };
  const frame = Math.floor(clock.frame + ((now - clock.time) * fps.num) / (1000 * fps.den));
  return {
    frame: Math.max(0, Math.min(frame, state.plan.duration - 1)),
    ended: frame >= state.plan.duration,
  };
}
