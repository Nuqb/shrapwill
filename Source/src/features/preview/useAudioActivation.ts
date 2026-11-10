import { useEffect, type RefObject } from 'react';
import type { Compositor } from './Compositor';

// Audio activation happens in the actual trusted input event, rather than a later React effect.
export function useAudioActivation(renderer: RefObject<Compositor | null>) {
  useEffect(() => {
    const activate = () => renderer.current?.resume();
    window.addEventListener('pointerdown', activate);
    window.addEventListener('keydown', activate);
    return () => {
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
    };
  }, [renderer]);
}
