import { fpsOf, type PreviewSource, type RenderPlan } from '../../types';
import type { ActionContext } from './types';
export type PresetTuning = {
  transitionSeconds: number;
  filterStrength: number;
  effectStrength: number;
};
export const defaultPresetTuning: PresetTuning = {
  transitionSeconds: 2,
  filterStrength: 0.6,
  effectStrength: 0.6,
};
export function tunePreviewPlan(plan: RenderPlan, source: PreviewSource): RenderPlan {
  if (source.kind !== 'preset') return plan;
  if (source.presetKind === 'transition') {
    const fps = fpsOf(plan.fps),
      frames = Math.max(1, Math.round((source.transitionSeconds ?? 2) * fps)),
      hold = Math.round(0.5 * fps);
    return {
      ...plan,
      duration: frames + hold * 2,
      clips: plan.clips.map((rc, index) => ({
        ...rc,
        clip: {
          ...rc.clip,
          start: index ? hold : 0,
          duration: frames + hold,
          transition: index ? { kind: source.presetKey, frames } : null,
        },
      })),
    };
  }
  const key = source.presetKind === 'filter' ? 'filterStrength' : 'effectStrength';
  return {
    ...plan,
    clips: plan.clips.map((rc) => ({
      ...rc,
      clip: { ...rc.clip, props: { ...rc.clip.props, [key]: source.strength ?? 0.6 } },
    })),
  };
}
export function updatePresetTuning(ctx: ActionContext, key: keyof PresetTuning, value: number) {
  const next =
    key === 'transitionSeconds'
      ? Math.max(0.25, Math.min(5, value))
      : Math.max(0, Math.min(1, value));
  if (!Number.isFinite(next)) return;
  ctx.setPresetTuning({ ...ctx.presetTuning, [key]: next });
  ctx.setSource((source) => {
    if (source?.kind !== 'preset') return source;
    const matches =
      key === 'transitionSeconds'
        ? source.presetKind === 'transition'
        : key === 'filterStrength'
          ? source.presetKind === 'filter'
          : source.presetKind === 'effect';
    if (!matches) return source;
    const changed = {
      ...source,
      ...(key === 'transitionSeconds' ? { transitionSeconds: next, frame: 0 } : { strength: next }),
    };
    return { ...changed, plan: changed.plan ? tunePreviewPlan(changed.plan, changed) : null };
  });
}
