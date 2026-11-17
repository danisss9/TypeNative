// node:zlib ZIP archives (Node 26.8): entries, archives byte for byte as Node writes them,
// ZipBuffer, ZipFile edited in place, streams, zipFiles; expected values from Node 26.13
import {
  ZipEntry,
  ZipBuffer,
  ZipFile,
  createZipArchive,
  createZipArchiveSync,
  zipFiles,
  getMaxZipContentSize,
  setMaxZipContentSize
} from 'node:zlib';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

function code(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

async function rejection<T>(p: Promise<T>): Promise<string> {
  try {
    await p;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

// Local-time dates: the DOS fields encode local time, so the bytes match in any zone
const when = new Date(2024, 0, 2, 3, 4, 6);
const odd = new Date(2024, 0, 2, 3, 4, 7, 500);

// ---- entries ----
const hello = ZipEntry.createSync('a.txt', Buffer.from('hello'), { comment: 'A', modified: when });
assert(hello.name === 'a.txt' && hello.size === 5 && hello.compressedSize === 5, 'entry sizes');
assert(hello.method === 0 && !hello.compressed, 'deflate that does not shrink falls back to store');
assert(hello.crc32 === 907060870 && hello.comment === 'A' && hello.flags === 0x800, 'crc32, comment, UTF-8 flag');
assert(hello.mode === 0o644 && hello.isFile && !hello.isDirectory && !hello.isSymlink, 'default mode and kind');
assert(hello.modified.getTime() === when.getTime(), 'modified');
assert(hello.nameBuffer.toString() === 'a.txt' && hello.rawContent!.toString() === 'hello', 'nameBuffer, rawContent');
assert(hello.contentSync().toString() === 'hello', 'contentSync');

const repeated = ZipEntry.createSync('dir/b.txt', Buffer.from('ab'.repeat(500)), { modified: when, mode: 0o600 });
assert(repeated.method === 8 && repeated.compressed && repeated.compressedSize < 1000, 'deflated entry');
assert(repeated.size === 1000 && repeated.crc32 === 1472709960 && repeated.mode === 0o600, 'deflated entry fields');
assert(repeated.contentSync().toString() === 'ab'.repeat(500), 'inflate');
const stored = ZipEntry.createSync('s.txt', Buffer.from('ab'.repeat(500)), { method: 'store', modified: when });
assert(stored.method === 0 && stored.compressedSize === 1000, "method: 'store'");

const dir = ZipEntry.createSync('empty/', Buffer.alloc(0), { modified: when });
assert(dir.isDirectory && !dir.isFile && dir.mode === 0o755 && dir.method === 0, 'directory entry');
const link = ZipEntry.createSymlink('link', 'a.txt', { modified: when });
assert(link.isSymlink && !link.isFile && link.mode === 0o777 && link.contentSync().toString() === 'a.txt', 'symlink entry');

assert(
  code(() => ZipEntry.createSync('d/', Buffer.from('x'))) ===
    "ERR_INVALID_ARG_VALUE: The argument 'data' must be empty for a directory entry. Received <Buffer 78>",
  'directory with data'
);
assert(
  code(() => ZipEntry.createSync('', Buffer.from('x'))) === "ERR_INVALID_ARG_VALUE: The argument 'filename' must not be empty. Received ''",
  'empty filename'
);

// ---- archives, byte for byte ----
const archive = Buffer.concat([...createZipArchiveSync([hello, stored, dir, link], 'archive comment')]);
// (the 'ab' runs of the stored member shortened to [ab])
const hex = (b: Buffer): string => b.toString('hex').replace(/(6162)+/g, '[ab]');
const archiveHex = [
  '504b03041400000800008318225886a61036050000000500000005000000612e74787468656c6c6f504b030414000008',
  '00008318225848c5c757e8030000e803000005000000732e747874[ab]504b0304140000080000831822580000000000',
  '0000000000000006000000656d7074792f504b030414000008000083182258baf7ebc10500000005000000040000006c',
  '696e6b612e747874504b010214031400000800008318225886a610360500000005000000050000000100000000000000',
  'a48100000000612e74787441504b010214031400000800008318225848c5c757e8030000e80300000500000000000000',
  '00000000a48128000000732e747874504b01021403140000080000831822580000000000000000000000000600000000',
  '00000000001000ed4133040000656d7074792f504b0102140314000008000083182258baf7ebc1050000000500000004',
  '0000000000000000000000ffa1570400006c696e6b504b05060000000004000400cd0000007e0400000f006172636869',
  '766520636f6d6d656e74'
].join('');
assert(archive.length === 1392 && hex(archive) === archiveHex, 'archive bytes');

// An odd second gets an extended-timestamp extra field
const precise = ZipEntry.createSync('t', Buffer.from('t'), { modified: odd });
const preciseArchive = Buffer.concat([...createZipArchiveSync([precise])]);
const preciseHex = [
  '504b030414000008000083182258a85a6a85010000000100000001000900745554050001277d936574504b0102140314',
  '000008000083182258a85a6a850100000001000000010009000000000000000000a48100000000745554050001277d93',
  '65504b0506000000000100010038000000290000000000'
].join('');
assert(preciseArchive.readUInt16LE(28) === 9 && preciseArchive.toString('hex') === preciseHex, 'extended timestamp extra');
assert(new ZipBuffer(preciseArchive).get('t').modified.getTime() === Math.floor(odd.getTime() / 1000) * 1000, 'whole seconds');

// ---- ZipBuffer ----
const buffer = new ZipBuffer(archive);
assert(buffer.size === 4 && buffer.writable && buffer.comment === 'archive comment', 'buffer size, comment');
assert([...buffer.keys()].join(',') === 'a.txt,s.txt,empty/,link', 'insertion order');
const read = buffer.get('a.txt');
assert(read.comment === 'A' && read.crc32 === 907060870 && read.mode === 0o644 && read.flags === 0x800, 'parsed fields');
assert(read.modified.getTime() === when.getTime() && read.contentSync().toString() === 'hello', 'parsed content');
assert(buffer.get('link').isSymlink && buffer.get('empty/').isDirectory, 'parsed kinds');
assert(buffer.toBufferSync().equals(archive), 're-serialized archive is identical');
assert(code(() => buffer.get('nope')) === 'ERR_ZIP_ENTRY_NOT_FOUND: no such entry "nope" in the archive', 'missing entry');
const names: string[] = [];
buffer.forEach((entry, name) => names.push(`${name}:${entry.size}`));
assert(names.join(' ') === 'a.txt:5 s.txt:1000 empty/:0 link:5', 'forEach');
let pairs = 0;
for (const [name, entry] of buffer) if (entry.name === name) pairs++;
assert(pairs === 4, 'for...of yields [name, entry]');
buffer.addSync('a.txt', Buffer.from('replaced'));
assert([...buffer.keys()].join(',') === 'a.txt,s.txt,empty/,link' && buffer.get('a.txt').size === 8, 'replace keeps position');
assert(buffer.delete('s.txt') && !buffer.delete('s.txt') && buffer.size === 3, 'delete');
assert(
  buffer.toBufferSync({ comment: 'new' }).subarray(-3).toString() === 'new' && new ZipBuffer(buffer.toBufferSync()).comment === 'archive comment',
  'toBufferSync comment'
);
buffer.clear();
assert(buffer.size === 0, 'clear');
assert([...ZipEntry.read(archive)].map((e) => e.name).join(',') === 'a.txt,s.txt,empty/,link', 'ZipEntry.read');
assert(
  code(() => new ZipBuffer(Buffer.from('garbage'))) === 'ERR_ZIP_INVALID_ARCHIVE: invalid ZIP archive: no end of central directory record found',
  'invalid archive'
);

// Corruption, CRC checks and the size limit
const corrupt = Buffer.from(archive);
corrupt[corrupt.indexOf('hello')] = 0x48;
const bad = new ZipBuffer(corrupt).get('a.txt');
assert(bad.contentSync({ verify: false }).toString() === 'Hello', 'verify: false');
assert(code(() => bad.contentSync()) === 'ERR_ZIP_ENTRY_CORRUPT: ZIP entry is corrupt: entry "a.txt" failed CRC-32 verification', 'CRC-32');
assert(getMaxZipContentSize() === 268435456, 'default limit');
assert(
  code(() => hello.contentSync({ maxSize: 2 })) ===
    'ERR_ZIP_ENTRY_TOO_LARGE: ZIP entry exceeds the allowed size: entry "a.txt" declares 5 bytes, exceeding the 2 byte limit',
  'maxSize'
);
setMaxZipContentSize(4);
assert(code(() => hello.contentSync()).startsWith('ERR_ZIP_ENTRY_TOO_LARGE'), 'setMaxZipContentSize');
setMaxZipContentSize(268435456);

// ---- ZipFile, edited in place ----
const tmp = mkdtempSync(join(tmpdir(), 'tn-zip-'));
const path = join(tmp, 'archive.zip');
writeFileSync(path, archive);
const file = ZipFile.openSync(path, { writable: true });
assert(file.size === 4 && file.writable && file.comment === 'archive comment' && file.has('link'), 'open');
assert(file.getSync('a.txt').contentSync().toString() === 'hello', 'file-backed content');
assert(file.getSync('a.txt') === file.getSync('a.txt'), 'the same lazy handle');
file.addSync('c.txt', Buffer.from('added'), { modified: when });
assert(file.deleteSync('s.txt') && !file.deleteSync('s.txt'), 'deleteSync');
assert([...file.keys()].join(',') === 'a.txt,empty/,link,c.txt', 'keys after edits');
const edited = readFileSync(path);
const editedHex = [
  '504b03041400000800008318225886a61036050000000500000005000000612e74787468656c6c6f504b030414000008',
  '00008318225848c5c757e8030000e803000005000000732e747874[ab]504b0304140000080000831822580000000000',
  '0000000000000006000000656d7074792f504b030414000008000083182258baf7ebc10500000005000000040000006c',
  '696e6b612e747874504b030414000008000083182258eb90bfcb050000000500000005000000632e7478746164646564',
  '504b010214031400000800008318225886a610360500000005000000050000000100000000000000a48100000000612e',
  '74787441504b0102140314000008000083182258000000000000000000000000060000000000000000001000ed413304',
  '0000656d7074792f504b0102140314000008000083182258baf7ebc10500000005000000040000000000000000000000',
  'ffa1570400006c696e6b504b0102140314000008000083182258eb90bfcb050000000500000005000000000000000000',
  '0000a4817e040000632e747874504b05060000000004000400cd000000a60400000f006172636869766520636f6d6d65',
  '6e74'
].join('');
assert(edited.length === 1432 && hex(edited) === editedHex, 'members appended where the central directory was');
assert(new ZipBuffer(edited).get('c.txt').contentSync().toString() === 'added', 'edited archive reads back');
const compacted = file.compactSync();
const compactedHex = [
  '504b03041400000800008318225886a61036050000000500000005000000612e74787468656c6c6f504b030414000008',
  '00008318225800000000000000000000000006000000656d7074792f504b030414000008000083182258baf7ebc10500',
  '000005000000040000006c696e6b612e747874504b030414000008000083182258eb90bfcb0500000005000000050000',
  '00632e7478746164646564504b010214031400000800008318225886a610360500000005000000050000000100000000',
  '000000a48100000000612e74787441504b01021403140000080000831822580000000000000000000000000600000000',
  '00000000001000ed4128000000656d7074792f504b0102140314000008000083182258baf7ebc1050000000500000004',
  '0000000000000000000000ffa14c0000006c696e6b504b0102140314000008000083182258eb90bfcb05000000050000',
  '00050000000000000000000000a48173000000632e747874504b05060000000004000400cd0000009b0000000f006172',
  '636869766520636f6d6d656e74'
].join('');
assert(compacted.toString('hex') === compactedHex, 'compactSync drops dead space');
assert([...file.entriesSync()].map(([name]) => name).join(',') === 'a.txt,empty/,link,c.txt', 'entriesSync');
file.closeSync();
assert(code(() => file.has('a.txt')) === 'ERR_INVALID_STATE: Invalid state: the ZipFile has been closed', 'closed');
const readOnly = ZipFile.openSync(path);
assert(
  code(() => readOnly.addSync('x', Buffer.from('x'))) === 'ERR_ZIP_NOT_WRITABLE: this archive was not opened for writing',
  'not writable'
);
readOnly.closeSync();
assert(code(() => ZipFile.openSync(join(tmp, 'none.zip'))).startsWith('ENOENT: ENOENT: no such file or directory, open'), 'ENOENT');

async function main(): Promise<void> {
  const created = await ZipEntry.create('z.txt', Buffer.from('zz'.repeat(100)), { modified: when });
  assert(created.method === 8 && created.size === 200, 'ZipEntry.create');
  assert((await created.content()).toString() === 'zz'.repeat(100), 'content()');
  const parts: Buffer[] = [];
  for await (const chunk of created.contentIterator()) parts.push(chunk);
  assert(Buffer.concat(parts).toString() === 'zz'.repeat(100), 'contentIterator');

  // A streamed entry: sizes and CRC come after the content, in a data descriptor
  async function* source(): AsyncGenerator<Buffer> {
    yield Buffer.from('streamed ');
    yield Buffer.from('content');
  }
  const streamed = ZipEntry.createStream('stream.txt', source(), { modified: when });
  assert(streamed.flags === 0x808 && streamed.method === 8, 'createStream flags');
  assert(code(() => streamed.size).startsWith('ERR_INVALID_STATE'), 'pending sizes');
  const out = await collect(createZipArchive([hello, streamed], { comment: 'streamed' }));
  assert(streamed.size === 16 && streamed.crc32 === 180454545, 'sizes after serialization');
  const back = new ZipBuffer(out);
  assert(back.comment === 'streamed' && back.get('stream.txt').flags === 0x808, 'data-descriptor flag kept');
  assert(back.get('stream.txt').contentSync().toString() === 'streamed content', 'streamed content');
  assert(code(() => [...createZipArchiveSync([ZipEntry.createStream('x', source())])]).startsWith('ERR_INVALID_STATE'), 'no sync streaming');

  const asyncFile = await ZipFile.open(path, { writable: true });
  assert((await (await asyncFile.get('c.txt')).content()).toString() === 'added', 'open / get');
  assert((await asyncFile.add('d.txt', Buffer.from('async'))).name === 'd.txt', 'add');
  assert(await asyncFile.delete('a.txt'), 'delete');
  assert((await rejection(asyncFile.get('a.txt'))).startsWith('ERR_ZIP_ENTRY_NOT_FOUND'), 'get rejects');
  assert((await collect(await asyncFile.stream('d.txt'))).toString() === 'async', 'stream(name)');
  const compactStream = await collect(asyncFile.compact('compacted'));
  assert(new ZipBuffer(compactStream).comment === 'compacted' && new ZipBuffer(compactStream).has('d.txt'), 'compact()');
  await asyncFile.close();
  assert(code(() => asyncFile.size).startsWith('ERR_INVALID_STATE'), 'close()');

  // zipFiles: files stream in, directories get a trailing slash
  const srcDir = join(tmp, 'src');
  mkdirSync(srcDir);
  writeFileSync(join(srcDir, 'one.txt'), 'one '.repeat(50));
  const zipped = new ZipBuffer(
    await collect(
      zipFiles([
        [join(srcDir, 'one.txt'), 'files/one.txt'],
        [srcDir, 'files']
      ])
    )
  );
  assert([...zipped.keys()].join(',') === 'files/one.txt,files/', 'zipFiles names');
  assert(zipped.get('files/one.txt').contentSync().toString() === 'one '.repeat(50) && zipped.get('files/one.txt').flags === 0x808, 'zipFiles content');
  assert(zipped.get('files/').isDirectory, 'zipFiles directory');

  const viaBuffer = await new ZipBuffer(archive).toBuffer();
  assert(viaBuffer.equals(archive), 'toBuffer()');
  rmSync(tmp, { recursive: true, force: true });
  console.log('zip ok');
}

main();
