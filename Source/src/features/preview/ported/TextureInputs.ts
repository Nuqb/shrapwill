import { VideoTexture } from './VideoTexture';
import { videoPhase } from './SequenceTiming';
import type { OriginalProgram } from './registry';

type Specification = NonNullable<OriginalProgram['textures']>[number];
type Payload = HTMLImageElement | HTMLCanvasElement | Float32Array | VideoTexture;
type Loaded = {
  textures: WebGLTexture[][];
  ready: boolean;
  bytes: number;
  error?: string;
  videos?: (VideoTexture | undefined)[];
};
const urls = import.meta.glob(['./assets/*', '!./assets/*.mp4'], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const byteBudget = 64 * 1024 * 1024;

async function decode(
  specification: Specification,
  options: { changed: () => void; sampleVideos: boolean },
): Promise<Payload[]> {
  if (specification.format === 'person-mask') {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    return [canvas];
  }
  if (specification.format === 'video') {
    const video = await new VideoTexture(
      (specification.browserFrames ?? []).map((name) => urls['./assets/' + name]),
      options.changed,
    ).load();
    return options.sampleVideos ? video.samples() : [video];
  }
  return Promise.all(
    specification.files.map(async (name) => {
      const url = urls['./assets/' + name];
      if (!url) throw Error('Missing original texture ' + name);
      if (specification.format === 'rgba32f') {
        const response = await fetch(url);
        if (!response.ok) throw Error('Cannot read original LUT');
        return new Float32Array(await response.arrayBuffer());
      }
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    }),
  );
}
function byteSize(payload: Payload) {
  if (payload instanceof VideoTexture)
    return payload.element.naturalWidth * payload.element.naturalHeight * 4;
  if (payload instanceof HTMLCanvasElement) return payload.width * payload.height * 4;
  return payload instanceof Float32Array
    ? payload.byteLength
    : payload.naturalWidth * payload.naturalHeight * 4;
}
function release(gl: WebGL2RenderingContext, entry: Loaded) {
  for (const video of entry.videos ?? []) video?.dispose();
  for (const group of entry.textures) for (const texture of group) gl.deleteTexture(texture);
}
function disposePayloads(images: Payload[][]) {
  for (const payload of images.flat()) if (payload instanceof VideoTexture) payload.dispose();
}
function upload(gl: WebGL2RenderingContext, payload: Payload, specification: Specification) {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const floating = payload instanceof Float32Array;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !floating);
  if (floating) {
    if (payload.length !== specification.width! * specification.height! * 4)
      throw Error('Invalid original LUT texture');
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      specification.width!,
      specification.height!,
      0,
      gl.RGBA,
      gl.FLOAT,
      payload,
    );
  } else
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      payload instanceof VideoTexture ? payload.element : payload,
    );
  for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, key, floating ? gl.NEAREST : gl.LINEAR);
  for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
  return texture;
}
export class TextureInputs {
  private cache = new Map<string, Loaded>();
  constructor(
    private gl: WebGL2RenderingContext,
    private changed: () => void,
    private sampleVideos = false,
  ) {}
  private evict(exclude: string) {
    const candidate = [...this.cache].find(
      ([kind, entry]) => kind !== exclude && (entry.ready || entry.error),
    );
    if (!candidate) return false;
    release(this.gl, candidate[1]);
    this.cache.delete(candidate[0]);
    return true;
  }
  ready(source: OriginalProgram, progress = 0, exact = true, duration = 1) {
    if (!source.textures?.length) return true;
    let entry = this.cache.get(source.kind);
    if (!entry) {
      if (this.cache.size >= 16 && !this.evict(source.kind)) return false;
      entry = { textures: [], ready: false, bytes: 0 };
      this.cache.set(source.kind, entry);
      void this.load(source, entry);
    } else {
      this.cache.delete(source.kind);
      this.cache.set(source.kind, entry);
    }
    if (entry.error) throw Error(entry.error);
    return (
      entry.ready &&
      (entry.videos ?? []).every(
        (video, index) =>
          !video || video.ready(videoPhase(source.textures![index], progress, duration), exact),
      )
    );
  }
  private allocate(source: OriginalProgram, images: Payload[][]) {
    const gl = this.gl;
    const active = gl.getParameter(gl.ACTIVE_TEXTURE),
      bound = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    try {
      return images.map((group, index) =>
        group.map((payload) => upload(gl, payload, source.textures![index])),
      );
    } finally {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
      gl.activeTexture(active);
      gl.bindTexture(gl.TEXTURE_2D, bound);
    }
  }
  private async load(source: OriginalProgram, entry: Loaded) {
    try {
      const images = await Promise.all(
        source.textures!.map((spec) =>
          decode(spec, { changed: this.changed, sampleVideos: this.sampleVideos }),
        ),
      );
      if (this.cache.get(source.kind) !== entry) {
        disposePayloads(images);
        return;
      }
      entry.videos = images.map((group) =>
        group[0] instanceof VideoTexture ? group[0] : undefined,
      );
      const bytes = images.flat().reduce((sum, image) => sum + byteSize(image), 0);
      if (bytes > byteBudget)
        throw Error('Original texture set exceeds the 64 MiB graphics budget');
      const used = () => [...this.cache.values()].reduce((sum, value) => sum + value.bytes, 0);
      while (used() + bytes > byteBudget && this.evict(source.kind)) {
        /* release complete sets */
      }
      entry.textures = this.allocate(source, images);
      entry.bytes = bytes;
      entry.ready = true;
    } catch (error) {
      entry.error = 'Original texture loading failed for ' + source.name + ': ' + String(error);
    }
    this.changed();
  }
  bind(source: OriginalProgram, progress: number, timing = { duration: 1, fps: 30 }) {
    const entry = this.cache.get(source.kind);
    if (!entry) return;
    for (const [index, group] of entry.textures.entries()) {
      let phase = Math.min(group.length - 1, Math.max(0, Math.floor(progress * group.length)));
      if (source.textures?.[index].timing === 'lightning') {
        let frame = Math.max(
          0,
          Math.floor(progress * timing.duration * timing.fps + 0.0001) -
            Math.floor(0.25 * timing.duration * timing.fps + 0.0001),
        );
        if (timing.duration > 3) frame = Math.floor((frame * 75) / (timing.duration * timing.fps));
        phase = frame % group.length;
      }
      this.gl.activeTexture(this.gl.TEXTURE2 + (source.sceneInputs ?? 2) + index);
      this.gl.bindTexture(this.gl.TEXTURE_2D, group[phase]);
      const video = entry.videos?.[index];
      if (video) {
        video.ready(videoPhase(source.textures![index], progress, timing.duration), false);
        const flip = this.gl.getParameter(this.gl.UNPACK_FLIP_Y_WEBGL);
        const colorspace = this.gl.getParameter(this.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.pixelStorei(this.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, this.gl.NONE);
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          video.element,
        );
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, flip);
        this.gl.pixelStorei(this.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, colorspace);
      }
    }
  }
  dispose() {
    for (const entry of this.cache.values()) release(this.gl, entry);
    this.cache.clear();
  }
}
