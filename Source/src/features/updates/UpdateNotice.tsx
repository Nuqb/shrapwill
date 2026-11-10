import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';

export function UpdateNotice() {
  const { appUpdate, setSettingsOpen, setSettingsSection } = useEditor();
  const [dismissed, setDismissed] = useState('');
  const version = appUpdate.info?.version;
  if (
    !version ||
    dismissed === version ||
    !['available', 'ready', 'installed'].includes(appUpdate.phase)
  )
    return null;
  return (
    <aside className="update-notice" aria-label="Application update">
      <Download size={17} />
      <span>
        {appUpdate.phase === 'installed'
          ? `Shrapwill ${version} is ready for your next launch.`
          : `Shrapwill ${version} is available.`}
      </span>
      <button
        onClick={() => {
          setSettingsSection('updates');
          setSettingsOpen(true);
        }}
      >
        Review update
      </button>
      <button aria-label="Dismiss update notification" onClick={() => setDismissed(version)}>
        <X size={15} />
      </button>
    </aside>
  );
}
