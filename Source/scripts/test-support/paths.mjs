import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const qaDir = path.resolve(process.env.SHRAPWILL_QA_DIR || path.join(sourceRoot, '../QA'));
export const outputDir = path.resolve(
  process.env.SHRAPWILL_OUTPUT_DIR || path.join(sourceRoot, '../Outputs'),
);
export const qaPath = (name) => path.join(qaDir, name);
export function outputPath(name) {
  fs.mkdirSync(outputDir, { recursive: true });
  return path.join(outputDir, name);
}
export const debugUrl = (port = 9223) =>
  `http://127.0.0.1:${process.env.SHRAPWILL_DEBUG_PORT || port}`;
