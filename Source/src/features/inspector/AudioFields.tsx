import type { ReactNode } from 'react';
import type { AudioSettings, Clip, Properties } from '../../types';
export type AudioPanelProps = {
  clip: Clip;
  value: Properties;
  audio: AudioSettings;
  disabled: boolean;
  fps: number;
  onAudioChange: (patch: Partial<AudioSettings>, commit?: boolean) => void;
  onChange: (value: Properties) => void;
  onCommit: (value: Properties) => void;
};
export function AudioSelect({
  label,
  value,
  options,
  disabled,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  options: Record<string, string>;
  disabled: boolean;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <label className="audio-control-row audio-select-row">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(options).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      {children}
    </label>
  );
}
export function AudioToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="audio-toggle-heading">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
