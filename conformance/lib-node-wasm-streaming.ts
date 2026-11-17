// WebAssembly.compileStreaming / instantiateStreaming: a Response (or a
// promise of one) with the MIME type application/wasm is read and compiled
function code(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

async function rejects(fn: () => unknown): Promise<string> {
  try {
    await fn();
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log(`FAIL ${label}`);
  }
}

// (func (export "main") (result i32) (i32.const 2))
const bytes = new Uint8Array([
  0, 0x61, 0x73, 0x6d, 1, 0, 0, 0,
  1, 5, 1, 0x60, 0, 1, 0x7f,
  3, 2, 1, 0,
  7, 8, 1, 4, 109, 97, 105, 110, 0, 0,
  10, 6, 1, 4, 0, 0x41, 2, 0x0b
]);

function response(body: Uint8Array, mime: string): any {
  const headers: Record<string, string> = mime === '' ? {} : { 'content-type': mime };
  return new Response(body, { headers });
}

async function main(): Promise<void> {
  const mod = await WebAssembly.compileStreaming(response(bytes, 'application/wasm'));
  assert(mod instanceof WebAssembly.Module, 'compileStreaming compiles');

  const source = await WebAssembly.instantiateStreaming(response(bytes, 'application/wasm'));
  assert(source.module instanceof WebAssembly.Module && source.instance instanceof WebAssembly.Instance, 'instantiateStreaming');
  assert((source.instance.exports as unknown as { main(): number }).main() === 2, 'runs');

  const promised = await WebAssembly.compileStreaming(Promise.resolve(response(bytes, 'application/wasm')));
  assert(promised instanceof WebAssembly.Module, 'a promise of a Response');

  assert(
    (await rejects(() => WebAssembly.compileStreaming(42 as any))) ===
      'ERR_INVALID_ARG_TYPE: The "source" argument must be an instance of Response or an Promise resolving to Response. Received type number (42)',
    'a number is rejected'
  );
  assert(
    (await rejects(() => WebAssembly.compileStreaming({} as any))) ===
      'ERR_INVALID_ARG_TYPE: The "source" argument must be an instance of Response or an Promise resolving to Response. Received an instance of Object',
    'a plain object is rejected'
  );
  assert(
    (await rejects(() => WebAssembly.compileStreaming(response(bytes, 'text/plain')))) ===
      "ERR_WEBASSEMBLY_RESPONSE: WebAssembly response has unsupported MIME type 'text/plain'",
    'wrong MIME type'
  );
  assert(
    (await rejects(() => WebAssembly.compileStreaming(response(bytes, '')))) ===
      "ERR_WEBASSEMBLY_RESPONSE: WebAssembly response has unsupported MIME type 'null'",
    'no MIME type'
  );
  const bad = new Uint8Array([1, 2, 3]);
  let compileError = '';
  try {
    await WebAssembly.compileStreaming(response(bad, 'application/wasm'));
  } catch (e) {
    compileError = `${(e as Error).name}: ${(e as Error).message}`;
  }
  assert(compileError.startsWith('CompileError:'), 'bad bytes are a CompileError');

  console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
}
main();
