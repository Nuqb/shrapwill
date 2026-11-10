import { useCallback } from 'react';
import { call } from '../../bridge';
import type { EditorState } from '../state/useEditorState';
export function usePreviewPreparation(ctx: EditorState) {
  const { quality, ref, previewPending, previewJobs, notify } = ctx;
  const ensureMedia = useCallback(
    (ids: string[], forceProxy = false) => {
      for (const [jobId, mediaIds] of previewJobs.current) {
        if (!mediaIds.some((id) => ids.includes(id))) {
          void call('cancel_job', { id: jobId });
        }
      }
      const needed = ids.filter(
        (id) =>
          !previewPending.current.has(id) &&
          ref.current.snap.project.assets.some((a) => a.id === id && !a.missing),
      );
      if (!needed.length) return;
      needed.forEach((id) => previewPending.current.add(id));
      void call<string>(forceProxy ? 'prepare_compatible_preview' : 'prepare_preview', {
        quality,
        mediaIds: needed,
      })
        .then((id) => previewJobs.current.set(id, needed))
        .catch((e) => notify(String(e)));
    },
    [quality, notify],
  );
  return { ensureMedia };
}
