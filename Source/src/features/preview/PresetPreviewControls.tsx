import { useEditor } from '../../app/EditorContext';
export function PresetPreviewControls() {
  const { source, presetTuning, updatePresetTuning } = useEditor();
  if (source?.kind !== 'preset') return null;
  if (source.presetKind === 'transition')
    return (
      <div className="preset-preview-controls">
        <label>
          Duration{' '}
          <input
            aria-label="Transition preview duration"
            type="number"
            min={0.25}
            max={5}
            step={0.25}
            value={presetTuning.transitionSeconds}
            onChange={(event) =>
              updatePresetTuning('transitionSeconds', Number(event.target.value))
            }
          />
          <span>seconds</span>
        </label>
      </div>
    );
  const key = source.presetKind === 'filter' ? 'filterStrength' : 'effectStrength';
  return (
    <div className="preset-preview-controls">
      <label>
        Strength{' '}
        <input
          aria-label="Preset preview strength"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(presetTuning[key] * 100)}
          onChange={(event) => updatePresetTuning(key, Number(event.target.value) / 100)}
        />
        <output>{Math.round(presetTuning[key] * 100)}%</output>
      </label>
    </div>
  );
}
