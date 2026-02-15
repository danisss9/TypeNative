// Type-aware method dispatch: class .push() and .length should not be intercepted

class Counter {
  length: number;

  constructor() {
    this.length = 0;
  }

  push(item: number): void {
    this.length = this.length + item;
  }

  peek(): number {
    return this.length;
  }
}

const counter = new Counter();
counter.push(10);
counter.push(20);
counter.push(30);

assert(counter.length === 60, 'Counter length should be 60');
assert(counter.peek() === 60, 'Counter peek should be 60');

// Verify array methods still work on actual arrays
let arrPush: number[] = [1, 2, 3];
arrPush.push(4);
assert(arrPush.length === 4, 'Array length should be 4 after push');

// Verify string methods still work on actual strings
const msg2: string = 'hello';
const upperTest2: string = msg2.toUpperCase();
assert(upperTest2 === 'HELLO', 'String toUpperCase should work');

console.log('Type-aware dispatch tests passed!');
