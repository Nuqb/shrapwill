import { useEffect, useState, type RefObject } from 'react';

export function usePreviewFullscreen(container: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === container.current);
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.fullscreenElement !== container.current) return;
      event.preventDefault();
      event.stopPropagation();
      void document.exitFullscreen().catch(() => {});
    };
    document.addEventListener('fullscreenchange', changed);
    window.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('fullscreenchange', changed);
      window.removeEventListener('keydown', escape, true);
    };
  }, [container]);
  return fullscreen;
}
