import { useEffect } from 'react';
import { fpsOf } from '../../types';
import type { Props } from './types';

export function usePreviewMedia({
  plan,
  frame,
  source,
  onNeedMedia,
}: Pick<Props, 'plan' | 'frame' | 'source' | 'onNeedMedia'>) {
  useEffect(() => {
    if (!plan || source) return;
    const f = fpsOf(plan.fps);
    const ids = plan.clips
      .filter(
        (rc) =>
          !rc.previewReady &&
          rc.clip.mediaId &&
          rc.clip.start <= frame + f * 0.8 &&
          rc.clip.start + rc.clip.duration > frame,
      )
      .map((rc) => rc.clip.mediaId!);
    onNeedMedia([...new Set(ids)]);
  }, [plan, frame, source, onNeedMedia]);
}
