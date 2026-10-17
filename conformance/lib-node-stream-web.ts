import { ReadableStream, WritableStream, TransformStream, CountQueuingStrategy } from 'node:stream/web';

async function main(): Promise<void> {
  // Underlying source with start / pull; a default reader
  let n = 0;
  const numbers = new ReadableStream<number>({
    start(controller) {
      controller.enqueue(100);
    },
    pull(controller) {
      n++;
      if (n > 3) {
        controller.close();
        return;
      }
      controller.enqueue(n);
    }
  });
  const reader = numbers.getReader();
  assert(numbers.locked, 'locked while a reader is attached');
  const got: number[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    got.push(value);
  }
  console.log('read:', got.join(','));
  assert(got.join(',') === '100,1,2,3', 'reader order');
  reader.releaseLock();
  assert(!numbers.locked, 'unlocked after releaseLock');

  // for await, async pull
  const letters = new ReadableStream<string>({
    async pull(controller) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
      const next = String.fromCharCode(97 + got.length);
      got.push(0);
      if (got.length > 7) controller.close();
      else controller.enqueue(next);
    }
  });
  const seen: string[] = [];
  for await (const chunk of letters) seen.push(chunk);
  console.log('for await:', seen.join(''));
  assert(seen.join('') === 'efg', 'async iteration');

  // WritableStream with a sink and backpressure
  const written: string[] = [];
  const sink = new WritableStream<string>(
    {
      async write(chunk) {
        await new Promise<void>((resolve) => setTimeout(resolve, 1));
        written.push(chunk.toUpperCase());
      },
      close() {
        written.push('<closed>');
      }
    },
    new CountQueuingStrategy({ highWaterMark: 2 })
  );
  const writer = sink.getWriter();
  assert(writer.desiredSize === 2, 'desiredSize starts at the high-water mark');
  await writer.ready;
  writer.write('a');
  writer.write('b');
  assert(writer.desiredSize === 0, 'queue full');
  await writer.write('c');
  await writer.close();
  console.log('written:', written.join(' '));
  assert(written.join(' ') === 'A B C <closed>', 'sink order');

  // TransformStream + pipeThrough + pipeTo
  const upper = new TransformStream<string, string>({
    transform(chunk, controller) {
      controller.enqueue(chunk.toUpperCase());
      controller.enqueue('|');
    },
    flush(controller) {
      controller.enqueue('END');
    }
  });
  const collected: string[] = [];
  await ReadableStream.from(['x', 'y'])
    .pipeThrough(upper)
    .pipeTo(
      new WritableStream<string>({
        write(chunk) {
          collected.push(chunk);
        }
      })
    );
  console.log('piped:', collected.join(''));
  assert(collected.join('') === 'X|Y|END', 'pipeThrough / pipeTo');

  // tee
  const [left, right] = ReadableStream.from(['1', '2', '3']).tee();
  const a: string[] = [];
  const b: string[] = [];
  for await (const v of left) a.push(v);
  for await (const v of right) b.push(v);
  assert(a.join('') === '123' && b.join('') === '123', 'tee branches');

  // cancel and errors
  let cancelReason = '';
  const cancellable = new ReadableStream<string>({
    cancel(reason) {
      cancelReason = String(reason);
    }
  });
  await cancellable.cancel('stop');
  assert(cancelReason === 'stop', 'cancel reaches the source');
  const failing = new ReadableStream<string>({
    start(controller) {
      controller.error(new Error('boom'));
    }
  });
  try {
    await failing.getReader().read();
    assert(false, 'read of an errored stream rejects');
  } catch (err) {
    console.log('error:', (err as Error).message);
    assert((err as Error).message === 'boom', 'stored error');
  }
  // A stream error ends for await with a throw
  const broken = new ReadableStream<string>({
    pull(controller) {
      controller.enqueue('ok');
      controller.error(new Error('mid-stream'));
    }
  });
  const before: string[] = [];
  try {
    for await (const chunk of broken) before.push(chunk);
    assert(false, 'for await over an erroring stream throws');
  } catch (err) {
    assert((err as Error).message === 'mid-stream', 'for await rethrows the stream error');
  }
  const closed = new ReadableStream<string>({
    start(controller) {
      controller.close();
    }
  });
  const r2 = closed.getReader();
  await r2.closed;
  const end = await r2.read();
  assert(end.done, 'closed stream reads done');
  console.log('done');
}

main();
