// Go bridge overrides: hand-written exceptions keyed 'pkg.Func'.
// This is the only hand-maintained per-package data.
//
// sync: callbacks listed here run synchronously on the caller, so a TS
// closure can be invoked directly. Anything else taking a callback is
// wrapped in TnLoopCall.
// blocking: calls that block (network, sleep, wait) run on a goroutine
// while the baton holder pumps TnLoopRunPending.
// excluded: packages with no bridge and the reason why.
export const goOverrides = {
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
export const goPathAliases = {
    'math/big': 'tnbig',
    crypto: 'tncrypto',
    'net/url': 'tnurl',
    'crypto/rand': 'cryptorand',
    'math/rand/v2': 'randv2',
    'html/template': 'htmltemplate',
    'golang.org/x/text/unicode/norm': 'tnnorm',
    // node:sqlite's driver: the package name differs from the last path element
    'github.com/ncruces/go-sqlite3': 'sqlite3'
};
export const goExcluded = {
    plugin: 'Loads plugins with `dlopen`: needs cgo and `-buildmode=plugin` (no Windows support)',
    unsafe: 'Raw pointer arithmetic and memory reinterpretation; TS values have no addresses',
    'runtime/race': 'No public API: the race detector is a build mode (`-race`) that needs cgo',
    'runtime/cgo': 'Links only with cgo and a C toolchain; `Handle` exists to pass Go values to C'
};
// Whether a call taking a callback invokes it synchronously.
export function isSyncCallback(pkgPath, funcName) {
    const override = goOverrides[`${pkgPath}.${funcName}`];
    return !!override && override.sync === true;
}
// Whether a call blocks and needs the goroutine wrapper.
export function isBlockingCall(pkgPath, funcName) {
    const override = goOverrides[`${pkgPath}.${funcName}`];
    return !!override && override.blocking === true;
}
