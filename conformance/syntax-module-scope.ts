// Each module has its own top-level scope: same-named declarations in two
// modules (functions, consts, classes, interfaces, private helpers) don't clash
import helloA, { NAME, describe, Thing, type Shape } from './module-scope-a-helper';
import * as b from './module-scope-b-helper';
import helloB, { NAME as nameB, Thing as ThingB } from './module-scope-b-helper';

const local = 'main-local';
const shapeA: Shape = { a: 1 };
const shapeB: b.Shape = { b: 'two' };
console.log(NAME, nameB, b.NAME, describe(), b.describe(), local);
console.log(new Thing().id(), new ThingB().id(), new b.Thing().id(), helloA(), helloB());
assert(NAME === 'a' && nameB === 'b' && b.NAME === 'b', 'same-named consts');
assert(describe() === 'a:a-local' && b.describe() === 'b:b-local:X', 'private helpers stay per module');
assert(new Thing().id() === 'A' && new ThingB().id() === 'B' && new b.Thing().id() === 'B', 'same-named classes');
assert(helloA() === 'hi a' && helloB() === 'hi b', 'default imports');
assert(shapeA.a === 1 && shapeB.b === 'two', 'same-named interfaces');
