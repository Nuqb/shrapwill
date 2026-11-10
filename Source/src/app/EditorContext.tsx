import { createContext, useContext } from 'react';
import type { useEditorController } from './useEditorController';
export type EditorController = ReturnType<typeof useEditorController>;
export const EditorContext = createContext<EditorController | null>(null);
export function useEditor() {
  const editor = useContext(EditorContext);
  if (!editor) throw Error('Editor components require EditorContext');
  return editor;
}
