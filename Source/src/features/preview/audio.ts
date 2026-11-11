import type { RenderClip } from '../../types';

type AudioPlayer = {
  el: HTMLImageElement | HTMLMediaElement;
  node?: MediaElementAudioSourceNode;
  gain?: GainNode;
  targetGain?: number;
};
export class PreviewAudio {
  private context?: AudioContext;
  private output?: GainNode;
  private analyser?: AnalyserNode;
  private outputValue = Number.NaN;
  private samples = new Float32Array(256);
  constructor(private changed: () => void) {}

  resume() {
    if (!this.context) {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = this.samples.length;
      this.output.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
    void this.context
      .resume()
      .then(this.changed)
      .catch(() => {});
  }
  setOutput(volume: number, muted: boolean) {
    if (!this.context || !this.output) return;
    const value = muted ? 0 : volume;
    if (this.outputValue === value) return;
    this.output.gain.setTargetAtTime(value, this.context.currentTime, 0.008);
    this.outputValue = value;
  }
  sync(
    player: AudioPlayer,
    clip: RenderClip,
    frame: number,
    options: { playing: boolean; duckGain: number },
  ) {
    if (!(player.el instanceof HTMLMediaElement)) return;
    const el = player.el;
    if (!this.context || !this.output) {
      el.muted = true;
      return;
    }
    if (!player.node) {
      player.node = this.context.createMediaElementSource(el);
      player.gain = this.context.createGain();
      player.node.connect(player.gain);
      player.gain.connect(this.output);
    }
    const c = clip.clip;
    const local = frame - c.start;
    let gain = options.playing && clip.audible ? Math.pow(10, c.props.gainDb / 20) : 0;
    gain *= options.duckGain;
    if (c.props.fadeIn > 0) gain *= Math.min(1, local / c.props.fadeIn);
    if (c.props.fadeOut > 0) gain *= Math.min(1, (c.duration - local) / c.props.fadeOut);
    if (player.targetGain !== gain) {
      player.gain!.gain.setTargetAtTime(gain, this.context.currentTime, 0.008);
      player.targetGain = gain;
    }
    el.muted = false;
    el.volume = 1;
  }
  level() {
    if (!this.analyser || this.context?.state !== 'running') return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    return Math.min(
      1,
      Math.sqrt(this.samples.reduce((sum, n) => sum + n * n, 0) / this.samples.length) * 3,
    );
  }
  destroy() {
    this.output?.disconnect();
    this.analyser?.disconnect();
    void this.context?.close();
  }
}
