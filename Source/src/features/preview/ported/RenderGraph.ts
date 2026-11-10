import type { OriginalProgram, RenderStage } from './registry';

export function stageSize(stage: RenderStage, width: number, height: number) {
  if (stage.size) return width > height ? stage.size : [...stage.size].reverse();
  const factor =
    (stage.scale ?? 1) * (Math.max(width, height) > 1000 ? (stage.largeScale ?? 1) : 1);
  return [Math.max(1, Math.floor(width * factor)), Math.max(1, Math.floor(height * factor))];
}
export function graphDimensions(stages: RenderStage[], width: number, height: number) {
  if (!stages.length || stages.length > 32) throw Error('Invalid effect stage count');
  for (const [index, stage] of stages.entries()) {
    if (
      stage.inputs.length > 8 ||
      stage.inputs.some(
        (input) => !Number.isInteger(input) || input >= 9 || (input < 0 && -input - 1 >= index),
      )
    )
      throw Error('Effect stage must reference a scene, texture or earlier result');
  }
  const dimensions = stages.map((stage, index) =>
    index === stages.length - 1 ? [width, height] : stageSize(stage, width, height),
  );
  if (
    dimensions.some(
      (size) =>
        size.length !== 2 ||
        size.some((value) => !Number.isInteger(value) || value < 1 || value > 7680),
    )
  )
    throw Error('Invalid effect stage dimensions');
  if (
    dimensions.reduce(
      (bytes, [w, h], index) => bytes + w * h * (stages[index].format === 'rgba16f' ? 8 : 4),
      0,
    ) >
    256 * 1024 * 1024
  )
    throw Error('Effect stage memory limit exceeded');
  return dimensions;
}

// Compiled-in recipes only: scene inputs 0/1, imported maps 2..7, earlier stages -1,-2,...
export class RenderGraph {
  private layout = '';
  private targets: { texture: WebGLTexture; framebuffer: WebGLFramebuffer; size: string }[] = [];
  constructor(private gl: WebGL2RenderingContext) {}
  private target(index: number, size: number[], format?: string) {
    const [width, height] = size;
    const gl = this.gl;
    const target = (this.targets[index] ??= {
      texture: gl.createTexture()!,
      framebuffer: gl.createFramebuffer()!,
      size: '',
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    const key = `${width}/${height}/${format ?? 'rgba8'}`;
    if (target.size !== key) {
      if (format === 'rgba16f' && !gl.getExtension('EXT_color_buffer_float'))
        throw Error('This transition requires floating-point rendering');
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format === 'rgba16f' ? gl.RGBA16F : gl.RGBA8,
        width,
        height,
        0,
        gl.RGBA,
        format === 'rgba16f' ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
        null,
      );
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
      target.size = key;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw Error('Cannot allocate effect stage');
    return target;
  }
  private prepare(source: OriginalProgram, progress: number) {
    const gl = this.gl,
      stages = source.passes!;
    const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING),
      viewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    const dimensions = graphDimensions(stages, viewport[2], viewport[3]);
    const layout = JSON.stringify(dimensions);
    if (layout !== this.layout) {
      this.dispose();
      this.layout = layout;
    }
    const bound = Array.from({ length: 8 }, (_, i) => {
      gl.activeTexture(gl.TEXTURE2 + i);
      return gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture;
    });
    const inputs = [bound[0], bound[1], ...bound.slice(source.sceneInputs ?? 2)];
    if (source.switchInput && progress > 0.5) inputs[0] = inputs[1];
    return { framebuffer, viewport, dimensions, inputs };
  }
  private bindStage(stage: RenderStage, inputs: WebGLTexture[]) {
    // Clear unused samplers too: an earlier stage target can remain bound to an
    // inactive branch, which WebGL still treats as framebuffer feedback.
    for (let slot = 0; slot < 8; slot++) {
      const input = stage.inputs[slot] ?? 0;
      this.gl.activeTexture(this.gl.TEXTURE2 + slot);
      this.gl.bindTexture(
        this.gl.TEXTURE_2D,
        input < 0 ? this.targets[-input - 1].texture : inputs[input],
      );
    }
  }
  run(
    source: OriginalProgram,
    draw: (body: string, final: boolean, flips: boolean[]) => void,
    progress = 0,
  ) {
    const gl = this.gl,
      stages = source.passes!;
    const { framebuffer, viewport, dimensions, inputs } = this.prepare(source, progress);
    try {
      for (const [index, stage] of stages.entries()) {
        const final = index === stages.length - 1,
          [width, height] = dimensions[index];
        if (final) gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        else this.target(index, [width, height], stage.format);
        gl.viewport(0, 0, width, height);
        this.bindStage(stage, inputs);
        draw(
          stage.body,
          final,
          stage.inputs.map((input) => input === 0 && source.sceneInputs === 1),
        );
      }
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
    }
  }
  dispose() {
    for (const target of this.targets) {
      this.gl.deleteTexture(target.texture);
      this.gl.deleteFramebuffer(target.framebuffer);
    }
    this.targets = [];
  }
}
