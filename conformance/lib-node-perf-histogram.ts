// Node 26 HdrHistogram: figures bucketing, percentileCI, meanCI, EWMA & burnRate,
// welchTest, ksTest, mannWhitneyTest, cohensD, cliffsD, linearBuckets, logBuckets,
// qrde, diff, CBOR export / importHistogram, createSlidingWindowHistogram
import { createHistogram, createSlidingWindowHistogram, importHistogram } from 'node:perf_hooks';

const approx = (a: number, b: number, eps: number = 1e-6): boolean => Math.abs(a - b) <= eps;

// 1. HdrHistogram significant figures bucketing & exceeds
const hf1 = createHistogram({ lowest: 1, highest: 100000, figures: 1 });
hf1.record(12345);
assert(hf1.min === 12288 && hf1.max === 12799 && hf1.mean === 12544, 'figures=1 bucket quantization');
assert(hf1.percentile(50) === 12799 && hf1.countAt(12345) === 1 && hf1.countAt(12300) === 1, 'figures=1 equivalent range');

const hf3 = createHistogram({ lowest: 1, highest: 100, figures: 3 });
hf3.record(50);
hf3.record(200);
assert(hf3.count === 1 && hf3.max === 50 && hf3.exceeds === 1, 'exceeds tracked when value > highest');

// 2. percentileCI & meanCI
const h1 = createHistogram({ lowest: 1, highest: 100000, figures: 3 });
for (let i = 1; i <= 100; i++) h1.record(i * 10);
const h2 = createHistogram({ lowest: 1, highest: 100000, figures: 3 });
for (let i = 1; i <= 100; i++) h2.record(i * 10 + 200);

const p50ci = h1.percentileCI(50);
assert(p50ci.value === 500 && p50ci.lower === 400 && p50ci.upper === 610, 'percentileCI(50) 95%');
const p95ci = h1.percentileCI(95, { confidence: 0.99 });
assert(p95ci.value === 950 && p95ci.lower <= 900 && p95ci.upper === 1000, 'percentileCI(95) 99%');

const mci95 = h1.meanCI();
assert(mci95.mean === 505 && approx(mci95.lower, 447.43490583, 1e-4) && approx(mci95.upper, 562.56509417, 1e-4), 'meanCI 95%');
const mci99 = h1.meanCI({ confidence: 0.99 });
assert(approx(mci99.lower, 428.80405915, 1e-4) && approx(mci99.upper, 581.19594085, 1e-4), 'meanCI 99%');

const empty = createHistogram();
const emptyPci = empty.percentileCI(50);
assert(emptyPci.value === 0 && emptyPci.lower === 0 && emptyPci.upper === 0, 'empty percentileCI');
const emptyMci = empty.meanCI();
assert(Number.isNaN(emptyMci.mean) && Number.isNaN(emptyMci.lower) && Number.isNaN(emptyMci.upper), 'empty meanCI');

const one = createHistogram();
one.record(100);
assert(one.meanCI().mean === 100 && Number.isNaN(one.meanCI().lower), 'single-sample meanCI');

// 3. EWMA (ewmaMean / ewmaStddev / ewmaErrorRate) & burnRate
const he = createHistogram({ lowest: 1, highest: 100000, figures: 3, halfLife: 5, threshold: 200 });
for (const v of [100, 200, 300, 150, 250]) he.record(v);
assert(approx(he.ewmaMean, 153.21337287017096, 1e-9), 'ewmaMean');
assert(approx(he.ewmaStddev, 71.70007578342609, 1e-9), 'ewmaStddev');
assert(approx(he.ewmaErrorRate, 0.22755376457262777, 1e-9), 'ewmaErrorRate');
assert(approx(he.burnRate(0.99), 22.755376457262756, 1e-9), 'burnRate(0.99)');

// EWMA over recordDelta
const hDelta = createHistogram({ lowest: 1, highest: 1e12, figures: 3, halfLife: 2, threshold: 1000 });
hDelta.recordDelta();
hDelta.recordDelta();
assert(hDelta.count === 1 && hDelta.ewmaMean > 0, 'EWMA over recordDelta');

// 4. Two-sample tests: welchTest, ksTest, mannWhitneyTest, cohensD, cliffsD
const wt = h1.welchTest(h2);
assert(approx(wt.tStatistic, -4.874666782214326, 1e-6), 'welchTest tStatistic');
assert(approx(wt.degreesOfFreedom, 198, 1e-6), 'welchTest df');
assert(approx(wt.pValue, 0.000002230936493985425, 1e-9), 'welchTest pValue');
assert(approx(wt.confidenceInterval.lower, -280.90881145, 1e-4) && approx(wt.confidenceInterval.upper, -119.09118855, 1e-4), 'welchTest CI');

assert(approx(h1.ksTest(h2), 0.2, 1e-9), 'ksTest');
assert(approx(h1.cohensD(h2), -0.6893819875457114, 1e-9), 'cohensD');
assert(approx(h1.cliffsD(h2), -0.36, 1e-9), 'cliffsD');

const mw = h1.mannWhitneyTest(h2);
assert(mw.uStatistic === 3200 && approx(mw.zScore, -4.398231949063579, 1e-6) && approx(mw.pValue, 0.000010913630849167422, 1e-9), 'mannWhitneyTest');

// With ties
const a = createHistogram({ lowest: 1, highest: 1000, figures: 3 });
const b = createHistogram({ lowest: 1, highest: 1000, figures: 3 });
for (const v of [10, 20, 20, 30]) a.record(v);
for (const v of [20, 30, 40, 50]) b.record(v);
const mwTies = a.mannWhitneyTest(b);
assert(mwTies.uStatistic === 2.5 && approx(mwTies.zScore, -1.6371865339158649, 1e-6) && approx(mwTies.pValue, 0.10159149986165272, 1e-6), 'mannWhitneyTest with ties');
assert(approx(a.cohensD(b), -1.3887301496588271, 1e-6) && approx(a.cliffsD(b), -0.6875, 1e-9), 'cohensD / cliffsD with ties');
const wtTies = a.welchTest(b);
assert(approx(wtTies.degreesOfFreedom, 5.06896551724138, 1e-6) && approx(wtTies.pValue, 0.10596497816685391, 1e-6), 'welchTest with ties');

// 5. linearBuckets, logBuckets, percentilesAt
const lb = h1.linearBuckets(250);
assert(lb.size === 4 && lb.get(250) === 25 && lb.get(500) === 25 && lb.get(750) === 25 && lb.get(1000) === 25, 'linearBuckets');

const logb = h1.logBuckets(10, 2);
assert(logb.size === 8 && logb.get(10) === 1 && logb.get(20) === 1 && logb.get(40) === 2 && logb.get(1280) === 36, 'logBuckets');

const pat = h1.percentilesAt([50, 90, 99]);
assert(pat.get(50) === 500 && pat.get(90) === 900 && pat.get(99) === 990, 'percentilesAt');

// 6. diff
const hHalf = createHistogram({ lowest: 1, highest: 100000, figures: 3 });
for (let i = 1; i <= 50; i++) hHalf.record(i * 10);
const d = h1.diff(hHalf);
assert(d.count === 50 && d.min === 510 && d.max === 1000 && d.mean === 755, 'diff');
let diffThrew = false;
try {
  h1.diff(h2);
} catch {
  diffThrew = true;
}
assert(diffThrew, 'diff throws when other has values not in this');

// 7. export / importHistogram (CBOR v2 roundtrip + EWMA state)
const exported = he.export();
assert(exported instanceof Uint8Array && exported.length > 0 && exported[0] === 0xac, 'CBOR map(12) header with EWMA');
const imported = importHistogram(exported);
assert(imported.count === he.count && imported.min === he.min && imported.max === he.max && approx(imported.mean, he.mean, 1e-9), 'importHistogram stats');
assert(approx(imported.ewmaMean, he.ewmaMean, 1e-9) && approx(imported.ewmaStddev, he.ewmaStddev, 1e-9) && approx(imported.burnRate(0.99), he.burnRate(0.99), 1e-9), 'importHistogram EWMA');

// 8. reset & resetCount
he.reset();
assert(he.count === 0 && he.resetCount === 1 && he.ewmaMean === 0, 'reset & resetCount');

// 9. qrde + createSlidingWindowHistogram (async)
async function runAsync() {
  const q = await h1.qrde({ bins: 10 });
  assert(q.probabilities.length === 11 && q.quantiles.length === 11 && q.densities.length === 10, 'qrde lengths');
  assert(q.count === 100n && q.bucketCount === 100 && q.dequantize === 'hdr', 'qrde metadata');
  assert(q.quantiles[0] === 10 && q.quantiles[10] === 1000 && approx(q.quantiles[5], 505, 1), 'qrde quantiles');
  assert(approx(q.densities[5], 0.001, 1e-4), 'qrde densities');

  const qEmpty = await empty.qrde();
  assert(qEmpty.probabilities.length === 101 && qEmpty.quantiles.length === 0 && qEmpty.densities.length === 0 && qEmpty.count === 0n, 'qrde empty');

  // SlidingWindowHistogram: recordsPerChunk
  const sw1 = createSlidingWindowHistogram({ recordsPerChunk: 5, chunks: 2, lowest: 1, highest: 10000, figures: 3 });
  for (let i = 1; i <= 12; i++) sw1.record(i * 10);
  const s1 = sw1.snapshot();
  assert(s1.count === 7 && s1.min === 60 && s1.max === 120, 'slidingWindow recordsPerChunk');
  sw1.reset();
  assert(sw1.snapshot().count === 0, 'slidingWindow reset');

  // SlidingWindowHistogram: chunkDuration
  const sw2 = createSlidingWindowHistogram({ chunkDuration: 40, chunks: 2 });
  sw2.record(100);
  assert(sw2.snapshot().count === 1 && sw2.snapshot().min === 100, 'slidingWindow chunkDuration initial');
  await new Promise<void>((resolve) => setTimeout(resolve, 110));
  assert(sw2.snapshot().count === 0, 'slidingWindow chunkDuration expired');
  sw2.record(200);
  assert(sw2.snapshot().count === 1 && sw2.snapshot().min === 200, 'slidingWindow chunkDuration post-expiry');

  console.log('histogram ok');
}

runAsync();
