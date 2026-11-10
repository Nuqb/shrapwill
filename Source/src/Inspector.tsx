import { useEffect, useState } from 'react';
import { RotateCcw, SlidersHorizontal, Film, Music2, ChevronDown } from 'lucide-react';
import type { Clip, Project, Properties, Edit, Title } from './types';
import { defaults, fpsOf, timecode } from './types';
import { TitleControls } from './features/inspector/TitleControls';
import { TransitionControls } from './features/inspector/TransitionControls';
import { VideoEffectControls } from './features/inspector/VideoEffectControls';
import { ColorExtras } from './features/inspector/ColorExtras';
type NumericProperty = Exclude<keyof Properties, 'originalFilter' | 'originalEffect'>;

export default function Inspector({
  project,
  clip,
  locked,
  edit,
  onDraft,
  kind,
}: {
  project: Project;
  clip: Clip | null;
  locked: boolean;
  kind?: string;
  edit: (op: Edit) => Promise<unknown>;
  onDraft: (p: Properties | null) => void;
}) {
  const [tab, setTab] = useState('Video'),
    [props, setProps] = useState<Properties>(defaults),
    [title, setTitle] = useState<Title | null>(null);
  useEffect(() => {
    setProps(clip?.props || defaults);
    setTitle(clip?.title || null);
    onDraft(null);
  }, [clip?.id, clip?.props, clip?.title]);
  useEffect(() => {
    if (kind === 'audio') setTab('Audio');
    else if (clip?.title) setTab('Video');
  }, [clip?.id, kind]);
  const change = (key: keyof Properties, value: number) => {
    const next = { ...props, [key]: value };
    setProps(next);
    onDraft(next);
  };
  const commit = async (next = props) => {
    if (!clip || locked) return;
    await edit({ type: 'properties', id: clip.id, props: next });
    onDraft(null);
  };
  const slider = (
    label: string,
    key: NumericProperty,
    min: number,
    max: number,
    step: number,
    unit = '',
  ) => (
    <div className="property-control" key={key}>
      <div className="property-label">
        <label htmlFor={`prop-${key}`}>{label}</label>
        <span>
          {Number(props[key].toFixed(2))}
          {unit}
        </span>
      </div>
      <div className="slider-row">
        <input
          id={`prop-${key}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={props[key]}
          disabled={locked}
          onChange={(e) => change(key, +e.target.value)}
          onPointerUp={() => void commit()}
          onKeyUp={(e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) void commit();
          }}
        />
        <button
          title={`Reset ${label}`}
          onClick={() => {
            const next = { ...props, [key]: defaults[key] };
            setProps(next);
            void commit(next);
          }}
          disabled={locked}
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
  const number = (label: string, key: keyof Properties, min: number, max: number, step = 1) => (
    <label className="numeric-field" key={key}>
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={props[key]}
        disabled={locked}
        onChange={(e) => change(key, Math.min(max, Math.max(min, +e.target.value)))}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
  if (!clip) return null;
  return (
    <aside className="inspector panel">
      <div className="inspector-tabs">
        {(kind === 'audio' ? ['Audio'] : ['Video', 'Audio', 'Color']).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'Audio' ? (
              <Music2 size={13} />
            ) : t === 'Video' ? (
              <Film size={13} />
            ) : (
              <SlidersHorizontal size={13} />
            )}{' '}
            {t}
          </button>
        ))}
      </div>
      <div className="inspector-scroll">
        <div className="selected-name">
          <strong>{clip.name}</strong>
          <span>
            {timecode(clip.duration, project.fps)} {locked ? '· Track locked' : ''}
          </span>
        </div>
        {tab === 'Video' && (
          <>
            {title && (
              <TitleControls
                title={title}
                disabled={locked}
                onChange={setTitle}
                onCommit={(next) => {
                  void edit({ type: 'set_title', id: clip.id, title: next });
                }}
              />
            )}
            <div className="property-section">
              <h4>
                <ChevronDown size={13} /> Transform{' '}
                <button
                  className="section-reset"
                  title="Reset transform"
                  disabled={locked}
                  onClick={() => {
                    const next = { ...props, x: 0, y: 0, scale: 1, rotation: 0 };
                    setProps(next);
                    void commit(next);
                  }}
                >
                  <RotateCcw size={12} />
                </button>
              </h4>
              {slider('Scale', 'scale', 0.05, 3, 0.01)}
              <div className="numeric-row">
                {number('Position X', 'x', -4000, 4000)}
                {number('Position Y', 'y', -4000, 4000)}
              </div>
              {slider('Rotation', 'rotation', -180, 180, 1, '°')}
              {slider('Opacity', 'opacity', 0, 1, 0.01)}
            </div>
            <div className="property-section">
              <h4>
                <ChevronDown size={13} /> Crop
              </h4>
              <div className="numeric-row">
                {number('Left', 'cropLeft', 0, 0.45, 0.01)}
                {number('Right', 'cropRight', 0, 0.45, 0.01)}
              </div>
              <div className="numeric-row">
                {number('Top', 'cropTop', 0, 0.45, 0.01)}
                {number('Bottom', 'cropBottom', 0, 0.45, 0.01)}
              </div>
              <p className="field-note">Crop values are fractions of the source picture.</p>
            </div>
            <VideoEffectControls clip={clip} disabled={locked} edit={edit} onDraft={onDraft} />
            <TransitionControls clip={clip} fps={project.fps} disabled={locked} edit={edit} />
          </>
        )}
        {tab === 'Color' && (
          <div className="property-section">
            <h4>
              <ChevronDown size={13} /> Basic color
            </h4>
            {slider('Brightness', 'brightness', -1, 1, 0.01)}
            {slider('Filter strength', 'filterStrength', 0, 1, 0.01)}
            {slider('Contrast', 'contrast', 0, 2, 0.01)}
            {slider('Saturation', 'saturation', 0, 2, 0.01)}
            {slider('Warmth', 'warmth', -1, 1, 0.01)}
            {slider('Tint', 'tint', -1, 1, 0.01)}
            {slider('Sepia', 'sepia', 0, 1, 0.01)}
            {slider('Invert', 'invert', 0, 1, 0.01)}
            <ColorExtras
              value={props}
              disabled={locked}
              onCommit={(next) => {
                setProps(next);
                void commit(next);
              }}
            />
          </div>
        )}
        {tab === 'Audio' && (
          <div className="property-section">
            <h4>
              <ChevronDown size={13} /> Volume & fades
            </h4>
            {slider('Gain', 'gainDb', -60, 24, 0.5, ' dB')}
            {slider(
              'Fade in',
              'fadeIn',
              0,
              Math.min(clip.duration, Math.round(fpsOf(project.fps) * 5)),
              1,
              ' frames',
            )}
            {slider(
              'Fade out',
              'fadeOut',
              0,
              Math.min(clip.duration, Math.round(fpsOf(project.fps) * 5)),
              1,
              ' frames',
            )}
            <p className="field-note">
              Audio fades are applied to this clip. Use track mute to silence an entire track.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
