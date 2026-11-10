import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTypescript } from './scan-typescript.mjs';
import { scanRust } from './scan-rust.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inventoryPath = path.join(root, 'docs/quality/structural-debt.json');
const audit = process.argv.includes('--audit');
const json = process.argv.includes('--json');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(tsx?|rs|css)$/.test(entry.name) ? [full] : [];
  });
}

function scanFile(full) {
  const file = path.relative(root, full).replaceAll('\\', '/');
  const text = fs.readFileSync(full, 'utf8').replaceAll('\r\n', '\n');
  const lines = text.trimEnd().split('\n').length;
  const limit = file.endsWith('.tsx')
    ? 400
    : file.startsWith('src-tauri/src/commands/')
      ? 250
      : 500;
  const result = file.endsWith('.rs')
    ? scanRust(text, file)
    : file.endsWith('.css')
      ? []
      : scanTypescript(text, file);
  if (lines > limit)
    result.unshift({ file, line: 1, name: '(file)', rule: 'file', value: lines, limit });
  return result;
}

const roots = [
  'src',
  'crates/core/src',
  'crates/kernels/src',
  'crates/updater/src',
  'src-tauri/src',
];
const findings = roots.flatMap((directory) => files(path.join(root, directory)).flatMap(scanFile));
const key = (finding) => `${finding.file}:${finding.name}:${finding.rule}`;
const debt = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const known = new Map(debt.findings.map((finding) => [key(finding), finding]));
const regressions = findings.filter(
  (finding) => !known.has(key(finding)) || finding.value > known.get(key(finding)).value,
);
const resolved = debt.findings.filter(
  (finding) => !findings.some((current) => key(current) === key(finding)),
);

if (json) process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
else {
  for (const finding of audit ? findings : regressions) {
    console.log(
      `${finding.file}:${finding.line} ${finding.name}: ${finding.rule} ${finding.value} > ${finding.limit}`,
    );
  }
  console.log(
    `${findings.length} structural findings; ${regressions.length} new/growing; ${resolved.length} resolved.`,
  );
  console.log('Existing findings remain open work, documented in docs/quality/audit.md.');
}
if (!audit && regressions.length) process.exitCode = 1;
