// An array passed through a function-typed value (a callback slot) is the
// caller's array, as JS passes the array itself: a push, pop or element write
// in the callee reaches the caller — a declared function assigned to the slot,
// an arrow typed by the slot, a Record of functions, a callback parameter
function addOne(xs: number[]): void {
  xs.push(1);
}

// a declared function stored in a function-typed variable
const slot: (xs: number[]) => void = addOne;
const a: number[] = [];
slot(a);
slot(a);
console.log(a.length);
assert(a.length === 2 && a[1] === 1, 'a push through a function-typed variable');

// reassigned: an arrow, then a declared function
let cb: (xs: number[]) => void = (xs) => {
  xs.pop();
};
cb(a);
assert(a.length === 1, 'a pop through an arrow typed by the slot');
cb = addOne;
cb(a);
assert(a.length === 2, 'a push through a reassigned slot');

// a Record of functions, by name and by key
const table: Record<string, (names: string[]) => number> = {
  add: (names: string[]) => names.push('x'),
  clear: (names) => {
    names.length = 0;
    return 0;
  }
};
const names: string[] = [];
table.add(names);
table['add'](names);
assert(names.length === 2 && names.join() === 'x,x', 'a push through a Record of functions');
const add = table.add;
add(names);
assert(names.length === 3, 'a push through a function read from a Record');
table.clear(names);
assert(names.length === 0, 'a length write through a Record of functions');

// a callback parameter, and an object field holding a function
function apply(list: number[], visit: (list: number[]) => void): void {
  visit(list);
}
const first: number[] = [];
const second = [7];
apply(first, addOne);
apply(second, addOne);
const times10 = (list: number[]) => {
  list[0] = list[0] * 10;
};
apply(first, times10);
apply(second, times10);
assert(first.join() === '10' && second.join() === '70,1', 'arrays through a callback parameter');

interface Hooks {
  onItems: (items: string[]) => void;
}
const hooks: Hooks = {
  onItems: (items) => {
    items.unshift('first');
  }
};
const items = ['last'];
hooks.onItems(items);
assert(items.join() === 'first,last', 'an unshift through an object field');

// a literal array argument, through a cast function value
const pushed = ((xs: number[]): number => {
  xs.push(0);
  return xs.length;
}) as (xs: number[]) => number;
assert(pushed([1, 2]) === 3, 'a literal array through a function-typed value');
console.log('ok');
