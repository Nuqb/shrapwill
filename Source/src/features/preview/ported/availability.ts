import motions from '../../library/catalog/motion-transitions.json' with { type: 'json' };
import manifest from './manifest.json' with { type: 'json' };

const imported = new Set([
  ...motions.map((entry) => entry.kind),
  ...manifest.map((entry) => entry.kind),
]);
const supported = new Set(
  manifest
    .filter((entry) => entry.status === 'shader' && !entry.utility)
    .map((entry) => entry.kind),
);
export function unavailableOriginal(kind: string) {
  return imported.has(kind) && !supported.has(kind);
}
export function originalPortNotice(kind: string) {
  if (kind === 'local_flip_up')
    return 'This transition is unavailable because its required rendering implementation is missing.';
  const entry = manifest.find((entry) => entry.kind === kind);
  if (entry?.status === 'requires-script')
    return 'Port not finished: Shrapwill does not yet implement all rendering steps for this preset.';
  if (entry?.status === 'requires-textures')
    return 'Not yet ported: requires additional original textures and rendering steps.';
  return 'Not yet ported: no self-contained original shader was found. The earlier approximation is disabled.';
}
