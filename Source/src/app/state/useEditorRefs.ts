import { useRef } from 'react';
import { type ActionId } from '../../shortcuts';
import type { TimelineControls } from '../../Timeline';
import type { BaseEditorState } from './useEditorState';
export function useEditorRefs(state: BaseEditorState) {
  const { snap, selected, selectedTracks, frame, playing } = state;
  const timelineControls = useRef<TimelineControls | null>(null);
  const dispatch = useRef<(id: ActionId) => void>(() => {});
  const projectId = useRef('preview');
  const revision = useRef(0);
  const ref = useRef({ snap, selected, selectedTracks, frame, playing });
  ref.current = { snap, selected, selectedTracks, frame, playing };
  return {
    timelineControls,
    dispatch,
    projectId,
    revision,
    ref,
    keyboardState: useKeyboardState(state),
  };
}
function useKeyboardState(state: BaseEditorState) {
  const { bindings, launcher, newOpen, exportOpen, settingsOpen, leavePrompt, projectInfoOpen } =
    state;
  const keyboardState = useRef({
    bindings,
    launcher,
    newOpen,
    exportOpen,
    settingsOpen,
    projectInfoOpen,
    unsavedOpen: !!leavePrompt,
  });
  keyboardState.current = {
    bindings,
    launcher,
    newOpen,
    exportOpen,
    settingsOpen,
    projectInfoOpen,
    unsavedOpen: !!leavePrompt,
  };
  return keyboardState;
}
