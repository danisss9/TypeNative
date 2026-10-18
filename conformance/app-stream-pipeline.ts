// Sample app: a data pipeline. Generates CSV rows as a stream, parses and
// aggregates them in a Transform, compresses the summary with gzip and Brotli
// to files, then reads both back and checks them against a SHA-256.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, gunzipSync, createBrotliCompress, brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const cities = ['Lisbon', 'Porto', 'Faro'];

function* rows(): Generator<string> {
  yield 'city,temperature\n';
  for (let day = 0; day < 30; day++) {
    for (let c = 0; c < cities.length; c++) {
      yield `${cities[c]},${(10 + ((day * 7 + c * 3) % 15)).toFixed(1)}\n`;
    }
  }
}

// Per-city readings in typed arrays (one slot per day)
const readings = new Map<string, Float64Array>();
let pending = '';
let header = true;

const aggregate = new Transform({
  transform(chunk, _encoding, callback) {
    pending += String(chunk);
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      if (header) {
        header = false;
        continue;
      }
      const [city, value] = line.split(',');
      const series = readings.get(city) ?? new Float64Array(0);
      const grown = new Float64Array(series.length + 1);
      grown.set(series);
      grown[series.length] = Number(value);
      readings.set(city, grown);
    }
    callback();
  },
  flush(callback) {
    const summary: string[] = [];
    for (const city of cities) {
      const series = readings.get(city) ?? new Float64Array(0);
      const mean = series.reduce((sum, v) => sum + v, 0) / series.length;
      const sorted = series.toSorted();
      summary.push(`${city}: n=${series.length} min=${sorted[0]} max=${sorted[sorted.length - 1]} mean=${mean.toFixed(2)}`);
    }
    callback(null, summary.join('\n') + '\n');
  }
});

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-pipeline-'));
  const summaryFile = path.join(dir, 'summary.txt');
  await pipeline(Readable.from(rows()), aggregate, fs.createWriteStream(summaryFile));
  const summary = fs.readFileSync(summaryFile, 'utf8');
  assert(summary.startsWith('Lisbon: n=30 min=10 max=24'), 'aggregated summary');
  assert(summary.split('\n').length === 4, 'one line per city');

  await pipeline(fs.createReadStream(summaryFile), createGzip(), fs.createWriteStream(summaryFile + '.gz'));
  await pipeline(fs.createReadStream(summaryFile), createBrotliCompress(), fs.createWriteStream(summaryFile + '.br'));
  const fromGzip = gunzipSync(fs.readFileSync(summaryFile + '.gz')).toString();
  const fromBrotli = brotliDecompressSync(fs.readFileSync(summaryFile + '.br')).toString();
  const digest = (s: string) => createHash('sha256').update(s).digest('hex');
  assert(digest(fromGzip) === digest(summary) && digest(fromBrotli) === digest(summary), 'compressed copies round-trip');
  fs.rmSync(dir, { recursive: true, force: true });
}
main();
