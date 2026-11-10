import fs from 'node:fs';
import path from 'node:path';
import { hash } from './filmora-resources.mjs';

// Original random values are constant for each 100-pixel block. Evaluate that
// expression once with explicit float32 steps, rather than different GPU sin implementations.
export function stabilizeRandomBlock(body, size, assets) {
  const dimension = Math.ceil(7680 / size) + 1;
  const bytes = Buffer.alloc(dimension * dimension * 16);
  const f = Math.fround,
    a = f(12.9898),
    b = f(78.233),
    c = f(43758.5453),
    pi = f(3.14);
  for (let y = 0; y < dimension; y++)
    for (let x = 0; x < dimension; x++) {
      const dt = f(f(f(x * size * 18) * a) + f(f(y * size * 18) * b));
      const sn = f(dt - f(pi * Math.floor(f(dt / pi))));
      const value = f(f(Math.sin(sn)) * c);
      const offset = (y * dimension + x) * 16;
      bytes.writeFloatLE(f(value - Math.floor(value)), offset);
      bytes.writeFloatLE(1, offset + 12);
    }
  const name = hash(bytes) + '.f32';
  fs.writeFileSync(path.join(assets, name), bytes);
  const adapted = body.replace(
    /float randomize\(vec2 coords\)\s*\{[^}]*\}/,
    `float randomize(vec2 coords){return INPUT2((floor(coords/(18.0*${size}.0))+vec2(.5))/${dimension}.0).r;}`,
  );
  if (adapted === body) throw Error('Unrecognized Random Block source');
  return {
    body: adapted,
    texture: { files: [name], format: 'rgba32f', width: dimension, height: dimension },
  };
}
