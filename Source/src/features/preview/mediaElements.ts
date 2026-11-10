import { assetUrl } from '../../bridge';
import type { RenderClip } from '../../types';
import { watchMediaEvents } from './mediaFailures';

export function createPreviewElement(clip: RenderClip, changed: (id?: string) => void) {
  const image = !!clip.clip.title || /\.(png|jpe?g|webp|bmp)(\?|$)/i.test(clip.source);
  const el = image
    ? new Image()
    : document.createElement(clip.kind === 'audio' ? 'audio' : 'video');
  el.crossOrigin = 'anonymous';
  watchMediaEvents(el, clip, changed);
  if (el instanceof HTMLMediaElement) {
    el.preload = 'auto';
    el.controls = false;
    el.disableRemotePlayback = true;
    el.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  }
  if (el instanceof HTMLVideoElement) {
    el.playsInline = true;
    el.disablePictureInPicture = true;
  }
  el.src = assetUrl(clip.source);
  return el;
}
