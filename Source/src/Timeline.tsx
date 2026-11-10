import { useTimeline } from './features/timeline/useTimeline';
import { TimelineContext } from './features/timeline/context';
import { TimelineView } from './features/timeline/TimelineView';
import type { Props } from './features/timeline/types';
export type { TimelineControls } from './features/timeline/types';
export default function Timeline(props: Props) {
  const state = useTimeline(props);
  return (
    <TimelineContext.Provider value={state}>
      <TimelineView />
    </TimelineContext.Provider>
  );
}
