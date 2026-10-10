// go:strconv — parse (TnTry on error) + format; try/catch integration
import { Atoi, ParseBool, ParseFloat, ParseInt, ParseUint, FormatBool, FormatFloat, FormatInt, FormatUint, Itoa, Quote, Unquote } from 'go:strconv';

assert(Atoi('42') === 42, 'Atoi');
assert(ParseBool('true') === true, 'ParseBool');
assert(ParseFloat('3.5', 64) === 3.5, 'ParseFloat');
assert(ParseInt('-17', 10, 64) === -17, 'ParseInt');
assert(ParseUint('99', 10, 64) === 99, 'ParseUint');

assert(FormatBool(false) === 'false', 'FormatBool');
assert(FormatFloat(3.14159, 'f', 2, 64) === '3.14', 'FormatFloat');
assert(FormatInt(255, 16) === 'ff', 'FormatInt(16)');
assert(FormatUint(255, 2) === '11111111', 'FormatUint(2)');
assert(Itoa(-5) === '-5', 'Itoa');
assert(Quote('hi\n') === '"hi\\n"', 'Quote');
assert(Unquote('"tab\\there"') === 'tab\there', 'Unquote');

// (T, error) returns throw; try/catch catches a Go strconv.NumError
let caught = '';
try {
  Atoi('not-a-number');
} catch (e) {
  caught = (e as any).message;
}
assert(caught.includes('invalid syntax'), `Atoi error not caught: ${caught}`);

let caught2 = false;
try {
  ParseFloat('x', 32);
} catch (e) {
  caught2 = true;
}
assert(caught2, 'ParseFloat error not caught');
console.log('go-strconv ok');
