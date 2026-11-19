// node:zlib/iter — iterable compression / decompression transforms (sync + async)
// for Gzip, Deflate, Brotli, and Zstd, including FileHandle pull / pullSync pipelines.
import {
  gunzipSync,
  inflateSync,
  brotliDecompressSync,
  zstdDecompressSync,
  constants
} from 'node:zlib';
import {
  compressGzipSync,
  decompressGzipSync,
  compressDeflateSync,
  decompressDeflateSync,
  compressBrotliSync,
  decompressBrotliSync,
  compressZstdSync,
  decompressZstdSync,
  compressGzip,
  decompressGzip,
  compressDeflate,
  decompressDeflate,
  compressBrotli,
  decompressBrotli,
  compressZstd,
  decompressZstd
} from 'node:zlib/iter';
import { open, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function concatBatches(batches: Uint8Array[][]): Buffer {
  const parts: Uint8Array[] = [];
  for (const batch of batches) {
    for (const c of batch) parts.push(c);
  }
  return Buffer.concat(parts);
}

function runSync(
  tr: { transform(src: Iterable<Uint8Array[] | null>): Iterable<Uint8Array[]> },
  batches: (Uint8Array[] | null)[]
): Buffer {
  function* src(): Generator<Uint8Array[] | null, void> {
    for (const b of batches) yield b;
  }
  const out: Uint8Array[][] = [];
  for (const b of tr.transform(src())) {
    out.push(b);
  }
  return concatBatches(out);
}

async function runAsync(
  tr: { transform(src: AsyncIterable<Uint8Array[] | null>, opts?: { signal?: AbortSignal }): AsyncIterable<Uint8Array[]> },
  batches: (Uint8Array[] | null)[],
  signal?: AbortSignal
): Promise<Buffer> {
  async function* src(): AsyncGenerator<Uint8Array[] | null, void> {
    for (const b of batches) yield b;
  }
  const out: Uint8Array[][] = [];
  const opts = signal ? { signal } : { signal: new AbortController().signal };
  for await (const b of tr.transform(src(), opts)) {
    out.push(b);
  }
  return concatBatches(out);
}

async function main(): Promise<void> {
  const text = 'Hello iterable compression! '.repeat(30);
  const b1: Uint8Array[] = [Buffer.from(text.slice(0, 60)), Buffer.from(text.slice(60, 250))];
  const b2: Uint8Array[] = [Buffer.from(text.slice(250))];

  // 1. Gzip sync round-trip + compatibility with gunzipSync
  {
    const gz = runSync(compressGzipSync(), [b1, b2, null]);
    assert(gz[0] === 0x1f && gz[1] === 0x8b, 'compressGzipSync produces gzip header');
    assert(gunzipSync(gz).toString() === text, 'gunzipSync reads compressGzipSync output');

    const ungz = runSync(decompressGzipSync(), [[gz.subarray(0, 12)], [gz.subarray(12)], null]);
    assert(ungz.toString() === text, 'decompressGzipSync round-trip across chunk boundaries');

    // Options: level 1 vs level 9
    const gzFast = runSync(compressGzipSync({ level: 1 }), [b1, b2, null]);
    const gzBest = runSync(compressGzipSync({ level: 9 }), [b1, b2, null]);
    assert(gunzipSync(gzFast).toString() === text, 'compressGzipSync level 1');
    assert(gunzipSync(gzBest).toString() === text, 'compressGzipSync level 9');
  }

  // 2. Deflate sync round-trip + compatibility with inflateSync
  {
    const df = runSync(compressDeflateSync(), [b1, b2, null]);
    assert(df[0] === 0x78, 'compressDeflateSync produces zlib-wrapped deflate header');
    assert(inflateSync(df).toString() === text, 'inflateSync reads compressDeflateSync output');

    const undf = runSync(decompressDeflateSync(), [[df.subarray(0, 5)], [df.subarray(5)], null]);
    assert(undf.toString() === text, 'decompressDeflateSync round-trip');
  }

  // 3. Brotli sync round-trip + compatibility with brotliDecompressSync
  {
    const br = runSync(compressBrotliSync(), [b1, b2, null]);
    assert(brotliDecompressSync(br).toString() === text, 'brotliDecompressSync reads compressBrotliSync output');

    const unbr = runSync(decompressBrotliSync(), [[br.subarray(0, 7)], [br.subarray(7)], null]);
    assert(unbr.toString() === text, 'decompressBrotliSync round-trip');

    const brQ1 = runSync(compressBrotliSync({ params: { [constants.BROTLI_PARAM_QUALITY]: 1 } }), [b1, b2, null]);
    assert(brotliDecompressSync(brQ1).toString() === text, 'compressBrotliSync quality param');
  }

  // 4. Zstd sync round-trip + compatibility with zstdDecompressSync
  {
    const zs = runSync(compressZstdSync(), [b1, b2, null]);
    assert(zstdDecompressSync(zs).toString() === text, 'zstdDecompressSync reads compressZstdSync output');

    const unzs = runSync(decompressZstdSync(), [[zs.subarray(0, 8)], [zs.subarray(8)], null]);
    assert(unzs.toString() === text, 'decompressZstdSync round-trip');

    const zsL1 = runSync(compressZstdSync({ params: { [constants.ZSTD_c_compressionLevel]: 1 } }), [b1, b2, null]);
    assert(zstdDecompressSync(zsL1).toString() === text, 'compressZstdSync level param');
  }

  // 5. Transform reusability (same transform object used twice)
  {
    const gzTr = compressGzipSync();
    const a = runSync(gzTr, [[Buffer.from('first run')], null]);
    const b = runSync(gzTr, [[Buffer.from('second run')], null]);
    assert(gunzipSync(a).toString() === 'first run', 'reusable transform first run');
    assert(gunzipSync(b).toString() === 'second run', 'reusable transform second run');
  }

  // 6. Empty input round-trips
  {
    const emptyGz = runSync(compressGzipSync(), [null]);
    assert(runSync(decompressGzipSync(), [[emptyGz], null]).length === 0, 'empty gzip round-trip');

    const emptyDf = runSync(compressDeflateSync(), [null]);
    assert(runSync(decompressDeflateSync(), [[emptyDf], null]).length === 0, 'empty deflate round-trip');

    const emptyBr = runSync(compressBrotliSync(), [null]);
    assert(runSync(decompressBrotliSync(), [[emptyBr], null]).length === 0, 'empty brotli round-trip');

    const emptyZs = runSync(compressZstdSync(), [null]);
    assert(runSync(decompressZstdSync(), [[emptyZs], null]).length === 0, 'empty zstd round-trip');
  }

  // 7. Corrupt input & empty decompress error codes
  {
    const bad = Buffer.from('definitely not valid compressed bytes');
    let gzipErr = '';
    try {
      runSync(decompressGzipSync(), [[bad], null]);
    } catch (e) {
      gzipErr = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(gzipErr === 'Z_DATA_ERROR', 'corrupt gzip throws Z_DATA_ERROR');

    let deflateErr = '';
    try {
      runSync(decompressDeflateSync(), [[bad], null]);
    } catch (e) {
      deflateErr = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(deflateErr === 'Z_DATA_ERROR', 'corrupt deflate throws Z_DATA_ERROR');

    let brotliErr = '';
    try {
      runSync(decompressBrotliSync(), [[bad], null]);
    } catch (e) {
      brotliErr = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(brotliErr.startsWith('ERR__ERROR_'), 'corrupt brotli throws ERR__ERROR_*');

    let zstdErr = '';
    try {
      runSync(decompressZstdSync(), [[bad], null]);
    } catch (e) {
      zstdErr = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(zstdErr === 'ZSTD_error_prefix_unknown', 'corrupt zstd throws ZSTD_error_prefix_unknown');

    // Empty input to decompressors throws Z_BUF_ERROR
    for (const [label, tr] of [
      ['gzip', decompressGzipSync()],
      ['deflate', decompressDeflateSync()],
      ['brotli', decompressBrotliSync()],
      ['zstd', decompressZstdSync()]
    ] as const) {
      let emptyErr = '';
      try {
        runSync(tr, [null]);
      } catch (e) {
        emptyErr = (e as NodeJS.ErrnoException).code ?? '';
      }
      assert(emptyErr === 'Z_BUF_ERROR', `empty ${label} decompress throws Z_BUF_ERROR`);
    }
  }

  // 8. Async variants (gzip, deflate, brotli, zstd) + AbortSignal
  {
    const gza = await runAsync(compressGzip(), [b1, b2, null]);
    const ungza = await runAsync(decompressGzip(), [[gza], null]);
    assert(ungza.toString() === text, 'async gzip round-trip');

    const dfa = await runAsync(compressDeflate(), [b1, b2, null]);
    const undfa = await runAsync(decompressDeflate(), [[dfa], null]);
    assert(undfa.toString() === text, 'async deflate round-trip');

    const bra = await runAsync(compressBrotli(), [b1, b2, null]);
    const unbra = await runAsync(decompressBrotli(), [[bra], null]);
    assert(unbra.toString() === text, 'async brotli round-trip');

    const zsa = await runAsync(compressZstd(), [b1, b2, null]);
    const unzsa = await runAsync(decompressZstd(), [[zsa], null]);
    assert(unzsa.toString() === text, 'async zstd round-trip');

    // Pre-aborted signal
    const ac = new AbortController();
    ac.abort(new Error('cancelled'));
    let abortMsg = '';
    try {
      await runAsync(compressGzip(), [b1, null], ac.signal);
    } catch (e) {
      abortMsg = (e as Error).message;
    }
    assert(abortMsg === 'cancelled', 'async compressGzip respects pre-aborted signal');

    // Mid-stream abort
    const ac2 = new AbortController();
    async function* midAbortSrc(): AsyncGenerator<Uint8Array[] | null, void> {
      yield [Buffer.from('first')];
      ac2.abort(new Error('mid-stop'));
      yield [Buffer.from('second')];
      yield null;
    }
    let midMsg = '';
    try {
      for await (const _b of compressGzip().transform(midAbortSrc(), { signal: ac2.signal })) {
        // consume
      }
    } catch (e) {
      midMsg = (e as Error).message;
    }
    assert(midMsg === 'mid-stop', 'async compressGzip respects mid-stream abort');
  }

  // 9. FileHandle pullSync / pull pipelines with iterable compression transforms
  {
    const dir = await mkdtemp(join(tmpdir(), 'tn-zlib-iter-'));
    const file = join(dir, 'sample.txt');
    await writeFile(file, text);

    // pullSync + compressGzipSync
    const fh1 = await open(file, 'r');
    const gzBatches: Uint8Array[][] = [];
    for (const batch of fh1.pullSync(compressGzipSync(), { chunkSize: 64, autoClose: true })) {
      gzBatches.push(batch);
    }
    assert(gunzipSync(concatBatches(gzBatches)).toString() === text, 'FileHandle.pullSync(compressGzipSync())');

    // pullSync chained compress + decompress (gzip)
    const fh2 = await open(file, 'r');
    const rtBatches: Uint8Array[][] = [];
    for (const batch of fh2.pullSync(compressGzipSync(), decompressGzipSync(), { chunkSize: 64, autoClose: true })) {
      rtBatches.push(batch);
    }
    assert(concatBatches(rtBatches).toString() === text, 'FileHandle.pullSync(compressGzipSync(), decompressGzipSync())');

    // pullSync chained compress + decompress (zstd)
    const fh3 = await open(file, 'r');
    const zsBatches: Uint8Array[][] = [];
    for (const batch of fh3.pullSync(compressZstdSync(), decompressZstdSync(), { chunkSize: 64, autoClose: true })) {
      zsBatches.push(batch);
    }
    assert(concatBatches(zsBatches).toString() === text, 'FileHandle.pullSync(compressZstdSync(), decompressZstdSync())');

    // pull chained async compress + decompress (brotli)
    const fh4 = await open(file, 'r');
    const brBatches: Uint8Array[][] = [];
    for await (const batch of fh4.pull(compressBrotli(), decompressBrotli(), { chunkSize: 64, autoClose: true })) {
      brBatches.push(batch);
    }
    assert(concatBatches(brBatches).toString() === text, 'FileHandle.pull(compressBrotli(), decompressBrotli())');

    await rm(dir, { recursive: true, force: true });
  }

  console.log('zlib/iter ok');
}

main();
