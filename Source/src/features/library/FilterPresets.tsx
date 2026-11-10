import { useEditor } from '../../app/EditorContext';
import { filterPresets } from './presets';
import { PresetCollection } from './PresetCollection';
import { FilterThumbnail } from './FilterThumbnail';
import { useMemo } from 'react';
export function FilterPresetCard({ effect }: { effect: (typeof filterPresets)[number] }) {
  const { applyFilter, previewFilter, presetTuning } = useEditor();
  const settings = useMemo(
    () => ({ ...effect, filterStrength: presetTuning.filterStrength }),
    [effect, presetTuning.filterStrength],
  );
  return (
    <button
      className="preset-card filter-preset"
      key={effect.name}
      onClick={() => void previewFilter(effect)}
      onDoubleClick={() => applyFilter(effect)}
      title={effect.description}
    >
      <div className="preset-art">
        <FilterThumbnail effect={settings} />
      </div>
      <strong>{effect.name}</strong>
    </button>
  );
}
export function FilterPresets() {
  return (
    <PresetCollection
      items={filterPresets}
      renderItem={(effect) => <FilterPresetCard key={effect.name} effect={effect} />}
    />
  );
}
