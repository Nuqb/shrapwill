import { createContext, useContext } from 'react';
import type { useTimeline as useTimelineController } from './useTimeline';
export type TimelineState = ReturnType<typeof useTimelineController>;
export const TimelineContext = createContext<TimelineState | null>(null);
export function useTimeline() {
  const value = useContext(TimelineContext);
  if (!value) throw Error('Timeline requires its provider');
  return value;
}
