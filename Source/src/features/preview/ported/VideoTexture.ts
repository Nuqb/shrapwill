// Original video stays bundled for native export. Browser frames are lossless RGB
// extracts, avoiding Windows video decoders changing full-range channel masks.
export class VideoTexture {
  element = new Image();
  private frame = 0;
  private seekingFrame = -1;
  private alive = true;
  private error = '';
  constructor(
    private urls: string[],
    private changed: () => void,
  ) {}
  async load() {
    if (!this.urls.length) throw Error('Missing lossless original video frames');
    this.element.src = this.urls[0];
    await this.element.decode();
    return this;
  }
  private async seek(frame: number) {
    this.seekingFrame = frame;
    const image = new Image();
    image.src = this.urls[frame];
    try {
      await image.decode();
      if (!this.alive) return;
      this.element = image;
      this.frame = frame;
    } catch {
      this.error = 'Original transition frame could not be decoded';
    } finally {
      this.seekingFrame = -1;
      if (this.alive) this.changed();
    }
  }
  ready(progress: number, exact: boolean) {
    if (this.error) throw Error(this.error);
    const frame = Math.min(
      this.urls.length - 1,
      Math.max(0, Math.floor(progress * this.urls.length)),
    );
    if (this.seekingFrame < 0 && frame !== this.frame) void this.seek(frame);
    return !exact || (this.frame === frame && this.seekingFrame < 0);
  }
  async samples() {
    const result: HTMLCanvasElement[] = [];
    for (let i = 0; i < 7; i++) {
      const started = performance.now();
      while (!this.ready(i / 6, true)) {
        if (performance.now() - started > 10000) throw Error('Original transition frame timed out');
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = Math.max(
        1,
        Math.round((128 * this.element.naturalHeight) / this.element.naturalWidth),
      );
      canvas.getContext('2d')!.drawImage(this.element, 0, 0, canvas.width, canvas.height);
      result.push(canvas);
    }
    this.dispose();
    return result;
  }
  dispose() {
    this.alive = false;
    this.element.removeAttribute('src');
  }
}
