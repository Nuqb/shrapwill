import { Link2, Film, Music2 } from 'lucide-react';
import type { Track, Clip } from '../../types';
import { assetUrl } from '../../bridge';
import { useTimeline } from './context';
import { Waveform } from './Waveform';
import { transitionPresets } from '../library/presets';

export function TimelineClip({ c, t }: { c: Clip; t: Track }) {
  const { selected, start, clipContext, onSelected, fps, ppf, tool, project, movingIds } =
    useTimeline();
  const a = project.assets.find((a) => a.id === c.mediaId);
  const dragging = movingIds.has(c.id);
  const left = c.start * ppf,
    w = c.duration * ppf;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${c.name}, ${t.name}`}
      key={c.id}
      data-clip-id={c.id}
      className={`timeline-clip ${c.title ? 'title-clip' : t.kind === 'audio' ? 'audio-clip' : 'video-clip'} ${selected.includes(c.id) ? 'selected' : ''} ${a?.missing ? 'missing' : ''} ${dragging ? 'dragging-clip' : ''}`}
      style={{ left, width: Math.max(3, w) }}
      onPointerDown={(e) => start(e, c, t, 'move')}
      onContextMenu={(e) => clipContext(e, c)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey)
          onSelected([c.id]);
      }}
    >
      <div className="clip-name">
        {c.link && <Link2 size={10} />}{' '}
        {c.title ? (
          <span className="title-letter">T</span>
        ) : t.kind === 'audio' ? (
          <Music2 size={10} />
        ) : (
          <Film size={10} />
        )}
        <span>{c.name}</span>
      </div>
      {a && t.kind === 'video' && a.thumbnailPath && (
        <div
          className="clip-thumbnails"
          style={{ backgroundImage: `url("${assetUrl(a.thumbnailPath)}")` }}
        />
      )}
      {a && a.hasAudio && <Waveform asset={a} clip={c} width={w} rate={fps} />}{' '}
      {c.title && <div className="title-preview-text">{c.title.text}</div>}
      <TransitionIndicator clip={c} width={w} ppf={ppf} />
      {tool === 'select' && (
        <>
          <div className="trim-handle left" onPointerDown={(e) => start(e, c, t, 'left')} />
          <div className="trim-handle right" onPointerDown={(e) => start(e, c, t, 'right')} />
        </>
      )}
    </div>
  );
}

function TransitionIndicator({ clip, width, ppf }: { clip: Clip; width: number; ppf: number }) {
  if (!clip.transition) return null;
  const name =
    transitionPresets.find((preset) => preset.kind === clip.transition!.kind)?.name || 'Transition';
  return (
    <div
      className="transition-indicator"
      style={{ width: Math.min(width, clip.transition.frames * ppf) }}
      title={name}
    />
  );
}
