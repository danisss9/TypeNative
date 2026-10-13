const handlers: { onDone?: () => number } = {};
assert(handlers.onDone?.() === undefined, 'optional call (missing)');
const withFn: { onDone?: () => number } = { onDone: () => 7 };
assert(withFn.onDone?.() === 7, 'optional call');
