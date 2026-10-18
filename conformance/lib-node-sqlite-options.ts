import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// readBigInts: INTEGER columns (and run() results) read as bigint
const db = new DatabaseSync(':memory:', { readBigInts: true });
db.exec('CREATE TABLE n (v INTEGER)');
const inserted = db.prepare('INSERT INTO n VALUES (?)').run(9007199254740993n);
assert(inserted.changes === 1n && inserted.lastInsertRowid === 1n, 'bigint run result');
const bigRow = db.prepare('SELECT v FROM n').get() as { v: bigint };
console.log(bigRow);
assert(bigRow.v === 9007199254740993n, 'readBigInts');
const stmt = db.prepare('SELECT v FROM n');
stmt.setReadBigInts(false);
let threw = false;
try {
  stmt.get();
} catch (e: any) {
  threw = e.code === 'ERR_OUT_OF_RANGE';
}
assert(threw, 'unsafe integer without readBigInts');
db.close();

// returnArrays: rows as arrays of column values
const arrays = new DatabaseSync(':memory:', { returnArrays: true });
const pair = arrays.prepare('SELECT 1 AS a, ? AS b').get('two') as unknown as [number, string];
console.log(pair);
assert(pair.length === 2 && pair[0] === 1 && pair[1] === 'two', 'returnArrays');
const objects = arrays.prepare('SELECT 1 AS a');
objects.setReturnArrays(false);
assert((objects.get() as { a: number }).a === 1, 'setReturnArrays(false)');
// prepare options override the database's
const prepared = arrays.prepare('SELECT 7 AS a', { returnArrays: false, readBigInts: true });
assert((prepared.get() as { a: bigint }).a === 7n, 'prepare options');
arrays.close();

// Named parameters: bare names can be turned off, unknown names allowed
const params = new DatabaseSync(':memory:');
const named = params.prepare('SELECT :a AS a, $b AS b');
const both = named.get({ a: 1, $b: 'x' }) as { a: number; b: string };
assert(both.a === 1 && both.b === 'x', 'bare and prefixed names');
named.setAllowBareNamedParameters(false);
let unknown = '';
try {
  named.get({ a: 1 });
} catch (e: any) {
  unknown = e.message;
}
console.log(unknown);
assert(unknown === "Unknown named parameter 'a'", 'bare names disabled');
named.setAllowUnknownNamedParameters(true);
const partial = named.get({ ':a': 5, extra: 1 }) as { a: number; b: null };
assert(partial.a === 5 && partial.b === null, 'unknown names ignored');
const lenient = new DatabaseSync(':memory:', { allowUnknownNamedParameters: true });
assert((lenient.prepare('SELECT :a AS a').get({ a: 2, z: 3 }) as { a: number }).a === 2, 'allowUnknownNamedParameters option');
lenient.close();

// columns(), sourceSQL, expandedSQL
params.exec('CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT)');
const select = params.prepare('SELECT id, name AS who, 1 + 1 AS two FROM people WHERE id = ?');
const cols = select.columns() as { column: string | null; database: string | null; name: string; table: string | null; type: string | null }[];
console.log(cols);
assert(cols.length === 3 && cols[1].name === 'who' && cols[1].column === 'name' && cols[1].table === 'people', 'columns()');
assert(cols[0].type === 'INTEGER' && cols[0].database === 'main' && cols[2].column === null && cols[2].type === null, 'columns() nulls');
assert(select.sourceSQL === 'SELECT id, name AS who, 1 + 1 AS two FROM people WHERE id = ?', 'sourceSQL');
select.get(42);
const insertPerson = params.prepare('INSERT INTO people (name) VALUES (?)');
insertPerson.run("o'neil");
console.log(insertPerson.expandedSQL);
assert(insertPerson.sourceSQL === 'INSERT INTO people (name) VALUES (?)', 'insert sourceSQL');

// Foreign keys are enforced by default
params.exec('CREATE TABLE pets (owner INTEGER REFERENCES people(id))');
let fkError = '';
try {
  params.prepare('INSERT INTO pets VALUES (99)').run();
} catch (e: any) {
  fkError = e.message;
}
assert(fkError === 'FOREIGN KEY constraint failed', 'foreign keys on');
const loose = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });
loose.exec('CREATE TABLE a (id INTEGER PRIMARY KEY); CREATE TABLE b (a_id INTEGER REFERENCES a(id))');
assert(loose.prepare('INSERT INTO b VALUES (5)').run().changes === 1, 'foreign keys off');
// Double-quoted strings are identifiers only, unless enabled
let dqs = '';
try {
  loose.exec('SELECT "nope"');
} catch (e: any) {
  dqs = e.message;
}
assert(dqs === 'no such column: "nope" - should this be a string literal in single-quotes?', 'double-quoted literals off');
loose.close();
const quoted = new DatabaseSync(':memory:', { enableDoubleQuotedStringLiterals: true });
assert((quoted.prepare('SELECT "yes" AS v').get() as { v: string }).v === 'yes', 'double-quoted literals on');
quoted.close();

// limits: read and set sqlite3_limit values
const limited = new DatabaseSync(':memory:', { limits: { length: 1000 } });
assert(limited.limits.length === 1000, 'limits option');
limited.limits.length = 50;
assert(limited.limits.length === 50, 'limits setter');
let tooBig = '';
try {
  limited.prepare("SELECT 'a string literal that is longer than fifty characters' AS s").get();
} catch (e: any) {
  tooBig = e.message;
}
assert(tooBig === 'string or blob too big', 'limit enforced');
limited.limits.length = Infinity;
assert(limited.limits.length === 1000000000, 'Infinity resets the limit');
assert(limited.limits.variableNumber === 32766 && limited.limits.attach === 10, 'default limits');
limited.close();

// createTagStore: sql`...` prepares one cached statement per template
const sql = params.createTagStore(2);
assert(sql.capacity === 2 && sql.size === 0, 'tag store capacity');
const id = 1;
const tagged = sql.get`SELECT name FROM people WHERE id = ${id}` as { name: string };
assert(tagged.name === "o'neil", 'tag store get');
sql.run`INSERT INTO people (name) VALUES (${'zed'})`;
assert(sql.all`SELECT id FROM people`.length === 2 && sql.size === 3 - 1, 'tag store all / cache size');
sql.clear();
assert(sql.size === 0, 'tag store clear');
params.close();

// A database file; open: false defers opening to open()
const dir = mkdtempSync(path.join(tmpdir(), 'tn-sqlite-'));
const file = path.join(dir, 'app.db');
const disk = new DatabaseSync(file, { open: false });
assert(!disk.isOpen, 'open: false');
disk.open();
disk.exec('CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT)');
disk.prepare('INSERT INTO kv VALUES (?, ?)').run('greeting', 'hello');
console.log(path.basename(disk.location() ?? ''));
assert(disk.location() === file, 'location()');
disk.close();
assert(existsSync(file), 'file written');

const reader = new DatabaseSync(file, { readOnly: true });
assert((reader.prepare('SELECT v FROM kv WHERE k = ?').get('greeting') as { v: string }).v === 'hello', 'read back');
let readOnlyError = '';
try {
  reader.exec("INSERT INTO kv VALUES ('x', 'y')");
} catch (e: any) {
  readOnlyError = e.message;
}
assert(readOnlyError === 'attempt to write a readonly database', 'readOnly');
reader.close();
rmSync(dir, { recursive: true, force: true });
console.log('sqlite options ok');
