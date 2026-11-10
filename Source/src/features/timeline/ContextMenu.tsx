import { linkedClipIds } from '../../timelineGesture';
import { Trash2 } from 'lucide-react';
import { ShortcutHint } from '../../ShortcutUI';
import { useTimeline } from './context';

export function ContextMenuContent() {
  const { contextHost, context, project, edit, setContext } = useTimeline();
  if (!context) return null;

  return (
    <div
      ref={contextHost}
      className="timeline-context-menu"
      role="menu"
      aria-label={context.kind === 'tracks' ? 'Track actions' : 'Clip actions'}
      style={{ left: Math.max(8, context.x), top: Math.max(8, context.y) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="context-heading">
        {context.ids.length} {context.kind === 'tracks' ? 'track' : 'clip'}
        {context.ids.length === 1 ? '' : 's'} selected
      </span>
      <button
        role="menuitem"
        disabled={project.tracks.some(
          (t) =>
            t.locked &&
            (context.kind === 'tracks'
              ? context.ids.includes(t.id)
              : t.clips.some((c) => linkedClipIds(project, context.ids).includes(c.id))),
        )}
        onClick={() => {
          void edit(
            context.kind === 'tracks'
              ? { type: 'delete_tracks', ids: context.ids }
              : { type: 'delete', ids: context.ids, ripple: false },
          );
          setContext(null);
        }}
      >
        <Trash2 size={14} />
        {context.kind === 'tracks' ? 'Delete selected tracks' : 'Delete selected clips'}
        <ShortcutHint action="delete" />
      </button>
      {context.kind === 'tracks' ? (
        <p>Removes these tracks and their clips. Undo restores them.</p>
      ) : (
        <button
          role="menuitem"
          disabled={project.tracks.some(
            (t) =>
              t.locked && t.clips.some((c) => linkedClipIds(project, context.ids).includes(c.id)),
          )}
          onClick={() => {
            void edit({ type: 'delete', ids: context.ids, ripple: true });
            setContext(null);
          }}
        >
          Ripple delete
          <ShortcutHint action="ripple_delete" />
        </button>
      )}
      {project.tracks.some(
        (t) => t.locked && context.kind === 'tracks' && context.ids.includes(t.id),
      ) && <p>Unlock selected tracks to delete them.</p>}
    </div>
  );
}
