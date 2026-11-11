import { durationOf, fpsOf, type Project } from '../../types';
import { head } from './constants';

export function timelineBounds(project: Project, width: number) {
  const seconds = Math.max(1, durationOf(project) / fpsOf(project.fps));
  const viewport = Math.max(1, width - head - 16);
  const length = seconds + Math.min(5, Math.max(1, seconds * 0.04));
  const minZoom = viewport / (length * 45);
  return { length, minZoom, maxZoom: Math.max(8, minZoom * 8) };
}

export function snapPlayhead(project: Project, requested: number, pixelsPerFrame: number) {
  const targets = [
    0,
    ...project.tracks.flatMap((t) => t.clips.flatMap((c) => [c.start, c.start + c.duration])),
  ];
  let nearest = requested,
    distance = 8 / pixelsPerFrame;
  for (const frame of targets) {
    const gap = Math.abs(frame - requested);
    if (gap < distance) {
      nearest = frame;
      distance = gap;
    }
  }
  return nearest;
}
