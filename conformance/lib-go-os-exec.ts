// go:os/exec — Command methods (Output, CombinedOutput, Run, String)
import { Command } from 'go:os/exec';

const cmd = Command('go', 'version');
const out = cmd.Output();
assert(out.length > 0, 'Output length');
assert(out[0] === 103, `starts with 'g': ${out[0]}`);
assert(cmd.String().includes('version'), `String: ${cmd.String()}`);

const cmd2 = Command('go', 'env', 'GOVERSION');
const out2 = cmd2.CombinedOutput();
assert(out2.length >= 3, 'CombinedOutput length');

const cmd3 = Command('go', 'version');
cmd3.Run();

// A failing command panics (TnTry semantics) and is caught by try/catch
let failed = false;
try {
  Command('go', 'definitely-not-a-subcommand-xyz').Output();
} catch (e) {
  failed = true;
}
assert(failed, 'failing command not caught');

// Missing executable also throws
let missing = false;
try {
  Command('tn-definitely-not-installed-xyz').Run();
} catch (e) {
  missing = true;
}
assert(missing, 'missing executable not caught');
console.log('go-os-exec ok');
