import type { ActionContext } from './types';
import type { VideoEffectPreset } from '../../features/library/videoEffects';

export function applyVideoEffect(ctx: ActionContext, effect: VideoEffectPreset) {
  const { selectedClip, selectedTrack, notify, edit, setSource } = ctx;
  if (!selectedClip || selectedTrack?.kind === 'audio') {
    notify('Select a video or image clip to apply an effect.');
    return;
  }
  setSource(null);
  const { name: _name, category: _category, description: _description, ...settings } = effect;
  void edit({
    type: 'properties',
    id: selectedClip.id,
    props: {
      ...selectedClip.props,
      ...settings,
      effectStrength: ctx.presetTuning.effectStrength,
    },
  });
}
