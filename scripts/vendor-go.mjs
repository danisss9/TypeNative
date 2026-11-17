// Vendors the third-party Go modules generated programs may link against into
// govendor/, so `typenative` builds stay offline (the npm package ships them).
// Today that is node:sqlite's driver, github.com/ncruces/go-sqlite3 (SQLite
// compiled to Wasm and translated to Go: no cgo), zlib's Brotli codec
// (github.com/andybalholm/brotli, pure Go), fs.watch's file-system
// notifications (github.com/fsnotify/fsnotify), the WebAssembly runtime
// (github.com/tetratelabs/wazero), node:ffi's dlopen without cgo
// (github.com/ebitengine/purego), node:http2's frame APIs and node:dns's
// message codec (golang.org/x/net), and their dependencies.
//
// Bump a version in MODULES, run `npm run vendor:go`, then `npm run conformance`.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MODULES = [
  ['github.com/ncruces/go-sqlite3', 'v0.35.6'],
  ['github.com/andybalholm/brotli', 'v1.2.6'],
  // node:zlib's Zstd codecs (pure Go; decodes libzstd's frames). `go mod
  // vendor` only copies imported packages, so the zstd subpackage is listed too
  ['github.com/klauspost/compress', 'v1.20.4', ['zstd'].map((p) => `github.com/klauspost/compress/${p}`)],
  ['github.com/fsnotify/fsnotify', 'v1.10.1'],
  ['github.com/jchv/go-webview2', 'v0.0.0-20260205173254-56598839c808'],
  // node:ffi's dlopen / dlsym and native callbacks on Unix without cgo
  // (Windows uses syscall's LoadLibrary / NewCallback)
  ['github.com/ebitengine/purego', 'v0.11.3'],
  // node:http2's session frames (PING / SETTINGS / GOAWAY / ALTSVC) and its
  // unpacked settings: net/http hides the frames of the connection it owns
  ['golang.org/x/net', 'v0.62.0', ['golang.org/x/net/http2', 'golang.org/x/net/dns/dnsmessage'], true],
  // the WebAssembly global and node:wasi's runtime (pure Go, no cgo); `go mod
  // vendor` only copies imported packages, so the subpackages the helpers use
  // are listed too
  [
    'github.com/tetratelabs/wazero',
    'v1.12.0',
    ['api', 'experimental', 'imports/wasi_snapshot_preview1', 'sys'].map((p) => `github.com/tetratelabs/wazero/${p}`)
  ],
  // Intl's locale data (and String.normalize's norm, imported on its own):
  // language tags and matching, plural rules, currency codes, collation,
  // locale case mapping, display names. The patterns and symbols Node's Intl
  // formats with come from src/node/intl_data.ts, generated from Node itself
  [
    'golang.org/x/text',
    'v0.44.0',
    ['language', 'language/display', 'feature/plural', 'currency', 'collate', 'cases', 'transform', 'unicode/norm'].map(
      (p) => `golang.org/x/text/${p}`
    )
  ],
  // node:crypto / node:tls: PKCS#12 (PFX) bundles, secp256k1, Ed448 / X448
  ['software.sslmate.com/src/go-pkcs12', 'v0.7.4'],
  ['github.com/decred/dcrd/dcrec/secp256k1/v4', 'v4.4.1', ['github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa']],
  ['github.com/cloudflare/circl', 'v1.6.5', ['sign/ed448', 'dh/x448'].map((p) => `github.com/cloudflare/circl/${p}`)]
];

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'govendor');
const work = mkdtempSync(path.join(tmpdir(), 'tn-vendor-'));

function run(args) {
  const result = spawnSync('go', args, { cwd: work, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  writeFileSync(path.join(work, 'go.mod'), 'module tnvendor\n\ngo 1.26.0\n');
  writeFileSync(
    path.join(work, 'main.go'),
    `package main\n\nimport (\n${MODULES.flatMap(([mod, , extra, skipRoot]) => (skipRoot ? extra : [mod, ...(extra ?? [])]).map((p) => `\t_ "${p}"\n`)).join('')})\n\nfunc main() {}\n`
  );
  run(['get', ...MODULES.map(([mod, version]) => `${mod}@${version}`)]);
  run(['mod', 'tidy']);
  run(['mod', 'vendor']);

  // vendor/modules.txt: "# path version" then "## explicit; go 1.x"
  const modules = [];
  for (const line of readFileSync(path.join(work, 'vendor', 'modules.txt'), 'utf-8').split('\n')) {
    const header = line.match(/^# (\S+) (\S+)$/);
    if (header) modules.push({ path: header[1], version: header[2], go: '' });
    const goLine = line.match(/^## .*\bgo (\S+)/);
    if (goLine && modules.length > 0) modules[modules.length - 1].go = goLine[1];
  }

  rmSync(outDir, { recursive: true, force: true });
  cpSync(path.join(work, 'vendor'), outDir, {
    recursive: true,
    filter: (src) => path.basename(src) !== 'modules.txt'
  });
  // Each module is wired in with a `replace` directive, which needs a go.mod;
  // the generated program's go.mod lists every module, so none of them needs
  // its own requirements
  for (const mod of modules) {
    writeFileSync(
      path.join(outDir, ...mod.path.split('/'), 'go.mod'),
      `module ${mod.path}\n\ngo ${mod.go || '1.21'}\n`
    );
  }
  // govendor/manifest.txt, read by src/index.ts (plain lines: the compiler
  // reads it once transpiled too): a version stamp, the Go version the
  // generated go.mod must declare, then one `module <path> <version>` per module
  const goVersion = modules
    .map((m) => m.go)
    .filter((v) => v)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .pop();
  writeFileSync(
    path.join(outDir, 'manifest.txt'),
    [
      '# Generated by scripts/vendor-go.mjs — do not edit',
      `version ${MODULES.map(([mod, version, extra]) => `${mod}@${version}${extra ? ':' + extra.join('+') : ''}`).join(',')}`,
      `go ${goVersion}`,
      ...modules.map((m) => `module ${m.path} ${m.version}`)
    ].join('\n') + '\n'
  );
  console.log(`Vendored ${modules.map((m) => `${m.path}@${m.version}`).join(', ')} into govendor/`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
