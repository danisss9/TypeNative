// RegExp values: stored in objects, passed around, built at run time,
// called through any values; an object cast to RegExp (exec only)
const rules: Record<string, RegExp> = {
  heading: /^(#{1,6})(?=\s|$)(.*)/,
  dynamic: new RegExp(['^', '(?!x)', '\\w+'].join(''), 'g'),
};
const h = rules.heading.exec('## title');
assert(!!h && h[1] === '##' && h[2] === ' title', 'stored regex with a lookahead');
rules.dynamic.lastIndex = 0;
assert(rules.dynamic.test('word') && rules.dynamic.lastIndex === 4, 'dynamic regex state');
function source(re: RegExp | string): string {
  return typeof re === 'string' ? re : re.source;
}
assert(source(/a+/) === 'a+' && source('b') === 'b', 'string | RegExp narrowed by typeof');
const anyRe: any = /x(\d)/;
assert(anyRe.exec('ax9')[1] === '9' && anyRe.test('x1') && anyRe.source === 'x(\\d)', 'regex methods through any');
const noop = { exec: () => null } as unknown as RegExp;
const table: Record<string, RegExp> = { none: noop };
assert(table.none.exec('anything') === null, 'an object cast to RegExp');
assert(Object.prototype.toString.call(/x/) === '[object RegExp]' && Object.prototype.toString.call(1) === '[object Number]', 'Object.prototype.toString.call');
assert(Object.prototype.toString.call(null) === '[object Null]' && Object.prototype.toString.call([]) === '[object Array]', 'toString tags');
