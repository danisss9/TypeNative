import * as strings from 'go:strings';
import { Atoi } from 'go:strconv';

const r = strings.Repeat('ab', 3);
assert(r === 'ababab', `Repeat failed: ${r}`);

const n = Atoi('42');
assert(n === 42, `Atoi failed: ${n}`);

let threw = '';
try {
  Atoi('not-a-number');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Atoi error should throw');
