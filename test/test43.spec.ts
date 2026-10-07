// String methods
const s = 'Hello, World';
assert(s.includes('World'), 'includes failed');
assert(s.startsWith('Hello'), 'startsWith failed');
assert(s.toLowerCase() === 'hello, world', 'toLowerCase failed');
assert(s.split(', ').length === 2, 'split failed');
assert(s.slice(0, 5) === 'Hello', 'slice failed');
assert('  hi  '.trim() === 'hi', 'trim failed');
assert('ab'.repeat(3) === 'ababab', 'repeat failed');
assert('5'.padStart(3, '0') === '005', 'padStart failed');
assert(s.indexOf('World') === 7, 'indexOf failed');
assert(s.replace('World', 'Go') === 'Hello, Go', 'replace failed');
