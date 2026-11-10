import { useCallback } from 'react';
import { call } from '../../bridge';
import { type Snapshot, type Edit } from '../../types';
import type { EditorState } from '../state/useEditorState';
import type { useSnapshotUpdate } from './useSnapshotUpdate';
type EditContext = EditorState & ReturnType<typeof useSnapshotUpdate>;
async function editOperation(ctx: EditContext, operation: Edit) {
  const { notify, update } = ctx;
  try {
    const s = await call<Snapshot>('edit', { operation });
    update(s);
    return s;
  } catch (e) {
    notify(String(e));
    return undefined;
  }
}
async function historyOperation(ctx: EditContext, direction: string) {
  const { notify, update } = ctx;
  try {
    update(await call<Snapshot>('history', { direction }));
  } catch (e) {
    notify(String(e));
  }
}
export function useEditingCommands(ctx: EditContext) {
  const { notify, update } = ctx;
  const edit = useCallback((operation: Edit) => editOperation(ctx, operation), [update, notify]);
  const history = useCallback(
    (direction: string) => historyOperation(ctx, direction),
    [update, notify],
  );
  return { edit, history };
}
