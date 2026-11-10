import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { useDialogFocus } from './features/settings/useDialogFocus';
import { ShortcutSettingsHeader } from './features/settings/ShortcutSettingsHeader';
import {
  actionIds,
  commands,
  defaultBindings,
  fromKeyboard,
  bindingProblem,
  conflicts,
  assignBindings,
  displayBinding,
  type ActionId,
  type Bindings,
} from './shortcuts';
export default function ShortcutSettings({
  bindings,
  onSave,
  onClose,
  onBack,
}: {
  bindings: Bindings;
  onSave: (b: Bindings) => void;
  onClose: () => void;
  onBack?: () => void;
}) {
  const dialog = useDialogFocus();
  const [draft, setDraft] = useState<Bindings>(() => structuredClone(bindings)),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('All commands'),
    [recording, setRecording] = useState<{ id: ActionId; index: number } | null>(null),
    [pending, setPending] = useState<{ id: ActionId; values: string[]; owners: ActionId[] } | null>(
      null,
    ),
    [error, setError] = useState(''),
    [pressed, setPressed] = useState(''),
    [confirmReset, setConfirmReset] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const categories = ['All commands', ...new Set(actionIds.map((id) => commands[id].category))];
  const rows = useMemo(
    () =>
      actionIds.filter(
        (id) =>
          (category === 'All commands' || commands[id].category === category) &&
          `${commands[id].name} ${id === 'tool_razor' ? 'scissors quick split' : id === 'tool_select' ? 'cursor' : ''} ${commands[id].category} ${draft[id].map(displayBinding).join(' ')}`
            .toLowerCase()
            .replace(/[+\s]/g, '')
            .includes(query.toLowerCase().replace(/[+\s]/g, '')),
      ),
    [draft, query, category],
  );
  function apply(id: ActionId, values: string[]) {
    const owners = conflicts(draft, id, values);
    if (owners.length) {
      setPending({ id, values, owners });
      setRecording(null);
      return;
    }
    setDraft(assignBindings(draft, id, values));
    setRecording(null);
    setError('');
  }
  useEffect(() => {
    if (recording) {
      field.current?.focus();
      setPressed('');
      setError('');
    }
  }, [recording?.id, recording?.index]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === 'Escape') {
        setRecording(null);
        setError('');
        return;
      }
      if (e.repeat) return;
      if (e.getModifierState('AltGraph')) {
        setError('AltGr is used for typing. Use the left Ctrl and Alt keys for a shortcut.');
        return;
      }
      const combination = fromKeyboard(e);
      if (!combination) {
        setPressed(
          [e.ctrlKey ? 'Ctrl' : null, e.altKey ? 'Alt' : null, e.shiftKey ? 'Shift' : null]
            .filter(Boolean)
            .join('+') + '+…',
        );
        return;
      }
      setPressed(displayBinding(combination));
      const problem = bindingProblem(combination);
      if (problem) {
        setError(problem);
        return;
      }
      const values = [...draft[recording.id]];
      if (recording.index < values.length) values[recording.index] = combination;
      else values.push(combination);
      apply(recording.id, values);
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [recording, draft]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !recording) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (pending) setPending(null);
        else if (confirmReset) setConfirmReset(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose, recording, pending, confirmReset]);
  return (
    <div className="modal-backdrop shortcut-backdrop">
      <section
        ref={dialog}
        tabIndex={-1}
        className="shortcut-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-heading"
      >
        <ShortcutSettingsHeader onBack={onBack} onClose={onClose} />
        <div className="shortcut-filters">
          <label className="shortcut-search">
            <Search size={15} />
            <input
              aria-label="Search shortcuts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands or shortcuts…"
            />
          </label>
          <select
            aria-label="Shortcut category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {recording && (
          <div className="shortcut-recorder">
            <div>
              <strong>Press a shortcut for {commands[recording.id].name}</strong>
              <span>Press all modifiers together, then the key. Escape cancels.</span>
            </div>
            <input
              ref={field}
              readOnly
              value={pressed || 'Listening…'}
              aria-label="Record keyboard shortcut"
            />
            <button
              aria-label="Cancel shortcut recording"
              onClick={() => {
                setRecording(null);
                setError('');
              }}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {pending && (
          <div className="shortcut-conflict" role="alert">
            <AlertTriangle size={19} />
            <div>
              <strong>Shortcut already assigned</strong>
              <p>
                {pending.owners.map((id) => commands[id].name).join(', ')} already uses this
                combination. Reassign it to {commands[pending.id].name}?
              </p>
              <div>
                <button
                  className="primary"
                  onClick={() => {
                    setDraft(assignBindings(draft, pending.id, pending.values, true));
                    setPending(null);
                    setError('');
                  }}
                >
                  Reassign shortcut
                </button>
                <button className="secondary" onClick={() => setPending(null)}>
                  Keep existing
                </button>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="shortcut-error" role="alert">
            {error}
          </div>
        )}
        {confirmReset && (
          <div className="shortcut-conflict">
            <RotateCcw size={18} />
            <div>
              <strong>Restore every default shortcut?</strong>
              <p>This replaces your custom assignments when you save.</p>
              <div>
                <button
                  className="primary"
                  onClick={() => {
                    setDraft(defaultBindings());
                    setConfirmReset(false);
                    setRecording(null);
                    setPending(null);
                  }}
                >
                  Restore defaults
                </button>
                <button className="secondary" onClick={() => setConfirmReset(false)}>
                  Keep custom shortcuts
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="shortcut-list">
          <div className="shortcut-list-heading">
            <span>Command</span>
            <span>Assigned shortcuts</span>
          </div>
          {rows.map((id) => (
            <div
              className={`shortcut-row ${recording?.id === id ? 'recording' : ''}`}
              key={id}
              data-command={id}
            >
              <div>
                <strong>{commands[id].name}</strong>
                <span>{commands[id].category}</span>
              </div>
              <div className="shortcut-bindings">
                {draft[id].map((value, index) => (
                  <span className="shortcut-chip" key={`${index}-${value}`}>
                    <button
                      aria-label={`Change ${commands[id].name} shortcut ${index + 1}`}
                      onClick={() => {
                        setPending(null);
                        setRecording({ id, index });
                      }}
                    >
                      {displayBinding(value)}
                    </button>
                    <button
                      aria-label={`Remove ${displayBinding(value)} from ${commands[id].name}`}
                      onClick={() =>
                        setDraft({ ...draft, [id]: draft[id].filter((_, i) => i !== index) })
                      }
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {!draft[id].length && <span className="unassigned">Unassigned</span>}
                <button
                  className="add-shortcut"
                  disabled={draft[id].length >= 8}
                  aria-label={`Add shortcut for ${commands[id].name}`}
                  onClick={() => {
                    setPending(null);
                    setRecording({ id, index: draft[id].length });
                  }}
                >
                  <Plus size={14} />
                </button>
                <button
                  className="reset-shortcut"
                  aria-label={`Reset ${commands[id].name} shortcuts`}
                  onClick={() => apply(id, [...commands[id].defaults])}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          ))}
          {!rows.length && <p className="no-shortcuts">No matching commands.</p>}
        </div>
        <footer>
          <div>
            <button
              className="text-button"
              onClick={() => {
                setRecording(null);
                setPending(null);
                setConfirmReset(true);
              }}
            >
              <RotateCcw size={13} /> Reset all
            </button>
            <span>{actionIds.length} commands · Shortcuts apply inside Shrapwill</span>
          </div>
          <div>
            <button className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={!!recording || !!pending || confirmReset}
              onClick={() => {
                try {
                  onSave(draft);
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              <Check size={14} /> Save shortcuts
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
