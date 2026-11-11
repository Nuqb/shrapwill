import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { wheelColor, wheelPosition } from './colorGeometry';
const levelOf = (rgb: number[]) => rgb.reduce((sum, v) => sum + v, 0) / 3;
const withLevel = (rgb: number[], level: number) =>
  rgb.map((v) => Math.max(-1, Math.min(1, v + level)));
export function ColorWheel({
  label,
  value,
  disabled,
  onChange,
  onCommit,
  coordinates = false,
}: {
  label: string;
  value: number[];
  disabled: boolean;
  onChange: (rgb: number[]) => void;
  onCommit: (rgb: number[]) => void;
  coordinates?: boolean;
}) {
  const active = useRef(false),
    pending = useRef(value),
    original = useRef(value);
  const [x, y] = wheelPosition(value);
  const dirty = useRef([false, false, false]);
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!active.current || disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pending.current = withLevel(
      wheelColor(
        (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.43),
        (event.clientY - rect.top - rect.height / 2) / (rect.height * 0.43),
      ),
      levelOf(original.current),
    );
    onChange(pending.current);
  };
  return (
    <div className="color-wheel-card">
      <h5>{label}</h5>
      <div className={'color-wheel-disc' + (disabled ? ' disabled' : '')}>
        <WheelLevel
          label={label}
          value={value}
          disabled={disabled}
          onChange={onChange}
          onCommit={onCommit}
        />
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={label + ' color wheel'}
          onPointerDown={(e) => {
            if (disabled || e.button !== 0) return;
            active.current = true;
            pending.current = value;
            original.current = value;
            e.currentTarget.setPointerCapture(e.pointerId);
            move(e);
          }}
          onPointerMove={move}
          onPointerUp={() => {
            if (active.current) {
              active.current = false;
              onCommit(pending.current);
            }
          }}
          onPointerCancel={() => {
            if (active.current) {
              active.current = false;
              onChange(original.current);
            }
          }}
          onLostPointerCapture={() => {
            if (active.current) {
              active.current = false;
              onChange(original.current);
            }
          }}
        >
          <path d="M46 50h8M50 46v8" stroke="#a3acb8" strokeWidth="0.5" opacity="0.6" />
          <circle
            cx={50 + x * 40}
            cy={50 + y * 40}
            r="3"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      {coordinates ? (
        <WheelCoordinates
          label={label}
          value={value}
          disabled={disabled}
          onChange={onChange}
          onCommit={onCommit}
        />
      ) : (
        <div className="wheel-rgb-inputs">
          {['Red', 'Green', 'Blue'].map((name, i) => (
            <label key={name} className={'wheel-channel wheel-channel-' + i}>
              <span>{name}</span>
              <input
                type="number"
                aria-label={label + ' ' + name}
                min={-1}
                max={1}
                step={0.01}
                value={Number(value[i].toFixed(2))}
                disabled={disabled}
                onChange={(e) => {
                  dirty.current[i] = true;
                  onChange(
                    value.map((v, index) =>
                      index === i ? Math.max(-1, Math.min(1, +e.target.value)) : v,
                    ),
                  );
                }}
                onBlur={(e) => {
                  if (!dirty.current[i]) return;
                  dirty.current[i] = false;
                  onCommit(
                    value.map((v, index) =>
                      index === i ? Math.max(-1, Math.min(1, +e.target.value)) : v,
                    ),
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

type WheelFields = {
  label: string;
  value: number[];
  disabled: boolean;
  onChange: (v: number[]) => void;
  onCommit: (v: number[]) => void;
};
function WheelCoordinates({ label, value, disabled, onChange, onCommit }: WheelFields) {
  const dirty = useRef([false, false]);
  const position = wheelPosition(value);
  const next = (index: number, n: number) =>
    withLevel(
      wheelColor(index === 0 ? n : position[0], index === 1 ? n : position[1]),
      levelOf(value),
    );
  return (
    <div className="wheel-coordinate-inputs">
      {['X', 'Y'].map((name, i) => (
        <label key={name}>
          <span>{name}</span>
          <input
            type="number"
            min={-1}
            max={1}
            step={0.01}
            aria-label={label + ' ' + name}
            value={Number(position[i].toFixed(2))}
            disabled={disabled}
            onChange={(e) => {
              dirty.current[i] = true;
              onChange(next(i, Math.max(-1, Math.min(1, +e.target.value))));
            }}
            onBlur={(e) => {
              if (dirty.current[i]) {
                dirty.current[i] = false;
                onCommit(next(i, Math.max(-1, Math.min(1, +e.target.value))));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </label>
      ))}
    </div>
  );
}
function WheelLevel({ label, value, disabled, onChange, onCommit }: WheelFields) {
  const pending = useRef(value);
  const dirty = useRef(false);
  const finish = () => {
    if (dirty.current) {
      dirty.current = false;
      onCommit(pending.current);
    }
  };
  const level = levelOf(value);
  const update = (n: number) => value.map((v) => Math.max(-1, Math.min(1, v + n - level)));
  return (
    <input
      className="wheel-level"
      type="range"
      aria-label={label + ' level'}
      min={-1}
      max={1}
      step={0.01}
      value={level}
      disabled={disabled}
      onChange={(e) => {
        dirty.current = true;
        pending.current = update(+e.target.value);
        onChange(pending.current);
      }}
      onPointerUp={finish}
      onBlur={finish}
      onKeyUp={(e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
          finish();
      }}
    />
  );
}
