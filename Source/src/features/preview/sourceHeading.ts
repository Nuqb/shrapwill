import type { PreviewSource } from '../../types';
const labels = { filter: 'Filter', effect: 'Effect', transition: 'Transition' };
export function sourceHeading(source: PreviewSource | null) {
  if (!source) return 'Player';
  if (source.kind === 'title') return 'Title preview';
  if (source.kind === 'preset') return `${labels[source.presetKind]} preview`;
  return 'Source';
}
