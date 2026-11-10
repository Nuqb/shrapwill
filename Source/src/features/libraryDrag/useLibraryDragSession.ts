import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../app/EditorContext';
import { startPointerSession } from './pointerSession';
import type { LibraryDrag, LibraryItem } from './types';

export function useLibraryDragSession() {
  const { p, addMedia, addTitle } = useEditor();
  const [drag, setDrag] = useState<LibraryDrag | null>(null);
  const cleanup = useRef<() => void>(() => {});
  const suppressClick = useRef(false);
  useEffect(() => () => cleanup.current(), [p.id]);
  function start(event: React.PointerEvent, item: LibraryItem) {
    if (event.button !== 0) return;
    cleanup.current();
    suppressClick.current = false;
    cleanup.current = startPointerSession({
      event,
      item,
      update: setDrag,
      moved: () => {
        suppressClick.current = true;
      },
      drop: (target) => {
        if (item.type === 'media') void addMedia(item.id, target.trackId, target.frame);
        else void addTitle(item.id, target.frame, target.trackId);
      },
    });
  }
  function captureClick(event: React.MouseEvent) {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }
  return { drag, start, captureClick };
}
