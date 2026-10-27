assert(parseInt('42px') === 42 && parseFloat('3.5') === 3.5 && Number('7') === 7, 'parse');

// Number() of an optional value converts what it holds
function toNumber(s: string | undefined, b?: boolean): number {
  return Number(s) + (b === undefined ? 0 : Number(b));
}
assert(toNumber('41', true) === 42 && toNumber(' 8 ') === 8, 'Number(optional)');
