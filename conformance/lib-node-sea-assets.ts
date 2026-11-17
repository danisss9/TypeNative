// conformance-flags: --sea-config sea-assets.json
// (the config resolves beside the entry file, or from the working directory)
// node:sea assets (--sea-config): the config's files are embedded in the
// binary and read back by getAsset / getRawAsset / getAssetAsBlob
import { getAsset, getRawAsset, getAssetAsBlob, isSea } from 'node:sea';

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log(`FAIL ${label}`);
  }
}

function code(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

function equalsBytes(a: ArrayBuffer | Uint8Array, bytes: number[]): boolean {
  const view = a instanceof Uint8Array ? a : new Uint8Array(a);
  return view.length === bytes.length && bytes.every((b, i) => view[i] === b);
}

assert(isSea(), 'isSea');

// getAsset without an encoding: the asset's bytes (a copy)
const raw = getAsset('text');
assert(equalsBytes(raw, [...'embedded by the SEA config'].map((c) => c.charCodeAt(0))), "getAsset('text') bytes");
// a second call returns another copy (mutating one does not affect the next)
const first = new Uint8Array(getAsset('text'));
first[0] = 0x41;
assert(new Uint8Array(getAsset('text'))[0] === 101, 'getAsset copies');

// with an encoding: a string
assert(getAsset('text', 'utf8') === 'embedded by the SEA config', "getAsset('text', 'utf8')");

const binary = getRawAsset('binary');
assert(equalsBytes(binary, [0x00, 0x01, 0x02, 0xff, 0xfe, 0x64, 0x65, 0x61, 0x64, 0x62, 0x65, 0x65, 0x66]), "getRawAsset('binary') bytes");
assert(getRawAsset('binary').byteLength === 13, 'getRawAsset length');

const blob = getAssetAsBlob('text');
assert(blob.size === 26, 'getAssetAsBlob size');

// a key the config doesn't name
assert(
  code(() => getAsset('missing')) ===
    'ERR_SINGLE_EXECUTABLE_APPLICATION_ASSET_NOT_FOUND: Cannot find asset missing for the single executable application',
  'missing key'
);

console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
