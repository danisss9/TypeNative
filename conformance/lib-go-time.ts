// go:time — Now, methods, duration math, parse, constants, layouts
import { Now, Parse, ParseDuration, Since, Unix, UnixMilli, Date } from 'go:time';
import { Second, Minute, Hour, Nanosecond, RFC3339, DateOnly, January, December, Monday, Saturday, UTC } from 'go:time';

const now = Now();
assert(now.Year() >= 2026, 'Year');
const y = now.Year();
const m = now.Month();
assert(m >= 1 && m <= 12, 'Month range');
assert(now.Day() >= 1 && now.Day() <= 31, 'Day range');
assert(now.Hour() >= 0 && now.Hour() <= 23, 'Hour range');
assert(now.Minute() >= 0 && now.Minute() <= 59, 'Minute range');
assert(now.Second() >= 0 && now.Second() <= 59, 'Second range');
assert(now.Weekday() >= 0 && now.Weekday() <= 6, 'Weekday range');
assert(now.UnixNano() > 0, 'UnixNano');
assert(now.Unix() > 1600000000, 'Unix');
assert(now.UnixMilli() > 1600000000000, 'UnixMilli');
assert(!now.IsZero(), 'IsZero');
assert(now.After(now.Add(-Second)), 'After');
assert(now.Before(now.Add(Hour)), 'Before');
assert(now.Equal(now), 'Equal');

// Duration arithmetic: time.Second * 2 unifies Go int64 types
const twoHours = 2 * Hour + 30 * Minute;
const later = now.Add(twoHours);
assert(later.Sub(now) === twoHours, 'Add/Sub roundtrip');
const secs = (90 * Second).Seconds();
assert(secs === 90, 'Duration.Seconds');
assert((Minute / Second) === 60, 'Duration division');
assert((3 * Second + 500 * Nanosecond).Nanoseconds() === 3000000500, 'Duration composition');

const parsed = Parse(RFC3339, '2024-06-15T10:30:00Z');
assert(parsed.Year() === 2024 && parsed.Month() === 6 && parsed.Day() === 15, 'Parse RFC3339');
assert(parsed.Hour() === 10 && parsed.Minute() === 30, 'Parse time parts');
const dur = ParseDuration('2h45m');
assert(dur === 2*Hour + 45*Minute, 'ParseDuration');
assert(ParseDuration('100ms') === 100 * 1000000, 'ParseDuration ms');

const epoch = Unix(0, 0);
assert(epoch.Year() === 1970, 'Unix(0,0)');
const millis = UnixMilli(1720000000000);
assert(millis.Unix() === 1720000000, 'UnixMilli roundtrip');

const d = Date(2025, January, 20, 12, 0, 0, 0, UTC);
assert(d.Weekday() === Monday, 'Date weekday');
const d2 = Date(2025, December, 25, 0, 0, 0, 0, UTC);
assert(d2.Month() === December, 'Date month');

const layout = parsed.Format('2006-01-02');
assert(layout === '2024-06-15', 'Format custom layout');
assert(now.Format(DateOnly).length === 10, 'Format DateOnly');

const start = Now();
let x = 0;
for (let i = 0; i < 100000; i++) x += i;
assert(Since(start) >= 0, 'Since');
assert(typeof now.String() === 'string', 'String()');
console.log('go-time ok');
