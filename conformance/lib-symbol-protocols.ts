// Well-known symbols on classes: asyncIterator, toPrimitive, toStringTag, hasInstance
class Countdown {
  constructor(private n: number) {}
  async *[Symbol.asyncIterator](): AsyncGenerator<number> {
    for (let i = this.n; i > 0; i--) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
      yield i;
    }
  }
}

class Temperature {
  constructor(private celsius: number) {}
  [Symbol.toPrimitive](hint: string): string | number {
    return hint === 'number' ? this.celsius : `${this.celsius}°C`;
  }
  get [Symbol.toStringTag](): string {
    return 'Temperature';
  }
}

class Even {
  static [Symbol.hasInstance](value: unknown): boolean {
    return typeof value === 'number' && value % 2 === 0;
  }
}

async function main() {
  const seen: number[] = [];
  for await (const v of new Countdown(3)) seen.push(v);
  console.log(seen);
  assert(seen.join(',') === '3,2,1', 'for await over [Symbol.asyncIterator]');

  const t = new Temperature(21);
  console.log(`${t}`, +t, String(t), Object.prototype.toString.call(t));
  assert(`${t}` === '21°C' && String(t) === '21°C', 'toPrimitive with the string hint');
  assert(+t === 21 && -t === -21, 'toPrimitive with the number hint');
  assert(Object.prototype.toString.call(t) === '[object Temperature]', 'toStringTag');

  assert((4 as unknown) instanceof Even && !((3 as unknown) instanceof Even), 'static Symbol.hasInstance');
}

main();
