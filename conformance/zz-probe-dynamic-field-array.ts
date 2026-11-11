// Temporary probe: an object's array field read through a dynamic (any)
// binding: the array, its elements, Array.isArray, and a push through it.
class Box {
  items: number[] = [1, 2];
}
const b: any = new Box();
assert(Array.isArray(b.items), 'the field reads as an array');
assert(b.items.length === 2, `length reads (${b.items.length})`);
assert(b.items[0] === 1, `an element reads (${b.items[0]})`);
assert(b.items[1] === 2, 'the second element reads');
b.items.push(3);
assert(b.items.length === 3, 'push through the dynamic read reaches the field');

// (a nested field of a dynamic object holding an array of objects)
const holder: any = { list: [{ name: 'a' }] };
assert(holder.list[0].name === 'a', 'an element of a dynamic array field');
console.log('ok');
