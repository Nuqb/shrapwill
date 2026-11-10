import manifest from './manifest.json' with { type: 'json' };
import effects from './effects-manifest.json' with { type: 'json' };
import type { CurveSegment } from './AnimationCurves';

export type OriginalProgram = {
  kind: string;
  name: string;
  status: string;
  body: string;
  preamble: string;
  sceneInputs?: number;
  textures?: {
    files: string[];
    browserFrames?: string[];
    format?: string;
    timing?: string;
    width?: number;
    height?: number;
    fps?: number;
    frameCount?: number;
  }[];
  passes?: RenderStage[];
  analysis?: string;
  switchInput?: boolean;
  curves?: CurveSegment[][];
};
export type RenderStage = {
  body: string;
  inputs: number[];
  scale?: number;
  size?: number[];
  format?: string;
  largeScale?: number;
};

export const portedShaders = manifest.filter(
  (entry) => entry.status === 'shader' && !entry.utility && !entry.aliasOf,
);
const programs = new Map<string, OriginalProgram>(
  [...manifest, ...effects]
    .filter((entry) => ['shader', 'requires-host-random-semantics'].includes(entry.status))
    .map((entry) => [entry.kind, entry]),
);
export const portedShader = (kind: string) => programs.get(kind);
export const hasPortedShader = (kind: string) => programs.has(kind);

// Only the host interface changes. The imported transition body retains its equations,
// timing, branches and sample loops. Original file hashes are stored in the manifest.
export function fragmentSource(
  body: string,
  sourceOrientation = false,
  inputFlips = [sourceOrientation],
) {
  return `#version 300 es
precision highp float;
precision highp int;
#define iResolutionOrig originalResolution
#define FUNCNAME transition
#define u_total_len u_total_time
#define u_current_pos u_global_time
#define param_global_time u_global_time
#define param_total_time u_total_time
#define param_total_len u_total_time
#define param_current_pos u_global_time
#define param_frame_rate u_frame_rate
#define INPUT(p) INPUT1(p)
${Array.from({ length: 8 }, (_, i) => `#define INPUT${i + 1}(p) texture(input${String.fromCharCode(65 + i)},${inputFlips[i] ? 'vec2((p).x,1.-(p).y)' : 'p'})`).join('\n')}
#define texture2D texture
uniform sampler2D inputA;
uniform sampler2D hostOriginal;
uniform float host_strength;
uniform sampler2D inputB;
uniform sampler2D inputC,inputD,inputE,inputF,inputG,inputH;
uniform float u_global_time;
uniform float u_total_time;
uniform float u_frame_rate;
uniform vec2 host_eye;
uniform float host_curve1,host_curve2,host_curve3,host_curve4,host_curve5,host_curve6;
uniform vec2 iResolution;
uniform vec2 originalResolution;
in vec2 portUV;
out vec4 portColor;
${body.replace(/PREFIX\(\s*(\w+)\s*\)/g, 'param_$1').replace(/precision\s+mediump\s+float\s*;/g, 'precision highp float;')}
void main(){
vec2 point=(floor(gl_FragCoord.xy)+vec2(.5))/iResolution;
${sourceOrientation ? 'point.y=(iResolution.y-floor(gl_FragCoord.y)-.5)/iResolution.y;' : ''}
vec4 result=transition(point);
portColor=host_strength>=1.?result:mix(texture(hostOriginal,portUV),clamp(result,0.,1.),host_strength);}`;
}
