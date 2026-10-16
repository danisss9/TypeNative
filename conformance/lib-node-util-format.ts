import util, { format } from 'node:util';

assert(format('%s is %d years', 'Ana', 42) === 'Ana is 42 years', '%s / %d');
assert(format('%i / %f', 3.9, 1.5) === '3 / 1.5', '%i / %f');
assert(format('%j', { a: [1, 2] }) === '{"a":[1,2]}', '%j');
assert(format('100%%', 1) === '100% 1' && format('100%%') === '100%%', '%%');
assert(format('%s', 'a', 'extra', 7) === 'a extra 7', 'extra arguments appended');
assert(format('no specifiers', 1) === 'no specifiers 1', 'no specifiers');
assert(format(1, 'b', true) === '1 b true', 'non-string first argument');
assert(format('%d', '12') === '12' && format('%d', 'x') === 'NaN', '%d coerces');
assert(format('%O', [1]) === '[ 1 ]', '%O');
assert(util.format('%s', -0) === '-0', '%s of -0');
assert(format('%c%s', 'color: red', 'styled') === 'styled', '%c is consumed');
