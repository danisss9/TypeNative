// db.serialize() / db.deserialize(): a database image as a Uint8Array, loaded
// into another connection (newer Node versions have these too)
import { DatabaseSync } from 'node:sqlite';

const source = new DatabaseSync(':memory:');
source.exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT); INSERT INTO notes (body) VALUES ('first'), ('second');");
const image = source.serialize();
assert(image.length > 0 && image.length % 512 === 0, `a page-sized image (${image.length} bytes)`);
assert(Buffer.from(image.subarray(0, 15)).toString() === 'SQLite format 3', 'the SQLite file header');

const copy = new DatabaseSync(':memory:');
copy.deserialize(image);
const rows = copy.prepare('SELECT body FROM notes ORDER BY id').all() as Array<{ body: string }>;
assert(rows.map((r) => r.body).join(',') === 'first,second', 'the copy has the rows');

copy.exec("INSERT INTO notes (body) VALUES ('third')");
const count = source.prepare('SELECT count(*) AS n FROM notes').get() as { n: number };
assert(count.n === 2, 'the copy is independent');

source.exec("ATTACH ':memory:' AS extra; CREATE TABLE extra.t (v); INSERT INTO extra.t VALUES (42);");
const attached = new DatabaseSync(':memory:');
attached.deserialize(source.serialize('extra'));
assert((attached.prepare('SELECT v FROM t').get() as { v: number }).v === 42, 'serialize(dbName)');
source.close();
copy.close();
attached.close();
console.log('serialize ok');
