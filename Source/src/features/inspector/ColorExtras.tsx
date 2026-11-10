import type { Properties } from '../../types';
import { neutralColor } from '../library/presets';
import { portedShader } from '../preview/ported/registry';

type Props = { value: Properties; disabled: boolean; onCommit: (next: Properties) => void };
export function ColorExtras({ value, disabled, onCommit }: Props) {
  return (
    <>
      {value.originalFilter && (
        <p className="field-note">Filter: {portedShader(value.originalFilter)?.name}</p>
      )}
      <label className="numeric-field">
        <span>Posterize levels</span>
        <select
          aria-label="Posterize levels"
          disabled={disabled}
          value={value.posterize}
          onChange={(event) => onCommit({ ...value, posterize: +event.target.value })}
        >
          <option value={0}>Off</option>
          {[2, 3, 4, 5, 6, 8, 12, 16].map((levels) => (
            <option key={levels} value={levels}>
              {levels}
            </option>
          ))}
        </select>
      </label>
      <button
        className="secondary full"
        disabled={disabled}
        onClick={() => onCommit({ ...value, ...neutralColor })}
      >
        Reset color
      </button>
    </>
  );
}
