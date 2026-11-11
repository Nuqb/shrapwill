import type { Clip } from '../../types';
import { bindMotionUniform } from './motionTransitions';
import { makeLut, opacityAt } from './color';
import { revealKinds, revealProgress } from './transitions';
import { hasPortedShader } from './ported/registry';

type ColorTexture = { lut: WebGLTexture | null; lutKey: string };
export function bindColorLut(gl: WebGL2RenderingContext, player: ColorTexture, clip: Clip) {
  const cp = clip.props;
  const key = [
    cp.brightness,
    JSON.stringify(cp.grade),
    cp.contrast,
    cp.saturation,
    cp.warmth,
    cp.tint,
    cp.sepia,
    cp.invert,
    cp.posterize,
    cp.filterStrength ?? 1,
  ].join('/');
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_3D, player.lut);
  if (key === player.lutKey) return;
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB8, 17, 17, 17, 0, gl.RGB, gl.UNSIGNED_BYTE, makeLut(clip));
  for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_3D, name, gl.LINEAR);
  for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R])
    gl.texParameteri(gl.TEXTURE_3D, name, gl.CLAMP_TO_EDGE);
  player.lutKey = key;
}

export function bindPictureUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  clip: Clip,
  frame: number,
) {
  const cp = clip.props;
  const shape = cp.grade?.vignetteSettings ?? [1, 0, 0.5, 0, 0.5];
  gl.uniform4f(
    gl.getUniformLocation(program, 'vignetteShape'),
    shape[0],
    shape[1],
    shape[2],
    shape[3],
  );
  gl.uniform1f(gl.getUniformLocation(program, 'vignetteHighlight'), shape[4]);
  gl.uniform1f(gl.getUniformLocation(program, 'sharpen'), cp.grade?.sharpen ?? 0);
  gl.uniform1f(gl.getUniformLocation(program, 'effectStrength'), cp.effectStrength ?? 1);
  gl.uniform1i(gl.getUniformLocation(program, 'creativeStyle'), cp.effectStyle || 0);
  gl.uniform1f(gl.getUniformLocation(program, 'creativeAmount'), cp.effectAmount || 0);
  bindMotionUniform(gl, program, clip);
  gl.uniform4f(
    gl.getUniformLocation(program, 'videoEffects'),
    cp.mosaic || 0,
    cp.rgbSplit || 0,
    cp.shake || 0,
    cp.mirror || 0,
  );
  gl.uniform3f(
    gl.getUniformLocation(program, 'extraEffects'),
    cp.wave || 0,
    cp.vignette || 0,
    cp.scanlines || 0,
  );
  gl.uniform1f(gl.getUniformLocation(program, 'effectFrame'), frame - clip.start);
  bindTransitionUniforms(gl, program, clip, frame);
  gl.uniform4f(
    gl.getUniformLocation(program, 'cropRect'),
    cp.cropLeft,
    cp.cropTop,
    1 - cp.cropLeft - cp.cropRight,
    1 - cp.cropTop - cp.cropBottom,
  );
}
function bindTransitionUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  clip: Clip,
  frame: number,
) {
  const ported = hasPortedShader(clip.transition?.kind || '');
  gl.uniform1f(
    gl.getUniformLocation(program, 'opacity'),
    ported ? clip.props.opacity : opacityAt(clip, frame),
  );
  gl.uniform1i(
    gl.getUniformLocation(program, 'reveal'),
    ported ? 0 : revealKinds.indexOf(clip.transition?.kind || '') + 1,
  );
  gl.uniform1f(
    gl.getUniformLocation(program, 'progress'),
    ported ? 1 : revealProgress(clip, frame),
  );
}
