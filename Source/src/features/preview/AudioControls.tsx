import { Volume2, VolumeX } from 'lucide-react';
import { usePreview } from './context';

export function AudioControls() {
  const { muted, setMuted, volume, setVolume, audioLevel, rangeKeyDown } = usePreview();
  return (
    <div className="preview-audio-controls">
      <button
        title={muted ? 'Unmute preview' : 'Mute preview'}
        aria-pressed={muted}
        onClick={() => setMuted(!muted)}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <input
        onKeyDown={rangeKeyDown}
        type="range"
        aria-label="Preview volume"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(e) => setVolume(+e.target.value / 100)}
      />
      <div
        className="preview-level"
        role="meter"
        aria-label="Preview audio level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(audioLevel * 100)}
      >
        <span style={{ width: `${audioLevel * 100}%` }} />
      </div>
    </div>
  );
}
