import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceRoot } from './update-key.mjs';
import { stableVersion } from './update-artifacts.mjs';
const tag = process.env.SHRAPWILL_RELEASE_TAG;
stableVersion(tag || '');
const directory = path.resolve(
  process.env.SHRAPWILL_RELEASE_OUTPUT || path.join(sourceRoot, '../Outputs/releases', tag),
);
const files = JSON.parse(fs.readFileSync(path.join(directory, 'upload-files.json'), 'utf8'));
if (
  !Array.isArray(files) ||
  files.at(-1) !== 'shrapwill-update.json' ||
  files.some((file) => file !== path.basename(file))
)
  throw Error('Invalid release upload list.');
for (const file of files)
  execFileSync('gh', ['release', 'upload', tag, path.join(directory, file), '--clobber'], {
    stdio: 'inherit',
    windowsHide: true,
  });
