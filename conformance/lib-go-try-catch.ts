// (T, error) lowering across packages: every Go error return becomes a
// JS-style throw, caught by the same try/catch as thrown Errors.
import { Atoi } from 'go:strconv';
import * as os from 'go:os';
import * as url from 'go:net/url';
import { StdEncoding } from 'go:encoding/base64';
import * as filepath from 'go:path/filepath';
import { New as HmacNew } from 'go:crypto/hmac';
import * as sha256 from 'go:crypto/sha256';
import * as fmt from 'go:fmt';

let threw = '';
try {
  Atoi('zzz');
} catch (e) {
  threw = 'atoi';
  assert(((e as any).message as string).includes('invalid syntax'), 'Atoi error text');
}
assert(threw === 'atoi', 'strconv.Atoi did not throw');

threw = '';
try {
  os.ReadFile('tn-missing-file-xyz.txt');
} catch (e) {
  threw = 'read';
}
assert(threw === 'read', 'os.ReadFile did not throw');

threw = '';
try {
  os.WriteFile('tn-bad-dir-xyz/nope.txt', 'x', 0o644);
} catch (e) {
  threw = 'write';
}
assert(threw === 'write', 'os.WriteFile did not throw');

threw = '';
try {
  url.Parse('http://[::1');
} catch (e) {
  threw = 'url';
}
assert(threw === 'url', 'url.Parse did not throw');

threw = '';
try {
  StdEncoding.DecodeString('!!!');
} catch (e) {
  threw = 'b64';
}
assert(threw === 'b64', 'base64.DecodeString did not throw');

threw = '';
try {
  filepath.Glob('[');
} catch (e) {
  threw = 'glob';
}
assert(threw === 'glob', 'filepath.Glob did not throw');

threw = '';
try {
  os.Stat('tn-also-missing-xyz.bin');
} catch (e) {
  threw = 'stat';
}
assert(threw === 'stat', 'os.Stat did not throw');

// Errors carry the Go error text (js Error.message)
try {
  Atoi('nope');
} catch (e) {
  const m = (e as any).message as string;
  assert(m.includes('strconv.Atoi'), `Go error text: ${m}`);
  assert(m.includes('invalid syntax'), `Go error reason: ${m}`);
}

// Successful (T, error) calls return the plain value
assert(Atoi('77') === 77, 'Atoi success value');
os.WriteFile('tn-try-ok.txt', 'ok', 0o644);
assert(os.Stat('tn-try-ok.txt').Size() === 2, 'WriteFile success');
os.Remove('tn-try-ok.txt');

// Mixed with fmt and hmac: no throw on success paths
fmt.Println('try-catch success path');
const mac = HmacNew(sha256.New, 'k').Sum(nil);
assert(mac.length === 32, 'hmac success');
console.log('go-try-catch ok');
