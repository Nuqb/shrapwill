import fs from 'node:fs';
import path from 'node:path';
import { installation } from './filmora-resources.mjs';
const config = path.join(process.env.SHRAPWILL_FILMORA_INSTALLATION || installation, 'configs');
const destination = path.resolve(import.meta.dirname, '../src/features/library/catalog');
const speedRoot = path.join(config, 'Speed');
const ramps = fs
  .readdirSync(speedRoot)
  .filter((name) => name.endsWith('.conf') && name !== 'Customize.conf')
  .map((name) => ({
    name: name.slice(0, -5),
    points: JSON.parse(
      JSON.parse(fs.readFileSync(path.join(speedRoot, name), 'utf8')).CurvedSpeed,
    ).map((p) => [p.SourceNormalPos / 100, p.SpeedRatio]),
  }));
fs.writeFileSync(path.join(destination, 'speed-ramps.json'), JSON.stringify(ramps, null, 2) + '\n');
const root = path.join(config, 'ColorAnd3dLutPreset/default');
const presets = fs
  .readdirSync(root)
  .filter((name) => fs.statSync(path.join(root, name)).isDirectory())
  .map((folder) => {
    const directory = path.join(root, folder);
    const name = JSON.parse(fs.readFileSync(path.join(directory, 'resinfo.json'), 'utf8')).titles
      .en;
    const data = path.join(directory, 'Data');
    const file = fs.readdirSync(data).find((name) => name.endsWith('.conf'));
    const config = JSON.parse(fs.readFileSync(path.join(data, file), 'utf8'));
    const values = Object.fromEntries(
      JSON.parse(config.ColorAdjust).paramList.map((p) => [p.name, p.fxParam.unValue]),
    );
    return { name, values };
  });
fs.writeFileSync(
  path.join(destination, 'color-source.json'),
  JSON.stringify(presets, null, 2) + '\n',
);
