import { AudioSlider } from './AudioSlider';
import { AudioSelect, AudioToggle, type AudioPanelProps } from './AudioFields';
export function AudioDenoise({ audio, disabled, onAudioChange }: AudioPanelProps) {
  const enabled = (key: 'denoise' | 'hiss' | 'reverbReduction' | 'dehum' | 'deess') =>
    audio.enabled?.[key] ?? audio[key] > 0;
  const toggle = (
    label: string,
    key: 'denoise' | 'hiss' | 'reverbReduction' | 'dehum' | 'deess',
  ) => (
    <AudioToggle
      label={label}
      checked={enabled(key)}
      disabled={disabled}
      onChange={(active) =>
        onAudioChange({
          enabled: { ...audio.enabled, [key]: active },
          ...(active && audio[key] === 0
            ? { [key]: key === 'dehum' ? 50 : key === 'reverbReduction' ? 0.7 : 0.5 }
            : {}),
        })
      }
    />
  );
  const range = (label: string, key: 'denoise' | 'hiss' | 'reverbReduction' | 'deess') => (
    <AudioSlider
      label={label}
      value={audio[key]}
      min={0}
      max={1}
      step={0.01}
      disabled={disabled || !enabled(key)}
      onChange={(n) =>
        onAudioChange({ [key]: n, enabled: { ...audio.enabled, [key]: true } }, false)
      }
      onCommit={(n) => onAudioChange({ [key]: n, enabled: { ...audio.enabled, [key]: true } })}
      onReset={() => onAudioChange({ [key]: 0 })}
    />
  );
  return (
    <div className="audio-denoise">
      <section className="audio-section">
        {toggle('Normal denoise', 'denoise')}
        {range('Denoise intensity', 'denoise')}
      </section>
      <section className="audio-section">
        <AudioToggle
          label="Wind removal"
          checked={audio.windRemoval}
          disabled={disabled}
          onChange={(windRemoval) => onAudioChange({ windRemoval })}
        />
        <p className="audio-help">Reduces low-frequency wind rumble.</p>
      </section>
      <section className="audio-section">
        {toggle('DeReverb', 'reverbReduction')}
        {range('Reduce reverb', 'reverbReduction')}
        <p className="audio-help">
          Reduces quiet room tails. Strong settings also reduce quiet speech.
        </p>
      </section>
      <section className="audio-section">
        {toggle('Hum removal', 'dehum')}
        <AudioSelect
          label="Remove hum"
          value={audio.dehum}
          options={{ 0: 'Off', 50: '50 Hz', 60: '60 Hz' }}
          disabled={disabled || !enabled('dehum')}
          onChange={(n) => onAudioChange({ dehum: +n })}
        />
        <AudioSlider
          label="Hum reduction"
          value={audio.humReduction ?? -60}
          min={-60}
          max={0}
          step={1}
          unit=" dB"
          disabled={disabled || !enabled('dehum')}
          onChange={(n) => onAudioChange({ humReduction: n }, false)}
          onCommit={(n) => onAudioChange({ humReduction: n })}
        />
      </section>
      <section className="audio-section">
        {toggle('Hiss removal', 'hiss')}
        <AudioSlider
          label="Noise volume"
          value={audio.hissNoiseVolume ?? 5}
          min={0}
          max={10}
          step={0.1}
          disabled={disabled || !enabled('hiss')}
          onChange={(n) => onAudioChange({ hissNoiseVolume: n }, false)}
          onCommit={(n) => onAudioChange({ hissNoiseVolume: n })}
        />
        <AudioSlider
          label="Denoise level"
          value={audio.hiss * 6}
          min={0}
          max={6}
          step={0.1}
          disabled={disabled || !enabled('hiss')}
          onChange={(n) =>
            onAudioChange({ hiss: n / 6, enabled: { ...audio.enabled, hiss: true } }, false)
          }
          onCommit={(n) =>
            onAudioChange({ hiss: n / 6, enabled: { ...audio.enabled, hiss: true } })
          }
        />
      </section>
      <section className="audio-section">
        {toggle('De-esser', 'deess')}
        {range('De-esser intensity', 'deess')}
      </section>
    </div>
  );
}
