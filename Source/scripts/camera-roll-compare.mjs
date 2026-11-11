import fs from 'node:fs';
import { promises as io } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Read-only inventories: folder layout is deliberately excluded from matching.
export async function inventory(root) {
  const files = [];
  const errors = [];
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop();
    try {
      const entries = await io.readdir(directory, { withFileTypes: true });
      for (let offset = 0; offset < entries.length; offset += 16) {
        await Promise.all(
          entries.slice(offset, offset + 16).map(async (entry) => {
            const full = path.join(directory, entry.name);
            try {
              if (entry.isSymbolicLink()) throw Error('Link skipped; target not inspected');
              if (entry.isDirectory()) pending.push(full);
              else if (entry.isFile()) {
                const stat = await io.stat(full);
                files.push({
                  path: full,
                  name: entry.name,
                  size: stat.size,
                  modified: stat.mtimeMs,
                });
              } else throw Error('Unsupported file type');
            } catch (error) {
              errors.push({ path: full, message: error.message });
            }
          }),
        );
      }
    } catch (error) {
      errors.push({ path: directory, message: error.message });
    }
  }
  return { files, errors };
}

async function digest(file) {
  const before = await io.stat(file.path);
  if (before.size !== file.size || before.mtimeMs !== file.modified)
    throw Error('File changed since inventory');
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file.path)) hash.update(chunk);
  const after = await io.stat(file.path);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs)
    throw Error('File changed while reading');
  return hash.digest('hex');
}

async function verifyCandidates(source, candidates, hashes, errors) {
  try {
    const sourceHash = await digest(source);
    for (const candidate of candidates) {
      try {
        if (!hashes.has(candidate.path)) hashes.set(candidate.path, await digest(candidate));
        if (hashes.get(candidate.path) === sourceHash) return candidate.path;
      } catch (error) {
        errors.push({ path: candidate.path, message: error.message });
      }
    }
  } catch (error) {
    errors.push({ path: source.path, message: error.message });
  }
  return null;
}

export async function compare(source, destination, verify = false) {
  const byName = new Map();
  for (const file of destination.files) {
    const key = file.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(file);
  }
  const rows = [];
  const errors = [...source.errors, ...destination.errors];
  const hashes = new Map();
  for (const file of source.files) {
    const named = byName.get(file.name.toLowerCase()) || [];
    const sized = named.filter((candidate) => candidate.size === file.size);
    let status = named.length ? 'different-size' : 'missing';
    let matchedPath = null;
    if (sized.length && !verify) status = 'likely-copy';
    if (sized.length && verify) {
      matchedPath = await verifyCandidates(file, sized, hashes, errors);
      status = matchedPath ? 'verified-copy' : 'not-verified';
    }
    rows.push({ ...file, status, matchedPath, candidates: named.map((item) => item.path) });
    if (verify && rows.length % 100 === 0)
      console.log(`Checked content: ${rows.length}/${source.files.length}`);
  }
  return { rows, errors };
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );

function csv(rows) {
  // Prevent spreadsheet formulas from being interpreted when opening filenames.
  const cell = (value) =>
    `"${String(/^[=+@\-\t\r]/.test(String(value)) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return (
    '\ufeff' +
    [
      ['Status', 'F-drive file', 'Bytes', 'Verified destination', 'Destination candidates'],
      ...rows.map((row) => [
        row.status,
        row.path,
        row.size,
        row.matchedPath || '',
        row.candidates.join(' | '),
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}

function htmlReport(report) {
  const counts = Object.entries(report.counts)
    .map(([name, count]) => `<li><b>${count.toLocaleString()}</b> ${escapeHtml(name)}</li>`)
    .join('');
  const issues = report.rows.filter(
    (row) => !['likely-copy', 'verified-copy'].includes(row.status),
  );
  const rows = issues
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.path)}</td><td>${row.size.toLocaleString()}</td><td>${row.candidates.map(escapeHtml).join('<br>')}</td></tr>`,
    )
    .join('');
  const errors = report.errors
    .map((error) => `<li>${escapeHtml(error.path)}: ${escapeHtml(error.message)}</li>`)
    .join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Camera Roll comparison</title>
<style>body{font:16px system-ui;background:#f5f5f2;color:#202723;margin:40px;max-width:1400px}h1{font-size:28px}strong{color:#9c321c}li{margin:10px 0}table{border-collapse:collapse;width:100%;font-size:13px}td,th{padding:10px;text-align:left;border-bottom:1px solid #ccc;overflow-wrap:anywhere}input{padding:10px;width:70%;margin:15px 0}small{color:#58625b}</style>
<h1>Camera Roll comparison</h1><p><strong>${report.deletionAdvice}</strong></p>
<p>Source: ${escapeHtml(report.source)}<br>Destination: ${escapeHtml(report.destination)}<br>Created: ${escapeHtml(report.created)}</p>
<p>${report.verify ? 'Full SHA-256 content comparison' : 'Fast filename + exact byte-size comparison; contents have NOT been verified'}. Folder names ignored. Filenames are case-insensitive. Every file type is included.</p>
<ul>${counts}</ul><p>${report.sourceCount.toLocaleString()} source files; ${report.destinationCount.toLocaleString()} destination files; ${(report.sourceBytes / 1073741824).toFixed(2)} GiB in source; ${report.seconds} seconds.</p>
<p>Files that need attention appear below. Open <a href="needs-attention.csv">needs-attention.csv</a> for the transfer/review list or <a href="all-files.csv">all-files.csv</a> for every result. Preserve originals when resolving conflicts.</p>
${errors ? `<h2>Unreadable or skipped items</h2><ul>${errors}</ul>` : ''}
${issues.length ? `<h2>Needs attention (${issues.length})</h2><input id="search" placeholder="Filter by filename or folder" aria-label="Filter files"><table><thead><tr><th>Status</th><th>Source file</th><th>Bytes</th><th>Same-name destination files</th></tr></thead><tbody>${rows}</tbody></table><script>document.querySelector('input').addEventListener('input',e=>{const q=e.target.value.toLowerCase();for(const row of document.querySelectorAll('tbody tr'))row.hidden=!row.textContent.toLowerCase().includes(q)})</script>` : '<p>All inventoried source files have a matching candidate.</p>'}
<p><small>This tool never copies, changes, or deletes media. Missing means no matching filename was found in the selected destination; renamed files may exist. Different-size and not-verified require review. Fast matches alone are insufficient for a deletion decision. Results describe files at scan time.</small></p></html>`;
}

async function validateRoots(source, destination, output) {
  const roots = await Promise.all(
    [source, destination].map(async (root) => {
      if (!(await io.stat(root)).isDirectory()) throw Error(`Not a directory: ${root}`);
      return io.realpath(root);
    }),
  );
  const inside = (child, parent) => {
    const relative = path.relative(parent, child);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };
  if (inside(roots[0], roots[1]) || inside(roots[1], roots[0]))
    throw Error('Source and destination must be separate, non-overlapping folders');
  const outputParent = await io.realpath(path.dirname(output));
  if (roots.some((root) => inside(outputParent, root)))
    throw Error('Reports must be outside the scanned folders');
}

async function main() {
  const args = process.argv.slice(2);
  const verify = args.includes('--verify');
  const positional = args.filter((argument) => argument !== '--verify');
  if (positional.length !== 3)
    throw Error(
      'Usage: node camera-roll-compare.mjs SOURCE DESTINATION NEW_REPORT_FOLDER [--verify]',
    );
  const [source, destination, output] = positional.map((argument) => path.resolve(argument));
  await validateRoots(source, destination, output);
  // Exclusive directory creation avoids overwriting an earlier report.
  await io.mkdir(output);
  const started = Date.now();
  console.log(`Inventorying ${source} and ${destination} (read-only)...`);
  const [sourceInventory, destinationInventory] = await Promise.all([
    inventory(source),
    inventory(destination),
  ]);
  console.log(
    `Inventoried ${sourceInventory.files.length} source and ${destinationInventory.files.length} destination files.`,
  );
  const result = await compare(sourceInventory, destinationInventory, verify);
  const counts = {};
  for (const row of result.rows) counts[row.status] = (counts[row.status] || 0) + 1;
  const complete =
    verify &&
    !result.errors.length &&
    result.rows.length > 0 &&
    result.rows.every((row) => row.status === 'verified-copy');
  const report = {
    ...result,
    source,
    destination,
    verify,
    counts,
    created: new Date().toISOString(),
    sourceCount: sourceInventory.files.length,
    destinationCount: destinationInventory.files.length,
    sourceBytes: sourceInventory.files.reduce((total, file) => total + file.size, 0),
    seconds: Number(((Date.now() - started) / 1000).toFixed(2)),
    deletionAdvice: complete
      ? 'Every source file has a content-verified copy in the destination at scan time.'
      : 'Keep the F-drive Camera Roll until unresolved files and content verification are complete.',
  };
  await io.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await io.writeFile(path.join(output, 'all-files.csv'), csv(result.rows));
  await io.writeFile(
    path.join(output, 'needs-attention.csv'),
    csv(result.rows.filter((row) => !['likely-copy', 'verified-copy'].includes(row.status))),
  );
  await io.writeFile(path.join(output, 'report.html'), htmlReport(report));
  console.log(
    JSON.stringify({ ...report, rows: undefined, errors: report.errors.length }, null, 2),
  );
  console.log(`Report: ${path.join(output, 'report.html')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
