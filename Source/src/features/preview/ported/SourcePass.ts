import type { Properties } from '../../../types';
import { PortedPass } from './PortedPass';

export class SourcePass {
  private pass: PortedPass;
  private framebuffer: WebGLFramebuffer;
  private textures: WebGLTexture[];
  private sizes = ['', ''];
  constructor(
    private gl: WebGL2RenderingContext,
    changed: () => void,
  ) {
    this.pass = new PortedPass(gl, changed);
    this.framebuffer = gl.createFramebuffer()!;
    this.textures = [gl.createTexture()!, gl.createTexture()!];
  }
  ready(props: Properties) {
    return [
      [props.originalEffect, props.effectStrength ?? 1],
      [props.originalFilter, props.filterStrength ?? 1],
    ].every(([kind, strength]) => !kind || !strength || this.pass.ready(kind as string));
  }
  private output(index: number, width: number, height: number) {
    const gl = this.gl,
      output = this.textures[index],
      key = `${width}/${height}`;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, output);
    if (this.sizes[index] !== key) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
      this.sizes[index] = key;
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw Error('Cannot allocate original effect target');
    return output;
  }
  apply(
    input: WebGLTexture,
    props: Properties,
    timing: { elapsed: number; duration: number; width: number; height: number },
  ) {
    const kinds = [
      [props.originalEffect, props.effectStrength ?? 1],
      [props.originalFilter, props.filterStrength ?? 1],
    ] as const;
    const applied = kinds.filter(([kind, strength]) => kind && strength > 0);
    if (!applied.length) return input;
    const gl = this.gl,
      { width, height, elapsed, duration } = timing;
    const previous = gl.getParameter(gl.FRAMEBUFFER_BINDING),
      viewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, width, height);
    try {
      for (const [index, [kind, strength]] of applied.entries()) {
        const output = this.output(index, width, height);
        this.pass.bindSource(input);
        this.pass.apply(kind, elapsed / Math.max(duration, 0.000001), duration, strength);
        input = output;
      }
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, previous);
      gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
    }
    return input;
  }
  dispose() {
    this.pass.dispose();
    this.gl.deleteFramebuffer(this.framebuffer);
    for (const texture of this.textures) this.gl.deleteTexture(texture);
  }
}
