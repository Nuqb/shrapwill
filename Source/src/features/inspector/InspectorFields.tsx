import { RotateCcw } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import type { Properties } from '../../types';
import { defaults } from '../../types';
import { InspectorSlider } from './InspectorSlider';
export type NumericProperty = Exclude<
  keyof Properties,
  'audio' | 'video' | 'animation' | 'speed' | 'grade' | 'originalFilter' | 'originalEffect'
>;
export type PropertyForm = {
  value: Properties;
  disabled: boolean;
  onChange: (next: Properties) => void;
  onCommit: (next: Properties) => void;
};
export function PropertySlider({
  form,
  name,
  property,
  limits,
  factor = 1,
  offset = 0,
  unit = '',
}: {
  form: PropertyForm;
  name: string;
  property: NumericProperty;
  limits: [number, number, number];
  factor?: number;
  offset?: number;
  unit?: string;
}) {
  return (
    <InspectorSlider
      label={name}
      value={(form.value[property] - offset) * factor}
      min={limits[0]}
      max={limits[1]}
      step={limits[2]}
      unit={unit}
      disabled={form.disabled}
      onChange={(n) => form.onChange({ ...form.value, [property]: n / factor + offset })}
      onCommit={(n) => form.onCommit({ ...form.value, [property]: n / factor })}
      onReset={() => form.onCommit({ ...form.value, [property]: defaults[property] })}
    />
  );
}
export function PropertyNumber({
  form,
  label,
  property,
  min,
  max,
  step = 1,
}: {
  form: PropertyForm;
  label: string;
  property: NumericProperty;
  min: number;
  max: number;
  step?: number;
}) {
  const dirty = useRef(false);
  return (
    <label className="inspector-number">
      <span>{label === 'Position X' ? 'X' : label === 'Position Y' ? 'Y' : label}</span>
      <input
        aria-label={label}
        type="number"
        value={form.value[property]}
        min={min}
        max={max}
        step={step}
        disabled={form.disabled}
        onChange={(e) => {
          dirty.current = true;
          form.onChange({
            ...form.value,
            [property]: Math.max(min, Math.min(max, +e.target.value)),
          });
        }}
        onBlur={(e) => {
          if (!dirty.current) return;
          dirty.current = false;
          form.onCommit({
            ...form.value,
            [property]: Math.max(min, Math.min(max, +e.target.value)),
          });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function InspectorSection({
  title,
  children,
  open = true,
  onReset,
  disabled,
  toggle,
}: {
  title: string;
  toggle?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onReset?: () => void;
  disabled?: boolean;
}) {
  return (
    <details className="inspector-section" open={open}>
      <summary>
        {toggle}
        <span>{title}</span>
        {onReset && (
          <button
            title={'Reset ' + title}
            aria-label={'Reset ' + title}
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              onReset();
            }}
          >
            <RotateCcw size={12} />
          </button>
        )}
      </summary>
      <div className="inspector-section-content">{children}</div>
    </details>
  );
}
