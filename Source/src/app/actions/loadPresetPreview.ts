import { isRenderedSource, type RenderedPreviewSource, type RenderPlan } from '../../types';
import type { ActionContext } from './types';
import { tunePreviewPlan } from './presetTuning';

export async function loadPresetPreview(
  ctx: ActionContext,
  source: RenderedPreviewSource,
  load: () => Promise<RenderPlan>,
) {
  const { setPlaying, setSource, notify } = ctx;
  setPlaying(false);
  setSource(source);
  const matches = (current: typeof ctx.source) =>
    isRenderedSource(current) && current.requestId === source.requestId;
  try {
    const plan = await load();
    setSource((current) =>
      matches(current) && isRenderedSource(current)
        ? { ...current, plan: tunePreviewPlan(plan, current), playing: true }
        : current,
    );
  } catch (error) {
    setSource((current) => (matches(current) ? null : current));
    notify(String(error));
  }
}
