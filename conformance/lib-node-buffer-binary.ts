const buf = Buffer.alloc(16);

assert(buf.writeUInt8(255, 0) === 1 && buf.readUInt8(0) === 255, 'uint8');
assert(buf.writeInt8(-2, 1) === 2 && buf.readInt8(1) === -2, 'int8');
buf.writeUInt16LE(0x0102, 2);
assert(buf[2] === 2 && buf[3] === 1 && buf.readUInt16LE(2) === 0x0102 && buf.readUInt16BE(2) === 0x0201, 'uint16');
buf.writeInt16BE(-300, 4);
assert(buf.readInt16BE(4) === -300, 'int16');
buf.writeUInt32BE(0xdeadbeef, 6);
assert(buf.readUInt32BE(6) === 0xdeadbeef && buf.readUint32LE(6) === 0xefbeadde, 'uint32');
buf.writeInt32LE(-123456, 10);
assert(buf.readInt32LE(10) === -123456, 'int32');

const floats = Buffer.alloc(12);
floats.writeFloatLE(1.5, 0);
floats.writeDoubleBE(Math.PI, 4);
assert(floats.readFloatLE(0) === 1.5 && floats.readDoubleBE(4) === Math.PI, 'float / double');

let threw = false;
try {
  buf.readUInt32LE(14);
} catch (e) {
  threw = (e as NodeJS.ErrnoException).code === 'ERR_OUT_OF_RANGE';
}
assert(threw, 'out of range read throws ERR_OUT_OF_RANGE');

export {};
