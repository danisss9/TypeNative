// A switch covering every case without `default`, fallthrough out of the last
// case, and statements after a switch
function size(n: 1 | 2): number {
  switch (n) {
    case 1: return 10;
    case 2: return 20;
  }
}
function name(s: string): string {
  switch (s) {
    case 'a':
    case 'b':
      return 'ab';
    case 'c':
    default:
      return 'other';
  }
}
function tail(n: number): string {
  let r = '';
  switch (n) {
    case 1: r += 'one'; break;
    case 2: r += 'two';
  }
  return r + '.';
}
function maybe(n: number) { if (n > 0) return n; }
assert(size(1) === 10 && size(2) === 20, 'exhaustive switch');
assert(name('b') === 'ab' && name('c') === 'other' && name('z') === 'other', 'fallthrough into default');
assert(tail(2) === 'two.' && tail(1) === 'one.', 'statements after a switch');
assert(maybe(3) === 3, 'implicit return');
