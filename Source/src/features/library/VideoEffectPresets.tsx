import { useState, useMemo } from 'react';
import { PresetArt } from './art/PresetArt';
import { useEditor } from '../../app/EditorContext';
import { PresetCollection } from './PresetCollection';
import {
  videoEffects,
  videoEffectCategories,
  neutralVideoEffects,
  type VideoEffectPreset,
} from './videoEffects';

function VideoEffectCard({ effect }: { effect: VideoEffectPreset }) {
  const { applyVideoEffect, previewVideoEffect, selectedClip, presetTuning } = useEditor();
  const settings = useMemo(
    () => ({ ...effect, effectStrength: presetTuning.effectStrength }),
    [effect, presetTuning.effectStrength],
  );
  const [hovered, setHovered] = useState(false);
  const active =
    !!selectedClip &&
    (Object.keys(neutralVideoEffects) as (keyof typeof neutralVideoEffects)[]).every(
      (key) => (selectedClip.props[key] ?? neutralVideoEffects[key]) === settings[key],
    );
  return (
    <button
      className={`preset-card video-effect-preset ${active ? 'selected-preset' : ''}`}
      aria-pressed={active}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => void previewVideoEffect(effect)}
      onDoubleClick={() => applyVideoEffect(effect)}
      title={effect.description}
    >
      <div className="preset-art video-effect-art">
        <PresetArt settings={settings} sampleKey={effect.name} active={hovered} />
      </div>
      <strong>{effect.name}</strong>
    </button>
  );
}
export function VideoEffectPresets() {
  return (
    <>
      <PresetCollection
        items={videoEffects}
        categoryGroups={videoEffectCategories}
        renderItem={(effect) => <VideoEffectCard key={effect.name} effect={effect} />}
      />
    </>
  );
}
