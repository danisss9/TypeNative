import * as strconv from 'go:strconv';

assert(strconv.FormatBool(true) === 'true', 'FormatBool');
assert(strconv.Itoa(42) === '42', 'Itoa int result');
assert(strconv.Atoi('42') === 42, 'Atoi throw-on-int');
assert(strconv.Quote('hi') === '"hi"', 'Quote');
assert(strconv.ParseFloat('3.14', 64) === 3.14, 'ParseFloat tuple');
assert(strconv.FormatFloat(3.14, 'f', 2, 64) === '3.14', 'FormatFloat');

let threw = '';
try {
  strconv.Atoi('not-a-number');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Atoi error throws');
