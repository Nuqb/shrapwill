import { Ban, SlidersHorizontal } from 'lucide-react';
import ramps from '../library/catalog/speed-ramps.json';
import type { useSpeedControls } from './useSpeedControls';
type Controls = ReturnType<typeof useSpeedControls>;
export function SpeedRampPresets({ controls: c }: { controls: Controls }) {
  const options = [
    'None',
    'Customize',
    'Montage',
    'Hero moment',
    'Bullet time',
    'Jumper',
    'Flash in',
    'Flash out',
  ];
  return (
    <div className="speed-preset-grid" role="radiogroup" aria-label="Ramp preset">
      {options.map((name) => {
        const preset = ramps.find((r) => r.name === name);
        return (
          <button
            key={name}
            role="radio"
            aria-checked={c.preset === name}
            className="inspector-preset"
            onClick={() => {
              c.setPreset(name);
              c.setPoints(
                preset
                  ? preset.points.map((p) => [...p])
                  : [
                      [0, 1],
                      [1, 1],
                    ],
              );
              void c.apply();
            }}
          >
            <span className="speed-preset-art">
              {name === 'None' ? (
                <Ban size={30} strokeWidth={1} />
              ) : name === 'Customize' ? (
                <SlidersHorizontal size={30} strokeWidth={1} />
              ) : (
                <svg viewBox="0 0 64 48" aria-hidden="true">
                  <path className="ramp-grid" d="M4 12h56M4 24h56M4 36h56" />
                  <polyline
                    points={preset?.points
                      .map(([x, y]) => 4 + x * 56 + ',' + (41 - (y / 8) * 34))
                      .join(' ')}
                  />
                </svg>
              )}
            </span>
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
export function SpeedRampEditor({ controls: c }: { controls: Controls }) {
  return (
    <div className="speed-ramp-editor">
      <svg viewBox="0 0 300 110" role="img" aria-label="Speed ramp graph">
        <path className="ramp-grid" d="M0 25h300M0 55h300M0 85h300M75 0v110M150 0v110M225 0v110" />
        <polyline
          points={c.points.map(([x, y]) => x * 300 + ',' + (105 - (y / 16) * 100)).join(' ')}
        />
        {c.points.map(([x, y], i) => (
          <circle key={i} cx={x * 300} cy={105 - (y / 16) * 100} r="3" />
        ))}
      </svg>
      <details open={c.preset === 'Customize'}>
        <summary>Customize ramp points</summary>
        {c.points.map(([position, speed], index) => (
          <div className="speed-point" key={index}>
            <span>{index + 1}</span>
            <label>
              Source %
              <input
                aria-label={'Ramp source ' + (index + 1)}
                type="number"
                min={0}
                max={100}
                value={position * 100}
                disabled={index === 0 || index === c.points.length - 1}
                onChange={(e) => {
                  c.setPreset('Customize');
                  c.setPoints(
                    c.points.map((p, i) => (i === index ? [+e.target.value / 100, p[1]] : p)),
                  );
                }}
              />
            </label>
            <label>
              Speed ×
              <input
                aria-label={'Ramp speed ' + (index + 1)}
                type="number"
                min={0.1}
                max={16}
                step={0.1}
                value={speed}
                onChange={(e) => {
                  c.setPreset('Customize');
                  c.setPoints(c.points.map((p, i) => (i === index ? [p[0], +e.target.value] : p)));
                }}
              />
            </label>
          </div>
        ))}
        <button
          className="inspector-action"
          disabled={c.points.length >= 16}
          onClick={() => {
            const i = c.points.length - 1;
            c.setPreset('Customize');
            c.setPoints([...c.points.slice(0, i), [(c.points[i - 1][0] + 1) / 2, 1], c.points[i]]);
            void c.apply();
          }}
        >
          Add ramp point
        </button>
      </details>
    </div>
  );
}
