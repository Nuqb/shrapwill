import { useCallback } from 'react';
import type { EditorState } from '../state/useEditorState';
import type { useEditingCommands } from './useEditingCommands';
type ClipContext = EditorState & ReturnType<typeof useEditingCommands>;
function splitOperation(ctx: ClipContext) {
  const { setPlaying, ref, edit } = ctx;
  const { snap, selected, frame } = ref.current;
  const ids = selected.length
    ? selected
    : snap.project.tracks
        .filter((t) => !t.locked)
        .flatMap((t) =>
          t.clips.filter((c) => frame > c.start && frame < c.start + c.duration).map((c) => c.id),
        );
  setPlaying(false);
  void edit({ type: 'split', ids, frame });
}
function removeOperation(ctx: ClipContext, ripple: boolean) {
  const { setPlaying, ref, edit } = ctx;
  setPlaying(false);
  const { selectedTracks, selected } = ref.current;
  void edit(
    selectedTracks.length
      ? { type: 'delete_tracks', ids: selectedTracks }
      : { type: 'delete', ids: selected, ripple },
  );
}
function detachOperation(ctx: ClipContext) {
  const { ref, edit } = ctx;
  if (ref.current.selected[0]) void edit({ type: 'detach_audio', id: ref.current.selected[0] });
}
export function useClipCommands(ctx: ClipContext) {
  const { edit } = ctx;
  const split = useCallback(() => splitOperation(ctx), [edit]);
  const remove = useCallback((ripple: boolean) => removeOperation(ctx, ripple), [edit]);
  const detach = useCallback(() => detachOperation(ctx), [edit]);
  return { split, remove, detach };
}
