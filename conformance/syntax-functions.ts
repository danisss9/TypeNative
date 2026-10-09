// Functions and Arrow Functions
function add(a: number, b: number): number {
  return a + b;
}
console.log(add(1, 1));
assert(add(1, 1) === 2, 'add(1, 1) should equal 2');
assert(add(0, 0) === 0, 'add(0, 0) should equal 0');
assert(add(10, 20) === 30, 'add(10, 20) should equal 30');

const logMessage = (msg: string): void => {
  console.log(msg);
};
logMessage('This is a test message.');
