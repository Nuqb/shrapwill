// Generated-state UI fixture; no network calls, real installation or project files.
import { mockIPC } from '@tauri-apps/api/mocks';
const mode = new URLSearchParams(location.search).get('mode') || 'portable';
const calls: string[] = [];
Object.assign(window, { isTauri: true });
mockIPC((command) => {
  calls.push(command);
  if (command === 'check_for_updates')
    return {
      currentVersion: '0.9.0',
      mode,
      feedAvailable: true,
      available: {
        version: '0.10.0',
        bytes: 1000000,
        notes: 'A generated update fixture. Projects and original media remain local.',
      },
    };
  if (command === 'install_app_update') return mode;
  if (command === 'plugin:event|listen') return 1;
});
const { createRoot } = await import('react-dom/client');
const { useState, useRef } = await import('react');
const { EditorContext } = await import('../src/app/EditorContext');
const { useAppUpdates } = await import('../src/features/updates/useAppUpdates');
const { default: SettingsDialog } = await import('../src/features/settings/SettingsDialog');
const { default: UnsavedChangesDialog } = await import('../src/UnsavedChangesDialog');
const { defaultBindings } = await import('../src/shortcuts');
await import('../src/style.css');
import type { EditorController } from '../src/app/EditorContext';
import type { EditorState } from '../src/app/state/useEditorState';
import type { EditorSession } from '../src/app/session/useEditorSession';

function Fixture() {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [prompt, setPrompt] = useState(false);
  const [dirty, setDirty] = useState(true);
  const decision = useRef<(allow: boolean) => void>(() => {});
  const safeToLeave = async () => {
    if (!dirty) return true;
    setPrompt(true);
    return new Promise<boolean>((resolve) => {
      decision.current = resolve;
    });
  };
  const updates = useAppUpdates({
    ready: true,
    safeToLeave,
    setSettingsOpen,
  } as unknown as EditorState & EditorSession);
  const finish = (allow: boolean) => {
    setPrompt(false);
    decision.current(allow);
  };
  const ctx = { ...updates, settingsOpen, setSettingsOpen } as unknown as EditorController;
  Object.assign(window, { updateFixture: { calls, dirty, phase: updates.appUpdate.phase } });
  return (
    <EditorContext.Provider value={ctx}>
      {settingsOpen && (
        <SettingsDialog
          bindings={defaultBindings()}
          onSave={() => {}}
          onClose={() => setSettingsOpen(false)}
          initialCategory="updates"
        />
      )}
      {prompt && (
        <UnsavedChangesDialog
          projectName="Generated unsaved project"
          closing
          busy={false}
          error=""
          onKeepEditing={() => finish(false)}
          onDiscard={() => finish(true)}
          onSave={() => {
            setDirty(false);
            calls.push('save-fixture');
            finish(true);
          }}
        />
      )}
    </EditorContext.Provider>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
