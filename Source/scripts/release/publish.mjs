import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function fileHash(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function publishRelease({ executable, launcher, appDirectory, version }) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw Error('Invalid release version.');
  const hash = fileHash(executable);
  fs.mkdirSync(appDirectory, { recursive: true });
  const filename = `shrapwill-${version}-${hash.slice(0, 16)}.exe`;
  const destination = path.join(appDirectory, filename);
  if (!fs.existsSync(destination)) {
    const staging = path.join(appDirectory, `.release-${randomUUID()}.tmp`);
    try {
      fs.copyFileSync(executable, staging);
      if (fileHash(staging) !== hash)
        throw Error('The build changed during publication. Retry after the build finishes.');
      fs.renameSync(staging, destination);
    } finally {
      fs.rmSync(staging, { force: true });
    }
  }
  if (fileHash(destination) !== hash)
    throw Error('The published build failed its integrity check.');
  installLauncher({ launcher, appDirectory });
  const reference = path.join(appDirectory, 'current-release.txt');
  const temporary = path.join(appDirectory, `.current-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, `${filename}\n`, { flag: 'wx' });
    fs.renameSync(temporary, reference);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return destination;
}

function installLauncher({ launcher, appDirectory }) {
  const destination = path.join(appDirectory, 'shrapwill.exe');
  if (fs.existsSync(destination)) {
    const previous = fileHash(destination);
    if (previous === fileHash(launcher)) return;
    const backup = path.join(appDirectory, `previous-entry-${previous.slice(0, 16)}.exe`);
    if (!fs.existsSync(backup)) fs.copyFileSync(destination, backup);
  }
  const temporary = path.join(appDirectory, `.launcher-${randomUUID()}.tmp`);
  try {
    fs.copyFileSync(launcher, temporary);
    fs.renameSync(temporary, destination);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}
