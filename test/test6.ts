// Functions and Arrow Functions
function add(a: number, b: number): number {
  return a + b;
}
console.log(add(1, 1));

const logMessage = (msg: string): void => {
  console.log(msg);
};
logMessage('This is a test message.');
