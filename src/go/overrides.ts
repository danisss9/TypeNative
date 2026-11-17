// Go bridge overrides: hand-written exceptions keyed 'pkg.Func'.
// This is the only hand-maintained per-package data.
//
// sync: callbacks listed here run synchronously on the caller, so a TS
// closure can be invoked directly. Anything else taking a callback is
// wrapped in TnLoopCall.
// blocking: calls that block (network, sleep, wait) run on a goroutine
// while the baton holder pumps TnLoopRunPending.
// excluded: packages with no bridge and the reason why.

export interface GoOverride {
  sync?: boolean;
  blocking?: boolean;
}

export const goOverrides: Record<string, GoOverride> = {
  'sort.Slice': { sync: true },
  'sort.SliceStable': { sync: true },
  'sort.SliceIsSorted': { sync: true },
  'slices.SortFunc': { sync: true },
  'slices.SortStableFunc': { sync: true },
  'slices.IsSortedFunc': { sync: true },
  'slices.BinarySearchFunc': { sync: true },
  'slices.CompareFunc': { sync: true },
  'slices.MinFunc': { sync: true },
  'slices.MaxFunc': { sync: true },
  'maps.Keys': { sync: true },
  'maps.Values': { sync: true },
  'maps.All': { sync: true },
  'strings.Map': { sync: true },
  'strings.ReplaceAll': { sync: true },
  'bytes.Map': { sync: true },
  'path/filepath.Walk': { sync: true },
  'path/filepath.WalkDir': { sync: true },
  'time.AfterFunc': { sync: true },
  'time.Sleep': { blocking: true },
  'net/http.ListenAndServe': { blocking: true },
  'net/http.Serve': { blocking: true },
  'net.Accept': { blocking: true },
  'os/exec.Wait': { blocking: true },
  'sync.WaitGroup.Wait': { blocking: true }
};

// Import-path → emitted qualifier for packages whose name collides with
// another importable package (or a common variable name). Single source of
// truth: the transpiler's goImportLine and the bridge qualifier use it.
export const goPathAliases: Record<string, string> = {
  'math/big': 'tnbig',
  crypto: 'tncrypto',
  'net/url': 'tnurl',
  'crypto/rand': 'cryptorand',
  'math/rand/v2': 'randv2',
  'html/template': 'htmltemplate',
  // the worker heap-limit monitor: a program's own `debug` would collide
  'runtime/debug': 'tndebug',
  'golang.org/x/text/unicode/norm': 'tnnorm',
  // Intl's locale data: short package names that would collide with user
  // identifiers (language, cases, …)
  'golang.org/x/text/language': 'xlanguage',
  'golang.org/x/text/language/display': 'xdisplay',
  'golang.org/x/text/feature/plural': 'xplural',
  'golang.org/x/text/message': 'xmessage',
  'golang.org/x/text/number': 'xnumber',
  'golang.org/x/text/currency': 'xcurrency',
  'golang.org/x/text/collate': 'xcollate',
  'golang.org/x/text/cases': 'xcases',
  // node:sqlite's driver: the package name differs from the last path element
  'github.com/ncruces/go-sqlite3': 'sqlite3',
  // the WebAssembly global / node:wasi's runtime: short package names that
  // would collide with user identifiers (api, sys, experimental)
  'github.com/tetratelabs/wazero/api': 'wazeroapi',
  'github.com/tetratelabs/wazero/sys': 'wazerosys',
  'github.com/tetratelabs/wazero/experimental': 'wazeroexp',
  'github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1': 'wazerowasi'
};

export const goExcluded: Record<string, string> = {
  plugin: 'Loads plugins with `dlopen`: needs cgo and `-buildmode=plugin` (no Windows support)',
  unsafe: 'Raw pointer arithmetic and memory reinterpretation; TS values have no addresses',
  'runtime/race': 'No public API: the race detector is a build mode (`-race`) that needs cgo',
  'runtime/cgo': 'Links only with cgo and a C toolchain; `Handle` exists to pass Go values to C'
};

// Whether a call taking a callback invokes it synchronously.
export function isSyncCallback(pkgPath: string, funcName: string): boolean {
  const override = goOverrides[`${pkgPath}.${funcName}`];
  return !!override && override.sync === true;
}

// Whether a call blocks and needs the goroutine wrapper.
export function isBlockingCall(pkgPath: string, funcName: string): boolean {
  const override = goOverrides[`${pkgPath}.${funcName}`];
  return !!override && override.blocking === true;
}
