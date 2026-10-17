import * as fmt from 'go:fmt';
import * as errors from 'go:errors';
import * as bytes from 'go:bytes';
import { ref } from 'go:builtin';

// Sprintf verbs (TS numbers are float64: %v prints them like Go floats).
assert(fmt.Sprintf('%s-%d', 'a', 7) === 'a-7', `Sprintf %s %d: ${fmt.Sprintf('%s-%d', 'a', 7)}`);
assert(fmt.Sprintf('%.2f', 3.14159) === '3.14', 'Sprintf %.2f');
assert(fmt.Sprintf('%5s|%-5s|', 'ab', 'cd') === '   ab|cd   |', 'Sprintf padding');
assert(fmt.Sprintf('%x', 'hi') === '6869', 'Sprintf %x');
assert(fmt.Sprintf('%q', 'a"b') === '"a\\"b"', 'Sprintf %q');
assert(fmt.Sprintf('%t', true) === 'true', 'Sprintf %t');
assert(fmt.Sprintf('%v', [1, 2]) === '[1 2]', 'Sprintf %v slice');
assert(fmt.Sprint('a', 'b') === 'ab', 'Sprint');
assert(fmt.Sprintln('x', 'y') === 'x y\n', 'Sprintln');

// Fprintf into a buffer; returns the byte count.
const buf = new bytes.Buffer();
const n = fmt.Fprintf(buf, 'n=%d', 5);
assert(buf.String() === 'n=5' && n === 3, 'Fprintf');

// Append variants.
assert(bytes.NewBuffer(fmt.Appendf([], '%s!', 'go')).String() === 'go!', 'Appendf');

// Errorf with %w wraps; errors.Is / Unwrap see through it.
const base = errors.New('base');
const wrapped = fmt.Errorf('context: %w', base);
assert(wrapped.Error() === 'context: base', 'Errorf message');
assert(errors.Is(wrapped, base) === true, 'errors.Is through %w');
assert(errors.Unwrap(wrapped) === base, 'errors.Unwrap');

// Sscan / Sscanf into refs.
const word = ref<string>();
const num = ref<number>();
const count = fmt.Sscan('hello 42', word, num);
assert(count === 2 && word.value === 'hello' && num.value === 42, 'Sscan');
const a = ref<number>();
// TS numbers are float64: scan them with %v / %g, not %d.
fmt.Sscanf('x=9', 'x=%v', a);
assert(a.value === 9, 'Sscanf');

let threw = '';
try {
  fmt.Sscan('nope', num);
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Sscan error throws');
