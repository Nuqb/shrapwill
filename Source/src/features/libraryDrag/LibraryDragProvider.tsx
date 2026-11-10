import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLibraryDragSession } from './useLibraryDragSession';

const Context = createContext<ReturnType<typeof useLibraryDragSession> | null>(null);
export function useLibraryDrag() {
  const value = useContext(Context);
  if (!value) throw Error('Library dragging requires its provider');
  return value;
}
export function LibraryDragProvider({ children }: { children: ReactNode }) {
  const session = useLibraryDragSession();
  const { drag } = session;
  return (
    <Context.Provider value={session}>
      {children}
      {drag &&
        createPortal(
          <div
            className={`library-drag-ghost ${drag.target ? 'can-drop' : ''}`}
            style={{ left: drag.x + 14, top: drag.y + 14 }}
          >
            {drag.target ? '+ ' : ''}
            {drag.item.name}
          </div>,
          document.body,
        )}
    </Context.Provider>
  );
}
