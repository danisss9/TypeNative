// Finds duplicate files under a directory and writes a JSON report.
// Files are grouped by size first, so only files that share a size are read
// and hashed (SHA-256). Duplicates are files whose hashes match.
//
//   node main.ts <dir> [report.json]
//   ./dupes <dir> [report.json]        (default report: dupes.json)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface DuplicateGroup {
  hash: string;
  size: number;
  files: string[];
}

interface Report {
  root: string;
  scannedFiles: number;
  scannedBytes: number;
  hashedFiles: number;
  groups: DuplicateGroup[];
  wastedBytes: number;
}

const root = path.resolve(process.argv[2] ?? '.');
const reportPath = process.argv[3] ?? 'dupes.json';
const started = performance.now();

// 1. Walk the tree and group every regular file by size.
const bySize = new Map<number, string[]>();
let scannedFiles = 0;
let scannedBytes = 0;
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = path.join(entry.parentPath, entry.name);
  const size = fs.statSync(file).size;
  scannedFiles++;
  scannedBytes += size;
  if (size === 0) continue;
  const sameSize = bySize.get(size) ?? [];
  sameSize.push(file);
  bySize.set(size, sameSize);
}

// 2. Hash only the files that share a size with another file.
const byHash = new Map<string, DuplicateGroup>();
let hashedFiles = 0;
for (const [size, files] of bySize) {
  if (files.length < 2) continue;
  for (const file of files) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    hashedFiles++;
    const group = byHash.get(hash);
    if (group) group.files.push(file);
    else byHash.set(hash, { hash: hash, size: size, files: [file] });
  }
}

// 3. Keep the groups with more than one file, biggest savings first.
const groups: DuplicateGroup[] = [];
for (const group of byHash.values()) {
  if (group.files.length > 1) {
    group.files.sort();
    groups.push(group);
  }
}
groups.sort((a, b) => b.size * (b.files.length - 1) - a.size * (a.files.length - 1) || (a.hash < b.hash ? -1 : 1));
const wastedBytes = groups.reduce((sum, g) => sum + g.size * (g.files.length - 1), 0);

const report: Report = {
  root: root,
  scannedFiles: scannedFiles,
  scannedBytes: scannedBytes,
  hashedFiles: hashedFiles,
  groups: groups,
  wastedBytes: wastedBytes
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const mib = (n: number): string => (n / 1024 / 1024).toFixed(1);
console.log(`Scanned ${scannedFiles} files (${mib(scannedBytes)} MiB), hashed ${hashedFiles}`);
console.log(`Found ${groups.length} duplicate groups wasting ${mib(wastedBytes)} MiB`);
for (const group of groups.slice(0, 5)) {
  console.log(`  ${group.files.length} x ${group.size} B  ${path.relative(root, group.files[0])}`);
}
console.log(`Report written to ${reportPath} in ${Math.round(performance.now() - started)} ms`);
