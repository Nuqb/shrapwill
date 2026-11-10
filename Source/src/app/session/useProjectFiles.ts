import { useCallback } from 'react';
import { call, chooseProject } from '../../bridge';
import { type Snapshot } from '../../types';
import type { EditorState } from '../state/useEditorState';
import type { useSnapshotUpdate } from './useSnapshotUpdate';
import type { useUnsavedChanges } from './useUnsavedChanges';
type FileContext = EditorState &
  ReturnType<typeof useSnapshotUpdate> &
  ReturnType<typeof useUnsavedChanges>;
async function openPathOperation(ctx: FileContext, path: string) {
  const { setLauncher, setSelected, setFrame, setPlaying, setSource, notify, update, safeToLeave } =
    ctx;
  if (!(await safeToLeave())) return;
  try {
    update(await call<Snapshot>('open_project', { path }));
    setLauncher(false);
    setFrame(0);
    setPlaying(false);
    setSource(null);
    setSelected([]);
  } catch (e) {
    notify(String(e));
  }
}
async function openOperation(ctx: FileContext) {
  const { notify } = ctx;
  try {
    const path = await chooseProject();
    if (typeof path === 'string') await openPathOperation(ctx, path);
  } catch (e) {
    notify(String(e));
  }
}
export function useProjectFiles(ctx: FileContext) {
  const { notify, update, safeToLeave } = ctx;
  const openPath = useCallback(
    (path: string) => openPathOperation(ctx, path),
    [safeToLeave, update, notify],
  );
  const open = useCallback(() => openOperation(ctx), [openPath, notify]);
  return { openPath, open };
}
