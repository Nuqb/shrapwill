import { call } from '../../bridge';
import { fpsOf } from '../../types';
import { saveBindings, type Bindings } from '../../shortcuts';
import { filterPresets } from '../config';
import type { ActionContext } from './types';
export function commitShortcuts(ctx: ActionContext, next: Bindings) {
  const { setBindings, setSettingsOpen, notify } = ctx;
  saveBindings(next);
  setBindings(next);
  setSettingsOpen(false);
  notify('Keyboard shortcuts saved');
}
export function applyTransition(ctx: ActionContext, kind: string) {
  const { p, selectedClip, notify, edit, setSource } = ctx;
  if (!selectedClip) {
    notify('Select the incoming video clip first.');
    return;
  }
  setSource(null);
  const frames = Math.round(fpsOf(p.fps) * ctx.presetTuning.transitionSeconds);
  void edit({
    type: 'set_transition',
    id: selectedClip.id,
    kind: kind,
    frames,
  }).then((snapshot) => {
    const actual = snapshot?.project.tracks
      .flatMap((track) => track.clips)
      .find((clip) => clip.id === selectedClip.id)?.transition?.frames;
    if (actual && actual < frames)
      notify(
        `Transition shortened to ${(actual / fpsOf(p.fps)).toFixed(2)} seconds to fit the clips.`,
      );
  });
}
export function applyFilter(ctx: ActionContext, effect: (typeof filterPresets)[number]) {
  const { selectedClip, selectedTrack, notify, edit, setSource } = ctx;
  if (!selectedClip || selectedTrack?.kind === 'audio') {
    notify('Select a video or image clip to apply a filter.');
    return;
  }
  setSource(null);
  void edit({
    type: 'properties',
    id: selectedClip.id,
    props: {
      ...selectedClip.props,
      brightness: effect.brightness,
      contrast: effect.contrast,
      saturation: effect.saturation,
      warmth: effect.warmth,
      tint: effect.tint,
      sepia: effect.sepia,
      invert: effect.invert,
      posterize: effect.posterize,
      originalFilter: effect.originalFilter,
      filterStrength: ctx.presetTuning.filterStrength,
    },
  });
}
export function cancelJob(id: string) {
  void call('cancel_job', { id });
}
