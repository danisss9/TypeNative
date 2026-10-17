import * as exec from 'go:os/exec';
import * as flag from 'go:flag';

const cmd = exec.Command('go', ['version']);
const out = cmd.Output();
assert(out.length > 0, 'exec Output throw-on-tuple');

const fs = flag.NewFlagSet('test', 0);
const name = fs.String('name', 'bob', 'a name');
fs.Parse([]);
assert(name.value === 'bob', 'flag default via ref');

let threw = '';
try {
  exec.Command('nonexistent-binary-xyz').Output();
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'exec error throws');
