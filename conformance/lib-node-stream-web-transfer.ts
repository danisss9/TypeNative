async function main(): Promise<void> {
  // structuredClone(stream, { transfer: [stream] }): a new stream over the
  // original, which stays locked
  const original = new ReadableStream({
    start(controller) {
      controller.enqueue('a');
      controller.enqueue('b');
      controller.close();
    }
  });
  const moved = structuredClone(original, { transfer: [original] });
  console.log('locked:', original.locked, moved.locked, moved === original);
  assert(original.locked && !moved.locked && moved !== original, 'the original is locked');
  const chunks: string[] = [];
  for await (const chunk of moved) chunks.push(chunk);
  console.log('read:', chunks.join(','));
  assert(chunks.join(',') === 'a,b', 'the transferred stream reads the original');

  // A writable: writes reach the original's sink
  const sunk: string[] = [];
  const sink = new WritableStream<string>({
    write(chunk) {
      sunk.push(chunk);
    }
  });
  const movedSink = structuredClone(sink, { transfer: [sink] });
  assert(sink.locked && !movedSink.locked, 'writable transferred');
  const writer = movedSink.getWriter();
  await writer.write('x');
  await writer.write('y');
  await writer.close();
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  console.log('sunk:', sunk.join(','));
  assert(sunk.join(',') === 'x,y', 'writes reach the original');

  // A TransformStream moves both sides
  const upper = new TransformStream<string, string>({
    transform(chunk, controller) {
      controller.enqueue(chunk.toUpperCase());
    }
  });
  const movedUpper = structuredClone(upper, { transfer: [upper] });
  assert(upper.readable.locked && upper.writable.locked, 'both sides locked');
  const upperWriter = movedUpper.writable.getWriter();
  upperWriter.write('hi');
  upperWriter.close();
  const out: string[] = [];
  for await (const chunk of movedUpper.readable) out.push(chunk);
  assert(out.join('') === 'HI', 'transferred transform');

  // Not in the transfer list: DataCloneError
  try {
    structuredClone(new ReadableStream());
    assert(false, 'a stream must be transferred');
  } catch (err) {
    console.log((err as Error).name);
    assert((err as Error).name === 'DataCloneError', 'DataCloneError');
  }
}

main();
