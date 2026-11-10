import { X, LoaderCircle, MonitorPlay, AlertCircle } from 'lucide-react';
import { type Job } from '../../types';
import { useEditor } from '../EditorContext';
export function MissingMediaNotice() {
  const { missing, relink } = useEditor();
  return (
    <div className="missing-notice">
      <AlertCircle size={15} />
      <span>
        {missing.length} missing media file{missing.length > 1 ? 's' : ''}
      </span>
      <button onClick={() => void relink(missing[0].id)}>Relink {missing[0].name}</button>
    </div>
  );
}
export function BackgroundJob({ j }: { j: Job }) {
  const { cancelJob } = useEditor();
  return (
    <div className="job" key={j.id}>
      <LoaderCircle className="spinning" size={15} />
      <div>
        <span>{j.label}</span>
        <div className="progress-bar">
          <i style={{ width: `${Math.round(j.progress * 100)}%` }} />
        </div>
      </div>
      <span>{Math.round(j.progress * 100)}%</span>
      <button title="Cancel operation" onClick={() => cancelJob(j.id)}>
        <X size={14} />
      </button>
    </div>
  );
}
export function BackgroundJobs() {
  const { activeJobs } = useEditor();
  return (
    <div className="jobs-panel">
      {activeJobs.map((j) => (
        <BackgroundJob key={j.id} j={j} />
      ))}
    </div>
  );
}
export function ToastMessage() {
  const { toast, setToast } = useEditor();
  return (
    <div className="toast">
      <span>{toast}</span>
      <button aria-label="Dismiss notification" onClick={() => setToast('')}>
        <X size={15} />
      </button>
    </div>
  );
}
export function BrowserBanner() {
  return (
    <div className="browser-banner">
      <MonitorPlay size={14} /> Desktop interface preview. Open the installed Shrapwill app to edit
      local files.
    </div>
  );
}
