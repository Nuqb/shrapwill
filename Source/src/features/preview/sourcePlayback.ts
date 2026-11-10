import type { ActionId } from '../../shortcuts';
import { fpsOf, type RenderedPreviewSource } from '../../types';

type RenderedSource = RenderedPreviewSource;

export function sourcePlayback(
  source: RenderedSource,
  action: ActionId,
): RenderedSource | undefined {
  const last = Math.max(0, (source.plan?.duration ?? 1) - 1);
  const second = source.plan ? Math.round(fpsOf(source.plan.fps)) : 1;
  if (action === 'play_pause') {
    return source.plan
      ? {
          ...source,
          playing: !source.playing,
          frame: !source.playing && source.frame >= last ? 0 : source.frame,
        }
      : source;
  }
  if (action === 'stop') return { ...source, playing: false };
  const targets: Partial<Record<ActionId, number>> = {
    previous_frame: source.frame - 1,
    next_frame: source.frame + 1,
    previous_second: source.frame - second,
    next_second: source.frame + second,
    start: 0,
    end: last,
    previous_cut: 0,
    next_cut: last,
  };
  const frame = targets[action];
  return frame === undefined
    ? undefined
    : {
        ...source,
        frame: Math.max(0, Math.min(last, frame)),
        playing: false,
      };
}
