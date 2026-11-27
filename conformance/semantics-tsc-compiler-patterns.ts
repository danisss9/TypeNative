// Compiler patterns exercised by full TypeScript (tsc):
// generic T === undefined, nil-slice boxing, optional arr?.push, lazy-init push,
// reference-array identity across ternaries, Map expando methods (MultiMap),
// JSON.stringify of expando/narrowed structs, logical value semantics,
// enum-tagged discriminated unions, method-interface toString, and nested var scoping.

// 1. Generic T === undefined / !== undefined must not constant-fold
function toSearchResult<T>(value: T | undefined): { value: T } | undefined {
  return value !== undefined ? { value } : undefined;
}
function singleElementArray<T>(t: T | undefined): T[] | undefined {
  return t === undefined ? undefined : [t];
}
const undefStr: string | undefined = undefined;
const okStr: string | undefined = 'ok';
assert(toSearchResult(undefStr) === undefined, 'generic undefined returns undefined');
assert(toSearchResult(okStr)?.value === 'ok', 'generic defined wraps value');
const zeroNum: number | undefined = 0;
assert(toSearchResult(zeroNum)?.value === 0, 'generic 0 is defined');
assert(singleElementArray(undefStr) === undefined, 'singleElementArray(undefined) is undefined');
assert(singleElementArray(okStr)?.length === 1, 'singleElementArray("ok") has 1 element');

// 2. Nil-slice (T[] | undefined) stays falsy / undefined when boxed into any
function maybeTypeParams(has: boolean): string[] | undefined {
  return has ? ['T'] : undefined;
}
const boxedNone: any = maybeTypeParams(false);
assert(!boxedNone, 'boxed undefined array is falsy');
assert(boxedNone === undefined, 'boxed undefined array === undefined');
const boxedSome: any = maybeTypeParams(true);
assert(!!boxedSome && boxedSome.length === 1 && boxedSome[0] === 'T', 'boxed non-empty array is truthy');

// 3. Optional chaining push on nullable array (arr?.push)
function maybePush(list: string[] | undefined, val: string): void {
  list?.push(val);
}
const optUndef: string[] | undefined = undefined;
maybePush(optUndef, 'ignored');
assert(optUndef === undefined, 'optList?.push on undefined is a no-op');
const optList: string[] = ['a'];
maybePush(optList, 'b');
assert(optList.length === 2 && optList[1] === 'b', 'optList?.push on array appends in place');

// 4. Lazy-init array push ((x ??= []).push, (obj.arr ||= []).push)
let lazyArr: number[] | undefined;
(lazyArr ??= []).push(10);
(lazyArr ??= []).push(20);
assert(lazyArr !== undefined && lazyArr.length === 2 && lazyArr[1] === 20, 'lazyArr ??= [] push');
const holder: { items?: string[] } = {};
(holder.items ||= []).push('first');
(holder.items ||= []).push('second');
assert(holder.items !== undefined && holder.items.length === 2 && holder.items[1] === 'second', 'holder.items ||= [] push');

// 5. Reference-array preservation across ternary
const leftArr: number[] = [1];
const rightArr: number[] = [2];
const chosen = true ? leftArr : rightArr;
chosen.push(99);
assert(leftArr.length === 2 && leftArr[1] === 99, 'ternary preserves array reference');

// 6. Map expando methods (MultiMap pattern)
interface MultiMap<V> extends Map<string, V[]> {
  add(key: string, value: V): V[];
}
function createMultiMap<V>(): MultiMap<V> {
  const m = new Map<string, V[]>() as MultiMap<V>;
  m.add = function (this: MultiMap<V>, key: string, value: V): V[] {
    let vals = this.get(key);
    if (vals) {
      vals.push(value);
    } else {
      vals = [value];
      this.set(key, vals);
    }
    return vals;
  };
  return m;
}
const mm = createMultiMap<number>();
mm.add('k', 1);
mm.add('k', 2);
assert(!mm.has('add'), 'expando method does not enter Map keys');
assert(mm.size === 1, 'MultiMap size counts only entries');
const got = mm.get('k');
assert(got !== undefined && got.length === 2 && got[0] === 1 && got[1] === 2, 'MultiMap.add accumulates values');

// 7. JSON.stringify on dynamic-key empty object & narrowed struct views
let dynOpts: Record<string, any> | undefined;
(dynOpts ||= {})['strict'] = true;
(dynOpts ||= {})['target'] = 9;
assert(JSON.stringify(dynOpts) === '{"strict":true,"target":9}', `JSON.stringify expando object: ${JSON.stringify(dynOpts)}`);

interface BaseInfo { version: string; }
interface FullInfo extends BaseInfo { version: string; files: string[]; }
function asBase(f: FullInfo): BaseInfo { return f; }
const narrowed: BaseInfo = asBase({ version: '6.0.3', files: ['a.ts'] });
assert(JSON.stringify(narrowed) === '{"version":"6.0.3","files":["a.ts"]}', `JSON.stringify narrowed view: ${JSON.stringify(narrowed)}`);

// 8. Logical value semantics: bool || (bool | undefined) & x || undefined
function maybeBool(flag: boolean): boolean | undefined {
  return flag ? true : undefined;
}
function orUndef(s: string): string | undefined {
  return s || undefined;
}
let flagFalse = false;
const logRes: boolean | undefined = flagFalse || maybeBool(false);
assert(logRes === undefined, 'false || undefined stays undefined');
const logStr: string | undefined = orUndef('');
assert(logStr === undefined, '"" || undefined stays undefined');

// 9. Enum-tagged discriminated union object literal
const enum Tag { Alpha = 0, Beta = 1 }
type Item = { kind: Tag.Alpha; a: number } | { kind: Tag.Beta; b: string };
function makeItem(flag: boolean): Item {
  return flag ? { kind: Tag.Alpha, a: 7 } : { kind: Tag.Beta, b: 'hi' };
}
const itA = makeItem(true);
const itB = makeItem(false);
assert(itA.kind === Tag.Alpha && itA.a === 7, 'enum discriminated union Alpha');
assert(itB.kind === Tag.Beta && itB.b === 'hi', 'enum discriminated union Beta');

// 10. Method-interface toString() in string coercion
interface Printable {
  toString(): string;
}
const printable: Printable = {
  toString() { return 'custom-to-string'; },
};
assert(`${printable}` === 'custom-to-string', `method-interface template coercion: ${printable}`);

// 11. Nested var inside inner function declaration must not leak to outer function
function outerScope(): number {
  const outerVal = 42;
  function innerFn(): number {
    var innerLocal = 10;
    return innerLocal + outerVal;
  }
  return innerFn();
}
assert(outerScope() === 52, 'nested var inside inner function stays scoped');

// 12. Lazy-init push on an `any`-typed variable ((anyArr ||= []).push(...))
let dynArr: any;
(dynArr ||= []).push('x');
(dynArr ||= []).push('y');
assert(Array.isArray(dynArr) && dynArr.length === 2 && dynArr[1] === 'y', 'any-typed (x ||= []).push');

// 13. Mutating a converted struct argument passed via logical expression (a || b)
interface FlowNodeA { flags: number; antecedents?: any; }
interface FlowLabelB { flags: number; antecedents?: string[]; }
function attachAntecedent(label: FlowLabelB, tag: string): void {
  (label.antecedents ||= []).push(tag);
}
const preLabel: FlowNodeA = { flags: 1, antecedents: undefined };
const fallbackLabel: FlowLabelB = { flags: 2, antecedents: undefined };
attachAntecedent((preLabel || fallbackLabel) as FlowLabelB, 'cond');
assert(Array.isArray(preLabel.antecedents) && preLabel.antecedents.length === 1 && preLabel.antecedents[0] === 'cond', 'writeback through logical expression argument');

// 14. Map<string, number> lookups via `m && m.get(k)` and `m?.get(k)` distinguish missing vs 0
let scoreMap: Map<string, number> | undefined = new Map<string, number>();
scoreMap.set('zero', 0);
scoreMap.set('five', 5);
const missAnd = scoreMap && scoreMap.get('missing');
const zeroAnd = scoreMap && scoreMap.get('zero');
const fiveAnd = scoreMap && scoreMap.get('five');
assert(missAnd === undefined, 'm && m.get(missing) === undefined');
assert(zeroAnd === 0, 'm && m.get(zero) === 0');
assert(fiveAnd === 5, 'm && m.get(five) === 5');
const missOpt = scoreMap?.get('missing');
const zeroOpt = scoreMap?.get('zero');
assert(missOpt === undefined, 'm?.get(missing) === undefined');
assert(zeroOpt === 0, 'm?.get(zero) === 0');

// 15. Optional Date (`entry?.modifiedTime || fallback`): zero time.Time is falsy, epoch Date(0) is truthy
interface TimeCacheEntry { modifiedTime: Date; }
function resolveModTime(entry: TimeCacheEntry | undefined, fallback: Date): Date {
  return entry?.modifiedTime || fallback;
}
const epoch = new Date(0);
assert(resolveModTime(undefined, epoch).getTime() === 0, 'undefined entry?.modifiedTime || epoch returns epoch');
const later = new Date(1000);
assert(resolveModTime({ modifiedTime: later }, epoch).getTime() === 1000, 'defined entry?.modifiedTime returns entry time');

// 16. Same-field-count struct view propagates dynamic writes back to origin (FlowReduceLabel pattern)
interface FlowBase { flags: number; antecedent: any; }
interface FlowTarget { flags: number; antecedent: string[] | undefined; }
function storeTarget(t: FlowTarget): { target: any } {
  return { target: t };
}
const origFlow: FlowBase = { flags: 1, antecedent: ['try', 'catch'] };
const holderRef = storeTarget(origFlow as unknown as FlowTarget);
holderRef.target.antecedent = ['try'];
assert(Array.isArray(origFlow.antecedent) && origFlow.antecedent.length === 1 && origFlow.antecedent[0] === 'try', 'same-field-count view write reaches origin');

// 17. Passing an undefined optional method to a variadic generic wrapper preserves undefined
function maybeBindFn<T, A extends any[], R>(obj: T, fn: ((this: T, ...args: A) => R) | undefined): ((...args: A) => R) | undefined {
  return fn ? (...args: A) => fn.apply(obj, args) : undefined;
}
interface ClockHost { now?: () => number; }
const clockEmpty: ClockHost = {};
assert(maybeBindFn(clockEmpty, clockEmpty.now) === undefined, 'maybeBindFn preserves undefined optional method');
const clockLive: ClockHost = { now: () => 1234 };
const boundNow = maybeBindFn(clockLive, clockLive.now);
assert(boundNow !== undefined && boundNow() === 1234, 'maybeBindFn binds defined optional method');

// 18. Explicit trailing undefined preserves `arguments.length` (reduceLeft pattern)
function reduceWithArgs<T, U>(arr: readonly T[], fn: (acc: U, item: T) => U, initial?: U, start?: number): U {
  let pos = start ?? 0;
  let acc: any = arguments.length <= 2 ? arr[pos++] : initial;
  for (; pos < arr.length; pos++) {
    acc = fn(acc, arr[pos]);
  }
  return acc;
}
function collectTags(acc: string[] | undefined, item: string): string[] {
  const out = acc ? [...acc] : [];
  out.push(item.toUpperCase());
  return out;
}
const collected1 = reduceWithArgs(['a'], collectTags, undefined);
assert(Array.isArray(collected1) && collected1.length === 1 && collected1[0] === 'A', 'reduceLeft(1-elem, fn, undefined) sees arguments.length === 3');
const collected2 = reduceWithArgs(['a', 'b'], collectTags, undefined);
assert(Array.isArray(collected2) && collected2.length === 2 && collected2[1] === 'B', 'reduceLeft(2-elem, fn, undefined) converts slice accumulator to *[]T');

// 19. Narrowed struct view of a JSON.parse object retains extra properties (isIncrementalBuildInfo pattern)
interface BaseBuildInfo { version: string; }
interface IncBuildInfo extends BaseBuildInfo { fileNames: string[]; }
function isIncBuildInfo(info: BaseBuildInfo): info is IncBuildInfo {
  return !!(info as IncBuildInfo).fileNames;
}
const parsedBuildInfo: any = JSON.parse('{"version":"6.0.3","fileNames":["a.ts"]}');
assert(isIncBuildInfo(parsedBuildInfo as BaseBuildInfo), 'narrowed JSON-map struct view retains fileNames property');

// 20. Passing a JS Set/Map to a structural ReadonlyCollection<K> interface (keys() iterator, has(), size)
interface MyReadonlyCollection<K> {
  readonly size: number;
  has(key: K): boolean;
  keys(): IterableIterator<K>;
}
function sameKeys<K>(a: MyReadonlyCollection<K>, b: MyReadonlyCollection<K>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a.keys()) {
    if (!b.has(k)) return false;
  }
  return true;
}
const setA: any = new Set<string>(['x', 'y']);
const setB: any = new Set<string>(['y', 'x']);
const setC: any = new Set<string>(['x', 'z']);
assert(sameKeys<string>(setA as MyReadonlyCollection<string>, setB as MyReadonlyCollection<string>), 'ReadonlyCollection sameKeys true');
assert(!sameKeys<string>(setA as MyReadonlyCollection<string>, setC as MyReadonlyCollection<string>), 'ReadonlyCollection sameKeys false');

// 21. Number() / unary + on hex, binary, and octal strings (scanner.ts numeric literal normalization)
const hexStr: any = '0x7fffffff';
const binStr: any = '0b1010';
const octStr: any = '0o77';
const badHexStr: any = '0x1p2';
assert(Number(hexStr) === 2147483647, 'Number("0x7fffffff") === 2147483647');
assert(+hexStr === 2147483647, '+"0x7fffffff" === 2147483647');
assert(Number(binStr) === 10, 'Number("0b1010") === 10');
assert(Number(octStr) === 63, 'Number("0o77") === 63');
assert(Number.isNaN(Number(badHexStr)), 'Number("0x1p2") is NaN');

// 22. Numeric enum object map entries have typeof === "number" (Object.keys(SyntaxKind) reverse map)
enum SampleSyntaxKind {
  Unknown = 0,
  Identifier = 80,
  SourceFile = 308,
}
const kindReverse: Record<number, string> = {};
for (const k of Object.keys(SampleSyntaxKind)) {
  const v = (SampleSyntaxKind as any)[k];
  if (typeof v === 'number' && kindReverse[v] === undefined) {
    kindReverse[v] = k;
  }
}
assert(kindReverse[0] === 'Unknown' && kindReverse[80] === 'Identifier' && kindReverse[308] === 'SourceFile', 'enum object map entries are float64 numbers');

// 23. Expression-level struct field write-back persists lazily populated cache fields (getLineAndCharacterOfPosition(file, pos).line)
interface FakeSourceFileLike {
  readonly text: string;
  lineMap?: number[];
}
let lineMapComputeCount = 0;
function getFakeLineStarts(sf: FakeSourceFileLike): number[] {
  if (!sf.lineMap) {
    lineMapComputeCount++;
    sf.lineMap = [0, 5, 10];
  }
  return sf.lineMap;
}
function getFakeLinePos(sf: FakeSourceFileLike, pos: number): { line: number; col: number } {
  const starts = getFakeLineStarts(sf);
  return { line: starts.length, col: pos };
}
const dynFile: any = { text: 'hello\nworld\n!', kind: 308 };
const l1 = getFakeLinePos(dynFile, 1).line;
const l2 = getFakeLinePos(dynFile, 2).line;
assert(l1 === 3 && l2 === 3 && lineMapComputeCount === 1, 'chained expression call persists struct field write-back on dynamic object');

// 24. Erased generic function returning an array reference with array write-back (moduleNameResolver.ts updateResolutionField)
interface FakeResolvedCache {
  failedLookupLocations?: string[];
}
function applyResolutionLocations(r: FakeResolvedCache, fl: string[]): FakeResolvedCache {
  r.failedLookupLocations = updateResolutionFieldLike(r.failedLookupLocations, fl);
  return r;
}
function updateResolutionFieldLike<T>(to: T[] | undefined, value: T[] | undefined): T[] | undefined {
  if (!value?.length) return to;
  if (!to?.length) return value;
  to.push(...value);
  return to;
}
const resCache: FakeResolvedCache = { failedLookupLocations: ['a'] };
applyResolutionLocations(resCache, ['b', 'c']);
assert(
  resCache.failedLookupLocations?.length === 3 && resCache.failedLookupLocations.join(',') === 'a,b,c',
  'erased generic array-reference return with write-back compiles and preserves elements'
);

console.log('semantics-tsc-compiler-patterns ok');
