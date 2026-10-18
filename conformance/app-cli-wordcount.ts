// Sample app: a `wc`-style CLI. Parses its arguments, reads files, counts
// lines / words / bytes, ranks the most frequent words and writes a report.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

interface FileStats {
  file: string;
  lines: number;
  words: number;
  bytes: number;
}

class WordCounter {
  private frequencies = new Map<string, number>();
  readonly results: FileStats[] = [];

  count(file: string): FileStats {
    const text = fs.readFileSync(file, 'utf8');
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    for (const word of words) {
      const key = word.toLowerCase().replace(/[^a-z']/g, '');
      if (key) this.frequencies.set(key, (this.frequencies.get(key) ?? 0) + 1);
    }
    const stats: FileStats = {
      file: path.basename(file),
      lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
      words: words.length,
      bytes: Buffer.byteLength(text)
    };
    this.results.push(stats);
    return stats;
  }

  top(n: number): [string, number][] {
    const pairs: [string, number][] = [];
    for (const [word, n] of this.frequencies) pairs.push([word, n]);
    return pairs
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n);
  }

  total(): FileStats {
    return this.results.reduce(
      (sum, r) => ({ file: 'total', lines: sum.lines + r.lines, words: sum.words + r.words, bytes: sum.bytes + r.bytes }),
      { file: 'total', lines: 0, words: 0, bytes: 0 }
    );
  }
}

function formatRow(s: FileStats): string {
  return `${String(s.lines).padStart(5)} ${String(s.words).padStart(5)} ${String(s.bytes).padStart(6)} ${s.file}`;
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-wc-'));
fs.writeFileSync(path.join(dir, 'a.txt'), 'the quick brown fox\njumps over the lazy dog\n');
fs.writeFileSync(path.join(dir, 'b.txt'), "The dog sleeps.\nThe fox doesn't.\nThe end\n");

const { values, positionals } = parseArgs({
  args: ['--top', '3', '--out', path.join(dir, 'report.txt'), path.join(dir, 'a.txt'), path.join(dir, 'b.txt')],
  options: {
    top: { type: 'string', default: '5' },
    out: { type: 'string' }
  },
  allowPositionals: true
});

const counter = new WordCounter();
const rows = positionals.map((file) => formatRow(counter.count(file)));
rows.push(formatRow(counter.total()));
const ranking: string[] = [];
for (const [word, n] of counter.top(Number(values.top))) ranking.push(`${ranking.length + 1}. ${word} (${n})`);
const report = [...rows, '', ...ranking].join(os.EOL) + os.EOL;
fs.writeFileSync(values.out as string, report);

const written = fs.readFileSync(values.out as string, 'utf8');
assert(written.includes('    2     9     44 a.txt'), 'per-file row');
assert(written.includes('    3     8     41 b.txt') && written.includes('    5    17     85 total'), 'total row');
assert(ranking[0] === '1. the (5)' && ranking[1] === '2. dog (2)' && ranking[2] === '3. fox (2)', 'ranking with ties broken alphabetically');
assert(createHash('sha256').update(written).digest('hex').length === 64, 'report digest');
fs.rmSync(dir, { recursive: true, force: true });
assert(!fs.existsSync(dir), 'cleanup');
