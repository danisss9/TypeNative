// Throwing values that aren't Errors: a string and an object are caught as themselves
let text = '';
try {
  throw 'plain failure';
} catch (e) {
  text = e as string;
}
assert(text === 'plain failure', 'a thrown string is caught as itself');

let code = 0;
let tag = '';
try {
  throw { code: 7, tag: 'ENOPE' };
} catch (e) {
  code = (e as { code: number }).code;
  tag = (e as { tag: string }).tag;
}
assert(code === 7 && tag === 'ENOPE', 'a thrown object keeps its properties');

function fail(n: number): never {
  throw { code: n };
}
let caught: any = undefined;
try {
  fail(42);
} catch (e) {
  caught = e;
}
assert(caught !== undefined && caught.code === 42, 'a thrown value crosses a function boundary');
