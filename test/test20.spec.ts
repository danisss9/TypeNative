// Array standard methods and method chaining
const numbers: number[] = [1, 2, 3, 4, 5];

const doubled: number[] = numbers.map((n) => n * 2);
assert(doubled[0] === 2, 'map — first element');
assert(doubled[4] === 10, 'map — last element');

const middleRange: number[] = numbers.filter((n) => n > 1 && n < 5);
assert(middleRange.length === 3, 'filter — count');
assert(middleRange[0] === 2, 'filter — first match');
assert(middleRange[2] === 4, 'filter — last match');

const hasGreaterThanFour: boolean = numbers.some((n) => n > 4);
const hasGreaterThanTen: boolean = numbers.some((n) => n > 10);
assert(hasGreaterThanFour === true, 'some — true case');
assert(hasGreaterThanTen === false, 'some — false case');

const firstGreaterThanThree: number = numbers.find((n) => n > 3) ?? 0;
const firstGreaterThanTen: number = numbers.find((n) => n > 10) ?? 0;
assert(firstGreaterThanThree === 4, 'find — found element');
assert(firstGreaterThanTen === 0, 'find — fallback when not found');

const chainedJoin: string = numbers
  .map((n) => n * 2)
  .filter((n) => n >= 6)
  .map((n) => n + 1)
  .join('-');
assert(chainedJoin === '7-9-11', 'method chaining map/filter/map/join');

const chainedSome: boolean = numbers
  .map((n) => n * 3)
  .filter((n) => n > 6)
  .some((n) => n === 12);
assert(chainedSome === true, 'method chaining ending with some');

const chainedFind: number =
  numbers
    .map((n) => n + 10)
    .filter((n) => n > 12)
    .find((n) => n > 13) ?? 0;
assert(chainedFind === 14, 'method chaining ending with find');
