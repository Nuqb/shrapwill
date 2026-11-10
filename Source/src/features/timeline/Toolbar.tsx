import {
  MousePointer2,
  Scissors,
  Trash2,
  Link2,
  Magnet,
  ScanLine,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronDown,
  SquareSplitHorizontal,
} from 'lucide-react';
import { ToolButton } from '../../ShortcutUI';
import { useTimeline } from './context';
import { head } from './constants';

export function AddTrackMenu() {
  const { setTrackMenu, trackMenu, edit } = useTimeline();

  return (
    <div className="track-add">
      <ToolButton action="track_menu" onClick={() => setTrackMenu(!trackMenu)}>
        <Plus size={16} />
        <ChevronDown size={11} />
      </ToolButton>
      {trackMenu && (
        <div className="small-menu">
          <button
            onClick={() => {
              void edit({ type: 'add_track', kind: 'video' });
              setTrackMenu(false);
            }}
          >
            Add video track
          </button>
          <button
            onClick={() => {
              void edit({ type: 'add_track', kind: 'audio' });
              setTrackMenu(false);
            }}
          >
            Add audio track
          </button>
        </div>
      )}
    </div>
  );
}

export function TimelineZoom() {
  const { changeZoom, zoom, width, total, fps } = useTimeline();

  return (
    <div className="zoom-controls">
      <ToolButton action="zoom_out" onClick={() => changeZoom(zoom / 1.3)}>
        <ZoomOut size={16} />
      </ToolButton>
      <input
        aria-label="Timeline zoom"
        type="range"
        min="0.08"
        max="8"
        step="0.02"
        value={zoom}
        onChange={(e) => changeZoom(+e.target.value)}
      />
      <ToolButton action="zoom_in" onClick={() => changeZoom(zoom * 1.3)}>
        <ZoomIn size={16} />
      </ToolButton>
      <ToolButton
        action="zoom_fit"
        onClick={() => changeZoom((width - head - 70) / (Math.max(10, total / fps) * 45))}
      >
        <Maximize size={15} />
      </ToolButton>
    </div>
  );
}

export function EditTools() {
  const { tool, onToolChange, split, total, remove, selected, selectedTracks, detach } =
    useTimeline();

  return (
    <div className="tool-group">
      <ToolButton
        action="tool_select"
        className={tool === 'select' ? 'active-tool' : ''}
        aria-pressed={tool === 'select'}
        onClick={() => onToolChange('select')}
      >
        <MousePointer2 size={17} />
      </ToolButton>
      <ToolButton
        action="tool_razor"
        className={tool === 'razor' ? 'active-tool' : ''}
        aria-pressed={tool === 'razor'}
        onClick={() => onToolChange('razor')}
        description="Click a clip to cut it. Shift+click cuts all unlocked tracks."
      >
        <Scissors size={17} />
      </ToolButton>
      <ToolButton action="split" onClick={split} disabled={!total}>
        <SquareSplitHorizontal size={17} />
      </ToolButton>
      <ToolButton
        action="delete"
        onClick={() => remove(false)}
        disabled={!selected.length && !selectedTracks.length}
      >
        <Trash2 size={17} />
      </ToolButton>
      <ToolButton action="detach_audio" onClick={detach} disabled={selected.length !== 1}>
        <Link2 size={17} />
      </ToolButton>
    </div>
  );
}

export function TimelineModes() {
  const { snap, onSnapChange, project, onMagneticChange, mainTrack } = useTimeline();

  return (
    <div className="tool-group">
      <ToolButton
        action="snapping"
        className={snap ? 'toggled' : ''}
        aria-pressed={snap}
        onClick={() => onSnapChange(!snap)}
      >
        <ScanLine size={17} />
      </ToolButton>
      <ToolButton
        action="magnetic_timeline"
        className={project.magneticTimeline ? 'toggled magnetic-toggle' : 'magnetic-toggle'}
        aria-pressed={project.magneticTimeline}
        onClick={onMagneticChange}
        description={`${project.magneticTimeline ? 'On' : 'Off'} · Close gaps on ${mainTrack?.name || 'the main video track'}. Linked audio follows. Other tracks stay in place.`}
      >
        <Magnet size={17} />
        <span>Magnetic</span>
      </ToolButton>
      <AddTrackMenu />
    </div>
  );
}

export function TimelineToolbar() {
  const { project } = useTimeline();

  return (
    <div className="timeline-tools">
      <EditTools />
      <div className="divider-v" />
      <TimelineModes />
      <div className="timeline-caption">
        Timeline <span className="pill">{project.tracks.length} tracks</span>
      </div>
      <TimelineZoom />
    </div>
  );
}
