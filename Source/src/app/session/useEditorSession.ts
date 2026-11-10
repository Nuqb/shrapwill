import type { EditorState } from '../state/useEditorState';
import { useSnapshotUpdate } from './useSnapshotUpdate';
import { useProjectSave } from './useProjectSave';
import { useEditingCommands } from './useEditingCommands';
import { useUnsavedChanges } from './useUnsavedChanges';
import { useProjectFiles } from './useProjectFiles';
import { useImportFiles } from './useImportFiles';
import { useClipCommands } from './useClipCommands';
import { usePlaybackCommands } from './usePlaybackCommands';
import { usePreviewPreparation } from './usePreviewPreparation';
import { useTimelineSelection } from './useTimelineSelection';
export function useEditorSession(state: EditorState) {
  const update = useSnapshotUpdate(state);
  const editing = useEditingCommands({ ...state, ...update });
  const save = useProjectSave({ ...state, ...update });
  const unsaved = useUnsavedChanges({ ...state, ...save });
  const files = useProjectFiles({ ...state, ...update, ...unsaved });
  return {
    ...update,
    ...editing,
    ...save,
    ...unsaved,
    ...files,
    ...useImportFiles(state),
    ...useClipCommands({ ...state, ...editing }),
    ...usePlaybackCommands(state),
    ...useTimelineSelection(state),
    ...usePreviewPreparation(state),
  };
}
export type EditorSession = ReturnType<typeof useEditorSession>;
