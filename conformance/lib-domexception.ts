// DOMException (name, legacy code, instanceof) and QuotaExceededError
const e = new DOMException('gone', 'NotFoundError');
console.log(e.name, e.message, e.code);
assert(e.name === 'NotFoundError' && e.message === 'gone' && e.code === 8, 'name / message / code');
assert(e instanceof DOMException && e instanceof Error, 'instanceof DOMException and Error');
assert(Error.isError(e), 'a DOMException is an Error');

const plain = new DOMException('x');
assert(plain.name === 'Error' && plain.code === 0, 'default name and code');

const withCause = new DOMException('outer', { name: 'DataCloneError', cause: 'inner' });
assert(withCause.name === 'DataCloneError' && withCause.code === 25 && withCause.cause === 'inner', 'options form');

assert(!(new TypeError('t') instanceof DOMException), 'other errors are not DOMExceptions');

// AbortSignal's reasons are DOMExceptions
const ac = new AbortController();
ac.abort();
const reason = ac.signal.reason as DOMException;
assert(reason instanceof DOMException && reason.name === 'AbortError' && reason.code === 20, 'AbortError is a DOMException');

const q = new QuotaExceededError('full', { quota: 10, requested: 12 });
assert(q instanceof QuotaExceededError && q instanceof DOMException, 'QuotaExceededError is a DOMException');
assert(q.name === 'QuotaExceededError' && q.code === 22 && q.quota === 10 && q.requested === 12, 'quota fields');
try {
  throw new DOMException('timed out', 'TimeoutError');
} catch (err) {
  assert(err instanceof DOMException && (err as DOMException).code === 23, 'thrown and caught');
}
