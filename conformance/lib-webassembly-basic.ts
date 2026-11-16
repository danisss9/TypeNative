// WebAssembly: validate / compile / instantiate, i32 / i64 / f64 / multi-value exports, JS imports (a throw crosses wasm), traps, memory views and grow, globals, Module.imports / exports / customSections
/* The module, in WAT:
(module
  (import "env" "log" (func (param i32)))
  (import "env" "fail" (func))
  (import "env" "twice" (func (param i32) (result i32)))
  (memory (export "memory") 1 4)
  (global (export "counter") (mut i32) (i32.const 5))
  (func (export "add") (param i32 i32) (result i32) (i32.add (local.get 0) (local.get 1)))
  (func (export "add64") (param i64 i64) (result i64) (i64.add (local.get 0) (local.get 1)))
  (func (export "callLog") (param i32) (call 0 (local.get 0)))
  (func (export "callFail") (call 1))
  (func (export "trap") unreachable)
  (func (export "divrem") (param i32 i32) (result i32 i32)
    (i32.div_s (local.get 0) (local.get 1)) (i32.rem_s (local.get 0) (local.get 1)))
  (func (export "addf") (param f64 f64) (result f64) (f64.add (local.get 0) (local.get 1)))
  (func (export "load") (param i32) (result i32) (i32.load8_u (local.get 0)))
  (func (export "bump") (result i32)
    (global.set 0 (i32.add (global.get 0) (i32.const 1))) (global.get 0))
  (func (export "viaTwice") (param i32) (result i32) (i32.add (call 2 (local.get 0)) (i32.const 1)))
  (data (i32.const 16) "hi")
  (@custom "meta" "\01\02\03"))
*/
const basicWasm = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x2a, 0x08, 0x60, 0x01, 0x7f, 0x00, 0x60,
  0x00, 0x00, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x60, 0x02, 0x7e, 0x7e, 0x01, 0x7e, 0x60, 0x02,
  0x7f, 0x7f, 0x02, 0x7f, 0x7f, 0x60, 0x02, 0x7c, 0x7c, 0x01, 0x7c, 0x60, 0x01, 0x7f, 0x01, 0x7f,
  0x60, 0x00, 0x01, 0x7f, 0x02, 0x22, 0x03, 0x03, 0x65, 0x6e, 0x76, 0x03, 0x6c, 0x6f, 0x67, 0x00,
  0x00, 0x03, 0x65, 0x6e, 0x76, 0x04, 0x66, 0x61, 0x69, 0x6c, 0x00, 0x01, 0x03, 0x65, 0x6e, 0x76,
  0x05, 0x74, 0x77, 0x69, 0x63, 0x65, 0x00, 0x06, 0x03, 0x0b, 0x0a, 0x02, 0x03, 0x00, 0x01, 0x01,
  0x04, 0x05, 0x06, 0x07, 0x06, 0x05, 0x04, 0x01, 0x01, 0x01, 0x04, 0x06, 0x06, 0x01, 0x7f, 0x01,
  0x41, 0x05, 0x0b, 0x07, 0x67, 0x0c, 0x03, 0x61, 0x64, 0x64, 0x00, 0x03, 0x05, 0x61, 0x64, 0x64,
  0x36, 0x34, 0x00, 0x04, 0x07, 0x63, 0x61, 0x6c, 0x6c, 0x4c, 0x6f, 0x67, 0x00, 0x05, 0x08, 0x63,
  0x61, 0x6c, 0x6c, 0x46, 0x61, 0x69, 0x6c, 0x00, 0x06, 0x04, 0x74, 0x72, 0x61, 0x70, 0x00, 0x07,
  0x06, 0x64, 0x69, 0x76, 0x72, 0x65, 0x6d, 0x00, 0x08, 0x04, 0x61, 0x64, 0x64, 0x66, 0x00, 0x09,
  0x04, 0x6c, 0x6f, 0x61, 0x64, 0x00, 0x0a, 0x04, 0x62, 0x75, 0x6d, 0x70, 0x00, 0x0b, 0x08, 0x76,
  0x69, 0x61, 0x54, 0x77, 0x69, 0x63, 0x65, 0x00, 0x0c, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79,
  0x02, 0x00, 0x07, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x65, 0x72, 0x03, 0x00, 0x0a, 0x54, 0x0a, 0x07,
  0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x7c, 0x0b, 0x06,
  0x00, 0x20, 0x00, 0x10, 0x00, 0x0b, 0x04, 0x00, 0x10, 0x01, 0x0b, 0x03, 0x00, 0x00, 0x0b, 0x0c,
  0x00, 0x20, 0x00, 0x20, 0x01, 0x6d, 0x20, 0x00, 0x20, 0x01, 0x6f, 0x0b, 0x07, 0x00, 0x20, 0x00,
  0x20, 0x01, 0xa0, 0x0b, 0x07, 0x00, 0x20, 0x00, 0x2d, 0x00, 0x00, 0x0b, 0x0b, 0x00, 0x23, 0x00,
  0x41, 0x01, 0x6a, 0x24, 0x00, 0x23, 0x00, 0x0b, 0x09, 0x00, 0x20, 0x00, 0x10, 0x02, 0x41, 0x01,
  0x6a, 0x0b, 0x0b, 0x08, 0x01, 0x00, 0x41, 0x10, 0x0b, 0x02, 0x68, 0x69, 0x00, 0x08, 0x04, 0x6d,
  0x65, 0x74, 0x61, 0x01, 0x02, 0x03
]);

assert(WebAssembly.validate(basicWasm), 'validate: a valid module');
assert(!WebAssembly.validate(new Uint8Array([0, 0x61, 0x73, 0x6d, 2, 0, 0, 0])), 'validate: a bad version');

type Api = {
  add(a: number, b: number): number;
  add64(a: bigint, b: bigint): bigint;
  callLog(x: number): void;
  callFail(): void;
  trap(): void;
  divrem(a: number, b: number): number[];
  addf(a: number, b: number): number;
  load(at: number): number;
  bump(): number;
  viaTwice(x: number): number;
};

async function main(): Promise<void> {
  const logged: number[] = [];
  const imports = {
    env: {
      log: (x: number) => {
        logged.push(x);
      },
      fail: () => {
        throw new Error('boom');
      },
      twice: (x: number) => x * 2
    }
  };
  const { module, instance } = await WebAssembly.instantiate(basicWasm, imports);
  const api = instance.exports as unknown as Api;
  assert(api.add(2, 3) === 5, 'i32 add');
  assert(api.add(0x7fffffff, 1) === -2147483648, 'i32 wraps');
  assert(api.add64(1n, 2n) === 3n, 'i64 as bigint');
  assert(api.add64(9223372036854775807n, 1n) === -9223372036854775808n, 'i64 wraps');
  const qr = api.divrem(17, 5);
  assert(qr.length === 2 && qr[0] === 3 && qr[1] === 2, 'multi-value results');
  assert(api.addf(0.5, 0.25) === 0.75, 'f64');
  assert(api.viaTwice(20) === 41, 'an import returning a value');
  api.callLog(7);
  assert(logged.length === 1 && logged[0] === 7, 'an import called from wasm');

  let thrown = '';
  try {
    api.callFail();
  } catch (e) {
    thrown = (e as Error).message;
  }
  assert(thrown === 'boom', 'a JS throw crosses wasm unchanged');

  let trapped = false;
  try {
    api.trap();
  } catch (e) {
    trapped = e instanceof WebAssembly.RuntimeError;
    assert((e as Error).message.includes('unreachable'), 'the trap message');
  }
  assert(trapped, 'a trap is a RuntimeError');

  // memory: a view of the bytes, writable from JS
  const memory = instance.exports.memory as WebAssembly.Memory;
  assert(memory instanceof WebAssembly.Memory, 'an exported memory');
  const bytes = new Uint8Array(memory.buffer);
  assert(bytes.length === 65536 && bytes[16] === 0x68 && bytes[17] === 0x69, 'the data segment');
  bytes[100] = 42;
  assert(api.load(100) === 42, 'wasm sees JS writes');
  assert(memory.grow(1) === 1, 'grow returns the old page count');
  assert(memory.buffer.byteLength === 131072, 'the buffer after grow');
  let rangeError = false;
  try {
    memory.grow(10);
  } catch (e) {
    rangeError = (e as Error).name === 'RangeError';
  }
  assert(rangeError, 'grow past the maximum');

  // a mutable global, read and written from both sides
  const counter = instance.exports.counter as WebAssembly.Global;
  assert(counter.value === 5, 'global value');
  assert(api.bump() === 6 && counter.value === 6, 'wasm writes the global');
  counter.value = 40;
  assert(api.bump() === 41, 'JS writes the global');

  // the module's descriptors
  const imps = WebAssembly.Module.imports(module);
  assert(imps.length === 3 && imps[0].module === 'env' && imps[0].name === 'log' && imps[0].kind === 'function', 'Module.imports');
  const exps = WebAssembly.Module.exports(module);
  assert(exps.length === 12 && exps[10].name === 'memory' && exps[10].kind === 'memory' && exps[11].kind === 'global', 'Module.exports');
  const meta = WebAssembly.Module.customSections(module, 'meta');
  assert(meta.length === 1 && new Uint8Array(meta[0])[2] === 3, 'Module.customSections');

  // compile, then instantiate the module (an Instance, not a pair)
  const compiled = await WebAssembly.compile(basicWasm);
  const again = await WebAssembly.instantiate(compiled, imports);
  assert((again.exports as unknown as Api).add(40, 2) === 42, 'instantiate(module)');
  const sync = new WebAssembly.Instance(new WebAssembly.Module(basicWasm), imports);
  assert((sync.exports as unknown as Api).bump() === 6, 'new Instance: its own globals');

  // errors: CompileError, LinkError, TypeError for missing imports
  let compileError = false;
  try {
    new WebAssembly.Module(new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0, 0x01, 0x05]));
  } catch (e) {
    compileError = e instanceof WebAssembly.CompileError && e instanceof Error;
  }
  assert(compileError, 'a truncated module is a CompileError');
  let rejected = false;
  await WebAssembly.compile(new Uint8Array([1, 2, 3])).catch((e: unknown) => {
    rejected = e instanceof WebAssembly.CompileError;
  });
  assert(rejected, 'compile rejects');
  let linkError = false;
  try {
    new WebAssembly.Instance(compiled, { env: { log: 1, fail: () => {}, twice: (x: number) => x } });
  } catch (e) {
    linkError = e instanceof WebAssembly.LinkError;
  }
  assert(linkError, 'a non-callable function import is a LinkError');
  let typeError = false;
  try {
    new WebAssembly.Instance(compiled, {});
  } catch (e) {
    typeError = e instanceof TypeError;
  }
  assert(typeError, 'a missing namespace is a TypeError');
  const custom = new WebAssembly.RuntimeError('mine');
  assert(custom instanceof WebAssembly.RuntimeError && !(custom instanceof WebAssembly.LinkError) && custom.message === 'mine', 'new RuntimeError');
  console.log('ok');
}

main();

export {};
