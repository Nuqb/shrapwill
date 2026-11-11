import { useState } from 'react';
import type { AnimationSettings, Clip } from '../../types';
import { animationPresets } from '../preview/animation';
import { InspectorTabs } from './InspectorTabs';
import { InspectorSlider } from './InspectorSlider';
import { AnimationArt } from './AnimationArt';
import type { PropertyForm } from './InspectorFields';

export function AnimationControls({ clip, form }: { clip: Clip; form: PropertyForm }) {
  const [tab, setTab] = useState('Motion Presets');
  const [direction, setDirection] = useState('In');
  const [preview, setPreview] = useState<string | null>(null);
  const a = form.value.animation ?? { keyframe: '', inPreset: '', outPreset: '', frames: 30 };
  const key =
    tab === 'Keyframe Presets' ? 'keyframe' : direction === 'In' ? 'inPreset' : 'outPreset';
  const options = animationPresets.filter(
    (p) =>
      p.scene ===
      (tab === 'Keyframe Presets' ? 'keyframe' : 'animation_scene_' + direction.toLowerCase()),
  );
  const change = (next: AnimationSettings) => {
    const props = {
      ...form.value,
      animation: next.keyframe || next.inPreset || next.outPreset ? next : undefined,
    };
    form.onChange(props);
    form.onCommit(props);
  };
  return (
    <div className="animation-inspector">
      <InspectorTabs
        label="Animation areas"
        items={['Motion Presets', 'Keyframe Presets']}
        value={tab}
        onChange={(next) => {
          setPreview(null);
          setTab(next);
        }}
      />
      {tab === 'Motion Presets' && (
        <InspectorTabs
          label="Motion direction"
          items={['In', 'Out']}
          value={direction}
          onChange={(next) => {
            setPreview(null);
            setDirection(next);
          }}
        />
      )}
      <div
        className={
          'animation-preset-grid ' + (tab === 'Keyframe Presets' ? 'keyframe-preset-grid' : '')
        }
        role="radiogroup"
        aria-label={tab}
      >
        {[{ id: '', name: 'No Motion' }, ...options].map((p) => (
          <button
            key={p.id}
            className="inspector-preset"
            role="radio"
            aria-checked={a[key] === p.id}
            title={p.name}
            disabled={form.disabled}
            onMouseEnter={() => setPreview(p.id)}
            onMouseLeave={() => setPreview(null)}
            onFocus={() => setPreview(p.id)}
            onBlur={() => setPreview(null)}
            onClick={() => {
              if (a[key] !== p.id) change({ ...a, [key]: p.id });
              else form.onChange(form.value);
            }}
          >
            <AnimationArt
              clip={clip}
              id={p.id}
              name={p.name}
              active={!form.disabled && preview === p.id}
              area={tab === 'Keyframe Presets' ? tab : direction}
            />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      {tab === 'Motion Presets' && (
        <div className="animation-duration">
          <InspectorSlider
            label="Motion duration"
            value={a.frames}
            min={1}
            max={Math.max(1, Math.floor(clip.duration / 2))}
            step={1}
            unit=" frames"
            disabled={form.disabled}
            onChange={(frames) => form.onChange({ ...form.value, animation: { ...a, frames } })}
            onCommit={(frames) => change({ ...a, frames })}
          />
        </div>
      )}
    </div>
  );
}
