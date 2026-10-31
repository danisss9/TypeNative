// Function values: a static method held in a variable (optional parameters
// left out), static and instance methods of one name, a variadic function
// expression stored where fixed parameters are expected, a function value as
// a .catch handler, an async IIFE's promise, and method identity
class Lexer {
  static lex(src: string, options?: { x?: number }): string[] {
    return new Lexer().lex(src + (options?.x ?? ''));
  }
  static lexInline(src: string, options?: { x?: number }): number[] {
    return [src.length, options?.x ?? 0];
  }
  lex(src: string): string[] {
    return [src];
  }
  emStrong(): string {
    return 'em';
  }
}
const lex = Lexer.lex;
assert(lex('a')[0] === 'a' && lex('a', { x: 1 })[0] === 'a1', 'a static method as a value');
function pick(block: boolean, hooks: { provide(): (src: string, options?: { x?: number }) => unknown } | null) {
  const lexer = hooks ? hooks.provide() : (block ? Lexer.lex : Lexer.lexInline);
  return lexer('ab', { x: 2 });
}
assert(JSON.stringify(pick(true, null)) === '["ab2"]' && JSON.stringify(pick(false, null)) === '[2,2]', 'a static method chosen at run time');
const renderers: { [name: string]: (token: string) => string | false } = {};
renderers.x = function(...args) {
  return `got ${args.length}:${args[0]}`;
};
assert(renderers.x('t') === 'got 1:t', 'a variadic function stored as fixed');
const lexer = new Lexer();
assert(lexer.emStrong === Lexer.prototype.emStrong, 'an instance method is its prototype method');
const onError = (e: Error): string => `caught ${e.message}`;
function run(fail: boolean): Promise<string> {
  return (async () => {
    if (fail) throw new Error('boom');
    return 'ok';
  })().catch(onError);
}
async function unannotated(n: number) {
  return n + 1;
}
Promise.all([run(false), run(true)]).then((r) => assert(r.join() === 'ok,caught boom', `promises: ${r.join()}`));
unannotated(1).then((n) => assert(n === 2, 'an unannotated async function'));
const maybe: (void | Promise<void>)[] = [undefined, Promise.resolve()];
Promise.all(maybe).then((r) => assert(r.length === 2, 'Promise.all over values that may be promises'));
function exitCode(): number | undefined {
  if (Math.random() > 2) return 1;
  return;
}
assert(exitCode() === undefined || exitCode() === 0, 'a bare return');

// A string method's name that an object literal's function also has: called
// on an any value holding a string, it's the string method
const prefixes = { startsWith: (s: string) => s === 'p', trim: () => 'object' };
const spec: any = './mod.ts';
const padded: any = '  x  ';
assert(spec.startsWith('.') && !spec.startsWith('/') && padded.trim() === 'x', 'string methods on any strings');
assert(prefixes.startsWith('p') && prefixes.trim() === 'object', "the object's own functions");
