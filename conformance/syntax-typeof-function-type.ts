// `typeof f` of a declared function is its function type: a record of
// functions typed that way calls them directly, destructured or not
function compose(a: number, b: string): string {
  return `${b}${a}`;
}
function empty(n: number): number {
  return n * 2;
}
interface Composers {
  compose: typeof compose;
  empty: typeof empty;
}
const composers: Composers = { compose, empty };
function run({ compose, empty }: Composers, n: number): string {
  return compose(empty(n), 'n=');
}
assert(run(composers, 4) === 'n=8', 'destructured calls');
assert(composers.compose(1, 'x') === 'x1' && composers.empty(3) === 6, 'member calls');
console.log(run(composers, 4));
