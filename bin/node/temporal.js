// The Temporal global (Node 26): PlainDate / PlainTime / PlainDateTime /
// PlainYearMonth / PlainMonthDay / ZonedDateTime / Instant / Duration / Now on
// Go's time package with embedded tzdata (see temporal_runtime.ts for the
// algorithms and temporal_zones.ts for the zone handling)
import { registerTemporalRuntime } from './temporal_runtime.js';
import { registerTemporalZones } from './temporal_zones.js';
import { defineClass, setResults } from './registry.js';
export function registerTemporal(r) {
    registerTemporalZones(r);
    registerTemporalRuntime(r);
    // (the embedded timezone database: named zones resolve without it on
    // platforms with no system zoneinfo, like Windows)
    r.helperSideEffects['nodeTemporal'] = ['time/tzdata'];
    const use = () => r.helper('nodeTemporal');
    r.globals['Temporal'] = 'Temporal';
    r.objects['Temporal'] = true;
    // --- The classes (methods pass through as Go methods; getters are Get_ calls)
    defineClass(r, 'Temporal.PlainDate', '*TnTemporalPlainDate', 'class', 'add=*TnTemporalPlainDate; subtract=*TnTemporalPlainDate; with=*TnTemporalPlainDate; withCalendar=*TnTemporalPlainDate; until=*TnTemporalDuration; since=*TnTemporalDuration; equals=bool; toPlainYearMonth=*TnTemporalPlainYearMonth; toPlainMonthDay=*TnTemporalPlainMonthDay; toPlainDateTime=*TnTemporalPlainDateTime; toZonedDateTime=*TnTemporalZonedDateTime; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'calendarId=string; era=interface{}; eraYear=interface{}; year=float64; month=float64; monthCode=string; day=float64; dayOfWeek=float64; dayOfYear=float64; weekOfYear=float64; yearOfWeek=float64; daysInWeek=float64; daysInMonth=float64; daysInYear=float64; monthsInYear=float64; inLeapYear=bool', '');
    defineClass(r, 'Temporal.PlainTime', '*TnTemporalPlainTime', 'class', 'add=*TnTemporalPlainTime; subtract=*TnTemporalPlainTime; with=*TnTemporalPlainTime; until=*TnTemporalDuration; since=*TnTemporalDuration; equals=bool; round=*TnTemporalPlainTime; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'hour=float64; minute=float64; second=float64; millisecond=float64; microsecond=float64; nanosecond=float64', '');
    defineClass(r, 'Temporal.PlainDateTime', '*TnTemporalPlainDateTime', 'class', 'add=*TnTemporalPlainDateTime; subtract=*TnTemporalPlainDateTime; with=*TnTemporalPlainDateTime; withCalendar=*TnTemporalPlainDateTime; withPlainTime=*TnTemporalPlainDateTime; until=*TnTemporalDuration; since=*TnTemporalDuration; equals=bool; round=*TnTemporalPlainDateTime; toPlainDate=*TnTemporalPlainDate; toPlainTime=*TnTemporalPlainTime; toZonedDateTime=*TnTemporalZonedDateTime; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'calendarId=string; era=interface{}; eraYear=interface{}; year=float64; month=float64; monthCode=string; day=float64; dayOfWeek=float64; dayOfYear=float64; weekOfYear=float64; yearOfWeek=float64; daysInWeek=float64; daysInMonth=float64; daysInYear=float64; monthsInYear=float64; inLeapYear=bool; hour=float64; minute=float64; second=float64; millisecond=float64; microsecond=float64; nanosecond=float64', '');
    defineClass(r, 'Temporal.PlainYearMonth', '*TnTemporalPlainYearMonth', 'class', 'add=*TnTemporalPlainYearMonth; subtract=*TnTemporalPlainYearMonth; with=*TnTemporalPlainYearMonth; until=*TnTemporalDuration; since=*TnTemporalDuration; equals=bool; toPlainDate=*TnTemporalPlainDate; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'calendarId=string; era=interface{}; eraYear=interface{}; year=float64; month=float64; monthCode=string; daysInMonth=float64; daysInYear=float64; monthsInYear=float64; inLeapYear=bool', '');
    defineClass(r, 'Temporal.PlainMonthDay', '*TnTemporalPlainMonthDay', 'class', 'with=*TnTemporalPlainMonthDay; equals=bool; toPlainDate=*TnTemporalPlainDate; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'calendarId=string; monthCode=string; day=float64', '');
    defineClass(r, 'Temporal.Instant', '*TnTemporalInstant', 'class', 'add=*TnTemporalInstant; subtract=*TnTemporalInstant; until=*TnTemporalDuration; since=*TnTemporalDuration; equals=bool; round=*TnTemporalInstant; toString=string; toJSON=string; toLocaleString=string; toZonedDateTimeISO=*TnTemporalZonedDateTime; valueOf=', '', 'epochMilliseconds=float64; epochNanoseconds=*tnbig.Int', '');
    defineClass(r, 'Temporal.ZonedDateTime', '*TnTemporalZonedDateTime', 'class', 'add=*TnTemporalZonedDateTime; subtract=*TnTemporalZonedDateTime; with=*TnTemporalZonedDateTime; withCalendar=*TnTemporalZonedDateTime; withPlainTime=*TnTemporalZonedDateTime; withTimeZone=*TnTemporalZonedDateTime; until=*TnTemporalDuration; since=*TnTemporalDuration; equals=bool; round=*TnTemporalZonedDateTime; startOfDay=*TnTemporalZonedDateTime; getTimeZoneTransition=interface{}; toInstant=*TnTemporalInstant; toPlainDate=*TnTemporalPlainDate; toPlainTime=*TnTemporalPlainTime; toPlainDateTime=*TnTemporalPlainDateTime; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'calendarId=string; timeZoneId=string; era=interface{}; eraYear=interface{}; year=float64; month=float64; monthCode=string; day=float64; dayOfWeek=float64; dayOfYear=float64; weekOfYear=float64; yearOfWeek=float64; daysInWeek=float64; daysInMonth=float64; daysInYear=float64; monthsInYear=float64; inLeapYear=bool; hour=float64; minute=float64; second=float64; millisecond=float64; microsecond=float64; nanosecond=float64; epochMilliseconds=float64; epochNanoseconds=*tnbig.Int; offset=string; offsetNanoseconds=float64; hoursInDay=float64', '');
    defineClass(r, 'Temporal.Duration', '*TnTemporalDuration', 'class', 'with=*TnTemporalDuration; negated=*TnTemporalDuration; abs=*TnTemporalDuration; add=*TnTemporalDuration; subtract=*TnTemporalDuration; round=*TnTemporalDuration; total=float64; toString=string; toJSON=string; toLocaleString=string; valueOf=', '', 'years=float64; months=float64; weeks=float64; days=float64; hours=float64; minutes=float64; seconds=float64; milliseconds=float64; microseconds=float64; nanoseconds=float64; sign=float64; blank=bool', '');
    // --- Constructors
    r.constructors['Temporal.PlainDate'] = (c) => {
        use();
        return `TnNewTemporalPlainDate(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.PlainTime'] = (c) => {
        use();
        return `TnNewTemporalPlainTime(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.PlainDateTime'] = (c) => {
        use();
        return `TnNewTemporalPlainDateTime(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.PlainYearMonth'] = (c) => {
        use();
        return `TnNewTemporalPlainYearMonth(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.PlainMonthDay'] = (c) => {
        use();
        return `TnNewTemporalPlainMonthDay(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.Instant'] = (c) => {
        use();
        return `TnNewTemporalInstant(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.ZonedDateTime'] = (c) => {
        use();
        return `TnNewTemporalZonedDateTime(${c.args.join(', ')})`;
    };
    r.constructors['Temporal.Duration'] = (c) => {
        use();
        return `TnNewTemporalDuration(${c.args.join(', ')})`;
    };
    // --- Namespace objects (const PD = Temporal.PlainDate binds a local name)
    for (const name of ['PlainDate', 'PlainTime', 'PlainDateTime', 'PlainYearMonth', 'PlainMonthDay', 'Instant', 'ZonedDateTime', 'Duration', 'Now']) {
        r.objects[`Temporal.${name}`] = true;
    }
    // --- Statics
    const fn = (key, result, emit) => {
        r.functions[key] = (c) => {
            use();
            return emit(c);
        };
        if (result)
            r.results[key] = result;
    };
    fn('Temporal.PlainDate.from', '*TnTemporalPlainDate', (c) => `TnTemporalPlainDateFrom(${c.args.join(', ')})`);
    fn('Temporal.PlainDate.compare', 'float64', (c) => `TnTemporalPlainDateCompare(${c.args.join(', ')})`);
    fn('Temporal.PlainTime.from', '*TnTemporalPlainTime', (c) => `TnTemporalPlainTimeFrom(${c.args.join(', ')})`);
    fn('Temporal.PlainTime.compare', 'float64', (c) => `TnTemporalPlainTimeCompare(${c.args.join(', ')})`);
    fn('Temporal.PlainDateTime.from', '*TnTemporalPlainDateTime', (c) => `TnTemporalPlainDateTimeFrom(${c.args.join(', ')})`);
    fn('Temporal.PlainDateTime.compare', 'float64', (c) => `TnTemporalPlainDateTimeCompare(${c.args.join(', ')})`);
    fn('Temporal.PlainYearMonth.from', '*TnTemporalPlainYearMonth', (c) => `TnTemporalPlainYearMonthFrom(${c.args.join(', ')})`);
    fn('Temporal.PlainYearMonth.compare', 'float64', (c) => `TnTemporalPlainYearMonthCompare(${c.args.join(', ')})`);
    fn('Temporal.PlainMonthDay.from', '*TnTemporalPlainMonthDay', (c) => `TnTemporalPlainMonthDayFrom(${c.args.join(', ')})`);
    fn('Temporal.Instant.from', '*TnTemporalInstant', (c) => `TnTemporalInstantFrom(${c.args.join(', ')})`);
    fn('Temporal.Instant.fromEpochMilliseconds', '*TnTemporalInstant', (c) => `TnTemporalInstantFromEpochMilliseconds(${c.args.join(', ')})`);
    fn('Temporal.Instant.fromEpochNanoseconds', '*TnTemporalInstant', (c) => `TnTemporalInstantFromEpochNanoseconds(${c.args.join(', ')})`);
    fn('Temporal.Instant.compare', 'float64', (c) => `TnTemporalInstantCompare(${c.args.join(', ')})`);
    fn('Temporal.ZonedDateTime.from', '*TnTemporalZonedDateTime', (c) => `TnTemporalZonedDateTimeFrom(${c.args.join(', ')})`);
    fn('Temporal.ZonedDateTime.compare', 'float64', (c) => `TnTemporalZonedDateTimeCompare(${c.args.join(', ')})`);
    fn('Temporal.Duration.from', '*TnTemporalDuration', (c) => `TnTemporalDurationFrom(${c.args.join(', ')})`);
    fn('Temporal.Duration.compare', 'float64', (c) => `TnTemporalDurationCompare(${c.args.join(', ')})`);
    fn('Temporal.Now.instant', '*TnTemporalInstant', () => `TnTemporalNowInstant()`);
    fn('Temporal.Now.timeZoneId', 'string', () => `TnTemporalNowTimeZoneId()`);
    fn('Temporal.Now.plainDateISO', '*TnTemporalPlainDate', (c) => `TnTemporalNowPlainDateISO(${c.args.join(', ')})`);
    fn('Temporal.Now.plainTimeISO', '*TnTemporalPlainTime', (c) => `TnTemporalNowPlainTimeISO(${c.args.join(', ')})`);
    fn('Temporal.Now.plainDateTimeISO', '*TnTemporalPlainDateTime', (c) => `TnTemporalNowPlainDateTimeISO(${c.args.join(', ')})`);
    fn('Temporal.Now.zonedDateTimeISO', '*TnTemporalZonedDateTime', (c) => `TnTemporalNowZonedDateTimeISO(${c.args.join(', ')})`);
    setResults(r, 'Temporal.Now', 'instant=*TnTemporalInstant; timeZoneId=string');
}
