import { overlayMotion } from '../overlays/motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useEditor } from '../../app/EditorContext';
import { fpsOf, durationOf, timecode } from '../../types';
import { useDialogFocus } from '../settings/useDialogFocus';

export function ProjectInfoDialog() {
  const { p, setProjectInfoOpen } = useEditor();
  const dialog = useDialogFocus();
  useEffect(() => () => document.getElementById('menu-view')?.focus(), []);
  const close = () => setProjectInfoOpen(false);
  return (
    <div
      ref={overlayMotion}
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialog}
        className="dialog project-info-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-info-heading"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        <div className="dialog-heading">
          <h2 id="project-info-heading">Project info</h2>
          <button aria-label="Close project info" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <h3 className="project-info-name">{p.name}</h3>
        <dl className="project-info-details">
          <dt>Resolution</dt>
          <dd>
            {p.width} × {p.height}
          </dd>
          <dt>Frame rate</dt>
          <dd>{fpsOf(p.fps).toFixed(2).replace('.00', '')} fps</dd>
          <dt>Duration</dt>
          <dd>{timecode(durationOf(p), p.fps)}</dd>
          <dt>Color space</dt>
          <dd>SDR · Rec. 709</dd>
          <dt>Media files</dt>
          <dd>{p.assets.length}</dd>
          <dt>Tracks</dt>
          <dd>{p.tracks.length}</dd>
        </dl>
        <div className="dialog-footer">
          <button className="primary" onClick={close}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
