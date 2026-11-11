import type { Clip, FrameRate } from '../../types';
import { fpsOf, timecode } from '../../types';
import { AudioToggle } from './AudioFields';
import { InspectorTabs } from './InspectorTabs';
import { useSpeedControls, speedBaseline } from './useSpeedControls';
import { SpeedRampEditor, SpeedRampPresets } from './SpeedRampPresets';
export function SpeedControls({
  clip,
  fps,
  disabled,
}: {
  clip: Clip;
  fps: FrameRate;
  disabled: boolean;
}) {
  const c = useSpeedControls(clip);
  const sourceDuration = speedBaseline(clip)?.duration ?? clip.duration;
  const seconds = sourceDuration / fpsOf(fps);
  return (
    <div className="speed-inspector inspector-surface">
      <InspectorTabs
        label="Speed areas"
        items={['Uniform Speed', 'Speed Ramping']}
        value={c.mode}
        onChange={c.setMode}
      />
      <fieldset
        disabled={disabled || c.busy}
        className="speed-settings"
        onPointerUp={(e) => {
          if (!disabled && (e.target as HTMLElement).matches('input[type="range"]')) void c.apply();
        }}
        onBlur={(e) => {
          if (!disabled && (e.target as HTMLElement).matches('input[type="number"]'))
            void c.apply();
        }}
        onKeyUp={(e) => {
          if (
            !disabled &&
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)
          )
            void c.apply();
        }}
      >
        {c.mode === 'Uniform Speed' ? (
          <>
            <div className="speed-uniform-row">
              <label htmlFor="uniform-speed">Speed</label>
              <input
                id="uniform-speed"
                aria-label="Speed"
                type="range"
                min={0.1}
                max={16}
                step={0.1}
                value={c.rate}
                onChange={(e) => c.setRate(+e.target.value)}
              />
              <input
                aria-label="Speed multiplier"
                type="number"
                min={0.1}
                max={16}
                step={0.1}
                value={c.rate}
                onChange={(e) => c.setRate(Math.max(0.1, Math.min(16, +e.target.value)))}
              />
            </div>
            <label className="inspector-labeled-field">
              <span>Duration</span>
              <div className="speed-duration">
                <input
                  aria-label="Duration (seconds)"
                  type="number"
                  min={seconds / 16}
                  max={seconds * 10}
                  step={1 / fpsOf(fps)}
                  value={Number((seconds / c.rate).toFixed(3))}
                  onChange={(e) => {
                    if (+e.target.value > 0)
                      c.setRate(Math.max(0.1, Math.min(16, seconds / +e.target.value)));
                  }}
                />
                <span>{timecode(Math.round(sourceDuration / c.rate), fps)}</span>
              </div>
            </label>
          </>
        ) : (
          <>
            <SpeedRampPresets controls={c} />
            {c.preset !== 'None' && <SpeedRampEditor controls={c} />}
          </>
        )}
        {c.mode === 'Uniform Speed' && (
          <>
            <div className="inspector-toggle-row">
              <AudioToggle
                label="Reverse Speed"
                checked={c.reverse}
                disabled={disabled || c.busy}
                onChange={(v) => {
                  c.setReverse(v);
                  void c.apply();
                }}
              />
            </div>
            <div className="inspector-toggle-row">
              <AudioToggle
                label="Ripple Edit"
                checked={c.ripple}
                disabled={disabled || c.busy}
                onChange={c.setRipple}
              />
            </div>
            <div className="inspector-toggle-row">
              <AudioToggle
                label="Maintain Pitch"
                checked={c.maintainPitch}
                disabled={disabled || c.busy}
                onChange={(v) => {
                  c.setMaintainPitch(v);
                  void c.apply();
                }}
              />
            </div>
          </>
        )}
        {c.busy && (
          <p role="status" className="field-note">
            Processing speed…
          </p>
        )}
        {c.error && (
          <p role="alert" className="field-note">
            {c.error}
          </p>
        )}
      </fieldset>
    </div>
  );
}
