import * as time from 'go:time';

assert(time.Second * 2 === time.Second * time.Duration(2), 'Duration arithmetic');
const d = time.Duration(5);
assert(d.String() === '5ns', 'Duration.String()');

const now = time.Now();
assert(now.Year() > 2020, 'Now().Year()');
assert(now.Unix() > 1000000000, 'Unix() int result');

const parsed = time.Parse('2006-01-02', '2024-01-15');
assert(parsed.Year() === 2024, 'Parse throw-on-error');

let threw = '';
try {
  time.Parse('2006-01-02', 'not-a-date');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Parse error throws');
