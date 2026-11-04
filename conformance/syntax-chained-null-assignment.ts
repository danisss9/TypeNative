// a = b = literal assigns each target the literal in its own type
class Lit { constructor(public v: string) {} }
function f(params: string[]): string {
  let reference: string | null;
  let options: Lit | null;
  let a: number, b: number;
  a = b = 4;
  if (params.length === 0) { reference = options = null; } else { reference = params[0]; options = new Lit('o'); }
  return `${reference ?? "none"}|${options?.v ?? '-'}|${a + b}`;
}
console.log(f([]), f(['r']));
assert(f([]) === 'none|-|8' && f(['r']) === 'r|o|8', 'chained assignment');
