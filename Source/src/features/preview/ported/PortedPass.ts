import { fragmentSource, portedShader } from './registry';
import { TextureInputs } from './TextureInputs';
import { RenderGraph } from './RenderGraph';
import { SceneAnalysis, type AnalysisBackend } from './SceneAnalysis';
import { animationValues } from './AnimationCurves';

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw Error(`Original shader failed: ${message}`);
  }
  return shader;
}
function program(
  gl: WebGL2RenderingContext,
  body: string,
  orientation: { output: boolean; inputs: boolean[] },
) {
  const vertex = compile(
    gl,
    gl.VERTEX_SHADER,
    `#version 300 es
in vec2 position;out vec2 portUV;
void main(){gl_Position=vec4(position,0.,1.);portUV=position*.5+.5;}`,
  );
  const result = gl.createProgram()!;
  let fragment: WebGLShader | null = null;
  try {
    fragment = compile(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentSource(body, orientation.output, orientation.inputs),
    );
    gl.attachShader(result, vertex);
    gl.attachShader(result, fragment);
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(result) || 'Original shader link failed');
    return result;
  } catch (error) {
    gl.deleteProgram(result);
    throw error;
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}
export class PortedPass {
  frameRate = 30;
  private strength = 1;
  private curves: number[] = [];
  private programs = new Map<string, WebGLProgram>();
  private textures: WebGLTexture[];
  private sizes = ['', ''];
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private inputs: TextureInputs;
  private graph: RenderGraph;
  private originalSize = [1, 1];
  private analysis: SceneAnalysis;
  constructor(
    private gl: WebGL2RenderingContext,
    changed: () => void = () => {},
    sampleVideos = false,
    backend?: AnalysisBackend,
  ) {
    this.inputs = new TextureInputs(gl, changed, sampleVideos);
    this.analysis = new SceneAnalysis(
      gl,
      changed,
      sampleVideos ? async () => ({ eye: [0.5, 0.5], width: 0, height: 0 }) : backend,
    );
    this.graph = new RenderGraph(gl);
    this.textures = [gl.createTexture()!, gl.createTexture()!];
    this.vao = gl.createVertexArray()!;
    this.buffer = gl.createBuffer()!;
  }
  ready(kind: string, progress = 0, exact = true, duration = 1) {
    const source = portedShader(kind);
    return source ? this.inputs.ready(source, progress, exact, duration) : false;
  }
  bindSource(texture: WebGLTexture) {
    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  }
  capture(slot: number, width: number, height: number) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE2 + slot);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[slot]);
    const size = `${width}/${height}`;
    if (this.sizes[slot] !== size) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      // Transition motion crosses the scene boundary. Clamping here stretches
      // one edge across the frame and can hold it there for many frames.
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.MIRRORED_REPEAT);
      this.sizes[slot] = size;
    }
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
  }
  private compiled(key: string, body: string, orientation: { output: boolean; inputs: boolean[] }) {
    const gl = this.gl;
    let compiled = this.programs.get(key);
    if (!compiled) {
      compiled = program(gl, body, orientation);
      if (this.programs.size >= 32) {
        const first = this.programs.keys().next().value!;
        gl.deleteProgram(this.programs.get(first)!);
        this.programs.delete(first);
      }
      this.programs.set(key, compiled);
    }
    this.programs.delete(key);
    this.programs.set(key, compiled);
    return compiled;
  }
  prepare(kind: string, progress: number) {
    const source = portedShader(kind),
      viewport = this.gl.getParameter(this.gl.VIEWPORT) as Int32Array;
    return (
      !source || this.analysis.prepare(source, this.textures, progress, [viewport[2], viewport[3]])
    );
  }
  apply(kind: string, progress: number, duration: number, strength = 1) {
    this.strength = strength;
    this.gl.activeTexture(this.gl.TEXTURE2);
    const original = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D) as WebGLTexture;
    this.gl.activeTexture(this.gl.TEXTURE10);
    this.gl.bindTexture(this.gl.TEXTURE_2D, original);
    const source = portedShader(kind);
    if (!source) throw Error('No original shader for ' + kind);
    this.curves = source.curves ? animationValues(source.curves, progress) : [];
    if (!this.inputs.ready(source, progress, false, duration))
      throw Error('Original textures are still loading for ' + source.name);
    this.inputs.bind(source, progress, { duration, fps: this.frameRate });
    this.prepare(kind, progress);
    if (source.analysis === 'incoming-person') this.analysis.bind();
    const viewport = this.gl.getParameter(this.gl.VIEWPORT) as Int32Array;
    this.originalSize = [viewport[2], viewport[3]];
    if (source.passes?.length) {
      let index = 0;
      this.graph.run(
        source,
        (body, final, flips) => {
          const compiled = this.compiled(kind + '/' + index++, body, {
            output: final && source.sceneInputs === 1,
            inputs: flips,
          });
          this.draw(compiled, progress, duration, final);
        },
        progress,
      );
    } else {
      const sourceOrientation = source.sceneInputs === 1;
      const compiled = this.compiled(kind, source.preamble + '\n' + source.body, {
        output: sourceOrientation,
        inputs: [sourceOrientation],
      });
      this.draw(compiled, progress, duration);
    }
  }
  private draw(compiled: WebGLProgram, progress: number, duration: number, final = true) {
    const gl = this.gl;
    const previous = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
    gl.useProgram(compiled);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const location = gl.getAttribLocation(compiled, 'position');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    this.uniforms(compiled, progress, duration, final ? this.strength : 1);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(previous);
  }
  private uniforms(compiled: WebGLProgram, progress: number, duration: number, strength: number) {
    const gl = this.gl;
    gl.uniform1i(gl.getUniformLocation(compiled, 'hostOriginal'), 10);
    gl.uniform1f(gl.getUniformLocation(compiled, 'host_strength'), strength);
    gl.uniform1i(gl.getUniformLocation(compiled, 'inputA'), 2);
    gl.uniform1i(gl.getUniformLocation(compiled, 'inputB'), 3);
    for (const [index, name] of [
      'inputC',
      'inputD',
      'inputE',
      'inputF',
      'inputG',
      'inputH',
    ].entries())
      gl.uniform1i(gl.getUniformLocation(compiled, name), 4 + index);
    gl.uniform1f(gl.getUniformLocation(compiled, 'u_global_time'), progress * duration);
    gl.uniform1f(gl.getUniformLocation(compiled, 'u_total_time'), duration);
    gl.uniform1f(gl.getUniformLocation(compiled, 'u_frame_rate'), this.frameRate);
    gl.uniform2f(
      gl.getUniformLocation(compiled, 'host_eye'),
      this.analysis.eye[0],
      this.analysis.eye[1],
    );
    this.curves.forEach((value, i) =>
      gl.uniform1f(gl.getUniformLocation(compiled, 'host_curve' + (i + 1)), value),
    );
    const viewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    gl.uniform2f(gl.getUniformLocation(compiled, 'iResolution'), viewport[2], viewport[3]);
    gl.uniform2f(
      gl.getUniformLocation(compiled, 'originalResolution'),
      this.originalSize[0],
      this.originalSize[1],
    );
  }
  dispose() {
    this.inputs.dispose();
    this.graph.dispose();
    this.analysis.dispose();
    for (const program of this.programs.values()) this.gl.deleteProgram(program);
    for (const texture of this.textures) this.gl.deleteTexture(texture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.buffer);
  }
}
