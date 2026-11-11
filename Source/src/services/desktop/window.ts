import { getCurrentWindow } from '@tauri-apps/api/window';
import { desktop } from './client';

export const minimizeWindow = () => getCurrentWindow().minimize();
export const toggleWindowMaximized = () => getCurrentWindow().toggleMaximize();
// Request normal closing so native unsaved-project and media-job guards still run.
export const closeWindow = () => getCurrentWindow().close();

export function watchWindowMaximized(update: (maximized: boolean) => void) {
  if (!desktop) return () => {};
  let active = true;
  let unlisten: (() => void) | undefined;
  const current = getCurrentWindow();
  const refresh = () => {
    void current
      .isMaximized()
      .then((value) => {
        if (active) update(value);
      })
      .catch(console.error);
  };
  refresh();
  void current
    .onResized(refresh)
    .then((stop) => {
      if (active) unlisten = stop;
      else stop();
    })
    .catch(console.error);
  return () => {
    active = false;
    unlisten?.();
  };
}
