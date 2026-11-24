// MongoDB CLI powered by the official `mongodb` 7.9.1 Node.js driver and
// `bson` 7.3.4, compiled from upstream TypeScript into a single native binary.
//
// Runs under both Node.js (`node run-node.mjs ...`) and a compiled TypeNative
// binary (`typenative --source main.ts --output dist/mongodb-driver`).
//
// Commands:
//   ping <uri>                             Connect and run `{ ping: 1 }`
//   crud <uri> [db] [collection]           Full CRUD + aggregate round-trip
//   insert <uri> <db> <collection> <json>  Insert a JSON/EJSON document
//   query <uri> <db> <collection> [json]   Find documents matching a filter
//   bench-wire <uri> [ops=500]             Pooled OP_MSG throughput workload
//   bson-roundtrip                         Rich BSON + EJSON type corpus check
//   bson-bench [docs=5000]                 BSON serialize + deserialize benchmark
//   --help                                 Print usage

import { MongoClient } from './vendor/mongodb/src/mongo_client.ts';
import {
  Binary,
  BSON,
  BSONRegExp,
  Code,
  DBRef,
  Decimal128,
  Double,
  EJSON,
  Int32,
  Long,
  MaxKey,
  MinKey,
  ObjectId,
  Timestamp
} from './vendor/bson/src/index.ts';

const HELP = `Usage: mongodb-driver <command> [args...]

Commands:
  ping <uri>                             Connect and run { ping: 1 }
  crud <uri> [db] [collection]           Run insert/find/update/aggregate/delete lifecycle
  insert <uri> <db> <collection> <json>  Insert a JSON/EJSON document
  query <uri> <db> <collection> [json]   Query documents and print EJSON
  bench-wire <uri> [ops=500]             Run pooled OP_MSG round-trips
  bson-roundtrip                         Verify BSON & EJSON round-trip across BSON types
  bson-bench [docs=5000]                 Serialize and deserialize N nested BSON documents
  --help                                 Show this message`;

function buildCorpusDocuments(): Record<string, any>[] {
  const fixedOid = new ObjectId('65f0a1b2c3d4e5f60718293a');
  const fixedDate = new Date('2025-03-15T12:34:56.789Z');
  const payload = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);

  return [
    {
      _id: fixedOid,
      kind: 'primitives',
      str: 'hello mongodb native',
      unicode: 'caf\u00e9 \u2603 \u65e5\u672c\u8a9e',
      empty: '',
      boolTrue: true,
      boolFalse: false,
      nil: null,
      intZero: 0,
      intPos: 42,
      intNeg: -123456,
      floatVal: 3.141592653589793,
      int32: new Int32(2147483647),
      dbl: new Double(1.5)
    },
    {
      _id: new ObjectId('65f0a1b2c3d4e5f60718293b'),
      kind: 'bson-types',
      longPos: Long.fromString('9223372036854775807'),
      longNeg: Long.fromString('-9223372036854775808'),
      longZero: Long.ZERO,
      decimal: Decimal128.fromString('1234567890.123456789'),
      ts: new Timestamp({ t: 1700000000, i: 7 }),
      bin: new Binary(payload, 0),
      date: fixedDate,
      regex: new BSONRegExp('^mongo.*native$', 'i'),
      min: new MinKey(),
      max: new MaxKey(),
      code: new Code('function() { return 1; }'),
      ref: new DBRef('users', fixedOid, 'app')
    },
    {
      _id: new ObjectId('65f0a1b2c3d4e5f60718293c'),
      kind: 'nested',
      tags: ['driver', 'bson', 'op_msg', 'native'],
      matrix: [
        [1, 2, 3],
        [4, 5, 6]
      ],
      profile: {
        name: 'Ada Lovelace',
        scores: [98, 99, 100],
        meta: { active: true, tier: 'pro', balance: Decimal128.fromString('42.50') }
      }
    }
  ];
}

function runBsonRoundtrip(): void {
  const docs = buildCorpusDocuments();
  const out: any[] = [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const bytes1 = BSON.serialize(doc);
    const decoded = BSON.deserialize(bytes1, { promoteValues: false });
    const bytes2 = BSON.serialize(decoded);
    if (bytes1.length !== bytes2.length) {
      throw new Error(`BSON byte length mismatch at doc ${i}: ${bytes1.length} vs ${bytes2.length}`);
    }
    for (let j = 0; j < bytes1.length; j++) {
      if (bytes1[j] !== bytes2[j]) {
        throw new Error(`BSON byte mismatch at doc ${i} offset ${j}`);
      }
    }
    const canonical = EJSON.stringify(decoded, { relaxed: false });
    const reparsed = EJSON.parse(canonical, { relaxed: false });
    const bytes3 = BSON.serialize(reparsed);
    out.push({
      kind: doc.kind,
      bytes: bytes1.length,
      ejsonBytes: bytes3.length,
      ejson: canonical
    });
  }
  console.log(JSON.stringify(out, null, 2));
}

function makeBenchDoc(i: number): Record<string, any> {
  const hex = i.toString(16).padStart(24, '0');
  return {
    _id: new ObjectId(hex),
    seq: i,
    tenant: `tenant-${i % 16}`,
    title: `Order #${i} for region-${i % 8}`,
    active: (i & 1) === 0,
    amount: (i % 1000) * 1.25 + 0.5,
    createdAt: new Date(1700000000000 + i * 1000),
    tags: ['alpha', 'beta', `bucket-${i % 32}`, `shard-${i % 4}`],
    metrics: {
      latencyMs: (i * 17) % 250,
      retries: i % 3,
      ratio: ((i % 97) + 1) / 100
    },
    items: [
      { sku: `SKU-${i % 100}`, qty: (i % 5) + 1, price: 19.99 },
      { sku: `SKU-${(i + 7) % 100}`, qty: (i % 3) + 1, price: 49.5 }
    ]
  };
}

function runBsonBench(count: number): void {
  let totalBytes = 0;
  let seqSum = 0;
  let checksum = 0;

  for (let i = 0; i < count; i++) {
    const doc = makeBenchDoc(i);
    const bytes = BSON.serialize(doc);
    totalBytes += bytes.length;
    checksum = (checksum + bytes[0] + bytes[bytes.length - 1] + bytes[bytes.length >> 1]) & 0x7fffffff;
    const back = BSON.deserialize(bytes);
    seqSum += Number(back.seq);
  }

  console.log(JSON.stringify({ docs: count, totalBytes, seqSum, checksum }));
}

async function runPing(uri: string): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const res = await client.db('admin').command({ ping: 1 });
    console.log(JSON.stringify({ ok: res.ok }));
  } finally {
    await client.close();
  }
}

async function runCrud(uri: string, dbName: string, collName: string): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const coll = client.db(dbName).collection(collName);
    await coll.drop().catch(() => {});

    const id1 = new ObjectId('65f0a1b2c3d4e5f600000001');
    const id2 = new ObjectId('65f0a1b2c3d4e5f600000002');
    const id3 = new ObjectId('65f0a1b2c3d4e5f600000003');
    const id4 = new ObjectId('65f0a1b2c3d4e5f600000004');

    const r1 = await coll.insertOne({ _id: id1, name: 'alice', role: 'eng', score: 10 });
    const rMany = await coll.insertMany([
      { _id: id2, name: 'bob', role: 'eng', score: 25 },
      { _id: id3, name: 'carol', role: 'ops', score: 40 },
      { _id: id4, name: 'dave', role: 'eng', score: 15 }
    ]);

    const foundOne = await coll.findOne({ name: 'bob' });
    const engDocs = await coll.find({ role: 'eng' }).sort({ score: -1 }).toArray();

    const upd = await coll.updateOne({ name: 'alice' }, { $set: { score: 30 }, $inc: { visits: 1 } });
    const afterUpdate = await coll.findOne({ name: 'alice' });

    const agg = await coll
      .aggregate([
        { $match: { role: 'eng' } },
        { $group: { _id: '$role', totalScore: { $sum: '$score' } } }
      ])
      .toArray();

    const beforeDelCount = await coll.countDocuments({ role: 'eng' });
    const del = await coll.deleteOne({ name: 'dave' });
    const afterDelCount = await coll.countDocuments({});

    console.log(
      EJSON.stringify(
        {
          insertedOne: r1.acknowledged,
          insertedManyCount: rMany.insertedCount,
          foundBobScore: foundOne?.score,
          engOrder: engDocs.map((d: any) => d.name),
          updatedModified: upd.modifiedCount,
          aliceAfterUpdate: { score: afterUpdate?.score, visits: afterUpdate?.visits },
          engTotalScore: agg[0]?.totalScore,
          beforeDelCount,
          deletedCount: del.deletedCount,
          afterDelCount
        },
        { relaxed: true }
      )
    );
  } finally {
    await client.close();
  }
}

async function runInsert(uri: string, dbName: string, collName: string, jsonText: string): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const doc = EJSON.parse(jsonText);
    const res = await client.db(dbName).collection(collName).insertOne(doc);
    console.log(EJSON.stringify({ acknowledged: res.acknowledged, insertedId: res.insertedId }, { relaxed: true }));
  } finally {
    await client.close();
  }
}

async function runQuery(uri: string, dbName: string, collName: string, filterText: string): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const filter = filterText ? EJSON.parse(filterText) : {};
    const docs = await client.db(dbName).collection(collName).find(filter).toArray();
    console.log(EJSON.stringify(docs, { relaxed: true }));
  } finally {
    await client.close();
  }
}

async function runBenchWire(uri: string, ops: number): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const coll = client.db('bench').collection('items');
    await coll.drop().catch(() => {});

    let inserted = 0;
    let found = 0;
    let updated = 0;
    let deleted = 0;
    let scoreSum = 0;

    for (let i = 0; i < ops; i++) {
      const id = new ObjectId(i.toString(16).padStart(24, '0'));
      await coll.insertOne({ _id: id, seq: i, group: i % 8, score: i * 2, label: `item-${i}` });
      inserted++;
      const doc = await coll.findOne({ _id: id });
      if (doc) {
        found++;
        scoreSum += Number(doc.score);
      }
      const u = await coll.updateOne({ _id: id }, { $set: { score: i * 3 } });
      updated += u.modifiedCount;
      const d = await coll.deleteOne({ _id: id });
      deleted += d.deletedCount;
    }

    console.log(JSON.stringify({ ops, inserted, found, updated, deleted, scoreSum }));
  } finally {
    await client.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }

  switch (cmd) {
    case 'ping':
      if (!args[1]) throw new Error('ping requires <uri>');
      await runPing(args[1]);
      return;
    case 'crud':
      if (!args[1]) throw new Error('crud requires <uri>');
      await runCrud(args[1], args[2] ?? 'demo', args[3] ?? 'users');
      return;
    case 'insert':
      if (!args[1] || !args[2] || !args[3] || !args[4]) {
        throw new Error('insert requires <uri> <db> <collection> <json>');
      }
      await runInsert(args[1], args[2], args[3], args[4]);
      return;
    case 'query':
      if (!args[1] || !args[2] || !args[3]) {
        throw new Error('query requires <uri> <db> <collection> [filterJson]');
      }
      await runQuery(args[1], args[2], args[3], args[4] ?? '{}');
      return;
    case 'bench-wire':
      if (!args[1]) throw new Error('bench-wire requires <uri> [ops]');
      await runBenchWire(args[1], Number(args[2] ?? '500') || 500);
      return;
    case 'bson-roundtrip':
      runBsonRoundtrip();
      return;
    case 'bson-bench':
      runBsonBench(Number(args[1] ?? '5000') || 5000);
      return;
    default:
      console.error(`Unknown command: ${cmd}\n\n${HELP}`);
      process.exitCode = 1;
  }
}

await main();
