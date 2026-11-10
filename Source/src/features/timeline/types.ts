import { type RefObject } from 'react';
import type { Project, Edit } from '../../types';
export interface TimelineControls {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  trackMenu: () => void;
}
export interface Props {
  selectedTracks: string[];
  onSelectedTracks: (ids: string[]) => void;
  onMagneticChange: () => void;
  tool: 'select' | 'razor';
  onToolChange: (tool: 'select' | 'razor') => void;
  snap: boolean;
  onSnapChange: (value: boolean) => void;
  controls: RefObject<TimelineControls | null>;
  project: Project;
  frame: number;
  onFrame: (n: number) => void;
  selected: string[];
  onSelected: (ids: string[]) => void;
  edit: (op: Edit) => Promise<unknown>;
  addMedia: (id: string, track: string, start: number) => void;
  addTitle: (style: string, start: number, track?: string) => void;
  split: () => void;
  remove: (ripple: boolean) => void;
  detach: () => void;
}
export type ContextMenu = { kind: 'tracks' | 'clips'; ids: string[]; x: number; y: number };
