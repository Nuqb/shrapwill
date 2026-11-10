import type { FilterPreset } from './presets';
import { PresetArt } from './art/PresetArt';

export function FilterThumbnail({ effect }: { effect: FilterPreset }) {
  return <PresetArt settings={effect} sampleKey={effect.name} active={false} />;
}
