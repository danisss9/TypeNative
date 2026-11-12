// conformance-flags: --no-typecheck
// Array.prototype.at on an array held as any: negative indices count from
// the end, out of range is undefined (the React Compiler's PrintHIR:
// instrValue.quasis.at(-1)!.raw)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Quasi = { raw: string };
const value: any = { quasis: [{ raw: 'a' }, { raw: 'b' }] as Quasi[], nums: [1, 2, 3] };

check('last', value.quasis.at(-1).raw, 'b');
check('first', value.quasis.at(0).raw, 'a');
check('out of range', value.quasis.at(5), undefined);
check('numbers', value.nums.at(-2), 2);
const holder: any = {};
holder.list = ['x', 'y'];
holder.list.push('z');
check('pushed then at', holder.list.at(-1), 'z');
console.log('ok');
