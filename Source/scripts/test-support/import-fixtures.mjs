import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { qaDir, sourceRoot } from './paths.mjs';

export async function importFixtures() {
  const ffmpeg = path.join(sourceRoot, 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe');
  const common = path.join(qaDir, 'Import-latency-60s.mp4');
  const fallback = path.join(qaDir, 'Import-fallback-60s.mkv');
  const switching = path.join(qaDir, 'Import-switch-60s.mkv');
  const audio = path.join(qaDir, 'Import-tone.wav');
  const broken = path.join(qaDir, 'Import-broken.mp4');
  const create = async (file, args) => {
    if (await fs.stat(file).catch(() => null)) return;
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args, file], {
      windowsHide: true,
    });
  };
  await create(common, [
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=1280x720:rate=30',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=48000',
    '-t',
    '60',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '30',
    '-pix_fmt',
    'yuv420p',
    '-threads',
    '2',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
  ]);
  await create(fallback, ['-i', common, '-c', 'copy']);
  if (!(await fs.stat(switching).catch(() => null))) await fs.copyFile(fallback, switching);
  await create(audio, [
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=880:sample_rate=48000',
    '-t',
    '2',
    '-c:a',
    'pcm_s16le',
  ]);
  await fs.writeFile(broken, 'Deliberately invalid disposable QA media');
  return { common, fallback, switching, audio, broken, image: path.join(qaDir, 'Warm still.png') };
}
