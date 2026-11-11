import type { Clip, MediaAsset } from '../../types';

/** Display-relative peaks keep the overview legible without changing audio gain. */
export function AudioWaveform({
  asset,
  clip,
  fps,
}: {
  asset: MediaAsset;
  clip: Clip;
  fps: number;
}) {
  if (!asset.waveform.length || asset.duration <= 0) return null;
  const count = Math.min(320, asset.waveform.length);
  const samples = Array.from({ length: count }, (_, i) => {
    const seconds = clip.sourceIn + ((i / Math.max(1, count - 1)) * clip.duration) / fps;
    const index = Math.min(
      asset.waveform.length - 1,
      Math.max(0, Math.floor((seconds / asset.duration) * asset.waveform.length)),
    );
    return Math.abs(asset.waveform[index] || 0);
  });
  const peak = Math.max(0.025, ...samples);
  const points = samples.map(
    (sample, i) =>
      ((i / Math.max(1, count - 1)) * 600).toFixed(1) +
      ',' +
      (52 - (sample / peak) * 45).toFixed(1),
  );
  return (
    <svg
      className="audio-waveform-shape"
      viewBox="0 0 600 54"
      preserveAspectRatio="none"
      role="img"
      aria-label="Audio waveform"
    >
      <path d={'M0,54L' + points.join('L') + 'L600,54Z'} fill="currentColor" />
    </svg>
  );
}
