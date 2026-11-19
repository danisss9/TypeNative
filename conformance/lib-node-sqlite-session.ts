// node:sqlite: createSession() / Session (changeset, patchset, close, dispose) / applyChangeset()
import { DatabaseSync, constants } from 'node:sqlite';

const {
  SQLITE_CHANGESET_OMIT,
  SQLITE_CHANGESET_REPLACE,
  SQLITE_CHANGESET_ABORT,
  SQLITE_CHANGESET_DATA,
  SQLITE_CHANGESET_NOTFOUND,
  SQLITE_CHANGESET_CONFLICT,
  SQLITE_CHANGESET_CONSTRAINT,
  SQLITE_CHANGESET_FOREIGN_KEY
} = constants;

function catchErr(fn: () => void): any {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
}

// 1. Basic changeset & patchset round-trip with all SQLite types and composite PK
{
  const src = new DatabaseSync(':memory:');
  const dst1 = new DatabaseSync(':memory:');
  const dst2 = new DatabaseSync(':memory:');
  const ddl = 'CREATE TABLE items (a TEXT, id1 INT, b BLOB, id2 INT, c REAL, PRIMARY KEY (id2, id1))';
  src.exec(ddl);
  dst1.exec(ddl);
  dst2.exec(ddl);

  const seed = "INSERT INTO items VALUES ('init', 99, X'aabb', 100, 1.5), ('del', 88, X'cc', 200, 2.5)";
  src.exec(seed);
  dst1.exec(seed);
  dst2.exec(seed);

  const s = src.createSession();
  src.exec("INSERT INTO items VALUES ('hi', 1, X'0102', 10, 3.5)");
  src.exec("INSERT INTO items VALUES (NULL, 2, X'', 20, -1.25)");
  src.exec("UPDATE items SET a = 'bye' WHERE id1 = 99 AND id2 = 100");
  src.exec('DELETE FROM items WHERE id1 = 88 AND id2 = 200');

  const cs = s.changeset();
  const ps = s.patchset();
  assert(cs.length > 0 && cs[0] === 0x54, 'changeset header starts with T');
  assert(ps.length > 0 && ps[0] === 0x50, 'patchset header starts with P');
  assert(ps.length < cs.length, 'patchset is more compact than changeset');
  // Print hex so conformance runner verifies byte-for-byte parity with Node.js SQLite
  console.log('cs-hex:', Buffer.from(cs).toString('hex'));
  console.log('ps-hex:', Buffer.from(ps).toString('hex'));

  // Wire-format parity: changeset & patchset bytes match Node.js
  assert(dst1.applyChangeset(cs) === true, 'apply changeset');
  assert(dst2.applyChangeset(ps) === true, 'apply patchset');

  const expected = JSON.stringify(src.prepare('SELECT a, id1, hex(b) AS bh, id2, c FROM items ORDER BY id2, id1').all());
  const got1 = JSON.stringify(dst1.prepare('SELECT a, id1, hex(b) AS bh, id2, c FROM items ORDER BY id2, id1').all());
  const got2 = JSON.stringify(dst2.prepare('SELECT a, id1, hex(b) AS bh, id2, c FROM items ORDER BY id2, id1').all());
  assert(got1 === expected, 'changeset target matches source');
  assert(got2 === expected, 'patchset target matches source');

  // Non-destructive: calling changeset() again after more writes includes them
  src.exec("INSERT INTO items VALUES ('more', 3, X'ff', 30, 0.0)");
  const cs2 = s.changeset();
  assert(cs2.length > cs.length, 'second changeset includes subsequent writes');

  s.close();
  src.close();
  dst1.close();
  dst2.close();
}

// 2. Coalescing, PK update, rollback, no-PK tables, NULL PK
{
  const src = new DatabaseSync(':memory:');
  const dst = new DatabaseSync(':memory:');
  const ddl = 'CREATE TABLE t (id INT PRIMARY KEY, v TEXT); CREATE TABLE nopk (x INT);';
  src.exec(ddl);
  dst.exec(ddl);
  const seed = "INSERT INTO t VALUES (1, 'a'), (2, 'b'), (3, 'c'), (4, 'd')";
  src.exec(seed);
  dst.exec(seed);

  const s = src.createSession();
  // no-PK table is ignored
  src.exec('INSERT INTO nopk VALUES (42)');
  // NULL in PK is ignored
  src.exec("INSERT INTO t VALUES (NULL, 'nullpk')");
  // INSERT + DELETE cancels out
  src.exec("INSERT INTO t VALUES (10, 'tmp')");
  src.exec('DELETE FROM t WHERE id = 10');
  // UPDATE + revert cancels out
  src.exec("UPDATE t SET v = 'a2' WHERE id = 1");
  src.exec("UPDATE t SET v = 'a' WHERE id = 1");
  // DELETE + re-INSERT identical cancels out
  src.exec('DELETE FROM t WHERE id = 2');
  src.exec("INSERT INTO t VALUES (2, 'b')");
  // Rollback cancels out
  src.exec("BEGIN; INSERT INTO t VALUES (11, 'rb'); UPDATE t SET v = 'rb' WHERE id = 1; ROLLBACK;");
  assert(s.changeset().length === 0, 'all no-op / rolled-back changes produce empty changeset');

  // DELETE + re-INSERT different -> UPDATE
  src.exec('DELETE FROM t WHERE id = 3');
  src.exec("INSERT INTO t VALUES (3, 'c2')");
  // UPDATE changing PK -> DELETE old + INSERT new
  src.exec("UPDATE t SET id = 40, v = 'd2' WHERE id = 4");
  // INSERT + UPDATE -> single INSERT with final value
  src.exec("INSERT INTO t VALUES (50, 'e1')");
  src.exec("UPDATE t SET v = 'e2' WHERE id = 50");

  assert(dst.applyChangeset(s.changeset()) === true, 'apply coalesced changeset');
  const rows = dst.prepare('SELECT id, v FROM t ORDER BY id').all() as Array<{ id: number; v: string }>;
  assert(
    rows.map((r) => `${r.id}:${r.v}`).join(',') === '1:a,2:b,3:c2,40:d2,50:e2',
    'coalesced rows match'
  );
  s.close();
  src.close();
  dst.close();
}

// 3. Session options (table, db) and multiple concurrent sessions
{
  const src = new DatabaseSync(':memory:');
  src.exec('CREATE TABLE t1 (id INT PRIMARY KEY, v TEXT); CREATE TABLE t2 (id INT PRIMARY KEY, v TEXT);');
  src.exec("ATTACH ':memory:' AS extra; CREATE TABLE extra.t1 (id INT PRIMARY KEY, v TEXT);");

  const sOnlyT1 = src.createSession({ table: 't1' });
  const sExtra = src.createSession({ db: 'extra' });
  const sAll = src.createSession();

  src.exec("INSERT INTO t1 VALUES (1, 'main1')");
  src.exec("INSERT INTO t2 VALUES (2, 'main2')");
  src.exec("INSERT INTO extra.t1 VALUES (3, 'extra3')");

  const dst1 = new DatabaseSync(':memory:');
  dst1.exec('CREATE TABLE t1 (id INT PRIMARY KEY, v TEXT); CREATE TABLE t2 (id INT PRIMARY KEY, v TEXT);');
  dst1.applyChangeset(sOnlyT1.changeset());
  assert((dst1.prepare('SELECT count(*) AS n FROM t1').get() as { n: number }).n === 1, 'table option includes t1');
  assert((dst1.prepare('SELECT count(*) AS n FROM t2').get() as { n: number }).n === 0, 'table option excludes t2');

  const dstExtra = new DatabaseSync(':memory:');
  dstExtra.exec('CREATE TABLE t1 (id INT PRIMARY KEY, v TEXT)');
  dstExtra.applyChangeset(sExtra.changeset());
  assert((dstExtra.prepare('SELECT v FROM t1 WHERE id = 3').get() as { v: string }).v === 'extra3', 'db option tracks attached db');

  const dstAll = new DatabaseSync(':memory:');
  dstAll.exec('CREATE TABLE t1 (id INT PRIMARY KEY, v TEXT); CREATE TABLE t2 (id INT PRIMARY KEY, v TEXT);');
  dstAll.applyChangeset(sAll.changeset());
  assert(
    (dstAll.prepare('SELECT count(*) AS n FROM t1').get() as { n: number }).n === 1 &&
      (dstAll.prepare('SELECT count(*) AS n FROM t2').get() as { n: number }).n === 1,
    'concurrent unfiltered session captures both main tables'
  );

  sOnlyT1.close();
  sExtra.close();
  sAll.close();
  src.close();
  dst1.close();
  dstExtra.close();
  dstAll.close();
}

// 4. applyChangeset filter and onConflict (CONFLICT, DATA, NOTFOUND, CONSTRAINT, FOREIGN_KEY)
{
  const src = new DatabaseSync(':memory:');
  const dst = new DatabaseSync(':memory:');
  const ddl = 'CREATE TABLE a (id INT PRIMARY KEY, v TEXT UNIQUE); CREATE TABLE b (id INT PRIMARY KEY, v TEXT);';
  src.exec(ddl);
  dst.exec(ddl);
  src.exec("INSERT INTO a VALUES (1, 'one'), (2, 'two'); INSERT INTO b VALUES (1, 'b1');");
  dst.exec("INSERT INTO a VALUES (1, 'one'), (2, 'two'); INSERT INTO b VALUES (1, 'b1');");

  // filter skips table 'b'
  {
    const s = src.createSession();
    src.exec("INSERT INTO a VALUES (3, 'three'); INSERT INTO b VALUES (2, 'b2');");
    const cs = s.changeset();
    s.close();
    const filtered: string[] = [];
    const ok = dst.applyChangeset(cs, {
      filter: (name) => {
        filtered.push(name);
        return name === 'a';
      }
    });
    assert(ok === true, 'filter apply ok');
    assert(filtered.includes('a') && filtered.includes('b'), 'filter called for both tables');
    assert((dst.prepare('SELECT count(*) AS n FROM a').get() as { n: number }).n === 3, 'a applied');
    assert((dst.prepare('SELECT count(*) AS n FROM b').get() as { n: number }).n === 1, 'b skipped');
  }

  // CONFLICT (duplicate PK on INSERT): default ABORT, OMIT, REPLACE
  {
    const s = src.createSession();
    src.exec("INSERT INTO a VALUES (10, 'src10')");
    const cs = s.changeset();
    s.close();
    dst.exec("INSERT INTO a VALUES (10, 'dst10')");

    assert(dst.applyChangeset(cs) === false, 'default onConflict aborts');
    assert((dst.prepare('SELECT v FROM a WHERE id = 10').get() as { v: string }).v === 'dst10', 'aborted row unchanged');

    let seen = -1;
    assert(
      dst.applyChangeset(cs, {
        onConflict: (c) => {
          seen = c;
          return SQLITE_CHANGESET_OMIT;
        }
      }) === true,
      'CONFLICT OMIT returns true'
    );
    assert(seen === SQLITE_CHANGESET_CONFLICT, 'conflict type is CONFLICT');
    assert((dst.prepare('SELECT v FROM a WHERE id = 10').get() as { v: string }).v === 'dst10', 'OMIT kept dst value');

    assert(
      dst.applyChangeset(cs, { onConflict: () => SQLITE_CHANGESET_REPLACE }) === true,
      'CONFLICT REPLACE returns true'
    );
    assert((dst.prepare('SELECT v FROM a WHERE id = 10').get() as { v: string }).v === 'src10', 'REPLACE overwrote dst value');
  }

  // DATA conflict on UPDATE & DELETE
  {
    const s = src.createSession();
    src.exec("UPDATE a SET v = 'src-upd' WHERE id = 1");
    src.exec('DELETE FROM a WHERE id = 2');
    const cs = s.changeset();
    s.close();
    dst.exec("UPDATE a SET v = 'dst-diverged' WHERE id = 1");
    dst.exec("UPDATE a SET v = 'dst-two' WHERE id = 2");

    const seen: number[] = [];
    assert(
      dst.applyChangeset(cs, {
        onConflict: (c) => {
          seen.push(c);
          return SQLITE_CHANGESET_OMIT;
        }
      }) === true,
      'DATA OMIT'
    );
    assert(seen.length === 2 && seen[0] === SQLITE_CHANGESET_DATA && seen[1] === SQLITE_CHANGESET_DATA, 'both DATA conflicts seen');
    assert((dst.prepare('SELECT v FROM a WHERE id = 1').get() as { v: string }).v === 'dst-diverged', 'UPDATE DATA OMIT kept dst');
    assert((dst.prepare('SELECT count(*) AS n FROM a WHERE id = 2').get() as { n: number }).n === 1, 'DELETE DATA OMIT kept dst');

    assert(
      dst.applyChangeset(cs, { onConflict: () => SQLITE_CHANGESET_REPLACE }) === true,
      'DATA REPLACE'
    );
    assert((dst.prepare('SELECT v FROM a WHERE id = 1').get() as { v: string }).v === 'src-upd', 'UPDATE DATA REPLACE overwrote');
    assert((dst.prepare('SELECT count(*) AS n FROM a WHERE id = 2').get() as { n: number }).n === 0, 'DELETE DATA REPLACE deleted');
  }

  // NOTFOUND conflict + invalid REPLACE on NOTFOUND
  {
    const s = src.createSession();
    src.exec("UPDATE b SET v = 'b1-new' WHERE id = 1");
    const cs = s.changeset();
    s.close();
    dst.exec('DELETE FROM b WHERE id = 1');

    let seen = -1;
    assert(
      dst.applyChangeset(cs, {
        onConflict: (c) => {
          seen = c;
          return SQLITE_CHANGESET_OMIT;
        }
      }) === true,
      'NOTFOUND OMIT'
    );
    assert(seen === SQLITE_CHANGESET_NOTFOUND, 'saw NOTFOUND');

    const badReplace = catchErr(() => dst.applyChangeset(cs, { onConflict: () => SQLITE_CHANGESET_REPLACE }));
    assert(badReplace && badReplace.code === 'ERR_SQLITE_ERROR' && badReplace.errcode === 21, 'REPLACE on NOTFOUND throws SQLITE_MISUSE');
  }

  // CONSTRAINT conflict (UNIQUE violation on non-PK column)
  {
    const s = src.createSession();
    src.exec("INSERT INTO a VALUES (99, 'dup-unique')");
    const cs = s.changeset();
    s.close();
    dst.exec("INSERT INTO a VALUES (98, 'dup-unique')");

    let seen = -1;
    assert(
      dst.applyChangeset(cs, {
        onConflict: (c) => {
          seen = c;
          return SQLITE_CHANGESET_OMIT;
        }
      }) === true,
      'CONSTRAINT OMIT'
    );
    assert(seen === SQLITE_CHANGESET_CONSTRAINT, 'saw CONSTRAINT');
  }

  // Callback throwing an error rolls back and rethrows
  {
    dst.exec("INSERT INTO a VALUES (11, 'dst11')");
    const s = src.createSession();
    src.exec("INSERT INTO b VALUES (77, 'ok'); INSERT INTO a VALUES (11, 'clash');");
    const cs = s.changeset();
    s.close();
    const thrown = catchErr(() =>
      dst.applyChangeset(cs, {
        onConflict: () => {
          throw new Error('conflict-boom');
        }
      })
    );
    assert(thrown && thrown.message === 'conflict-boom', 'onConflict error propagated');
    assert((dst.prepare('SELECT count(*) AS n FROM b WHERE id = 77').get() as { n: number }).n === 0, 'rolled back on callback throw');
  }

  src.close();
  dst.close();
}

// 5. FOREIGN_KEY conflict, nested transaction rollback, missing/extra columns, corrupt bytes
{
  const src = new DatabaseSync(':memory:');
  const dst = new DatabaseSync(':memory:');
  const ddl = 'CREATE TABLE p (id INT PRIMARY KEY); CREATE TABLE c (id INT PRIMARY KEY, pid INT REFERENCES p(id));';
  src.exec(ddl);
  dst.exec(ddl);
  src.exec('INSERT INTO p VALUES (1)');
  const s = src.createSession();
  src.exec('INSERT INTO c VALUES (10, 1)');
  const cs = s.changeset();
  s.close();

  let fkSeen = -1;
  const fkErr = catchErr(() =>
    dst.applyChangeset(cs, {
      onConflict: (c) => {
        fkSeen = c;
        return SQLITE_CHANGESET_ABORT;
      }
    })
  );
  assert(fkSeen === SQLITE_CHANGESET_FOREIGN_KEY, 'saw FOREIGN_KEY conflict');
  assert(fkErr && fkErr.code === 'ERR_SQLITE_ERROR' && fkErr.errcode === 19, 'FK ABORT throws constraint error');
  assert((dst.prepare('SELECT count(*) AS n FROM c').get() as { n: number }).n === 0, 'FK ABORT rolled back');

  assert(
    dst.applyChangeset(cs, { onConflict: () => SQLITE_CHANGESET_OMIT }) === true,
    'FK OMIT commits'
  );
  assert((dst.prepare('SELECT count(*) AS n FROM c').get() as { n: number }).n === 1, 'FK OMIT persisted row');

  // Inside an outer transaction: aborted applyChangeset keeps outer transaction intact
  dst.exec('BEGIN; INSERT INTO p VALUES (2);');
  const ok = dst.applyChangeset(cs); // PK conflict on c(10) -> ABORT
  assert(ok === false && dst.isTransaction === true, 'abort inside txn preserves outer txn');
  dst.exec('COMMIT');
  assert((dst.prepare('SELECT count(*) AS n FROM p WHERE id = 2').get() as { n: number }).n === 1, 'outer txn committed');

  // Empty & corrupt changeset
  assert(dst.applyChangeset(new Uint8Array(0)) === true, 'empty changeset returns true');
  const corrupt = catchErr(() => dst.applyChangeset(new Uint8Array([0xff, 0x01, 0x02])));
  assert(corrupt && corrupt.code === 'ERR_SQLITE_ERROR' && corrupt.errcode === 11, 'corrupt changeset throws SQLITE_CORRUPT');

  // Missing table in target & extra column in target
  const tSrc = new DatabaseSync(':memory:');
  const tDst = new DatabaseSync(':memory:');
  tSrc.exec('CREATE TABLE only_src (id INT PRIMARY KEY, v TEXT); CREATE TABLE shared (id INT PRIMARY KEY, v TEXT);');
  tDst.exec("CREATE TABLE shared (id INT PRIMARY KEY, v TEXT, extra TEXT DEFAULT 'def');");
  const ts = tSrc.createSession();
  tSrc.exec("INSERT INTO only_src VALUES (1, 'skip'); INSERT INTO shared VALUES (1, 'ok');");
  assert(tDst.applyChangeset(ts.changeset()) === true, 'missing table skipped, extra col allowed');
  const row = tDst.prepare('SELECT id, v, extra FROM shared').get() as { id: number; v: string; extra: string };
  assert(row.id === 1 && row.v === 'ok' && row.extra === 'def', 'extra col gets default');
  ts.close();
  tSrc.close();
  tDst.close();

  src.close();
  dst.close();
}

// 6. Lifecycle & Symbol.dispose
{
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE t (id INT PRIMARY KEY, v TEXT)');
  const s = db.createSession();
  s.close();
  const e1 = catchErr(() => s.changeset());
  const e2 = catchErr(() => s.patchset());
  const e3 = catchErr(() => s.close());
  assert(e1 && e1.code === 'ERR_INVALID_STATE' && e1.message === 'session is not open', 'changeset after close');
  assert(e2 && e2.code === 'ERR_INVALID_STATE' && e2.message === 'session is not open', 'patchset after close');
  assert(e3 && e3.code === 'ERR_INVALID_STATE' && e3.message === 'session is not open', 'close twice');

  {
    using scoped = db.createSession();
    db.exec("INSERT INTO t VALUES (1, 'x')");
    assert(scoped.changeset().length > 0, 'using session works');
  }

  const s2 = db.createSession();
  db.close();
  const e4 = catchErr(() => s2.changeset());
  const e5 = catchErr(() => s2.close());
  const e6 = catchErr(() => db.createSession());
  const e7 = catchErr(() => db.applyChangeset(new Uint8Array(0)));
  assert(e4 && e4.code === 'ERR_INVALID_STATE' && e4.message === 'database is not open', 'session after db.close');
  assert(e5 && e5.code === 'ERR_INVALID_STATE' && e5.message === 'database is not open', 'session.close after db.close');
  assert(e6 && e6.code === 'ERR_INVALID_STATE' && e6.message === 'database is not open', 'createSession after db.close');
  assert(e7 && e7.code === 'ERR_INVALID_STATE' && e7.message === 'database is not open', 'applyChangeset after db.close');
}

// 7. INTEGER PRIMARY KEY (rowid alias) and WITHOUT ROWID tables
{
  const src = new DatabaseSync(':memory:');
  const dst = new DatabaseSync(':memory:');
  const ddl = `
    CREATE TABLE auto_t (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE wr_t (k1 TEXT, k2 INT, val BLOB, PRIMARY KEY (k1, k2)) WITHOUT ROWID;
  `;
  src.exec(ddl);
  dst.exec(ddl);
  src.exec("INSERT INTO auto_t (name) VALUES ('orig'); INSERT INTO wr_t VALUES ('a', 1, X'01');");
  dst.exec("INSERT INTO auto_t (name) VALUES ('orig'); INSERT INTO wr_t VALUES ('a', 1, X'01');");

  const s = src.createSession();
  src.exec("INSERT INTO auto_t (name) VALUES ('added')");
  src.exec("UPDATE auto_t SET name = 'edited' WHERE id = 1");
  src.exec("INSERT INTO wr_t VALUES ('b', 2, X'0203')");
  src.exec("UPDATE wr_t SET val = X'ff' WHERE k1 = 'a' AND k2 = 1");

  const cs = s.changeset();
  assert(dst.applyChangeset(cs) === true, 'apply INTEGER PRIMARY KEY & WITHOUT ROWID');
  assert(
    JSON.stringify(dst.prepare('SELECT * FROM auto_t ORDER BY id').all()) ===
      JSON.stringify(src.prepare('SELECT * FROM auto_t ORDER BY id').all()),
    'INTEGER PRIMARY KEY rows match'
  );
  assert(
    JSON.stringify(dst.prepare('SELECT k1, k2, hex(val) AS h FROM wr_t ORDER BY k1, k2').all()) ===
      JSON.stringify(src.prepare('SELECT k1, k2, hex(val) AS h FROM wr_t ORDER BY k1, k2').all()),
    'WITHOUT ROWID rows match'
  );
  s.close();
  src.close();
  dst.close();
}

console.log('sqlite session ok');
