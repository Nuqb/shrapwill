import { useEffect, useState } from 'react';
import type { Clip, Edit, Properties } from '../../types';
import { neutralVideoEffects, type VideoEffectSettings } from '../library/videoEffects';

export type EffectControlProps = {
  clip: Clip;
  disabled: boolean;
  edit: (op: Edit) => Promise<unknown>;
  onDraft: (props: Properties | null) => void;
};
export function useVideoEffectControls({ clip, disabled, edit, onDraft }: EffectControlProps) {
  const [value, setValue] = useState(clip.props);
  useEffect(() => setValue(clip.props), [clip.id, clip.props]);
  const change = (key: Exclude<keyof VideoEffectSettings, 'originalEffect'>, next: number) => {
    const props = { ...value, [key]: next };
    setValue(props);
    onDraft(props);
  };
  const commit = async (next = value) => {
    if (disabled) return;
    await edit({ type: 'properties', id: clip.id, props: next });
    onDraft(null);
  };
  const reset = () => {
    const next = { ...value, ...neutralVideoEffects };
    setValue(next);
    void commit(next);
  };
  return { value, change, commit, reset };
}
