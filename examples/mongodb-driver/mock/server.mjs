// Self-contained local MongoDB Wire Protocol (OP_MSG / OP_QUERY) mock server.
//
// Speaks real MongoDB TCP wire protocol (OP_MSG opcode 2013 + legacy OP_QUERY
// opcode 2004 for initial handshake), using the vendored BSON encoder/decoder
// built by run-node.mjs so every wire frame is genuine BSON.
//
// Supports: hello / isMaster / ismaster, ping, insert (inline documents and
// OP_MSG Section Type 1 document sequences), find (filter, projection, sort,
// skip, limit, batched cursors), getMore, killCursors, update ($set, $inc,
// $unset, multi, upsert), delete, count, aggregate ($match, $sort, $limit,
// $skip, $project, $count), drop, listCollections, endSessions.
//
// Usage as module:
//   import { startMockMongoServer } from './mock/server.mjs';
//   const server = await startMockMongoServer();
//   console.log(server.uri); // mongodb://127.0.0.1:<port>/?directConnection=true
//   await server.close();
//
// Usage standalone:
//   node mock/server.mjs [port=0]

import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildNode } from '../run-node.mjs';

const OP_REPLY = 1;
const OP_QUERY = 2004;
const OP_MSG = 2013;

let bsonMod = null;
async function loadBson() {
  if (bsonMod) return bsonMod;
  buildNode();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const bsonPath = path.join(here, '..', '.cache', 'node', 'vendor', 'bson', 'src', 'index.js');
  bsonMod = await import(pathToFileURL(bsonPath).href);
  return bsonMod;
}

function getField(doc, dottedPath) {
  if (!dottedPath.includes('.')) return doc[dottedPath];
  let cur = doc;
  for (const part of dottedPath.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function setField(doc, dottedPath, value) {
  const parts = dottedPath.split('.');
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function unsetField(doc, dottedPath) {
  const parts = dottedPath.split('.');
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return;
    cur = cur[parts[i]];
  }
  if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a._bsontype && b._bsontype) {
    if (a._bsontype !== b._bsontype) return false;
    if (typeof a.equals === 'function') return a.equals(b);
    return String(a) === String(b);
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}

function matchesFilter(doc, filter) {
  if (!filter || typeof filter !== 'object') return true;
  for (const [k, cond] of Object.entries(filter)) {
    if (k === '$and') {
      if (!cond.every((sub) => matchesFilter(doc, sub))) return false;
      continue;
    }
    if (k === '$or') {
      if (!cond.some((sub) => matchesFilter(doc, sub))) return false;
      continue;
    }
    const val = getField(doc, k);
    if (cond != null && typeof cond === 'object' && !cond._bsontype && !(cond instanceof Date) && !(cond instanceof RegExp) && !Array.isArray(cond)) {
      const keys = Object.keys(cond);
      if (keys.length > 0 && keys.every((op) => op.startsWith('$'))) {
        for (const [op, target] of Object.entries(cond)) {
          if (op === '$eq' && !valuesEqual(val, target)) return false;
          else if (op === '$ne' && valuesEqual(val, target)) return false;
          else if (op === '$gt' && !(val > target)) return false;
          else if (op === '$gte' && !(val >= target)) return false;
          else if (op === '$lt' && !(val < target)) return false;
          else if (op === '$lte' && !(val <= target)) return false;
          else if (op === '$in' && !target.some((t) => valuesEqual(val, t))) return false;
          else if (op === '$nin' && target.some((t) => valuesEqual(val, t))) return false;
          else if (op === '$exists' && (val !== undefined) !== Boolean(target)) return false;
        }
        continue;
      }
    }
    if (!valuesEqual(val, cond)) return false;
  }
  return true;
}

function applyUpdate(doc, update) {
  let modified = false;
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      setField(doc, k, v);
      modified = true;
    }
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      setField(doc, k, (Number(getField(doc, k)) || 0) + Number(v));
      modified = true;
    }
  }
  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      unsetField(doc, k);
      modified = true;
    }
  }
  return modified;
}

function applyProjection(doc, projection) {
  if (!projection || typeof projection !== 'object') return doc;
  const entries = Object.entries(projection);
  if (entries.length === 0) return doc;
  const inclusions = entries.filter(([k, v]) => k !== '_id' && Boolean(v));
  const exclusions = entries.filter(([k, v]) => k !== '_id' && !Boolean(v));
  if (inclusions.length > 0) {
    const out = {};
    if (projection._id !== 0 && projection._id !== false && '_id' in doc) out._id = doc._id;
    for (const [k] of inclusions) {
      if (k in doc) out[k] = doc[k];
    }
    return out;
  }
  const out = { ...doc };
  if (projection._id === 0 || projection._id === false) delete out._id;
  for (const [k] of exclusions) delete out[k];
  return out;
}

function compareDocs(a, b, sort) {
  for (const [k, dir] of Object.entries(sort)) {
    const av = getField(a, k);
    const bv = getField(b, k);
    if (av === bv) continue;
    if (av == null) return -1 * dir;
    if (bv == null) return 1 * dir;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
  }
  return 0;
}

function encodeOpMsg(bson, requestId, responseTo, doc) {
  const payload = bson.serialize(doc);
  const totalLen = 16 + 4 + 1 + payload.length;
  const buf = Buffer.allocUnsafe(totalLen);
  buf.writeInt32LE(totalLen, 0);
  buf.writeInt32LE(requestId, 4);
  buf.writeInt32LE(responseTo, 8);
  buf.writeInt32LE(OP_MSG, 12);
  buf.writeUInt32LE(0, 16); // flagBits
  buf.writeUInt8(0, 20);    // section kind 0 (body)
  Buffer.from(payload).copy(buf, 21);
  return buf;
}

function encodeOpReply(bson, requestId, responseTo, doc) {
  const payload = bson.serialize(doc);
  const totalLen = 16 + 20 + payload.length;
  const buf = Buffer.allocUnsafe(totalLen);
  buf.writeInt32LE(totalLen, 0);
  buf.writeInt32LE(requestId, 4);
  buf.writeInt32LE(responseTo, 8);
  buf.writeInt32LE(OP_REPLY, 12);
  buf.writeInt32LE(0, 16); // responseFlags
  buf.writeBigInt64LE(0n, 20); // cursorID
  buf.writeInt32LE(0, 28); // startingFrom
  buf.writeInt32LE(1, 32); // numberReturned
  Buffer.from(payload).copy(buf, 36);
  return buf;
}

function decodeOpMsg(bson, msg) {
  const flagBits = msg.readUInt32LE(16);
  const hasChecksum = (flagBits & 1) !== 0;
  const end = hasChecksum ? msg.length - 4 : msg.length;
  let offset = 20;
  let body = null;
  const sequences = {};
  while (offset < end) {
    const kind = msg.readUInt8(offset++);
    if (kind === 0) {
      const size = msg.readInt32LE(offset);
      body = bson.deserialize(msg.subarray(offset, offset + size));
      offset += size;
    } else if (kind === 1) {
      const sectionSize = msg.readInt32LE(offset);
      const sectionEnd = offset + sectionSize;
      offset += 4;
      const nul = msg.indexOf(0, offset);
      const ident = msg.toString('utf8', offset, nul);
      offset = nul + 1;
      const docs = [];
      while (offset < sectionEnd) {
        const dSize = msg.readInt32LE(offset);
        docs.push(bson.deserialize(msg.subarray(offset, offset + dSize)));
        offset += dSize;
      }
      sequences[ident] = docs;
    } else {
      throw new Error(`Unsupported OP_MSG section kind: ${kind}`);
    }
  }
  return { body: body ?? {}, sequences };
}

function decodeOpQuery(bson, msg) {
  let offset = 20; // skip header (16) + flags (4)
  const nul = msg.indexOf(0, offset);
  const fullCollectionName = msg.toString('utf8', offset, nul);
  offset = nul + 1 + 8; // skip NUL + numberToSkip (4) + numberToReturn (4)
  const size = msg.readInt32LE(offset);
  const query = bson.deserialize(msg.subarray(offset, offset + size));
  return { fullCollectionName, query };
}

export async function startMockMongoServer({ port = 0, host = '127.0.0.1' } = {}) {
  const bson = await loadBson();
  const { Long, ObjectId } = bson;

  const databases = new Map();
  const cursors = new Map();
  let nextCursorId = 1n;
  let nextReqId = 1;
  let commandCount = 0;

  function getCollection(dbName, collName) {
    let db = databases.get(dbName);
    if (!db) {
      db = new Map();
      databases.set(dbName, db);
    }
    let coll = db.get(collName);
    if (!coll) {
      coll = [];
      db.set(collName, coll);
    }
    return coll;
  }

  function helloReply() {
    return {
      isWritablePrimary: true,
      ismaster: true,
      maxBsonObjectSize: 16777216,
      maxMessageSizeBytes: 48000000,
      maxWriteBatchSize: 100000,
      localTime: new Date(),
      logicalSessionTimeoutMinutes: 30,
      connectionId: 1,
      minWireVersion: 0,
      maxWireVersion: 21,
      readOnly: false,
      ok: 1,
    };
  }

  function handleCommand(cmd, sequences = {}) {
    commandCount++;
    const dbName = cmd.$db || 'test';

    if (cmd.hello || cmd.isMaster || cmd.ismaster) {
      return helloReply();
    }
    if (cmd.ping) {
      return { ok: 1 };
    }
    if (cmd.endSessions) {
      return { ok: 1 };
    }
    if (cmd.insert) {
      const coll = getCollection(dbName, cmd.insert);
      const docs = sequences.documents || cmd.documents || [];
      for (const d of docs) {
        const copy = { ...d };
        if (copy._id === undefined) copy._id = new ObjectId();
        coll.push(copy);
      }
      return { n: docs.length, ok: 1 };
    }
    if (cmd.find) {
      const coll = getCollection(dbName, cmd.find);
      let docs = coll.filter((d) => matchesFilter(d, cmd.filter));
      if (cmd.sort) docs = [...docs].sort((a, b) => compareDocs(a, b, cmd.sort));
      if (cmd.skip) docs = docs.slice(cmd.skip);
      if (cmd.limit && cmd.limit > 0) docs = docs.slice(0, cmd.limit);
      if (cmd.projection) docs = docs.map((d) => applyProjection(d, cmd.projection));
      const batchSize = cmd.batchSize && cmd.batchSize > 0 ? cmd.batchSize : 101;
      const firstBatch = docs.slice(0, batchSize);
      const rest = docs.slice(batchSize);
      let cursorId = Long.ZERO;
      if (rest.length > 0 && !cmd.singleBatch) {
        const id = nextCursorId++;
        cursorId = Long.fromBigInt(id);
        cursors.set(id.toString(), { ns: `${dbName}.${cmd.find}`, rest });
      }
      return {
        cursor: { id: cursorId, ns: `${dbName}.${cmd.find}`, firstBatch },
        ok: 1,
      };
    }
    if (cmd.getMore) {
      const idStr = cmd.getMore.toString();
      const cur = cursors.get(idStr);
      if (!cur) {
        return { cursor: { id: Long.ZERO, ns: `${dbName}.${cmd.collection}`, nextBatch: [] }, ok: 1 };
      }
      const batchSize = cmd.batchSize && cmd.batchSize > 0 ? cmd.batchSize : 101;
      const nextBatch = cur.rest.splice(0, batchSize);
      const done = cur.rest.length === 0;
      if (done) cursors.delete(idStr);
      return {
        cursor: { id: done ? Long.ZERO : cmd.getMore, ns: cur.ns, nextBatch },
        ok: 1,
      };
    }
    if (cmd.killCursors) {
      const killed = [];
      for (const id of cmd.cursors || []) {
        if (cursors.delete(id.toString())) killed.push(id);
      }
      return { cursorsKilled: killed, cursorsNotFound: [], cursorsAlive: [], cursorsUnknown: [], ok: 1 };
    }
    if (cmd.update) {
      const coll = getCollection(dbName, cmd.update);
      const updates = sequences.updates || cmd.updates || [];
      let n = 0;
      let nModified = 0;
      const upserted = [];
      for (let idx = 0; idx < updates.length; idx++) {
        const u = updates[idx];
        let matched = 0;
        for (const doc of coll) {
          if (matchesFilter(doc, u.q)) {
            matched++;
            n++;
            if (applyUpdate(doc, u.u)) nModified++;
            if (!u.multi) break;
          }
        }
        if (matched === 0 && u.upsert) {
          const doc = { ...u.q };
          applyUpdate(doc, u.u);
          if (doc._id === undefined) doc._id = new ObjectId();
          coll.push(doc);
          n++;
          upserted.push({ index: idx, _id: doc._id });
        }
      }
      const res = { n, nModified, ok: 1 };
      if (upserted.length > 0) res.upserted = upserted;
      return res;
    }
    if (cmd.delete) {
      const coll = getCollection(dbName, cmd.delete);
      const deletes = sequences.deletes || cmd.deletes || [];
      let n = 0;
      for (const del of deletes) {
        const limitOne = del.limit === 1;
        for (let i = 0; i < coll.length; ) {
          if (matchesFilter(coll[i], del.q)) {
            coll.splice(i, 1);
            n++;
            if (limitOne) break;
          } else {
            i++;
          }
        }
      }
      return { n, ok: 1 };
    }
    if (cmd.count) {
      const coll = getCollection(dbName, cmd.count);
      const docs = coll.filter((d) => matchesFilter(d, cmd.query));
      return { n: docs.length, ok: 1 };
    }
    if (cmd.aggregate) {
      const coll = getCollection(dbName, cmd.aggregate);
      let docs = [...coll];
      for (const stage of cmd.pipeline || []) {
        if (stage.$match) docs = docs.filter((d) => matchesFilter(d, stage.$match));
        else if (stage.$sort) docs = [...docs].sort((a, b) => compareDocs(a, b, stage.$sort));
        else if (stage.$skip) docs = docs.slice(stage.$skip);
        else if (stage.$limit) docs = docs.slice(0, stage.$limit);
        else if (stage.$project) docs = docs.map((d) => applyProjection(d, stage.$project));
        else if (stage.$count) docs = [{ [stage.$count]: docs.length }];
        else if (stage.$group) {
          const idSpec = stage.$group._id;
          const groups = new Map();
          for (const d of docs) {
            const key =
              typeof idSpec === 'string' && idSpec.startsWith('$')
                ? getField(d, idSpec.slice(1))
                : idSpec;
            const kStr = String(key);
            let g = groups.get(kStr);
            if (!g) {
              g = { _id: key, __docs: [] };
              groups.set(kStr, g);
            }
            g.__docs.push(d);
          }
          const out = [];
          for (const g of groups.values()) {
            const row = { _id: g._id };
            for (const [field, expr] of Object.entries(stage.$group)) {
              if (field === '_id') continue;
              if (expr.$sum !== undefined) {
                row[field] = g.__docs.reduce((acc, d) => {
                  const v =
                    typeof expr.$sum === 'string' && expr.$sum.startsWith('$')
                      ? Number(getField(d, expr.$sum.slice(1))) || 0
                      : Number(expr.$sum);
                  return acc + v;
                }, 0);
              }
            }
            out.push(row);
          }
          docs = out;
        }
      }
      return {
        cursor: { id: Long.ZERO, ns: `${dbName}.${cmd.aggregate}`, firstBatch: docs },
        ok: 1,
      };
    }
    if (cmd.drop) {
      const db = databases.get(dbName);
      if (db) db.delete(cmd.drop);
      return { ns: `${dbName}.${cmd.drop}`, ok: 1 };
    }
    if (cmd.listCollections) {
      const db = databases.get(dbName);
      const batch = db
        ? [...db.keys()].map((name) => ({ name, type: 'collection', options: {}, info: { readOnly: false } }))
        : [];
      return { cursor: { id: Long.ZERO, ns: `${dbName}.$cmd.listCollections`, firstBatch: batch }, ok: 1 };
    }
    return { ok: 1 };
  }

  const sockets = new Set();
  const server = net.createServer((socket) => {
    socket.setNoDelay(true);
    sockets.add(socket);
    let buf = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buf = buf.length === 0 ? chunk : Buffer.concat([buf, chunk]);
      while (buf.length >= 4) {
        const msgLen = buf.readInt32LE(0);
        if (msgLen < 16 || buf.length < msgLen) break;
        const frame = buf.subarray(0, msgLen);
        buf = buf.subarray(msgLen);

        const requestId = frame.readInt32LE(4);
        const opCode = frame.readInt32LE(12);
        try {
          if (opCode === OP_MSG) {
            const { body, sequences } = decodeOpMsg(bson, frame);
            const reply = handleCommand(body, sequences);
            socket.write(encodeOpMsg(bson, nextReqId++, requestId, reply));
          } else if (opCode === OP_QUERY) {
            const { query } = decodeOpQuery(bson, frame);
            const reply = handleCommand(query);
            socket.write(encodeOpReply(bson, nextReqId++, requestId, reply));
          }
        } catch (err) {
          const errDoc = { ok: 0, errmsg: err instanceof Error ? err.message : String(err), code: 1 };
          if (opCode === OP_MSG) socket.write(encodeOpMsg(bson, nextReqId++, requestId, errDoc));
          else socket.write(encodeOpReply(bson, nextReqId++, requestId, errDoc));
        }
      }
    });

    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  const addr = server.address();
  const uri = `mongodb://${host}:${addr.port}/?directConnection=true`;

  return {
    server,
    port: addr.port,
    uri,
    reset() {
      databases.clear();
      cursors.clear();
      commandCount = 0;
    },
    getCommandCount() {
      return commandCount;
    },
    close() {
      for (const s of sockets) s.destroy();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? '0') || 0;
  const mock = await startMockMongoServer({ port });
  console.log(`Mock MongoDB OP_MSG server listening at ${mock.uri}`);
}
