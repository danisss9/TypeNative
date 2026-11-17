// Temporal.Duration: parsing, formatting, arithmetic, round / total with
// relativeTo, compare and the balance RangeErrors (Node 26)

function errName(fn: () => unknown): string {
  try {
    fn();
    return 'none';
  } catch (e) {
    return (e as Error).name;
  }
}

// --- parsing and formatting
const d = Temporal.Duration.from('P1Y2M3W4DT5H6M7.008009010S');
assert(d.years === 1 && d.months === 2 && d.weeks === 3 && d.days === 4, 'date fields');
assert(d.hours === 5 && d.minutes === 6 && d.seconds === 7, 'time fields');
assert(d.milliseconds === 8 && d.microseconds === 9 && d.nanoseconds === 10, 'sub-second fields');
assert(d.sign === 1 && d.blank === false, 'sign / blank');
assert(d.toString() === 'P1Y2M3W4DT5H6M7.00800901S', 'toString drops the trailing zero');
assert(String(d) === 'P1Y2M3W4DT5H6M7.00800901S', 'String');
assert(Temporal.Duration.compare(Temporal.Duration.from(d), d, { relativeTo: '2020-01-01' }) === 0, 'from instance');
assert(Temporal.Duration.compare(Temporal.Duration.from({ years: 1, months: 2, weeks: 3, days: 4, hours: 5, minutes: 6, seconds: 7, milliseconds: 8, microseconds: 9, nanoseconds: 10 }), d, { relativeTo: '2020-01-01' }) === 0, 'from bag');

const neg = d.negated();
assert(neg.years === -1 && neg.hours === -5 && neg.nanoseconds === -10, 'negated fields');
assert(neg.toString() === '-P1Y2M3W4DT5H6M7.00800901S', 'negated toString');
assert(Temporal.Duration.compare(neg.abs(), d, { relativeTo: '2020-01-01' }) === 0 && Temporal.Duration.compare(d.abs(), d, { relativeTo: '2020-01-01' }) === 0, 'abs');
assert(Temporal.Duration.compare(d.negated().negated(), d, { relativeTo: '2020-01-01' }) === 0, 'double negation');

assert(Temporal.Duration.from('PT1H').toString() === 'PT1H', 'PT1H');
assert(Temporal.Duration.from('P1D').toString() === 'P1D', 'P1D');
assert(Temporal.Duration.from('PT0.5H').toString() === 'PT30M', 'fractional hours balance');
assert(Temporal.Duration.from('PT1.5M').toString() === 'PT1M30S', 'fractional minutes balance');
assert(Temporal.Duration.from('PT0.5S').toString() === 'PT0.5S', 'fractional seconds');
assert(Temporal.Duration.from('PT0.000000001S').toString() === 'PT0.000000001S', 'nanoseconds');
assert(Temporal.Duration.from('-PT6.007008009S').toString() === '-PT6.007008009S', 'negative fractional seconds');
assert(Temporal.Duration.from('-PT6.007008009S').round({ smallestUnit: 'millisecond' }).toString() === '-PT6.007S', 'round a negative fraction');
assert(Temporal.Duration.from('PT1.5H').total({ unit: 'hours', relativeTo: '2020-01-01T00:00[UTC]' }) === 1.5, 'total with a zoned relativeTo');
assert(Temporal.Duration.from('P1M').total({ unit: 'hours', relativeTo: '2020-02-29T12:00[America/New_York]' }) === 695, 'zoned total hours across DST');
assert(Temporal.Duration.from('P1Y2M3DT4H').total({ unit: 'hours', relativeTo: '2020-02-29T12:00[America/New_York]' }) === 10275, 'zoned total calendar and time across DST');
assert(Temporal.Duration.from('P0D').toString() === 'PT0S', 'zero duration');
assert(Temporal.Duration.from('P0D').blank === true, 'blank');
assert(Temporal.Duration.from('-PT1H').toString() === '-PT1H', 'negative string');
assert(Temporal.Duration.from('P1W').toString() === 'P1W', 'weeks');
assert(errName(() => Temporal.Duration.from('P1YT')) === 'RangeError', 'empty time part');
assert(errName(() => Temporal.Duration.from('1H')) === 'RangeError', 'missing P');
assert(errName(() => Temporal.Duration.from('P1.5Y')) === 'RangeError', 'fractional years');
assert(errName(() => Temporal.Duration.from({ years: 1, days: -1 })) === 'RangeError', 'mixed signs');

// --- with
assert(d.with({ years: 9 }).toString() === 'P9Y2M3W4DT5H6M7.00800901S', 'with years');
assert(d.with({ nanoseconds: 0 }).toString() === 'P1Y2M3W4DT5H6M7.008009S', 'with nanoseconds');

// --- add / subtract
assert(Temporal.Duration.from('PT1H').add({ minutes: 30 }).toString() === 'PT1H30M', 'add time');
assert(Temporal.Duration.from('PT1H').subtract({ minutes: 30 }).toString() === 'PT30M', 'subtract time');
assert(Temporal.Duration.from('P1D').add({ hours: 1 }).toString() === 'P1DT1H', 'add day and time units');
assert(errName(() => Temporal.Duration.from('P1Y').add({ months: 1 })) === 'RangeError', 'add calendar units');
assert(errName(() => Temporal.Duration.from('P1M').add({ days: 1 })) === 'RangeError', 'add months and days');
assert(Temporal.Duration.from('PT10M').add({ minutes: -20 }).toString() === '-PT10M', 'add mixed signs');

// --- compare
assert(Temporal.Duration.compare('PT1H', 'PT60M') === 0, 'compare equal');
assert(Temporal.Duration.compare('PT1H', 'PT61M') === -1, 'compare lt');
assert(Temporal.Duration.compare('P1D', 'PT24H') === 0, 'compare day = 24h without relativeTo');
assert(Temporal.Duration.compare('P1M', 'P28D', { relativeTo: '2021-02-01' }) === 0, 'compare with relativeTo');
assert(Temporal.Duration.compare('P1M', 'P30D', { relativeTo: '2021-02-01' }) === -1, 'compare month shorter than 30 days');
assert(errName(() => Temporal.Duration.compare('P1M', 'P30D')) === 'RangeError', 'calendar compare needs relativeTo');

// --- total
assert(Temporal.Duration.from('PT1H30M').total('minutes') === 90, 'total minutes');
assert(Temporal.Duration.from('PT1.5H').total({ unit: 'seconds' }) === 5400, 'total seconds');
assert(Temporal.Duration.from('P1D').total('hours') === 24, 'total hours');
assert(Temporal.Duration.from('P1W').total({ unit: 'days', relativeTo: '2020-01-01' }) === 7, 'total weeks in days');
assert(Temporal.Duration.from('P1Y2M').total({ unit: 'months', relativeTo: '2020-01-01' }) === 14, 'total months relativeTo');
assert(Temporal.Duration.from('P1M').total({ unit: 'days', relativeTo: '2020-02-01' }) === 29, 'total days in February');
assert(Temporal.Duration.from('P1M').total({ unit: 'days', relativeTo: '2020-03-01' }) === 31, 'total days in March');
assert(errName(() => Temporal.Duration.from('P1Y').total('days')) === 'RangeError', 'calendar total needs relativeTo');
assert(Temporal.Duration.from('PT1H30M').total({ unit: 'hours', relativeTo: '2020-01-01' }) === 1.5, 'total fractional hours');

// --- round
assert(Temporal.Duration.from('PT1H30M').round({ smallestUnit: 'hours' }).toString() === 'PT2H', 'round hours halfExpand');
assert(Temporal.Duration.from('PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'trunc' }).toString() === 'PT1H', 'round hours trunc');
assert(Temporal.Duration.from('PT1H29M').round({ smallestUnit: 'hours' }).toString() === 'PT1H', 'round hours down');
assert(Temporal.Duration.from('PT1H30M').round('hour').toString() === 'PT2H', 'round string form');
assert(Temporal.Duration.from('P1Y1M').round({ smallestUnit: 'months', relativeTo: '2020-01-01' }).toString() === 'P1Y1M', 'round months keeps years');
assert(Temporal.Duration.from('P1Y1M').round({ largestUnit: 'months', relativeTo: '2020-01-01' }).toString() === 'P13M', 'round largestUnit months');
// (rounding months to weeks keeps the month as the largest unit: Node's
// P1M1W result is not a plain day count, so it is left to the unit matrix)
assert(errName(() => Temporal.Duration.from('P1Y').round({ smallestUnit: 'months' })) === 'RangeError', 'round calendar unit needs relativeTo');
assert(Temporal.Duration.from('PT1.5H').round({ smallestUnit: 'minutes' }).toString() === 'PT1H30M', 'round minutes');

// every rounding mode on a 45-minute duration to hours
const fortyFive = Temporal.Duration.from({ minutes: 45 });
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'ceil' }).toString() === 'PT1H', 'ceil');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'floor' }).toString() === 'PT0S', 'floor');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'expand' }).toString() === 'PT1H', 'expand');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'trunc' }).toString() === 'PT0S', 'trunc');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'halfCeil' }).toString() === 'PT1H', 'halfCeil');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'halfFloor' }).toString() === 'PT1H', 'halfFloor');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'halfExpand' }).toString() === 'PT1H', 'halfExpand');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'halfTrunc' }).toString() === 'PT1H', 'halfTrunc');
assert(fortyFive.round({ smallestUnit: 'hours', roundingMode: 'halfEven' }).toString() === 'PT1H', 'halfEven');
assert(Temporal.Duration.from('PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'halfCeil' }).toString() === 'PT2H', 'halfCeil tie');
assert(Temporal.Duration.from('PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'halfFloor' }).toString() === 'PT1H', 'halfFloor tie');
assert(Temporal.Duration.from('PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'halfTrunc' }).toString() === 'PT1H', 'halfTrunc tie');
assert(Temporal.Duration.from('-PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'halfCeil' }).toString() === '-PT1H', 'halfCeil negative tie');
assert(Temporal.Duration.from('-PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'halfFloor' }).toString() === '-PT2H', 'halfFloor negative tie');
assert(Temporal.Duration.from('-PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'halfExpand' }).toString() === '-PT2H', 'halfExpand negative tie');
assert(Temporal.Duration.from('-PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'floor' }).toString() === '-PT2H', 'floor negative');
assert(Temporal.Duration.from('-PT1H30M').round({ smallestUnit: 'hours', roundingMode: 'expand' }).toString() === '-PT2H', 'expand negative');

// roundingIncrement
assert(Temporal.Duration.from('PT1H40M').round({ smallestUnit: 'minutes', roundingIncrement: 30 }).toString() === 'PT1H30M', 'increment 30 minutes (halfExpand down)');
assert(Temporal.Duration.from('PT1H50M').round({ smallestUnit: 'minutes', roundingIncrement: 30 }).toString() === 'PT2H', 'increment 30 minutes up');
assert(errName(() => Temporal.Duration.from('PT1H').round({ smallestUnit: 'minutes', roundingIncrement: 7 })) === 'RangeError', 'invalid increment');

// --- JSON and console shapes
assert(JSON.stringify({ d }) === '{"d":"P1Y2M3W4DT5H6M7.00800901S"}', 'JSON.stringify');
assert(d instanceof Temporal.Duration, 'instanceof');
assert(errName(() => (d as unknown as { valueOf(): number }).valueOf()) === 'TypeError', 'valueOf throws');
assert(Temporal.Duration.from('PT0S').sign === 0, 'zero sign');

export {};
