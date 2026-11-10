import { call } from '../../services/desktop/client';
import { titlePresets } from '../../features/library/presets';
import type { ActionContext } from './types';
import type { RenderPlan } from '../../types';
import { loadPresetPreview } from './loadPresetPreview';

export async function previewTitle(ctx: ActionContext, style: string) {
  const preset = titlePresets.find((preset) => preset.style === style);
  if (!preset) return;
  ctx.setTitlePreset(style);
  await loadPresetPreview(
    ctx,
    {
      kind: 'title',
      name: preset.name,
      requestId: crypto.randomUUID(),
      plan: null,
      frame: 0,
      playing: false,
    },
    () => call<RenderPlan>('preview_title', { style }),
  );
}
