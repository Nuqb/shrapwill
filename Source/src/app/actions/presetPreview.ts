import { call } from '../../services/desktop/client';
import { defaults, fpsOf, type Properties, type RenderPlan, type PreviewSource } from '../../types';
import {
  filterPresets,
  transitionPresets,
  type FilterPreset,
} from '../../features/library/presets';
import { videoEffects, type VideoEffectPreset } from '../../features/library/videoEffects';
import type { ActionContext } from './types';
import { loadPresetPreview } from './loadPresetPreview';
import { applyFilter, applyTransition } from './editing';
import { applyVideoEffect } from './videoEffects';
import { previewPhotoIndex } from '../../features/library/art/photoSelection';

type PresetRequest = {
  kind: 'filter' | 'effect' | 'transition';
  key: string;
  name: string;
  properties?: Partial<Properties>;
};
export function selectedPresetPlan(
  ctx: ActionContext,
  properties: Partial<Properties>,
): RenderPlan | null {
  const clip = ctx.render?.clips.find(
    (rc) => rc.clip.id === ctx.selectedClip?.id && rc.kind === 'video' && rc.previewReady,
  );
  if (!clip || !ctx.render) return null;
  const duration = Math.min(clip.clip.duration, Math.round(fpsOf(ctx.p.fps) * 5));
  return {
    ...ctx.render,
    duration,
    clips: [
      {
        ...clip,
        clip: {
          ...clip.clip,
          start: 0,
          transition: null,
          props: { ...clip.clip.props, ...properties },
        },
      },
    ],
  };
}
async function previewPreset(ctx: ActionContext, preset: PresetRequest) {
  const local =
    preset.kind === 'transition' ? null : selectedPresetPlan(ctx, preset.properties ?? {});
  const source: PreviewSource = {
    kind: 'preset',
    presetKind: preset.kind,
    presetKey: preset.key,
    name: `${preset.name} · ${local ? ctx.selectedClip!.name : 'Sample'}`,
    requestId: crypto.randomUUID(),
    plan: null,
    frame: 0,
    playing: false,
    strength:
      preset.kind === 'filter' ? ctx.presetTuning.filterStrength : ctx.presetTuning.effectStrength,
    transitionSeconds: ctx.presetTuning.transitionSeconds,
  };
  await loadPresetPreview(ctx, source, () =>
    local
      ? Promise.resolve(local)
      : call<RenderPlan>('preview_preset', {
          options: {
            sampleIndex: previewPhotoIndex(preset.key),
            properties: { ...defaults, ...preset.properties },
            transitionKind: preset.kind === 'transition' ? preset.key : null,
          },
        }),
  );
}
export function previewFilter(ctx: ActionContext, filter: FilterPreset) {
  const { name, category: _category, description: _description, ...properties } = filter;
  return previewPreset(ctx, { kind: 'filter', key: name, name, properties });
}
export function previewVideoEffect(ctx: ActionContext, effect: VideoEffectPreset) {
  const { name, category: _category, description: _description, ...properties } = effect;
  return previewPreset(ctx, { kind: 'effect', key: name, name, properties });
}
export function previewTransition(ctx: ActionContext, key: string) {
  const preset = transitionPresets.find((preset) => preset.kind === key);
  if (preset) return previewPreset(ctx, { kind: 'transition', key, name: preset.name });
}
export function applyPreviewPreset(ctx: ActionContext) {
  const source = ctx.source;
  if (source?.kind !== 'preset') return;
  if (source.presetKind === 'transition') return applyTransition(ctx, source.presetKey);
  if (source.presetKind === 'filter') {
    const filter = filterPresets.find((preset) => preset.name === source.presetKey);
    if (filter) applyFilter(ctx, filter);
    return;
  }
  const effect = videoEffects.find((preset) => preset.name === source.presetKey);
  if (effect) applyVideoEffect(ctx, effect);
}
