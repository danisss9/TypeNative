// RegExp

// Regex literal with test()
let emailPattern = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]+$/;
assert(emailPattern.test('user@example.com'), 'email test failed');
assert(!emailPattern.test('invalid-email'), 'invalid email test failed');
console.log('email regex: passed');

// Regex literal with case-insensitive flag
let caseInsensitive = /hello/i;
assert(caseInsensitive.test('Hello World'), 'case insensitive test failed');
assert(caseInsensitive.test('HELLO'), 'case insensitive upper test failed');
console.log('case insensitive regex: passed');

// new RegExp() constructor
let digitPattern = new RegExp('[0-9]+');
assert(digitPattern.test('abc123'), 'digit test failed');
assert(!digitPattern.test('abcdef'), 'no digit test failed');
console.log('new RegExp: passed');

// new RegExp() with flags
let flagPattern = new RegExp('world', 'i');
assert(flagPattern.test('Hello WORLD'), 'new RegExp flags test failed');
console.log('new RegExp with flags: passed');

// exec() returning matches
let datePattern = /(\d{4})-(\d{2})-(\d{2})/;
let matches: string[] = datePattern.exec('2025-02-15')!;
console.log(matches[0]);
console.log(matches[1]);
console.log(matches[2]);
console.log(matches[3]);
assert(matches[0] == '2025-02-15', 'exec full match failed');
assert(matches[1] == '2025', 'exec year group failed');
assert(matches[2] == '02', 'exec month group failed');
assert(matches[3] == '15', 'exec day group failed');
console.log('exec: passed');
