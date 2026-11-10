import { defaults, fpsOf, type FrameRate, type MediaAsset, type PreviewSource } from '../../types';

type MediaSource = Extract<PreviewSource, { kind: 'media' }>;
export function createMediaSource(asset: MediaAsset, fps: FrameRate): MediaSource {
  const duration = Math.max(1, Math.ceil(asset.duration * fpsOf(fps)));
  const path = asset.previewPath || asset.path;
  return {
    kind: 'media',
    mediaKind: asset.kind,
    mediaId: asset.id,
    name: asset.name,
    path,
    requestId: crypto.randomUUID(),
    frame: 0,
    playing: asset.kind !== 'image',
    plan: {
      width: asset.width || 1280,
      height: asset.height || 720,
      fps,
      duration,
      clips: [
        {
          clip: {
            id: `source-${asset.id}`,
            mediaId: asset.id,
            name: asset.name,
            start: 0,
            duration,
            sourceIn: 0,
            link: null,
            audioEnabled: asset.hasAudio,
            props: { ...defaults },
            title: null,
            transition: null,
          },
          trackId: 'source-preview',
          kind: asset.kind === 'audio' ? 'audio' : 'video',
          source: path,
          width: asset.width,
          height: asset.height,
          audible: asset.hasAudio,
          previewReady: true,
        },
      ],
    },
  };
}
export function refreshMediaSource(source: MediaSource, asset: MediaAsset): MediaSource {
  const path = asset.previewPath || asset.path;
  if (source.path === path) return source;
  return {
    ...source,
    path,
    plan: { ...source.plan, clips: source.plan.clips.map((clip) => ({ ...clip, source: path })) },
  };
}
