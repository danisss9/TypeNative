// A class method named like a string method (match) on a union-typed value;
// a callback passed through any into a typed slot; a string held as any still matches
class SelectorMatcher { match(sel: string, cb: (s: string, r: number[]) => void): boolean { cb(sel, [1, 2]); return true; } }
class OtherMatcher { match(name: string): number[] { return [name.length]; } }
type Matcher = SelectorMatcher | OtherMatcher;
class Binder {
  constructor(private directiveMatcher: Matcher) {}
  run(): number[] {
    const matched: number[] = [];
    if (this.directiveMatcher instanceof SelectorMatcher) {
      this.directiveMatcher.match('div', (_, results) => matched.push(...results));
    } else {
      matched.push(...this.directiveMatcher.match('abc'));
    }
    return matched;
  }
}
const s: any = 'a1b2';
const text = [new Binder(new SelectorMatcher()).run().join(','), new Binder(new OtherMatcher()).run().join(','), 'x9'.match(/\d/)![0], s.match(/\d/g).length].join(' ');
console.log(text);
assert(text === '1,2 3 9 2', 'match dispatch');
