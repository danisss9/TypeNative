// Numeric enum reverse mapping (Color[0]), string-literal keys, string enum concatenation
enum Color { Red, Green, Blue = 5, Alias = 5 }
enum Mode { Read = 'r', Write = 'w' }
const n = 1;
assert(Color[0] === 'Red' && Color[n] === 'Green', 'reverse mapping');
assert(Color[Color.Blue] === 'Alias', 'the last member with a value wins');
assert(Color['Green'] === Color.Green && Mode['Write'] === Mode.Write, 'string-literal keys');
assert(Mode.Read + Mode.Write === 'rw' && Mode.Read + '!' === 'r!', 'string enums concatenate');
assert(`${Mode.Read}` === 'r', 'string enum in a template');
