import photos from './photo-catalog.json';

export const previewPhotoCount = photos.length;

export function previewPhotoIndex(key: string) {
  // Eye/person transitions need the two face-bearing samples in the first slots.
  if (key === 'local_left_eye_zoom' || key === 'local_zoom_ghost') return 0;
  if (key === 'Original' || key === 'None') return 0;
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(key)) hash = Math.imul(hash ^ byte, 16777619);
  return (hash >>> 0) % previewPhotoCount;
}
