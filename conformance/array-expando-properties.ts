// Arrays are objects: expando properties set beside a dynamic array are shared
// by every binding of it, and delete removes them (visitor machinery writes
// helper props onto arrays that spreads and concats produce)
const bag: any = {};
bag.list = [1, 2];
const a = bag.list;
const b = bag.list;
assert(bag.list.length === 2, 'the container entry is the array');

b.enter = () => 'entered';
assert(a.enter !== undefined && b.enter !== undefined, 'the expando is visible through every binding');
assert(bag.list.enter !== undefined, 'the expando is visible through the container entry');
assert(a.enter() === 'entered', 'the expando value is callable');

a.exit = ['first'];
assert(b.exit[0] === 'first', 'an array-valued expando reads back');
b.exit.push('second');
assert(a.exit.length === 2 && a.exit[1] === 'second', 'pushes reach the expando array');
assert(bag.list.exit.length === 2, 'the push is visible through the container');

delete b.enter;
assert(a.enter === undefined, 'delete removes the expando');
assert(a.exit !== undefined, 'delete only removes the one property');
assert(a.length === 2 && a[0] === 1, 'the array itself is untouched');
console.log('ok');
