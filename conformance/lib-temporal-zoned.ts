// Temporal.ZonedDateTime / Instant and Temporal.Now: epoch arithmetic, IANA
// zones, DST gaps and overlaps, transitions and string options (Node 26)

function errName(fn: () => unknown): string {
  try {
    fn();
    return 'none';
  } catch (e) {
    return (e as Error).name;
  }
}

// --- Instant
const i = Temporal.Instant.fromEpochMilliseconds(1577836800123);
assert(i.epochMilliseconds === 1577836800123, 'epochMilliseconds');
assert(i.epochNanoseconds === 1577836800123000000n, 'epochNanoseconds bigint');
assert(typeof i.epochNanoseconds === 'bigint', 'epochNanoseconds type');
assert(i.toString() === '2020-01-01T00:00:00.123Z', 'Instant toString');
assert(String(i) === '2020-01-01T00:00:00.123Z', 'Instant String');
assert(Temporal.Instant.from('2020-01-01T00:00:00.123Z').equals(i), 'Instant.from string');
assert(Temporal.Instant.fromEpochNanoseconds(1577836800123000000n).equals(i), 'fromEpochNanoseconds');
assert(Temporal.Instant.fromEpochMilliseconds(0).toString() === '1970-01-01T00:00:00Z', 'epoch');
assert(Temporal.Instant.from('2020-01-01T00:00:00+05:30').toString() === '2019-12-31T18:30:00Z', 'offset string');
assert(Temporal.Instant.from('2020-01-01T00:00:00.123456789Z').toString() === '2020-01-01T00:00:00.123456789Z', 'nanoseconds');
assert(Temporal.Instant.from('1969-12-31T23:59:59.999999999Z').toString() === '1969-12-31T23:59:59.999999999Z', 'negative instant');
assert(Temporal.Instant.compare('2020-01-01T00:00:00Z', '2020-01-01T00:00:01Z') === -1, 'Instant.compare');
assert(Temporal.Instant.compare(i, i) === 0, 'Instant.compare equal');
assert(i.add({ hours: 1 }).toString() === '2020-01-01T01:00:00.123Z', 'Instant.add');
assert(i.subtract({ milliseconds: 123 }).toString() === '2020-01-01T00:00:00Z', 'Instant.subtract');
assert(i.until('2020-01-01T01:00:00.123Z').toString() === 'PT3600S', 'Instant.until');
assert(i.until('2020-01-01T01:00:00.123Z', { largestUnit: 'hour' }).toString() === 'PT1H', 'Instant.until hours');
assert(i.since('2019-12-31T23:00:00.123Z').toString() === 'PT3600S', 'Instant.since');
assert(i.round({ smallestUnit: 'hour' }).toString() === '2020-01-01T00:00:00Z', 'Instant.round');
assert(i.round({ smallestUnit: 'hour', roundingMode: 'ceil' }).toString() === '2020-01-01T01:00:00Z', 'Instant.round ceil');
assert(i.round({ smallestUnit: 'minute', roundingIncrement: 15 }).toString() === '2020-01-01T00:00:00Z', 'round increment');
const beforeEpoch = Temporal.Instant.from('1969-12-31T23:59:59.999999999Z');
assert(beforeEpoch.round({ smallestUnit: 'hour', roundingMode: 'ceil' }).toString() === '1970-01-01T00:00:00Z', 'negative instant ceil');
assert(beforeEpoch.round({ smallestUnit: 'hour', roundingMode: 'floor' }).toString() === '1969-12-31T23:00:00Z', 'negative instant floor');
assert(beforeEpoch.round({ smallestUnit: 'second', roundingMode: 'trunc' }).toString() === '1969-12-31T23:59:59Z', 'negative instant trunc');
assert(JSON.stringify({ i }) === '{"i":"2020-01-01T00:00:00.123Z"}', 'Instant JSON');
assert(errName(() => (i as unknown as { valueOf(): number }).valueOf()) === 'TypeError', 'Instant valueOf throws');
assert(errName(() => Temporal.Instant.fromEpochMilliseconds(8.64e15 + 1)) === 'RangeError', 'instant out of range');

// --- toString({ timeZone })
assert(i.toString({ timeZone: 'America/New_York' }) === '2019-12-31T19:00:00.123-05:00', 'Instant toString timeZone');
assert(i.toString({ timeZone: '+05:30' }) === '2020-01-01T05:30:00.123+05:30', 'Instant toString offset zone');
assert(i.toString({ timeZone: 'UTC', smallestUnit: 'second' }) === '2020-01-01T00:00:00+00:00', 'Instant toString UTC second');

// --- ZonedDateTime
const z = Temporal.ZonedDateTime.from('2020-03-08T01:30:00-05:00[America/New_York]');
assert(z.timeZoneId === 'America/New_York' && z.calendarId === 'iso8601', 'zone / calendar ids');
assert(z.year === 2020 && z.month === 3 && z.day === 8 && z.hour === 1 && z.minute === 30, 'zdt fields');
assert(z.offset === '-05:00' && z.offsetNanoseconds === -18000000000000, 'offset');
assert(z.hoursInDay === 23, 'hoursInDay 23');
assert(z.epochMilliseconds === 1583649000000, 'zdt epochMilliseconds');
assert(z.toString() === '2020-03-08T01:30:00-05:00[America/New_York]', 'zdt toString');
assert(String(z) === '2020-03-08T01:30:00-05:00[America/New_York]', 'zdt String');
assert(z.toString({ timeZoneName: 'never' }) === '2020-03-08T01:30:00-05:00', 'timeZoneName never');
assert(z.toString({ offset: 'never' }) === '2020-03-08T01:30:00[America/New_York]', 'offset never');
assert(z.toString({ calendarName: 'always' }) === '2020-03-08T01:30:00-05:00[America/New_York][u-ca=iso8601]', 'calendarName always');
assert(z.toInstant().toString() === '2020-03-08T06:30:00Z', 'toInstant');
assert(z.toPlainDate().toString() === '2020-03-08', 'toPlainDate');
assert(z.toPlainTime().toString() === '01:30:00', 'toPlainTime');
assert(z.toPlainDateTime().toString() === '2020-03-08T01:30:00', 'toPlainDateTime');
assert(z.withTimeZone('UTC').toString() === '2020-03-08T06:30:00+00:00[UTC]', 'withTimeZone');
assert(z.startOfDay().toString() === '2020-03-08T00:00:00-05:00[America/New_York]', 'startOfDay');
assert(z.add({ hours: 1 }).toString() === '2020-03-08T03:30:00-04:00[America/New_York]', 'add across the gap');
assert(z.add({ days: 1 }).toString() === '2020-03-09T01:30:00-04:00[America/New_York]', 'add days keeps the wall clock');
assert(z.subtract({ minutes: 90 }).toString() === '2020-03-08T00:00:00-05:00[America/New_York]', 'subtract across midnight');
assert(z.with({ hour: 3 }).toString() === '2020-03-08T03:30:00-04:00[America/New_York]', 'with');
assert(z.with({ offset: '-05:00' }).equals(z), 'with offset');
assert(z.until('2020-03-08T03:30[America/New_York]').toString() === 'PT1H', 'until DST');
assert(Temporal.ZonedDateTime.from('2020-03-07T12:00[America/New_York]').until('2020-03-09T12:00[America/New_York]').toString() === 'PT47H', 'until across DST');
assert(Temporal.ZonedDateTime.from('2020-03-07T12:00[America/New_York]').until('2020-03-09T12:00[America/New_York]', { largestUnit: 'days' }).toString() === 'P2D', 'until days across DST');
assert(z.round({ smallestUnit: 'hour' }).toString() === '2020-03-08T03:00:00-04:00[America/New_York]', 'round to hour (gap resolves)');
assert(Temporal.ZonedDateTime.compare(z, z.add({ seconds: 1 })) === -1, 'ZonedDateTime.compare');
assert(z.equals(z.toString()), 'equals string');
assert(Temporal.ZonedDateTime.from('2020-01-01T00:00[UTC]').equals('2020-01-01T00:00+00:00[UTC]'), 'equals with offset');
assert(errName(() => Temporal.ZonedDateTime.from('2020-01-01T00:00')) === 'RangeError', 'zone required');

// --- transitions
const next = z.getTimeZoneTransition('next');
assert(next !== null && next.toString() === '2020-03-08T03:00:00-04:00[America/New_York]', 'next transition');
const previous = z.getTimeZoneTransition('previous');
assert(previous !== null && previous.toString() === '2019-11-03T01:00:00-05:00[America/New_York]', 'previous transition');
assert(Temporal.ZonedDateTime.from('2020-01-01T00:00[UTC]').getTimeZoneTransition('next') === null, 'UTC has no transitions');

// --- DST gap (2020-03-08 02:30 does not exist)
for (const mode of ['compatible', 'earlier', 'later', 'reject']) {
  const call = () => Temporal.ZonedDateTime.from('2020-03-08T02:30[America/New_York]', { disambiguation: mode as any }).toString();
  if (mode === 'compatible') assert(call() === '2020-03-08T03:30:00-04:00[America/New_York]', 'gap compatible');
  else if (mode === 'earlier') assert(call() === '2020-03-08T01:30:00-05:00[America/New_York]', 'gap earlier');
  else if (mode === 'later') assert(call() === '2020-03-08T03:30:00-04:00[America/New_York]', 'gap later');
  else assert(errName(call) === 'RangeError', 'gap reject');
}
// --- DST overlap (2020-11-01 01:30 happens twice)
for (const mode of ['compatible', 'earlier', 'later', 'reject']) {
  const call = () => Temporal.ZonedDateTime.from('2020-11-01T01:30[America/New_York]', { disambiguation: mode as any }).toString();
  if (mode === 'compatible' || mode === 'earlier') assert(call() === '2020-11-01T01:30:00-04:00[America/New_York]', 'overlap ' + mode);
  else if (mode === 'later') assert(call() === '2020-11-01T01:30:00-05:00[America/New_York]', 'overlap later');
  else assert(errName(call) === 'RangeError', 'overlap reject');
}
assert(Temporal.ZonedDateTime.from('2020-11-01T01:30[America/New_York]').hoursInDay === 25, 'fall back hoursInDay');

// round-tripping through the epoch
const instant = z.toInstant();
assert(z.equals(instant.toZonedDateTimeISO('America/New_York')), 'toZonedDateTimeISO round trip');
assert(z.epochNanoseconds === 1583649000000000000n, 'zdt epochNanoseconds');
assert(Temporal.ZonedDateTime.from(z).equals(z), 'from instance');

// --- Temporal.Now
const nowInstant = Temporal.Now.instant();
assert(nowInstant instanceof Temporal.Instant && typeof nowInstant.epochNanoseconds === 'bigint', 'Now.instant');
const zone = Temporal.Now.timeZoneId();
assert(typeof zone === 'string' && zone.length > 0, 'Now.timeZoneId');
const nowZdt = Temporal.Now.zonedDateTimeISO();
assert(nowZdt instanceof Temporal.ZonedDateTime && nowZdt.timeZoneId === zone, 'Now.zonedDateTimeISO');
assert(nowZdt.toInstant().epochMilliseconds >= 1_700_000_000_000, 'now is in this era');
const nowDate = Temporal.Now.plainDateISO();
assert(nowDate instanceof Temporal.PlainDate && nowDate.toString() === nowZdt.toPlainDate().toString(), 'Now.plainDateISO agrees');
const nowTime = Temporal.Now.plainTimeISO();
assert(nowTime instanceof Temporal.PlainTime, 'Now.plainTimeISO');
const nowDateTime = Temporal.Now.plainDateTimeISO();
assert(nowDateTime instanceof Temporal.PlainDateTime, 'Now.plainDateTimeISO');
assert(nowDateTime.toPlainDate().equals(nowDate), 'Now.plainDateTimeISO agrees');
assert(Temporal.Now.plainDateISO('America/New_York') instanceof Temporal.PlainDate, 'Now.plainDateISO zone');

// --- Date.prototype.toTemporalInstant
const dateInstant = new Date(1577836800123).toTemporalInstant();
assert(dateInstant instanceof Temporal.Instant && dateInstant.epochMilliseconds === 1577836800123, 'Date#toTemporalInstant');
assert(new Date(0).toTemporalInstant().toString() === '1970-01-01T00:00:00Z', 'Date epoch');
assert(new Date(1577836800123).toTemporalInstant().toZonedDateTimeISO('UTC').toString() === '2020-01-01T00:00:00.123+00:00[UTC]', 'Date to zoned');

export {};
