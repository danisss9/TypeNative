// node:sqlite database.createModule(name, options) — virtual tables backed by JS callbacks
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

// 1. Eponymous virtual table + CREATE VIRTUAL TABLE / DROP TABLE + rowid + special column name
db.createModule('kv', {
  columns: [
    { name: 'k', type: 'TEXT' },
    { name: 'v', type: 'ANY' },
    { name: 'my "col"', type: 'BLOB' }
  ],
  rows() {
    return [
      ['alpha', 1, new Uint8Array([1, 2])],
      ['beta', 3.5, null],
      ['gamma', 'text', new Uint8Array([9])]
    ];
  }
});

const allKv = db.prepare('SELECT rowid, k, v, "my ""col""" AS b FROM kv ORDER BY k').all() as {
  rowid: number;
  k: string;
  v: number | string;
  b: Uint8Array | null;
}[];
assert(allKv.length === 3, 'eponymous row count');
assert(allKv[0].rowid === 1 && allKv[0].k === 'alpha' && allKv[0].v === 1, 'row 0');
assert(allKv[0].b !== null && allKv[0].b.length === 2 && allKv[0].b[1] === 2, 'blob cell');
assert(allKv[1].rowid === 2 && allKv[1].k === 'beta' && allKv[1].v === 3.5 && allKv[1].b === null, 'row 1');
assert(allKv[2].rowid === 3 && allKv[2].k === 'gamma' && allKv[2].v === 'text', 'row 2');

const oneKv = db.prepare("SELECT k, v FROM kv WHERE k = 'beta'").get() as { k: string; v: number };
assert(oneKv.k === 'beta' && oneKv.v === 3.5, 'WHERE filter');

// 2. Hidden columns as table-valued function parameters + interleaved hidden/visible + JOIN reuse
db.createModule('seq', {
  columns: [
    { name: 'start', type: 'INTEGER', hidden: true },
    { name: 'val', type: 'INTEGER' },
    { name: 'stop', type: 'INTEGER', hidden: true },
    { name: 'tag', type: 'TEXT' }
  ],
  rows(start: number | null, stop: number | null) {
    const s = start === null ? 1 : start;
    const e = stop === null ? 3 : stop;
    const out: (number | string)[][] = [];
    for (let i = s; i <= e; i++) {
      out.push([i, `n${i}`]);
    }
    return out;
  }
});

const tvf = db.prepare('SELECT * FROM seq(2, 4)').all() as { val: number; tag: string }[];
assert(tvf.length === 3 && tvf[0].val === 2 && tvf[0].tag === 'n2' && tvf[2].val === 4, 'TVF args');

const tvfDefault = db.prepare('SELECT val FROM seq').all() as { val: number }[];
assert(tvfDefault.map((r) => r.val).join(',') === '1,2,3', 'unbound hidden defaults to null');

const tvfNull = db.prepare('SELECT val, start, stop FROM seq(NULL, 2)').all() as { val: number; start: number | null; stop: number | null }[];
assert(tvfNull.length === 2 && tvfNull[0].start === null && tvfNull[0].stop === 2, 'explicit NULL hidden arg');

const whereHidden = db.prepare('SELECT val, start, stop FROM seq WHERE stop = 4 AND start = 3').all() as {
  val: number;
  start: number;
  stop: number;
}[];
assert(whereHidden.length === 2 && whereHidden[0].val === 3 && whereHidden[0].start === 3 && whereHidden[0].stop === 4, 'WHERE on hidden');

const conflictHidden = db.prepare('SELECT val FROM seq WHERE start = 2 AND start = 3').all();
assert(conflictHidden.length === 0, 'conflicting EQ on hidden');

db.exec('CREATE TABLE bases (b INTEGER); INSERT INTO bases VALUES (10), (20);');
const joined = db.prepare('SELECT bases.b, s.val FROM bases JOIN seq(bases.b, bases.b + 1) AS s ORDER BY bases.b, s.val').all() as {
  b: number;
  val: number;
}[];
assert(joined.map((r) => `${r.b}:${r.val}`).join(',') === '10:10,10:11,20:20,20:21', 'JOIN cursor reuse');

// 3. Generator rows + early termination (LIMIT triggers finally)
let finallyCalled = false;
db.createModule('gen_mod', {
  columns: [{ name: 'x', type: 'INTEGER' }],
  rows: function* () {
    try {
      yield [10];
      yield [20];
      yield [30];
    } finally {
      finallyCalled = true;
    }
  }
});
const genLim = db.prepare('SELECT x FROM gen_mod LIMIT 1').all() as { x: number }[];
assert(genLim.length === 1 && genLim[0].x === 10, 'generator LIMIT 1');
assert(finallyCalled, 'generator finally runs on early close');

// 4. directOnly: allowed top-level, blocked in VIEW
db.createModule('direct_mod', {
  columns: [{ name: 'x', type: 'INTEGER' }],
  rows: () => [[42]],
  directOnly: true
});
db.exec('CREATE VIEW v_direct AS SELECT * FROM direct_mod');
const topDirect = db.prepare('SELECT x FROM direct_mod').get() as { x: number };
assert(topDirect.x === 42, 'directOnly top-level');
let directCode = '';
try {
  db.prepare('SELECT * FROM v_direct').all();
} catch (e: any) {
  directCode = e.code ?? '';
}
assert(directCode === 'ERR_SQLITE_ERROR', 'directOnly blocked in view');

// 5. useBigIntArguments
let gotBigIntType = '';
db.createModule('bi_mod', {
  columns: [
    { name: 'out', type: 'INTEGER' },
    { name: 'n', type: 'INTEGER', hidden: true }
  ],
  useBigIntArguments: true,
  rows(n: bigint) {
    gotBigIntType = typeof n;
    return [[n + 1n]];
  }
});
const biStmt = db.prepare('SELECT out FROM bi_mod(9007199254740993)');
biStmt.setReadBigInts(true);
const biRow = biStmt.get() as { out: bigint };
assert(gotBigIntType === 'bigint' && biRow.out === 9007199254740994n, 'useBigIntArguments');

db.createModule('no_bi', {
  columns: [
    { name: 'x', type: 'INTEGER' },
    { name: 'n', type: 'INTEGER', hidden: true }
  ],
  rows(_n: number | null) {
    return [[1]];
  }
});
let rangeCode = '';
try {
  db.prepare('SELECT * FROM no_bi(9007199254740993)').all();
} catch (e: any) {
  rangeCode = e.code ?? '';
}
assert(rangeCode === 'ERR_OUT_OF_RANGE', 'large int without useBigIntArguments');

// 6. Short / long rows & read-only DML error
db.createModule('short_row', {
  columns: [
    { name: 'a', type: 'INTEGER' },
    { name: 'b', type: 'TEXT' }
  ],
  rows() {
    return [[1], [2, 'two', 'extra']];
  }
});
const sr = db.prepare('SELECT a, b FROM short_row').all() as { a: number; b: string | null }[];
assert(sr.length === 2 && sr[0].a === 1 && sr[0].b === null && sr[1].a === 2 && sr[1].b === 'two', 'short and long rows');

let dmlCode = '';
try {
  db.exec("INSERT INTO short_row VALUES (1, 'a')");
} catch (e: any) {
  dmlCode = e.code ?? '';
}
assert(dmlCode === 'ERR_SQLITE_ERROR', 'read-only vtab rejects INSERT');

// 7. Errors inside rows() and generator
db.createModule('err_throw', {
  columns: [{ name: 'x', type: 'INTEGER' }],
  rows() {
    throw new RangeError('vtab boom');
  }
});
let throwMsg = '';
try {
  db.prepare('SELECT * FROM err_throw').all();
} catch (e: any) {
  throwMsg = e.message ?? '';
}
assert(throwMsg === 'vtab boom', 'rows() throw rethrown');

db.createModule('err_gen', {
  columns: [{ name: 'x', type: 'INTEGER' }],
  rows: function* () {
    yield [1];
    throw new TypeError('gen boom');
  }
});
let genThrowMsg = '';
try {
  db.prepare('SELECT * FROM err_gen').all();
} catch (e: any) {
  genThrowMsg = e.message ?? '';
}
assert(genThrowMsg === 'gen boom', 'generator throw rethrown');

db.createModule('err_not_iter', {
  columns: [{ name: 'x', type: 'INTEGER' }],
  rows: (() => 42) as any
});
let notIterCode = '';
try {
  db.prepare('SELECT * FROM err_not_iter').all();
} catch (e: any) {
  notIterCode = e.code ?? '';
}
assert(notIterCode === 'ERR_SQLITE_ERROR', 'non-iterable return throws ERR_SQLITE_ERROR');

db.createModule('err_cell', {
  columns: [{ name: 'x', type: 'ANY' }],
  rows: () => [[true as any]]
});
let cellErr = '';
try {
  db.prepare('SELECT * FROM err_cell').all();
} catch (e: any) {
  cellErr = e.message ?? '';
}
assert(cellErr === 'Returned JavaScript value cannot be converted to a SQLite value', 'unsupported cell value');

// 8. Validation errors & closed db
function expectCode(fn: () => void, code: string, label: string) {
  let got = '';
  try {
    fn();
  } catch (e: any) {
    got = e.code ?? '';
  }
  assert(got === code, `${label}: expected ${code}, got ${got}`);
}
expectCode(() => db.createModule(123 as any, {} as any), 'ERR_INVALID_ARG_TYPE', 'non-string name');
expectCode(() => db.createModule('bad1', null as any), 'ERR_INVALID_ARG_TYPE', 'null options');
expectCode(() => db.createModule('bad2', { columns: [], rows: () => [] }), 'ERR_INVALID_ARG_VALUE', 'empty columns');
expectCode(() => db.createModule('bad3', { columns: [{ name: 'a', type: 'FOO' as any }], rows: () => [] }), 'ERR_INVALID_ARG_VALUE', 'invalid column type');
expectCode(() => db.createModule('bad4', { columns: [{ name: 'a', type: 'TEXT' }], rows: null as any }), 'ERR_INVALID_ARG_TYPE', 'non-func rows');
expectCode(() => db.createModule('bad5', { columns: [{ name: 'a', type: 'TEXT' }], rows: () => [], directOnly: 'yes' as any }), 'ERR_INVALID_ARG_TYPE', 'bad directOnly');

db.close();
expectCode(() => db.createModule('after_close', { columns: [{ name: 'a', type: 'TEXT' }], rows: () => [] }), 'ERR_INVALID_STATE', 'closed db');
console.log('sqlite vtab ok');
