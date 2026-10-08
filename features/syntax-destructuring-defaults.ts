const { x = 5 } = {} as { x?: number };
const [a = 1] = [] as number[];
assert(x === 5 && a === 1, 'destructuring defaults');
