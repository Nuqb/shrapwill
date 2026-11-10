import { call } from '../../bridge';
import { type Snapshot } from '../../types';
import type { ActionContext } from './types';
export async function create(ctx: ActionContext) {
  const {
    setLauncher,
    setSelected,
    setFrame,
    setPlaying,
    setNewOpen,
    projectName,
    aspect,
    fps,
    setSource,
    notify,
    update,
    safeToLeave,
  } = ctx;
  if (!(await safeToLeave())) return;
  const [num, den] = fps.split('/').map(Number);
  const dimensions =
    aspect === 'portrait' ? [1080, 1920] : aspect === 'square' ? [1080, 1080] : [1920, 1080];
  try {
    update(
      await call<Snapshot>('new_project', {
        name: projectName,
        width: dimensions[0],
        height: dimensions[1],
        fps: { num, den },
      }),
    );
    setLauncher(false);
    setNewOpen(false);
    setPlaying(false);
    setFrame(0);
    setSource(null);
    setSelected([]);
  } catch (e) {
    notify(String(e));
  }
}
export async function recoverProject(ctx: ActionContext) {
  const { setLauncher, setRecovery, notify, update, safeToLeave } = ctx;
  if (!(await safeToLeave())) return;
  try {
    update(await call<Snapshot>('recover_project'));
    setLauncher(false);
    setRecovery(false);
  } catch (e) {
    notify(String(e));
  }
}
export function discardRecovery(ctx: ActionContext) {
  const { setRecovery } = ctx;
  void call('discard_recovery');
  setRecovery(false);
}
export function renameProject(ctx: ActionContext) {
  const { p, edit } = ctx;
  const name = window.prompt('Project name', p.name);
  if (name?.trim()) void edit({ type: 'rename', name: name.trim() });
}
