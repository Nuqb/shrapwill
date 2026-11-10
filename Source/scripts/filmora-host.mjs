// Offline adapters. The application executes these compiled-in GPU stages, never Filmora scripts.
import fs from 'node:fs';
import path from 'node:path';
import { decoded, hash, installation } from './filmora-resources.mjs';
import { transitionHost } from './filmora-transition-hosts.mjs';

const code = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const stage = (body, inputs, values, geometry = {}) => ({
  body:
    Object.entries(values)
      .map(([name, value]) => `#define param_${name} ${value}`)
      .join('\n') +
    '\n' +
    body,
  inputs,
  ...geometry,
});

function plainScript(script) {
  let active = code(script);
  const timing = /SetFloatParam\("eItime",\s*iGlobalTime\)/.test(active);
  active = active.replace(/void NewCustomizeParameter\(\)\s*\{[^{}]*\}/, '');
  active = active.replace(/int Running\([^)]*\)\s*\{/, '').replace(/\}\s*$/, '');
  active = active.replace(
    /(?:int ret = 0|int nInputIndex = 0|SetInputFilterData\(nInputIndex, src_fg_data\)|SetInputTextures\(nInputIndex\)|(?:ret = |return )?DoEffect\(dst_data\)|return ret)\s*;/g,
    '',
  );
  if (timing)
    active = active.replace(
      /float frame_rate = float\(GetFrameRate\(\)\);|float iGlobalTime = float\(GetCurrentTime\(\)\) \/ frame_rate;|SetFloatParam\("eItime", iGlobalTime\);/g,
      '',
    );
  if (active.trim()) return;
  return timing ? { eItime: 'u_global_time' } : {};
}

function sourceStages(name, body) {
  if (['Bokeh Blur', 'Iris Blur', 'Camera Focus Bokeh'].includes(name)) {
    const dynamic =
      name === 'Camera Focus Bokeh'
        ? { iPro: 'min(u_global_time / mix(6.72,2.24,float(param_Speed)/100.0),1.0)' }
        : {};
    return [
      stage(body, [0], { ...dynamic, uStep: '0' }, { scale: 0.5 }),
      stage(body, [0, -1], { ...dynamic, uStep: '1' }),
    ];
  }
  if (name === 'ComicBook')
    return [
      stage(body, [0, 0], { uStep: '0' }, { size: [548, 308] }),
      stage(body, [0, -1], { uStep: '1' }),
    ];
  if (name === 'GlowEffect')
    return [
      stage(body, [0, 0], { stepType: '1' }),
      stage(body, [-1, 0], { stepType: '2' }),
      stage(body, [-2, 0], { stepType: '3' }),
    ];
}

function blurStages(input, offset) {
  const file = path.join(
    installation,
    'resources/wfx_effect/nle_default/BaseFilter/DualKawaseBlur/Data/DualKawaseBlur.frag',
  );
  const body = '#define TransTc(p) (p)\n' + decoded(file);
  const values = {
    uBoundLeftX: '0.0',
    uBoundLeftY: '0.0',
    uBoundRightX: '1.0',
    uBoundRightY: '1.0',
    uViewSizeWidth: '(iResolution.x*2.0)',
    uViewSizeHeight: '(iResolution.y*2.0)',
    uOffset: offset,
    uIterations: '1',
    curIteration: '0',
    calLayer: '0',
  };
  return {
    file,
    stages: [
      stage(body, [input], values, { scale: 0.25 }),
      stage(
        body,
        [-2],
        {
          ...values,
          uViewSizeWidth: 'iResolution.x',
          uViewSizeHeight: 'iResolution.y',
          curIteration: '0',
          calLayer: '1',
        },
        { scale: 0.5 },
      ),
    ],
  };
}

function transitionStages(name, body) {
  if (!['Halo Blur', 'Rotary Zoom'].includes(name)) return;
  const progress = 'min(u_global_time/u_total_time,1.0)';
  const intensity = `(1.0-abs(2.0*${progress}-1.0))`;
  const curve =
    name === 'Halo Blur'
      ? `(${progress}<0.5?4.0*pow(${progress},3.0):1.0-4.0*pow(1.0-${progress},3.0))`
      : `(${progress}<0.5?3.0*pow(${progress},3.0):1.0-3.0*pow(1.0-${progress},3.0))`;
  const blur = blurStages(-1, name === 'Halo Blur' ? `(${intensity}*2.0)` : `(${intensity}*2.25)`);
  let lastR = 1;
  for (let i = 0; i < 80; i++) lastR += 1 / lastR;
  const values = {
    stepType: '0',
    progress: curve,
    blurSize: name === 'Halo Blur' ? `(${intensity}*3.0)` : `(-${intensity}*4.5)`,
    haloSize: '80.0',
    haloLastR: String(lastR),
    rotAngle: '0.0',
  };
  return {
    passes: [
      stage(body, [0, 1], values),
      ...blur.stages,
      stage(body, [-3], { ...values, stepType: '1' }, { scale: 0.5 }),
      stage(body, [-4], { ...values, stepType: '2' }),
    ],
    dependencies: [blur.file],
  };
}

export function importHost({ all, body, name, sceneInputs = 1 }) {
  const scriptFile = all.find((file) => file.endsWith('.effect'));
  if (!scriptFile) return;
  const script = decoded(scriptFile);
  let passes,
    dependencies = [],
    bindTextures = false;
  if (sceneInputs === 2) {
    const adapted = transitionStages(name, body) ?? transitionHost(name, body, script);
    if (!adapted) return;
    ({ passes, dependencies } = adapted);
    return {
      passes,
      files: [scriptFile, ...dependencies],
      analysis: adapted.analysis,
      textures: adapted.textures,
      switchInput: adapted.switchInput,
      sequence: adapted.sequence,
      curves: adapted.curves,
      adaptations: ['compiled the original host script into bounded local GPU stages'],
    };
  } else {
    passes = sourceStages(name, body);
    if (!passes) {
      const values = plainScript(script);
      if (!values) return;
      passes = [stage(body, [0], values)];
      bindTextures = true;
    }
  }
  return {
    passes,
    bindTextures,
    files: [scriptFile, ...dependencies],
    adaptations: [
      'replaced script host with bundled Shrapwill render stages; preserved source sampling, timing and RGBA intermediates',
    ],
  };
}

export function preserveHostFiles(host, origins, kind) {
  return host.files.map((file, index) => {
    const sourceFile = `${kind}-host-${index}${path.extname(file)}`,
      bytes = fs.readFileSync(file);
    fs.writeFileSync(path.join(origins, sourceFile), bytes);
    return { sourceFile, sourceHash: hash(bytes) };
  });
}
