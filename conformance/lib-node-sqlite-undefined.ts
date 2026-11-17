// `undefined` as a parameter value binds NULL (as Node 26 does; Node 24 threw)
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, value TEXT, note TEXT)');
const insert = db.prepare('INSERT INTO t (value, note) VALUES (?, ?)');
insert.run('a', undefined as any);
insert.run(undefined as any, 'b');

interface Row {
  id: number;
  value: string | null;
  note: string | null;
}
const rows = db.prepare('SELECT id, value, note FROM t ORDER BY id').all() as unknown as Row[];
assert(rows.length === 2, 'two rows');
assert(rows[0].value === 'a' && rows[0].note === null, 'a trailing undefined binds NULL');
assert(rows[1].value === null && rows[1].note === 'b', 'a leading undefined binds NULL');

const bound = db.prepare('SELECT ? AS v').get(undefined as any) as { v: string | null };
assert(bound.v === null, 'the bound value reads back as NULL');

const counted = db.prepare('SELECT count(*) AS n FROM t WHERE value IS NULL').get() as { n: number };
assert(counted.n === 1, 'SQL sees a real NULL');
db.close();
