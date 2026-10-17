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
  'net/url': 'tnurl',
  'crypto/rand': 'cryptorand',
  'math/rand/v2': 'randv2',
  'html/template': 'htmltemplate',
  'golang.org/x/text/unicode/norm': 'tnnorm'
};

export const goExcluded: Record<string, string> = {
  plugin: 'cgo, `-buildmode=plugin`',
  unsafe: 'raw pointers',
  'runtime/race': 'needs `-race`',
  'runtime/coverage': 'needs `-cover`',
  embed: 'needs a `//go:embed` directive; a later phase'
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
