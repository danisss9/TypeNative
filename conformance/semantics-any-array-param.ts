// An any[] passed to a function is shared: the callee's push reaches the caller
function add(arr: any[], ...values: any[]): void {
  for (const v of values) arr.push(v);
}

const numbers: any[] = [1];
add(numbers, 2, 3);
assert(numbers.length === 3 && numbers[2] === 3, 'any[] push through a parameter');

function fill(target: any[]): any[] {
  target.push({ done: true });
  return target;
}
const objects: any[] = [];
fill(objects);
assert(objects.length === 1 && objects[0].done === true, 'pushed object reaches the caller');

console.log('any[] parameter push ok');
