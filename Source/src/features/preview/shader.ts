import { creativeEffectShader } from './creativeEffects';
import { revealShader } from './transitions';
import { motionShader } from './motionTransitions';
import { effectShader } from './effects';

function compile(gl: WebGL2RenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Preview shader failed';
    gl.deleteShader(shader);
    throw Error(message);
  }
  return shader;
}

export function createPictureProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(
    gl,
    gl.VERTEX_SHADER,
    `#version 300 es
    in vec2 position;in vec2 texcoord;out vec2 uv;
    void main(){uv=texcoord;gl_Position=vec4(position,0.,1.);}`,
  );
  const fragment = compile(
    gl,
    gl.FRAGMENT_SHADER,
    `#version 300 es
    precision highp float;precision highp sampler3D;
    in vec2 uv;uniform sampler2D source;uniform sampler3D lut;uniform float opacity;uniform float effectStrength;out vec4 color;
    ${revealShader}
    ${creativeEffectShader}
    ${effectShader.replace('vec4 effectSample', 'vec4 rawEffectSample')}
    vec4 effectSample(vec2 point){
      vec4 c=effectStrength>=1.?rawEffectSample(point):mix(texture(source,point),rawEffectSample(point),effectStrength);
      vec3 p=c.rgb*(16./17.)+vec3(.5/17.);
      return vec4(texture(lut,p).rgb,c.a);
    }
    ${motionShader}
    void main(){vec4 c=motionSample(uv);
    color=vec4(c.rgb,c.a*opacity*revealAlpha(uv));}`,
  );
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw Error('Could not initialize preview renderer');
  }
  return program;
}
