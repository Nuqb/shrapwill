import { useEffect, useId, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  onReset?: () => void;
  endpoints?: [string, string];
};
export function InspectorSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  disabled,
  onChange,
  onCommit,
  onReset,
  endpoints,
}: Props) {
  const id = useId();
  const latest = useRef(value);
  const dirty = useRef(false);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const finish = () => {
    if (!dirty.current) return;
    dirty.current = false;
    onCommit(latest.current);
  };
  return (
    <div className="audio-control-row audio-slider inspector-control-row">
      <label htmlFor={id}>{label}</label>
      <div className="audio-range-track">
        {endpoints && <span>{endpoints[0]}</span>}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            dirty.current = true;
            latest.current = +e.target.value;
            onChange(latest.current);
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
          onBlur={finish}
          onKeyUp={(e) => {
            if (
              [
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
                'End',
                'PageUp',
                'PageDown',
              ].includes(e.key)
            )
              finish();
          }}
        />
        {endpoints && <span>{endpoints[1]}</span>}
      </div>
      <output htmlFor={id}>
        {value.toFixed(unit === ' semitones' ? 1 : 2)}
        <small>{unit === ' semitones' ? '' : unit}</small>
      </output>
      {onReset && (
        <button
          className="audio-control-reset"
          title={'Reset ' + label}
          aria-label={'Reset ' + label}
          disabled={disabled}
          onClick={onReset}
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}
