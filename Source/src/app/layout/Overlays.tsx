import UnsavedChangesDialog from '../../UnsavedChangesDialog';
import SettingsDialog from '../../features/settings/SettingsDialog';
import { useEditor } from '../EditorContext';
export function UnsavedPrompt() {
  const { leavePrompt, leaveBusy, leaveError, finishLeave, saveBeforeLeaving } = useEditor();
  if (!leavePrompt) return null;
  return (
    <UnsavedChangesDialog
      projectName={leavePrompt.projectName}
      closing={leavePrompt.closing}
      busy={leaveBusy}
      error={leaveError}
      onKeepEditing={() => finishLeave(false)}
      onDiscard={() => finishLeave(true)}
      onSave={() => void saveBeforeLeaving()}
    />
  );
}
export function EditorPreferences() {
  const { bindings, commitShortcuts, setSettingsOpen, settingsSection, setSettingsSection } =
    useEditor();
  return (
    <SettingsDialog
      bindings={bindings}
      initialCategory={settingsSection}
      onSave={commitShortcuts}
      onClose={() => {
        setSettingsOpen(false);
        setSettingsSection('home');
      }}
    />
  );
}
