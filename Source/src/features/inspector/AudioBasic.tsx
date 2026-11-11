import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AudioSlider } from './AudioSlider';
import { AudioSelect, AudioToggle, type AudioPanelProps } from './AudioFields';
import { audioDefaults, eqFrequencies, eqPresets } from '../audio/settings';

export function AudioBasic({
  clip,
  value,
  audio,
  disabled,
  fps,
  onAudioChange,
  onChange,
  onCommit,
}: AudioPanelProps) {
  const [equalizerOpen, setEqualizerOpen] = useState(false);
  const property = (label: string, key: 'gainDb' | 'fadeIn' | 'fadeOut') => {
    const fade = key !== 'gainDb';
    const toFrames = (n: number) => (fade ? Math.round(n * fps) : n);
    return (
      <AudioSlider
        key={key}
        label={label}
        value={fade ? value[key] / fps : value[key]}
        min={fade ? 0 : -60}
        max={fade ? clip.duration / fps : 24}
        step={fade ? 1 / fps : 0.5}
        unit={fade ? ' s' : ' dB'}
        disabled={disabled}
        onChange={(n) => onChange({ ...value, [key]: toFrames(n) })}
        onCommit={(n) => onCommit({ ...value, [key]: toFrames(n) })}
        onReset={() => onCommit({ ...value, [key]: 0 })}
      />
    );
  };
  const range = (
    label: string,
    key: 'balance' | 'pitch' | 'duckAmount',
    limits: [number, number, number],
    unit = '',
  ) => (
    <AudioSlider
      label={label}
      value={audio[key]}
      min={limits[0]}
      max={limits[1]}
      step={limits[2]}
      unit={unit}
      endpoints={key === 'balance' ? ['L', 'R'] : undefined}
      disabled={disabled || (key === 'duckAmount' && !audio.ducking)}
      onChange={(n) => onAudioChange({ [key]: n }, false)}
      onCommit={(n) => onAudioChange({ [key]: n })}
      onReset={() => onAudioChange({ [key]: audioDefaults[key] })}
    />
  );
  const eqName =
    Object.keys(eqPresets).find((key) =>
      eqPresets[key].every((n, i) => n === audio.equalizer[i]),
    ) ?? 'Custom';
  return (
    <>
      <section className="audio-section audio-adjustment">
        <details open>
          <summary>
            Adjustment <ChevronDown size={11} />
          </summary>
          {property('Volume', 'gainDb')}
          <AudioSelect
            label="Audio channels"
            value={audio.channels}
            options={{
              stereo: 'None (original stereo)',
              mono: 'Mono',
              left: 'Left to both',
              right: 'Right to both',
              swap: 'Swap left / right',
            }}
            disabled={disabled}
            onChange={(channels) => onAudioChange({ channels })}
          />
          {range('Sound balance', 'balance', [-1, 1, 0.01])}
          {property('Fade in', 'fadeIn')}
          {property('Fade out', 'fadeOut')}
          {range('Pitch', 'pitch', [-12, 12, 0.1], ' semitones')}
          <div className="audio-equalizer-row">
            <AudioSelect
              label="Equalizer preset"
              value={eqName}
              options={{
                ...Object.fromEntries(
                  Object.keys(eqPresets).map((key) => [key, key === 'Flat' ? 'Default' : key]),
                ),
                ...(eqName === 'Custom' ? { Custom: 'Custom' } : {}),
              }}
              disabled={disabled}
              onChange={(name) => onAudioChange({ equalizer: [...eqPresets[name]] })}
            />
            <button
              className="audio-setting"
              aria-expanded={equalizerOpen}
              onClick={() => setEqualizerOpen(!equalizerOpen)}
            >
              Setting
            </button>
          </div>
          {equalizerOpen && (
            <fieldset className="audio-equalizer" aria-label="Customize equalizer">
              <legend>Customize equalizer</legend>
              {eqFrequencies.map((label, i) => (
                <AudioSlider
                  key={label}
                  label={label}
                  value={audio.equalizer[i]}
                  min={-20}
                  max={20}
                  step={0.5}
                  unit=" dB"
                  disabled={disabled}
                  onChange={(n) =>
                    onAudioChange(
                      { equalizer: audio.equalizer.map((db, j) => (i === j ? n : db)) },
                      false,
                    )
                  }
                  onCommit={(n) =>
                    onAudioChange({ equalizer: audio.equalizer.map((db, j) => (i === j ? n : db)) })
                  }
                />
              ))}
            </fieldset>
          )}
        </details>
      </section>
      <section className="audio-section audio-leveling">
        <AudioToggle
          label="Auto normalize"
          checked={audio.normalize}
          disabled={disabled}
          onChange={(normalize) => onAudioChange({ normalize })}
        />
        <fieldset disabled={disabled || !audio.normalize} className="audio-normalize-targets">
          {[-23, -16, -14].map((target) => (
            <button
              key={target}
              aria-pressed={(audio.normalizeTarget ?? -16) === target}
              onClick={() => {
                if (target !== (audio.normalizeTarget ?? -16))
                  onAudioChange({ normalizeTarget: target });
              }}
            >
              {target} LUFS
            </button>
          ))}
          <label>
            Custom{' '}
            <input
              aria-label="Normalization target"
              type="number"
              min={-36}
              max={-5}
              step={0.5}
              value={audio.normalizeTarget ?? -16}
              onChange={(e) =>
                onAudioChange(
                  { normalizeTarget: Math.min(-5, Math.max(-36, +e.target.value)) },
                  false,
                )
              }
              onBlur={(e) =>
                onAudioChange({ normalizeTarget: Math.min(-5, Math.max(-36, +e.target.value)) })
              }
            />
          </label>
        </fieldset>
      </section>
      <section className="audio-section audio-ducking">
        <AudioToggle
          label="Audio ducking"
          checked={audio.ducking}
          disabled={disabled}
          onChange={(ducking) => onAudioChange({ ducking })}
        />
        <AudioSlider
          label="Duck amount"
          value={(1 - 10 ** (-audio.duckAmount / 20)) * 100}
          min={0}
          max={98.4}
          step={0.1}
          unit=" %"
          disabled={disabled || !audio.ducking}
          onChange={(n) =>
            onAudioChange({ duckAmount: -20 * Math.log10(Math.max(0.016, 1 - n / 100)) }, false)
          }
          onCommit={(n) =>
            onAudioChange({ duckAmount: -20 * Math.log10(Math.max(0.016, 1 - n / 100)) })
          }
        />
        {(['duckFadeDuration', 'duckFadePosition'] as const).map((key, i) => (
          <AudioSlider
            key={key}
            label={i === 0 ? 'Fade duration' : 'Fade position'}
            value={audio[key] ?? audioDefaults[key]!}
            min={i === 0 ? 0 : -10}
            max={10}
            step={0.01}
            unit=" s"
            disabled={disabled || !audio.ducking}
            onChange={(n) => onAudioChange({ [key]: n }, false)}
            onCommit={(n) => onAudioChange({ [key]: n })}
          />
        ))}
        <p className="audio-help">
          Lowers other overlapping audio. Linked clips and other foreground clips are excluded.
        </p>
      </section>
    </>
  );
}
