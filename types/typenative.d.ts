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
   * Returns a string representation of an array.
   */
  push(element: T): void;

  [n: number]: T;
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
}
declare var Math: Math;

interface Promise<T> {
  then(callback: (value: T) => void): void;
}

interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T) => void) => void): Promise<T>;
}

declare var Promise: PromiseConstructor;

declare function setTimeout(callback: () => void, ms: number): void;

declare function assert(condition: boolean, message?: string): void;
