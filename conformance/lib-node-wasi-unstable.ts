// node:wasi version: 'unstable': the legacy ABI's import module name — the
// same functions, under wasi_unstable — with a guest that imports it
import { WASI } from 'node:wasi';

function code(fn: () => void): string {
  try {
    fn();
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

// (import "wasi_unstable" "proc_exit" (func (param i32)))
// (memory (export "memory") 1)
// (func (export "_start") (call 0 (i32.const 7)))
const wasm = new Uint8Array([
  0, 0x61, 0x73, 0x6d, 1, 0, 0, 0,
  1, 8, 2, 0x60, 1, 0x7f, 0, 0x60, 0, 0,
  2, 0x1b, 1, 13, 119, 97, 115, 105, 95, 117, 110, 115, 116, 97, 98, 108, 101,
  9, 112, 114, 111, 99, 95, 101, 120, 105, 116, 0, 0,
  3, 2, 1, 1,
  5, 3, 1, 0, 1,
  7, 19, 2, 6, 95, 115, 116, 97, 114, 116, 0, 1, 6, 109, 101, 109, 111, 114, 121, 2, 0,
  10, 8, 1, 6, 0, 0x41, 7, 0x10, 0, 0x0b
]);

const wasi = new WASI({ version: 'unstable', returnOnExit: true });
const imports = wasi.getImportObject();
assert(imports.wasi_unstable === wasi.wasiImport, "the import object's module is wasi_unstable");
assert(imports.wasi_snapshot_preview1 === undefined, 'not under the preview1 name');
assert(Object.keys(imports).length === 1, 'one module');

const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), imports);
assert(wasi.start(instance) === 7, 'proc_exit under the legacy name');

const preview = new WASI({ version: 'preview1', returnOnExit: true });
assert(preview.getImportObject().wasi_snapshot_preview1 === preview.wasiImport, 'preview1 unchanged');

assert(
  code(() => new WASI({ version: 'bogus' as any })) ===
    "ERR_INVALID_ARG_VALUE: The property 'options.version' unsupported WASI version. Received 'bogus'",
  'other versions rejected'
);

console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
