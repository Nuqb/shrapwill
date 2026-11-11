import fs from 'node:fs';
import path from 'node:path';
import { installation } from './filmora-resources.mjs';
import { animationCatalog } from './animation-catalog.mjs';
import { format } from 'prettier';

const root = path.join(process.env.SHRAPWILL_FILMORA_INSTALLATION || installation, 'configs');
const output = path.resolve(
  import.meta.dirname,
  '../src/features/library/catalog/animation-source.json',
);
const compare = (a, b) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });

function entries(folder) {
  const directory = path.join(root, folder);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));
}
function json(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function curve(value) {
  return JSON.parse(value).keyframeSets.map((point) => ({
    time: point._time,
    value: point._value,
    leftDerivative: point._leftDerivative,
    rightDerivative: point._rightDerivative,
    leftDerivativeY: point._leftDerivativeY,
    rightDerivativeY: point._rightDerivativeY,
    interpolation: point.Interpolation,
  }));
}
function keyframePreset(directory) {
  const info = json(path.join(directory, 'info.json'));
  const params = json(path.join(directory, 'param.conf'));
  const transform = JSON.parse(params.Transform);
  const curves = Object.fromEntries(
    transform.paramMapList.map((item) => [item.name, curve(item.keyFrame.parameter)]),
  );
  curves.Opacity = curve(params.Opacity);
  return { id: info.uuid, name: info.title, curves };
}
function motionPreset(directory) {
  const info = json(path.join(directory, 'info.json'));
  const params = json(path.join(directory, 'param.conf'));
  const file = path.join(directory, path.basename(params.Animation));
  const source = fs.existsSync(file) ? json(file) : null;
  const effects = source?.effectChain?.effectList || [];
  const curves = Object.fromEntries(
    effects.flatMap((effect) =>
      (effect.paramMapList || []).map((item) => [item.name, curve(item.keyFrame.parameter)]),
    ),
  );
  const animation = source?.animation || null;
  return { id: info.uuid, name: info.title, scene: info.category, animation, curves };
}
const result = {
  keyframes: entries('AnimationKeyFrame').map(keyframePreset).sort(compare),
  motions: entries('AnimationNew').map(motionPreset).sort(compare),
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(
  path.join(path.dirname(output), 'animation-presets.json'),
  await format(JSON.stringify(animationCatalog(result)), { parser: 'json' }),
);
console.log(
  `Recorded ${result.keyframes.length} keyframe and ${result.motions.length} motion presets.`,
);
