import { DatabaseSync, backup } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL)');

// SQLite errors: SQLite's message, code ERR_SQLITE_ERROR, errcode and errstr
function sqliteError(fn: () => void): any {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
}

const syntax = sqliteError(() => db.exec('SELEC 1'));
console.log(syntax.message, syntax.code, syntax.errcode, syntax.errstr);
assert(syntax instanceof Error && syntax.message === 'near "SELEC": syntax error', 'syntax error message');
assert(syntax.code === 'ERR_SQLITE_ERROR' && syntax.errcode === 1 && syntax.errstr === 'SQL logic error', 'syntax error fields');

const missing = sqliteError(() => db.prepare('SELECT * FROM nope'));
assert(missing.message === 'no such table: nope', 'missing table');
const empty = sqliteError(() => db.prepare(''));
assert(empty.code === 'ERR_INVALID_ARG_VALUE' && empty.message === 'The SQL query contains no statements.', 'empty SQL');

db.prepare('INSERT INTO t (email) VALUES (?)').run('a@x');
const unique = sqliteError(() => db.prepare('INSERT INTO t (email) VALUES (?)').run('a@x'));
console.log(unique.message, unique.errcode, unique.errstr);
assert(unique.message === 'UNIQUE constraint failed: t.email' && unique.errcode === 2067 && unique.errstr === 'constraint failed', 'unique constraint');
const notNull = sqliteError(() => db.prepare('INSERT INTO t (email) VALUES (?)').run(null));
assert(notNull.message === 'NOT NULL constraint failed: t.email' && notNull.errcode === 1299, 'not null constraint');

// Values that cannot be bound or read
const hugeBigInt = sqliteError(() => db.prepare('SELECT ?').get(2n ** 70n));
assert(hugeBigInt.code === 'ERR_INVALID_ARG_VALUE' && hugeBigInt.message === 'BigInt value is too large to bind.', 'bigint too large');
db.exec('INSERT INTO t VALUES (9007199254740993, \'big@x\')');
const unsafe = sqliteError(() => db.prepare('SELECT id FROM t WHERE email = ?').get('big@x'));
assert(unsafe.code === 'ERR_OUT_OF_RANGE' && unsafe.message === 'Value is too large to be represented as a JavaScript number: 9007199254740993', 'unsafe integer');
const unknownName = sqliteError(() => db.prepare('SELECT :a').get({ b: 1 }));
assert(unknownName.code === 'ERR_INVALID_STATE' && unknownName.message === "Unknown named parameter 'b'", 'unknown named parameter');
const conflict = sqliteError(() => db.prepare('SELECT :a, $a').get({ a: 1 }));
assert(conflict.message === "Cannot create bare named parameter 'a' because of conflicting names ':a' and '$a'.", 'conflicting bare names');

// Opening a database that cannot be opened
const unopenable = sqliteError(() => new DatabaseSync(path.join(tmpdir(), 'tn-no-such-dir', 'x', 'y.db')));
assert(unopenable.message === 'unable to open database file' && unopenable.errcode === 14, 'unable to open');

// A database and its statements after close()
const stmt = db.prepare('SELECT 1');
db.close();
const closed = sqliteError(() => db.exec('SELECT 1'));
assert(closed.code === 'ERR_INVALID_STATE' && closed.message === 'database is not open', 'closed database');
const finalized = sqliteError(() => stmt.get());
assert(finalized.code === 'ERR_INVALID_STATE' && finalized.message === 'statement has been finalized', 'finalized statement');
const closedTwice = sqliteError(() => db.close());
assert(closedTwice.message === 'database is not open', 'close twice');
const reopened = new DatabaseSync(':memory:', { open: false });
reopened.open();
const openTwice = sqliteError(() => reopened.open());
assert(openTwice.code === 'ERR_INVALID_STATE' && openTwice.message === 'database is already open', 'open twice');
reopened.close();

// backup(): copies a database to a file, page by page
const dir = mkdtempSync(path.join(tmpdir(), 'tn-sqlite-backup-'));
const source = new DatabaseSync(':memory:');
source.exec('CREATE TABLE items (n INTEGER, pad TEXT)');
const insert = source.prepare('INSERT INTO items VALUES (?, ?)');
for (let i = 0; i < 200; i++) insert.run(i, 'x'.repeat(100));

async function main(): Promise<void> {
  let calls = 0;
  const target = path.join(dir, 'copy.db');
  const pages = await backup(source, target, {
    rate: 1,
    progress: (info) => {
      calls++;
      assert(info.totalPages > 0 && info.remainingPages < info.totalPages, 'progress info');
    }
  });
  console.log('pages', pages > 1, 'progress calls', calls > 0);
  assert(pages > 1 && calls > 0, 'backup pages');
  const copy = new DatabaseSync(target, { readOnly: true });
  const count = copy.prepare('SELECT count(*) AS n, sum(n) AS total FROM items').get() as { n: number; total: number };
  assert(count.n === 200 && count.total === 19900, 'backup contents');
  copy.close();
  let rejected = '';
  try {
    await backup(source, path.join(dir, 'other.db'), { source: 'nope' });
  } catch (e: any) {
    rejected = e.message;
  }
  console.log(rejected);
  assert(rejected !== '', 'backup of a missing schema rejects');
  source.close();
  rmSync(dir, { recursive: true, force: true });
  console.log('sqlite errors ok');
}

main();
