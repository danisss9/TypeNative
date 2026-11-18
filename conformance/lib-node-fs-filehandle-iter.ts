import { open, mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function main(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'tn-fh-iter-'));
  const file = join(dir, 'data.txt');

  // 1. writer(): writeSync, writevSync, write, writev, chunkSize threshold, end()
  {
    const fh = await open(file, 'w+');
    const w = fh.writer({ chunkSize: 4 });

    // Eagerly locked while writer is active
    let lockedCode = '';
    try {
      fh.pull();
    } catch (e) {
      lockedCode = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(lockedCode === 'ERR_INVALID_STATE', 'writer eagerly locks FileHandle');

    assert(w.writeSync('abc') === true, 'writeSync within chunkSize returns true');
    assert(w.writeSync('12345') === false, 'writeSync over chunkSize returns false');
    await w.write('12345');
    assert(w.writevSync(['x', new Uint8Array([121])]) === true, 'writevSync within chunkSize');
    assert(w.writevSync(['123', '45']) === false, 'writevSync over chunkSize returns false');
    await w.writev(['z', Buffer.from('!')]);

    const total = await w.end();
    assert(total === 12, 'end() returns total bytes written');
    assert((await w.end()) === 12, 'second end() returns same total');

    let afterCloseCode = '';
    try {
      await w.write('more');
    } catch (e) {
      afterCloseCode = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(afterCloseCode === 'ERR_INVALID_STATE', 'write after end rejects with ERR_INVALID_STATE');
    assert(w.writeSync('more') === false, 'writeSync after end returns false');

    await fh.close();
    assert((await readFile(file, 'utf8')) === 'abc12345xyz!', 'writer produced expected content');
  }

  // 2. writer() with start, limit, endSync, autoClose
  {
    const fh = await open(file, 'r+');
    const w = fh.writer({ start: 3, limit: 5, autoClose: true });
    assert(w.writeSync('ABC') === true, 'positional writeSync');
    assert(w.writeSync('DEF') === false, 'writeSync exceeding limit returns false');
    let rangeCode = '';
    try {
      await w.write('DEF');
    } catch (e) {
      rangeCode = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(rangeCode === 'ERR_OUT_OF_RANGE', 'write exceeding limit rejects with ERR_OUT_OF_RANGE');
    assert(w.writeSync('DE') === true, 'writeSync filling exact remaining limit');
    assert(w.endSync() === 5, 'endSync returns bytes written');

    let closedCode = '';
    try {
      fh.pullSync();
    } catch (e) {
      closedCode = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(closedCode === 'ERR_INVALID_STATE', 'writer autoClose closed FileHandle on endSync');
    assert((await readFile(file, 'utf8')) === 'abcABCDExyz!', 'positional write updated slice');
  }

  // 3. writer() fail() and using / await using disposal
  {
    const fh = await open(file, 'r+');
    const w = fh.writer();
    const boom = new Error('writer failed');
    w.fail(boom);
    let errMsg = '';
    try {
      await w.write('nope');
    } catch (e) {
      errMsg = (e as Error).message;
    }
    assert(errMsg === 'writer failed', 'write after fail rejects with reason');
    assert(w.endSync() === -1, 'endSync after fail returns -1');
    // Handle is unlocked after fail()
    const w2 = fh.writer();
    assert(w2.endSync() === 0, 'handle unlocked after fail()');
    await fh.close();

    // using disposal unlocks & autoCloses
    const fh2 = await open(file, 'r+');
    {
      using _w = fh2.writer({ autoClose: true });
      assert(_w.writeSync('') === true, 'empty writeSync');
    }
    let disposedCode = '';
    try {
      fh2.writer();
    } catch (e) {
      disposedCode = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(disposedCode === 'ERR_INVALID_STATE', 'using disposes writer and autoCloses handle');

    // await using disposal
    const fh3 = await open(file, 'r+');
    {
      await using _w = fh3.writer({ autoClose: true });
      assert(_w.writeSync('') === true, 'empty writeSync in await using');
    }
    let asyncDisposedCode = '';
    try {
      fh3.writer();
    } catch (e) {
      asyncDisposedCode = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(asyncDisposedCode === 'ERR_INVALID_STATE', 'await using disposes writer and autoCloses handle');
  }

  // 4. pull(): basic, chunkSize, start, limit, lazy lock, early break + autoClose
  {
    const fh = await open(file, 'r');
    // Lazy locking: creating pull() without iterating does not lock the handle
    const unused = fh.pull();
    assert(unused !== null, 'pull returns iterable');
    const chunks: string[] = [];
    for await (const batch of fh.pull({ start: 3, limit: 5, chunkSize: 2 })) {
      for (const c of batch) {
        assert(c instanceof Uint8Array, 'pull batch contains Uint8Array');
        chunks.push(Buffer.from(c).toString());
      }
    }
    assert(chunks.join('|') === 'AB|CD|E', 'pull start/limit/chunkSize');

    // Early break unlocks and autoCloses
    let first = '';
    for await (const batch of fh.pull({ chunkSize: 3, autoClose: true })) {
      first = Buffer.from(batch[0]).toString();
      break;
    }
    assert(first === 'abc', 'pull early break read first chunk');
    let closedAfterBreak = '';
    try {
      fh.pull();
    } catch (e) {
      closedAfterBreak = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(closedAfterBreak === 'ERR_INVALID_STATE', 'pull autoClose closed handle on early break');
  }

  // 5. pull() with signal abort and transforms (sync + async + flush)
  {
    const fh = await open(file, 'r');
    const ac = new AbortController();
    ac.abort(new Error('stop'));
    let abortedMsg = '';
    try {
      for await (const _batch of fh.pull({ signal: ac.signal })) {
        // should not yield
      }
    } catch (e) {
      abortedMsg = (e as Error).message;
    }
    assert(abortedMsg === 'stop', 'pull respects aborted signal');

    // Handle is unlocked after aborted pull; test transforms + flush
    const upper = async (batch: Uint8Array[] | null) => {
      if (batch === null) return [Buffer.from('!')];
      return batch.map((c) => Buffer.from(Buffer.from(c).toString().toUpperCase()));
    };
    let out = '';
    for await (const batch of fh.pull(upper, { start: 0, limit: 5, chunkSize: 3, autoClose: true })) {
      for (const c of batch) out += Buffer.from(c).toString();
    }
    assert(out === 'ABCAB!', 'pull async transform + flush');
  }

  // 6. pullSync(): basic, chunkSize, start, limit, early break + autoClose, transform + flush
  {
    const fh = await open(file, 'r');
    const parts: string[] = [];
    for (const batch of fh.pullSync({ start: 8, limit: 4, chunkSize: 2 })) {
      for (const c of batch) {
        assert(c instanceof Uint8Array, 'pullSync batch contains Uint8Array');
        parts.push(Buffer.from(c).toString());
      }
    }
    assert(parts.join('|') === 'xy|z!', 'pullSync start/limit/chunkSize');

    const withFlush = (batch: Uint8Array[] | null) => {
      if (batch === null) return [Buffer.from('.')];
      return batch.map((c) => Buffer.from(Buffer.from(c).toString().toLowerCase()));
    };
    let lowered = '';
    for (const batch of fh.pullSync(withFlush, { start: 3, limit: 5, chunkSize: 3 })) {
      for (const c of batch) lowered += Buffer.from(c).toString();
    }
    assert(lowered === 'abcde.', 'pullSync transform + flush');

    // Early break + autoClose
    let head = '';
    for (const batch of fh.pullSync({ chunkSize: 3, autoClose: true })) {
      head = Buffer.from(batch[0]).toString();
      break;
    }
    assert(head === 'abc', 'pullSync early break');
    let closedSync = '';
    try {
      fh.pullSync();
    } catch (e) {
      closedSync = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(closedSync === 'ERR_INVALID_STATE', 'pullSync autoClose closed handle on early break');
  }

  // 7. Validation errors
  {
    const fh = await open(file, 'r');
    let badStart = '';
    try {
      fh.pullSync({ start: -2 });
    } catch (e) {
      badStart = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(badStart === 'ERR_OUT_OF_RANGE', 'negative start throws ERR_OUT_OF_RANGE');

    let badLimit = '';
    try {
      fh.pull({ limit: 0 });
    } catch (e) {
      badLimit = (e as NodeJS.ErrnoException).code ?? '';
    }
    assert(badLimit === 'ERR_OUT_OF_RANGE', 'zero limit throws ERR_OUT_OF_RANGE');
    await fh.close();
  }

  await rm(dir, { recursive: true, force: true });
  console.log('FileHandle pull / pullSync / writer ok');
}

main();
