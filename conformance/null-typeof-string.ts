// JS null is not undefined: typeof null is "object", String(null) and
// null in a string are "null" — also for null held in an any variable
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

// 1. The literals
check('typeof null', typeof null, 'object');
check('typeof undefined', typeof undefined, 'undefined');
check('String(null)', String(null), 'null');
check('String(undefined)', String(undefined), 'undefined');
check('null + string', null + '!', 'null!');
check('string + undefined', '' + undefined, 'undefined');
check('template', `${null}|${undefined}`, 'null|undefined');

// 2. null in any / unknown variables, top level and local
let top: any = null;
check('top typeof', typeof top, 'object');
check('top String', String(top), 'null');
check('top ===', top === null && top !== undefined, true);
check('top JSON', JSON.stringify({ top }), '{"top":null}');
top = undefined;
check('top undefined', typeof top, 'undefined');
top = null;
check('top null again', `${typeof top} ${top ?? 'dflt'} ${top || 'or'}`, 'object dflt or');

function local(): void {
  const n: any = null;
  let u: unknown = null;
  check('local typeof', `${typeof n} ${typeof u}`, 'object object');
  check('local strings', `${String(n)} ${n + ''} ${n}`, 'null null null');
  check('local ==', n == null && n == undefined && !n, true);
  u = 5;
  check('reassigned', typeof u, 'number');
  u = null;
  check('null again', typeof u, 'object');
}
local();
console.log('ok');
