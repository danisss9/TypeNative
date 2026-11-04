// An array passed where any is expected is the array itself: pushes through
// the any value reach it, and it still reads as an array
class Holder {
  items: string[] = [];
}
function addTo(x: any, v: string) {
  x.push(v);
  x.unshift('^');
}
function viaCast(x: any) {
  const arr = x as number[];
  arr.push(2);
}
function show(x: any): string {
  return JSON.stringify(x) + ' ' + String(x) + ' ' + x.length + ' ' + Array.isArray(x) + ' ' + typeof x + ' ' + x[1];
}
const h = new Holder();
const local: string[] = ['a'];
addTo(local, 'b');
addTo(h.items, 'c');
const nums: number[] = [1];
viaCast(nums);
const shown = show(nums);
console.log(local.join(''), h.items.join(''), nums.join(','), shown);
assert(local.join('') === '^ab' && h.items.join('') === '^c', 'pushes reach the arrays');
assert(nums.join(',') === '1,2', 'cast push');
assert(shown === '[1,2] 1,2 2 true object 2', 'reads as an array');
