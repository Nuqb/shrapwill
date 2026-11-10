import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { head } from './constants';

type SeekOptions = {
  scroll: RefObject<HTMLDivElement | null>;
  ppf: number;
  onFrame: (frame: number) => void;
  projectId: string;
};
export function usePlayheadSeek({ scroll, ppf, onFrame, projectId }: SeekOptions) {
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), [projectId]);
  return useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !scroll.current) return;
      event.preventDefault();
      cleanup.current();
      const target = event.currentTarget;
      target.focus({ preventScroll: true });
      const listeners = new AbortController();
      const options = { signal: listeners.signal };
      target.setPointerCapture(event.pointerId);
      const update = (x: number) => {
        const host = scroll.current;
        if (host)
          onFrame(
            Math.max(
              0,
              Math.round((x - host.getBoundingClientRect().left + host.scrollLeft - head) / ppf),
            ),
          );
      };
      const move = (e: PointerEvent) => {
        if (e.pointerId === event.pointerId) update(e.clientX);
      };
      const finish = (ended: Event) => {
        if (ended instanceof PointerEvent && ended.pointerId !== event.pointerId) return;
        cleanup.current();
      };
      cleanup.current = () => {
        listeners.abort();
        cleanup.current = () => {};
        if (target.hasPointerCapture(event.pointerId))
          target.releasePointerCapture(event.pointerId);
      };
      update(event.clientX);
      window.addEventListener('pointermove', move, options);
      window.addEventListener('pointerup', finish, options);
      window.addEventListener('pointercancel', finish, options);
      window.addEventListener('blur', finish, options);
      target.addEventListener('lostpointercapture', finish, options);
      window.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape') cleanup.current();
        },
        options,
      );
    },
    [scroll, ppf, onFrame],
  );
}
