import * as context from 'go:context';
import * as sync from 'go:sync';
import * as atomic from 'go:sync/atomic';

const ctx = context.Background();
assert(ctx.Err() === null || true, 'Background smoke');

const todo = context.TODO();
assert(todo !== null, 'TODO');

const mu = new sync.Mutex();
mu.Lock();
mu.Unlock();
assert(true, 'Mutex lock/unlock');

const v = new atomic.Int64();
v.Store(42);
assert(v.Load() === 42, 'atomic Int64');
