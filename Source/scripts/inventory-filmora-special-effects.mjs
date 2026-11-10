import fs from 'node:fs';
import path from 'node:path';
import { installation, downloads, files, read, metadata, hash } from './filmora-resources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const records = [];
function downloadedAudio(directory) {
  const info = metadata(directory);
  const definition = files(directory).find((file) => path.basename(file) === 'data.xml');
  const settings = {};
  if (definition) {
    for (const match of read(definition).matchAll(/key="(Effect\.[^"]+)"[^>]*value="([^"]*)"/g))
      settings[match[1]] = match[2];
  }
  return {
    ...info,
    source: path.relative(downloads, directory).replaceAll('\\', '/'),
    settings,
    status: 'requires-audio-dsp-adapter',
    reason:
      'Preset settings are present; the installed audio processor is a compiled plugin, not portable DSP source.',
  };
}
const audio = path.join(downloads, 'audioeffect');
if (fs.existsSync(audio))
  for (const item of fs.readdirSync(audio, { withFileTypes: true }))
    if (item.isDirectory()) records.push(downloadedAudio(path.join(audio, item.name)));

const bundled = path.join(installation, 'resources/audio_effect');
for (const file of files(bundled).filter((file) => path.basename(file) === 'description.json')) {
  const data = JSON.parse(read(file));
  records.push({
    name: data.display_name,
    category: 'Audio Effects',
    source: path.relative(installation, file).replaceAll('\\', '/'),
    definitionHash: hash(fs.readFileSync(file)),
    parameters: data.params,
    status: 'requires-audio-dsp-adapter',
    reason: 'Parameter description only; executable DSP source is absent from this resource.',
  });
}
fs.writeFileSync(
  path.join(root, 'docs/filmora-audio-inventory.json'),
  JSON.stringify(records, null, 2) + '\n',
);
console.log(`Inventoried ${records.length} audio resources; none exposed as working effects.`);
