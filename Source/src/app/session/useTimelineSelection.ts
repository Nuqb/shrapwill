import { isRenderedSource } from '../../types';
import { useCallback } from 'react';
import type { EditorState } from '../state/useEditorState';

export function useTimelineSelection(ctx: EditorState) {
  const { setSource, selectClips, selectTracks } = ctx;
  const timelineSelectClips = useCallback(
    (ids: string[]) => {
      setSource((source) => (isRenderedSource(source) ? null : source));
      selectClips(ids);
    },
    [selectClips],
  );
  const timelineSelectTracks = useCallback(
    (ids: string[]) => {
      setSource((source) => (isRenderedSource(source) ? null : source));
      selectTracks(ids);
    },
    [selectTracks],
  );
  return { timelineSelectClips, timelineSelectTracks };
}
