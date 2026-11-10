import { invoke, convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
export const desktop = isTauri();
export const call = <T>(command: string, args: Record<string, unknown> = {}): Promise<T> =>
  desktop
    ? invoke<T>(command, args)
    : Promise.reject(new Error('Open the Shrapwill desktop app to edit local media.'));
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
