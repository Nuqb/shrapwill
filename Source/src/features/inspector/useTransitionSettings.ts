import { useEffect, useState } from 'react';
import type { Clip, Edit, FrameRate } from '../../types';
import { fpsOf } from '../../types';

export function useTransitionSettings({
  clip,
  fps,
  edit,
}: {
  clip: Clip;
  fps: FrameRate;
  edit: (op: Edit) => Promise<unknown>;
}) {
  const initialFrames =
    clip.transition?.frames || Math.min(clip.duration, Math.round(fpsOf(fps) * 0.5));
  const [frames, setFrames] = useState(initialFrames);
  useEffect(() => {
    setFrames(initialFrames);
  }, [clip.id, initialFrames]);
  const commit = (kind: string) => {
    void edit({
      type: 'set_transition',
      id: clip.id,
      kind,
      frames: Math.max(1, Math.min(clip.duration, Math.round(frames))),
    });
  };
  return { frames, setFrames, commit };
}
