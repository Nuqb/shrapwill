import { call, exportPath } from '../../bridge';
import { type Snapshot } from '../../types';
import type { ActionContext } from './types';
export async function changeQuality(ctx: ActionContext, q: number) {
  const { setQuality, previewPending, notify } = ctx;
  previewPending.current.clear();
  setQuality(q);
  try {
    await call('prepare_compatible_preview', { quality: q });
  } catch (e) {
    notify(String(e));
  }
}
export async function exportVideo(ctx: ActionContext) {
  const { exportRes, exportQuality, encoder, setExportJob, p, notify } = ctx;
  try {
    const path = await exportPath(p.name);
    if (!path) return;
    const long = exportRes === 1080 ? 1920 : 1280,
      short = exportRes === 1080 ? 1080 : 720;
    const settings = {
      width: p.width > p.height ? long : short,
      height: p.width < p.height ? long : short,
      quality: exportQuality,
      encoder,
    };
    const id = await call<string>('start_export', { path, settings });
    setExportJob(id);
  } catch (e) {
    notify(String(e));
  }
}
export async function clipboardAction(ctx: ActionContext, direction: string) {
  const { setSelected, setPlaying, ref, notify, update } = ctx;
  setPlaying(false);
  try {
    const result = await call<{
      snapshot: Snapshot;
      selected: string[];
    }>('clipboard', {
      direction,
      ids: ref.current.selected,
      frame: ref.current.frame,
    });
    update(result.snapshot);
    if (direction !== 'copy') setSelected(result.selected);
    if (direction === 'copy') notify('Clips copied');
  } catch (e) {
    notify(String(e));
  }
}
