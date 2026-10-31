// An Error subclass's own properties are printed after its message (as
// util.inspect / console.log show them) and survive instanceof checks
import util from 'node:util';
class ParseError extends Error {
  code: string;
  pos: number[];
  constructor(code: string, message: string, pos: number[]) {
    super(message);
    this.name = 'ParseError';
    this.code = code;
    this.pos = pos;
  }
}
const e = new ParseError('BAD_INDENT', 'Bad indentation at line 2', [4, 7]);
const text = util.inspect(e);
assert(text.startsWith('ParseError: Bad indentation at line 2'), 'name and message');
assert(text.includes("code: 'BAD_INDENT'") && text.includes('pos: [ 4, 7 ]'), 'own properties');
assert(!text.includes("name: 'ParseError'"), 'the name is not repeated');
assert(e instanceof ParseError && e instanceof Error && e.message === 'Bad indentation at line 2', 'instanceof');
let caught: unknown;
try {
  throw e;
} catch (err) {
  caught = err;
}
assert(caught instanceof ParseError && (caught as ParseError).code === 'BAD_INDENT', 'thrown and caught');
console.log(e.name, e.code, e.pos);
