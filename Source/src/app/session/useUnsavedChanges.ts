import { useCallback } from 'react';
import type { EditorState } from '../state/useEditorState';
import type { useProjectSave } from './useProjectSave';
type UnsavedContext = EditorState & ReturnType<typeof useProjectSave>;
function safeToLeaveOperation(ctx: UnsavedContext, closing = false): Promise<boolean> {
  const { setPlaying, setLeavePrompt, setLeaveBusy, setLeaveError, leavePending, ref } = ctx;
  if (!ref.current.snap.dirty) return Promise.resolve(true);
  if (leavePending.current) return Promise.resolve(false);
  let resolve!: (allow: boolean) => void;
  const promise = new Promise<boolean>((done) => {
    resolve = done;
  });
  leavePending.current = { promise, resolve };
  setPlaying(false);
  setLeaveBusy(false);
  setLeaveError('');
  setLeavePrompt({ closing, projectName: ref.current.snap.project.name });
  return promise;
}
function finishLeaveOperation(ctx: UnsavedContext, allow: boolean) {
  const { setLeavePrompt, setLeaveError, leavePending } = ctx;
  const request = leavePending.current;
  leavePending.current = null;
  setLeavePrompt(null);
  setLeaveError('');
  request?.resolve(allow);
}
async function saveBeforeLeavingOperation(ctx: UnsavedContext) {
  const { setLeaveBusy, setLeaveError, save } = ctx;
  setLeaveBusy(true);
  setLeaveError('');
  try {
    if (await save()) {
      finishLeaveOperation(ctx, true);
    } else setLeaveError('The project was not saved. Try again, or keep editing.');
  } finally {
    setLeaveBusy(false);
  }
}
export function useUnsavedChanges(ctx: UnsavedContext) {
  const safeToLeave = useCallback((closing = false) => safeToLeaveOperation(ctx, closing), []);
  const finishLeave = (allow: boolean) => finishLeaveOperation(ctx, allow);
  const saveBeforeLeaving = () => saveBeforeLeavingOperation(ctx);
  return { safeToLeave, finishLeave, saveBeforeLeaving };
}
