import { Duplex, PassThrough, Readable } from 'node:stream';

async function main(): Promise<void> {
  // getReader({ mode: 'byob' }) reads into the caller's view
  const queued = new ReadableStream({
    type: 'bytes',
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
      controller.close();
    }
  });
  const reader = queued.getReader({ mode: 'byob' });
  const first = await reader.read(new Uint8Array(3));
  const second = await reader.read(new Uint8Array(3));
  const last = await reader.read(new Uint8Array(3));
  console.log('reads:', Array.from(first.value).join(','), Array.from(second.value).join(','), last.done, last.value.length);
  assert(Array.from(first.value).join(',') === '1,2,3' && !first.done, 'a read fills the view');
  assert(Array.from(second.value).join(',') === '4,5', 'the rest of the queue');
  assert(last.done && last.value.length === 0, 'done with an empty view');

  // A view is required; a default stream has no BYOB reader
  try {
    await reader.read(undefined as unknown as Uint8Array);
    assert(false, 'read() without a view rejects');
  } catch (err) {
    assert((err as NodeJS.ErrnoException).code === 'ERR_INVALID_ARG_TYPE', 'view required');
  }
  try {
    new ReadableStream().getReader({ mode: 'byob' });
    assert(false, 'not a byte stream');
  } catch (err) {
    assert((err as NodeJS.ErrnoException).code === 'ERR_INVALID_ARG_VALUE', 'byob on a default stream');
  }

  // pull() fills controller.byobRequest's view, then respond(n); { min } waits for more
  let pulls = 0;
  const sizes: number[] = [];
  const pulled = new ReadableStream({
    type: 'bytes',
    pull(controller) {
      const request = controller.byobRequest;
      if (!request || !request.view) return;
      sizes.push(request.view.length);
      pulls++;
      if (pulls === 3) {
        controller.close();
        request.respond(0);
        return;
      }
      request.view[0] = 10 + pulls;
      request.view[1] = 20 + pulls;
      request.respond(2);
    }
  });
  const byob = new ReadableStreamBYOBReader(pulled);
  const a = await byob.read(new Uint8Array(8));
  const b = await byob.read(new Uint8Array(4), { min: 4 });
  const c = await byob.read(new Uint8Array(4));
  console.log('pulled:', Array.from(a.value).join(','), Array.from(b.value).join(','), c.done, sizes.join(','));
  assert(Array.from(a.value).join(',') === '11,21', 'respond(2)');
  assert(Array.from(b.value).join(',') === '12,22', 'min: the close ends a partial read');
  assert(c.done && sizes.join(',') === '8,4,2', 'byobRequest views shrink as they fill');

  // enqueue() while a BYOB read waits copies into its view
  let ctl: ReadableByteStreamController | undefined;
  const pushed = new ReadableStream({
    type: 'bytes',
    start(controller) {
      ctl = controller;
      assert(controller.byobRequest === null, 'no request without a read');
    }
  });
  const pushedReader = pushed.getReader({ mode: 'byob' });
  const pending = pushedReader.read(new Uint8Array(4));
  ctl!.enqueue(new Uint8Array([1, 2, 3, 4, 5, 6]));
  const x = await pending;
  const y = await pushedReader.read(new Uint8Array(4));
  assert(Array.from(x.value).join(',') === '1,2,3,4' && Array.from(y.value).join(',') === '5,6', 'enqueue fills the waiting view');

  // autoAllocateChunkSize: default reads get a byobRequest too
  const auto = new ReadableStream({
    type: 'bytes',
    autoAllocateChunkSize: 16,
    pull(controller) {
      const request = controller.byobRequest!;
      assert(request.view!.length === 16, 'auto-allocated view');
      const view = request.view!;
      view[0] = 7;
      view[1] = 8;
      view[2] = 9;
      request.respond(3);
      controller.close();
    }
  });
  const autoReader = auto.getReader();
  const filled = await autoReader.read();
  const end = await autoReader.read();
  assert(Array.from(filled.value).join(',') === '7,8,9' && end.done, 'auto-allocated read');

  // Duplex.toWeb(duplex, { readableType: 'bytes' }) / Readable.toWeb(readable, { type: 'bytes' })
  const pass = new PassThrough();
  const pair = Duplex.toWeb(pass, { readableType: 'bytes' });
  const bridged = pair.readable.getReader({ mode: 'byob' });
  pass.write('hello world');
  const hello = await bridged.read(new Uint8Array(5));
  const world = await bridged.read(new Uint8Array(64));
  pass.end();
  const over = await bridged.read(new Uint8Array(4));
  console.log('bridged:', Buffer.from(hello.value).toString(), Buffer.from(world.value).toString(), over.done);
  assert(Buffer.from(hello.value).toString() === 'hello' && Buffer.from(world.value).toString() === ' world' && over.done, 'readableType bytes');
  const bytes = Readable.toWeb(Readable.from([new Uint8Array([97, 98])]), { type: 'bytes' }).getReader({ mode: 'byob' });
  const ab = await bytes.read(new Uint8Array(8));
  assert(Buffer.from(ab.value).toString() === 'ab', 'Readable.toWeb type bytes');
}

main();
