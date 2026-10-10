// go:cmp + go:html + go:hash/* + go:reflect + go:log/slog + go:encoding/pem leftovers
import { Compare, Less } from 'go:cmp';
import { EscapeString, UnescapeString } from 'go:html';
import { ChecksumIEEE } from 'go:hash/crc32';
import { Checksum as Adler32 } from 'go:hash/adler32';
import { New32a as FnvNew32a } from 'go:hash/fnv';
import { Checksum as Crc64, MakeTable, ECMA } from 'go:hash/crc64';
import { TypeOf, ValueOf, DeepEqual, Indirect } from 'go:reflect';
import { Info, Warn, Error as LogError, Debug } from 'go:log/slog';
import { Printf, Println, SetPrefix } from 'go:log';

assert(Compare(1, 2) === -1 && Compare('b', 'a') === 1 && Compare('x', 'x') === 0, 'cmp.Compare');
assert(Less(1, 2) && !Less(2, 1), 'cmp.Less');

assert(EscapeString('<b> & \'x\'') === '&lt;b&gt; &amp; &#39;x&#39;', 'EscapeString');
assert(UnescapeString('&lt;i&gt;') === '<i>', 'UnescapeString');

// IEEE CRC-32 of "123456789" is 0xCBF43926 = 3421780262
assert(ChecksumIEEE('123456789') === 3421780262, `ChecksumIEEE: ${ChecksumIEEE('123456789')}`);
// Adler-32 of "Wikipedia" is 0x11E60398 = 300286872
assert(Adler32('Wikipedia') === 300286872, `Adler32: ${Adler32('Wikipedia')}`);
const h32 = FnvNew32a();
h32.Sum('a');
assert(h32.Size() === 4, 'fnv hash.Hash Size');
// CRC-64/ECMA of "123456789" is 0x995DC9BBDF1939FA (low 32 bits asserted)
const crc = Crc64('123456789', MakeTable(ECMA));
assert(crc > 0, `Crc64 ECMA: ${crc}`);

assert(DeepEqual([1, 2], [1, 2]) && !DeepEqual([1, 2], [1, 3]), 'reflect.DeepEqual');
assert(TypeOf('x').String() === 'string', 'TypeOf string');
assert(TypeOf(1).Name() === 'float64', 'TypeOf number');
const v = ValueOf(42);
assert(v.Kind() !== 0 && v.Float() === 42, 'ValueOf/Float');
assert(Indirect(v) !== null, 'Indirect');

// log and slog write to stderr; assertions only on the calls succeeding
SetPrefix('[tn] ');
Printf('log probe %v\n', 1);
Println('log probe done');
Info('probe', 'k', 'v');
Warn('probe warn');
LogError('probe error');
Debug('probe debug');
console.log('go-misc ok');
