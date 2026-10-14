// Type definitions for TypeNative.
//
// Scaffolded projects compile with `lib: []` and `types: ["typenative", ...]`,
// so this file is the entire standard-library type surface: only declare what
// the transpiler actually lowers (see conformance.md for the feature matrix).

interface Boolean {}

interface Function {
  readonly name: string;
  apply(thisArg: any, argArray?: any): any;
  call(thisArg: any, ...argArray: any[]): any;
}

interface CallableFunction extends Function {}
interface NewableFunction extends Function {}

interface IArguments {
  [index: number]: any;
  length: number;
}

interface Number {
  toString(radix?: number): string;
  toFixed(fractionDigits?: number): string;
  toPrecision(precision?: number): string;
}

interface Object {
  constructor: Function;
  toString(): string;
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
}

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

// await unwraps one thenable layer at a time
type Awaited<T> = T extends null | undefined
  ? T
  : T extends { then(onfulfilled: (value: infer U) => any): any }
    ? Awaited<U>
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
  readonly sticky: boolean;
  test(string: string): boolean;
  exec(string: string): RegExpExecArray | null;
}

// exec() result; named-group regexes carry a .groups record
interface RegExpExecArray extends Array<string> {
  index: number;
  readonly groups: Record<string, string> | undefined;
}

interface RegExpConstructor {
  new (pattern: string | RegExp, flags?: string): RegExp;
  (pattern: string | RegExp, flags?: string): RegExp;
}

declare var RegExp: RegExpConstructor;

// --- Array ---

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
  /**
   * Returns a copy of a section of an array.
   */
  slice(start?: number, end?: number): T[];
  /**
   * Calls a defined callback function on each element of an array, and returns an array that contains the results.
   */
  map<U>(callback: (value: T, index?: number, array?: T[]) => U): U[];
  /**
   * Returns the elements of an array that meet the condition specified in a callback function.
   */
  filter(callback: (value: T, index?: number, array?: T[]) => boolean): T[];
  /**
   * Determines whether the specified callback function returns true for any element of an array.
   */
  some(callback: (value: T, index?: number, array?: T[]) => boolean): boolean;
  /**
   * Returns the value of the first element in the array where callback is true, and undefined otherwise.
   */
  find(callback: (value: T, index?: number, array?: T[]) => boolean): T | undefined;
  /**
   * Returns the index of the first element that satisfies the callback, or -1.
   */
  findIndex(callback: (value: T, index?: number, array?: T[]) => boolean): number;
  /**
   * Returns the value of the last element where callback is true, and undefined otherwise.
   */
  findLast(callback: (value: T, index?: number, array?: T[]) => boolean): T | undefined;
  /**
   * Returns the index of the last element that satisfies the callback, or -1.
   */
  findLastIndex(callback: (value: T, index?: number, array?: T[]) => boolean): number;
  /**
   * Determines whether all elements satisfy the callback.
   */
  every(callback: (value: T, index?: number, array?: T[]) => boolean): boolean;
  /**
   * Performs the callback for each element.
   */
  forEach(callback: (value: T, index?: number, array?: T[]) => void): void;
  /**
   * Calls the callback function on each element of the array, accumulating a result.
   */
  reduce<U>(
    callback: (accumulator: U, value: T, index?: number, array?: T[]) => U,
    initialValue: U
  ): U;
  reduce(callback: (accumulator: T, value: T, index?: number, array?: T[]) => T): T;
  /**
   * Calls the callback function on each element of the array in reverse order, accumulating a result.
   */
  reduceRight<U>(
    callback: (accumulator: U, value: T, index?: number, array?: T[]) => U,
    initialValue: U
  ): U;
  reduceRight(callback: (accumulator: T, value: T, index?: number, array?: T[]) => T): T;
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
  reverse(): T[];
  /**
   * Returns a reversed copy of the array.
   */
  toReversed(): T[];
  /**
   * Sorts the elements of an array in place.
   */
  sort(compareFn?: (a: T, b: T) => number): T[];
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
  flat(): T[];
  flatMap<U>(callback: (value: T, index?: number, array?: T[]) => U[]): U[];
  /**
   * Returns a copy of a section of an array with the fill value applied.
   */
  fill(value: T, start?: number, end?: number): T[];
  /**
   * Copies within the array in place (overlap-safe) and returns it.
   */
  copyWithin(target: number, start: number, end?: number): T[];
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

interface ArrayConstructor {
  new <T>(length: number): T[];
  isArray(arg: any): arg is any[];
  from<T>(arrayLike: ArrayLike<T>): T[];
  from<T, U>(arrayLike: ArrayLike<T>, mapFn: (value: T, index: number) => U): U[];
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
  indexOf(searchString: string): number;
  /** Returns the position of the last occurrence of a substring. */
  lastIndexOf(searchString: string): number;
  /** Determines whether a string contains the specified substring. */
  includes(searchString: string): boolean;
  /** Determines whether a string begins with the specified characters. */
  startsWith(searchString: string): boolean;
  /** Determines whether a string ends with the specified characters. */
  endsWith(searchString: string): boolean;
  /** Splits a string into substrings using the specified separator. */
  split(separator: string | RegExp): string[];
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
  match(regexp: string | RegExp): string[] | null;
  /** Matches all occurrences of a regex. */
  matchAll(regexp: string | RegExp): string[][];
  /** Searches for a match and returns the index. */
  search(regexp: string | RegExp): number;
  /** Returns the character at the given index (supports negative indices). */
  at(index: number): string | undefined;
  /** Compares two strings (by code unit). */
  localeCompare(that: string): number;
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
  raw(strings: TemplateStringsArray, ...values: any[]): string;
}

declare var String: StringConstructor;

interface NumberConstructor {
  (value?: any): number;
  isNaN(value: number): boolean;
  isFinite(value: number): boolean;
  isInteger(value: number): boolean;
  readonly MAX_SAFE_INTEGER: number;
  readonly MIN_SAFE_INTEGER: number;
  readonly MAX_VALUE: number;
  readonly POSITIVE_INFINITY: number;
  readonly EPSILON: number;
  readonly NaN: number;
}

declare var Number: NumberConstructor;

// --- console / globals ---

interface Console {
  log(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
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
declare function structuredClone<T>(value: T): T;

declare var NaN: number;
declare var Infinity: number;

// globalThis is the global scope itself: `globalThis.x` resolves the global x,
// `(globalThis as any).x` a dynamic property set.

interface ImportMeta {
  readonly url: string;
}

// Timers and microtasks. Handles are opaque; pass them to the matching clear function.
declare function setTimeout(callback: () => void, ms?: number): number;
declare function clearTimeout(id?: number): void;
declare function setInterval(callback: () => void, ms?: number): number;
declare function clearInterval(id?: number): void;
declare function queueMicrotask(callback: () => void): void;

// --- JSON / Object / process ---

interface JSON {
  stringify(value: any, replacer?: any, space?: number | string): string;
  parse(text: string): any;
}
declare var JSON: JSON;

interface ObjectConstructor {
  keys(obj: any): string[];
  values(obj: any): any[];
  entries(obj: any): [string, any][];
  assign(target: any, ...sources: any[]): any;
  fromEntries(entries: Iterable<readonly [string, any]>): any;
  hasOwn(obj: any, key: string): boolean;
  defineProperty<T>(
    obj: T,
    key: string,
    descriptor: { value: any; enumerable?: boolean; writable?: boolean; configurable?: boolean }
  ): T;
  getOwnPropertyNames(obj: any): string[];
  freeze<T>(obj: T): T;
  seal<T>(obj: T): T;
  preventExtensions<T>(obj: T): T;
  isFrozen(obj: any): boolean;
  isSealed(obj: any): boolean;
  isExtensible(obj: any): boolean;
}
declare var Object: ObjectConstructor;

interface Process {
  argv: string[];
  platform: string;
  exit(code?: number): never;
  cwd(): string;
  env: { [key: string]: string | undefined };
}
declare var process: Process;

// --- Error / Date ---

interface Error {
  message: string;
}

interface ErrorConstructor {
  new (message?: string): Error;
}

declare var Error: ErrorConstructor;

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
}

interface DateConstructor {
  new (): Date;
  new (ms: number): Date;
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

interface PromiseConstructor {
  new <T>(
    executor: (resolve: (value: T) => void, reject?: (reason?: any) => void) => void
  ): Promise<T>;
  resolve<T>(value: T): Promise<T>;
  reject(reason?: any): Promise<never>;
  all<T>(values: Promise<T>[]): Promise<T[]>;
  race<T>(values: Promise<T>[]): Promise<T>;
  any<T>(values: Promise<T>[]): Promise<T>;
  allSettled<T>(values: Promise<T>[]): Promise<{ status: string; value?: T; reason?: any }[]>;
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
  /** Iterates [key, value] pairs in insertion order. */
  [Symbol.iterator](): IterableIterator<[K, V]>;
}

interface MapConstructor {
  new <K, V>(): Map<K, V>;
  new <K, V>(entries: [K, V][]): Map<K, V>;
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
  new <T>(values?: T[] | Set<T>): Set<T>;
}

declare var Set: SetConstructor;

// WeakMap/WeakSet lower to Map/Set with the same API; weakness is not observable.
interface WeakMap<K extends object, V> {
  set(key: K, value: V): this;
  get(key: K): V | undefined;
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
}

declare var Symbol: SymbolConstructor;

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
