import { useTimeline } from './context';
import { useLibraryDrag } from '../libraryDrag/LibraryDragProvider';

export function IncomingLibraryClip({ trackId }: { trackId: string }) {
  const { ppf, fps } = useTimeline();
  const { drag } = useLibraryDrag();
  if (!drag?.target || drag.target.trackId !== trackId) return null;
  return (
    <div
      className="library-drop-preview"
      style={{
        left: drag.target.frame * ppf,
        width: Math.max(40, drag.item.duration * fps * ppf),
      }}
    >
      {drag.item.name}
    </div>
  );
}
