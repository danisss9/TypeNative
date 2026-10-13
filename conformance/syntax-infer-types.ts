type ElementOf<T> = T extends (infer U)[] ? U : never;
type Ret<F> = F extends (...args: any[]) => infer R ? R : never;
const e: ElementOf<number[]> = 3;
const r: Ret<() => string> = 'x';
assert(e === 3 && r === 'x', 'infer');
