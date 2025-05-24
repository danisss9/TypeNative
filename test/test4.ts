// Array manipulation and iteration
let arr: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];

arr.push(1);

for (let i = 0; i < arr.length; i++) {
  arr[i] = arr[i] + i;
}

for (const element of arr) {
  console.log('for of ', element);
}

let count: number = arr.length;
while (count > 0) {
  count--;
  console.log('while ', count);
}

do {
  count++;
  console.log('do while', count);
} while (count < 10);
