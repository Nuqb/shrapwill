import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { clampUnit } from './colorGeometry';
type Props = {
  label: string;
  values: number[];
  color: string;
  disabled: boolean;
  positions?: number[];
  spectrum?: boolean;
  onChange: (values: number[]) => void;
  onCommit: (values: number[]) => void;
};
export function ColorCurve({
  label,
  values,
  color,
  disabled,
  positions,
  spectrum,
  onChange,
  onCommit,
}: Props) {
  const active = useRef<number | null>(null);
  const original = useRef(values);
  const pending = useRef(values);
  const xs = positions ?? values.map((_, i) => i / (values.length - 1));
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (active.current === null || disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = clampUnit(1 - (event.clientY - rect.top - rect.height * 0.05) / (rect.height * 0.9));
    pending.current = pending.current.map((v, i) => (i === active.current ? y : v));
    onChange(pending.current);
  };
  return (
    <svg
      className={'color-curve-graph' + (spectrum ? ' spectrum-curve' : '')}
      viewBox="0 0 400 200"
      role="img"
      aria-label={label}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clampUnit((event.clientX - rect.left - rect.width * 0.025) / (rect.width * 0.95));
        active.current = xs.reduce(
          (best, value, i) => (Math.abs(value - x) < Math.abs(xs[best] - x) ? i : best),
          0,
        );
        original.current = values;
        pending.current = values;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={() => {
        if (active.current !== null) {
          active.current = null;
          onCommit(pending.current);
        }
      }}
      onPointerCancel={() => {
        if (active.current !== null) {
          active.current = null;
          onChange(original.current);
        }
      }}
      onLostPointerCapture={() => {
        if (active.current !== null) {
          active.current = null;
          onChange(original.current);
        }
      }}
    >
      <path
        className="curve-grid"
        d="M10 10H390V190H10ZM105 10v180M200 10v180M295 10v180M10 55h380M10 100h380M10 145h380"
      />
      {!spectrum && <path className="curve-diagonal" d="M10 190L390 10" />}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={values.map((v, i) => 10 + xs[i] * 380 + ',' + (190 - v * 180)).join(' ')}
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={10 + xs[i] * 380}
          cy={190 - v * 180}
          r="3.5"
          fill={color}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label + ' point ' + (i + 1)}
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={v}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault();
            onCommit(
              values.map((n, index) =>
                index === i ? clampUnit(n + (e.key === 'ArrowUp' ? 0.01 : -0.01)) : n,
              ),
            );
          }}
        />
      ))}
    </svg>
  );
}
