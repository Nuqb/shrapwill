import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { clampGestureDelta, linkedClipIds, type Gesture } from '../../timelineGesture';
import { fpsOf, type Clip, type Project, type Track } from '../../types';
import type { ContextMenu, Props } from './types';
import { head } from './constants';

type PointerInput = { event: React.PointerEvent; clip: Clip; track: Track; edge: Gesture['edge'] };
type Latest = { project: Project; zoom: number; snap: boolean; frame: number };
export interface GestureContext
  extends Pick<Props, 'project' | 'selected' | 'tool' | 'edit' | 'onSelected' | 'onFrame'> {
  ppf: number;
  latest: MutableRefObject<Latest>;
  committing: MutableRefObject<boolean>;
  cleanupGesture: MutableRefObject<() => void>;
  scroll: RefObject<HTMLDivElement | null>;
  setGesture: Dispatch<SetStateAction<Gesture | null>>;
  setContext: Dispatch<SetStateAction<ContextMenu | null>>;
}

function splitWithRazor(ctx: GestureContext, input: PointerInput) {
  const { event, clip, track } = input;
  if (track.locked || clip.duration < 2) return;
  const lane = event.currentTarget.parentElement!.getBoundingClientRect();
  const at = Math.round((event.clientX - lane.left) / ctx.ppf);
  if (at <= clip.start || at >= clip.start + clip.duration) return;
  const ids = event.shiftKey
    ? ctx.project.tracks
        .filter((t) => !t.locked)
        .flatMap((t) =>
          t.clips.filter((c) => at > c.start && at < c.start + c.duration).map((c) => c.id),
        )
    : [clip.id];
  ctx.onFrame(at);
  ctx.onSelected([clip.id]);
  void ctx.edit({ type: 'split', ids, frame: at });
}

function selectedIds(ctx: GestureContext, input: PointerInput) {
  const { event, clip } = input;
  const selected = ctx.selected;
  if (event.ctrlKey || event.metaKey) {
    return selected.includes(clip.id)
      ? selected.filter((id) => id !== clip.id)
      : [...selected, clip.id];
  }
  return selected.includes(clip.id) ? selected : [clip.id];
}

export function startClipGesture(ctx: GestureContext, input: PointerInput) {
  const { event, clip, track, edge } = input;
  if (event.button !== 0 || ctx.committing.current) return;
  event.preventDefault();
  event.stopPropagation();
  window.getSelection()?.removeAllRanges();
  ctx.setContext(null);
  if (ctx.tool === 'razor') return splitWithRazor(ctx, input);
  const ids = selectedIds(ctx, input);
  ctx.onSelected(ids);
  if (!ids.includes(clip.id) || track.locked) return;
  const ordered = [clip.id, ...ids.filter((id) => id !== clip.id)];
  const affected = linkedClipIds(ctx.project, edge === 'move' ? ordered : [clip.id]);
  if (ctx.project.tracks.some((t) => t.locked && t.clips.some((c) => affected.includes(c.id))))
    return;
  const gesture: Gesture = {
    id: clip.id,
    edge,
    startX: event.clientX,
    delta: 0,
    track: track.id,
    sourceTrack: track.id,
    origin: clip,
    ids: ordered,
  };
  new ClipGestureSession(ctx, { gesture, clip, track, affected }).attach();
}

function snapDelta(
  latest: Latest,
  gesture: Gesture,
  affected: string[],
  input: { pixels: number; delta: number },
) {
  const { pixels } = input;
  let { delta } = input;
  if (!latest.snap) return delta;
  const targets = [
    0,
    latest.frame,
    ...latest.project.tracks.flatMap((t) =>
      t.clips
        .filter((c) => !affected.includes(c.id))
        .flatMap((c) => [c.start, c.start + c.duration]),
    ),
  ];
  const start = gesture.origin.start;
  const end = start + gesture.origin.duration;
  const edges = gesture.edge === 'right' ? [end] : gesture.edge === 'left' ? [start] : [start, end];
  let best = 8 / pixels;
  for (const edge of edges) {
    for (const point of targets) {
      const distance = Math.abs(edge + delta - point);
      if (distance >= best) continue;
      best = distance;
      delta = point - edge;
    }
  }
  return delta;
}

function autoScroll(scroll: HTMLDivElement | null, event: PointerEvent) {
  if (!scroll) return;
  const bounds = scroll.getBoundingClientRect();
  if (event.clientX > bounds.right - 35) scroll.scrollLeft += 16;
  if (event.clientX < bounds.left + head + 25) scroll.scrollLeft -= 16;
  if (event.clientY > bounds.bottom - 25) scroll.scrollTop += 12;
  if (event.clientY < bounds.top + 50) scroll.scrollTop -= 12;
}

type SessionInput = { gesture: Gesture; clip: Clip; track: Track; affected: string[] };
class ClipGestureSession {
  constructor(
    private ctx: GestureContext,
    private input: SessionInput,
  ) {}

  attach() {
    this.ctx.setGesture(this.input.gesture);
    this.ctx.cleanupGesture.current = this.cleanup;
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.cancel);
    window.addEventListener('keydown', this.key, true);
  }

  private cleanup = () => {
    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    window.removeEventListener('pointercancel', this.cancel);
    window.removeEventListener('keydown', this.key, true);
    this.ctx.cleanupGesture.current = () => {};
  };

  private cancel = () => {
    this.cleanup();
    this.ctx.setGesture(null);
  };

  private key = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.cancel();
  };

  private move = (event: PointerEvent) => {
    const { gesture, track, affected } = this.input;
    const latest = this.ctx.latest.current;
    const pixels = (45 * latest.zoom) / fpsOf(latest.project.fps);
    const raw = Math.round((event.clientX - gesture.startX) / pixels);
    const delta = snapDelta(latest, gesture, affected, { pixels, delta: raw });
    gesture.delta = clampGestureDelta(latest.project, gesture, delta);
    if (gesture.edge === 'move') {
      const lane = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-track]');
      if (lane)
        gesture.track =
          lane.dataset.kind === track.kind && lane.dataset.locked !== 'true'
            ? lane.dataset.track!
            : track.id;
    }
    this.ctx.setGesture({ ...gesture });
    autoScroll(this.ctx.scroll.current, event);
  };

  private up = async () => {
    this.cleanup();
    const { gesture, clip, track } = this.input;
    if (!gesture.delta && gesture.track === track.id) return this.ctx.setGesture(null);
    this.ctx.committing.current = true;
    try {
      if (gesture.edge === 'move') {
        await this.ctx.edit({
          type: 'move',
          ids: gesture.ids,
          delta: gesture.delta,
          target_track: gesture.track,
        });
      } else {
        await this.ctx.edit({
          type: 'trim',
          id: clip.id,
          edge: gesture.edge,
          frame:
            (gesture.edge === 'left' ? clip.start : clip.start + clip.duration) + gesture.delta,
        });
      }
    } finally {
      this.ctx.committing.current = false;
      this.ctx.setGesture(null);
    }
  };
}
