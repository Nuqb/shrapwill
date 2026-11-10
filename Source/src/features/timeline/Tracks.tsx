import {
  Plus,
  LockKeyhole,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Film,
  Music2,
} from 'lucide-react';
import type { Track } from '../../types';
import { useTimeline } from './context';
import { head } from './constants';
import { TimelineClip } from './Clips';
import { IncomingLibraryClip } from './IncomingLibraryClip';

export function TrackSelector({ t }: { t: Track }) {
  const { selectedTracks, selectTrack, mainTrack, project } = useTimeline();

  return (
    <button
      className="track-name track-selector"
      title="Click the track name or empty lane to select · Ctrl+click for multiple · Right-click for actions"
      aria-label={`Select track ${t.name}`}
      aria-pressed={selectedTracks.includes(t.id)}
      onClick={(e) => selectTrack(t.id, e.ctrlKey || e.metaKey)}
    >
      <span className="track-type">
        {t.kind === 'video' ? <Film size={13} /> : <Music2 size={13} />}
      </span>
      <span>{t.name}</span>
      {t.id === mainTrack?.id && (
        <span
          className={`main-track-badge ${project.magneticTimeline ? 'magnetic-on' : ''}`}
          title="Main video track"
        >
          MAIN
        </span>
      )}
    </button>
  );
}

export function TrackButtons({ t }: { t: Track }) {
  const { edit } = useTimeline();

  return (
    <div className="track-buttons">
      <button
        title={t.locked ? 'Unlock track' : 'Lock track'}
        aria-label={`${t.locked ? 'Unlock' : 'Lock'} ${t.name}`}
        onClick={() => void edit({ type: 'set_track', id: t.id, locked: !t.locked })}
      >
        {t.locked ? <LockKeyhole size={12} /> : <Unlock size={12} />}
      </button>
      {t.kind === 'video' && (
        <button
          title={t.visible ? 'Hide track' : 'Show track'}
          onClick={() => void edit({ type: 'set_track', id: t.id, visible: !t.visible })}
        >
          {t.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      )}
      <button
        className={t.muted ? 'muted' : ''}
        title={t.muted ? 'Unmute track' : 'Mute track'}
        onClick={() => void edit({ type: 'set_track', id: t.id, muted: !t.muted })}
      >
        {t.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>
    </div>
  );
}

export function TrackHeader({ t }: { t: Track }) {
  return (
    <div className="track-head">
      <TrackSelector t={t} />
      <TrackButtons t={t} />
    </div>
  );
}

export function TrackLane({ t, ti }: { t: Track; ti: number }) {
  const { width, timelineWidth, tool, setHoverFrame, ppf, scrollX, total } = useTimeline();

  return (
    <div
      className="track-lane"
      data-ppf={ppf}
      style={{ width: timelineWidth }}
      onPointerMove={(e) => {
        if (tool === 'razor')
          setHoverFrame(
            Math.max(
              0,
              Math.round((e.clientX - e.currentTarget.getBoundingClientRect().left) / ppf),
            ),
          );
      }}
      onPointerLeave={() => setHoverFrame(null)}
    >
      <IncomingLibraryClip trackId={t.id} />
      {t.clips
        .filter(
          (c) =>
            (c.start + c.duration) * ppf > scrollX - head - 200 &&
            c.start * ppf < scrollX + width + 200,
        )
        .map((c) => (
          <TimelineClip key={c.id} c={c} t={t} />
        ))}
      {total === 0 && ti === 0 && (
        <div className="timeline-drop-hint">
          <Plus size={17} /> Drag media here to start editing
        </div>
      )}
    </div>
  );
}

export function TrackRow({ t, ti }: { t: Track; ti: number }) {
  const {
    selectedTracks,
    gesture,
    trackPointerDown,
    trackContext,
    scroll,
    ppf,
    addMedia,
    addTitle,
  } = useTimeline();

  return (
    <div
      className={`track-row ${t.kind} ${t.locked ? 'locked' : ''} ${selectedTracks.includes(t.id) ? 'selected-track' : ''} ${gesture?.edge === 'move' && gesture.track === t.id && gesture.sourceTrack !== t.id ? 'drag-target' : ''}`}
      key={t.id}
      data-track={t.id}
      data-kind={t.kind}
      data-locked={t.locked}
      onPointerDown={(e) => trackPointerDown(e, t)}
      onContextMenu={(e) => trackContext(e, t)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = t.locked ? 'none' : 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (t.locked) return;
        const rect = scroll.current!.getBoundingClientRect();
        const f = Math.max(
          0,
          Math.round((e.clientX - rect.left + scroll.current!.scrollLeft - head) / ppf),
        );
        const mid = e.dataTransfer.getData('application/cutline-asset');
        const title = e.dataTransfer.getData('application/cutline-title');
        if (mid) addMedia(mid, t.id, f);
        if (title && t.kind === 'video') addTitle(title, f, t.id);
      }}
    >
      <TrackHeader t={t} />
      <TrackLane t={t} ti={ti} />
    </div>
  );
}
