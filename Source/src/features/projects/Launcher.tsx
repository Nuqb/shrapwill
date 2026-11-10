import { FolderOpen, Plus, X, Settings, ArrowUpRight } from 'lucide-react';
import { durationOf } from '../../types';
import brandIcon from '../../assets/shrapwill-icon.png';
import { ToolButton } from '../../ShortcutUI';
import { useEditor } from '../../app/EditorContext';
import { version } from '../../../package.json';
import { RecentProjects } from './RecentProjects';
export function ArtworkViewport() {
  return (
    <div className="art-viewport">
      <div className="art-sun" />
      <div className="art-mountain one" />
      <div className="art-mountain two" />
      <span>
        MAKE SOMETHING
        <br />
        WORTH WATCHING.
      </span>
    </div>
  );
}
export function ArtworkTimeline() {
  return (
    <div className="art-timeline">
      <i />
      <i />
      <i />
      <i />
      <b />
    </div>
  );
}
export function LauncherArtwork() {
  return (
    <div className="launcher-art">
      <ArtworkViewport />
      <ArtworkTimeline />
    </div>
  );
}
export function LauncherActions() {
  const { setNewOpen, open } = useEditor();
  return (
    <div className="launcher-actions">
      <button className="primary" onClick={() => setNewOpen(true)}>
        <Plus size={18} /> New project
        <ArrowUpRight size={15} />
      </button>
      <button className="secondary" onClick={() => void open()}>
        <FolderOpen size={16} /> Open project
      </button>
    </div>
  );
}
export function LauncherIntro() {
  useEditor();
  return (
    <div className="launcher-intro">
      <h1>Just edit and make something cool.</h1>
      <LauncherActions />
      <LauncherArtwork />
    </div>
  );
}
export function LauncherFooter() {
  return (
    <div className="launcher-footer">
      <span>Shrapwill {version}</span>
    </div>
  );
}
export function LauncherHeader() {
  const { runAction, p, setLauncher } = useEditor();
  return (
    <div className="launcher-top">
      <div className="brand">
        <img className="brand-icon" src={brandIcon} alt="" />
        <strong>shrapwill</strong>
        <span className="beta-tag">STUDIO</span>
      </div>
      {!(!p.assets.length && !durationOf(p)) && (
        <button title="Back to editor" onClick={() => setLauncher(false)}>
          <X size={18} />
        </button>
      )}
      <ToolButton action="settings" onClick={() => runAction('settings')}>
        <Settings size={18} />
      </ToolButton>
    </div>
  );
}
export function LauncherContent() {
  return (
    <div className="launcher">
      <LauncherHeader />
      <LauncherIntro />
      <RecentProjects />
      <LauncherFooter />
    </div>
  );
}
export function ProjectLauncher() {
  return (
    <div className="modal-backdrop launcher-backdrop">
      <LauncherContent />
    </div>
  );
}
