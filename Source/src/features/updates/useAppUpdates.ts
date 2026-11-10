import { useEffect, useState } from 'react';
import { appUpdates, type UpdateProgress } from '../../services/desktop/appUpdates';
import { desktop, events } from '../../services/desktop/client';
import type { EditorSession } from '../../app/session/useEditorSession';
import type { EditorState } from '../../app/state/useEditorState';

const preferenceKey = 'shrapwill-startup-updates';
function readPreference() {
  try {
    return localStorage.getItem(preferenceKey) !== 'false';
  } catch {
    return true;
  }
}
function useUpdatePreference() {
  const [automaticUpdates, storeAutomaticUpdates] = useState(readPreference);
  const [updatePreferenceError, setUpdatePreferenceError] = useState('');
  const setAutomaticUpdates = (enabled: boolean) => {
    storeAutomaticUpdates(enabled);
    setUpdatePreferenceError('');
    try {
      localStorage.setItem(preferenceKey, String(enabled));
    } catch {
      setUpdatePreferenceError('This preference could not be saved.');
    }
  };
  return { automaticUpdates, setAutomaticUpdates, updatePreferenceError };
}
function useUpdateState(ready: boolean, automaticUpdates: boolean) {
  const [appUpdate, setAppUpdate] = useState(appUpdates.snapshot);
  useEffect(() => appUpdates.subscribe(setAppUpdate), []);
  useEffect(() => {
    if (!desktop) return;
    let active = true,
      stop = () => {};
    void events<UpdateProgress>('app-update-progress', (event) => {
      if (active) appUpdates.progress(event.payload);
    })
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else unsubscribe();
      })
      .catch(() => {});
    return () => {
      active = false;
      stop();
    };
  }, []);
  useEffect(() => {
    if (desktop && ready && automaticUpdates) void appUpdates.check(true);
  }, [ready, automaticUpdates]);
  return appUpdate;
}
export function useAppUpdates(ctx: EditorState & EditorSession) {
  const preference = useUpdatePreference();
  const appUpdate = useUpdateState(ctx.ready, preference.automaticUpdates);
  const installAppUpdate = async () => {
    if (appUpdates.snapshot().mode === 'installed') {
      ctx.setSettingsOpen(false);
      if (!(await ctx.safeToLeave(true))) {
        ctx.setSettingsOpen(true);
        return;
      }
    }
    await appUpdates.install(true);
  };
  const restartForUpdate = async () => {
    ctx.setSettingsOpen(false);
    if (await ctx.safeToLeave(true)) await appUpdates.restart(true);
    else ctx.setSettingsOpen(true);
  };
  return {
    appUpdate,
    ...preference,
    checkForUpdates: () => appUpdates.check(),
    downloadAppUpdate: () => appUpdates.download(),
    cancelAppUpdate: () => appUpdates.cancel(),
    installAppUpdate,
    restartForUpdate,
  };
}
