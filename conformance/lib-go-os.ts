// go:os — env, files (TnTry on error), dirs, stat, values
import * as os from 'go:os';
import * as json from 'go:encoding/json';

os.Setenv('TN_TEST_VAR', 'hello');
assert(os.Getenv('TN_TEST_VAR') === 'hello', 'Setenv/Getenv');
os.Unsetenv('TN_TEST_VAR');
assert(os.Getenv('TN_TEST_VAR') === '', 'Unsetenv');
assert(typeof os.Getenv('PATH') === 'string', 'Getenv PATH');
assert(os.Environ().length > 0, 'Environ');
assert(os.Args.length >= 1, 'Args');
assert(os.TempDir().length > 0, 'TempDir');
assert(os.DevNull.length > 0, 'DevNull');
assert(typeof os.Stdout.Name() === 'string', 'Stdout.Name');
assert(os.Getpagesize() >= 4096, 'Getpagesize');

const home = os.UserHomeDir();
assert(home.length > 0, 'UserHomeDir');

// Files: WriteFile + ReadFile roundtrip ([]byte), Remove, catch on missing
const file = 'tn-go-os-test.txt';
os.WriteFile(file, 'written by typenative', 0o644);
const data = os.ReadFile(file);
assert(data.length === 21, `ReadFile length: ${data.length}`);
os.WriteFile(file, 'rewritten in place', 0o644);
assert(os.ReadFile(file).length === 18, 'WriteFile overwrite');
os.Remove(file);

let missingCaught = false;
try {
  os.ReadFile('tn-go-os-no-such-file.txt');
} catch (e) {
  missingCaught = true;
  assert(((e as any).message as string).length > 0, 'error message present');
}
assert(missingCaught, 'ReadFile missing file not caught');

// Stat + ReadDir
const stat = os.Stat('.');
assert(stat.IsDir(), 'Stat dir IsDir');
assert(typeof stat.Name() === 'string', 'Stat name');
assert(stat.Size() >= 0, 'Stat size');
assert(!stat.ModTime().IsZero(), 'Stat ModTime');

const entries = os.ReadDir('.');
assert(entries.length >= 1, `ReadDir count: ${entries.length}`);
let named = 0;
for (const entry of entries) {
  if (entry.Name().length > 0) named++;
}
assert(named === entries.length, 'ReadDir entries all named');

// MkdirAll + RemoveAll roundtrip
os.MkdirAll('tn-go-os-dir/nested', 0o755);
os.WriteFile('tn-go-os-dir/nested/inner.txt', 'x', 0o644);
assert(os.Stat('tn-go-os-dir/nested').IsDir(), 'MkdirAll');
os.RemoveAll('tn-go-os-dir');
let goneCaught = false;
try {
  os.Stat('tn-go-os-dir');
} catch (e) {
  goneCaught = true;
}
assert(goneCaught, 'RemoveAll');

// Executable + Hostname + Getwd
assert(os.Executable().length > 0, 'Executable');
assert(os.Hostname().length >= 0, 'Hostname');
assert(os.Getwd().length > 0, 'Getwd');

// JSON valid bytes are passable between packages
os.WriteFile('tn-go-os-json.json', json.Marshal({ ok: true }), 0o644);
assert(json.Valid(os.ReadFile('tn-go-os-json.json')), 'json.Valid on written bytes');
os.Remove('tn-go-os-json.json');
console.log('go-os ok');
