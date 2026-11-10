import { useEffect, useRef } from 'react';
import { FileVideo, FileWarning, Save, X, LoaderCircle } from 'lucide-react';

export default function UnsavedChangesDialog({
  projectName,
  closing,
  busy,
  error,
  onKeepEditing,
  onDiscard,
  onSave,
}: {
  projectName: string;
  closing: boolean;
  busy: boolean;
  error: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const root = useRef<HTMLElement>(null),
    cancel = useRef<HTMLButtonElement>(null);
  const actions = useRef({ busy, onKeepEditing });
  actions.current = { busy, onKeepEditing };
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!actions.current.busy) actions.current.onKeepEditing();
        return;
      }
      if (e.key !== 'Tab') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const buttons = [
        ...(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []),
      ];
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop unsaved-backdrop">
      <section
        ref={root}
        className="unsaved-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-heading"
        aria-describedby="unsaved-description"
        aria-busy={busy}
      >
        <header>
          <div className="unsaved-symbol">
            <FileWarning size={25} strokeWidth={1.6} />
          </div>
          <div>
            <span className="eyebrow">UNSAVED CHANGES</span>
            <h2 id="unsaved-heading">Save changes before {closing ? 'closing' : 'continuing'}?</h2>
          </div>
          <button
            className="unsaved-close"
            disabled={busy}
            aria-label="Close unsaved changes dialog"
            onClick={onKeepEditing}
          >
            <X size={18} />
          </button>
        </header>
        <div className="unsaved-body">
          <p id="unsaved-description">
            Your latest edits haven’t been saved. Save them to pick up where you left off.
          </p>
          <div className="unsaved-project">
            <span>
              <FileVideo size={21} strokeWidth={1.5} />
            </span>
            <div>
              <strong title={projectName}>{projectName}</strong>
              <small>Current project</small>
            </div>
            <i>Edited</i>
          </div>
          <p className="unsaved-discard-note">
            Discard changes {closing ? 'closes Shrapwill' : 'continues'} without saving these edits.
          </p>
          {error && (
            <div className="unsaved-error" role="alert">
              <FileWarning size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
        <footer>
          <button ref={cancel} className="unsaved-keep" disabled={busy} onClick={onKeepEditing}>
            Keep editing<kbd>Esc</kbd>
          </button>
          <div>
            <button className="secondary unsaved-discard" disabled={busy} onClick={onDiscard}>
              Discard changes
            </button>
            <button className="primary" disabled={busy} onClick={onSave}>
              {busy ? <LoaderCircle className="spinning" size={15} /> : <Save size={15} />}{' '}
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
