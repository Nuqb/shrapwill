import { legacyEffectStyles } from '../library/videoEffects';
import { ChevronDown } from 'lucide-react';
import { portedShader } from '../preview/ported/registry';
import { useVideoEffectControls, type EffectControlProps } from './useVideoEffectControls';

const fields = [
  { key: 'effectStrength', label: 'Effect strength', max: 100 },
  { key: 'effectAmount', label: 'Style strength', max: 100 },
  { key: 'mosaic', label: 'Mosaic block size', max: 25 },
  { key: 'rgbSplit', label: 'RGB separation', max: 10 },
  { key: 'shake', label: 'Shake amount', max: 10 },
  { key: 'wave', label: 'Wave distortion', max: 10 },
  { key: 'vignette', label: 'Vignette', max: 100 },
  { key: 'scanlines', label: 'Scan lines', max: 100 },
] as const;
function EffectAmountField({
  field,
  controls,
  disabled,
}: {
  field: (typeof fields)[number];
  controls: ReturnType<typeof useVideoEffectControls>;
  disabled: boolean;
}) {
  const { key, label, max } = field;
  const { value, change, commit } = controls;
  return (
    <label className="numeric-field" key={key}>
      <span>{label} (%)</span>
      <input
        type="number"
        aria-label={label}
        min={0}
        max={max}
        step={0.1}
        value={Number(((value[key] || 0) * 100).toFixed(2))}
        disabled={disabled}
        onChange={(e) => change(key, Math.min(max, Math.max(0, +e.target.value)) / 100)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
function EffectStyleField({
  controls,
  disabled,
}: {
  controls: ReturnType<typeof useVideoEffectControls>;
  disabled: boolean;
}) {
  const { value, change, commit } = controls;
  return (
    <label className="numeric-field">
      <span>{value.originalEffect ? 'Additional effect style' : 'Effect style'}</span>
      <select
        aria-label="Effect style"
        value={value.effectStyle || 0}
        disabled={disabled}
        onChange={(event) => {
          const style = +event.target.value;
          const next = { ...value, effectStyle: style, effectAmount: style ? 0.7 : 0 };
          change('effectStyle', style);
          void commit(next);
        }}
      >
        <option value={0}>Off</option>
        {legacyEffectStyles.map((effect) => (
          <option key={effect.effectStyle} value={effect.effectStyle}>
            {effect.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function VideoEffectControls(props: EffectControlProps) {
  const controls = useVideoEffectControls(props);
  const { value, change, commit, reset } = controls;
  return (
    <div className="property-section">
      <h4>
        <ChevronDown size={13} /> Video effects
      </h4>
      {value.originalEffect && (
        <p className="field-note">Original effect: {portedShader(value.originalEffect)?.name}</p>
      )}
      <EffectStyleField controls={controls} disabled={props.disabled} />
      {fields
        .filter((field) => field.key !== 'effectAmount' || value.effectStyle > 0)
        .map((field) => (
          <EffectAmountField
            key={field.key}
            field={field}
            controls={controls}
            disabled={props.disabled}
          />
        ))}
      <label className="numeric-field">
        <span>Mirror split</span>
        <select
          aria-label="Mirror split"
          value={value.mirror || 0}
          disabled={props.disabled}
          onChange={(e) => {
            change('mirror', +e.target.value);
            void commit({ ...value, mirror: +e.target.value });
          }}
        >
          <option value={0}>Off</option>
          <option value={1}>On</option>
        </select>
      </label>
      <button className="secondary full" disabled={props.disabled} onClick={reset}>
        Reset video effects
      </button>
      <p className="field-note">
        Effects combine with your color filter. Resetting one keeps the other.
      </p>
    </div>
  );
}
