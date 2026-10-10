// go:errors — error creation, comparison, wrapping; interplay with throw/catch
import * as errors from 'go:errors';
import { Errorf } from 'go:fmt';
import { Atoi } from 'go:strconv';

const err1 = errors.New('boom');
const err2 = errors.New('boom');
const err3 = errors.New('other');

assert(typeof err1.message === 'string' && err1.message === 'boom', 'errors.New message');
assert(errors.Is(err1, err1), 'Is same value');
assert(!errors.Is(err1, err3), 'Is different values');

const wrapped = errors.Join(err1, err3);
assert(wrapped.message.includes('boom') && wrapped.message.includes('other'), 'Join message');
assert(errors.Unwrap(wrapped) === null, 'joined errors do not unwrap singly');

// Errorf produces catchable errors with .message
try {
  throw Errorf('custom %v', 9);
} catch (e) {
  assert((e as any).message === 'custom 9', `Errorf caught: ${(e as any).message}`);
}

// A thrown JS Error is catchable and comparable to errors.New values by message
try {
  throw new Error('thrown');
} catch (e) {
  assert((e as any).message === 'thrown', 'JS throw caught');
  assert(errors.Is(e, e), 'errors.Is on caught value');
}

// Stdlib (T, error) failures arrive in the same catch as JS throws
try {
  Atoi('zzz');
} catch (e) {
  assert(((e as any).message as string).includes('invalid syntax'), 'stdlib error caught');
}
console.log('go-errors ok');
