import { usePreviewFullscreen } from './usePreviewFullscreen';
import { isRenderedSource } from '../../types';
import { useAudioActivation } from './useAudioActivation';
import { useEffect, useRef, useState } from 'react';
import type { RenderPlan } from '../../types';
import { playbackPosition } from './playbackClock';
import type { Props } from './types';
import { Compositor } from './Compositor';
import { usePreviewMedia } from './usePreviewMedia';
import { requestMediaFallback } from './mediaFailures';
export function usePreview({
  plan,
  frame,
  onFrame,
  playing,
  onPlaying,
  fps,
  quality,
  onQuality,
  source,
  onClearSource,
  onApplyPreset,
  onNeedMedia,
}: Props) {
  const previewRequest = isRenderedSource(source) ? source.requestId : '';
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<Compositor | null>(null),
    latest = useRef({ plan, frame, playing });
  const [muted, setMuted] = useState(false),
    [error, setError] = useState(''),
    [volume, setVolume] = useState(1),
    [audioLevel, setAudioLevel] = useState(0);
  const container = useRef<HTMLElement>(null);
  useAudioActivation(renderer);
  const fullscreen = usePreviewFullscreen(container);
  const clock = useRef({ frame, time: performance.now() });
  latest.current = { plan, frame, playing };
  useEffect(() => {
    if (!canvas.current) return;
    try {
      renderer.current = new Compositor(canvas.current);
    } catch (e) {
      setError(String(e));
    }
    return () => {
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    clock.current = { frame, time: performance.now() };
    if (playing) renderer.current?.resume();
  }, [playing, previewRequest]);
  useEffect(() => {
    let req = 0,
      lastEmit = 0,
      lastMeter = 0;
    let previous: {
      frame: number;
      plan: RenderPlan | null;
      dirty: number;
      playing: boolean;
    } | null = null;
    const draw = () => {
      const s = latest.current;
      const now = performance.now();
      const { frame: f, ended } = playbackPosition({ state: s, clock: clock.current, now, fps });
      if (ended) onPlaying(false);
      if (s.playing && s.plan && (ended || now - lastEmit > 28)) {
        onFrame(f);
        lastEmit = now;
      }
      const r = renderer.current;
      if (
        s.plan &&
        r &&
        (!previous ||
          previous.frame !== f ||
          previous.plan !== s.plan ||
          previous.dirty !== r.dirty ||
          previous.playing !== s.playing)
      ) {
        r.draw(s.plan, f, { playing: s.playing, muted, volume, quality });
        requestMediaFallback(r, onNeedMedia);
        setError(r.error || '');
        previous = { frame: f, plan: s.plan, dirty: r.dirty, playing: s.playing };
      }
      if (!s.plan) r?.pause();
      if (now - lastMeter > 75) {
        setAudioLevel(s.playing && r ? r.sound.level() : 0);
        lastMeter = now;
      }
      req = requestAnimationFrame(draw);
    };
    req = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(req);
  }, [fps, muted, volume, onFrame, onPlaying, quality, onNeedMedia]);
  useEffect(() => {
    if (!playing) clock.current = { frame, time: performance.now() };
  }, [plan, frame, playing]);
  usePreviewMedia({ plan, frame, source, onNeedMedia });
  const togglePlayback = () => {
    if (!plan?.duration) return;
    if (!playing) {
      renderer.current?.resume();
      if (frame >= plan.duration - 1) onFrame(0);
    }
    onPlaying(!playing);
  };
  const rangeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    event.preventDefault();
    if (!event.repeat) togglePlayback();
  };
  const seek = (n: number) => {
    onPlaying(false);
    onFrame(Math.max(0, Math.min((plan?.duration || 1) - 1, n)));
  };
  return {
    source,
    onClearSource,
    onApplyPreset,
    onNeedMedia,
    quality,
    onQuality,
    canvas,
    container,
    fullscreen,
    volume,
    setVolume,
    audioLevel,
    plan,
    error,
    frame,
    fps,
    seek,
    playing,
    togglePlayback,
    rangeKeyDown,
    onFrame,
    onPlaying,
    muted,
    setMuted,
  };
}
