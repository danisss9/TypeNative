// Statements nobody references any more are finalized after garbage
// collection (on the event loop); ones still referenced keep working
import { DatabaseSync, type StatementSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE t (x INTEGER)');
const insert = db.prepare('INSERT INTO t VALUES (?)');
const kept: StatementSync[] = [];
let round = 0;

function batch(): void {
  for (let i = 0; i < 1500; i++) {
    const row = db.prepare('SELECT ? + 1 AS y').get(i) as { y: number };
    assert(row.y === i + 1, 'a fresh statement runs');
  }
  kept.push(db.prepare(`SELECT ${round} AS r`));
  insert.run(round);
  round++;
  if (round < 20) {
    setImmediate(batch);
    return;
  }
  for (let r = 0; r < kept.length; r++) {
    assert((kept[r].get() as { r: number }).r === r, 'statements still referenced are not finalized');
  }
  assert((db.prepare('SELECT count(*) AS n FROM t').get() as { n: number }).n === 20, 'the kept insert statement works');
  db.close();
  console.log('finalize ok');
}
batch();
