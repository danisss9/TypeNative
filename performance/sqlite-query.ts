// perf: `node:sqlite` `DatabaseSync(':memory:')` prepared bulk inserts and indexed `SELECT` queries
import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';

interface Row {
  id: number;
  score: number;
}

const start = performance.now();
let total = 0;

for (let pass = 0; pass < 12; pass++) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE items (id INTEGER PRIMARY KEY, grp INTEGER NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL);
    CREATE INDEX idx_items_grp ON items(grp);
  `);

  const insert = db.prepare('INSERT INTO items (id, grp, name, score) VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  for (let i = 0; i < 2000; i++) {
    insert.run(i + 1, i & 31, `item_${i}`, (i * 7 + pass) & 1023);
  }
  db.exec('COMMIT');

  const byId = db.prepare('SELECT id, score FROM items WHERE id = ?');
  for (let i = 1; i <= 2000; i++) {
    const row = byId.get(i) as unknown as Row;
    total += row.score;
  }

  const byGrp = db.prepare('SELECT id, score FROM items WHERE grp = ?');
  for (let g = 0; g < 32; g++) {
    const rows = byGrp.all(g) as unknown as Row[];
    for (let i = 0; i < rows.length; i++) total += rows[i].id;
  }

  db.close();
}

const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
