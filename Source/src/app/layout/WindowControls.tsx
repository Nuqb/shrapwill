import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { desktop } from '../../services/desktop/client';
import {
  minimizeWindow,
  toggleWindowMaximized,
  closeWindow,
  watchWindowMaximized,
} from '../../services/desktop/window';

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => watchWindowMaximized(setMaximized), []);
  if (!desktop) return null;
  const run = (action: () => Promise<void>) => {
    setError('');
    void action().catch(() => setError('Could not change the window. Please try again.'));
  };
  return (
    <div className="window-controls" aria-label="Window controls">
      <button aria-label="Minimize window" title="Minimize" onClick={() => run(minimizeWindow)}>
        <Minus size={14} />
      </button>
      <button
        aria-label={maximized ? 'Restore window' : 'Maximize window'}
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={() => run(toggleWindowMaximized)}
      >
        {maximized ? <Copy size={12} /> : <Square size={12} />}
      </button>
      <button
        className="window-close"
        aria-label="Close window"
        title="Close"
        onClick={() => run(closeWindow)}
      >
        <X size={16} />
      </button>
      {error && (
        <span className="window-control-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
