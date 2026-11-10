import { AudioControls } from './AudioControls';
import { isRenderedSource } from '../../types';
import { ToolButton } from '../../ShortcutUI';
import { Film, Volume2, Maximize2, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { fpsOf, timecode } from '../../types';
import { usePreview } from './context';
import { sourceHeading } from './sourceHeading';
import { PresetPreviewControls } from './PresetPreviewControls';

function SourcePreviewActions() {
  const { source, onClearSource, onApplyPreset } = usePreview();
  return (
    <div className="source-preview-actions">
      {source?.kind === 'preset' && (
        <button
          className="text-button"
          disabled={!onApplyPreset || !source.plan}
          onClick={onApplyPreset}
        >
          Apply to selected clip
        </button>
      )}
      <button className="text-button" onClick={onClearSource}>
        Back to timeline
      </button>
    </div>
  );
}
export function PreviewHeading() {
  const { source, quality, onQuality } = usePreview();

  return (
    <div className="panel-heading">
      <span>{sourceHeading(source)}</span>
      {source ? (
        <SourcePreviewActions />
      ) : (
        <select
          aria-label="Preview quality"
          value={quality}
          onChange={(e) => onQuality(+e.target.value)}
        >
          <option value={360}>360p · Draft</option>
          <option value={720}>720p · Preview</option>
          <option value={1080}>1080p · Full</option>
        </select>
      )}
    </div>
  );
}

export function PreviewViewer() {
  const { canvas, container, source, plan, error } = usePreview();

  return (
    <div
      className="viewer"
      onDoubleClick={() => fullScreen(container.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvas} width={1280} height={720} data-testid="preview-canvas" />
      {source?.kind === 'media' && source.mediaKind === 'audio' && (
        <div className="viewer-empty audio-source-art">
          <Volume2 size={32} />
          <strong>{source.name}</strong>
          <span>Audio preview</span>
        </div>
      )}
      {isRenderedSource(source) && !plan && (
        <div className="viewer-empty" role="status">
          Preparing preview…
        </div>
      )}
      {!source && (!plan || plan.duration === 0) && (
        <div className="viewer-empty">
          <div className="viewer-icon">
            <Film size={32} strokeWidth={1} />
          </div>
          <strong>Your story starts here</strong>
          <span>Add media to the timeline to begin.</span>
        </div>
      )}
      {error && <div className="viewer-empty error-text">{error}</div>}
    </div>
  );
}

export function PreviewStatus() {
  const { source, frame, fps, plan } = usePreview();

  return (
    <div className="player-status">
      <span>
        {source
          ? `${source.name}${isRenderedSource(source) ? ` · ${timecode(frame, fps)}` : ''}`
          : timecode(frame, fps)}
      </span>
      <span className="subtle">
        {plan ? `${plan.width} × ${plan.height}` : '1920 × 1080'} <span className="dot">·</span>{' '}
        {fpsOf(fps).toFixed(2).replace('.00', '')} fps
      </span>
    </div>
  );
}

export function PlaybackButtons() {
  const { seek, frame, playing, plan, togglePlayback } = usePreview();

  return (
    <div className="transport-center">
      <ToolButton action="previous_frame" onClick={() => seek(frame - 1)}>
        <SkipBack size={17} />
      </ToolButton>
      <ToolButton
        action="play_pause"
        className="play-button"
        onClick={togglePlayback}
        disabled={!plan?.duration}
      >
        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </ToolButton>
      <ToolButton action="next_frame" onClick={() => seek(frame + 1)}>
        <SkipForward size={17} />
      </ToolButton>
    </div>
  );
}

export function PreviewTransport() {
  const { container, fullscreen } = usePreview();

  return (
    <div className="transport">
      <AudioControls />
      <PlaybackButtons />
      <div className="transport-side right">
        <button
          title={fullscreen ? 'Exit full-screen preview' : 'Full-screen preview'}
          onClick={() => fullScreen(container.current)}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  );
}

export function PreviewView() {
  const { container } = usePreview();
  return (
    <section ref={container} className="preview-panel panel">
      <PreviewHeading />
      <PresetPreviewControls />
      <PreviewViewer />
      <SourcePosition />
      <PreviewStatus />
      <PreviewTransport />
    </section>
  );
}

function fullScreen(element: HTMLElement | null) {
  if (!element) return;
  const request = document.fullscreenElement
    ? document.exitFullscreen()
    : element.requestFullscreen();
  void request.catch(() => {});
}
function SourcePosition() {
  const { source, frame, plan, seek, rangeKeyDown } = usePreview();
  if (!source || !plan) return null;
  return (
    <input
      onKeyDown={rangeKeyDown}
      className="source-position"
      aria-label="Source position"
      type="range"
      min={0}
      max={Math.max(0, plan.duration - 1)}
      value={frame}
      onChange={(e) => seek(+e.target.value)}
    />
  );
}
