// A variable declared `any` / `unknown` with a primitive initializer is dynamic:
// it coerces like JS and can be reassigned another type
const s: any = '6';
assert(s - 1 === 5 && s * 2 === 12, 'ToNumber on a string');
assert(s == 6 && !(s === 6), 'loose vs strict equality');
let t: any = true;
assert(t * 3 === 3, 'ToNumber on a boolean');
t = 'now a string';
assert(t === 'now a string', 'reassigned another type');
const n: unknown = 4;
assert(typeof n === 'number', 'typeof');
const fromAngle: number = <number>(n as any);
assert(fromAngle === 4, 'angle-bracket assertion');
const values: any[] = [0, '0', '', false, null, undefined, '1.0', 1];
const matrix = values.map((a) => values.map((b) => (a == b ? '1' : '0')).join('')).join(' ');
assert(matrix === '11110000 11010000 10110000 11110000 00001100 00001100 00000011 00000011', matrix);
