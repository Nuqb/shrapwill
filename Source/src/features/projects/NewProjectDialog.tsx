import { overlayMotion } from '../overlays/motion';
import { ChevronRight, X } from 'lucide-react';
import { desktop } from '../../bridge';
import { useEditor } from '../../app/EditorContext';
export function ProjectNameField() {
  const { projectName, setProjectName, create } = useEditor();
  return (
    <label className="form-label">
      Project name
      <input
        autoFocus
        value={projectName}
        maxLength={120}
        onChange={(e) => setProjectName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void create();
        }}
      />
    </label>
  );
}
export function FrameRateField() {
  const { fps, setFps } = useEditor();
  return (
    <label className="form-label">
      Frame rate
      <select value={fps} onChange={(e) => setFps(e.target.value)}>
        {['24/1', '25/1', '30000/1001', '30/1', '50/1', '60000/1001', '60/1'].map((f) => (
          <option key={f} value={f}>
            {(Number(f.split('/')[0]) / Number(f.split('/')[1])).toFixed(2).replace('.00', '')} fps
          </option>
        ))}
      </select>
    </label>
  );
}
export function AspectChoices() {
  const { aspect, setAspect } = useEditor();
  return (
    <div className="aspect-choices">
      {[
        { id: 'landscape', label: '16:9', note: 'Landscape' },
        { id: 'portrait', label: '9:16', note: 'Portrait' },
        { id: 'square', label: '1:1', note: 'Square' },
      ].map((a) => (
        <button
          className={aspect === a.id ? 'selected' : ''}
          key={a.id}
          onClick={() => setAspect(a.id)}
        >
          <span className={`aspect-box ${a.id}`} />
          <strong>{a.label}</strong>
          <span>{a.note}</span>
        </button>
      ))}
    </div>
  );
}
export function NewProjectHeading() {
  const { setNewOpen } = useEditor();
  return (
    <div className="dialog-heading">
      <h2>New project</h2>
      <button aria-label="Close new project dialog" onClick={() => setNewOpen(false)}>
        <X size={18} />
      </button>
    </div>
  );
}
export function NewProjectFooter() {
  const { create, ready } = useEditor();
  return (
    <div className="dialog-footer">
      <span>1080p · SDR</span>
      <button className="primary" onClick={() => void create()} disabled={!ready || !desktop}>
        Create project <ChevronRight size={15} />
      </button>
    </div>
  );
}
export function NewProjectForm() {
  return (
    <div className="dialog new-dialog">
      <NewProjectHeading />
      <ProjectNameField />
      <span className="form-label">Aspect ratio</span>
      <AspectChoices />
      <FrameRateField />
      <NewProjectFooter />
    </div>
  );
}
export function NewProjectDialog() {
  return (
    <div ref={overlayMotion} className="modal-backdrop">
      <NewProjectForm />
    </div>
  );
}
