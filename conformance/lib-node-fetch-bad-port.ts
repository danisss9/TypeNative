// fetch refuses the Fetch standard's blocked ports before connecting
async function checkBadPort() {
  let name = '';
  let cause = '';
  try {
    await fetch('http://127.0.0.1:6000/');
  } catch (e) {
    name = (e as Error).name;
    cause = ((e as Error).cause as Error).message;
  }
  assert(name === 'TypeError' && cause === 'bad port', 'port 6000 is blocked');
}
checkBadPort();

const inner = new Error('inner');
const outer = new Error('outer', { cause: inner });
assert((outer.cause as Error).message === 'inner', 'new Error(message, { cause })');
const typed = new TypeError('typed', { cause: 'reason' });
assert(typed.cause === 'reason' && new Error('plain').cause === undefined, 'cause on built-in errors');
