// toFixed rounds the exact value half away from zero (1.25 → 1.3, though
// 1.005 → 1.00 since 1.005 is stored as 1.00499…); 1e21 and above print like
// String(x); number methods also work on any values and in callbacks
const xs = [1.25, -1.25, 1.005, 0.5, 2.5, -0.0001, 1e21, 123.456, 0, 9.995, 99.5];
assert(xs.map((x) => x.toFixed(1)).join(' ') === '1.3 -1.3 1.0 0.5 2.5 -0.0 1e+21 123.5 0.0 10.0 99.5', 'one digit');
assert(xs.map((x) => x.toFixed(2)).join(' ') === '1.25 -1.25 1.00 0.50 2.50 -0.00 1e+21 123.46 0.00 9.99 99.50', 'two digits');
assert(xs.map((x) => x.toFixed()).join(' ') === '1 -1 1 1 3 -0 1e+21 123 0 10 100', 'no digits');
const a: any = 1.25;
const b: any = 5;
assert(a.toFixed(1) === '1.3' && a.toString() === '1.25' && b.toString(2) === '101', 'on an any value');
assert([1.5, 2].map((x) => x.toString()).join() === '1.5,2', 'toString in a callback');
console.log((2.345).toFixed(2), a.toFixed(1));
