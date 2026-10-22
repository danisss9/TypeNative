// createHash / createHmac as streams: write / end with 'readable', pipe into a
// hash, setEncoding on the digest, and pipeline
import { createHash, createHmac } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const expected = createHash('sha256').update('some data to hash').digest('hex');

const hash = createHash('sha256');
hash.on('readable', () => {
  const data = hash.read();
  if (data) {
    assert((data as Buffer).toString('hex') === expected, 'readable gives the digest');
    piped();
  }
});
hash.write('some data ');
hash.write('to hash');
hash.end();

function piped(): void {
  const source = new PassThrough();
  const hmac = createHmac('sha1', 'key');
  let out = '';
  source.pipe(hmac).setEncoding('hex').on('data', (chunk: any) => {
    out += chunk;
  });
  hmac.on('end', () => {
    assert(out === createHmac('sha1', 'key').update('abc').digest('hex'), `piped hmac: ${out}`);
    assert(hmac.digest('hex') === '', 'the stream already took the digest (a finished Hmac digests to "")');
    viaPipeline();
  });
  source.write('a');
  source.end('bc');
}

async function viaPipeline(): Promise<void> {
  const source = new PassThrough();
  const md5 = createHash('md5');
  const chunks: string[] = [];
  md5.setEncoding('base64');
  md5.on('data', (c: any) => chunks.push(String(c)));
  source.end('pipeline data');
  await pipeline(source, md5);
  assert(chunks.join('') === createHash('md5').update('pipeline data').digest('base64'), 'pipeline into a hash');
  console.log('hash streams ok');
}
