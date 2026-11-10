import { invoke, convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import type { Snapshot } from '../../types';
import { EditorStateStore, type UpdateAck } from './stateUpdates';
export const desktop = isTauri();
export const editorState = new EditorStateStore(() => invoke<Snapshot>('editor_snapshot'));
const compactCommands = new Set([
  'edit',
  'history',
  'clipboard',
  'new_project',
  'open_project',
  'recover_project',
  'save',
]);
export async function call<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!desktop) throw Error('Open the Shrapwill desktop app to edit local media.');
  if (compactCommands.has(command)) {
    const result = await invoke<UpdateAck | { snapshot: UpdateAck; selected: string[] }>(command, {
      ...args,
      compact: true,
    });
    if ('snapshot' in result)
      return { ...result, snapshot: await editorState.waitFor(result.snapshot) } as T;
    return (await editorState.waitFor(result)) as T;
  }
  const result = await invoke<T>(command, args);
  if (command === 'startup') {
    const startup = result as T & { snapshot: Snapshot };
    startup.snapshot = editorState.full(startup.snapshot);
  }
  return result;
}
export const assetUrl = (path: string | null | undefined) =>
  path ? (desktop ? convertFileSrc(path) : path) : '';
export const events = listen;
export async function chooseMedia() {
  return open({
    multiple: true,
    title: 'Import media',
    filters: [
      {
        name: 'Video, audio & images',
        extensions: [
          'mp4',
          'mov',
          'mkv',
          'webm',
          'avi',
          'm4v',
          'mts',
          'm2ts',
          'mp3',
          'wav',
          'aac',
          'm4a',
          'flac',
          'ogg',
          'opus',
          'png',
          'jpg',
          'jpeg',
          'bmp',
          'webp',
          'tif',
          'tiff',
        ],
      },
    ],
  });
}
export async function chooseProject() {
  return open({
    multiple: false,
    title: 'Open a Shrapwill project',
    filters: [{ name: 'Shrapwill project', extensions: ['cutline'] }],
  });
}
export async function saveProjectPath(name: string) {
  return save({
    title: 'Save project',
    defaultPath: `${name}.cutline`,
    filters: [{ name: 'Shrapwill project', extensions: ['cutline'] }],
  });
}
export async function exportPath(name: string) {
  return save({
    title: 'Export video',
    defaultPath: `${name}.mp4`,
    filters: [{ name: 'MP4 video', extensions: ['mp4'] }],
  });
}
