// Array manipulation and iteration
let arr: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];

arr.push(1);
assert(arr.length === 10, 'Array length should be 10 after push');

for (let i = 0; i < arr.length; i++) {
  arr[i] = arr[i] + i;
}

assert(arr[0] === 1, 'First element should be 1');
assert(arr[1] === 2, 'Second element should be 2');

for (const element of arr) {
  console.log('for of ', element);
}

let count: number = arr.length;
while (count > 0) {
  count--;
  console.log('while ', count);
}
assert(count === 0, 'Count should be 0 after while loop');

do {
  count++;
  console.log('do while', count);
} while (count < 10);
assert(count === 10, 'Count should be 10 after do-while loop');
