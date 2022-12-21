/// <reference no-default-lib="true"/>

require('time');

let n: number = 50;

let a: number = 0;
let b: number = 1;
let c: number = n;

for (let i = 2; i <= n; i++) {
  c = a + b;
  a = b;
  b = c;
}

console.log(c);

/*  clock_t start_time = clock();

  // code or function to benchmark

  double elapsed_time = (double)(clock() - start_time) / CLOCKS_PER_SEC; */
