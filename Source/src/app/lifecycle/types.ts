import type { EditorState } from '../state/useEditorState';
import type { EditorSession } from '../session/useEditorSession';
export type LifecycleContext = EditorState & EditorSession;
