import motions from '../library/catalog/motion-transitions.json' with { type: 'json' };
import type { Clip } from '../../types';
import { hasPortedShader } from './ported/registry';

export function bindMotionUniform(gl: WebGL2RenderingContext, program: WebGLProgram, clip: Clip) {
  const d = hasPortedShader(clip.transition?.kind || '')
    ? undefined
    : motions.find((item) => item.kind === clip.transition?.kind);
  gl.uniform4f(
    gl.getUniformLocation(program, 'motion'),
    d?.dx || 0,
    d?.dy || 0,
    d?.zoom || 0,
    d?.blur || 0,
  );
  gl.uniform4f(
    gl.getUniformLocation(program, 'motionShape'),
    d?.spin || 0,
    d?.warp || 0,
    d?.pixel || 0,
    d?.glitch || 0,
  );
  gl.uniform4f(
    gl.getUniformLocation(program, 'motionColor'),
    d?.flash || 0,
    d?.grayscale || 0,
    d?.tint || 0,
    d?.seed || 0,
  );
  gl.uniform1i(gl.getUniformLocation(program, 'motionMask'), d?.mask || 0);
  gl.uniform1f(gl.getUniformLocation(program, 'motionEnabled'), d ? 1 : 0);
}

// Fixed five-sample budget, shared normalized geometry and masks with native export.
export const motionShader = `
uniform vec4 motion;
uniform vec4 motionShape;
uniform vec4 motionColor;
uniform int motionMask;
uniform float motionEnabled;
float motionCoverage(vec2 p) {
  float value = 0.;
  if (motionMask == 1) value = abs(p.x-.5)*2.;
  if (motionMask == 2) value = (p.x+p.y)*.5;
  if (motionMask == 3) value = (atan(p.y-.5,p.x-.5)+3.141592654)/6.283185307;
  if (motionMask == 4) value = mod(floor(p.x*31.)*17.+floor(p.y*23.)*13.+motionColor.w,97.)/97.;
  if (motionMask == 5) value = clamp(length(p-.5)*1.414213562*(1.+.2*cos(atan(p.y-.5,p.x-.5)*6.)),0.,1.);
  if (motionMask == 6) value = max(abs(p.x-.5),abs(p.y-.5))*2.;
  return motionMask == 0 ? progress : (progress > value ? 1. : 0.);
}
vec4 motionSample(vec2 point) {
  if (motionEnabled < .5 || progress >= 1.) return effectSample(point);
  float ease = (1.-progress)*(1.-progress);
  vec2 p = (point-cropRect.xy)/cropRect.zw;
  vec2 v = p-.5;
  float angle = motionShape.x*ease;
  vec2 rotated = vec2(v.x*cos(angle)-v.y*sin(angle),v.x*sin(angle)+v.y*cos(angle));
  vec2 q = rotated/(1.+motion.z*ease)*(1.+motionShape.y*dot(v,v)*ease)+.5+motion.xy*ease;
  if (motionShape.z > 0.) {
    float block = max(.0001,motionShape.z*ease);
    q = (floor(q/block)+.5)*block;
  }
  q.x += motionShape.w*ease*sin(floor(p.y*24.)*12.+motionColor.w+progress*25.);
  vec4 result = vec4(0.);
  for (int i=0; i<5; i++) {
    float trail = float(i-2)*.5*motion.w*ease;
    vec2 direction = length(motion.xy) > 0. ? motion.xy : v;
    result += effectSample(cropRect.xy+clamp(q+direction*trail,0.,1.)*cropRect.zw)/5.;
  }
  float gray = dot(result.rgb,vec3(.2126,.7152,.0722));
  result.rgb = mix(result.rgb,vec3(gray),motionColor.y*ease);
  result.r += motionColor.z*ease;
  result.b -= motionColor.z*ease;
  result.rgb = clamp(result.rgb+motionColor.x*4.*progress*(1.-progress),0.,1.);
  result.a *= motionCoverage(p);
  return result;
}`;
