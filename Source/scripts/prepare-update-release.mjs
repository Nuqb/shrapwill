import fs from 'node:fs';
import path from 'node:path';
import { buildLauncher } from './launcher/build.mjs';
import { signingKey, sourceRoot, publicConfigPath } from './release/update-key.mjs';
import {
  stableVersion,
  fileInfo,
  createUpdatePackage,
  portableZip,
  signRelease,
} from './release/update-artifacts.mjs';

const tag = process.env.SHRAPWILL_RELEASE_TAG || process.argv[2];
const version = stableVersion(tag || '');
const configured = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
if (configured.version !== version)
  throw Error('The application version must match the release tag. Run release:version first.');
const key = signingKey();
const { repository } = JSON.parse(fs.readFileSync(publicConfigPath, 'utf8'));
const directory = path.resolve(
  process.env.SHRAPWILL_RELEASE_OUTPUT || path.join(sourceRoot, '../Outputs/releases', tag),
);
fs.mkdirSync(directory, { recursive: true });
const editor = path.join(sourceRoot, 'target/release/shrapwill.exe');
const launcher = buildLauncher(sourceRoot);
const files = [
  { name: 'shrapwill.exe', file: editor },
  { name: 'shrapwill-launcher.exe', file: launcher },
  ...['ffmpeg', 'ffprobe'].map((name) => ({
    name: `${name}.exe`,
    file: path.join(sourceRoot, `src-tauri/binaries/${name}-x86_64-pc-windows-msvc.exe`),
  })),
  ...fs.readdirSync(path.join(sourceRoot, 'src-tauri/notices')).map((name) => ({
    name: `notices/${name}`,
    file: path.join(sourceRoot, 'src-tauri/notices', name),
  })),
  {
    name: 'icons/shrapwill-taskbar-5d076e58.ico',
    file: path.join(sourceRoot, 'src-tauri/icons/shrapwill-taskbar-5d076e58.ico'),
  },
];
const installerDirectory = path.join(sourceRoot, 'target/release/bundle/nsis');
const suppliedInstaller = process.env.SHRAPWILL_RELEASE_INSTALLER;
const matches = suppliedInstaller
  ? [path.basename(suppliedInstaller)]
  : fs.readdirSync(installerDirectory).filter((name) => name.endsWith(`_${version}_x64-setup.exe`));
if (matches.length !== 1)
  throw Error('Build the Windows NSIS installer for this release before preparing updates.');
const installerName = matches[0];
if (!installerName.endsWith(`_${version}_x64-setup.exe`))
  throw Error('The installer version must match the release tag.');
const installerFile = path.join(directory, installerName);
const installerSource = suppliedInstaller
  ? path.resolve(suppliedInstaller)
  : path.join(installerDirectory, installerName);
if (path.resolve(installerSource) !== path.resolve(installerFile))
  fs.copyFileSync(installerSource, installerFile);
const portableName = `Shrapwill_${version}_windows-x86_64.shrapwill.gz`;
const portableFile = path.join(directory, portableName);
const portable = await createUpdatePackage({ version, files, destination: portableFile });
const installer = await fileInfo(installerFile);
const limit = 2 * 1024 ** 3;
if (portable.size >= limit || installer.size >= limit)
  throw Error('An update asset exceeds GitHub’s 2 GiB limit.');
const download = (name) => `https://github.com/${repository}/releases/download/${tag}/${name}`;
const release = {
  schemaVersion: 1,
  repository,
  version,
  tag,
  notes: (process.env.SHRAPWILL_RELEASE_NOTES || '').slice(0, 4000),
  portable: { ...portable, url: download(portableName) },
  installer: { ...installer, url: download(installerName) },
};
const archiveName = `Shrapwill_${version}_portable.zip`;
await portableZip({
  files,
  launcher,
  version,
  editorHash: (await fileInfo(editor)).sha256,
  destination: path.join(directory, archiveName),
});
fs.writeFileSync(
  path.join(directory, 'shrapwill-update.json'),
  JSON.stringify(signRelease(release, key), null, 2),
);
fs.writeFileSync(
  path.join(directory, 'upload-files.json'),
  JSON.stringify([installerName, portableName, archiveName, 'shrapwill-update.json']),
);
console.log(`Prepared signed release assets in ${directory}. Upload shrapwill-update.json last.`);
