// A nullable primitive set on both branches of an if / else is narrowed after it
function ident(s: string): string | null { return s.length > 0 ? s : null; }
function parse(src: string): string {
  let nameId = ident(src);
  let end: number | undefined = undefined;
  if (nameId !== null) {
    end = 1;
  } else {
    nameId = '';
    end = 0;
  }
  const code = nameId.charCodeAt(0);
  return nameId + ':' + (isNaN(code) ? '-' : code) + ':' + end;
}
console.log(parse('abc'), parse(''));
assert(parse('abc') === 'abc:97:1' && parse('') === ':-:0', 'narrowed after if/else');
