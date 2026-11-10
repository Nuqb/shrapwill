import fs from 'node:fs';
import path from 'node:path';
import { read, hash } from './filmora-resources.mjs';

export function importLut(file, info, target) {
  const source = read(file),
    bytes = fs.readFileSync(file);
  const size = Number(source.match(/^LUT_3D_SIZE\s+(\d+)/m)?.[1]);
  if (!Number.isInteger(size) || size < 2 || size > 64)
    throw Error('Unsupported original LUT size');
  const domain = (name) =>
    source
      .match(new RegExp(`^${name}\\s+([^\\n]+)`, 'm'))?.[1]
      .trim()
      .split(/\s+/)
      .map(Number);
  const min = domain('DOMAIN_MIN') || [0, 0, 0],
    max = domain('DOMAIN_MAX') || [1, 1, 1];
  const rows = source
    .split(/\r?\n/)
    .map((line) => line.split('#')[0].trim())
    .filter((line) => /^[+-]?(?:\d|\.\d)/.test(line))
    .map((line) => line.split(/\s+/).map(Number));
  if (
    rows.length !== size ** 3 ||
    rows.some((row) => row.length !== 3 || !row.every(Number.isFinite))
  )
    throw Error('Invalid original LUT data');
  const rgba = new Float32Array(size ** 3 * 4);
  for (const [index, row] of rows.entries()) rgba.set([...row, 1], index * 4);
  const data = Buffer.from(rgba.buffer),
    asset = hash(data) + '.f32';
  fs.writeFileSync(path.join(target, 'assets', asset), data);
  const key = hash(bytes),
    kind = 'filmora_lut_' + key.slice(0, 16),
    sourceFile = kind + '.cube';
  fs.writeFileSync(path.join(target, 'originals', sourceFile), bytes);
  const vec = (value) =>
    `vec3(${value.map((n) => (Number.isInteger(n) ? `${n}.0` : n)).join(',')})`;
  const body = `vec3 lutPoint(ivec3 p){return texelFetch(inputB,ivec2(p.x,p.y+p.z*${size}),0).rgb;}
vec4 FUNCNAME(vec2 tc){
vec4 original=INPUT1(tc);
vec3 p=clamp((original.rgb-${vec(min)})/(${vec(max)}-${vec(min)}),0.,1.)*${size - 1}.;
ivec3 a=ivec3(floor(p)),b=min(a+1,ivec3(${size - 1}));vec3 f=fract(p);
vec3 lo=mix(mix(lutPoint(a),lutPoint(ivec3(b.x,a.y,a.z)),f.x),mix(lutPoint(ivec3(a.x,b.y,a.z)),lutPoint(ivec3(b.x,b.y,a.z)),f.x),f.y);
vec3 hi=mix(mix(lutPoint(ivec3(a.x,a.y,b.z)),lutPoint(ivec3(b.x,a.y,b.z)),f.x),mix(lutPoint(ivec3(a.x,b.y,b.z)),lutPoint(b),f.x),f.y);
return vec4(mix(lo,hi,f.z),original.a);
}`;
  return {
    kind,
    name: info.name,
    category: info.category,
    family: 'filter',
    status: 'shader',
    sourceType: 'cube',
    sourceFile,
    sourceHash: key,
    body,
    defaults: {},
    preamble: '',
    textures: [{ files: [asset], format: 'rgba32f', width: size, height: size * size }],
    sceneInputs: 1,
    aliasOf: '',
    adaptations: [
      'original 3D LUT values stored as float32; explicit trilinear interpolation with original domain bounds',
    ],
  };
}
