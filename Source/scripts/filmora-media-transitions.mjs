import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash, read, decoded, downloads, installation } from './filmora-resources.mjs';
import { stage } from './filmora-stage-kernels.mjs';
const indexFile = path.resolve(import.meta.dirname, '../docs/filmora-video-frames.json');
const frameIndex = fs.existsSync(indexFile) ? JSON.parse(read(indexFile)) : {};

function browserFrames(file, target) {
  const key = hash(fs.readFileSync(file));
  if (frameIndex[key]?.every((name) => fs.existsSync(path.join(target, 'assets', name))))
    return frameIndex[key];
  const temporary = path.resolve(import.meta.dirname, '../../QA/filmora-video-frames', key);
  fs.mkdirSync(temporary, { recursive: true });
  const ffmpeg = path.resolve(
    import.meta.dirname,
    '../src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe',
  );
  execFileSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-y',
      '-threads',
      '2',
      '-i',
      file,
      '-an',
      '-pix_fmt',
      'bgra',
      '-c:v',
      'libwebp',
      '-lossless',
      '1',
      '-compression_level',
      '4',
      path.join(temporary, '%04d.webp'),
    ],
    { windowsHide: true, timeout: 300000 },
  );
  const frames = fs
    .readdirSync(temporary)
    .sort()
    .map((name) => asset(path.join(temporary, name), target));
  frameIndex[key] = frames;
  fs.writeFileSync(indexFile, JSON.stringify(frameIndex, null, 2) + '\n');
  return frames;
}

function copy(file, target, kind) {
  const bytes = fs.readFileSync(file),
    sourceFile = kind + path.extname(file);
  fs.writeFileSync(path.join(target, 'originals', sourceFile), bytes);
  return { sourceFile, sourceHash: hash(bytes) };
}
function asset(file, target) {
  const bytes = fs.readFileSync(file),
    name = hash(bytes) + path.extname(file).toLowerCase();
  fs.writeFileSync(path.join(target, 'assets', name), bytes);
  return name;
}
function video(file, target) {
  const probe = path.resolve(
    import.meta.dirname,
    '../src-tauri/binaries/ffprobe-x86_64-pc-windows-msvc.exe',
  );
  const info = JSON.parse(
    execFileSync(
      probe,
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,r_frame_rate,nb_frames',
        '-of',
        'json',
        file,
      ],
      { windowsHide: true },
    ),
  ).streams[0];
  const [num, den] = info.r_frame_rate.split('/').map(Number);
  if (!info.nb_frames || Number(info.nb_frames) > 600 || info.width * info.height > 3840 * 2160)
    throw Error('Unbounded transition video');
  return {
    files: [asset(file, target)],
    format: 'video',
    browserFrames: browserFrames(file, target),
    width: info.width,
    height: info.height,
    fps: num / den,
    frameCount: Number(info.nb_frames),
  };
}
export function importMediaTransition(entry, all, target) {
  const xml = all.find((file) => path.basename(file).toLowerCase() === 'filter.xml');
  if (!xml) return;
  const definition = read(xml);
  const find = (name) =>
    all.find((file) => path.basename(file).toLowerCase() === name?.toLowerCase());
  const image = definition.match(/<ImageFile>([^<]+)<\/ImageFile>/)?.[1];
  const videoName = definition.match(/<VideoFile>([^<]+)<\/VideoFile>/)?.[1];
  let body,
    textures,
    sources = [];
  if (image && /<ImageAlphaTrans>/.test(definition)) {
    const file = find(image);
    if (!file) throw Error(`Missing original mask ${image}`);
    textures = [{ files: [asset(file, target)] }];
    const kernel = path.join(
      installation,
      'resources/wfx_effect/plugin/AlphaTransition/AlphaTransition.frag',
    );
    body = decoded(kernel).replace(/PREFIX\(progress\)/g, '(u_global_time/u_total_time)');
    sources = [copy(kernel, target, entry.kind + '-alpha-kernel')];
  } else if (videoName && /<VideoOverlay>/.test(definition)) {
    const ml = find(definition.match(/<MultiLayer>([^<]+)<\/MultiLayer>/)?.[1]);
    if (!ml) throw Error('Missing original video layer recipe');
    const layers = [...read(ml).matchAll(/<Layer\s+([^>]+)\/>/g)].map((match) =>
      Object.fromEntries([...match[1].matchAll(/(\w+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]])),
    );
    if (layers.length !== 1 || layers[0].AlphaLayer !== '1' || layers[0].BlendType !== '0')
      throw Error('Unsupported original video layer recipe');
    const matte = find(layers[0].File),
      color = find(videoName);
    if (!matte || !color) throw Error('Missing original transition media');
    textures = [video(matte, target)];
    const overlay = matte !== color;
    if (overlay) textures.push(video(color, target));
    const compositor = path.join(
      downloads,
      'transition/2_Metallic_Silver_Grace_09/Data/Metallic_Silver_Grace_09.frag',
    );
    sources = [
      copy(ml, target, entry.kind + '-layers'),
      copy(compositor, target, entry.kind + '-compositor'),
    ];
    body = `vec4 FUNCNAME(vec2 tc){float p=clamp(PREFIX(global_time)/PREFIX(total_time),0.,1.);if(p<=0.)return INPUT1(tc);if(p>=1.)return INPUT2(tc);float w=iResolution.y*1920.0/1080.0;vec2 mapped=vec2((tc.x-.5)*iResolution.x/w+.5,tc.y);vec3 mask=INPUT3(mapped).rgb;vec4 fg=INPUT1(tc),bg=INPUT2(tc);${overlay ? 'fg=mix(fg,INPUT4(mapped),mask.g);' : ''}return mix(fg,bg,mask.r);}`;
  } else return;
  return {
    kind: entry.kind,
    name: entry.name,
    ...copy(xml, target, entry.kind),
    sources,
    status: 'shader',
    sourceType: 'media-recipe',
    body,
    preamble: '',
    inputs: ['INPUT1', 'INPUT2', 'INPUT3'],
    params: ['global_time', 'total_time'],
    defaults: {},
    sceneInputs: 2,
    textures,
    adaptations: [
      'compiled original image/video layer recipe into a local compositor',
      'preserved original compressed media and channel masks; decoded frames on demand',
    ],
  };
}
export function importMetallic(entry, all, target) {
  if (entry.kind !== 'local_metallic_silver_grace_09') return;
  const box = path.join(downloads, 'transition/2_Box_Turn_1/Data/Box Turn 1.frag');
  const movie = all.find((file) => file.endsWith('Golden Transition 09.mp4'));
  if (!movie || !fs.existsSync(box))
    throw Error('Missing original Metallic Silver graph dependency');
  const sources = all
    .filter((file) => /\.(?:effect|frag)$/.test(file) || path.basename(file) === 'project.json')
    .map((file, i) => copy(file, target, entry.kind + '-graph-' + i));
  const blendDirectory = path.join(downloads, 'filter/3_Allpurpose_BlendMode/Data');
  for (const extension of ['frag', 'conf', 'effect'])
    sources.push(
      copy(
        path.join(blendDirectory, 'Allpurpose BlendMode.' + extension),
        target,
        entry.kind + '-blend',
      ),
    );
  const body =
    `vec4 unpackOverlay(vec2 uv){return vec4(INPUT2(vec2(uv.x,.5+uv.y*.5)).rgb,INPUT2(vec2(uv.x,uv.y*.5)).g);}\n#undef INPUT2\n#define INPUT2(p) unpackOverlay(p)\n` +
    decoded(path.join(blendDirectory, 'Allpurpose BlendMode.frag'));
  return {
    kind: entry.kind,
    name: entry.name,
    ...copy(box, target, entry.kind),
    sources,
    status: 'shader',
    sourceType: 'original-node-graph',
    body: decoded(box),
    preamble: '',
    inputs: ['INPUT1', 'INPUT2'],
    params: [],
    defaults: {},
    sceneInputs: 2,
    textures: [{ ...video(movie, target), timing: 'integer-fps' }],
    passes: [
      stage(decoded(box), [0, 1]),
      stage(body, [-1, 2], {
        Premultiplied: '1',
        Blend: '0',
        OverlayOpacity: '100',
        Opacity: '100',
        TexWidth: '1920',
        TexHeight: '1080',
      }),
    ],
    adaptations: [
      'compiled original Box Turn 1 and packed video normal-blend node graph into local GPU stages',
    ],
  };
}
