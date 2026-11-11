import { createPortal } from 'react-dom';
import { Scissors } from 'lucide-react';
import { useTimeline } from './context';
import { head } from './constants';
import { TrackRow } from './Tracks';
import { TimelineToolbar } from './Toolbar';
import { TimelineRuler } from './Ruler';
import { TimelineFooter } from './Footer';
import { ContextMenuContent } from './ContextMenu';

export function TimelineView() {
  const {
    tool,
    scroll,
    setScrollX,
    changeZoom,
    zoom,
    timelineWidth,
    totalHeight,
    visibleTracks,
    hoverFrame,
    ppf,
    frame,
    context,
    seek,
  } = useTimeline();

  return (
    <section className={`timeline panel ${tool === 'razor' ? 'razor-mode' : ''}`}>
      <TimelineToolbar />
      <div
        className="timeline-scroll"
        ref={scroll}
        onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            changeZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <div
          className="timeline-content"
          style={{ width: timelineWidth + head, minHeight: totalHeight }}
        >
          <TimelineRuler />
          {visibleTracks.map((t, ti) => (
            <TrackRow t={t} ti={ti} />
          ))}
          {tool === 'razor' && hoverFrame !== null && (
            <div
              className="razor-guide"
              style={{ left: head + hoverFrame * ppf, height: totalHeight - 30 }}
            >
              <Scissors size={13} />
            </div>
          )}
          <div
            className="playhead"
            tabIndex={-1}
            onPointerDown={seek}
            style={{ left: head + frame * ppf, height: totalHeight }}
          ></div>
        </div>
      </div>
      <TimelineFooter />
      {context && createPortal(<ContextMenuContent />, document.body)}
    </section>
  );
}
