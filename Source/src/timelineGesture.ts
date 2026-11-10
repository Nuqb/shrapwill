import { fpsOf, type Clip, type Project, type Track } from './types';

export interface Gesture {
  id: string;
  edge: 'move' | 'left' | 'right';
  startX: number;
  delta: number;
  track: string;
  sourceTrack: string;
  origin: Clip;
  ids: string[];
}
export function linkedClipIds(project: Project, ids: string[]): string[] {
  const clips = project.tracks.flatMap((t) => t.clips);
  const links = new Set(clips.filter((c) => ids.includes(c.id) && c.link).map((c) => c.link));
  return clips.filter((c) => ids.includes(c.id) || (c.link && links.has(c.link))).map((c) => c.id);
}
export function clampGestureDelta(project: Project, g: Gesture, requested: number): number {
  const affected = new Set(linkedClipIds(project, g.edge === 'move' ? g.ids : [g.id]));
  const clips = project.tracks.flatMap((t) => t.clips).filter((c) => affected.has(c.id));
  const fps = fpsOf(project.fps);
  if (g.edge === 'move')
    return Math.max(requested, -(clips.length ? Math.min(...clips.map((c) => c.start)) : 0));
  let low = -Infinity,
    high = Infinity;
  for (const c of clips) {
    if (g.edge === 'left') {
      low = Math.max(low, -Math.round(c.sourceIn * fps), -c.start);
      high = Math.min(high, c.duration - 1);
    } else {
      low = Math.max(low, 1 - c.duration);
      const asset = project.assets.find((a) => a.id === c.mediaId);
      if (asset && asset.kind !== 'image')
        high = Math.min(high, Math.floor((asset.duration - c.sourceIn) * fps) - c.duration);
    }
  }
  return Math.min(high, Math.max(low, requested));
}
// A local view only: Rust receives one command on release and owns the undo history.
export function gestureTracks(project: Project, g: Gesture | null): Track[] {
  if (!g) return project.tracks;
  const currentTrack = project.tracks.find((t) => t.clips.some((c) => c.id === g.id));
  const current = currentTrack?.clips.find((c) => c.id === g.id);
  if (
    !current ||
    currentTrack?.id !== g.sourceTrack ||
    current.start !== g.origin.start ||
    current.duration !== g.origin.duration
  )
    return project.tracks;
  const affected = new Set(linkedClipIds(project, g.edge === 'move' ? g.ids : [g.id]));
  const delta = clampGestureDelta(project, g, g.delta),
    fps = fpsOf(project.fps);
  const tracks = project.tracks.map((t) => ({
    ...t,
    clips: t.clips.map((c) => {
      if (!affected.has(c.id)) return c;
      if (g.edge === 'move') return { ...c, start: c.start + delta };
      if (g.edge === 'left')
        return {
          ...c,
          start: c.start + delta,
          duration: c.duration - delta,
          sourceIn: Math.max(0, c.sourceIn + delta / fps),
        };
      return { ...c, duration: c.duration + delta };
    }),
  }));
  if (g.edge === 'move' && g.track !== g.sourceTrack) {
    const source = tracks.find((t) => t.id === g.sourceTrack),
      target = tracks.find((t) => t.id === g.track);
    if (source && target && !target.locked && source.kind === target.kind) {
      const moved = source.clips.filter((c) => g.ids.includes(c.id));
      source.clips = source.clips.filter((c) => !g.ids.includes(c.id));
      target.clips.push(...moved);
    }
  }
  return tracks;
}
