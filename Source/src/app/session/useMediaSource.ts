import { refreshMediaSource } from '../../features/preview/mediaSource';
import { useMemo } from 'react';
import type { MediaAsset, PreviewSource } from '../../types';

export function useMediaSource(source: PreviewSource | null, assets: MediaAsset[]) {
  return useMemo(() => {
    if (!source || source.kind !== 'media') return source;
    const asset = assets.find((a) => a.id === source.mediaId);
    return asset ? refreshMediaSource(source, asset) : source;
  }, [source, assets]);
}
