import {
  analyzeTransitionFrame,
  type AnalysisFrame,
  type AnalysisResult,
} from '../../../services/desktop/analysis';
import type { OriginalProgram } from './registry';

export type AnalysisBackend = (frame: AnalysisFrame) => Promise<AnalysisResult>;
export class SceneAnalysis {
  private results = new Map<string, AnalysisResult>();
  private pending = false;
  private error = '';
  private alive = true;
  private mask: WebGLTexture;
  private read: WebGLFramebuffer;
  private target: WebGLFramebuffer;
  private small: WebGLTexture;
  eye = [0.5, 0.5];
  constructor(
    private gl: WebGL2RenderingContext,
    private changed: () => void,
    private backend: AnalysisBackend = analyzeTransitionFrame,
  ) {
    this.mask = gl.createTexture()!;
    this.small = gl.createTexture()!;
    this.read = gl.createFramebuffer()!;
    this.target = gl.createFramebuffer()!;
    const bound = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, this.mask);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      192,
      192,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(192 * 192 * 4),
    );
    for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
    for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, bound);
  }
  private pixels(texture: WebGLTexture, width: number, height: number) {
    const gl = this.gl,
      scale = Math.min(1, 384 / Math.max(width, height)),
      w = Math.max(1, Math.round(width * scale)),
      h = Math.max(1, Math.round(height * scale));
    const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
      draw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
      bound = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const pixels = new Uint8Array(w * h * 4);
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.small);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.read);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.target);
      gl.framebufferTexture2D(
        gl.DRAW_FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.small,
        0,
      );
      gl.blitFramebuffer(0, 0, width, height, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.target);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    } finally {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw);
      gl.bindTexture(gl.TEXTURE_2D, bound);
    }
    return { width: w, height: h, pixels: Array.from(pixels) };
  }
  private upload(result: AnalysisResult) {
    this.eye = result.eye;
    if (!result.mask) return;
    const gl = this.gl,
      bytes = Uint8Array.from(atob(result.mask), (char) => char.charCodeAt(0)),
      flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),
      bound = gl.getParameter(gl.TEXTURE_BINDING_2D);
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.mask);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        result.width,
        result.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        bytes,
      );
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
    } finally {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
      gl.bindTexture(gl.TEXTURE_2D, bound);
    }
  }
  prepare(source: OriginalProgram, scenes: WebGLTexture[], phase: number, size: number[]) {
    if (!source.analysis) return true;
    if (this.error) throw Error(this.error);
    const mode = source.analysis === 'incoming-person' ? 'person' : 'face';
    const frame = {
      mode,
      ...this.pixels(scenes[mode === 'person' || phase > 0.5 ? 1 : 0], size[0], size[1]),
    } satisfies AnalysisFrame;
    let hash = 2166136261;
    for (const byte of frame.pixels) hash = Math.imul(hash ^ byte, 16777619);
    const key = `${mode}/${frame.width}/${frame.height}/${hash}`;
    const known = this.results.get(key);
    if (known) {
      this.upload(known);
      return true;
    }
    if (!this.pending) {
      this.pending = true;
      void this.backend(frame)
        .then((result) => {
          if (!this.alive) return;
          if (this.results.size >= 16) this.results.delete(this.results.keys().next().value!);
          this.results.set(key, result);
        })
        .catch((error) => {
          this.error = 'Local subject analysis failed: ' + String(error);
        })
        .finally(() => {
          this.pending = false;
          if (this.alive) this.changed();
        });
    }
    return false;
  }
  bind() {
    this.gl.activeTexture(this.gl.TEXTURE4);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.mask);
  }
  dispose() {
    this.alive = false;
    this.results.clear();
    for (const texture of [this.mask, this.small]) this.gl.deleteTexture(texture);
    for (const framebuffer of [this.read, this.target]) this.gl.deleteFramebuffer(framebuffer);
  }
}
