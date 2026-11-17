// Type definitions for TypeNative.
//
// Scaffolded projects compile with `lib: []` and `types: ["typenative", ...]`,
// so this file is the entire standard-library type surface: only declare what
// the transpiler actually lowers (see conformance.md for the feature matrix).

interface Boolean {}

interface Function {
  readonly name: string;
  readonly length: number;
  apply(thisArg: any, argArray?: any): any;
  call(thisArg: any, ...argArray: any[]): any;
  /** `thisArg` is ignored for plain functions; the bound arguments are fixed */
  bind(thisArg: any, ...argArray: any[]): any;
}

// With strict, f.call / f.apply / f.bind are checked against f's signature
// (strictBindCallApply), as in TypeScript's own lib
interface CallableFunction extends Function {
  apply<T, R>(this: (this: T) => R, thisArg: T): R;
  apply<T, A extends any[], R>(this: (this: T, ...args: A) => R, thisArg: T, args: A): R;
  call<T, A extends any[], R>(this: (this: T, ...args: A) => R, thisArg: T, ...args: A): R;
}
interface NewableFunction extends Function {}

/** The global `Function` as a value: an opaque constructor (`x instanceof Function` checks for a function). `new Function(...)` compiles to a binary that throws if the program ever calls the result: a native binary cannot evaluate dynamic code */
interface FunctionConstructor extends Function {
  new (...args: string[]): Function;
  (...args: string[]): Function;
}
declare var Function: FunctionConstructor;

interface IArguments {
  [index: number]: any;
  length: number;
}

interface Number {
  toString(radix?: number): string;
  toFixed(fractionDigits?: number): string;
  toPrecision(precision?: number): string;
  toExponential(fractionDigits?: number): string;
  /** Formatted as Intl.NumberFormat formats it (the default locale without locales) */
  toLocaleString(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions): string;
}

type PropertyKey = string | number | symbol;

interface Object {
  constructor: Function;
  toString(): string;
  valueOf(): Object;
  hasOwnProperty(v: PropertyKey): boolean;
}

// --- Iteration protocol (also unlocks for..of / spread over Map, Set, string) ---

interface IteratorYieldResult<TYield> {
  done?: false;
  value: TYield;
}

interface IteratorReturnResult<TReturn> {
  done: true;
  value: TReturn;
}

type IteratorResult<T, TReturn = any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;

interface Iterator<T, TReturn = any, TNext = any> {
  next(...[value]: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}

interface Iterable<T, TReturn = any, TNext = undefined> {
  [Symbol.iterator](): Iterator<T, TReturn, TNext>;
}

interface IterableIterator<T, TReturn = any, TNext = undefined> extends Iterator<T, TReturn, TNext> {
  [Symbol.iterator](): IterableIterator<T, TReturn, TNext>;
}

interface Generator<T = any, TReturn = any, TNext = any> extends Iterator<T, TReturn, TNext> {
  [Symbol.iterator](): Generator<T, TReturn, TNext>;
  // ES2025 iterator helpers (lazy)
  map<U>(callbackfn: (value: T, index: number) => U): Generator<U>;
  filter(predicate: (value: T, index: number) => unknown): Generator<T>;
  flatMap<U>(callback: (value: T, index: number) => U[]): Generator<U>;
  take(limit: number): Generator<T>;
  drop(count: number): Generator<T>;
  toArray(): T[];
  forEach(callbackfn: (value: T, index: number) => void): void;
  some(predicate: (value: T, index: number) => unknown): boolean;
  every(predicate: (value: T, index: number) => unknown): boolean;
  find(predicate: (value: T, index: number) => unknown): T | undefined;
  reduce<U>(callbackfn: (accumulator: U, value: T, index: number) => U, initialValue: U): U;
  reduce(callbackfn: (accumulator: T, value: T, index: number) => T): T;
}

interface IteratorConstructor {
  /** An iterator over an array or generator (with the iterator helpers) */
  from<T>(source: T[] | Generator<T>): Generator<T>;
  /** The values of each array or generator in turn */
  concat<T>(...sources: Array<T[] | Generator<T>>): Generator<T>;
}
declare var Iterator: IteratorConstructor;

interface AsyncIterator<T, TReturn = any, TNext = any> {
  next(...[value]: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
  return?(value?: TReturn): Promise<IteratorResult<T, TReturn>>;
  throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
}

interface AsyncIterable<T, TReturn = any, TNext = undefined> {
  [Symbol.asyncIterator](): AsyncIterator<T, TReturn, TNext>;
}

interface AsyncIterableIterator<T, TReturn = any, TNext = undefined> extends AsyncIterator<T, TReturn, TNext> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T, TReturn, TNext>;
}

interface AsyncGenerator<T = any, TReturn = any, TNext = any> extends AsyncIterator<T, TReturn, TNext> {
  [Symbol.asyncIterator](): AsyncGenerator<T, TReturn, TNext>;
}

// using x = r; / [Symbol.dispose]()
interface Disposable {
  [Symbol.dispose](): void;
}

// await unwraps one thenable layer at a time (TypeScript's own definition,
// which the checker relates to T for generic T)
type Awaited<T> = T extends null | undefined
  ? T
  : T extends object & { then(onfulfilled: infer F, ...args: infer _): any }
    ? F extends (value: infer V, ...args: infer _) => any
      ? Awaited<V>
      : never
    : T;

// Tagged template functions: tag`a${x}b`
interface TemplateStringsArray {
  readonly [index: number]: string;
  readonly length: number;
  readonly raw: readonly string[];
}

// Array.from(arrayLike, mapFn)
interface ArrayLike<T> {
  length: number;
  [n: number]: T;
}

// --- Utility types (lowered to the Go type of their first argument) ---

type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof any> = { [P in keyof T as P extends K ? never : P]: T[P] };
type NonNullable<T> = T & {};
type Record<K extends keyof any, T> = { [P in K]: T };
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

// --- RegExp ---

interface RegExp {
  lastIndex: number;
  readonly source: string;
  readonly flags: string;
  readonly global: boolean;
  readonly ignoreCase: boolean;
  readonly multiline: boolean;
  readonly dotAll: boolean;
  readonly unicode: boolean;
  readonly unicodeSets: boolean;
  readonly sticky: boolean;
  readonly hasIndices: boolean;
  test(string: string): boolean;
  exec(string: string): RegExpExecArray | null;
}

// exec() result; named-group regexes carry a .groups record
interface RegExpExecArray extends Array<string> {
  index: number;
  readonly groups: Record<string, string> | undefined;
  /** /d: each group's [start, end] (undefined for a group that did not take part) */
  readonly indices?: RegExpIndicesArray;
}

interface RegExpIndicesArray extends Array<[number, number]> {}

// match() result: .index is set unless the regex is /g (that returns every match)
interface RegExpMatchArray extends Array<string> {
  index?: number;
  readonly groups?: Record<string, string> | undefined;
  readonly indices?: RegExpIndicesArray;
}

interface RegExpConstructor {
  new (pattern: string | RegExp, flags?: string): RegExp;
  (pattern: string | RegExp, flags?: string): RegExp;
  /** s escaped so that it matches itself literally inside a pattern */
  escape(s: string): string;
}

declare var RegExp: RegExpConstructor;

// --- Array ---

/** import data from './data.json' with { type: 'json' } */
interface ImportAttributes {
  [key: string]: string;
}

/** readonly T[] / ReadonlyArray<T> (mutating methods are not hidden) */
interface ReadonlyArray<T> extends Array<T> {}

interface Array<T> extends IterableIterator<T> {
  /**
   * Gets or sets the length of the array. This is a number one higher than the highest index in the array.
   */
  length: number;
  /**
   * Appends new elements to the end of an array.
   */
  push(...items: T[]): number;
  /**
   * Adds all the elements of an array into a string, separated by the specified separator string.
   */
  join(separator?: string): string;
  /** Each element's toLocaleString, joined with commas */
  toLocaleString(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
  /**
   * Returns a copy of a section of an array.
   */
  slice(start?: number, end?: number): T[];
  /**
   * Calls a defined callback function on each element of an array, and returns an array that contains the results.
   */
  map<U>(callback: (value: T, index: number, array: T[]) => U): U[];
  /**
   * Returns the elements of an array that meet the condition specified in a callback function.
   */
  filter<S extends T>(callback: (value: T, index: number, array: T[]) => value is S): S[];
  filter(callback: (value: T, index: number, array: T[]) => unknown): T[];
  /**
   * Determines whether the specified callback function returns true for any element of an array.
   */
  some(callback: (value: T, index: number, array: T[]) => unknown): boolean;
  /**
   * Returns the value of the first element in the array where callback is true, and undefined otherwise.
   */
  find<S extends T>(callback: (value: T, index: number, array: T[]) => value is S): S | undefined;
  find(callback: (value: T, index: number, array: T[]) => unknown): T | undefined;
  /**
   * Returns the index of the first element that satisfies the callback, or -1.
   */
  findIndex(callback: (value: T, index: number, array: T[]) => unknown): number;
  /**
   * Returns the value of the last element where callback is true, and undefined otherwise.
   */
  findLast(callback: (value: T, index: number, array: T[]) => unknown): T | undefined;
  /**
   * Returns the index of the last element that satisfies the callback, or -1.
   */
  findLastIndex(callback: (value: T, index: number, array: T[]) => unknown): number;
  /**
   * Determines whether all elements satisfy the callback.
   */
  every(callback: (value: T, index: number, array: T[]) => unknown): boolean;
  /**
   * Performs the callback for each element.
   */
  forEach(callback: (value: T, index: number, array: T[]) => void): void;
  /**
   * Calls the callback function on each element of the array, accumulating a result.
   */
  reduce<U>(
    callback: (accumulator: U, value: T, index: number, array: T[]) => U,
    initialValue: U
  ): U;
  reduce(callback: (accumulator: T, value: T, index: number, array: T[]) => T): T;
  /**
   * Calls the callback function on each element of the array in reverse order, accumulating a result.
   */
  reduceRight<U>(
    callback: (accumulator: U, value: T, index: number, array: T[]) => U,
    initialValue: U
  ): U;
  reduceRight(callback: (accumulator: T, value: T, index: number, array: T[]) => T): T;
  /**
   * Returns the index of the first occurrence of a value in an array, or -1 if it is not present.
   */
  indexOf(searchElement: T): number;
  /**
   * Returns the index of the last occurrence of a value in an array, or -1 if it is not present.
   */
  lastIndexOf(searchElement: T): number;
  /**
   * Determines whether an array includes a certain element.
   */
  includes(searchElement: T): boolean;
  /**
   * Removes the last element from an array and returns it.
   */
  pop(): T | undefined;
  /**
   * Removes the first element from an array and returns it.
   */
  shift(): T | undefined;
  /**
   * Inserts elements at the beginning of an array.
   */
  unshift(...items: T[]): number;
  /**
   * Reverses the elements of an array in place.
   */
  reverse(): this;
  /**
   * Returns a reversed copy of the array.
   */
  toReversed(): T[];
  /**
   * Sorts the elements of an array in place.
   */
  sort(compareFn?: (a: T, b: T) => number): this;
  /**
   * Returns a sorted copy of the array.
   */
  toSorted(compareFn?: (a: T, b: T) => number): T[];
  /**
   * Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.
   */
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  /**
   * Returns a spliced copy of the array.
   */
  toSpliced(start: number, deleteCount?: number, ...items: T[]): T[];
  /**
   * Returns a copy of the array with the element at the given index replaced.
   */
  with(index: number, value: T): T[];
  /**
   * Returns a new array formed by applying callback to each element and then flattening.
   */
  flat(depth?: number): T[];
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U[]): U[];
  /**
   * Returns a copy of a section of an array with the fill value applied.
   */
  fill(value: T, start?: number, end?: number): this;
  /**
   * Copies within the array in place (overlap-safe) and returns it.
   */
  copyWithin(target: number, start: number, end?: number): this;
  /**
   * Merges two or more arrays (array arguments are flattened one level).
   */
  concat(...items: (T | T[])[]): T[];
  /**
   * Returns the element at the given index (supports negative indices).
   */
  at(index: number): T | undefined;
  /**
   * Returns [index, value] pairs, destructured by for...of.
   */
  entries(): IterableIterator<[number, T]>;
  /**
   * Returns a string representation of an array.
   */
  toString(): string;

  [n: number]: T;
}

/** The read-only view of a Set: the same values, no mutating members used */
type ReadonlySet<T> = Set<T>;

interface ArrayConstructor {
  new <T>(length: number): T[];
  new <T>(...items: T[]): T[];
  <T>(length: number): T[];
  <T>(...items: T[]): T[];
  isArray(arg: any): arg is any[];
  from<T>(arrayLike: ArrayLike<T> | Iterable<T>): T[];
  from<T, U>(arrayLike: ArrayLike<T> | Iterable<T>, mapFn: (value: T, index: number) => U): U[];
  of<T>(...items: T[]): T[];
  /** An array of the (awaited) values of an async iterable, an iterable of promises, or an array */
  fromAsync<T>(source: AsyncIterable<T> | Iterable<T | PromiseLike<T>> | ArrayLike<T | PromiseLike<T>>): Promise<T[]>;
  fromAsync<T, U>(
    source: AsyncIterable<T> | Iterable<T> | ArrayLike<T>,
    mapFn: (value: Awaited<T>, index: number) => U
  ): Promise<Awaited<U>[]>;
  readonly prototype: any[];
}

declare var Array: ArrayConstructor;

// --- String ---

interface String {
  /** Returns the length of the string. */
  length: number;
  /** Returns the character at the specified index. */
  charAt(pos: number): string;
  /** Returns the Unicode code point at the specified index. */
  charCodeAt(pos: number): number;
  /** Returns the position of the first occurrence of a substring. */
  indexOf(searchString: string, position?: number): number;
  /** Returns the position of the last occurrence of a substring. */
  lastIndexOf(searchString: string, position?: number): number;
  /** The code point at a (code point) index; NaN past the end */
  codePointAt(pos: number): number;
  /** Deprecated: `length` characters from `from` */
  substr(from: number, length?: number): string;
  trimLeft(): string;
  trimRight(): string;
  /** Locale case mapping (tr / az / lt) through golang.org/x/text/cases */
  toLocaleUpperCase(locales?: Intl.LocalesArgument): string;
  toLocaleLowerCase(locales?: Intl.LocalesArgument): string;
  isWellFormed(): boolean;
  toWellFormed(): string;
  /** Determines whether a string contains the specified substring. */
  includes(searchString: string, position?: number): boolean;
  /** Determines whether a string begins with the specified characters. */
  startsWith(searchString: string, position?: number): boolean;
  /** Determines whether a string ends with the specified characters. */
  endsWith(searchString: string, endPosition?: number): boolean;
  /** Splits a string into substrings using the specified separator. */
  split(separator: string | RegExp, limit?: number): string[];
  /** Removes whitespace from both ends of a string. */
  trim(): string;
  /** Removes whitespace from the beginning of a string. */
  trimStart(): string;
  /** Removes whitespace from the end of a string. */
  trimEnd(): string;
  /** Converts all characters to uppercase. */
  toUpperCase(): string;
  /** Converts all characters to lowercase. */
  toLowerCase(): string;
  /** Replaces the first occurrence of a substring. */
  replace(searchValue: string | RegExp, replaceValue: string): string;
  replace(searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
  /** Replaces all occurrences of a substring. */
  replaceAll(searchValue: string, replaceValue: string): string;
  /** Returns a section of a string. */
  substring(start: number, end?: number): string;
  /** Returns a section of a string (supports negative indices). */
  slice(start: number, end?: number): string;
  /** Returns a string repeated the specified number of times. */
  repeat(count: number): string;
  /** Concatenates strings. */
  concat(...strings: string[]): string;
  /** Pads the start of a string with another string to a total length. */
  padStart(targetLength: number, padString?: string): string;
  /** Pads the end of a string with another string to a total length. */
  padEnd(targetLength: number, padString?: string): string;
  /** Matches a string against a regex and returns the matches. */
  match(regexp: string | RegExp): RegExpMatchArray | null;
  /** Matches all occurrences of a regex. */
  matchAll(regexp: string | RegExp): RegExpExecArray[];
  /** Searches for a match and returns the index. */
  search(regexp: string | RegExp): number;
  /** Returns the character at the given index (supports negative indices). */
  at(index: number): string | undefined;
  /** Compares two strings (by code unit). */
  /** Without locales or options, a light approximation of the root collation; with either, Intl.Collator */
  localeCompare(that: string, locales?: Intl.LocalesArgument, options?: Intl.CollatorOptions): number;
  /** Returns the Unicode normalization of the string. */
  normalize(form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): string;
  /** Returns a string representation. */
  toString(): string;
  /** Iterates the string's characters ([...str] spreads runes). */
  [Symbol.iterator](): IterableIterator<string>;
  [index: number]: string;
}

interface StringConstructor {
  (value?: any): string;
  fromCharCode(...charCodes: number[]): string;
  fromCodePoint(...codePoints: number[]): string;
  raw(strings: TemplateStringsArray, ...values: any[]): string;
}

declare var String: StringConstructor;

interface NumberConstructor {
  (value?: any): number;
  isNaN(value: unknown): boolean;
  isFinite(value: unknown): boolean;
  isInteger(value: unknown): boolean;
  readonly MAX_SAFE_INTEGER: number;
  readonly MIN_SAFE_INTEGER: number;
  readonly MAX_VALUE: number;
  readonly MIN_VALUE: number;
  readonly POSITIVE_INFINITY: number;
  readonly NEGATIVE_INFINITY: number;
  isSafeInteger(value: number): boolean;
  parseInt(string: string, radix?: number): number;
  parseFloat(string: string): number;
  readonly EPSILON: number;
  readonly NaN: number;
}

declare var Number: NumberConstructor;

// --- console / globals ---

interface Console {
  log(...data: any[]): void;
  info(...data: any[]): void;
  debug(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  trace(...data: any[]): void;
  dir(item?: any, options?: { depth?: number | null }): void;
  assert(condition?: boolean, ...data: any[]): void;
  count(label?: string): void;
  countReset(label?: string): void;
  table(tabularData: unknown, properties?: readonly string[]): void;
  group(...label: any[]): void;
  groupCollapsed(...label: any[]): void;
  groupEnd(): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: any[]): void;
}
declare var console: Console;

interface Math {
  readonly E: number;
  readonly LN10: number;
  readonly LN2: number;
  readonly LOG10E: number;
  readonly LOG2E: number;
  readonly PI: number;
  readonly SQRT1_2: number;
  readonly SQRT2: number;
  random(): number;
  floor(x: number): number;
  ceil(x: number): number;
  round(x: number): number;
  abs(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  sqrt(x: number): number;
  pow(base: number, exponent: number): number;
  log(x: number): number;
  log2(x: number): number;
  log10(x: number): number;
  log1p(x: number): number;
  exp(x: number): number;
  expm1(x: number): number;
  sin(x: number): number;
  cos(x: number): number;
  tan(x: number): number;
  asin(x: number): number;
  acos(x: number): number;
  atan(x: number): number;
  atan2(y: number, x: number): number;
  sinh(x: number): number;
  cosh(x: number): number;
  tanh(x: number): number;
  asinh(x: number): number;
  acosh(x: number): number;
  atanh(x: number): number;
  fround(x: number): number;
  f16round(x: number): number;
  imul(a: number, b: number): number;
  clz32(x: number): number;
  sumPrecise(values: number[]): number;
  cbrt(x: number): number;
  hypot(...values: number[]): number;
  trunc(x: number): number;
  sign(x: number): number;
}
declare var Math: Math;

declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(s: string): number;
declare function Boolean(value?: any): boolean;
declare function isNaN(number: number): boolean;
declare function isFinite(number: number): boolean;
declare function encodeURIComponent(uriComponent: string): string;
declare function decodeURIComponent(uriComponent: string): string;
declare function encodeURI(uri: string): string;
declare function decodeURI(encodedURI: string): string;
declare function structuredClone<T>(value: T, options?: { transfer?: any[] }): T;

// The running program (a native binary has no separate script file)
declare var __filename: string;
declare var __dirname: string;

declare var MessageChannel: typeof import('node:worker_threads').MessageChannel;
declare var MessagePort: typeof import('node:worker_threads').MessagePort;
declare var BroadcastChannel: typeof import('node:worker_threads').BroadcastChannel;

declare var NaN: number;
declare var Infinity: number;

// globalThis is the global scope itself: `globalThis.x` resolves the global x,
// `(globalThis as any).x` a dynamic property set.

interface ImportMeta {
  readonly url: string;
}

// Timers and microtasks. Handles are opaque; pass them to the matching clear function.
declare function setTimeout(callback: (...args: any[]) => void, ms?: number): NodeJS.Timeout;
declare function clearTimeout(id?: NodeJS.Timeout | number): void;
declare function setInterval(callback: (...args: any[]) => void, ms?: number): NodeJS.Timeout;
declare function clearInterval(id?: NodeJS.Timeout | number): void;
declare function queueMicrotask(callback: () => void): void;

// --- JSON / Object / process ---

interface JSON {
  stringify(
    value: any,
    replacer?: ((key: string, value: any) => any) | (string | number)[] | null,
    space?: number | string
  ): string;
  parse(text: string, reviver?: (key: string, value: any) => any): any;
}
declare var JSON: JSON;

interface PropertyDescriptor {
  value?: any;
  writable?: boolean;
  enumerable?: boolean;
  configurable?: boolean;
  get?(): any;
  set?(v: any): void;
}
interface PropertyDescriptorMap {
  [key: string]: PropertyDescriptor;
}

interface ObjectConstructor {
  /** Object(x) returns x (primitives are not boxed) */
  (value?: any): any;
  new (value?: any): any;
  /** A class value stands in for its prototype (Object.create(C.prototype)) */
  readonly prototype: Object;
  /** Only `Object.setPrototypeOf(this, …)` in a constructor (the Error-subclassing idiom), as a no-op */
  setPrototypeOf(o: any, proto: object | null): any;
  /** SameValue: NaN is NaN, +0 is not -0 */
  is(a: any, b: any): boolean;
  groupBy<T>(items: T[], keySelector: (item: T, index: number) => string | number): Record<string, T[]>;
  keys(obj: any): string[];
  values(obj: any): any[];
  entries(obj: any): [string, any][];
  assign(target: any, ...sources: any[]): any;
  fromEntries(entries: Iterable<readonly [string, any]>): any;
  hasOwn(obj: any, key: string): boolean;
  /** Data descriptors set the value; attributes and accessors have no effect */
  defineProperty<T>(obj: T, key: string, descriptor: PropertyDescriptor): T;
  defineProperties<T>(obj: T, descriptors: PropertyDescriptorMap): T;
  /** An instance of the prototype's class without running its constructor */
  create(proto: object | null, descriptors?: PropertyDescriptorMap): any;
  /** An instance's class (null for other values) */
  getPrototypeOf(obj: any): any;
  getOwnPropertyDescriptors<T>(obj: T): { [P in keyof T]: PropertyDescriptor } & { [key: string]: PropertyDescriptor };
  getOwnPropertyDescriptor(obj: any, key: PropertyKey): PropertyDescriptor | undefined;
  getOwnPropertySymbols(obj: any): symbol[];
  getOwnPropertyNames(obj: any): string[];
  freeze<T>(obj: T): T;
  seal<T>(obj: T): T;
  preventExtensions<T>(obj: T): T;
  isFrozen(obj: any): boolean;
  isSealed(obj: any): boolean;
  isExtensible(obj: any): boolean;
}
declare var Object: ObjectConstructor;

/** process.stdout / stderr terminal info: 0 columns and rows when not a terminal */
interface TnTtyOutput {
  readonly isTTY?: boolean;
  readonly columns: number;
  readonly rows: number;
  /** [columns, rows] */
  getWindowSize(): [number, number];
}

interface Process {
  argv: string[];
  readonly argv0: string;
  readonly execArgv: string[];
  readonly execPath: string;
  readonly platform: string;
  readonly arch: string;
  readonly pid: number;
  readonly ppid: number;
  readonly version: string;
  readonly versions: { readonly node: string; readonly [name: string]: string | undefined };
  readonly title: string;
  exitCode: number | undefined;
  env: { [key: string]: string | undefined };
  exit(code?: number): never;
  /** maybeRefable's own ref() / unref() (a timer, a socket, …) */
  ref(maybeRefable: any): void;
  unref(maybeRefable: any): void;
  /** Replaces the process (Unix; Windows throws ERR_FEATURE_UNAVAILABLE_ON_PLATFORM) */
  execve(file: string, args?: readonly string[], env?: Record<string, string>): never;
  setUncaughtExceptionCaptureCallback(fn: ((err: Error) => void) | null): void;
  /** fn takes an uncaught error when it returns true */
  addUncaughtExceptionCaptureCallback(fn: (err: Error) => boolean | void): void;
  hasUncaughtExceptionCaptureCallback(): boolean;

  cwd(): string;
  chdir(directory: string): void;
  hrtime: { (time?: [number, number]): [number, number]; bigint(): bigint };
  uptime(): number;
  memoryUsage: {
    (): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
    rss(): number;
  };
  nextTick<A extends any[]>(callback: (...args: A) => void, ...args: A): void;
  kill(pid: number, signal?: string | number): true;
  emitWarning(warning: string | Error, type?: string): void;
  getuid(): number;
  getgid(): number;
  geteuid(): number;
  getegid(): number;
  loadEnvFile(path?: string): void;
  cpuUsage(previousValue?: { user: number; system: number }): { user: number; system: number };
  resourceUsage(): {
    userCPUTime: number;
    systemCPUTime: number;
    maxRSS: number;
    sharedMemorySize: number;
    unsharedDataSize: number;
    unsharedStackSize: number;
    minorPageFault: number;
    majorPageFault: number;
    swappedOut: number;
    fsRead: number;
    fsWrite: number;
    ipcSent: number;
    ipcReceived: number;
    signalsCount: number;
    voluntaryContextSwitches: number;
    involuntaryContextSwitches: number;
  };
  availableMemory(): number;
  constrainedMemory(): number;
  on(event: 'uncaughtException' | 'uncaughtExceptionMonitor', listener: (error: Error, origin: 'uncaughtException' | 'unhandledRejection') => void): this;
  on(event: 'unhandledRejection', listener: (reason: unknown, promise: Promise<unknown>) => void): this;
  on(event: 'beforeExit', listener: (code: number) => void): this;
  readonly stdout: import('node:stream').Writable & TnTtyOutput & { readonly fd: 1 };
  readonly stderr: import('node:stream').Writable & TnTtyOutput & { readonly fd: 2 };
  readonly stdin: {
    /** After readline.emitKeypressEvents(process.stdin) */
    on(event: 'keypress', listener: (str: string, key: import('node:readline').Key) => void): import('node:stream').Readable;
    once(event: 'keypress', listener: (str: string, key: import('node:readline').Key) => void): import('node:stream').Readable;
  } & import('node:stream').Readable & {
    readonly isTTY?: boolean;
    readonly fd: 0;
    /** Whether raw mode is on */
    readonly isRaw: boolean;
    /** Raw mode (no echo, no line buffering, Ctrl+C as a byte); throws when stdin is not a terminal */
    setRawMode(mode: boolean): void;
  };
  /** The file mode creation mask; with an argument sets it and returns the previous one (0 on Windows) */
  umask(mask?: number | string): number;
  on(event: 'exit', listener: (code: number) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: 'exit', listener: (code: number) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  addListener(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  listenerCount(event: string): number;
  // IPC of forked children (child_process.fork, cluster workers)
  send?(message: any, callback?: (error: Error | null) => void): boolean;
  readonly connected: boolean;
  disconnect(): void;
}
declare var process: Process;

// --- Error / Date ---

interface Error {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

interface ErrorOptions {
  cause?: unknown;
}

interface ErrorConstructor {
  new (message?: string, options?: ErrorOptions): Error;
  (message?: string, options?: ErrorOptions): Error;
  // (V8's: accepted, without effect — there are no V8 stack frames)
  captureStackTrace(targetObject: object, constructorOpt?: Function): void;
  /** Whether value is an Error (of any kind, from any realm) */
  isError(value: unknown): value is Error;
  stackTraceLimit: number;
  prepareStackTrace?: (err: Error, stackTraces: any[]) => any;
}

declare var Error: ErrorConstructor;
// Built-in Error subclasses: TnErrors carrying their name
declare var TypeError: ErrorConstructor;
declare var RangeError: ErrorConstructor;
declare var SyntaxError: ErrorConstructor;
declare var ReferenceError: ErrorConstructor;
declare var EvalError: ErrorConstructor;
declare var URIError: ErrorConstructor;
type TypeError = Error;
type RangeError = Error;
type SyntaxError = Error;

interface AggregateError extends Error {
  errors: any[];
}

interface AggregateErrorConstructor {
  new (errors: Iterable<any>, message?: string, options?: ErrorOptions): AggregateError;
  (errors: Iterable<any>, message?: string, options?: ErrorOptions): AggregateError;
}

declare var AggregateError: AggregateErrorConstructor;

interface DOMException extends Error {
  /** The legacy numeric code of its name (AbortError: 20), else 0 */
  readonly code: number;
}

interface DOMExceptionConstructor {
  new (message?: string, options?: string | { name?: string; cause?: unknown }): DOMException;
  readonly prototype: DOMException;
}

declare var DOMException: DOMExceptionConstructor;

interface QuotaExceededError extends DOMException {
  readonly quota: number | null;
  readonly requested: number | null;
}

interface QuotaExceededErrorConstructor {
  new (message?: string, options?: { quota?: number; requested?: number }): QuotaExceededError;
  readonly prototype: QuotaExceededError;
}

declare var QuotaExceededError: QuotaExceededErrorConstructor;

interface Date {
  getTime(): number;
  valueOf(): number;
  getFullYear(): number;
  getMonth(): number;
  getDate(): number;
  getDay(): number;
  getHours(): number;
  getMinutes(): number;
  getSeconds(): number;
  getMilliseconds(): number;
  getUTCFullYear(): number;
  getUTCMonth(): number;
  getUTCDate(): number;
  getUTCDay(): number;
  getUTCHours(): number;
  getUTCMinutes(): number;
  getUTCSeconds(): number;
  getUTCMilliseconds(): number;
  toISOString(): string;
  toJSON(): string;
  toString(): string;
  toDateString(): string;
  toTimeString(): string;
  toUTCString(): string;
  toGMTString(): string;
  /** Formatted as Intl.DateTimeFormat formats it (the default locale and time zone without arguments) */
  toLocaleDateString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
  toLocaleTimeString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
  toLocaleString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
  getTimezoneOffset(): number;
  setTime(time: number): number;
  setFullYear(year: number, month?: number, date?: number): number;
  setMonth(month: number, date?: number): number;
  setDate(date: number): number;
  setHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setMinutes(min: number, sec?: number, ms?: number): number;
  setSeconds(sec: number, ms?: number): number;
  setMilliseconds(ms: number): number;
  setUTCFullYear(year: number, month?: number, date?: number): number;
  setUTCMonth(month: number, date?: number): number;
  setUTCDate(date: number): number;
  setUTCHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setUTCMinutes(min: number, sec?: number, ms?: number): number;
  setUTCSeconds(sec: number, ms?: number): number;
  setUTCMilliseconds(ms: number): number;
}

interface DateConstructor {
  new (): Date;
  new (value: number | string | Date): Date;
  new (
    year: number,
    monthIndex: number,
    date?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number
  ): Date;
  parse(s: string): number;
  now(): number;
  UTC(
    year: number,
    monthIndex: number,
    date?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number
  ): number;
}

declare var Date: DateConstructor;

// --- Promise (lowered to goroutines over channels) ---

interface Promise<T> {
  then(onfulfilled?: (value: T) => any): void;
  catch(onrejected?: (reason: any) => any): Promise<T>;
  finally(onfinally?: () => void): Promise<T>;
}

// Thenables (needed by the compiler for async callbacks passed to generic APIs)
interface PromiseLike<T> {
  then(onfulfilled?: (value: T) => any): any;
}

interface PromiseConstructor {
  new <T>(
    executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void
  ): Promise<T>;
  resolve(): Promise<void>;
  resolve<T>(value: T): Promise<T>;
  reject(reason?: any): Promise<never>;
  all<T>(values: (T | PromiseLike<T>)[]): Promise<Awaited<T>[]>;
  race<T>(values: Promise<T>[]): Promise<T>;
  any<T>(values: Promise<T>[]): Promise<T>;
  allSettled<T>(values: Promise<T>[]): Promise<{ status: string; value?: T; reason?: any }[]>;
  withResolvers<T>(): PromiseWithResolvers<T>;
  try<T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T>;
}

interface WeakRef<T extends object> {
  /** The target, or undefined once it was garbage-collected */
  deref(): T | undefined;
}
declare var WeakRef: { new <T extends object>(target: T): WeakRef<T> };

interface FinalizationRegistry<T> {
  register(target: object, heldValue: T, unregisterToken?: object): void;
  unregister(unregisterToken: object): boolean;
}
declare var FinalizationRegistry: {
  new <T>(cleanupCallback: (heldValue: T) => void): FinalizationRegistry<T>;
};

interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

declare var Promise: PromiseConstructor;

// --- Map / Set / WeakMap / WeakSet (ordered Go maps) ---

interface Map<K, V> {
  /** The number of key/value pairs in the Map. */
  readonly size: number;
  /** Adds or updates a key/value pair. */
  set(key: K, value: V): this;
  /** Returns the value for the given key, or undefined if absent. */
  get(key: K): V | undefined;
  /** The value for key, storing defaultValue first when the key is missing. */
  getOrInsert(key: K, defaultValue: V): V;
  /** The value for key, storing callbackfn(key) first when the key is missing. */
  getOrInsertComputed(key: K, callbackfn: (key: K) => V): V;
  /** Returns true if the key exists in the Map. */
  has(key: K): boolean;
  /** Removes the entry for the given key. Returns true if the entry existed. */
  delete(key: K): boolean;
  /** Removes all entries. */
  clear(): void;
  /** Performs the callback for each entry in insertion order. */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void;
  /** The keys, in insertion order. */
  keys(): K[];
  /** The values, in insertion order. */
  values(): V[];
  /** The [key, value] pairs, in insertion order. */
  entries(): [K, V][];
  /** Iterates [key, value] pairs in insertion order. */
  [Symbol.iterator](): IterableIterator<[K, V]>;
}

interface MapConstructor {
  new <K, V>(): Map<K, V>;
  new <K, V>(entries?: readonly (readonly [K, V])[] | Iterable<readonly [K, V]> | null): Map<K, V>;
  groupBy<K, T>(items: T[], keySelector: (item: T, index: number) => K): Map<K, T[]>;
}

declare var Map: MapConstructor;

interface Set<T> {
  /** The number of values in the Set. */
  readonly size: number;
  /** Inserts a value (no-op if already present). Returns the Set. */
  add(value: T): this;
  /** Returns true if the value exists in the Set. */
  has(value: T): boolean;
  /** Removes the given value. Returns true if the value existed. */
  delete(value: T): boolean;
  /** Removes all values. */
  clear(): void;
  /** Performs the callback for each value in insertion order. */
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void;
  /** The values, in insertion order. */
  values(): T[];
  union(other: Set<T>): Set<T>;
  intersection(other: Set<T>): Set<T>;
  difference(other: Set<T>): Set<T>;
  symmetricDifference(other: Set<T>): Set<T>;
  isSubsetOf(other: Set<T>): boolean;
  isSupersetOf(other: Set<T>): boolean;
  isDisjointFrom(other: Set<T>): boolean;
  /** Iterates the values in insertion order. */
  [Symbol.iterator](): IterableIterator<T>;
}

interface SetConstructor {
  new <T>(): Set<T>;
  new <T>(values?: readonly T[] | Set<T> | Iterable<T> | null): Set<T>;
}

declare var Set: SetConstructor;

// WeakMap/WeakSet lower to Map/Set with the same API; weakness is not observable.
interface WeakMap<K extends object, V> {
  set(key: K, value: V): this;
  get(key: K): V | undefined;
  getOrInsert(key: K, defaultValue: V): V;
  getOrInsertComputed(key: K, callbackfn: (key: K) => V): V;
  has(key: K): boolean;
  delete(key: K): boolean;
}

interface WeakMapConstructor {
  new <K extends object, V>(): WeakMap<K, V>;
  new <K extends object, V>(entries?: [K, V][]): WeakMap<K, V>;
}

declare var WeakMap: WeakMapConstructor;

interface WeakSet<T extends object> {
  add(value: T): this;
  has(value: T): boolean;
  delete(value: T): boolean;
}

interface WeakSetConstructor {
  new <T extends object>(): WeakSet<T>;
  new <T extends object>(values?: T[]): WeakSet<T>;
}

declare var WeakSet: WeakSetConstructor;

// --- Symbol ---

interface SymbolConstructor {
  (description?: string | number): symbol;
  readonly iterator: unique symbol;
  readonly asyncIterator: unique symbol;
  readonly dispose: unique symbol;
  readonly asyncDispose: unique symbol;
  /** A class's [Symbol.toPrimitive](hint) converts its instances (String(x), +x, `${x}`) */
  readonly toPrimitive: unique symbol;
  /** A class's [Symbol.toStringTag] getter names it in Object.prototype.toString */
  readonly toStringTag: unique symbol;
  /** A class's static [Symbol.hasInstance](x) decides x instanceof C */
  readonly hasInstance: unique symbol;
  for(key: string): symbol;
  keyFor(sym: symbol): string | undefined;
}

declare var Symbol: SymbolConstructor;

interface Symbol {
  readonly description: string;
}

// --- Decorators (class and class-method decorators are lowered) ---

interface ClassDecoratorContext<Class extends abstract new (...args: any) => any = abstract new (...args: any) => any> {
  readonly kind: 'class';
  readonly name: string | undefined;
  addInitializer(initializer: (this: Class) => void): void;
}

interface ClassMethodDecoratorContext<
  This = unknown,
  Value extends (this: This, ...args: any) => any = (this: This, ...args: any) => any,
> {
  readonly kind: 'method';
  readonly name: string | symbol;
  readonly static: boolean;
  readonly private: boolean;
  readonly access: {
    has(object: This): boolean;
    get(object: This): Value;
  };
  addInitializer(initializer: (this: This) => void): void;
}

// bigint values (*big.Int): toString(radix)
interface BigInt {
  toString(radix?: number): string;
  toLocaleString(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions): string;
}

interface BigIntConstructor {
  (value: bigint | boolean | number | string): bigint;
  asIntN(bits: number, int: bigint): bigint;
  asUintN(bits: number, int: bigint): bigint;
}

declare var BigInt: BigIntConstructor;

// --- Node.js globals (Buffer, URL, TextEncoder, AbortController, performance, …) ---

type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

// Byte arrays: Uint8Array and Buffer are Go []byte (slices share memory)
interface Uint8Array {
  readonly length: number;
  readonly byteLength: number;
  readonly byteOffset: number;
  readonly buffer: ArrayBuffer;
  [index: number]: number;
  subarray(start?: number, end?: number): Uint8Array;
  slice(start?: number, end?: number): Uint8Array;
  set(array: ArrayLike<number>, offset?: number): void;
  at(index: number): number | undefined;
  /** Base64 of the bytes (ES2026) */
  toBase64(options?: { alphabet?: 'base64' | 'base64url'; omitPadding?: boolean }): string;
  /** Hex of the bytes (ES2026) */
  toHex(): string;
  /** Decodes base64 into this array: the characters read and bytes written */
  setFromBase64(
    string: string,
    options?: { alphabet?: 'base64' | 'base64url'; lastChunkHandling?: 'loose' | 'strict' | 'stop-before-partial' }
  ): { read: number; written: number };
  /** Decodes hex into this array: the characters read and bytes written */
  setFromHex(string: string): { read: number; written: number };
  [Symbol.iterator](): IterableIterator<number>;
}

interface Uint8ArrayConstructor {
  new (length: number): Uint8Array;
  new (array: ArrayLike<number> | Uint8Array): Uint8Array;
  // A view sharing the buffer's memory
  new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): Uint8Array;
  from(arrayLike: ArrayLike<number> | Iterable<number>): Uint8Array;
  /** The bytes a base64 string encodes (ES2026; a SyntaxError on bad input) */
  fromBase64(
    base64: string,
    options?: { alphabet?: 'base64' | 'base64url'; lastChunkHandling?: 'loose' | 'strict' | 'stop-before-partial' }
  ): Uint8Array;
  /** The bytes a hex string encodes (ES2026) */
  fromHex(hex: string): Uint8Array;
}

declare var Uint8Array: Uint8ArrayConstructor;

// An ArrayBuffer is Go []byte too; .buffer of a Uint8Array is its own bytes
// (byteOffset 0), so new Float32Array(u8.buffer, u8.byteOffset, n) works.
// Resizable and detached buffers keep their state beside the bytes.
interface ArrayBuffer {
  readonly byteLength: number;
  /** The most a resizable buffer can grow to (byteLength otherwise; 0 once detached) */
  readonly maxByteLength: number;
  readonly resizable: boolean;
  /** Whether transfer() moved its bytes out */
  readonly detached: boolean;
  slice(begin?: number, end?: number): ArrayBuffer;
  /** A resizable buffer's new length (new bytes read 0; typed arrays and DataViews follow, Uint8Arrays don't) */
  resize(newLength: number): void;
  /** The bytes (resized to newLength, zero-filled) in a new buffer, resizable as this one is; this one is detached */
  transfer(newLength?: number): ArrayBuffer;
  /** transfer() into a fixed-length buffer */
  transferToFixedLength(newLength?: number): ArrayBuffer;
}

interface ArrayBufferConstructor {
  new (byteLength: number, options?: { maxByteLength?: number }): ArrayBuffer;
  isView(arg: any): boolean;
}

declare var ArrayBuffer: ArrayBufferConstructor;

// A SharedArrayBuffer is an ArrayBuffer here (workers are processes: nothing
// is shared); { maxByteLength } makes it growable
interface SharedArrayBuffer {
  readonly byteLength: number;
  readonly maxByteLength: number;
  readonly growable: boolean;
  slice(begin?: number, end?: number): SharedArrayBuffer;
  /** A growable buffer's new length (it can't shrink) */
  grow(newLength: number): void;
}

interface SharedArrayBufferConstructor {
  new (byteLength: number, options?: { maxByteLength?: number }): SharedArrayBuffer;
}

declare var SharedArrayBuffer: SharedArrayBufferConstructor;

type ArrayBufferLike = ArrayBuffer | SharedArrayBuffer;

// Typed arrays other than Uint8Array: Go slices of the element type; views
// made on an ArrayBuffer share its memory
interface TypedArray<Self> {
  readonly length: number;
  readonly byteLength: number;
  readonly byteOffset: number;
  readonly BYTES_PER_ELEMENT: number;
  readonly buffer: ArrayBuffer;
  [index: number]: number;
  fill(value: number, start?: number, end?: number): Self;
  set(array: ArrayLike<number> | TypedArray<any>, offset?: number): void;
  subarray(begin?: number, end?: number): Self;
  slice(start?: number, end?: number): Self;
  at(index: number): number | undefined;
  indexOf(searchElement: number, fromIndex?: number): number;
  lastIndexOf(searchElement: number, fromIndex?: number): number;
  includes(searchElement: number, fromIndex?: number): boolean;
  join(separator?: string): string;
  reverse(): Self;
  toReversed(): Self;
  sort(compareFn?: (a: number, b: number) => number): Self;
  toSorted(compareFn?: (a: number, b: number) => number): Self;
  with(index: number, value: number): Self;
  copyWithin(target: number, start: number, end?: number): Self;
  map(callbackfn: (value: number, index: number, array: Self) => number): Self;
  filter(predicate: (value: number, index: number, array: Self) => unknown): Self;
  forEach(callbackfn: (value: number, index: number, array: Self) => void): void;
  some(predicate: (value: number, index: number, array: Self) => unknown): boolean;
  every(predicate: (value: number, index: number, array: Self) => unknown): boolean;
  find(predicate: (value: number, index: number, array: Self) => unknown): number | undefined;
  findIndex(predicate: (value: number, index: number, array: Self) => unknown): number;
  findLast(predicate: (value: number, index: number, array: Self) => unknown): number | undefined;
  findLastIndex(predicate: (value: number, index: number, array: Self) => unknown): number;
  reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: Self) => number): number;
  reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: Self) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: Self) => number): number;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: Self) => U, initialValue: U): U;
  keys(): IterableIterator<number>;
  values(): IterableIterator<number>;
  entries(): IterableIterator<[number, number]>;
  toString(): string;
  toLocaleString(): string;
  [Symbol.iterator](): IterableIterator<number>;
}

interface TypedArrayConstructor<T> {
  new (length?: number): T;
  new (array: ArrayLike<number> | Iterable<number> | TypedArray<any>): T;
  new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
  from(arrayLike: ArrayLike<number> | Iterable<number> | TypedArray<any>, mapfn?: (v: number, k: number) => number): T;
  of(...items: number[]): T;
  readonly BYTES_PER_ELEMENT: number;
}

interface Int8Array extends TypedArray<Int8Array> {}
declare var Int8Array: TypedArrayConstructor<Int8Array>;
interface Uint8ClampedArray extends TypedArray<Uint8ClampedArray> {}
declare var Uint8ClampedArray: TypedArrayConstructor<Uint8ClampedArray>;
interface Int16Array extends TypedArray<Int16Array> {}
declare var Int16Array: TypedArrayConstructor<Int16Array>;
interface Uint16Array extends TypedArray<Uint16Array> {}
declare var Uint16Array: TypedArrayConstructor<Uint16Array>;
interface Int32Array extends TypedArray<Int32Array> {}
declare var Int32Array: TypedArrayConstructor<Int32Array>;
interface Uint32Array extends TypedArray<Uint32Array> {}
declare var Uint32Array: TypedArrayConstructor<Uint32Array>;
interface Float32Array extends TypedArray<Float32Array> {}
declare var Float32Array: TypedArrayConstructor<Float32Array>;
interface Float64Array extends TypedArray<Float64Array> {}
declare var Float64Array: TypedArrayConstructor<Float64Array>;
/** Elements stored as IEEE 754 binary16 (ES2025) */
interface Float16Array extends TypedArray<Float16Array> {}
declare var Float16Array: TypedArrayConstructor<Float16Array>;

// 64-bit integer arrays whose elements are bigints (writes wrap modulo 2^64)
interface BigIntTypedArray<Self> {
  readonly length: number;
  readonly byteLength: number;
  readonly byteOffset: number;
  readonly BYTES_PER_ELEMENT: number;
  readonly buffer: ArrayBuffer;
  [index: number]: bigint;
  fill(value: bigint, start?: number, end?: number): Self;
  set(array: ArrayLike<bigint> | Self, offset?: number): void;
  subarray(begin?: number, end?: number): Self;
  slice(start?: number, end?: number): Self;
  at(index: number): bigint | undefined;
  indexOf(searchElement: bigint, fromIndex?: number): number;
  includes(searchElement: bigint, fromIndex?: number): boolean;
  join(separator?: string): string;
  reverse(): Self;
  keys(): IterableIterator<number>;
  values(): IterableIterator<bigint>;
  toString(): string;
  [Symbol.iterator](): IterableIterator<bigint>;
}

interface BigIntTypedArrayConstructor<T> {
  new (length?: number): T;
  new (array: ArrayLike<bigint> | Iterable<bigint>): T;
  new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
  from(arrayLike: ArrayLike<bigint> | Iterable<bigint>): T;
  of(...items: bigint[]): T;
  readonly BYTES_PER_ELEMENT: number;
}

interface BigInt64Array extends BigIntTypedArray<BigInt64Array> {}
declare var BigInt64Array: BigIntTypedArrayConstructor<BigInt64Array>;
interface BigUint64Array extends BigIntTypedArray<BigUint64Array> {}
declare var BigUint64Array: BigIntTypedArrayConstructor<BigUint64Array>;

// Typed reads and writes at byte offsets of an ArrayBuffer (big-endian
// unless littleEndian is true)
interface DataView {
  readonly buffer: ArrayBuffer;
  readonly byteOffset: number;
  readonly byteLength: number;
  getInt8(byteOffset: number): number;
  getUint8(byteOffset: number): number;
  getInt16(byteOffset: number, littleEndian?: boolean): number;
  getUint16(byteOffset: number, littleEndian?: boolean): number;
  getInt32(byteOffset: number, littleEndian?: boolean): number;
  getUint32(byteOffset: number, littleEndian?: boolean): number;
  getFloat16(byteOffset: number, littleEndian?: boolean): number;
  getFloat32(byteOffset: number, littleEndian?: boolean): number;
  getFloat64(byteOffset: number, littleEndian?: boolean): number;
  getBigInt64(byteOffset: number, littleEndian?: boolean): bigint;
  getBigUint64(byteOffset: number, littleEndian?: boolean): bigint;
  setInt8(byteOffset: number, value: number): void;
  setUint8(byteOffset: number, value: number): void;
  setInt16(byteOffset: number, value: number, littleEndian?: boolean): void;
  setUint16(byteOffset: number, value: number, littleEndian?: boolean): void;
  setInt32(byteOffset: number, value: number, littleEndian?: boolean): void;
  setUint32(byteOffset: number, value: number, littleEndian?: boolean): void;
  setFloat16(byteOffset: number, value: number, littleEndian?: boolean): void;
  setFloat32(byteOffset: number, value: number, littleEndian?: boolean): void;
  setFloat64(byteOffset: number, value: number, littleEndian?: boolean): void;
  setBigInt64(byteOffset: number, value: bigint, littleEndian?: boolean): void;
  setBigUint64(byteOffset: number, value: bigint, littleEndian?: boolean): void;
}

declare var DataView: {
  new (buffer: ArrayBufferLike, byteOffset?: number, byteLength?: number): DataView;
};

interface Buffer extends Uint8Array {
  toString(encoding?: BufferEncoding, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array): number;
  subarray(start?: number, end?: number): Buffer;
  slice(start?: number, end?: number): Buffer;
  indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
  /** (Node 26: an end bounds the search) */
  indexOf(value: string | number | Uint8Array, byteOffset: number, end: number, encoding?: BufferEncoding): number;
  lastIndexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
  includes(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): boolean;
  includes(value: string | number | Uint8Array, byteOffset: number, end: number, encoding?: BufferEncoding): boolean;
  fill(value: string | number | Uint8Array, offset?: number, end?: number): this;
  fill(value: string, encoding: BufferEncoding): this;
  write(string: string, offset?: number, length?: number, encoding?: BufferEncoding): number;
  write(string: string, encoding: BufferEncoding): number;
  copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  readUInt8(offset?: number): number;
  readUint8(offset?: number): number;
  readUInt16LE(offset?: number): number;
  readUint16LE(offset?: number): number;
  readUInt16BE(offset?: number): number;
  readUint16BE(offset?: number): number;
  readUInt32LE(offset?: number): number;
  readUint32LE(offset?: number): number;
  readUInt32BE(offset?: number): number;
  readUint32BE(offset?: number): number;
  readInt8(offset?: number): number;
  readInt16LE(offset?: number): number;
  readInt16BE(offset?: number): number;
  readInt32LE(offset?: number): number;
  readInt32BE(offset?: number): number;
  readFloatLE(offset?: number): number;
  readFloatBE(offset?: number): number;
  readDoubleLE(offset?: number): number;
  readDoubleBE(offset?: number): number;
  writeUInt8(value: number, offset?: number): number;
  writeUint8(value: number, offset?: number): number;
  writeUInt16LE(value: number, offset?: number): number;
  writeUint16LE(value: number, offset?: number): number;
  writeUInt16BE(value: number, offset?: number): number;
  writeUint16BE(value: number, offset?: number): number;
  writeUInt32LE(value: number, offset?: number): number;
  writeUint32LE(value: number, offset?: number): number;
  writeUInt32BE(value: number, offset?: number): number;
  writeUint32BE(value: number, offset?: number): number;
  writeInt8(value: number, offset?: number): number;
  writeInt16LE(value: number, offset?: number): number;
  writeInt16BE(value: number, offset?: number): number;
  writeInt32LE(value: number, offset?: number): number;
  writeInt32BE(value: number, offset?: number): number;
  writeFloatLE(value: number, offset?: number): number;
  writeFloatBE(value: number, offset?: number): number;
  writeDoubleLE(value: number, offset?: number): number;
  writeDoubleBE(value: number, offset?: number): number;
  readBigInt64LE(offset?: number): bigint;
  readBigInt64BE(offset?: number): bigint;
  readBigUInt64LE(offset?: number): bigint;
  readBigUInt64BE(offset?: number): bigint;
  readBigUint64LE(offset?: number): bigint;
  readBigUint64BE(offset?: number): bigint;
  writeBigInt64LE(value: bigint, offset?: number): number;
  writeBigInt64BE(value: bigint, offset?: number): number;
  writeBigUInt64LE(value: bigint, offset?: number): number;
  writeBigUInt64BE(value: bigint, offset?: number): number;
  writeBigUint64LE(value: bigint, offset?: number): number;
  writeBigUint64BE(value: bigint, offset?: number): number;
  swap16(): Buffer;
  swap32(): Buffer;
  swap64(): Buffer;
}

interface BufferConstructor {
  /** @deprecated use Buffer.alloc / Buffer.from (lets `typeof Buffer === 'function'` narrow) */
  new (size: number): Buffer;
  from(data: string, encoding?: BufferEncoding): Buffer;
  from(data: ArrayLike<number> | Uint8Array | ArrayBuffer): Buffer;
  alloc(size: number, fill?: string | number | Uint8Array, encoding?: BufferEncoding): Buffer;
  /** (alignment: Node 26; Go allocations are already 8-byte aligned) */
  allocUnsafe(size: number, alignment?: number): Buffer;
  allocUnsafeSlow(size: number, alignment?: number): Buffer;
  /** The length of the string the bytes decode to (Node 26) */
  stringLength(input: Uint8Array | ArrayBuffer, encoding?: BufferEncoding): number;
  /** The size of Node's internal pool (64 KiB in Node 26) */
  readonly poolSize: number;
  concat(list: readonly Uint8Array[], totalLength?: number): Buffer;
  byteLength(string: string | Uint8Array, encoding?: BufferEncoding): number;
  isBuffer(obj: any): obj is Buffer;
  isEncoding(encoding: string): encoding is BufferEncoding;
  compare(buf1: Uint8Array, buf2: Uint8Array): -1 | 0 | 1;
}

declare var Buffer: BufferConstructor;

declare function atob(data: string): string;
declare function btoa(data: string): string;

interface TextEncoder {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
}
declare var TextEncoder: { new (): TextEncoder };

interface TextDecoder {
  readonly encoding: string;
  decode(input?: Uint8Array | ArrayBufferLike, options?: { stream?: boolean }): string;
}
declare var TextDecoder: { new (label?: string): TextDecoder };

interface URLSearchParams extends Iterable<[string, string]> {
  readonly size: number;
  append(name: string, value: string): void;
  delete(name: string, value?: string): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string, value?: string): boolean;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  forEach(callback: (value: string, key: string, parent: URLSearchParams) => void): void;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  entries(): IterableIterator<[string, string]>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
declare var URLSearchParams: {
  new (init?: string | Record<string, string> | readonly (readonly [string, string])[] | URLSearchParams): URLSearchParams;
};

interface URL {
  href: string;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  readonly origin: string;
  readonly searchParams: URLSearchParams;
  toString(): string;
  toJSON(): string;
}
declare var URL: {
  new (input: string | URL, base?: string | URL): URL;
  canParse(input: string, base?: string): boolean;
  parse(input: string, base?: string): URL | null;
};

type URLPatternInput = string | URLPatternInit;

interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

interface URLPatternOptions {
  ignoreCase?: boolean;
}

interface URLPatternResult {
  inputs: URLPatternInput[];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

interface URLPattern {
  readonly hasRegExpGroups: boolean;
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  exec(input?: URLPatternInput, baseURL?: string | URL): URLPatternResult | null;
  test(input?: URLPatternInput, baseURL?: string | URL): boolean;
}

declare var URLPattern: {
  new (input?: URLPatternInput, baseURL?: string | URL, options?: URLPatternOptions): URLPattern;
  new (input?: URLPatternInput, options?: URLPatternOptions): URLPattern;
};

interface Event {
  readonly type: string;
  readonly defaultPrevented: boolean;
  readonly target: any;
  readonly timeStamp: number;
  preventDefault(): void;
}
declare var Event: { new (type: string, options?: { cancelable?: boolean }): Event };

interface CustomEvent<T = any> extends Event {
  readonly detail: T;
}
declare var CustomEvent: { new <T = any>(type: string, options?: { detail?: T; cancelable?: boolean }): CustomEvent<T> };

interface ErrorEvent extends Event {
  readonly message: string;
  readonly filename: string;
  readonly lineno: number;
  readonly colno: number;
  readonly error: any;
}
declare var ErrorEvent: {
  new (type: string, options?: { message?: string; filename?: string; lineno?: number; colno?: number; error?: any; cancelable?: boolean }): ErrorEvent;
};

interface Navigator {
  readonly hardwareConcurrency: number;
  /** The OS locale (LANG / LC_ALL), en-US by default */
  readonly language: string;
  readonly languages: readonly string[];
  readonly platform: string;
  readonly userAgent: string;
}
declare var navigator: Navigator;

interface Storage {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
}
declare var Storage: { prototype: Storage };
/** In memory, for the life of the process */
declare var sessionStorage: Storage;
/** Persisted to the file TN_LOCALSTORAGE_FILE names (Node: --localstorage-file); undefined without one */
declare var localStorage: Storage | undefined;

interface EventTarget {
  addEventListener(type: string, listener: (event: Event) => void, options?: { once?: boolean }): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  dispatchEvent(event: Event): boolean;
}
declare var EventTarget: { new (): EventTarget };

interface AbortSignal extends EventTarget {
  readonly aborted: boolean;
  readonly reason: any;
  onabort: ((event: Event) => void) | null;
  throwIfAborted(): void;
}
declare var AbortSignal: {
  abort(reason?: any): AbortSignal;
  timeout(milliseconds: number): AbortSignal;
  any(signals: AbortSignal[]): AbortSignal;
};

interface AbortController {
  readonly signal: AbortSignal;
  abort(reason?: any): void;
}
declare var AbortController: { new (): AbortController };

interface PerformanceEntry {
  readonly name: string;
  readonly entryType: string;
  readonly startTime: number;
  readonly duration: number;
  readonly detail?: any;
}
interface PerformanceObserverEntryList {
  getEntries(): PerformanceEntry[];
  getEntriesByName(name: string, type?: string): PerformanceEntry[];
  getEntriesByType(type: string): PerformanceEntry[];
}
interface PerformanceObserver {
  observe(options: { entryTypes: readonly string[] } | { type: string; buffered?: boolean }): void;
  disconnect(): void;
  takeRecords(): PerformanceEntry[];
}
declare var PerformanceObserver: {
  new (callback: (list: PerformanceObserverEntryList, observer: PerformanceObserver) => void): PerformanceObserver;
  readonly supportedEntryTypes: readonly string[];
};
interface Performance {
  timerify<T extends (...params: any[]) => any>(fn: T): T;
  eventLoopUtilization(previous?: { idle: number; active: number; utilization: number }): { idle: number; active: number; utilization: number };
  readonly timeOrigin: number;
  now(): number;
  mark(name: string, options?: { startTime?: number; detail?: any }): PerformanceEntry;
  measure(name: string, startMark?: string, endMark?: string): PerformanceEntry;
  measure(name: string, options: { start?: string; end?: string }): PerformanceEntry;
  getEntries(): PerformanceEntry[];
  getEntriesByName(name: string, type?: string): PerformanceEntry[];
  getEntriesByType(type: string): PerformanceEntry[];
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
}
declare var performance: Performance;

declare var crypto: {
  randomUUID(): string;
  getRandomValues<T extends Uint8Array>(array: T): T;
  readonly subtle: import('node:crypto').webcrypto.SubtleCrypto;
};
type CryptoKey = import('node:crypto').webcrypto.CryptoKey;

// --- Web streams (node:stream/web globals) ---

interface ReadableStreamReadResult<R> {
  done: boolean;
  value: R;
}
interface ReadableStreamDefaultController<R = any> {
  readonly desiredSize: number | null;
  enqueue(chunk?: R): void;
  close(): void;
  error(e?: any): void;
}
interface UnderlyingSource<R = any> {
  type?: 'bytes';
  start?(controller: ReadableStreamDefaultController<R>): any;
  pull?(controller: ReadableStreamDefaultController<R>): void | PromiseLike<void>;
  cancel?(reason?: any): void | PromiseLike<void>;
}
/** A byte stream's controller: enqueue bytes, or fill the waiting BYOB read's view */
interface ReadableByteStreamController {
  readonly byobRequest: ReadableStreamBYOBRequest | null;
  readonly desiredSize: number | null;
  enqueue(chunk: Uint8Array): void;
  close(): void;
  error(e?: any): void;
}
interface ReadableStreamBYOBRequest {
  /** The unfilled part of the reader's view */
  readonly view: Uint8Array | null;
  respond(bytesWritten: number): void;
  respondWithNewView(view: Uint8Array): void;
}
interface UnderlyingByteSource {
  type: 'bytes';
  autoAllocateChunkSize?: number;
  start?(controller: ReadableByteStreamController): any;
  pull?(controller: ReadableByteStreamController): void | PromiseLike<void>;
  cancel?(reason?: any): void | PromiseLike<void>;
}
/** getReader({ mode: 'byob' }): reads fill the caller's view */
interface ReadableStreamBYOBReader {
  readonly closed: Promise<void>;
  read<T extends Uint8Array>(view: T, options?: { min?: number }): Promise<ReadableStreamReadResult<T>>;
  releaseLock(): void;
  cancel(reason?: any): Promise<void>;
}
interface QueuingStrategy<T = any> {
  highWaterMark?: number;
  size?(chunk: T): number;
}
interface ReadableStreamDefaultReader<R = any> {
  readonly closed: Promise<void>;
  read(): Promise<ReadableStreamReadResult<R>>;
  releaseLock(): void;
  cancel(reason?: any): Promise<void>;
}
interface StreamPipeOptions {
  preventAbort?: boolean;
  preventCancel?: boolean;
  preventClose?: boolean;
  signal?: AbortSignal;
}
interface ReadableWritablePair<R = any, W = any> {
  readable: ReadableStream<R>;
  writable: WritableStream<W>;
}
interface ReadableStream<R = any> extends AsyncIterable<R> {
  readonly locked: boolean;
  getReader(options: { mode: 'byob' }): ReadableStreamBYOBReader;
  getReader(options?: { mode?: undefined }): ReadableStreamDefaultReader<R>;
  cancel(reason?: any): Promise<void>;
  tee(): [ReadableStream<R>, ReadableStream<R>];
  pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
  pipeThrough<T>(transform: ReadableWritablePair<T, R>, options?: StreamPipeOptions): ReadableStream<T>;
  values(options?: { preventCancel?: boolean }): AsyncIterableIterator<R>;
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}
declare var ReadableStream: {
  new (underlyingSource: UnderlyingByteSource, strategy?: { highWaterMark?: number }): ReadableStream<Uint8Array>;
  new <R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
  from<T>(iterable: Iterable<T> | AsyncIterable<T>): ReadableStream<T>;
};
declare var ReadableStreamDefaultReader: { new <R = any>(stream: ReadableStream<R>): ReadableStreamDefaultReader<R> };
declare var ReadableStreamBYOBReader: { new (stream: ReadableStream<Uint8Array>): ReadableStreamBYOBReader };

interface WritableStreamDefaultController {
  readonly signal: AbortSignal;
  error(e?: any): void;
}
interface UnderlyingSink<W = any> {
  start?(controller: WritableStreamDefaultController): any;
  write?(chunk: W, controller: WritableStreamDefaultController): void | PromiseLike<void>;
  close?(): void | PromiseLike<void>;
  abort?(reason?: any): void | PromiseLike<void>;
}
interface WritableStreamDefaultWriter<W = any> {
  readonly closed: Promise<void>;
  readonly ready: Promise<void>;
  readonly desiredSize: number | null;
  write(chunk?: W): Promise<void>;
  close(): Promise<void>;
  abort(reason?: any): Promise<void>;
  releaseLock(): void;
}
interface WritableStream<W = any> {
  readonly locked: boolean;
  getWriter(): WritableStreamDefaultWriter<W>;
  close(): Promise<void>;
  abort(reason?: any): Promise<void>;
}
declare var WritableStream: { new <W = any>(underlyingSink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>): WritableStream<W> };
declare var WritableStreamDefaultWriter: { new <W = any>(stream: WritableStream<W>): WritableStreamDefaultWriter<W> };

interface TransformStreamDefaultController<O = any> {
  readonly desiredSize: number | null;
  enqueue(chunk?: O): void;
  error(reason?: any): void;
  terminate(): void;
}
interface Transformer<I = any, O = any> {
  start?(controller: TransformStreamDefaultController<O>): any;
  transform?(chunk: I, controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
  flush?(controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
  cancel?(reason?: any): void | PromiseLike<void>;
}
interface TransformStream<I = any, O = any> {
  readonly readable: ReadableStream<O>;
  readonly writable: WritableStream<I>;
}
declare var TransformStream: {
  new <I = any, O = any>(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>): TransformStream<I, O>;
};

interface TextEncoderStream extends TransformStream<string, Uint8Array> {
  readonly encoding: 'utf-8';
}
declare var TextEncoderStream: { new (): TextEncoderStream };
interface TextDecoderStream extends TransformStream<Uint8Array, string> {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
}
declare var TextDecoderStream: { new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }): TextDecoderStream };
type CompressionFormat = 'deflate' | 'deflate-raw' | 'gzip';
interface CompressionStream extends TransformStream<Uint8Array, Uint8Array> {}
declare var CompressionStream: { new (format: CompressionFormat): CompressionStream };
interface DecompressionStream extends TransformStream<Uint8Array, Uint8Array> {}
declare var DecompressionStream: { new (format: CompressionFormat): DecompressionStream };

interface CountQueuingStrategy extends QueuingStrategy {
  readonly highWaterMark: number;
  size(chunk?: any): 1;
}
declare var CountQueuingStrategy: { new (init: { highWaterMark: number }): CountQueuingStrategy };
interface ByteLengthQueuingStrategy extends QueuingStrategy<Uint8Array> {
  readonly highWaterMark: number;
  size(chunk: Uint8Array): number;
}
declare var ByteLengthQueuingStrategy: { new (init: { highWaterMark: number }): ByteLengthQueuingStrategy };

// --- Blob / File / FormData ---

type BlobPart = string | Uint8Array | Blob;
interface Blob {
  readonly size: number;
  readonly type: string;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
  arrayBuffer(): Promise<Uint8Array>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): ReadableStream<Uint8Array>;
  /** The bytes as a stream of UTF-8 text chunks */
  textStream(): ReadableStream<string>;
}
declare var Blob: { new (blobParts?: BlobPart[], options?: { type?: string }): Blob };
interface File extends Blob {
  readonly name: string;
  readonly lastModified: number;
}
declare var File: { new (fileBits: BlobPart[], fileName: string, options?: { type?: string; lastModified?: number }): File };

type FormDataEntryValue = string | File;
interface FormData extends Iterable<[string, FormDataEntryValue]> {
  append(name: string, value: string | Blob, fileName?: string): void;
  set(name: string, value: string | Blob, fileName?: string): void;
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
  has(name: string): boolean;
  delete(name: string): void;
  entries(): [string, FormDataEntryValue][];
  keys(): string[];
  values(): FormDataEntryValue[];
  forEach(callback: (value: FormDataEntryValue, key: string, parent: FormData) => void): void;
  [Symbol.iterator](): Iterator<[string, FormDataEntryValue]>;
}
declare var FormData: { new (): FormData };

// --- fetch (WHATWG Fetch API, as in Node) ---

type HeadersInit = Headers | Record<string, string> | [string, string][];
interface Headers {
  get(name: string): string | null;
  getSetCookie(): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  append(name: string, value: string): void;
  delete(name: string): void;
  entries(): [string, string][];
  keys(): string[];
  values(): string[];
  forEach(callback: (value: string, key: string, parent: Headers) => void): void;
  [Symbol.iterator](): Iterator<[string, string]>;
}
declare var Headers: { new (init?: HeadersInit): Headers };

type BodyInit = string | Uint8Array | URLSearchParams | Blob | FormData | ReadableStream<Uint8Array | string>;
interface Body {
  readonly body: ReadableStream<Uint8Array> | null;
  readonly bodyUsed: boolean;
  text(): Promise<string>;
  json(): Promise<any>;
  bytes(): Promise<Uint8Array>;
  arrayBuffer(): Promise<Uint8Array>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
}
interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  redirect?: 'follow' | 'manual' | 'error';
  signal?: AbortSignal | null;
  duplex?: 'half';
}
interface Request extends Body {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly redirect: 'follow' | 'manual' | 'error';
  readonly signal: AbortSignal;
  clone(): Request;
}
declare var Request: { new (input: string | URL | Request, init?: RequestInit): Request };

interface ResponseInit {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
}
interface Response extends Body {
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  readonly headers: Headers;
  readonly url: string;
  readonly redirected: boolean;
  readonly type: 'basic' | 'default' | 'error';
  clone(): Response;
}
declare var Response: {
  new (body?: BodyInit | null, init?: ResponseInit): Response;
  json(data: any, init?: ResponseInit): Response;
  error(): Response;
  redirect(url: string | URL, status?: number): Response;
};

declare function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;

// --- WebSocket (WHATWG, as in Node) ---

interface MessageEvent extends Event {
  readonly data: any;
  readonly origin: string;
  readonly lastEventId: string;
}
declare var MessageEvent: {
  new (type: string, options?: { data?: any; origin?: string; lastEventId?: string }): MessageEvent;
};

interface CloseEvent extends Event {
  readonly code: number;
  readonly reason: string;
  readonly wasClean: boolean;
}
declare var CloseEvent: {
  new (type: string, options?: { code?: number; reason?: string; wasClean?: boolean }): CloseEvent;
};

interface WebSocketEventMap {
  close: CloseEvent;
  error: ErrorEvent;
  message: MessageEvent;
  open: Event;
}

type BinaryType = 'blob' | 'arraybuffer';

interface WebSocket extends EventTarget {
  binaryType: BinaryType;
  readonly bufferedAmount: number;
  readonly extensions: string;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
  onerror: ((this: WebSocket, ev: ErrorEvent) => any) | null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
  onopen: ((this: WebSocket, ev: Event) => any) | null;
  readonly protocol: string;
  readonly readyState: number;
  readonly url: string;
  close(code?: number, reason?: string): void;
  send(data: string | ArrayBuffer | Blob | Uint8Array | TypedArray<any> | DataView): void;
  readonly CLOSED: number;
  readonly CLOSING: number;
  readonly CONNECTING: number;
  readonly OPEN: number;

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: { once?: boolean }
  ): void;
  addEventListener(type: string, listener: (event: Event) => void, options?: { once?: boolean }): void;
  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: { once?: boolean }
  ): void;
  removeEventListener(type: string, listener: (event: Event) => void, options?: { once?: boolean }): void;
}

interface WebSocketInit {
  protocols?: string | string[];
  headers?: HeadersInit;
}

declare var WebSocket: {
  prototype: WebSocket;
  new (url: string | URL, protocols?: string | string[] | WebSocketInit): WebSocket;
  readonly CLOSED: number;
  readonly CLOSING: number;
  readonly CONNECTING: number;
  readonly OPEN: number;
};

declare function setImmediate<A extends any[]>(callback: (...args: A) => void, ...args: A): NodeJS.Immediate;
declare function clearImmediate(immediate?: NodeJS.Immediate | number): void;

declare namespace NodeJS {
  // A readable stream, as Node's typings describe it (process.stdin is one)
  interface ReadableStream {
    readonly readable: boolean;
    read(size?: number): any;
    setEncoding(encoding: BufferEncoding): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }
  interface WritableStream {
    readonly writable: boolean;
    write(chunk: any, callback?: (error?: Error | null) => void): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  // Timer handles: an unref'ed timer does not keep the process alive
  interface Timeout {
    ref(): this;
    unref(): this;
    hasRef(): boolean;
    refresh(): this;
    close(): this;
  }
  interface Immediate {
    ref(): this;
    unref(): this;
    hasRef(): boolean;
  }
  // Errors thrown by Node APIs: err.code ('ENOENT', 'ERR_INVALID_URL', …)
  interface ErrnoException extends Error {
    errno?: number;
    code?: string;
    path?: string;
    syscall?: string;
    /** dns errors: the queried name */
    hostname?: string;
    /** net errors: the remote address and port */
    address?: string;
    port?: number;
  }
}

// --- Test helper ---

declare function assert(condition: boolean, message?: string): void;

// --- JSX (.tsx renders to HTML strings) ---

declare namespace JSX {
  // A JSX expression is an HTML string; multiple children form a list that
  // concatenates to one string.
  type Element = string | readonly Element[];
  interface IntrinsicElements {
    [name: string]: any;
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}

// Reflect: the Object operations as functions
declare namespace Reflect {
  function apply(target: Function, thisArgument: any, argumentsList: ArrayLike<any>): any;
  function construct(target: Function, argumentsList: ArrayLike<any>, newTarget?: Function): any;
  function defineProperty(target: object, propertyKey: PropertyKey, attributes: PropertyDescriptor): boolean;
  function deleteProperty(target: object, propertyKey: PropertyKey): boolean;
  function get(target: object, propertyKey: PropertyKey, receiver?: any): any;
  function getOwnPropertyDescriptor(target: object, propertyKey: PropertyKey): PropertyDescriptor | undefined;
  function getPrototypeOf(target: object): object | null;
  function has(target: object, propertyKey: PropertyKey): boolean;
  function ownKeys(target: object): (string | symbol)[];
  function set(target: object, propertyKey: PropertyKey, value: any, receiver?: any): boolean;
}

// WebAssembly: modules compiled and run by wazero (pure Go). i32 / f32 / f64
// cross as numbers, i64 as bigints. Tables can be exported and imported again,
// but not created, read or written (wazero has no table API)
declare namespace WebAssembly {
  type ImportExportKind = 'function' | 'table' | 'memory' | 'global' | 'tag';
  type ValueType = 'i32' | 'i64' | 'f32' | 'f64' | 'externref' | 'anyfunc' | 'v128';
  type ExportValue = Function | Global | Memory | Table;
  type Exports = Record<string, ExportValue>;
  type ImportValue = ExportValue | number | bigint;
  type ModuleImports = Record<string, ImportValue>;
  type Imports = Record<string, ModuleImports>;
  type BufferSource = ArrayBuffer | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | DataView;

  interface ModuleImportDescriptor {
    module: string;
    name: string;
    kind: ImportExportKind;
  }
  interface ModuleExportDescriptor {
    name: string;
    kind: ImportExportKind;
  }
  interface WebAssemblyInstantiatedSource {
    module: Module;
    instance: Instance;
  }
  interface MemoryDescriptor {
    initial: number;
    maximum?: number;
    shared?: boolean;
  }
  interface GlobalDescriptor {
    value: ValueType;
    mutable?: boolean;
  }
  interface TableDescriptor {
    element: 'anyfunc' | 'externref';
    initial: number;
    maximum?: number;
  }

  class Module {
    constructor(bytes: BufferSource);
    static imports(moduleObject: Module): ModuleImportDescriptor[];
    static exports(moduleObject: Module): ModuleExportDescriptor[];
    static customSections(moduleObject: Module, sectionName: string): ArrayBuffer[];
  }
  class Instance {
    constructor(module: Module, importObject?: Imports);
    readonly exports: Exports;
  }
  // .buffer views the memory's bytes; after grow() read .buffer again
  class Memory {
    constructor(descriptor: MemoryDescriptor);
    readonly buffer: ArrayBuffer;
    grow(delta: number): number;
  }
  class Global {
    constructor(descriptor: GlobalDescriptor, v?: any);
    value: any;
    valueOf(): any;
  }
  class Table {
    constructor(descriptor: TableDescriptor, value?: any);
    readonly length: number;
    get(index: number): any;
    set(index: number, value?: any): void;
    grow(delta: number, value?: any): number;
  }
  class CompileError extends Error {
    constructor(message?: string);
  }
  class LinkError extends Error {
    constructor(message?: string);
  }
  class RuntimeError extends Error {
    constructor(message?: string);
  }

  function validate(bytes: BufferSource): boolean;
  function compile(bytes: BufferSource): Promise<Module>;
  // (bytes first: a Module has no instance members, so bytes would match it)
  function instantiate(bytes: BufferSource, importObject?: Imports): Promise<WebAssemblyInstantiatedSource>;
  function instantiate(moduleObject: Module, importObject?: Imports): Promise<Instance>;
}

// --- Intl ---
//
// Formats as Node 26 (ICU 78) does for the locales whose data is generated
// (scripts/gen-intl-data.mjs: en, en-GB, en-IN, de, fr, es, es-MX, it, pt-BR,
// pt-PT, nl, sv, da, nb, fi, pl, cs, ru, uk, tr, el, ja, zh, zh-Hant, ko, ar,
// he, hi, id, th, vi); other locales fall back by language, then to the
// default locale (LC_ALL / LANG, or the Windows user locale). Language tags,
// plural rules, collation and locale case mapping run on golang.org/x/text.
// The gregorian calendar only.
declare namespace Intl {
  type LocalesArgument = string | Locale | readonly (string | Locale)[] | undefined;
  type LocaleMatcher = 'lookup' | 'best fit';

  interface ResolvedOptions {
    locale: string;
    [key: string]: any;
  }

  // --- NumberFormat
  type NumberFormatPartType =
    | 'compact' | 'currency' | 'decimal' | 'exponentInteger' | 'exponentMinusSign' | 'exponentSeparator'
    | 'fraction' | 'group' | 'infinity' | 'integer' | 'literal' | 'minusSign' | 'nan' | 'plusSign'
    | 'percentSign' | 'unit' | 'unknown' | 'approximatelySign';
  interface NumberFormatPart {
    type: NumberFormatPartType;
    value: string;
  }
  interface NumberRangeFormatPart extends NumberFormatPart {
    source: 'startRange' | 'endRange' | 'shared';
  }
  interface NumberFormatOptions {
    localeMatcher?: LocaleMatcher;
    numberingSystem?: string;
    style?: 'decimal' | 'percent' | 'currency' | 'unit';
    currency?: string;
    currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
    currencySign?: 'standard' | 'accounting';
    unit?: string;
    unitDisplay?: 'short' | 'long' | 'narrow';
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
    compactDisplay?: 'short' | 'long';
    signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero' | 'negative';
    useGrouping?: boolean | 'always' | 'auto' | 'min2' | 'true' | 'false';
    minimumIntegerDigits?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    minimumSignificantDigits?: number;
    maximumSignificantDigits?: number;
    roundingMode?: 'ceil' | 'floor' | 'expand' | 'trunc' | 'halfCeil' | 'halfFloor' | 'halfExpand' | 'halfTrunc' | 'halfEven';
    roundingPriority?: 'auto' | 'morePrecision' | 'lessPrecision';
    roundingIncrement?: number;
    trailingZeroDisplay?: 'auto' | 'stripIfInteger';
  }
  class NumberFormat {
    constructor(locales?: LocalesArgument, options?: NumberFormatOptions);
    /** A bound function (`arr.map(nf.format)` works) */
    readonly format: (value: number | bigint | string) => string;
    formatToParts(value: number | bigint | string): NumberFormatPart[];
    formatRange(start: number | bigint | string, end: number | bigint | string): string;
    formatRangeToParts(start: number | bigint | string, end: number | bigint | string): NumberRangeFormatPart[];
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- DateTimeFormat
  type DateTimeFormatPartType =
    | 'day' | 'dayPeriod' | 'era' | 'hour' | 'literal' | 'minute' | 'month' | 'second' | 'timeZoneName'
    | 'weekday' | 'year' | 'fractionalSecond' | 'relatedYear' | 'yearName' | 'unknown';
  interface DateTimeFormatPart {
    type: DateTimeFormatPartType;
    value: string;
  }
  interface DateTimeRangeFormatPart extends DateTimeFormatPart {
    source: 'startRange' | 'endRange' | 'shared';
  }
  interface DateTimeFormatOptions {
    localeMatcher?: LocaleMatcher;
    calendar?: string;
    numberingSystem?: string;
    timeZone?: string;
    hour12?: boolean;
    hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
    formatMatcher?: 'basic' | 'best fit';
    weekday?: 'long' | 'short' | 'narrow';
    era?: 'long' | 'short' | 'narrow';
    year?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    day?: 'numeric' | '2-digit';
    dayPeriod?: 'narrow' | 'short' | 'long';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
    fractionalSecondDigits?: 1 | 2 | 3;
    timeZoneName?: 'short' | 'long' | 'shortOffset' | 'longOffset' | 'shortGeneric' | 'longGeneric';
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
  class DateTimeFormat {
    constructor(locales?: LocalesArgument, options?: DateTimeFormatOptions);
    /** A bound function; without an argument it formats the current time */
    readonly format: (date?: Date | number) => string;
    formatToParts(date?: Date | number): DateTimeFormatPart[];
    formatRange(start: Date | number, end: Date | number): string;
    formatRangeToParts(start: Date | number, end: Date | number): DateTimeRangeFormatPart[];
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- Collator
  interface CollatorOptions {
    localeMatcher?: LocaleMatcher;
    usage?: 'sort' | 'search';
    sensitivity?: 'base' | 'accent' | 'case' | 'variant';
    ignorePunctuation?: boolean;
    collation?: string;
    numeric?: boolean;
    caseFirst?: 'upper' | 'lower' | 'false';
  }
  class Collator {
    constructor(locales?: LocalesArgument, options?: CollatorOptions);
    /** A bound function (`arr.sort(collator.compare)` works) */
    readonly compare: (x: string, y: string) => number;
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- PluralRules
  type LDMLPluralRule = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  interface PluralRulesOptions {
    localeMatcher?: LocaleMatcher;
    type?: 'cardinal' | 'ordinal';
    minimumIntegerDigits?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    minimumSignificantDigits?: number;
    maximumSignificantDigits?: number;
    roundingMode?: NumberFormatOptions['roundingMode'];
    roundingPriority?: NumberFormatOptions['roundingPriority'];
    roundingIncrement?: number;
    trailingZeroDisplay?: NumberFormatOptions['trailingZeroDisplay'];
  }
  class PluralRules {
    constructor(locales?: LocalesArgument, options?: PluralRulesOptions);
    select(n: number): LDMLPluralRule;
    selectRange(start: number, end: number): LDMLPluralRule;
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- ListFormat
  interface ListFormatOptions {
    localeMatcher?: LocaleMatcher;
    type?: 'conjunction' | 'disjunction' | 'unit';
    style?: 'long' | 'short' | 'narrow';
  }
  interface ListFormatPart {
    type: 'element' | 'literal';
    value: string;
  }
  class ListFormat {
    constructor(locales?: LocalesArgument, options?: ListFormatOptions);
    format(list: Iterable<string>): string;
    formatToParts(list: Iterable<string>): ListFormatPart[];
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- RelativeTimeFormat
  type RelativeTimeFormatUnit =
    | 'year' | 'years' | 'quarter' | 'quarters' | 'month' | 'months' | 'week' | 'weeks' | 'day' | 'days'
    | 'hour' | 'hours' | 'minute' | 'minutes' | 'second' | 'seconds';
  interface RelativeTimeFormatOptions {
    localeMatcher?: LocaleMatcher;
    numberingSystem?: string;
    numeric?: 'always' | 'auto';
    style?: 'long' | 'short' | 'narrow';
  }
  interface RelativeTimeFormatPart {
    type: string;
    value: string;
    unit?: string;
  }
  class RelativeTimeFormat {
    constructor(locales?: LocalesArgument, options?: RelativeTimeFormatOptions);
    format(value: number, unit: RelativeTimeFormatUnit): string;
    formatToParts(value: number, unit: RelativeTimeFormatUnit): RelativeTimeFormatPart[];
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- Segmenter
  interface SegmenterOptions {
    localeMatcher?: LocaleMatcher;
    granularity?: 'grapheme' | 'word' | 'sentence';
  }
  interface SegmentData {
    segment: string;
    index: number;
    input: string;
    /** Word granularity only */
    isWordLike?: boolean;
  }
  interface Segments {
    containing(codeUnitIndex?: number): SegmentData | undefined;
    [Symbol.iterator](): IterableIterator<SegmentData>;
  }
  class Segmenter {
    constructor(locales?: LocalesArgument, options?: SegmenterOptions);
    segment(input: string): Segments;
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- DisplayNames
  interface DisplayNamesOptions {
    localeMatcher?: LocaleMatcher;
    type: 'language' | 'region' | 'script' | 'currency' | 'calendar' | 'dateTimeField';
    style?: 'long' | 'short' | 'narrow';
    fallback?: 'code' | 'none';
    languageDisplay?: 'dialect' | 'standard';
  }
  class DisplayNames {
    constructor(locales: LocalesArgument, options: DisplayNamesOptions);
    of(code: string): string | undefined;
    resolvedOptions(): ResolvedOptions;
    static supportedLocalesOf(locales: LocalesArgument, options?: { localeMatcher?: LocaleMatcher }): string[];
  }

  // --- Locale
  interface LocaleOptions {
    baseName?: string;
    calendar?: string;
    caseFirst?: 'upper' | 'lower' | 'false';
    collation?: string;
    hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
    language?: string;
    numberingSystem?: string;
    numeric?: boolean;
    region?: string;
    script?: string;
  }
  class Locale {
    constructor(tag: string | Locale, options?: LocaleOptions);
    readonly baseName: string;
    readonly language: string;
    readonly script: string | undefined;
    readonly region: string | undefined;
    readonly calendar: string | undefined;
    readonly caseFirst: string | undefined;
    readonly collation: string | undefined;
    readonly hourCycle: string | undefined;
    readonly numberingSystem: string | undefined;
    readonly numeric: boolean;
    maximize(): Locale;
    minimize(): Locale;
    toString(): string;
  }

  function getCanonicalLocales(locales?: string | readonly string[]): string[];
  function supportedValuesOf(key: 'calendar' | 'collation' | 'currency' | 'numberingSystem' | 'timeZone' | 'unit'): string[];
}

// --- Temporal (Node 26's flagless global) ---
//
// The ISO 8601 calendar only: passing a non-ISO calendar id throws a
// RangeError, like an unknown one. toLocaleString returns the same string as
// toString (there is no Intl; this follows the fixed en-US convention Date
// uses).

declare namespace Temporal {
  type CalendarLike = PlainDate | PlainDateTime | PlainMonthDay | PlainYearMonth | ZonedDateTime | string;
  type DurationLike = Duration | DurationLikeObject | string;
  type InstantLike = Instant | string;
  type PlainDateLike = PlainDate | ZonedDateTime | PlainDateTime | DateLikeObject | string;
  type PlainDateTimeLike = PlainDateTime | ZonedDateTime | PlainDate | DateTimeLikeObject | string;
  type PlainMonthDayLike = PlainMonthDay | DateLikeObject | string;
  type PlainTimeLike = PlainTime | PlainDateTime | ZonedDateTime | TimeLikeObject | string;
  type PlainYearMonthLike = PlainYearMonth | YearMonthLikeObject | string;
  type TimeZoneLike = ZonedDateTime | string;
  type ZonedDateTimeLike = ZonedDateTime | ZonedDateTimeLikeObject | string;

  type PartialTemporalLike<T extends object> = {
    [P in Exclude<keyof T, "calendar" | "timeZone">]?: T[P] | undefined;
  };

  interface DateLikeObject {
    year?: number | undefined;
    era?: string | undefined;
    eraYear?: number | undefined;
    month?: number | undefined;
    monthCode?: string | undefined;
    day: number;
    calendar?: string | undefined;
  }

  interface DateTimeLikeObject extends DateLikeObject, TimeLikeObject {}

  interface DurationLikeObject {
    years?: number | undefined;
    months?: number | undefined;
    weeks?: number | undefined;
    days?: number | undefined;
    hours?: number | undefined;
    minutes?: number | undefined;
    seconds?: number | undefined;
    milliseconds?: number | undefined;
    microseconds?: number | undefined;
    nanoseconds?: number | undefined;
  }

  interface TimeLikeObject {
    hour?: number | undefined;
    minute?: number | undefined;
    second?: number | undefined;
    millisecond?: number | undefined;
    microsecond?: number | undefined;
    nanosecond?: number | undefined;
  }

  interface YearMonthLikeObject extends Omit<DateLikeObject, "day"> {}

  interface ZonedDateTimeLikeObject extends DateTimeLikeObject {
    timeZone: TimeZoneLike;
    offset?: string | undefined;
  }

  type DateUnit = "year" | "month" | "week" | "day";
  type TimeUnit = "hour" | "minute" | "second" | "millisecond" | "microsecond" | "nanosecond";
  type PluralizeUnit<T extends DateUnit | TimeUnit> =
    | T
    | {
        year: "years";
        month: "months";
        week: "weeks";
        day: "days";
        hour: "hours";
        minute: "minutes";
        second: "seconds";
        millisecond: "milliseconds";
        microsecond: "microseconds";
        nanosecond: "nanoseconds";
      }[T];

  interface DisambiguationOptions {
    disambiguation?: "compatible" | "earlier" | "later" | "reject" | undefined;
  }

  interface OverflowOptions {
    overflow?: "constrain" | "reject" | undefined;
  }

  interface TransitionOptions {
    direction: "next" | "previous";
  }

  interface RoundingOptions<Units extends DateUnit | TimeUnit> {
    smallestUnit?: PluralizeUnit<Units> | undefined;
    roundingIncrement?: number | undefined;
    roundingMode?: "ceil" | "floor" | "expand" | "trunc" | "halfCeil" | "halfFloor" | "halfExpand" | "halfTrunc" | "halfEven" | undefined;
  }

  interface RoundingOptionsWithLargestUnit<Units extends DateUnit | TimeUnit> extends RoundingOptions<Units> {
    largestUnit?: "auto" | PluralizeUnit<Units> | undefined;
  }

  interface ToStringRoundingOptions<Units extends DateUnit | TimeUnit> extends Pick<RoundingOptions<Units>, "smallestUnit" | "roundingMode"> {}

  interface ToStringRoundingOptionsWithFractionalSeconds<Units extends DateUnit | TimeUnit> extends ToStringRoundingOptions<Units> {
    fractionalSecondDigits?: "auto" | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined;
  }

  namespace Now {
    function timeZoneId(): string;
    function instant(): Instant;
    function plainDateTimeISO(timeZone?: TimeZoneLike): PlainDateTime;
    function zonedDateTimeISO(timeZone?: TimeZoneLike): ZonedDateTime;
    function plainDateISO(timeZone?: TimeZoneLike): PlainDate;
    function plainTimeISO(timeZone?: TimeZoneLike): PlainTime;
  }

  interface PlainDateToStringOptions {
    calendarName?: "auto" | "always" | "never" | "critical" | undefined;
  }

  interface PlainDateToZonedDateTimeOptions {
    plainTime?: PlainTimeLike | undefined;
    timeZone: TimeZoneLike;
  }

  interface PlainDate {
    readonly calendarId: string;
    readonly era: string | undefined;
    readonly eraYear: number | undefined;
    readonly year: number;
    readonly month: number;
    readonly monthCode: string;
    readonly day: number;
    readonly dayOfWeek: number;
    readonly dayOfYear: number;
    readonly weekOfYear: number | undefined;
    readonly yearOfWeek: number | undefined;
    readonly daysInWeek: number;
    readonly daysInMonth: number;
    readonly daysInYear: number;
    readonly monthsInYear: number;
    readonly inLeapYear: boolean;
    toPlainYearMonth(): PlainYearMonth;
    toPlainMonthDay(): PlainMonthDay;
    add(duration: DurationLike, options?: OverflowOptions): PlainDate;
    subtract(duration: DurationLike, options?: OverflowOptions): PlainDate;
    with(dateLike: PartialTemporalLike<DateLikeObject>, options?: OverflowOptions): PlainDate;
    withCalendar(calendarLike: CalendarLike): PlainDate;
    until(other: PlainDateLike, options?: RoundingOptionsWithLargestUnit<DateUnit>): Duration;
    since(other: PlainDateLike, options?: RoundingOptionsWithLargestUnit<DateUnit>): Duration;
    equals(other: PlainDateLike): boolean;
    toPlainDateTime(time?: PlainTimeLike): PlainDateTime;
    toZonedDateTime(timeZone: TimeZoneLike): ZonedDateTime;
    toZonedDateTime(item: PlainDateToZonedDateTimeOptions): ZonedDateTime;
    toString(options?: PlainDateToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
  }

  interface PlainDateConstructor {
    new (isoYear: number, isoMonth: number, isoDay: number, calendar?: string): PlainDate;
    readonly prototype: PlainDate;
    from(item: PlainDateLike, options?: OverflowOptions): PlainDate;
    compare(one: PlainDateLike, two: PlainDateLike): number;
  }
  var PlainDate: PlainDateConstructor;

  interface PlainTimeToStringOptions extends ToStringRoundingOptionsWithFractionalSeconds<Exclude<TimeUnit, "hour">> {}

  interface PlainTime {
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
    readonly microsecond: number;
    readonly nanosecond: number;
    add(duration: DurationLike): PlainTime;
    subtract(duration: DurationLike): PlainTime;
    with(timeLike: PartialTemporalLike<TimeLikeObject>, options?: OverflowOptions): PlainTime;
    until(other: PlainTimeLike, options?: RoundingOptionsWithLargestUnit<TimeUnit>): Duration;
    since(other: PlainTimeLike, options?: RoundingOptionsWithLargestUnit<TimeUnit>): Duration;
    equals(other: PlainTimeLike): boolean;
    round(roundTo: PluralizeUnit<TimeUnit>): PlainTime;
    round(roundTo: RoundingOptions<TimeUnit>): PlainTime;
    toString(options?: PlainTimeToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
  }

  interface PlainTimeConstructor {
    new (hour?: number, minute?: number, second?: number, millisecond?: number, microsecond?: number, nanosecond?: number): PlainTime;
    readonly prototype: PlainTime;
    from(item: PlainTimeLike, options?: OverflowOptions): PlainTime;
    compare(one: PlainTimeLike, two: PlainTimeLike): number;
  }
  var PlainTime: PlainTimeConstructor;

  interface PlainDateTimeToStringOptions extends PlainDateToStringOptions, PlainTimeToStringOptions {}

  interface PlainDateTime {
    readonly calendarId: string;
    readonly era: string | undefined;
    readonly eraYear: number | undefined;
    readonly year: number;
    readonly month: number;
    readonly monthCode: string;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
    readonly microsecond: number;
    readonly nanosecond: number;
    readonly dayOfWeek: number;
    readonly dayOfYear: number;
    readonly weekOfYear: number | undefined;
    readonly yearOfWeek: number | undefined;
    readonly daysInWeek: number;
    readonly daysInMonth: number;
    readonly daysInYear: number;
    readonly monthsInYear: number;
    readonly inLeapYear: boolean;
    with(dateTimeLike: PartialTemporalLike<DateTimeLikeObject>, options?: OverflowOptions): PlainDateTime;
    withPlainTime(plainTime?: PlainTimeLike): PlainDateTime;
    withCalendar(calendar: CalendarLike): PlainDateTime;
    add(duration: DurationLike, options?: OverflowOptions): PlainDateTime;
    subtract(duration: DurationLike, options?: OverflowOptions): PlainDateTime;
    until(other: PlainDateTimeLike, options?: RoundingOptionsWithLargestUnit<DateUnit | TimeUnit>): Duration;
    since(other: PlainDateTimeLike, options?: RoundingOptionsWithLargestUnit<DateUnit | TimeUnit>): Duration;
    round(roundTo: PluralizeUnit<"day" | TimeUnit>): PlainDateTime;
    round(roundTo: RoundingOptions<"day" | TimeUnit>): PlainDateTime;
    equals(other: PlainDateTimeLike): boolean;
    toString(options?: PlainDateTimeToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
    toZonedDateTime(timeZone: TimeZoneLike, options?: DisambiguationOptions): ZonedDateTime;
    toPlainDate(): PlainDate;
    toPlainTime(): PlainTime;
  }

  interface PlainDateTimeConstructor {
    new (isoYear: number, isoMonth: number, isoDay: number, hour?: number, minute?: number, second?: number, millisecond?: number, microsecond?: number, nanosecond?: number, calendar?: string): PlainDateTime;
    readonly prototype: PlainDateTime;
    from(item: PlainDateTimeLike, options?: OverflowOptions): PlainDateTime;
    compare(one: PlainDateTimeLike, two: PlainDateTimeLike): number;
  }
  var PlainDateTime: PlainDateTimeConstructor;

  interface ZonedDateTimeToStringOptions extends PlainDateTimeToStringOptions {
    offset?: "auto" | "never" | undefined;
    timeZoneName?: "auto" | "never" | "critical" | undefined;
  }

  interface ZonedDateTimeFromOptions extends OverflowOptions, DisambiguationOptions {
    offset?: "use" | "ignore" | "prefer" | "reject" | undefined;
  }

  interface ZonedDateTime {
    readonly calendarId: string;
    readonly timeZoneId: string;
    readonly era: string | undefined;
    readonly eraYear: number | undefined;
    readonly year: number;
    readonly month: number;
    readonly monthCode: string;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly millisecond: number;
    readonly microsecond: number;
    readonly nanosecond: number;
    readonly epochMilliseconds: number;
    readonly epochNanoseconds: bigint;
    readonly dayOfWeek: number;
    readonly dayOfYear: number;
    readonly weekOfYear: number | undefined;
    readonly yearOfWeek: number | undefined;
    readonly hoursInDay: number;
    readonly daysInWeek: number;
    readonly daysInMonth: number;
    readonly daysInYear: number;
    readonly monthsInYear: number;
    readonly inLeapYear: boolean;
    readonly offsetNanoseconds: number;
    readonly offset: string;
    with(zonedDateTimeLike: PartialTemporalLike<ZonedDateTimeLikeObject>, options?: ZonedDateTimeFromOptions): ZonedDateTime;
    withPlainTime(plainTime?: PlainTimeLike): ZonedDateTime;
    withTimeZone(timeZone: TimeZoneLike): ZonedDateTime;
    withCalendar(calendar: CalendarLike): ZonedDateTime;
    add(duration: DurationLike, options?: OverflowOptions): ZonedDateTime;
    subtract(duration: DurationLike, options?: OverflowOptions): ZonedDateTime;
    until(other: ZonedDateTimeLike, options?: RoundingOptionsWithLargestUnit<DateUnit | TimeUnit>): Duration;
    since(other: ZonedDateTimeLike, options?: RoundingOptionsWithLargestUnit<DateUnit | TimeUnit>): Duration;
    round(roundTo: PluralizeUnit<"day" | TimeUnit>): ZonedDateTime;
    round(roundTo: RoundingOptions<"day" | TimeUnit>): ZonedDateTime;
    equals(other: ZonedDateTimeLike): boolean;
    toString(options?: ZonedDateTimeToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
    startOfDay(): ZonedDateTime;
    getTimeZoneTransition(direction: "next" | "previous"): ZonedDateTime | null;
    getTimeZoneTransition(direction: TransitionOptions): ZonedDateTime | null;
    toInstant(): Instant;
    toPlainDate(): PlainDate;
    toPlainTime(): PlainTime;
    toPlainDateTime(): PlainDateTime;
  }

  interface ZonedDateTimeConstructor {
    new (epochNanoseconds: bigint, timeZone: string, calendar?: string): ZonedDateTime;
    readonly prototype: ZonedDateTime;
    from(item: ZonedDateTimeLike, options?: ZonedDateTimeFromOptions): ZonedDateTime;
    compare(one: ZonedDateTimeLike, two: ZonedDateTimeLike): number;
  }
  var ZonedDateTime: ZonedDateTimeConstructor;

  interface DurationRelativeToOptions {
    relativeTo?: ZonedDateTimeLike | PlainDateLike | undefined;
  }

  interface DurationRoundingOptions extends DurationRelativeToOptions, RoundingOptionsWithLargestUnit<DateUnit | TimeUnit> {}

  interface DurationToStringOptions extends ToStringRoundingOptionsWithFractionalSeconds<Exclude<TimeUnit, "hour" | "minute">> {}

  interface DurationTotalOptions extends DurationRelativeToOptions {
    unit: PluralizeUnit<DateUnit | TimeUnit>;
  }

  interface Duration {
    readonly years: number;
    readonly months: number;
    readonly weeks: number;
    readonly days: number;
    readonly hours: number;
    readonly minutes: number;
    readonly seconds: number;
    readonly milliseconds: number;
    readonly microseconds: number;
    readonly nanoseconds: number;
    readonly sign: number;
    readonly blank: boolean;
    with(durationLike: PartialTemporalLike<DurationLikeObject>): Duration;
    negated(): Duration;
    abs(): Duration;
    add(other: DurationLike): Duration;
    subtract(other: DurationLike): Duration;
    round(roundTo: PluralizeUnit<"day" | TimeUnit>): Duration;
    round(roundTo: DurationRoundingOptions): Duration;
    total(totalOf: PluralizeUnit<"day" | TimeUnit>): number;
    total(totalOf: DurationTotalOptions): number;
    toString(options?: DurationToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
  }

  interface DurationConstructor {
    new (years?: number, months?: number, weeks?: number, days?: number, hours?: number, minutes?: number, seconds?: number, milliseconds?: number, microseconds?: number, nanoseconds?: number): Duration;
    readonly prototype: Duration;
    from(item: DurationLike): Duration;
    compare(one: DurationLike, two: DurationLike, options?: DurationRelativeToOptions): number;
  }
  var Duration: DurationConstructor;

  interface InstantToStringOptions extends PlainTimeToStringOptions {
    timeZone?: TimeZoneLike | undefined;
  }

  interface Instant {
    readonly epochMilliseconds: number;
    readonly epochNanoseconds: bigint;
    add(duration: DurationLike): Instant;
    subtract(duration: DurationLike): Instant;
    until(other: InstantLike, options?: RoundingOptionsWithLargestUnit<TimeUnit>): Duration;
    since(other: InstantLike, options?: RoundingOptionsWithLargestUnit<TimeUnit>): Duration;
    round(roundTo: PluralizeUnit<TimeUnit>): Instant;
    round(roundTo: RoundingOptions<TimeUnit>): Instant;
    equals(other: InstantLike): boolean;
    toString(options?: InstantToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
    toZonedDateTimeISO(timeZone: TimeZoneLike): ZonedDateTime;
  }

  interface InstantConstructor {
    new (epochNanoseconds: bigint): Instant;
    readonly prototype: Instant;
    from(item: InstantLike): Instant;
    fromEpochMilliseconds(epochMilliseconds: number): Instant;
    fromEpochNanoseconds(epochNanoseconds: bigint): Instant;
    compare(one: InstantLike, two: InstantLike): number;
  }
  var Instant: InstantConstructor;

  interface PlainYearMonthToPlainDateOptions {
    day: number;
  }

  interface PlainYearMonth {
    readonly calendarId: string;
    readonly era: string | undefined;
    readonly eraYear: number | undefined;
    readonly year: number;
    readonly month: number;
    readonly monthCode: string;
    readonly daysInYear: number;
    readonly daysInMonth: number;
    readonly monthsInYear: number;
    readonly inLeapYear: boolean;
    with(yearMonthLike: PartialTemporalLike<YearMonthLikeObject>, options?: OverflowOptions): PlainYearMonth;
    add(duration: DurationLike, options?: OverflowOptions): PlainYearMonth;
    subtract(duration: DurationLike, options?: OverflowOptions): PlainYearMonth;
    until(other: PlainYearMonthLike, options?: RoundingOptionsWithLargestUnit<"year" | "month">): Duration;
    since(other: PlainYearMonthLike, options?: RoundingOptionsWithLargestUnit<"year" | "month">): Duration;
    equals(other: PlainYearMonthLike): boolean;
    toString(options?: PlainDateToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
    toPlainDate(item: PlainYearMonthToPlainDateOptions): PlainDate;
  }

  interface PlainYearMonthConstructor {
    new (isoYear: number, isoMonth: number, calendar?: string, referenceISODay?: number): PlainYearMonth;
    readonly prototype: PlainYearMonth;
    from(item: PlainYearMonthLike, options?: OverflowOptions): PlainYearMonth;
    compare(one: PlainYearMonthLike, two: PlainYearMonthLike): number;
  }
  var PlainYearMonth: PlainYearMonthConstructor;

  interface PlainMonthDayToPlainDateOptions {
    era?: string | undefined;
    eraYear?: number | undefined;
    year?: number | undefined;
  }

  interface PlainMonthDay {
    readonly calendarId: string;
    readonly monthCode: string;
    readonly day: number;
    with(monthDayLike: PartialTemporalLike<DateLikeObject>, options?: OverflowOptions): PlainMonthDay;
    equals(other: PlainMonthDayLike): boolean;
    toString(options?: PlainDateToStringOptions): string;
    toLocaleString(locales?: string | string[], options?: any): string;
    toJSON(): string;
    valueOf(): never;
    toPlainDate(item: PlainMonthDayToPlainDateOptions): PlainDate;
  }

  interface PlainMonthDayConstructor {
    new (isoMonth: number, isoDay: number, calendar?: string, referenceISOYear?: number): PlainMonthDay;
    readonly prototype: PlainMonthDay;
    from(item: PlainMonthDayLike, options?: OverflowOptions): PlainMonthDay;
  }
  var PlainMonthDay: PlainMonthDayConstructor;
}

interface Date {
  /** An Instant at the same epoch time */
  toTemporalInstant(): Temporal.Instant;
}
