import type { Clip } from '../../types';

export function withoutFilter(clip: Clip): Clip {
  return {
    ...clip,
    props: {
      ...clip.props,
      filterStrength: 0,
      grade: clip.props.grade ? { ...clip.props.grade, sharpen: 0 } : undefined,
    },
  };
}

export function comparisonScissor(
  gl: WebGL2RenderingContext,
  split: number | null,
  original = false,
) {
  if (split === null) {
    gl.disable(gl.SCISSOR_TEST);
    return;
  }
  const x = Math.round(gl.drawingBufferWidth * Math.max(0, Math.min(1, split)));
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(original ? x : 0, 0, original ? gl.drawingBufferWidth - x : x, gl.drawingBufferHeight);
}
