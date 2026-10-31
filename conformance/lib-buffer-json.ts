// JSON.stringify(buffer) goes through Buffer's toJSON(): { type, data }
const b = Buffer.from('R0lG', 'base64');
assert(JSON.stringify(b) === '{"type":"Buffer","data":[71,73,70]}', 'a Buffer');
assert(JSON.stringify({ img: [b] }) === '{"img":[{"type":"Buffer","data":[71,73,70]}]}', 'nested');
assert(JSON.stringify(b.toJSON()) === JSON.stringify(b), 'same as toJSON()');
console.log(JSON.stringify({ a: b }, null, 2));
