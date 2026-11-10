import { useCallback } from 'react';
import { call, saveProjectPath } from '../../bridge';
import { type Snapshot } from '../../types';
import type { EditorState } from '../state/useEditorState';
import type { useSnapshotUpdate } from './useSnapshotUpdate';
type SaveContext = EditorState & ReturnType<typeof useSnapshotUpdate>;
export function useProjectSave(ctx: SaveContext) {
  const { ref, notify, update } = ctx;
  const save = useCallback(
    async (as = false) => {
      try {
        let path = as ? null : ref.current.snap.path;
        if (!path) path = await saveProjectPath(ref.current.snap.project.name);
        if (!path) return false;
        update(await call<Snapshot>('save', { path }));
        notify('Project saved');
        return true;
      } catch (e) {
        notify(String(e));
        return false;
      }
    },
    [update, notify],
  );
  return { save };
}
