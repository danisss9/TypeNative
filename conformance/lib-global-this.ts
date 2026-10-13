(globalThis as any).counter = 1;
assert((globalThis as any).counter === 1 && globalThis.Math.max(1, 2) === 2 && globalThis.parseInt('7') === 7, 'globalThis');
