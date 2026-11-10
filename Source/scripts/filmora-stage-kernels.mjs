import fs from 'node:fs';
import path from 'node:path';
import { installation, downloads, decoded } from './filmora-resources.mjs';

export const stage = (body, inputs, values = {}, geometry = {}) => ({
  body:
    Object.entries(values)
      .map(([name, value]) => `#define param_${name} ${value}`)
      .join('\n') +
    '\n' +
    body,
  inputs,
  ...geometry,
});
export const ref = (index) => -index - 1;
export const progress = 'clamp(u_global_time/u_total_time,0.0,1.0)';

export function kernel(name) {
  const directory = path.join(
    installation,
    'resources/wfx_effect/nle_default/BaseFilter',
    name,
    'Data',
  );
  const file = fs.readdirSync(directory).find((file) => file.endsWith('.frag'));
  const source = path.join(directory, file);
  return { file: source, body: '#define TransTc(p) vec2((p).x,1.0-(p).y)\n' + decoded(source) };
}
export function keySpline() {
  const file = path.join(
    downloads,
    'transition/2_Fast_Motion_Blur_Right/Data/Fast Motion Blur Right.frag',
  );
  return { file, body: decoded(file).split('vec4 LUT(')[0] };
}
export function dualBlur(input, start, offset, scale = 1) {
  const source = kernel('DualKawaseBlur');
  const values = {
    uBoundLeftX: '0.0',
    uBoundLeftY: '0.0',
    uBoundRightX: '1.0',
    uBoundRightY: '1.0',
    uViewSizeWidth: `max(1.0,floor(originalResolution.x*${Number(scale).toFixed(8)}))`,
    uViewSizeHeight: `max(1.0,floor(originalResolution.y*${Number(scale).toFixed(8)}))`,
    uOffset: offset,
    uIterations: '1',
    curIteration: '0',
    calLayer: '0',
  };
  return {
    files: [source.file],
    passes: [
      stage(source.body, [input], values, { scale: scale / 2 }),
      stage(source.body, [ref(start)], { ...values, calLayer: '1' }, { scale }),
    ],
  };
}
export function bloom(input, start, intensity, layers = 6, largeScale) {
  const source = kernel('Bloom');
  const passes = [],
    downs = [];
  const factor = largeScale
    ? '(max(originalResolution.x,originalResolution.y)>1000.0?0.5:1.0)'
    : '1.0';
  const size = (scale) => ({
    source_width: `max(1.0,floor(originalResolution.x*${scale.toFixed(8)}*${factor}))`,
    source_height: `max(1.0,floor(originalResolution.y*${scale.toFixed(8)}*${factor}))`,
    intensity,
    downsample: '1',
    upsample: '0',
  });
  let previous = input;
  for (let level = 1; level <= layers; level++) {
    downs.push(start + passes.length);
    passes.push(
      stage(source.body, [previous], size(2 ** (1 - level)), {
        scale: 2 ** -level,
        largeScale,
        format: 'rgba16f',
      }),
    );
    previous = ref(downs.at(-1));
  }
  for (let level = layers - 1; level >= 0; level--) {
    const current = start + passes.length;
    passes.push(
      stage(
        source.body,
        [level ? ref(downs[level - 1]) : input, previous],
        { ...size(2 ** (-level - 1)), downsample: '0', upsample: '1' },
        { scale: 2 ** -level, largeScale, format: 'rgba16f' },
      ),
    );
    previous = ref(current);
  }
  return { files: [source.file], passes };
}
export function beam(input, start) {
  const source = kernel('Beam Eclosion');
  const values = {
    uBoundLeftX: '0.0',
    uBoundLeftY: '0.0',
    uBoundRightX: '1.0',
    uBoundRightY: '1.0',
    uEclosion: '32',
    uViewSizeWidth: 'iResolution.x',
    uViewSizeHeight: 'iResolution.y',
    uHorizontal: '0',
    uChangeColor: '0',
    color_r: '255',
    color_g: '255',
    color_b: '255',
    Intensity: '1.0',
  };
  return {
    files: [source.file],
    passes: [
      stage(source.body, [input], values, { size: [508, 304] }),
      stage(source.body, [ref(start)], { ...values, uHorizontal: '1' }, { size: [508, 304] }),
    ],
  };
}
