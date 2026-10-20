// The smallest possible TypeNative program: print a greeting to stdout.
// An optional name can be passed as the first CLI argument:
//
//   node main.ts Ada        -> Hello, Ada!
//   ./hello Ada             -> Hello, Ada!
const name = process.argv[2] ?? 'world';
console.log(`Hello, ${name}!`);
