import { timecode } from '../../types';
import { useTimeline } from './context';

export function TimelineFooter() {
  const { tool, selectedTracks, selected, total, project } = useTimeline();

  return (
    <div className="timeline-footer">
      <span>
        <span className="status-dot" />{' '}
        {tool === 'razor'
          ? 'Razor tool'
          : selectedTracks.length
            ? selectedTracks.length +
              ' track' +
              (selectedTracks.length === 1 ? '' : 's') +
              ' selected'
            : selected.length
              ? `${selected.length} clip${selected.length > 1 ? 's' : ''} selected`
              : 'Selection tool'}
      </span>
      <span>
        Duration <strong>{timecode(total, project.fps)}</strong>
      </span>
    </div>
  );
}
