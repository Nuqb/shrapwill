import photos from './photo-catalog.json';

const urls = import.meta.glob<string>('./assets/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

let scenes: HTMLCanvasElement[] | undefined;
let loading: Promise<void> | undefined;
let failure: unknown;

async function loadScene(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Preview image canvas is unavailable');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function loadArtScenes(): Promise<void> {
  loading ??= Promise.all(photos.map((name) => loadScene(urls[`./assets/${name}`])))
    .then((images) => {
      scenes = images;
    })
    .catch((error: unknown) => {
      failure = error;
      throw error;
    });
  return loading;
}

export function artScenesReady() {
  if (failure) throw failure;
  if (!scenes) void loadArtScenes().catch(() => {});
  return !!scenes;
}

export function artScene(second: boolean) {
  return artPhoto(second ? 1 : 0);
}

export function artPhoto(index: number) {
  if (!scenes) throw Error('Preview photos have not finished loading');
  return scenes[index];
}
