import { useCallback } from 'react';
import { call, chooseMedia } from '../../bridge';
import type { EditorState } from '../state/useEditorState';
async function importPathsOperation(ctx: EditorState, paths: string[]) {
  const { setLauncher, quality, notify } = ctx;
  try {
    if (paths.length) {
      await call<string>('import_media', { paths, quality });
      setLauncher(false);
    }
  } catch (e) {
    notify(String(e));
  }
}
async function importFilesOperation(ctx: EditorState) {
  const { notify } = ctx;
  try {
    const paths = await chooseMedia();
    if (paths) await importPathsOperation(ctx, Array.isArray(paths) ? paths : [paths]);
  } catch (e) {
    notify(String(e));
  }
}
export function useImportFiles(ctx: EditorState) {
  const { quality, notify } = ctx;
  const importPaths = useCallback(
    (paths: string[]) => importPathsOperation(ctx, paths),
    [quality, notify],
  );
  const importFiles = useCallback(() => importFilesOperation(ctx), [importPaths, notify]);
  return { importPaths, importFiles };
}
