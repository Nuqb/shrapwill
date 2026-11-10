import type {
  Clip,
  MediaAsset,
  Project,
  RenderClip,
  RenderPlan,
  Snapshot,
  Track,
} from '../../types';

export type EntityPatch<T> = { upsert: T[]; removed: string[]; order?: string[] };
type TrackHeader = Omit<Track, 'clips'> & { clipIds: string[] };
export type StateDelta = {
  baseSequence: number;
  sessionId: string;
  sequence: number;
  project: Omit<Project, 'assets' | 'tracks'>;
  flags: Omit<Snapshot, 'project' | 'render' | 'sequence' | 'sessionId'>;
  assets: EntityPatch<MediaAsset>;
  tracks: EntityPatch<TrackHeader>;
  clips: EntityPatch<Clip>;
  render: (Omit<RenderPlan, 'clips'> & { clips: EntityPatch<RenderClip> }) | null;
};
export type StateUpdate =
  | { kind: 'full'; snapshot: Snapshot }
  | { kind: 'delta'; delta: StateDelta };
export type UpdateAck = { updateSequence: number; sessionId: string };

function patchEntities<T>(old: T[], patch: EntityPatch<T>, id: (item: T) => string): T[] {
  if (!patch.order && !patch.removed.length && !patch.upsert.length) return old;
  const entries = new Map(old.map((item) => [id(item), item]));
  patch.removed.forEach((key) => entries.delete(key));
  patch.upsert.forEach((item) => entries.set(id(item), item));
  return (patch.order ?? [...entries.keys()]).map((key) => {
    const item = entries.get(key);
    if (!item) throw Error('Incomplete editor update');
    return item;
  });
}
function patchTracks(old: Track[], delta: StateDelta): Track[] {
  if (
    !delta.clips.upsert.length &&
    !delta.clips.removed.length &&
    !delta.tracks.upsert.length &&
    !delta.tracks.removed.length &&
    !delta.tracks.order
  )
    return old;
  const clips = new Map(old.flatMap((t) => t.clips.map((c) => [c.id, c] as const)));
  delta.clips.removed.forEach((id) => clips.delete(id));
  delta.clips.upsert.forEach((clip) => clips.set(clip.id, clip));
  const tracks = new Map(old.map((track) => [track.id, track]));
  delta.tracks.removed.forEach((id) => tracks.delete(id));
  const headers = new Map(delta.tracks.upsert.map((track) => [track.id, track]));
  const order = delta.tracks.order ?? [...tracks.keys()];
  return order.map((id) => {
    const previous = tracks.get(id),
      header = headers.get(id);
    if (!previous && !header) throw Error('Missing updated track');
    const ids = header?.clipIds ?? previous!.clips.map((c) => c.id);
    const next = ids.map((key) => {
      const clip = clips.get(key);
      if (!clip) throw Error('Missing updated clip');
      return clip;
    });
    if (!header && next.every((clip, i) => clip === previous!.clips[i])) return previous!;
    const { clipIds: _clipIds, ...metadata } = header ?? { ...previous!, clipIds: ids };
    return { ...metadata, clips: next };
  });
}
function headerMatches<T extends object>(old: T, header: Partial<T>): boolean {
  return Object.entries(header).every(
    ([key, value]) => JSON.stringify(old[key as keyof T]) === JSON.stringify(value),
  );
}
export function applyDelta(old: Snapshot, delta: StateDelta): Snapshot {
  const assets = patchEntities(old.project.assets, delta.assets, (a) => a.id);
  const tracks = patchTracks(old.project.tracks, delta);
  const project =
    assets === old.project.assets &&
    tracks === old.project.tracks &&
    headerMatches(old.project, delta.project)
      ? old.project
      : { ...delta.project, assets, tracks };
  let render: RenderPlan | null = null;
  if (delta.render) {
    const { clips: patch, ...header } = delta.render;
    const clips = patchEntities(old.render?.clips ?? [], patch, (rc) => rc.clip.id);
    render =
      old.render && clips === old.render.clips && headerMatches(old.render, header)
        ? old.render
        : { ...old.render, ...header, clips };
  }
  return { ...delta.flags, project, render, sessionId: delta.sessionId, sequence: delta.sequence };
}

export class EditorStateStore {
  private current?: Snapshot;
  private listeners = new Set<(snapshot: Snapshot) => void>();
  private reloading?: Promise<Snapshot>;
  constructor(private reload: () => Promise<Snapshot>) {}
  subscribe(listener: (snapshot: Snapshot) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  full(snapshot: Snapshot): Snapshot {
    if (this.current && (snapshot.sequence ?? 0) <= (this.current.sequence ?? 0))
      return this.current;
    this.current = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }
  resync(): Promise<Snapshot> {
    if (!this.reloading) {
      this.reloading = this.reload()
        .then((snapshot) => this.full(snapshot))
        .finally(() => {
          this.reloading = undefined;
        });
    }
    return this.reloading;
  }
  async receive(update: StateUpdate): Promise<Snapshot> {
    if (update.kind === 'full') return this.full(update.snapshot);
    const delta = update.delta;
    if (this.current && delta.sequence <= (this.current.sequence ?? 0)) return this.current;
    if (
      !this.current ||
      this.current.sessionId !== delta.sessionId ||
      this.current.sequence !== delta.baseSequence
    )
      return this.resync();
    try {
      return this.full(applyDelta(this.current, delta));
    } catch {
      return this.resync();
    }
  }
  private acknowledged(ack: UpdateAck): Snapshot | undefined {
    if (!this.current || (this.current.sequence ?? 0) < ack.updateSequence) return;
    if (this.current.sessionId !== ack.sessionId)
      throw Error('The project changed before this operation completed.');
    return this.current;
  }
  async waitFor(ack: UpdateAck): Promise<Snapshot> {
    const known = this.acknowledged(ack);
    if (known) return known;
    let unsubscribe = () => {};
    let timer: ReturnType<typeof setTimeout>;
    const delivered = new Promise<Snapshot>((resolve, reject) => {
      const check = () => {
        try {
          const snapshot = this.acknowledged(ack);
          if (snapshot) resolve(snapshot);
        } catch (error) {
          reject(error);
        }
      };
      unsubscribe = this.subscribe(check);
      timer = setTimeout(() => {
        void this.resync().then(() => {
          try {
            const snapshot = this.acknowledged(ack);
            if (snapshot) resolve(snapshot);
            else reject(Error('Editor update unavailable'));
          } catch (error) {
            reject(error);
          }
        }, reject);
      }, 250);
      check();
    });
    try {
      return await delivered;
    } finally {
      unsubscribe();
      clearTimeout(timer!);
    }
  }
}
