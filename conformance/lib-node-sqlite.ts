import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
assert(db.isOpen && !db.isTransaction && db.location() === null, 'open in memory');

db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score REAL, avatar BLOB);
  CREATE TABLE tags (user_id INTEGER, tag TEXT);
`);

const insert = db.prepare('INSERT INTO users (name, score, avatar) VALUES (?, ?, ?)');
const first = insert.run('ann', 1.5, new Uint8Array([1, 2, 3]));
console.log(first);
assert(first.changes === 1 && first.lastInsertRowid === 1, 'run result');
insert.run('bob', null, null);
const third = insert.run('cy', 3, Buffer.from('hi'));
assert(third.lastInsertRowid === 3, 'lastInsertRowid');

// get: an object keyed by column name, undefined without a row
const byId = db.prepare('SELECT * FROM users WHERE id = ?');
const ann = byId.get(1);
console.log(ann);
assert(ann !== undefined, 'get row');
const typed = byId.get(1) as { id: number; name: string; score: number; avatar: Uint8Array };
assert(typed.id === 1 && typed.name === 'ann' && typed.score === 1.5, 'typed row');
assert(typed.avatar.length === 3 && typed.avatar[2] === 3, 'blob as Uint8Array');
const bob = byId.get(2) as { score: number | null; avatar: Uint8Array | null };
assert(bob.score === null && bob.avatar === null, 'NULL is null');
assert(byId.get(99) === undefined, 'no row');

// all: an array of rows, readable through an interface
interface User {
  id: number;
  name: string;
  score: number | null;
}
const users = db.prepare('SELECT id, name, score FROM users ORDER BY id').all() as unknown as User[];
console.log(users.length, users[2].name);
assert(users.length === 3 && users[0].name === 'ann' && users[2].score === 3, 'all');
const names = users.map((u) => u.name).join(',');
assert(names === 'ann,bob,cy', 'map over rows');

// iterate: rows one at a time (for...of and next())
const seen: string[] = [];
for (const row of db.prepare('SELECT name FROM users WHERE id > ? ORDER BY id').iterate(1)) {
  seen.push((row as { name: string }).name);
}
assert(seen.join(',') === 'bob,cy', 'iterate for...of');
const it = db.prepare('SELECT id FROM users WHERE id = 1').iterate();
const step1 = it.next();
const step2 = it.next();
assert(!step1.done && (step1.value as { id: number }).id === 1 && step2.done === true, 'iterator next()');

// Values round-trip with their SQLite types
const types = db.prepare('SELECT typeof(?) AS a, typeof(?) AS b, typeof(?) AS c, typeof(?) AS d, typeof(?) AS e').get(
  1,
  'x',
  null,
  new Uint8Array([0]),
  10n
) as Record<string, string>;
console.log(types);
assert(types.a === 'real' && types.b === 'text' && types.c === 'null' && types.d === 'blob' && types.e === 'integer', 'bound types');
const big = db.prepare('SELECT 9007199254740991 AS max, -5 AS neg, 2.5 AS real, x\'ff00\' AS blob, \'t\' AS text').get() as {
  max: number;
  neg: number;
  real: number;
  blob: Uint8Array;
  text: string;
};
assert(big.max === 9007199254740991 && big.neg === -5 && big.real === 2.5, 'numbers');
assert(big.blob.length === 2 && big.blob[0] === 255 && big.text === 't', 'blob / text literals');
// Booleans bind as the integers 1 / 0
const flags = db.prepare('SELECT ? AS yes, ? AS no, typeof(?) AS t').get(true as any, false as any, true as any) as { yes: number; no: number; t: string };
assert(flags.yes === 1 && flags.no === 0 && flags.t === 'integer', 'boolean parameters');

// Named parameters: :x / $x / @x, or bare names
db.prepare('INSERT INTO tags VALUES (:user, :tag)').run({ ':user': 1, ':tag': 'admin' });
db.prepare('INSERT INTO tags VALUES ($user, @tag)').run({ user: 2, tag: 'guest' });
db.prepare('INSERT INTO tags VALUES (:user, ?)').run({ user: 1 }, 'staff');
const tags = db.prepare('SELECT tag FROM tags WHERE user_id = :id ORDER BY tag').all({ id: 1 }) as { tag: string }[];
assert(tags.length === 2 && tags[0].tag === 'admin' && tags[1].tag === 'staff', 'named params');

// Transactions
db.exec('BEGIN');
assert(db.isTransaction, 'isTransaction in BEGIN');
insert.run('dee', 4, null);
db.exec('ROLLBACK');
assert(!db.isTransaction, 'isTransaction after ROLLBACK');
const count = db.prepare('SELECT count(*) AS n FROM users').get() as { n: number };
assert(count.n === 3, 'rolled back');

// UPDATE / DELETE report changes
const updated = db.prepare('UPDATE users SET score = score + 1 WHERE score IS NOT NULL').run();
assert(updated.changes === 2, 'update changes');
assert(db.prepare('DELETE FROM tags').run().changes === 3, 'delete changes');

db.close();
assert(!db.isOpen, 'closed');
db.open();
assert(db.isOpen, 'reopened');
db.close();
console.log('sqlite ok');
