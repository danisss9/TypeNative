// Code measured by lib-node-test-coverage.ts: its lcov record there is the
// one Node 24 reports for the same calls
export class Counter {
  n = 0;
  constructor(start: number) {
    this.n = start;
  }
  inc(by: number): number {
    for (let i = 0; i < by; i++) {
      this.n++;
    }
    return this.n;
  }
  get value(): number {
    return this.n;
  }
  reset(): void {
    this.n = 0;
  }
}

export function classify(x: number): string {
  switch (x) {
    case 1:
      return 'one';
    case 2:
      return 'two';
    default:
      return 'many';
  }
}

export let calls = 0;
export function safe(f: () => number): number {
  try {
    return f();
  } catch (e) {
    return -1;
  } finally {
    calls++;
  }
}

export const double = (x: number): number => x * 2;

export function outer(): number {
  const inner = (y: number): number => {
    if (y > 10) return y;
    return y + 1;
  };
  return inner(1);
}

export function unusedHelper(): number {
  const nested = (): number => 5;
  return nested();
}

/* node:coverage ignore next */
export function ignored(): number { return 1; }

export function loopy(list: number[]): number {
  let total = 0;
  for (const v of list) {
    if (v < 0) continue;
    total += v;
  }
  while (total > 100) total -= 100;
  return total > 2 ? total : 0;
}

export function pick(a: boolean, b: boolean): boolean {
  const both = a && b;
  const either = a || b;
  return both || either;
}

export function label(name: string | undefined): string {
  return name ?? 'anonymous';
}
