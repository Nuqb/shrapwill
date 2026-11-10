import { ChevronDown } from 'lucide-react';
import type { Clip, Edit, FrameRate } from '../../types';
import { transitionPresets } from '../library/presets';
import { useTransitionSettings } from './useTransitionSettings';
import { unavailableOriginal } from '../preview/ported/availability';

type Props = {
  clip: Clip;
  fps: FrameRate;
  disabled: boolean;
  edit: (op: Edit) => Promise<unknown>;
};
export function TransitionControls({ clip, fps, disabled, edit }: Props) {
  const { frames, setFrames, commit } = useTransitionSettings({ clip, fps, edit });
  return (
    <div className="property-section">
      <h4>
        <ChevronDown size={13} /> Transition
      </h4>
      <select
        aria-label="Clip transition"
        value={clip.transition?.kind || 'none'}
        disabled={disabled}
        onChange={(e) => commit(e.target.value)}
      >
        <option value="none">None</option>
        {transitionPresets.map((preset) => (
          <option key={preset.kind} value={preset.kind} disabled={unavailableOriginal(preset.kind)}>
            {preset.name}
          </option>
        ))}
      </select>
      {clip.transition && (
        <TransitionDuration
          frames={frames}
          max={clip.duration}
          disabled={disabled}
          onChange={setFrames}
          onCommit={() => commit(clip.transition!.kind)}
        />
      )}
      <p className="field-note">
        Transitions overlap the preceding clip and move linked audio with the incoming clip.
        Removing a transition keeps clip timing.
      </p>
    </div>
  );
}

function TransitionDuration({
  frames,
  max,
  disabled,
  onChange,
  onCommit,
}: {
  frames: number;
  max: number;
  disabled: boolean;
  onChange: (frames: number) => void;
  onCommit: () => void;
}) {
  return (
    <label className="numeric-field">
      <span>Duration (frames)</span>
      <input
        aria-label="Transition duration"
        type="number"
        min="1"
        max={max}
        step="1"
        value={frames}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
