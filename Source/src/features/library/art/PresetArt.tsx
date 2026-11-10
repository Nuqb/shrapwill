import { useEffect, useRef } from 'react';
import type { Properties } from '../../../types';
import { paintArt } from './renderer';
import { hoverFrame } from './timing';
type ArtOptions = {
  sampleKey?: string;
  kind?: string;
  settings?: Partial<Properties>;
  active: boolean;
  duration?: number;
};
function animateArt(canvas: HTMLCanvasElement, options: ArtOptions) {
  let request = 0,
    lastFrame = -1,
    pendingFrame: number | null = null,
    offset = 0,
    lastTime = performance.now();
  const started = lastTime,
    duration = options.duration ?? (options.kind ? 2 : 5),
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const draw = (time: number) => {
    if (pendingFrame !== null) offset += time - lastTime;
    lastTime = time;
    const moving = options.active && !reduced.matches;
    const frame = pendingFrame ?? hoverFrame(time - started - offset, duration, moving);
    if (frame !== lastFrame) {
      try {
        if (
          paintArt(canvas, {
            sampleKey: options.sampleKey,
            kind: options.kind,
            props: options.settings,
            frame,
            duration,
            still: !moving,
          })
        ) {
          lastFrame = frame;
          pendingFrame = null;
        } else pendingFrame = frame;
      } catch {
        canvas.dataset.unavailable = 'true';
        pendingFrame = null;
      }
    }
    if (pendingFrame !== null || moving) request = requestAnimationFrame(draw);
  };
  draw(started);
  return () => cancelAnimationFrame(request);
}
export function PresetArt({ kind, settings, active, duration, sampleKey }: ArtOptions) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stop = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      stop();
      if (entry.isIntersecting)
        stop = animateArt(canvas, { kind, settings, active, duration, sampleKey });
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [kind, settings, active, duration, sampleKey]);
  return <canvas ref={ref} width={128} height={72} aria-hidden="true" />;
}
