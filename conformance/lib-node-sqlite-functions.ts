import { DatabaseSync, constants } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE sales (region TEXT, amount INTEGER);
  INSERT INTO sales VALUES ('north', 10), ('north', 20), ('south', 5), ('south', 7), ('south', 9);
`);

// function(): scalar functions with JS callbacks
db.function('double', (x: number) => x * 2);
db.function('greet', { deterministic: true }, (name: string) => `hello ${name}`);
db.function('total', { varargs: true }, (...values: number[]) => values.reduce((a, b) => a + b, 0));
db.function('none', () => null);
db.function('bytes', () => new Uint8Array([7, 8]));
db.function('big', { useBigIntArguments: true }, (n: bigint) => n * 2n);
const scalars = db.prepare("SELECT double(21) AS d, greet('ann') AS g, total(1, 2, 3, 4) AS t, none() AS n, bytes() AS b, big(4) AS bi").get() as {
  d: number;
  g: string;
  t: number;
  n: null;
  b: Uint8Array;
  bi: number;
};
console.log(scalars);
assert(scalars.d === 42 && scalars.g === 'hello ann' && scalars.t === 10, 'scalar functions');
assert(scalars.n === null && scalars.b.length === 2 && scalars.b[1] === 8 && scalars.bi === 8, 'function results');
const doubled = db.prepare('SELECT double(amount) AS v FROM sales ORDER BY amount').all() as { v: number }[];
assert(doubled.map((r) => r.v).join(',') === '10,14,18,20,40', 'function per row');

// A throw inside a function surfaces from the statement
db.function('fail', () => {
  throw new Error('from js');
});
let fnError = '';
try {
  db.prepare('SELECT fail()').get();
} catch (e: any) {
  fnError = e.message;
}
assert(fnError === 'from js', 'function throw');
db.function('bad', () => true as any);
let badResult = '';
try {
  db.prepare('SELECT bad()').get();
} catch (e: any) {
  badResult = e.message;
}
assert(badResult === 'Returned JavaScript value cannot be converted to a SQLite value', 'unsupported result');

// aggregate(): start / step / result, one accumulator per group
db.aggregate('sumsq', {
  start: 0,
  step: (acc: number, value: number) => acc + value * value
});
db.aggregate('collect', {
  start: () => '',
  step: (acc: string, value: number) => (acc === '' ? `${value}` : `${acc}|${value}`),
  result: (acc: string) => `[${acc}]`
});
const groups = db.prepare('SELECT region, sumsq(amount) AS sq, collect(amount) AS list FROM sales GROUP BY region ORDER BY region').all() as {
  region: string;
  sq: number;
  list: string;
}[];
console.log(groups);
assert(groups.length === 2 && groups[0].sq === 500 && groups[1].sq === 155, 'aggregate step');
assert(groups[0].list === '[10|20]' && groups[1].list === '[5|7|9]', 'aggregate result');

// inverse makes it a window function
db.aggregate('winsum', {
  start: 0,
  step: (acc: number, value: number) => acc + value,
  inverse: (acc: number, value: number) => acc - value
});
const windows = db
  .prepare('SELECT amount, winsum(amount) OVER (ORDER BY amount ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS w FROM sales ORDER BY amount')
  .all() as { amount: number; w: number }[];
assert(windows.map((r) => r.w).join(',') === '5,12,16,19,30', 'window function');

// setAuthorizer(): allow, deny or ignore each action while preparing
const actions: string[] = [];
db.setAuthorizer((action, arg1, arg2, dbName) => {
  if (action === constants.SQLITE_READ) actions.push(`${arg1}.${arg2}@${dbName}`);
  if (action === constants.SQLITE_DELETE) return constants.SQLITE_DENY;
  return constants.SQLITE_OK;
});
db.prepare('SELECT region FROM sales').all();
assert(actions.join(',') === 'sales.region@main', 'authorizer READ');
let denied = '';
let deniedCode = 0;
try {
  db.prepare('DELETE FROM sales');
} catch (e: any) {
  denied = e.message;
  deniedCode = e.errcode;
}
assert(denied === 'not authorized' && deniedCode === 23, 'authorizer DENY');
db.setAuthorizer(null);
assert(db.prepare('DELETE FROM sales').run().changes === 5, 'authorizer removed');
console.log(constants.SQLITE_INSERT, constants.SQLITE_DENY);
assert(constants.SQLITE_INSERT === 18 && constants.SQLITE_IGNORE === 2, 'constants');
db.close();
console.log('sqlite functions ok');
