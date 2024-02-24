interface Array<T> {
  /**
   * Gets or sets the length of the array. This is a number one higher than the highest index in the array.
   */
  length: number;
  /**
   * Returns a string representation of an array.
   */
  toString(): string;

  [n: number]: T;
}

interface Console {
  log(...data: any[]): void;
}
declare var console: Console;
