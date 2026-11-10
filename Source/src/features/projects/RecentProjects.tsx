import { Film, ChevronRight, X, RefreshCw, Clock3 } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';
export function RecoveryCard() {
  const { recoverProject, discardRecovery } = useEditor();
  return (
    <div className="recovery-card">
      <RefreshCw size={18} />
      <div>
        <strong>Pick up where you left off</strong>
        <span>An unsaved recovery project is available.</span>
      </div>
      <button className="secondary" onClick={() => void recoverProject()}>
        Recover
      </button>
      <button title="Discard recovery" onClick={() => void discardRecovery()}>
        <X size={13} />
      </button>
    </div>
  );
}
export function RecentList() {
  const { recents, openPath } = useEditor();
  return (
    <div className="recent-list">
      {recents.map((r) => (
        <button key={r.path} onClick={() => void openPath(r.path)}>
          <span className="recent-icon">
            <Film size={19} />
          </span>
          <div>
            <strong>{r.name}</strong>
            <span>{r.path}</span>
          </div>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}
export function EmptyRecents() {
  return (
    <div className="no-recents">
      <Clock3 size={23} />
      <strong>A fresh start</strong>
      <span>Your recent projects will appear here.</span>
    </div>
  );
}
export function RecentProjects() {
  const { recovery, recents } = useEditor();
  return (
    <div className="recent-projects">
      <div className="recent-heading">
        <h3>Recent projects</h3>
        <span>Saved on this computer</span>
      </div>
      {recovery && <RecoveryCard />}
      {recents.length ? <RecentList /> : <EmptyRecents />}
    </div>
  );
}
