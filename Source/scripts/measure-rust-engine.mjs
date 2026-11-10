// Alternating matched runs of the preserved baseline and current release example.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceRoot, qaDir } from './test-support/paths.mjs';

const directory = path.join(qaDir, 'rust-conversion');
fs.mkdirSync(directory, { recursive: true });
const baseline = path.resolve(process.argv[2] || path.join(directory, 'engine-before.exe'));
const current = path.join(sourceRoot, 'target/release/examples/engine_benchmark.exe');
if (!fs.existsSync(baseline))
  throw Error('Supply the preserved pre-change engine benchmark executable as the first argument.');
const before = [],
  after = [],
  transport = [];
const measure = (executable, args) =>
  JSON.parse(execFileSync(executable, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
for (const count of [100, 1000, 10000]) {
  for (let run = 0; run < 5; run++) {
    before.push(measure(baseline, [String(count)]));
    after.push(measure(current, [String(count)]));
  }
}
for (const count of [100, 1000, 10000]) {
  for (let run = 0; run < 5; run++) transport.push(measure(current, [String(count), 'transport']));
}
for (const [name, rows] of Object.entries({
  'engine-before': before,
  'engine-after': after,
  transport,
})) {
  fs.writeFileSync(
    path.join(directory, `${name}.jsonl`),
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
}
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(
  path.join(directory, 'environment.json'),
  JSON.stringify(
    {
      cpu: os.cpus()[0]?.model,
      logicalProcessors: os.cpus().length,
      node: process.version,
      rust: execFileSync('rustc', ['--version'], { encoding: 'utf8' }).trim(),
      baselineExecutableSha256: hash(baseline),
      currentExecutableSha256: hash(current),
      methodology:
        'Five alternating release runs per size, 100 property edits each; allocator-requested live/peak Rust heap, not application working set. Transport reconstructs the old two-full-snapshot protocol and compares production delta generation plus serialization and acknowledgement. Common render-plan construction excluded from transport timings.',
    },
    null,
    2,
  ),
);
console.log(`Saved matched engine and transport measurements to ${directory}`);
