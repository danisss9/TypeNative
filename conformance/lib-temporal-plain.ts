// Temporal plain types (ISO 8601 calendar): PlainDate / PlainTime /
// PlainDateTime / PlainYearMonth / PlainMonthDay, from Node 26
// (expected values: Node 26.13's Temporal, ISO calendar)

function errName(fn: () => unknown): string {
  try {
    fn();
    return 'none';
  } catch (e) {
    return (e as Error).name;
  }
}

// --- PlainDate: construction and getters
const d = new Temporal.PlainDate(2020, 2, 29);
assert(d.year === 2020 && d.month === 2 && d.day === 29, 'PlainDate fields');
assert(d.monthCode === 'M02' && d.calendarId === 'iso8601', 'monthCode / calendarId');
assert(d.dayOfWeek === 6 && d.dayOfYear === 60, 'dayOfWeek / dayOfYear');
assert(d.weekOfYear === 9 && d.yearOfWeek === 2020, 'weekOfYear / yearOfWeek');
assert(d.daysInMonth === 29 && d.daysInYear === 366 && d.monthsInYear === 12, 'counts');
assert(d.daysInWeek === 7 && d.inLeapYear === true, 'daysInWeek / inLeapYear');
assert(d.era === undefined && d.eraYear === undefined, 'no era in ISO');
assert(String(d) === '2020-02-29' && d.toString() === '2020-02-29', 'PlainDate toString');

assert(Temporal.PlainDate.from('2020-02-29').equals(d), 'from string');
assert(Temporal.PlainDate.from({ year: 2020, month: 2, day: 29 }).equals(d), 'from bag');
assert(Temporal.PlainDate.from({ year: 2020, monthCode: 'M02', day: 29 }).equals(d), 'monthCode bag');
assert(Temporal.PlainDate.from({ year: 2020, month: 2, day: 31 }).toString() === '2020-02-29', 'default constrain');
assert(errName(() => Temporal.PlainDate.from({ year: 2021, month: 2, day: 29 }, { overflow: 'reject' })) === 'RangeError', 'reject overflow');
assert(Temporal.PlainDate.from({ year: 2020, month: 13, day: 1 }).toString() === '2020-12-01', 'constrains an out-of-range month');
assert(errName(() => Temporal.PlainDate.from({ year: 2020, month: 13, day: 1 }, { overflow: 'reject' })) === 'RangeError', 'bad month rejects');
assert(errName(() => Temporal.PlainDate.from('2020-02-30')) === 'RangeError', 'bad day string');
assert(errName(() => Temporal.PlainDate.from('2020-02-29[u-ca=nonsense]')) === 'RangeError', 'unknown calendar');
assert(Temporal.PlainDate.from('2020-02-29[u-ca=iso8601]').equals(d), 'ISO annotation');
assert(Temporal.PlainDate.from('+002020-02-29').toString() === '2020-02-29', 'extended year');
assert(Temporal.PlainDate.from('20200229').equals(d), 'basic format');
assert(Temporal.PlainDate.from(d).equals(d), 'from instance');
assert(Temporal.PlainDate.from({ year: 2020, month: 2, day: 29, calendar: 'iso8601' }).equals(d), 'calendar property');
assert(Temporal.PlainDate.from('2020-02-29').valueOf instanceof Function, 'valueOf is a function');
assert(errName(() => (Temporal.PlainDate.from('2020-02-29') as unknown as { valueOf(): number }).valueOf()) === 'TypeError', 'valueOf throws');

// negative / small years
assert(Temporal.PlainDate.from('-000001-12-31').toString() === '-000001-12-31', 'negative year');
assert(Temporal.PlainDate.from('0000-01-01').toString() === '0000-01-01', 'year zero');
assert(Temporal.PlainDate.from('+010000-01-01').toString() === '+010000-01-01', 'six digit year');

// --- with
assert(d.with({ day: 1 }).toString() === '2020-02-01', 'with day');
assert(d.with({ month: 1 }).toString() === '2020-01-29', 'with clamps day');
assert(d.with({ year: 2021 }).toString() === '2021-02-28', 'with year clamps');
assert(d.with({ day: 31 }).toString() === '2020-02-29', 'with constrains by default');
assert(d.with({ day: 31 }, { overflow: 'constrain' }).toString() === '2020-02-29', 'with constrains');
assert(errName(() => d.with({ day: 31 }, { overflow: 'reject' })) === 'RangeError', 'with rejects');

// --- add / subtract, month-end clamping
assert(d.add({ days: 1 }).toString() === '2020-03-01', 'add days');
assert(d.add({ years: 1 }).toString() === '2021-02-28', 'add year clamps');
assert(d.subtract({ months: 1 }).toString() === '2020-01-29', 'subtract months');
assert(Temporal.PlainDate.from('2020-01-31').add({ months: 1 }).toString() === '2020-02-29', 'month-end clamp forward');
assert(Temporal.PlainDate.from('2020-03-31').subtract({ months: 1 }).toString() === '2020-02-29', 'month-end clamp backward');
assert(errName(() => d.add({ years: 1 }, { overflow: 'reject' })) === 'RangeError', 'add rejects');
assert(d.add({ hours: 1 }).toString() === '2020-02-29', 'date add ignores partial days');
assert(d.add({ hours: 25 }).toString() === '2020-03-01', 'date add balances whole days');
assert(errName(() => d.add({ days: 1.5 })) === 'RangeError', 'date add refuses fractional days');
assert(d.add({ weeks: 2 }).toString() === '2020-03-14', 'add weeks');
assert(d.subtract({ days: 60 }).toString() === '2019-12-31', 'subtract across year');

// --- until / since
assert(d.until('2021-03-01').toString() === 'P366D', 'until default days');
assert(d.until('2021-03-01', { largestUnit: 'days' }).toString() === 'P366D', 'until days');
assert(d.until('2021-03-01', { largestUnit: 'years' }).toString() === 'P1Y1D', 'until years');
assert(d.until('2021-03-01', { largestUnit: 'months' }).toString() === 'P12M1D', 'until months');
assert(d.until('2021-03-01', { smallestUnit: 'months' }).toString() === 'P12M', 'until round months');
assert(d.until('2021-03-01', { smallestUnit: 'months', roundingMode: 'halfExpand' }).toString() === 'P12M', 'until halfExpand');
assert(d.since('2020-01-01').toString() === 'P59D', 'since');
assert(Temporal.PlainDate.from('2020-01-01').until('2020-02-29', { smallestUnit: 'months', roundingMode: 'ceil' }).toString() === 'P2M', 'until ceil');
assert(Temporal.PlainDate.from('2020-01-01').until('2020-05-01', { largestUnit: 'weeks' }).toString() === 'P17W2D', 'until weeks');
assert(Temporal.PlainDate.from('2021-03-31').until('2021-02-28', { largestUnit: 'weeks' }).toString() === '-P4W3D', 'negative until weeks');
assert(Temporal.PlainDate.from('2020-01-01').until('2020-02-15', { smallestUnit: 'months' }).toString() === 'P1M', 'until trunc months');

// --- no round on PlainDate (Node 26)
assert(!('round' in d) && typeof (d as unknown as { round?: unknown }).round === 'undefined', 'PlainDate has no round');

// --- compare / equals
assert(Temporal.PlainDate.compare('2020-01-01', '2020-01-02') === -1, 'compare lt');
assert(Temporal.PlainDate.compare('2020-01-02', '2020-01-01') === 1, 'compare gt');
assert(Temporal.PlainDate.compare('2020-01-01', '2020-01-01') === 0, 'compare eq');
assert(d.equals('2020-02-29') && !d.equals('2020-02-28'), 'equals');

// --- toString options
assert(d.toString({ calendarName: 'always' }) === '2020-02-29[u-ca=iso8601]', 'calendarName always');
assert(d.toString({ calendarName: 'critical' }) === '2020-02-29[!u-ca=iso8601]', 'calendarName critical');
assert(d.toString({ calendarName: 'never' }) === '2020-02-29', 'calendarName never');
assert(JSON.stringify({ d }) === '{"d":"2020-02-29"}', 'JSON.stringify via toJSON');
assert(d instanceof Temporal.PlainDate, 'instanceof');
assert(!(d instanceof Temporal.PlainDateTime), 'not another class');

// --- PlainTime
const t = new Temporal.PlainTime(12, 34, 56, 789, 123, 456);
assert(t.hour === 12 && t.minute === 34 && t.second === 56, 'PlainTime fields');
assert(t.millisecond === 789 && t.microsecond === 123 && t.nanosecond === 456, 'PlainTime sub-second');
assert(t.toString() === '12:34:56.789123456' && String(t) === '12:34:56.789123456', 'PlainTime toString');
assert(new Temporal.PlainTime().toString() === '00:00:00', 'PlainTime default');
assert(Temporal.PlainTime.from('12:34:56.789123456').equals(t), 'PlainTime from');
assert(Temporal.PlainTime.from({ hour: 12, minute: 34, second: 56, millisecond: 789, microsecond: 123, nanosecond: 456 }).equals(t), 'PlainTime from bag');
assert(Temporal.PlainTime.from('12:34:56.789123456').toString({ smallestUnit: 'minute' }) === '12:34', 'PlainTime toString minute');
assert(t.toString({ fractionalSecondDigits: 3 }) === '12:34:56.789', 'fractionalSecondDigits');
assert(t.round({ smallestUnit: 'hour' }).toString() === '13:00:00', 'PlainTime round hour');
assert(t.round({ smallestUnit: 'hour', roundingMode: 'trunc' }).toString() === '12:00:00', 'PlainTime round trunc');
assert(t.round('minute').toString() === '12:35:00', 'PlainTime round minute');
assert(t.add({ hours: 12 }).toString() === '00:34:56.789123456', 'PlainTime add wraps');
assert(t.subtract({ minutes: 35 }).toString() === '11:59:56.789123456', 'PlainTime subtract wraps');
assert(t.until('13:34:56.789123456').toString() === 'PT1H', 'PlainTime until');
assert(t.since('11:00').toString() === 'PT1H34M56.789123456S', 'PlainTime since');
assert(t.until('13:34:56.789123456', { smallestUnit: 'hours' }).toString() === 'PT1H', 'until hours');
assert(Temporal.PlainTime.compare('12:00', '13:00') === -1, 'PlainTime compare');
assert(errName(() => new Temporal.PlainTime(24, 0, 0)) === 'RangeError', 'hour range');
assert(errName(() => Temporal.PlainTime.from('24:00')) === 'RangeError', 'time 24');
assert(Temporal.PlainTime.from('23:59:59.999999999').toString() === '23:59:59.999999999', 'max time');

// --- PlainDateTime
const dt = Temporal.PlainDateTime.from('2020-02-29T12:34:56.789');
assert(dt.year === 2020 && dt.month === 2 && dt.day === 29, 'PlainDateTime date fields');
assert(dt.hour === 12 && dt.minute === 34 && dt.second === 56 && dt.millisecond === 789, 'PlainDateTime time fields');
assert(dt.dayOfWeek === 6 && dt.weekOfYear === 9, 'PlainDateTime derived');
assert(dt.toString() === '2020-02-29T12:34:56.789', 'PlainDateTime toString');
assert(dt.toPlainDate().toString() === '2020-02-29' && dt.toPlainTime().toString() === '12:34:56.789', 'toPlainDate / toPlainTime');
assert(dt.with({ hour: 0 }).toString() === '2020-02-29T00:34:56.789', 'PlainDateTime with');
assert(dt.add({ hours: 12 }).toString() === '2020-03-01T00:34:56.789', 'PlainDateTime add crosses midnight');
assert(dt.subtract({ days: 1 }).toString() === '2020-02-28T12:34:56.789', 'PlainDateTime subtract');
assert(dt.until('2020-03-01T00:00').toString() === 'PT11H25M3.211S', 'PlainDateTime until');
assert(dt.until('2020-03-01T00:00', { largestUnit: 'days' }).toString() === 'PT11H25M3.211S', 'until days unit');
assert(dt.round({ smallestUnit: 'minute' }).toString() === '2020-02-29T12:35:00', 'PlainDateTime round');
assert(dt.round({ smallestUnit: 'day' }).toString() === '2020-03-01T00:00:00', 'round to day');
assert(Temporal.PlainDateTime.compare('2020-01-01T00:00', '2020-01-01T00:01') === -1, 'PlainDateTime compare');
assert(dt.equals('2020-02-29T12:34:56.789'), 'PlainDateTime equals');
assert(dt.toZonedDateTime('UTC').toString() === '2020-02-29T12:34:56.789+00:00[UTC]', 'toZonedDateTime');
assert(dt.toString({ smallestUnit: 'second' }) === '2020-02-29T12:34:56', 'PlainDateTime toString second');

// --- PlainYearMonth
const ym = Temporal.PlainYearMonth.from('2020-02');
assert(ym.year === 2020 && ym.month === 2 && ym.monthCode === 'M02', 'PlainYearMonth fields');
assert(ym.daysInMonth === 29 && ym.daysInYear === 366 && ym.inLeapYear === true, 'PlainYearMonth counts');
assert(ym.toString() === '2020-02' && String(ym) === '2020-02', 'PlainYearMonth toString');
assert(Temporal.PlainYearMonth.from({ year: 2020, month: 2 }).equals(ym), 'PlainYearMonth from bag');
assert(Temporal.PlainYearMonth.from({ year: 2020, monthCode: 'M02' }).equals(ym), 'PlainYearMonth monthCode');
assert(ym.add({ months: 11 }).toString() === '2021-01', 'PlainYearMonth add');
assert(ym.subtract({ months: 2 }).toString() === '2019-12', 'PlainYearMonth subtract');
assert(ym.until('2021-01').toString() === 'P11M', 'PlainYearMonth until');
assert(Temporal.PlainYearMonth.from('2020-01').until('2020-12', { largestUnit: 'years' }).toString() === 'P11M', 'until largestUnit years');
assert(Temporal.PlainYearMonth.compare('2020-01', '2020-02') === -1, 'PlainYearMonth compare');
assert(ym.toPlainDate({ day: 15 }).toString() === '2020-02-15', 'PlainYearMonth toPlainDate');
assert(ym.toString({ calendarName: 'always' }) === '2020-02-01[u-ca=iso8601]', 'PlainYearMonth calendarName');
assert(Temporal.PlainYearMonth.from('2020-02-29').toString() === '2020-02', 'year-month accepts a full date');
assert(errName(() => Temporal.PlainYearMonth.from('2020-02-30')) === 'RangeError', 'year-month rejects an invalid day');

// --- PlainMonthDay
const md = Temporal.PlainMonthDay.from('02-29');
assert(md.monthCode === 'M02' && md.day === 29, 'PlainMonthDay fields');
assert(md.toString() === '02-29', 'PlainMonthDay toString');
assert(String(md) === '02-29', 'PlainMonthDay String');
assert(Temporal.PlainMonthDay.from({ monthCode: 'M02', day: 29 }).equals(md), 'PlainMonthDay from bag');
assert(Temporal.PlainMonthDay.from('1972-02-29').equals(md), 'PlainMonthDay reference year');
assert(md.toPlainDate({ year: 2020 }).toString() === '2020-02-29', 'PlainMonthDay toPlainDate');
assert(Temporal.PlainMonthDay.from('--02-29').equals(md), 'PlainMonthDay -- prefix');
assert(md.equals('02-29'), 'PlainMonthDay equals');
assert(md.toString({ calendarName: 'always' }) === '1972-02-29[u-ca=iso8601]', 'PlainMonthDay calendarName always');
assert(errName(() => Temporal.PlainMonthDay.from('02-30')) === 'RangeError', 'PlainMonthDay invalid');

export {};
