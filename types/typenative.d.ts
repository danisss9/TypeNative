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
   * Returns the index of the first occurrence of a value in an array, or -1 if it is not present.
   */
  indexOf(searchElement: T): number;
  /**
   * Determines whether an array includes a certain element.
   */
  includes(searchElement: T): boolean;
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
  /** Returns a string representation. */
  toString(): string;
  [index: number]: string;
}

interface Console {
  log(...data: any[]): void;
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
}
declare var Math: Math;

declare function parseInt(s: string): number;
declare function parseFloat(s: string): number;

interface Promise<T> {
  then(callback: (value: T) => void): void;
}

interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T) => void) => void): Promise<T>;
}

declare var Promise: PromiseConstructor;

declare function setTimeout(callback: () => void, ms: number): void;

declare function assert(condition: boolean, message?: string): void;
