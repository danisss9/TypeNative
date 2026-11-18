// A program's own `assert` shadows TypeNative's global assertion: its body
// runs, so a false assertion throws something a try/catch can catch (the
// global one lowers to a Go panic statement and could not be caught)
import nodeAssert from 'node:assert';

let calls = 0;
function assert(ok: boolean, label: string): void {
  calls++;
  if (!ok) throw new Error('own assert: ' + label);
}

assert(true, 'passes');
nodeAssert.equal(calls, 1);

let caught = '';
try {
  assert(false, 'fails');
} catch (err) {
  caught = (err as Error).message;
}
nodeAssert.equal(caught, 'own assert: fails');
nodeAssert.equal(calls, 2);

// (the imported function still resolves through node:assert)
nodeAssert.throws(() => assert(false, 'throws'), /own assert: throws/);
nodeAssert.equal(calls, 3);

console.log('local assert ok');
