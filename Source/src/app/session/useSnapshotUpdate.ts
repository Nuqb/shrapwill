import { useCallback, useRef } from 'react';
import { type Snapshot } from '../../types';
import type { EditorState } from '../state/useEditorState';
export function useSnapshotUpdate(ctx: EditorState) {
  const lastSequence = useRef(-1);
  const {
    setSnap,
    setSelected,
    setFrame,
    setPlaying,
    setSource,
    setSelectedTracks,
    projectId,
    revision,
  } = ctx;
  const update = useCallback((s: Snapshot) => {
    if (s.sequence !== undefined) {
      if (s.sequence <= lastSequence.current) return;
      lastSequence.current = s.sequence;
    }
    if (s.revision < revision.current) return;
    if (projectId.current !== s.project.id) {
      projectId.current = s.project.id;
      setSelectedTracks([]);
      setFrame(0);
      setPlaying(false);
      setSelected([]);
      setSource(null);
    }
    revision.current = s.revision;
    setSnap(s);
    setSelectedTracks((ids) => ids.filter((id) => s.project.tracks.some((t) => t.id === id)));
    setSelected((ids) =>
      ids.filter((id) => s.project.tracks.some((t) => t.clips.some((c) => c.id === id))),
    );
  }, []);
  return { update };
}
