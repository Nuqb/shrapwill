import type { EditorState } from '../state/useEditorState';
import type { EditorSession } from '../session/useEditorSession';
import type { EditorModel } from '../useEditorModel';
export type ActionContext = EditorState & EditorSession & EditorModel;
