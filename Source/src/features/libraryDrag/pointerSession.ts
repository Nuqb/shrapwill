import type { LibraryDrag, LibraryItem, DropTarget } from './types';

export function targetAt(item: LibraryItem, x: number, y: number): DropTarget | null {
  const lane = document.elementFromPoint(x, y)?.closest<HTMLElement>('.track-lane');
  const row = lane?.closest<HTMLElement>('.track-row');
  const ppf = Number(lane?.dataset.ppf);
  if (!lane || !row || row.dataset.locked === 'true' || !ppf) return null;
  const audio = row.dataset.kind === 'audio' && (item.kind === 'audio' || item.hasAudio);
  if (!audio && !(row.dataset.kind === 'video' && item.kind === 'video')) return null;
  return {
    trackId: row.dataset.track!,
    frame: Math.max(0, Math.round((x - lane.getBoundingClientRect().left) / ppf)),
    ppf,
  };
}

interface SessionOptions {
  event: React.PointerEvent;
  item: LibraryItem;
  update: (drag: LibraryDrag | null) => void;
  drop: (target: DropTarget) => void;
  moved: () => void;
}

export function startPointerSession({ event, item, update, drop, moved }: SessionOptions) {
  const { clientX: originX, clientY: originY, pointerId } = event;
  const host = event.currentTarget;
  const lifetime = new AbortController();
  const options = { signal: lifetime.signal };
  let dragging = false;
  function move(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (!dragging && Math.hypot(e.clientX - originX, e.clientY - originY) < 6) return;
    host.setPointerCapture(pointerId);
    dragging = true;
    moved();
    e.preventDefault();
    update({ item, x: e.clientX, y: e.clientY, target: targetAt(item, e.clientX, e.clientY) });
  }
  function cleanup() {
    if (host.hasPointerCapture(pointerId)) host.releasePointerCapture(pointerId);
    lifetime.abort();
    update(null);
  }
  function up(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const target = dragging ? targetAt(item, e.clientX, e.clientY) : null;
    cleanup();
    if (target) drop(target);
  }
  function key(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    cleanup();
  }
  window.addEventListener('pointermove', move, { ...options, passive: false });
  window.addEventListener('pointerup', up, options);
  window.addEventListener('pointercancel', cleanup, options);
  window.addEventListener('blur', cleanup, options);
  window.addEventListener('keydown', key, { ...options, capture: true });
  return cleanup;
}
