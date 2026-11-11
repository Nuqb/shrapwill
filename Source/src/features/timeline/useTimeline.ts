import { usePlayheadSeek } from './usePlayheadSeek';
import { startClipGesture } from './clipGesture';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { gestureTracks, linkedClipIds, type Gesture } from '../../timelineGesture';
import type { Track, Clip } from '../../types';
import { durationOf, fpsOf } from '../../types';
import type { Props, ContextMenu } from './types';
import { head } from './constants';
import { timelineBounds, snapPlayhead } from './geometry';
export function useTimeline({
  selectedTracks,
  onSelectedTracks,
  onMagneticChange,
  project,
  frame,
  onFrame,
  selected,
  onSelected,
  edit,
  addMedia,
  addTitle,
  split,
  remove,
  detach,
  tool,
  onToolChange,
  snap,
  onSnapChange,
  controls,
}: Props) {
  const scroll = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1),
    [hoverFrame, setHoverFrame] = useState<number | null>(null),
    [scrollX, setScrollX] = useState(0),
    [width, setWidth] = useState(900),
    [gesture, setGesture] = useState<Gesture | null>(null),
    [trackMenu, setTrackMenu] = useState(false);
  const latest = useRef({ project, selected, zoom, snap, frame });
  latest.current = { project, selected, zoom, snap, frame };
  const [context, setContext] = useState<ContextMenu | null>(null);
  const contextHost = useRef<HTMLDivElement>(null),
    cleanupGesture = useRef<() => void>(() => {}),
    committing = useRef(false);
  const visibleTracks = gestureTracks(project, gesture);
  const movingIds = new Set(
    gesture ? linkedClipIds(project, gesture.edge === 'move' ? gesture.ids : [gesture.id]) : [],
  );
  useEffect(() => {
    setContext(null);
    setGesture(null);
    return () => cleanupGesture.current();
  }, [project.id]);
  useEffect(() => {
    if (!context) return;
    contextHost.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (e: PointerEvent) => {
      if (!contextHost.current?.contains(e.target as Node)) setContext(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setContext(null);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const buttons = [
        ...(contextHost.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ||
          []),
      ];
      if (!buttons.length) return;
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? buttons.length - 1
            : (at + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      ].focus();
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', key, true);
    };
  }, [context]);
  function selectTrack(id: string, additive: boolean) {
    onSelectedTracks(
      additive
        ? selectedTracks.includes(id)
          ? selectedTracks.filter((x) => x !== id)
          : [...selectedTracks, id]
        : [id],
    );
  }
  function trackPointerDown(e: React.PointerEvent, t: Track) {
    if (e.button !== 0 || committing.current) return;
    const target = e.target as Element;
    if (target.closest('button,[role="button"],input,select,textarea,a')) return;
    e.preventDefault();
    setContext(null);
    selectTrack(t.id, e.ctrlKey || e.metaKey);
  }
  function trackContext(e: React.MouseEvent, t: Track) {
    e.preventDefault();
    e.stopPropagation();
    const ids = selectedTracks.includes(t.id) ? selectedTracks : [t.id];
    onSelectedTracks(ids);
    setContext({
      kind: 'tracks',
      ids,
      x: Math.min(e.clientX, innerWidth - 265),
      y: Math.min(e.clientY, innerHeight - 255),
    });
  }
  function clipContext(e: React.MouseEvent, c: Clip) {
    e.preventDefault();
    e.stopPropagation();
    const ids = selected.includes(c.id) ? selected : [c.id];
    onSelected(ids);
    setContext({
      kind: 'clips',
      ids,
      x: Math.min(e.clientX, innerWidth - 265),
      y: Math.min(e.clientY, innerHeight - 255),
    });
  }
  const mainTrack = [...project.tracks].reverse().find((t) => t.kind === 'video');
  const fps = fpsOf(project.fps),
    pps = 45 * zoom,
    ppf = pps / fps,
    total = durationOf(project);
  const { length, minZoom, maxZoom } = timelineBounds(project, width);
  const previousExtent = useRef<{ id: string | null; total: number }>({ id: null, total: 0 });
  const timelineWidth = Math.max(width - head - 16, length * pps);
  const totalHeight = Math.max(190, project.tracks.length * 76 + 30);
  useEffect(() => {
    if (!scroll.current) return;
    const r = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    r.observe(scroll.current);
    return () => r.disconnect();
  }, []);
  const changeZoom = (n: number) => setZoom(Math.min(maxZoom, Math.max(minZoom, n)));
  useEffect(() => {
    const previous = previousExtent.current;
    const fitNewContent = previous.id !== project.id || (previous.total === 0 && total > 0);
    previousExtent.current = { id: project.id, total };
    setZoom((value) => (fitNewContent ? minZoom : Math.min(maxZoom, Math.max(minZoom, value))));
    const host = scroll.current;
    if (host) {
      host.scrollLeft = Math.min(host.scrollLeft, Math.max(0, timelineWidth + head - width));
      setScrollX(host.scrollLeft);
    }
  }, [minZoom, maxZoom, timelineWidth, width, project.id, total]);
  useImperativeHandle(
    controls,
    () => ({
      zoomIn: () => changeZoom(zoom * 1.3),
      zoomOut: () => changeZoom(zoom / 1.3),
      fit: () => changeZoom(minZoom),
      trackMenu: () => setTrackMenu((v) => !v),
    }),
    [zoom, width, total, fps],
  );
  function start(e: React.PointerEvent, c: Clip, t: Track, edge: Gesture['edge']) {
    startClipGesture(
      {
        project,
        selected,
        tool,
        edit,
        onSelected,
        onFrame,
        ppf,
        latest,
        committing,
        cleanupGesture,
        scroll,
        setGesture,
        setContext,
      },
      { event: e, clip: c, track: t, edge },
    );
  }
  const seek = usePlayheadSeek({
    scroll,
    ppf,
    onFrame,
    projectId: project.id,
    resolveFrame: (n) => Math.min(total, snap ? snapPlayhead(project, n, ppf) : n),
  });
  const interval = pps > 140 ? 1 : pps > 55 ? 2 : pps > 24 ? 5 : pps > 10 ? 10 : 30;
  const firstTick = Math.floor(Math.max(0, scrollX - head) / pps / interval);
  const lastTick = Math.min(
    Math.floor(length / interval),
    Math.ceil((scrollX + width) / pps / interval),
  );
  return {
    selected,
    width,
    start,
    clipContext,
    onSelected,
    fps,
    ppf,
    tool,
    project,
    movingIds,
    selectedTracks,
    selectTrack,
    mainTrack,
    edit,
    timelineWidth,
    setHoverFrame,
    scrollX,
    total,
    gesture,
    trackPointerDown,
    trackContext,
    scroll,
    addMedia,
    addTitle,
    setTrackMenu,
    trackMenu,
    changeZoom,
    zoom,
    minZoom,
    maxZoom,
    onToolChange,
    split,
    remove,
    length,
    detach,
    snap,
    onSnapChange,
    onMagneticChange,
    seek,
    frame,
    lastTick,
    firstTick,
    interval,
    pps,
    contextHost,
    context,
    setContext,
    setScrollX,
    totalHeight,
    visibleTracks,
    hoverFrame,
  };
}
