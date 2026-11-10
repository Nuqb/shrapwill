import { isRenderedSource } from '../../types';
import { useCallback } from 'react';
import type { EditorState } from '../state/useEditorState';
export function usePlaybackCommands(ctx: EditorState) {
  const { setFrame, setPlaying, setSource, source } = ctx;
  const seek = useCallback((n: number) => {
    setPlaying(false);
    setFrame(Math.max(0, n));
    setSource(null);
  }, []);
  const renderedPreview = isRenderedSource(source);
  const playbackFrame = useCallback(
    (n: number) => {
      if (renderedPreview) {
        setSource((s) => (isRenderedSource(s) ? { ...s, frame: n } : s));
      } else setFrame(n);
    },
    [renderedPreview],
  );
  const playbackPlaying = useCallback(
    (v: boolean) => {
      if (renderedPreview) {
        setSource((s) => (isRenderedSource(s) ? { ...s, playing: v } : s));
        return;
      }
      setSource(null);
      setPlaying(v);
    },
    [renderedPreview],
  );
  return { seek, playbackFrame, playbackPlaying };
}
