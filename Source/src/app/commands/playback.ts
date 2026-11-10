import { fpsOf, durationOf } from '../../types';
import type { CommandContext, CommandHandlers } from './types';
export const playbackHandlers = {
  play_pause: (ctx: CommandContext) => {
    const { frame, setFrame, playing, setPlaying, setSource, p } = ctx;
    if (durationOf(p)) {
      setSource(null);
      if (!playing && frame >= durationOf(p) - 1) setFrame(0);
      setPlaying((v) => !v);
    }
  },
  stop: (ctx: CommandContext) => {
    const { setPlaying } = ctx;
    setPlaying(false);
  },
  previous_frame: (ctx: CommandContext) => {
    const { frame, seek } = ctx;
    seek(Math.max(0, frame - 1));
  },
  next_frame: (ctx: CommandContext) => {
    const { frame, p, seek } = ctx;
    seek(Math.min(Math.max(0, durationOf(p) - 1), frame + 1));
  },
  previous_second: (ctx: CommandContext) => {
    const { frame, p, seek } = ctx;
    seek(Math.max(0, frame - Math.round(fpsOf(p.fps))));
  },
  next_second: (ctx: CommandContext) => {
    const { frame, p, seek } = ctx;
    seek(Math.min(Math.max(0, durationOf(p) - 1), frame + Math.round(fpsOf(p.fps))));
  },
  start: (ctx: CommandContext) => {
    const { seek } = ctx;
    seek(0);
  },
  end: (ctx: CommandContext) => {
    const { p, seek } = ctx;
    seek(Math.max(0, durationOf(p) - 1));
  },
  previous_cut: (ctx: CommandContext) => seekCut(ctx, 'previous'),
  next_cut: (ctx: CommandContext) => seekCut(ctx, 'next'),
} satisfies CommandHandlers;

function seekCut(ctx: CommandContext, direction: 'previous' | 'next') {
  const { frame, p, seek } = ctx;
  const edges = [
    0,
    ...p.tracks.flatMap((t) => t.clips.flatMap((c) => [c.start, c.start + c.duration])),
  ].sort((a, b) => a - b);
  const point =
    direction === 'previous' ? edges.filter((n) => n < frame).at(-1) : edges.find((n) => n > frame);
  if (point !== undefined) seek(Math.min(Math.max(0, durationOf(p) - 1), point));
}
