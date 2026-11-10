import { useEditorState } from './state/useEditorState';
import { useEditorSession } from './session/useEditorSession';
import { useEditorModel } from './useEditorModel';
import { createEditorActions } from './actions';
import { createActionDispatcher } from './commands';
import { useEditorLifecycle } from './lifecycle/useEditorLifecycle';
export function useEditorController() {
  const state = useEditorState();
  const session = useEditorSession(state);
  const model = useEditorModel(state);
  const actions = createEditorActions({ ...state, ...session, ...model });
  const editor = { ...state, ...session, ...model, ...actions };
  const runAction = createActionDispatcher(editor);
  state.dispatch.current = runAction;
  useEditorLifecycle(editor);
  return { ...editor, runAction };
}
