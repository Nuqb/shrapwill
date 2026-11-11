import type { RenderClip } from '../../types';
import { prepareAudio } from '../../services/desktop/audio';
import { assetUrl } from '../../services/desktop/client';
import { audioDefaults, needsAudioProcessing } from '../audio/settings';
import type { PreviewAudio } from './audio';

type Entry = {
  key: string;
  timer?: ReturnType<typeof setTimeout>;
  el?: HTMLAudioElement;
  node?: MediaElementAudioSourceNode;
  gain?: GainNode;
  targetGain?: number;
  error?: string;
};
type Timing = { frame: number; fps: number; playing: boolean; duckGain: number };

/** Only active/upcoming clips own players. Stale requests cannot reopen a player. */
export class ProcessedAudio {
  private entries = new Map<string, Entry>();
  private queue = Promise.resolve();
  constructor(private changed: () => void) {}

  sync(rc: RenderClip, sound: PreviewAudio, timing: Timing) {
    if (!rc.audible || !needsAudioProcessing(rc.clip.props.audio)) {
      this.release(rc.clip.id);
      return false;
    }
    const key = JSON.stringify([
      rc.source,
      rc.clip.sourceIn,
      rc.clip.duration,
      rc.clip.props.audio,
    ]);
    let entry = this.entries.get(rc.clip.id);
    if (entry?.key !== key) {
      this.release(rc.clip.id);
      entry = { key };
      this.entries.set(rc.clip.id, entry);
      this.schedule(rc, entry);
    }
    if (entry.el) this.play(rc, entry, sound, timing);
    return true;
  }
  private schedule(rc: RenderClip, entry: Entry) {
    entry.timer = setTimeout(() => {
      this.queue = this.queue.then(async () => {
        if (this.entries.get(rc.clip.id) !== entry) return;
        try {
          const path = await prepareAudio(rc.clip.id, rc.clip.props.audio ?? audioDefaults);
          if (this.entries.get(rc.clip.id) !== entry) return;
          const el = new Audio();
          el.crossOrigin = 'anonymous';
          el.preload = 'auto';
          el.onloadeddata = this.changed;
          el.onerror = () => {
            entry.error = 'Processed audio could not be played.';
            this.changed();
          };
          el.src = assetUrl(path);
          entry.el = el;
        } catch (error) {
          if (this.entries.get(rc.clip.id) === entry) entry.error = String(error);
        }
        this.changed();
      });
    }, 200);
  }
  private play(rc: RenderClip, entry: Entry, sound: PreviewAudio, timing: Timing) {
    const el = entry.el!;
    const time = Math.max(0, (timing.frame - rc.clip.start) / timing.fps);
    const player = entry as Entry & { el: HTMLAudioElement };
    sound.sync(player, rc, timing.frame, timing);
    if (
      !el.seeking &&
      Number.isFinite(el.duration) &&
      Math.abs(el.currentTime - time) > (timing.playing ? 0.12 : 0.012)
    ) {
      el.currentTime = Math.min(time, Math.max(0, el.duration - 0.001));
    }
    if (timing.playing) {
      if (el.paused) void el.play().catch(() => {});
    } else el.pause();
  }
  status() {
    for (const e of this.entries.values()) {
      if (e.error) return e.error;
      if (!e.el) return 'Preparing audio effects…';
    }
    return '';
  }
  retain(ids: Set<string>) {
    for (const id of this.entries.keys()) if (!ids.has(id)) this.release(id);
  }
  pause() {
    for (const e of this.entries.values()) e.el?.pause();
  }
  release(id: string) {
    const e = this.entries.get(id);
    if (!e) return;
    clearTimeout(e.timer);
    if (e.el) {
      e.el.pause();
      e.el.removeAttribute('src');
      e.el.load();
    }
    e.node?.disconnect();
    e.gain?.disconnect();
    this.entries.delete(id);
  }
  destroy() {
    for (const id of this.entries.keys()) this.release(id);
  }
}
