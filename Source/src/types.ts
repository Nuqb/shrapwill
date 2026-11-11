export interface FrameRate {
  num: number;
  den: number;
}
export interface MediaAsset {
  id: string;
  path: string;
  name: string;
  kind: 'video' | 'audio' | 'image';
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  previewPath: string | null;
  thumbnailPath: string | null;
  waveform: number[];
  missing: boolean;
}
export interface AudioSettings {
  enabled?: Record<string, boolean>;
  hissNoiseVolume?: number;
  humReduction?: number;
  channels: string;
  balance: number;
  pitch: number;
  equalizer: number[];
  normalize: boolean;
  normalizeTarget?: number;
  duckFadeDuration?: number;
  duckFadePosition?: number;
  duckFadeSplit?: number;
  ducking: boolean;
  duckAmount: number;
  denoise: number;
  reverbReduction: number;
  windRemoval: boolean;
  hiss: number;
  dehum: number;
  deess: number;
  voiceFilter: string;
  voiceCharacter: string;
}
export interface Properties {
  video?: VideoSettings;
  animation?: AnimationSettings;
  speed?: SpeedSettings;
  audio?: AudioSettings;
  grade?: ColorGrade;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  sepia: number;
  invert: number;
  posterize: number;
  mosaic: number;
  rgbSplit: number;
  shake: number;
  mirror: number;
  wave: number;
  vignette: number;
  scanlines: number;
  effectStyle: number;
  effectAmount: number;
  originalEffect: string;
  originalFilter: string;
  filterStrength: number;
  effectStrength: number;
  gainDb: number;
  fadeIn: number;
  fadeOut: number;
}
export interface VideoSettings {
  transformEnabled: boolean;
  compositingEnabled: boolean;
  flipHorizontal: boolean;
  flipVertical: boolean;
  heightScale: number;
}
export interface AnimationSettings {
  keyframe: string;
  inPreset: string;
  outPreset: string;
  frames: number;
}
export interface SpeedSettings {
  mediaId: string;
  sourceIn: number;
  duration: number;
  renderedDuration: number;
  rate: number;
  reverse: boolean;
  maintainPitch: boolean;
  points: number[][];
}
export interface ColorGrade {
  hdrWheels?: number[][];
  lutStrength?: number;
  sharpen?: number;
  vignetteSettings?: number[];
  enabled?: Record<string, boolean>;
  secondaryCurves?: number[][];
  exposure: number;
  vibrance: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  hsl: number[][];
  curves: number[][];
  wheels: number[][];
}
export interface Title {
  text: string;
  style: string;
  fontSize: number;
  color: string;
  imagePath: string | null;
}
export interface Clip {
  id: string;
  mediaId: string | null;
  name: string;
  start: number;
  duration: number;
  sourceIn: number;
  link: string | null;
  audioEnabled: boolean;
  props: Properties;
  title: Title | null;
  transition: { kind: string; frames: number } | null;
}
export interface Track {
  id: string;
  name: string;
  kind: 'video' | 'audio';
  locked: boolean;
  muted: boolean;
  visible: boolean;
  clips: Clip[];
}
export interface Project {
  version: number;
  magneticTimeline: boolean;
  autoRipple?: boolean;
  id: string;
  name: string;
  width: number;
  height: number;
  fps: FrameRate;
  assets: MediaAsset[];
  tracks: Track[];
}
export interface RenderClip {
  clip: Clip;
  trackId: string;
  kind: 'video' | 'audio';
  source: string;
  width: number;
  height: number;
  audible: boolean;
  previewReady: boolean;
}
export interface RenderPlan {
  playbackIndex?: PlaybackIndex | null;
  width: number;
  height: number;
  fps: FrameRate;
  duration: number;
  clips: RenderClip[];
}
export interface PlaybackIndex {
  order: number[];
  maxEnds: number[];
}
export type PreviewSource =
  | {
      name: string;
      path: string;
      kind: 'media';
      mediaKind: 'video' | 'audio' | 'image';
      mediaId: string;
      requestId: string;
      plan: RenderPlan;
      frame: number;
      playing: boolean;
    }
  | {
      name: string;
      kind: 'title';
      requestId: string;
      plan: RenderPlan | null;
      frame: number;
      playing: boolean;
    }
  | {
      name: string;
      kind: 'preset';
      presetKind: 'transition' | 'filter' | 'effect';
      presetKey: string;
      strength?: number;
      transitionSeconds?: number;
      requestId: string;
      plan: RenderPlan | null;
      frame: number;
      playing: boolean;
    };
export type RenderedPreviewSource = Extract<PreviewSource, { plan: RenderPlan | null }>;
export const isRenderedSource = (source: PreviewSource | null): source is RenderedPreviewSource =>
  !!source && 'plan' in source;
export interface Snapshot {
  sessionId?: string;
  sequence?: number;
  project: Project;
  path: string | null;
  dirty: boolean;
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
  canPaste: boolean;
  render: RenderPlan | null;
}
export interface Job {
  id: string;
  kind: string;
  label: string;
  progress: number;
  status: string;
  message: string | null;
  path: string | null;
}
export type Edit = { type: string; [key: string]: unknown };
export const defaults: Properties = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  tint: 0,
  sepia: 0,
  invert: 0,
  posterize: 0,
  mosaic: 0,
  rgbSplit: 0,
  shake: 0,
  mirror: 0,
  wave: 0,
  vignette: 0,
  scanlines: 0,
  effectStyle: 0,
  effectAmount: 0,
  originalEffect: '',
  originalFilter: '',
  filterStrength: 1,
  effectStrength: 1,
  gainDb: 0,
  fadeIn: 0,
  fadeOut: 0,
};
export const fpsOf = (fps: FrameRate) => fps.num / fps.den;
export const durationOf = (p: Project) =>
  Math.max(0, ...p.tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration)));
export const seconds = (frame: number, fps: FrameRate) => (frame * fps.den) / fps.num;
export function timecode(frame: number, fps: FrameRate) {
  const rate = Math.round(fpsOf(fps));
  const s = Math.floor(frame / rate);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(frame % rate).padStart(2, '0')}`;
}
export function emptySnapshot(): Snapshot {
  return {
    project: {
      version: 1,
      magneticTimeline: false,
      id: 'preview',
      name: 'Untitled project',
      width: 1920,
      height: 1080,
      fps: { num: 30, den: 1 },
      assets: [],
      tracks: [
        {
          id: 'v1',
          name: 'Video 1',
          kind: 'video',
          locked: false,
          muted: false,
          visible: true,
          clips: [],
        },
        {
          id: 'a1',
          name: 'Audio 1',
          kind: 'audio',
          locked: false,
          muted: false,
          visible: true,
          clips: [],
        },
      ],
    },
    path: null,
    dirty: false,
    revision: 0,
    canUndo: false,
    canRedo: false,
    canPaste: false,
    render: null,
  };
}
