import type { Clip, MediaAsset } from '../../types';
export function Waveform({
  asset,
  clip,
  width,
  rate,
}: {
  asset: MediaAsset;
  clip: Clip;
  width: number;
  rate: number;
}) {
  const data = asset.waveform;
  if (!data.length || width < 10) return null;
  const count = Math.min(160, Math.ceil(width / 4));
  const sourceEnd = clip.sourceIn + clip.duration / rate;
  const samples = Array.from({ length: count }, (_, i) => {
    const pos = (clip.sourceIn + ((sourceEnd - clip.sourceIn) * i) / count) / asset.duration;
    return data[Math.min(data.length - 1, Math.max(0, Math.floor(pos * data.length)))] || 0.025;
  });
  return (
    <svg className="waveform" viewBox={`0 0 ${count * 3} 30`} preserveAspectRatio="none">
      <path
        d={samples.map((v, i) => `M${i * 3 + 1},${15 - v * 14}v${Math.max(1, v * 28)}`).join(' ')}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
