import { createMediaSource } from '../../features/preview/mediaSource';
import { call, chooseMedia } from '../../bridge';
import type { ActionContext } from './types';
export async function addMedia(ctx: ActionContext, id: string, trackId?: string, start?: number) {
  const { tab, frame, setFrame, setSource, selectClips, p, edit } = ctx;
  const a = p.assets.find((a) => a.id === id);
  if (!a) return;
  if (a.missing) {
    await relink(ctx, id);
    return;
  }
  const kind = tab === 'Audio' || a.kind === 'audio' ? 'audio' : 'video';
  let t = trackId
    ? p.tracks.find((t) => t.id === trackId)
    : p.magneticTimeline && kind === 'video'
      ? [...p.tracks].reverse().find((t) => t.kind === 'video')
      : p.tracks.find((t) => t.kind === kind && !t.locked);
  if (!t) {
    const s = await edit({ type: 'add_track', kind });
    t = s?.project.tracks.find((t) => t.kind === kind && !t.locked);
  }
  if (!t) return;
  const s = await edit({
    type: 'add_clip',
    media_id: id,
    track_id: t.id,
    start: start ?? Math.max(frame, ...t.clips.map((c) => c.start + c.duration)),
  });
  const added = s?.project.tracks.find((x) => x.id === t!.id)?.clips.at(-1);
  if (added) {
    selectClips([added.id]);
    setSource(null);
    setFrame(added.start);
  }
}
export async function addTitle(
  ctx: ActionContext,
  style: string,
  start = ctx.frame,
  trackId?: string,
) {
  const { setFrame, setPlaying, setSource, selectedTracks, selectClips, p, ref, edit } = ctx;
  setPlaying(false);
  setSource(null);
  const before = new Set(ref.current.snap.project.tracks.flatMap((t) => t.clips.map((c) => c.id)));
  const main = [...p.tracks].reverse().find((t) => t.kind === 'video');
  const preferred =
    selectedTracks.length === 1
      ? p.tracks.find(
          (t) => t.id === selectedTracks[0] && t.kind === 'video' && !t.locked && t.id !== main?.id,
        )
      : undefined;
  const result = await edit({
    type: 'add_title',
    track_id: trackId ?? preferred?.id ?? '',
    start,
    style,
  });
  const c = result?.project.tracks.flatMap((t) => t.clips).find((c) => !before.has(c.id));
  if (c) {
    selectClips([c.id]);
    setSource(null);
    setFrame(c.start);
  }
}
export async function relink(ctx: ActionContext, id: string) {
  const { quality, notify } = ctx;
  try {
    const files = await chooseMedia();
    const path = Array.isArray(files) ? files[0] : files;
    if (path) await call('relink_media', { mediaId: id, path, quality });
  } catch (e) {
    notify(String(e));
  }
}
export function previewAsset(ctx: ActionContext, id: string) {
  const { setPlaying, setSource, p } = ctx;
  const a = p.assets.find((a) => a.id === id);
  if (a) {
    if (a.missing) {
      void relink(ctx, id);
      return;
    }
    setPlaying(false);
    setSource(createMediaSource(a, p.fps));
  }
}
