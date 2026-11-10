import { desktop } from '../../bridge';
import { useEditor } from '../EditorContext';
import { AppHeader } from './Header';
import { EditorWorkspace } from './Workspace';
import { MissingMediaNotice, BackgroundJobs, ToastMessage, BrowserBanner } from './Notifications';
import { ProjectLauncher } from '../../features/projects/Launcher';
import { NewProjectDialog } from '../../features/projects/NewProjectDialog';
import { ExportDialog } from '../../features/export/ExportDialog';
import { UnsavedPrompt, EditorPreferences } from './Overlays';
import { ProjectInfoDialog } from '../../features/projects/ProjectInfoDialog';
export function EditorShell() {
  const {
    menu,
    setMenu,
    missing,
    activeJobs,
    exportOpen,
    toast,
    launcher,
    newOpen,
    leavePrompt,
    settingsOpen,
    projectInfoOpen,
  } = useEditor();
  return (
    <div
      className="app-shell"
      onPointerDown={() => {
        if (menu) setMenu('');
      }}
    >
      <AppHeader />
      {!desktop && <BrowserBanner />}
      <EditorWorkspace />
      {missing.length > 0 && <MissingMediaNotice />}
      {activeJobs.length > 0 && !exportOpen && <BackgroundJobs />}
      {toast && <ToastMessage />}
      {launcher && <ProjectLauncher />}
      {newOpen && <NewProjectDialog />}
      {exportOpen && <ExportDialog />}
      {leavePrompt && <UnsavedPrompt />}
      {settingsOpen && <EditorPreferences />}
      {projectInfoOpen && <ProjectInfoDialog />}
    </div>
  );
}
