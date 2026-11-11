import type { Properties } from '../../types';
import { defaults } from '../../types';
import { filterPresets, neutralColor } from '../library/presets';
import { colorPresetNames, applyColorPreset } from './colorPresets';
import { defaultGrade } from '../preview/grading';
import { PresetArt } from '../library/art/PresetArt';
import { Ban } from 'lucide-react';
import { InspectorSlider } from './InspectorSlider';
import { ColorSection } from './ColorSection';
import { InspectorSection } from './InspectorFields';
const previews = colorPresetNames.map((name, index) => ({
  name,
  props: applyColorPreset(defaults, index),
}));
type Props = {
  value: Properties;
  disabled: boolean;
  onChange: (next: Properties) => void;
  onCommit: (next: Properties) => void;
};
export function ColorExtras({ value, disabled, onChange, onCommit }: Props) {
  return (
    <>
      <InspectorSection title="Preset">
        <div className="color-preset-strip" aria-label="Default color presets">
          <button
            className="inspector-preset"
            disabled={disabled}
            onClick={() =>
              onCommit({ ...value, ...neutralColor, grade: defaultGrade(), vignette: 0 })
            }
          >
            <span className="color-preset-none">
              <Ban size={30} strokeWidth={1} />
            </span>
            <span>None</span>
          </button>
          {previews.map((preset, index) => (
            <button
              className="inspector-preset"
              key={preset.name}
              title={preset.name}
              disabled={disabled}
              onClick={() => onCommit(applyColorPreset(value, index))}
            >
              <span className="color-preset-art">
                <PresetArt sampleKey="color-inspector" active={false} settings={preset.props} />
              </span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </InspectorSection>
      <ColorSection title="LUT" form={{ value, disabled, onCommit, onChange: onCommit }}>
        <label className="inspector-labeled-field">
          <span>LUT / color treatment</span>
          <select
            aria-label="LUT / color treatment"
            disabled={disabled}
            value={value.originalFilter || ''}
            onChange={(e) => onCommit({ ...value, originalFilter: e.target.value })}
          >
            <option value="">None</option>
            {filterPresets
              .filter((p) => p.originalFilter)
              .map((p) => (
                <option key={p.originalFilter} value={p.originalFilter}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <InspectorSlider
          label="LUT strength"
          value={(value.grade?.lutStrength ?? 1) * 100}
          min={0}
          max={100}
          step={1}
          unit=" %"
          disabled={disabled}
          onChange={(n) =>
            onChange({
              ...value,
              grade: { ...defaultGrade(), ...value.grade, lutStrength: n / 100 },
            })
          }
          onCommit={(n) =>
            onCommit({
              ...value,
              grade: { ...defaultGrade(), ...value.grade, lutStrength: n / 100 },
            })
          }
        />
      </ColorSection>
    </>
  );
}
