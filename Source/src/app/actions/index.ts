import { type Bindings } from '../../shortcuts';
import { filterPresets } from '../config';
import type { ActionContext } from './types';
import { updatePresetTuning, type PresetTuning } from './presetTuning';
import { create, recoverProject, discardRecovery, renameProject } from './project';
import { addMedia, addTitle, relink, previewAsset } from './media';
import { previewTitle } from './titlePreview';
import {
  previewFilter,
  previewVideoEffect,
  previewTransition,
  applyPreviewPreset,
} from './presetPreview';
import { applyVideoEffect } from './videoEffects';
import type { VideoEffectPreset } from '../../features/library/videoEffects';
import { changeQuality, exportVideo, clipboardAction } from './workspace';
import { commitShortcuts, applyTransition, applyFilter, cancelJob } from './editing';
export function createEditorActions(ctx: ActionContext) {
  return {
    create: () => create(ctx),
    recoverProject: () => recoverProject(ctx),
    discardRecovery: () => discardRecovery(ctx),
    renameProject: () => renameProject(ctx),
    addMedia: (id: string, trackId?: string, start?: number) => addMedia(ctx, id, trackId, start),
    addTitle: (style: string, start = ctx.frame, trackId?: string) =>
      addTitle(ctx, style, start, trackId),
    relink: (id: string) => relink(ctx, id),
    previewAsset: (id: string) => previewAsset(ctx, id),
    previewTitle: (style: string) => previewTitle(ctx, style),
    previewFilter: (filter: (typeof filterPresets)[number]) => previewFilter(ctx, filter),
    previewVideoEffect: (effect: VideoEffectPreset) => previewVideoEffect(ctx, effect),
    previewTransition: (kind: string) => previewTransition(ctx, kind),
    applyPreviewPreset: () => applyPreviewPreset(ctx),
    updatePresetTuning: (key: keyof PresetTuning, value: number) =>
      updatePresetTuning(ctx, key, value),
    changeQuality: (q: number) => changeQuality(ctx, q),
    exportVideo: () => exportVideo(ctx),
    clipboardAction: (direction: string) => clipboardAction(ctx, direction),
    commitShortcuts: (next: Bindings) => commitShortcuts(ctx, next),
    applyTransition: (kind: string) => applyTransition(ctx, kind),
    applyFilter: (effect: (typeof filterPresets)[number]) => applyFilter(ctx, effect),
    applyVideoEffect: (effect: VideoEffectPreset) => applyVideoEffect(ctx, effect),
    cancelJob,
  };
}
export type EditorActions = ReturnType<typeof createEditorActions>;
