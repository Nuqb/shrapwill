import type { FrameRate, RenderPlan, PreviewSource } from '../../types';
export type Props = {
  plan: RenderPlan | null;
  frame: number;
  onFrame: (n: number) => void;
  playing: boolean;
  onPlaying: (v: boolean) => void;
  fps: FrameRate;
  quality: number;
  onQuality: (n: number) => void;
  source: PreviewSource | null;
  onClearSource: () => void;
  onApplyPreset?: () => void;
  onNeedMedia: (ids: string[], forceProxy?: boolean) => void;
};
