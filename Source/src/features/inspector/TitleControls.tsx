import type { Title } from '../../types';
import { titlePresets } from '../library/presets';
import { ChevronDown } from 'lucide-react';

type Props = {
  title: Title;
  disabled: boolean;
  onChange: (title: Title) => void;
  onCommit: (title: Title) => void;
};
export function TitleControls({ title, disabled, onChange, onCommit }: Props) {
  return (
    <div className="property-section">
      <h4>
        <ChevronDown size={13} /> Text & style
      </h4>
      <select
        aria-label="Title style"
        disabled={disabled}
        value={title.style}
        onChange={(e) => {
          const next = { ...title, style: e.target.value };
          onChange(next);
          onCommit(next);
        }}
      >
        {titlePresets.map((preset) => (
          <option key={preset.style} value={preset.style}>
            {preset.name}
          </option>
        ))}
      </select>
      <textarea
        aria-label="Title text"
        value={title.text}
        disabled={disabled}
        maxLength={2000}
        onChange={(e) => onChange({ ...title, text: e.target.value })}
        onBlur={() => onCommit(title)}
      />
      <Typography title={title} disabled={disabled} onChange={onChange} onCommit={onCommit} />
      <p className="field-note">
        Add line breaks for multiline text. Styles keep your words, size, and color.
      </p>
    </div>
  );
}

function Typography({ title, disabled, onChange, onCommit }: Props) {
  return (
    <div className="numeric-row">
      <label className="numeric-field">
        <span>Size</span>
        <input
          aria-label="Title font size"
          type="number"
          min="8"
          max="250"
          value={title.fontSize}
          onChange={(e) =>
            onChange({ ...title, fontSize: Math.max(8, Math.min(250, +e.target.value)) })
          }
          onBlur={() => onCommit(title)}
          disabled={disabled}
        />
      </label>
      <label className="color-field">
        <span>Color</span>
        <input
          aria-label="Title color"
          type="color"
          value={title.color}
          onChange={(e) => onChange({ ...title, color: e.target.value })}
          onBlur={() => onCommit(title)}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
