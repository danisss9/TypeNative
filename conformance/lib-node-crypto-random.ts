import { randomBytes, randomUUID, randomInt, timingSafeEqual, getRandomValues } from 'node:crypto';

assert(randomBytes(16).length === 16, 'randomBytes');
const uuid = randomUUID();
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid), 'randomUUID is v4');
assert(randomUUID() !== uuid, 'UUIDs differ');
for (let i = 0; i < 50; i++) {
  const n = randomInt(5, 10);
  assert(n >= 5 && n < 10 && Number.isInteger(n), 'randomInt range');
}
assert(randomInt(3) < 3, 'randomInt(max)');
assert(timingSafeEqual(Buffer.from('same'), Buffer.from('same')) && !timingSafeEqual(Buffer.from('aaaa'), Buffer.from('aaab')), 'timingSafeEqual');

const values = getRandomValues(new Uint8Array(8));
assert(values.length === 8, 'getRandomValues');
assert(crypto.randomUUID().length === 36, 'global crypto.randomUUID');
