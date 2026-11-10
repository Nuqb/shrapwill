import {
  stage,
  ref,
  progress,
  dualBlur,
  bloom,
  beam,
  keySpline,
  kernel,
} from './filmora-stage-kernels.mjs';
import path from 'node:path';
import { downloads } from './filmora-resources.mjs';

function lightning(body) {
  const p = progress;
  const spline = keySpline();
  const glow = bloom(
    -1,
    1,
    `(${p}<0.45?0.0:0.6*(1.0-KeySpline(vec4(.52,.82,.56,1.0),clamp((${p}-.45)/.3,0.0,1.0)))*float(param_Glow)/100.0)`,
    2,
    0.5,
  );
  const frame =
    'max(0.0,floor(u_global_time*u_frame_rate+0.0001)-floor(0.25*u_total_time*u_frame_rate+0.0001))';
  const light = `floor(${frame}*(u_total_time>3.0?75.0/(u_total_time*u_frame_rate):1.0))`;
  return {
    passes: [
      stage(body, [0, 1, 2, 3], { uStep: '0', UseLight: `(${light}<25.0?1.0:0.0)` }),
      ...glow.passes.map((pass) => ({ ...pass, body: spline.body + pass.body })),
      stage(body, [ref(glow.passes.length), ref(glow.passes.length), 0, 1], {
        uStep: '1',
        UseLight: `(${light}<25.0?1.0:0.0)`,
      }),
    ],
    dependencies: [...glow.files, spline.file],
    sequence: 'lightning',
  };
}
function slideshow(body) {
  const spline = keySpline(),
    background = beam(1, 0),
    p = progress;
  const transform = `vec2 planeUV(vec2 tc){
float p=${p};float t=clamp((p-.3)/.4,0.,1.);float q=t<.5?t*2.:1.-(t-.5)*2.;
vec3 a=radians(vec3(t<.5?mix(0.,-88.,q):mix(-180.,-88.,q),mix(0.,40.,q),mix(0.,10.,q)));
float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx),ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy),rz=mat3(cz,sz,0.,-sz,cz,0.,0.,0.,1.);mat3 r=rz*rx*ry;
float z=p<.25?-KeySpline(vec4(.21,.44,.57,.83),p/.25):(p>.75?mix(-1.,0.,KeySpline(vec4(.21,.44,.57,.83),(p-.75)/.25)):-1.);
float aspect=originalResolution.x/originalResolution.y;float f=1./tan(radians(15.));
vec3 h0=vec3(f*r[0].x,f*aspect*r[0].y,-aspect*r[0].z),h1=vec3(f/aspect*r[1].x,f*r[1].y,-r[1].z),h2=vec3(0.,0.,3.735-z),v=vec3(tc*2.-1.,1.);
vec3 local=vec3(dot(cross(h1,h2),v),dot(cross(h2,h0),v),dot(cross(h0,h1),v));return local.xy/local.z*.5+.5;}
`;
  const plane = body
    .replace('customize_in vec2 vUV;', '')
    .replace(
      'vec2 uv = vUV;',
      'vec2 uv = planeUV(tc);if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return vec4(0.);',
    );
  const composite = body
    .replace('customize_in vec2 vUV;', '')
    .replace('vec2 uv = vUV;', 'vec2 uv = tc;');
  const intensity = `pow(cos(3.141592653*(2.0*${p}-1.0)/2.0),2.0)`;
  const blur = dualBlur(-3, 3, `(0.5*${intensity})`);
  return {
    passes: [
      ...background.passes,
      stage(spline.body + transform + plane, [0, 1], { uStep: '0', iPro: p, uBloomPro: intensity }),
      ...blur.passes,
      stage(composite, [-2, -5], { uStep: '1', iPro: p, uBloomPro: intensity }),
    ],
    dependencies: [
      ...background.files,
      ...blur.files,
      spline.file,
      path.join(downloads, 'transition/2_2_3D_Slideshow_Style_2/Data/3D Slideshow Style 2.vert'),
    ],
  };
}

function fastMotion(body) {
  const p = `clamp((${progress}-.35)/.3,0.,1.)`;
  const glow = bloom(-1, 1, `(0.1*pow(max(0.0,sin(${p}*3.141592653)),8.0))`, 6);
  return {
    passes: [
      stage(body, [0, 1, 1, 3], { uStep: '0', progress: p }),
      ...glow.passes,
      stage(body, [0, 1, ref(glow.passes.length), 3], { uStep: '1', progress: p }),
    ],
    dependencies: glow.files,
  };
}
function functionBlock(text, name) {
  const start = text.indexOf('float ' + name + '('),
    brace = text.indexOf('{', start);
  let depth = 1,
    end = brace + 1;
  while (depth && end < text.length) {
    if (text[end] === '{') depth++;
    if (text[end] === '}') depth--;
    end++;
  }
  return { start, end, text: text.slice(start, end) };
}
function flashHelpers(script) {
  const curves = [];
  const numbers = (text) =>
    text
      .slice(text.indexOf('(') + 1, -1)
      .split(',')
      .map((value) => {
        if (!/^[\s0-9.eE+*/()-]+$/.test(value)) throw Error('Invalid original curve constant');
        return Function('return (' + value + ')')();
      });
  for (let index = 1; index <= 5; index++) {
    const block = functionBlock(script, 'GetValue' + index).text;
    const vectors = (name) =>
      [
        ...block
          .match(new RegExp(name + '\\[\\d+\\]\\s*=\\s*\\{([^}]+)'))[1]
          .matchAll(/vec[24]\([^)]*\)/g),
      ].map((match) => match[0]);
    const times = vectors('timeFrame'),
      values = vectors('valueRange'),
      lines = vectors('lineRange');
    curves.push(
      times.map((time, i) => ({
        time: numbers(time),
        value: numbers(values[i]),
        bezier: numbers(lines[i]),
      })),
    );
  }
  return {
    body:
      Array.from({ length: 6 }, (_, i) => `#define GetValue${i + 1}(p) host_curve${i + 1}`).join(
        '\n',
      ) + '\n',
    curves,
  };
}
function flashZoom(body, script) {
  const helpers = flashHelpers(script),
    p = progress;
  const blur = `GetValue4(${p})`,
    scale = `(${p}<19.0/48.0?GetValue1(${p}):GetValue2(${p}))/100.0`;
  const values = {
    stepType: '0',
    mixImgIns: `step(19.0/48.0,${p})`,
    blurSize: `(${blur}*2.0)`,
    haloSize: '80.0',
    haloLastR: '12.8033',
    scaleIns: scale,
    glowValue: `GetValue3(${p})`,
    alphaValue: `(GetValue5(${p})/100.0)`,
    aIns: `(GetValue6(${p})/100.0)`,
  };
  const d = dualBlur(-1, 1, blur, 0.5);
  const passes = [
    stage(body, [1, 0], values),
    ...d.passes,
    stage(body, [ref(2), 1], { ...values, stepType: '1' }, { scale: 0.5 }),
    stage(body, [ref(3), 1], { ...values, stepType: '2' }),
  ];
  return {
    passes: passes.map((pass) => ({ ...pass, body: helpers.body + '\n' + pass.body })),
    dependencies: d.files,
    curves: helpers.curves,
  };
}
function leftEye(body) {
  const spline = keySpline(),
    p = progress;
  const scale = `(${p}<0.5?mix(1.0,0.01,KeySpline(vec4(.12,.73,.27,.8),${p}*2.0)):(${p}<0.95?mix(.01,1.0,KeySpline(vec4(.63,.09,.89,.28),(${p}-.5)/.45)):1.0))`;
  return {
    passes: [
      stage(spline.body + body, [0, 1], {
        Process: p,
        uScale: scale,
        leftEye: 'host_eye',
        StepType: '0',
      }),
    ],
    dependencies: [spline.file],
    analysis: 'switch-face',
    switchInput: true,
  };
}
function zoomGhost(body) {
  const direction = kernel('Direction_blur');
  const strength = `int(floor(10.0*max(0.0,1.0-pow(abs(6.0*${progress}-3.0),2.0))))`;
  return {
    passes: [
      stage(body, [0, 1, 2, 1], { StepType: '1', iTime: progress }, { size: [548, 308] }),
      stage(
        direction.body,
        [1],
        { direction: '0.0', blur_length: strength, orig_roi: 'vec4(0.0,0.0,1.0,1.0)' },
        { size: [548, 308] },
      ),
      stage(body, [0, 1, -1, -2], { StepType: '0', iTime: progress }),
    ],
    dependencies: [direction.file],
    analysis: 'incoming-person',
    textures: [{ files: [], format: 'person-mask', width: 192, height: 192 }],
  };
}
export function transitionHost(name, body, script) {
  if (name === 'Fast Motion Blur Right') return fastMotion(body);
  if (name === 'Flash Zoom Out') return flashZoom(body, script);
  if (name === 'Left Eye Zoom') return leftEye(body);
  if (name === 'Zoom Ghost') return zoomGhost(body);
  if (name === 'Lightning Zoom') return lightning(body);
  if (name === '3D Slideshow Style 2') return slideshow(body);
}
