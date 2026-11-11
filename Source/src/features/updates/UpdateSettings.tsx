import { version } from '../../../package.json';
import { ArrowDownToLine, Check, RefreshCw } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';
import { desktop } from '../../services/desktop/client';

export function UpdateSettings() {
  const ctx = useEditor();
  const update = ctx.appUpdate;
  const busy = ['checking', 'downloading', 'installing'].includes(update.phase);
  return (
    <div className="update-settings">
      <div className="update-overview">
        <span className="update-app-icon" aria-hidden="true">
          {update.phase === 'current' ? <Check size={25} /> : <ArrowDownToLine size={25} />}
        </span>
        <div>
          <span className="update-kicker">SOFTWARE UPDATES</span>
          <h3>Shrapwill {version}</h3>
          <p>Keep your workspace up to date.</p>
        </div>
        <span className="update-version">Installed</span>
      </div>
      <label className="update-preference">
        <span>
          <strong>Automatic update checks</strong>
          <small>Check for updates when Shrapwill starts</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Automatic update checks"
          checked={ctx.automaticUpdates}
          disabled={!desktop}
          onChange={(event) => ctx.setAutomaticUpdates(event.target.checked)}
        />
      </label>
      <div className="update-status" aria-live="polite">
        {!desktop && <p>Open the desktop app to check for updates.</p>}
        {update.phase === 'checking' && <p role="status">Checking for updates…</p>}
        {update.phase === 'current' && <p role="status">You're up to date.</p>}
        {update.phase === 'unpublished' && (
          <p role="status">No signed update has been published yet. You can check again later.</p>
        )}
        {update.info && (
          <div className="update-release">
            <span className="update-kicker">
              {update.phase === 'installed'
                ? 'INSTALLED'
                : update.phase === 'ready'
                  ? 'READY TO INSTALL'
                  : 'NEW RELEASE'}
            </span>
            <strong>Shrapwill {update.info.version}</strong>
            {update.info.notes && <p className="update-notes">{update.info.notes}</p>}
          </div>
        )}
        {update.phase === 'downloading' && (
          <div role="status">
            <p>
              Downloading update… {Math.round(update.downloaded / 1048576)} MB of{' '}
              {Math.round(update.total / 1048576)} MB
            </p>
            <progress
              max={update.total || 1}
              value={update.downloaded}
              aria-label="Update download"
            />
          </div>
        )}
        {update.phase === 'ready' && (
          <p role="status">The update has been downloaded and verified.</p>
        )}
        {update.phase === 'installed' && (
          <p role="status">
            The update is installed for your next launch. You can keep editing and restart when
            ready.
          </p>
        )}
        {update.phase === 'installing' && <p role="status">Preparing the update…</p>}
        {update.mode === 'manual' && update.info && (
          <p>Use Shrapwill's installer or portable launcher to install updates in the app.</p>
        )}
        {(update.error || ctx.updatePreferenceError) && (
          <p role="alert">{update.error || ctx.updatePreferenceError}</p>
        )}
      </div>
      <div className="update-actions">
        <button
          disabled={!desktop || busy || ['ready', 'installed'].includes(update.phase)}
          onClick={() => void ctx.checkForUpdates()}
        >
          <RefreshCw
            size={14}
            className={update.phase === 'checking' ? 'spinning' : ''}
            aria-hidden="true"
          />
          Check for updates
        </button>
        {update.info &&
          ['available', 'error'].includes(update.phase) &&
          update.mode !== 'manual' && (
            <button className="primary" onClick={() => void ctx.downloadAppUpdate()}>
              Download update
            </button>
          )}
        {update.phase === 'downloading' && (
          <button onClick={() => void ctx.cancelAppUpdate()}>Cancel download</button>
        )}
        {update.phase === 'ready' && (
          <button className="primary" onClick={() => void ctx.installAppUpdate()}>
            {update.mode === 'portable' ? 'Install for next launch' : 'Install and restart'}
          </button>
        )}
        {update.phase === 'ready' && update.error && (
          <button onClick={() => void ctx.downloadAppUpdate()}>Download again</button>
        )}
        {update.phase === 'installed' && (
          <button className="primary" onClick={() => void ctx.restartForUpdate()}>
            Restart now
          </button>
        )}
      </div>
    </div>
  );
}
