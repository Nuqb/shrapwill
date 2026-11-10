import { PreviewAudio } from './audio';
import type { RenderClip, RenderPlan } from '../../types';
import { fpsOf } from '../../types';
import { createPictureProgram } from './shader';
import { bindColorLut, bindPictureUniforms } from './picture';
import { createPreviewElement } from './mediaElements';
import { hasPortedShader } from './ported/registry';
import { PortedPass } from './ported/PortedPass';
import { SourcePass } from './ported/SourcePass';
import { playbackCandidates } from './playbackIndex';
type Player = {
  el: HTMLVideoElement | HTMLAudioElement | HTMLImageElement;
  tex: WebGLTexture | null;
  lut: WebGLTexture | null;
  lutKey: string;
  source: string;
  gain?: GainNode;
  node?: MediaElementAudioSourceNode;
  lastUsed: number;
};
export class Compositor {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  players = new Map<string, Player>();
  sound = new PreviewAudio(() => this.dirty++);
  error?: string;
  dirty = 0;
  failedMedia = new Set<string>();
  private ported: PortedPass;
  private originals: SourcePass;
  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl)
      throw Error(
        'This computer could not initialize the video preview. Update your graphics driver.',
      );
    this.gl = gl;
    this.ported = new PortedPass(gl, () => this.dirty++);
    this.originals = new SourcePass(gl, () => this.dirty++);
    const program = createPictureProgram(gl);
    this.program = program;
    this.buffer = gl.createBuffer()!;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    for (const [name, offset] of [
      ['position', 0],
      ['texcoord', 8],
    ] as const) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 16, offset);
    }
    gl.uniform1i(gl.getUniformLocation(program, 'source'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'lut'), 1);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  resume() {
    this.sound.resume();
  }
  player(rc: RenderClip) {
    let p = this.players.get(rc.clip.id);
    if (p && p.source !== rc.source) {
      this.release(rc.clip.id);
      p = undefined;
    }
    if (p) return p;
    const el = createPreviewElement(rc, (id) => {
      this.dirty++;
      if (id) this.failedMedia.add(id);
    });
    const gl = this.gl;
    p = {
      el,
      tex: rc.kind === 'video' ? gl.createTexture() : null,
      lut: rc.kind === 'video' ? gl.createTexture() : null,
      lutKey: '',
      source: rc.source,
      lastUsed: performance.now(),
    };
    if (p.tex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    this.players.set(rc.clip.id, p);
    return p;
  }
  draw(
    plan: RenderPlan,
    frame: number,
    options: { playing: boolean; muted: boolean; volume: number; quality: number },
  ) {
    const { playing, muted, volume, quality } = options;
    this.sound.setOutput(volume, muted);
    const gl = this.gl;
    if (
      this.canvas.width !== Math.round((plan.width / plan.height) * quality) ||
      this.canvas.height !== quality
    ) {
      this.canvas.width = Math.round((plan.width / plan.height) * quality);
      this.canvas.height = quality;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    const fps = fpsOf(plan.fps);
    const { active, upcoming } = playbackCandidates(plan, frame);
    if (active.length > 8) {
      this.error =
        'Too many layers are playing at once. Hide or mute a track to continue previewing. Your export still includes all enabled layers.';
      for (const id of [...this.players.keys()]) this.release(id);
      return;
    }
    this.error = undefined;
    const wanted = new Set([...active, ...upcoming].map((rc) => rc.clip.id));
    for (const [id] of this.players) {
      if (!wanted.has(id)) this.release(id);
    }
    for (const rc of [...active, ...upcoming]) {
      if (!rc.previewReady) continue;
      const p = this.player(rc);
      p.lastUsed = performance.now();
      if (!active.includes(rc)) continue;
      const c = rc.clip;
      const el = p.el;
      const time = c.sourceIn + (frame - c.start) / fps;
      if (el instanceof HTMLMediaElement) {
        this.sound.sync(p, rc, frame, playing);
        if (
          !el.seeking &&
          Number.isFinite(el.duration) &&
          Math.abs(el.currentTime - time) > (playing ? 0.12 : 0.012)
        ) {
          el.currentTime = Math.min(time, Math.max(0, el.duration - 0.001));
        }
        if (playing) {
          if (el.paused) void el.play().catch(() => {});
        } else el.pause();
      }
      if (rc.kind !== 'video' || !p.tex) continue;
      if (el instanceof HTMLMediaElement && el.readyState < 2) continue;
      if (el instanceof HTMLImageElement && (!el.complete || el.naturalWidth === 0)) continue;
      const cp = c.props;
      if (!this.originals.ready(cp)) continue;
      if (
        c.transition &&
        hasPortedShader(c.transition.kind) &&
        !this.ported.ready(
          c.transition.kind,
          (frame - c.start) / Math.max(1, c.transition.frames),
          false,
          c.transition.frames / fps,
        )
      )
        continue;
      const cl = cp.cropLeft,
        cr = cp.cropRight,
        ct = cp.cropTop,
        cb = cp.cropBottom;
      const cw = rc.width * (1 - cl - cr),
        ch = rc.height * (1 - ct - cb);
      const fit = Math.min(plan.width / cw, plan.height / ch) * cp.scale;
      const w = cw * fit,
        h = ch * fit;
      const a = (cp.rotation * Math.PI) / 180,
        cos = Math.cos(a),
        sin = Math.sin(a);
      const corners = [
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 1],
        [1, 0],
        [1, 1],
      ];
      const vertices = new Float32Array(
        corners.flatMap(([x, y]) => {
          const px = (x - 0.5) * w,
            py = (y - 0.5) * h;
          return [
            (px * cos - py * sin + cp.x) / (plan.width / 2),
            -(px * sin + py * cos + cp.y) / (plan.height / 2),
            cl + x * (1 - cl - cr),
            ct + y * (1 - ct - cb),
          ];
        }),
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el as TexImageSource);
      } catch {
        this.error = 'Preview media could not be read. Try rebuilding preview media.';
        continue;
      }
      bindColorLut(gl, p, c);
      const source = this.originals.apply(p.tex, cp, {
        elapsed: (frame - c.start) / fps,
        duration: c.duration / fps,
        width:
          el instanceof HTMLVideoElement ? el.videoWidth : (el as HTMLImageElement).naturalWidth,
        height:
          el instanceof HTMLVideoElement ? el.videoHeight : (el as HTMLImageElement).naturalHeight,
      });
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, source);
      bindPictureUniforms(gl, this.program, c, frame);
      const transition = c.transition;
      const ported =
        transition && hasPortedShader(transition.kind) && frame - c.start < transition.frames;
      if (ported) this.ported.capture(0, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (ported && transition) {
        this.ported.frameRate = fps;
        this.ported.capture(1, this.canvas.width, this.canvas.height);
        this.ported.apply(
          transition.kind,
          (frame - c.start) / transition.frames,
          transition.frames / fps,
        );
      }
    }
  }
  pause() {
    for (const player of this.players.values()) {
      if (player.el instanceof HTMLMediaElement) player.el.pause();
    }
  }
  release(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.el instanceof HTMLMediaElement) {
      p.el.pause();
      p.el.removeAttribute('src');
      p.el.load();
    }
    p.node?.disconnect();
    p.gain?.disconnect();
    if (p.tex) this.gl.deleteTexture(p.tex);
    if (p.lut) this.gl.deleteTexture(p.lut);
    this.players.delete(id);
  }
  destroy() {
    this.ported.dispose();
    this.originals.dispose();
    for (const id of [...this.players.keys()]) this.release(id);
    this.sound.destroy();
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.buffer);
  }
}
