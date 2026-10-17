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
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

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
  indexOf(searchString: string, position?: number): number;
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
  info(...data: any[]): void;
  debug(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  trace(...data: any[]): void;
  dir(item?: any, options?: { depth?: number | null }): void;
  assert(condition?: boolean, ...data: any[]): void;
  count(label?: string): void;
  countReset(label?: string): void;
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
declare function setTimeout(callback: (...args: any[]) => void, ms?: number): number;
declare function clearTimeout(id?: number): void;
declare function setInterval(callback: (...args: any[]) => void, ms?: number): number;
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
  emitWarning(warning: string | Error): void;
  getuid(): number;
  getgid(): number;
  geteuid(): number;
  getegid(): number;
  readonly stdout: import('node:stream').Writable & { readonly isTTY?: boolean; readonly fd: 1 };
  readonly stderr: import('node:stream').Writable & { readonly isTTY?: boolean; readonly fd: 2 };
  readonly stdin: import('node:stream').Readable & { readonly isTTY?: boolean; readonly fd: 0 };
  on(event: 'exit', listener: (code: number) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: 'exit', listener: (code: number) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  addListener(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  listenerCount(event: string): number;
}
declare var process: Process;

// --- Error / Date ---

interface Error {
  name: string;
  message: string;
  stack?: string;
}

interface ErrorConstructor {
  new (message?: string): Error;
  (message?: string): Error;
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

// Thenables (needed by the compiler for async callbacks passed to generic APIs)
interface PromiseLike<T> {
  then(onfulfilled?: (value: T) => any): any;
}

interface PromiseConstructor {
  new <T>(
    executor: (resolve: (value: T) => void, reject?: (reason?: any) => void) => void
  ): Promise<T>;
  resolve(): Promise<void>;
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

// bigint values (*big.Int): toString(radix)
interface BigInt {
  toString(radix?: number): string;
}

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
  [index: number]: number;
  subarray(start?: number, end?: number): Uint8Array;
  slice(start?: number, end?: number): Uint8Array;
  set(array: ArrayLike<number>, offset?: number): void;
  at(index: number): number | undefined;
  [Symbol.iterator](): IterableIterator<number>;
}

interface Uint8ArrayConstructor {
  new (length: number): Uint8Array;
  new (array: ArrayLike<number> | Uint8Array): Uint8Array;
  from(arrayLike: ArrayLike<number> | Iterable<number>): Uint8Array;
}

declare var Uint8Array: Uint8ArrayConstructor;

// hkdfSync returns key bytes (an ArrayBuffer in Node); wrap with Buffer.from
interface ArrayBuffer {
  readonly byteLength: number;
}

interface Buffer extends Uint8Array {
  toString(encoding?: BufferEncoding, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array): number;
  subarray(start?: number, end?: number): Buffer;
  slice(start?: number, end?: number): Buffer;
  indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
  lastIndexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
  includes(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): boolean;
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
}

interface BufferConstructor {
  from(data: string, encoding?: BufferEncoding): Buffer;
  from(data: ArrayLike<number> | Uint8Array | ArrayBuffer): Buffer;
  alloc(size: number, fill?: string | number | Uint8Array, encoding?: BufferEncoding): Buffer;
  allocUnsafe(size: number): Buffer;
  allocUnsafeSlow(size: number): Buffer;
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
  decode(input?: Uint8Array, options?: { stream?: boolean }): string;
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

interface Event {
  readonly type: string;
  readonly defaultPrevented: boolean;
  readonly target: any;
  readonly timeStamp: number;
  preventDefault(): void;
}
declare var Event: { new (type: string, options?: { cancelable?: boolean }): Event };

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
interface Performance {
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
  getReader(options?: { mode?: undefined }): ReadableStreamDefaultReader<R>;
  cancel(reason?: any): Promise<void>;
  tee(): [ReadableStream<R>, ReadableStream<R>];
  pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
  pipeThrough<T>(transform: ReadableWritablePair<T, R>, options?: StreamPipeOptions): ReadableStream<T>;
  values(options?: { preventCancel?: boolean }): AsyncIterableIterator<R>;
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}
declare var ReadableStream: {
  new <R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
  from<T>(iterable: Iterable<T> | AsyncIterable<T>): ReadableStream<T>;
};
declare var ReadableStreamDefaultReader: { new <R = any>(stream: ReadableStream<R>): ReadableStreamDefaultReader<R> };

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

declare function setImmediate<A extends any[]>(callback: (...args: A) => void, ...args: A): number;
declare function clearImmediate(immediate?: number): void;

declare namespace NodeJS {
  // Errors thrown by Node APIs: err.code ('ENOENT', 'ERR_INVALID_URL', …)
  interface ErrnoException extends Error {
    errno?: number;
    code?: string;
    path?: string;
    syscall?: string;
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
