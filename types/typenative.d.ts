// Type definitions for TypeNative

interface Boolean {}

interface CallableFunction extends Function {}

interface Function {
  /*   apply(thisArg: any, argArray?: any): any;
  call(thisArg: any, ...argArray: any[]): any;
  bind(thisArg: any, ...argArray: any[]): any; */
}

interface IArguments {
  [index: number]: any;
  length: number;
}

interface NewableFunction extends Function {}

interface Number {
  toString(): string;
}

interface Object {
  constructor: Function;
  toString(): string;
}

interface RegExp {
  test(string: string): boolean;
  exec(string: string): string[] | null;
}

interface RegExpConstructor {
  new (pattern: string, flags?: string): RegExp;
}

declare var RegExp: RegExpConstructor;

interface SymbolConstructor {
  readonly iterator: unique symbol;
}

declare var Symbol: SymbolConstructor;

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
  // NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
  next(...[value]: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}

interface IterableIterator<T, TReturn = any, TNext = any> extends Iterator<T, TReturn, TNext> {
  [Symbol.iterator](): IterableIterator<T, TReturn, TNext>;
}

interface Array<T> extends IterableIterator<T> {
  /**
   * Gets or sets the length of the array. This is a number one higher than the highest index in the array.
   */
  length: number;
  /**
   * Appends new elements to the end of an array.
   */
  push(element: T): void;
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
   * Returns the index of the first occurrence of a value in an array, or -1 if it is not present.
   */
  indexOf(searchElement: T): number;
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
   * Sorts the elements of an array in place.
   */
  sort(compareFn?: (a: T, b: T) => number): T[];
  /**
   * Returns a new array formed by applying callback to each element and then flattening.
   */
  flat(): T[];
  /**
   * Merges two or more arrays.
   */
  concat(...items: T[]): T[];
  /**
   * Returns the element at the given index (supports negative indices).
   */
  at(index: number): T | undefined;
  /**
   * Returns a string representation of an array.
   */
  toString(): string;

  [n: number]: T;
}

interface String {
  /** Returns the length of the string. */
  length: number;
  /** Returns the character at the specified index. */
  charAt(pos: number): string;
  /** Returns the position of the first occurrence of a substring. */
  indexOf(searchString: string): number;
  /** Determines whether a string contains the specified substring. */
  includes(searchString: string): boolean;
  /** Determines whether a string begins with the specified characters. */
  startsWith(searchString: string): boolean;
  /** Determines whether a string ends with the specified characters. */
  endsWith(searchString: string): boolean;
  /** Splits a string into substrings using the specified separator. */
  split(separator: string): string[];
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
  replace(searchValue: string, replaceValue: string): string;
  /** Replaces all occurrences of a substring. */
  replaceAll(searchValue: string, replaceValue: string): string;
  /** Returns a section of a string. */
  substring(start: number, end?: number): string;
  /** Returns a section of a string. */
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
  /** Returns the element at the given index (supports negative indices). */
  at(index: number): string | undefined;
  /** Returns a string representation. */
  toString(): string;
  [index: number]: string;
}

interface Console {
  log(...data: any[]): void;
  error(...data: any[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
}
declare var console: Console;

interface Math {
  random(): number;
  floor(x: number): number;
  ceil(x: number): number;
  round(x: number): number;
  abs(x: number): number;
  max(a: number, b: number): number;
  min(a: number, b: number): number;
  sqrt(x: number): number;
  pow(base: number, exponent: number): number;
  log(x: number): number;
  log2(x: number): number;
  log10(x: number): number;
  sin(x: number): number;
  cos(x: number): number;
  tan(x: number): number;
  trunc(x: number): number;
  sign(x: number): number;
}
declare var Math: Math;

declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(s: string): number;
declare function String(value: any): string;
declare function Number(value: any): number;
declare function Boolean(value: any): boolean;

interface JSON {
  stringify(value: any, replacer?: any, space?: number | string): string;
  parse(text: string): any;
}
declare var JSON: JSON;

interface ObjectConstructor {
  keys(obj: any): string[];
  values(obj: any): any[];
  entries(obj: any): [string, any][];
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

interface Promise<T> {
  then(callback: (value: T) => void): void;
}

interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T) => void) => void): Promise<T>;
}

declare var Promise: PromiseConstructor;

declare function setTimeout(callback: () => void, ms: number): void;

declare function assert(condition: boolean, message?: string): void;

interface Error {
  message: string;
}

interface ErrorConstructor {
  new (message?: string): Error;
}

declare var Error: ErrorConstructor;

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
  [Symbol.iterator](): Iterator<[K, V]>;
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
  [Symbol.iterator](): Iterator<T>;
}

interface SetConstructor {
  new <T>(): Set<T>;
  new <T>(values: T[]): Set<T>;
}

declare var Set: SetConstructor;
