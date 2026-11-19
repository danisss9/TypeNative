// perf: `new URL`, `URLSearchParams` parsing/serialization and `node:path` `join` / `resolve` / `relative` / `parse`
import { performance } from 'node:perf_hooks';
import path from 'node:path';

const rawUrls: string[] = [];
const relPaths: string[] = [];
for (let i = 0; i < 512; i++) {
  rawUrls.push(`https://api.example.com:8443/v2/items/${i}?page=${i & 15}&sort=desc&tag=a&tag=b#sec-${i}`);
  relPaths.push(`src/modules/pkg_${i & 15}/../utils/file_${i}.ts`);
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 80; pass++) {
  for (let i = 0; i < rawUrls.length; i++) {
    const u = new URL(rawUrls[i]);
    u.searchParams.set('pass', String(pass));
    total += u.hostname.length + u.pathname.length + u.searchParams.getAll('tag').length + u.href.length;

    const joined = path.posix.join('/workspace/app', relPaths[i]);
    const rel = path.posix.relative('/workspace/app/src', joined);
    const parsed = path.posix.parse(joined);
    total += rel.length + parsed.base.length + parsed.ext.length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
