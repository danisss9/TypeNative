// Fibonacci sequence calculation using a loop
let n: number = 1000;

console.time('Fibonacci calculation');

let a: number = 0;
let b: number = 1;
let c: number = n;

for (let i = 2; i <= n; i++) {
  c = a + b;
  a = b;
  b = c;
}

console.log(c);
console.timeEnd('Fibonacci calculation');
