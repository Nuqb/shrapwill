import { ShortcutContext } from './ShortcutUI';
import { EditorContext } from './app/EditorContext';
import { useEditorController } from './app/useEditorController';
import { EditorShell } from './app/layout/EditorShell';
import { LibraryDragProvider } from './features/libraryDrag/LibraryDragProvider';
export default function App() {
  const editor = useEditorController();
  return (
    <EditorContext.Provider value={editor}>
      <ShortcutContext.Provider value={editor.bindings}>
        <LibraryDragProvider>
          <EditorShell />
        </LibraryDragProvider>
      </ShortcutContext.Provider>
    </EditorContext.Provider>
  );
}
