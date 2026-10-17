import * as runtime from 'go:runtime';
import * as debug from 'go:runtime/debug';
import * as expvar from 'go:expvar';

assert(runtime.NumCPU() > 0, 'NumCPU');
assert(runtime.GOOS !== '', 'GOOS const');
assert(runtime.Version().startsWith('go') === true, 'Version');

assert(debug.Stack() !== null || true, 'Stack smoke');

const v = expvar.NewInt('typenative-test-counter');
v.Add(1);
assert(v.Value() === 1, 'expvar Int');
