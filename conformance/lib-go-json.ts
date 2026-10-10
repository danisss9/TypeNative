// go:encoding/json — Marshal / MarshalIndent / Valid
import * as json from 'go:encoding/json';

// Record-typed objects marshal through TnMap's MarshalJSON
const obj: Record<string, unknown> = { name: 'ada', age: 36, tags: ['math', 'code'] };
const encoded = json.Marshal(obj);
assert(json.Valid(encoded), 'Marshal produces valid JSON');
assert(encoded.length > 10, 'Marshal length');
assert(encoded[0] === 123, `starts with '{': ${encoded[0]}`);

const pretty = json.MarshalIndent({ a: 1, b: [2, 3] } as Record<string, unknown>, '', '  ');
assert(pretty.length > encoded.length - 10, 'MarshalIndent');
assert(pretty[1] === 10, `indent newline at [1]: ${pretty[1]}`);

assert(json.Valid(encoded), 'Valid true');
assert(!json.Valid('"unterminated'), 'Valid false');

// Objects and arrays roundtrip into Marshal
const nested = json.Marshal({ outer: { inner: true }, list: [1, 2, 3] } as Record<string, unknown>);
assert(json.Valid(nested), 'nested Marshal');
console.log('go-json ok');
