import { useSnapshotState } from './useSnapshotState';
import { useLibraryState } from './useLibraryState';
import { usePlaybackState } from './usePlaybackState';
import { useExportState } from './useExportState';
import { useNewProjectState } from './useNewProjectState';
import { useWorkspaceState } from './useWorkspaceState';
import { useShortcutsState } from './useShortcutsState';
import { useUnsavedState } from './useUnsavedState';
import { useMessagesState } from './useMessagesState';
import { usePreviewResourcesState } from './usePreviewResourcesState';
import { useEditorRefs } from './useEditorRefs';
function useBaseEditorState() {
  return {
    ...useSnapshotState(),
    ...useLibraryState(),
    ...usePlaybackState(),
    ...useExportState(),
    ...useNewProjectState(),
    ...useWorkspaceState(),
    ...useShortcutsState(),
    ...useUnsavedState(),
    ...useMessagesState(),
    ...usePreviewResourcesState(),
  };
}
export type BaseEditorState = ReturnType<typeof useBaseEditorState>;
export function useEditorState() {
  const state = useBaseEditorState();
  return { ...state, ...useEditorRefs(state) };
}
export type EditorState = ReturnType<typeof useEditorState>;
