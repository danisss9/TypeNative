// perf: `Temporal.PlainDateTime` and `Temporal.Instant` parsing, `add`, `until` and comparisons
import { performance } from 'node:perf_hooks';

const isoDates: string[] = [];
for (let i = 0; i < 256; i++) {
  const month = String((i % 12) + 1).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');
  const hour = String(i % 24).padStart(2, '0');
  isoDates.push(`2026-${month}-${day}T${hour}:15:30`);
}

const baseInstant = Temporal.Instant.from('2026-01-01T00:00:00Z');

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 40; pass++) {
  for (let i = 0; i < isoDates.length; i++) {
    const dt = Temporal.PlainDateTime.from(isoDates[i]);
    const shifted = dt.add({ days: 5, hours: 3, minutes: 20 });
    const diff = dt.until(shifted);
    total += shifted.day + shifted.hour + diff.days + diff.hours;
    const inst = baseInstant.add({ seconds: i * 60 + pass + 1 });
    total += Temporal.Instant.compare(inst, baseInstant);
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
