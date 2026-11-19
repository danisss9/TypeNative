// perf: `structuredClone` of nested objects, arrays, `Map`, `Set`, `Date` and `Uint8Array`
import { performance } from 'node:perf_hooks';

interface Payload {
  id: number;
  name: string;
  tags: string[];
  created: Date;
  bytes: Uint8Array;
  meta: Map<string, number>;
  flags: Set<string>;
  nested: { a: number; b: number; list: number[] };
}

const sample: Payload = {
  id: 42,
  name: 'typenative-benchmark-item',
  tags: ['alpha', 'beta', 'gamma', 'delta'],
  created: new Date(1700000000000),
  bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  meta: new Map([
    ['k1', 10],
    ['k2', 20],
    ['k3', 30]
  ]),
  flags: new Set(['read', 'write', 'exec']),
  nested: { a: 7, b: 11, list: [1, 2, 3, 4, 5, 6, 7, 8] }
};

const start = performance.now();
let total = 0;
for (let i = 0; i < 40_000; i++) {
  const copy = structuredClone(sample);
  total += copy.id + copy.tags.length + copy.bytes[i & 15] + (copy.meta.get('k2') ?? 0) + copy.flags.size + copy.nested.list[i & 7];
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
