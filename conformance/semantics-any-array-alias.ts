// An array read from an any object is the object's array: a push through any
// binding of the value reaches the object (JS arrays are shared)
const o: any = { list: [1, 2] };
o.list.push(3);
assert(o.list.length === 3, `a direct push reaches: ${o.list.length}`);
const l: any = o.list;
l.push(4);
assert(o.list.length === 4, `a push through an any alias reaches: ${o.list.length}`);
assert(l === o.list, 'the alias is the object\'s array');
const l2 = o.list;
l2.push(5);
assert(o.list.length === 5, `a push through an untyped alias reaches: ${o.list.length}`);
o.list[0] = 10;
assert(l[0] === 10, 'a write through the object reaches the alias');
console.log('semantics-any-array-alias ok');
