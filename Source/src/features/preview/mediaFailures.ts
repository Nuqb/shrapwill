import type { RenderClip } from '../../types';
import type { Props } from './types';

export function watchMediaEvents(
  el: HTMLImageElement | HTMLMediaElement,
  clip: RenderClip,
  notify: (id?: string) => void,
) {
  for (const event of ['load', 'loadeddata', 'seeked']) el.addEventListener(event, () => notify());
  if (clip.clip.mediaId)
    el.addEventListener('error', () => notify(clip.clip.mediaId!), { once: true });
}
export function requestMediaFallback(
  renderer: { failedMedia: Set<string> },
  request: Props['onNeedMedia'],
) {
  if (!renderer.failedMedia.size) return;
  request([...renderer.failedMedia], true);
  renderer.failedMedia.clear();
}
