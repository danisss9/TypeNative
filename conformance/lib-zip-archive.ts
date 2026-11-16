// node:zlib ZIP archives: entries, in-memory buffers, files on disk, zipFiles
import { ZipEntry, ZipBuffer, ZipFile, createZipArchiveSync, zipFiles, getMaxZipContentSize, setMaxZipContentSize } from 'node:zlib';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const first = ZipEntry.createSync('a.txt', 'hello', { comment: 'A' });
const second = ZipEntry.createSync('dir/b.txt', 'world');
assert(first.name === 'a.txt' && first.size === 5 && first.isFile && !first.isDirectory, 'entry fields');
assert(first.comment === 'A' && first.crc32 !== 0, 'entry comment and CRC');
assert(first.contentSync().toString() === 'hello', 'entry content');
assert(first.compressedSize <= first.size, 'compressed size');
assert(ZipEntry.createSync('empty/', '').isDirectory, 'directory entry');

const archive = Buffer.concat(createZipArchiveSync([first, second]));
const buffer = new ZipBuffer(archive);
assert(buffer.size === 2 && buffer.writable, 'buffer size');
assert(buffer.has('a.txt') && buffer.has('dir/b.txt'), 'buffer has');
assert(buffer.get('a.txt').contentSync().toString() === 'hello', 'buffer content');
assert(buffer.get('dir/b.txt').contentSync().toString() === 'world', 'nested content');
assert(buffer.keys().join(',') === 'a.txt,dir/b.txt', 'insertion order');
assert(buffer.values().length === 2, 'values');

const again = new ZipBuffer(buffer.toBufferSync());
assert(again.get('a.txt').contentSync().toString() === 'hello', 'round trip');
again.addSync('c.txt', 'third');
assert(again.size === 3 && again.get('c.txt').contentSync().toString() === 'third', 'add');
assert(again.delete('c.txt') && !again.has('c.txt'), 'delete');
again.clear();
assert(again.size === 0, 'clear');

const dir = mkdtempSync(join(tmpdir(), 'tn-zip-'));
const path = join(dir, 'archive.zip');
writeFileSync(path, buffer.toBufferSync());
const file = ZipFile.openSync(path, { writable: true });
assert(file.size === 2 && file.writable, 'file open');
assert(file.getSync('a.txt').contentSync().toString() === 'hello', 'file get');
file.addSync('c.txt', 'added');
assert(file.size === 3, 'file add');
assert(file.deleteSync('a.txt') && file.size === 2, 'file delete');
const reopened = ZipFile.openSync(path);
assert(reopened.size === 2 && reopened.getSync('c.txt').contentSync().toString() === 'added', 'file round trip');
reopened.closeSync();
assert(new ZipBuffer(file.compactSync()).get('c.txt').contentSync().toString() === 'added', 'compact');

assert(getMaxZipContentSize() === 268435456, 'default max content size');
setMaxZipContentSize(2);
let threw = false;
try {
  first.contentSync();
} catch {
  threw = true;
}
assert(threw, 'an oversized entry throws');
setMaxZipContentSize(268435456);

const source = join(dir, 'f.txt');
writeFileSync(source, 'zipped');
const zipped = zipFiles([[source, 'f.txt']]);
assert(new ZipBuffer(zipped).get('f.txt').contentSync().toString() === 'zipped', 'zipFiles');
rmSync(dir, { recursive: true, force: true });
console.log('zip archives ok');
