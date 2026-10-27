// Numbers print as JS does: plain notation from 1e-6 up to 1e21, exponent
// form (without zero padding) outside it, in String(), templates and JSON
assert(String(1761603012345.678) === '1761603012345.678', 'large fraction stays plain');
assert(`${123456.789}` === '123456.789', 'template literal');
assert('' + 0.000001 === '0.000001', 'small boundary stays plain');
assert(String(0.0000015) === '0.0000015', 'small fraction stays plain');
assert(String(1e-7) === '1e-7', 'below 1e-6 uses exponent');
assert(String(-2.5e-8) === '-2.5e-8', 'negative small exponent');
assert(String(1e21) === '1e+21' && String(1.5e300) === '1.5e+300', 'large exponent');
assert(String(123e18) === '123000000000000000000', 'large integer stays plain');
assert(String(0.1 + 0.2) === '0.30000000000000004', 'shortest round-trip digits');

const stat = { mtimeMs: 1793140728439.3623, ratio: 1e-7, size: 18 };
assert(JSON.stringify(stat) === '{"mtimeMs":1793140728439.3623,"ratio":1e-7,"size":18}', 'JSON.stringify struct');
assert(JSON.stringify([1761603012345.678, 0.000001]) === '[1761603012345.678,0.000001]', 'JSON.stringify array');
