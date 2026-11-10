import { defaults, type Clip, type Properties } from '../../../types';
import { createPictureProgram } from '../../preview/shader';
import { bindColorLut, bindPictureUniforms } from '../../preview/picture';
import { artPhoto, artScenesReady } from './scenes';
import { previewPhotoCount, previewPhotoIndex } from './photoSelection';
import { hasPortedShader } from '../../preview/ported/registry';
import { PortedPass } from '../../preview/ported/PortedPass';
import { SourcePass } from '../../preview/ported/SourcePass';

const cache = new Map<string, HTMLCanvasElement>();
const cacheLimit = 48;
function geometry(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, 1, 0, 0, -1, -1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, -1, -1, 0, 1, 1, -1, 1, 1,
    ]),
    gl.STATIC_DRAW,
  );
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
function texture(gl: WebGL2RenderingContext, scene: HTMLCanvasElement) {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
  for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
  for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
  return tex;
}
function artClip(props: Partial<Properties>, kind?: string, duration = 2): Clip {
  return {
    id: 'art',
    mediaId: null,
    name: 'Preview',
    start: 0,
    duration: Math.round(duration * 30),
    sourceIn: 0,
    link: null,
    audioEnabled: false,
    title: null,
    props: { ...defaults, ...props },
    transition: kind ? { kind, frames: Math.round(duration * 30) } : null,
  };
}
class ArtRenderer {
  canvas = document.createElement('canvas');
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  scenes: WebGLTexture[];
  color: { lut: WebGLTexture | null; lutKey: string };
  ported: PortedPass;
  originals: SourcePass;
  constructor() {
    this.canvas.width = 128;
    this.canvas.height = 72;
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw Error('Thumbnail renderer is unavailable');
    this.gl = gl;
    this.ported = new PortedPass(
      gl,
      () => {},
      false,
      async () => ({ eye: [0.5, 0.5], width: 0, height: 0 }),
    );
    this.originals = new SourcePass(gl, () => {});
    this.program = createPictureProgram(gl);
    gl.useProgram(this.program);
    geometry(gl, this.program);
    this.scenes = Array.from({ length: previewPhotoCount }, (_, index) =>
      texture(gl, artPhoto(index)),
    );
    this.color = { lut: gl.createTexture(), lutKey: '' };
    gl.viewport(0, 0, 128, 72);
  }
  draw(clip: Clip, scene: number, frame: number) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const input = this.originals.apply(this.scenes[scene], clip.props, {
      elapsed: frame / 30,
      duration: clip.duration / 30,
      width: 128,
      height: 72,
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, input);
    bindColorLut(gl, this.color, clip);
    bindPictureUniforms(gl, this.program, clip, frame);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  renderFrame(options: ArtFrame) {
    const { props = {}, kind, frame, duration } = options;
    const scene = previewPhotoIndex(options.sampleKey ?? kind ?? 'Original');
    const progress = frame / Math.max(1, Math.round(duration * 30));
    if (
      !this.originals.ready({ ...defaults, ...props }) ||
      (kind && hasPortedShader(kind) && !this.ported.ready(kind, progress, true, duration))
    )
      return false;
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    if (kind) this.draw(artClip({}, undefined, duration), scene, 0);
    if (kind && hasPortedShader(kind)) this.ported.capture(0, 128, 72);
    this.draw(
      artClip(props, kind, duration),
      kind ? (scene + 1) % previewPhotoCount : scene,
      frame,
    );
    if (kind && hasPortedShader(kind)) {
      this.ported.capture(1, 128, 72);
      this.ported.apply(kind, progress, duration);
    }
    return true;
  }
}
let renderer: ArtRenderer | undefined;
type ArtFrame = {
  sampleKey?: string;
  kind?: string;
  props?: Partial<Properties>;
  frame: number;
  duration: number;
  still?: boolean;
};
export function paintArt(canvas: HTMLCanvasElement, options: ArtFrame) {
  if (!artScenesReady()) return false;
  const key = JSON.stringify(options);
  let picture = options.still ? cache.get(key) : undefined;
  if (!picture) {
    renderer ||= new ArtRenderer();
    if (!renderer.renderFrame(options)) return false;
    if (options.still) {
      picture = document.createElement('canvas');
      picture.width = 128;
      picture.height = 72;
      picture.getContext('2d')!.drawImage(renderer.canvas, 0, 0);
      if (cache.size >= cacheLimit) cache.delete(cache.keys().next().value!);
      cache.set(key, picture);
    } else picture = renderer.canvas;
  }
  const ctx = canvas.getContext('2d');
  ctx?.clearRect(0, 0, 128, 72);
  ctx?.drawImage(picture, 0, 0);
  canvas.dataset.frame = String(options.frame);
  delete canvas.dataset.unavailable;
  return true;
}
