import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLauncher } from './launcher/build.mjs';
import { publishRelease } from './release/publish.mjs';

export function publishApp(executable) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const launcher = buildLauncher(root);
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  fs.cpSync(path.join(root, 'src-tauri/notices'), path.join(root, '../App/notices'), {
    recursive: true,
  });
  const published = publishRelease({
    executable,
    launcher,
    appDirectory: path.join(root, '../App'),
    version,
  });
  console.log(`Launcher now opens ${published}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  publishApp(
    path.resolve(
      process.argv[2] ||
        path.join(
          process.env.CARGO_TARGET_DIR || path.join(root, 'target'),
          'release/shrapwill.exe',
        ),
    ),
  );
}
