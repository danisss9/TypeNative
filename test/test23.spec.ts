// Closures over mutable state

// Counter: inner closure captures and mutates outer variable
function makeCounter() {
  let count: number = 0;
  return (): number => {
    count++;
    return count;
  };
}

const cnt = makeCounter();
assert(cnt() === 1, 'counter: 1st call');
assert(cnt() === 2, 'counter: 2nd call');
assert(cnt() === 3, 'counter: 3rd call');

// Two independent counters don't share state
const counterA = makeCounter();
const counterB = makeCounter();
counterA();
counterA();
assert(counterA() === 3, 'independent counters: A is 3');
assert(counterB() === 1, 'independent counters: B is 1');

// Accumulator: explicit outer return type annotation
function makeAccumulator(initial: number): () => number {
  let total: number = initial;
  return (): number => {
    total++;
    return total;
  };
}

const acc = makeAccumulator(10);
assert(acc() === 11, 'accumulator: 1st call');
assert(acc() === 12, 'accumulator: 2nd call');
assert(acc() === 13, 'accumulator: 3rd call');

// Adder factory: closure captures a parameter
function makeAdder(x: number): (y: number) => number {
  return (y: number): number => {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);
assert(add5(3) === 8, 'adder: add5(3)');
assert(add5(7) === 12, 'adder: add5(7)');
assert(add10(4) === 14, 'adder: add10(4)');
