import { timecode } from '../../types';
import { useTimeline } from './context';
import { head } from './constants';

export function TimelineRuler() {
  const { seek, frame, project, lastTick, firstTick, interval, pps, ppf, scrollX } = useTimeline();

  return (
    <div className="ruler" tabIndex={-1} onPointerDown={seek}>
      <div className="ruler-corner">
        <span>{timecode(frame, project.fps)}</span>
      </div>
      <button
        className="playhead-handle"
        aria-label="Timeline playhead"
        title="Drag playhead"
        style={{
          left: head + frame * ppf,
          visibility: frame * ppf < scrollX ? 'hidden' : 'visible',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          seek(e);
        }}
      />
      {Array.from({ length: lastTick - firstTick + 1 }, (_, i) => {
        const sec = (i + firstTick) * interval;
        return (
          <div className="ruler-tick" key={sec} style={{ left: head + sec * pps }}>
            <span>
              {Math.floor(sec / 60)
                .toString()
                .padStart(2, '0')}
              :{(sec % 60).toString().padStart(2, '0')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
