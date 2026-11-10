import { useMemo } from 'react';
import type { EditorState } from './state/useEditorState';
export function useEditorModel(ctx: EditorState) {
  const { snap, tab, search, selected, jobs, draft, exportJob, selectedTracks } = ctx;
  const p = snap.project;
  const selectedClip =
    p.tracks.flatMap((t) => t.clips).find((c) => selected.includes(c.id)) || null;
  const selectedTrack =
    p.tracks.find((t) => selectedTracks.includes(t.id)) ||
    p.tracks.find((t) => t.clips.some((c) => c.id === selectedClip?.id));
  const activeJobs = jobs.filter((j) => j.status === 'running');
  const currentExport = jobs.find((j) => j.id === exportJob);
  const missing = p.assets.filter((a) => a.missing);
  const assets = p.assets.filter(
    (a) => (tab !== 'Audio' || a.hasAudio) && a.name.toLowerCase().includes(search.toLowerCase()),
  );
  const render = useMemo(
    () =>
      snap.render
        ? {
            ...snap.render,
            clips: snap.render.clips.map((rc) =>
              draft && selectedClip?.id === rc.clip.id
                ? { ...rc, clip: { ...rc.clip, props: draft } }
                : rc,
            ),
          }
        : null,
    [snap.render, draft, selectedClip?.id],
  );
  return { p, selectedClip, selectedTrack, activeJobs, currentExport, missing, assets, render };
}
export type EditorModel = ReturnType<typeof useEditorModel>;
