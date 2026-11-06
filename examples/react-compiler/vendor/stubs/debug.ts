// Stand-in for the `debug` package (https://github.com/debug-js/debug), which
// @babel/traverse uses for its `DEBUG=babel` trace of path visits. That trace
// is off unless the DEBUG environment variable enables it, and nothing in this
// example turns it on, so this logger is always disabled: `enabled` is false
// and calling it does nothing, which is what `debug` does when disabled.

export interface Debugger {
  (formatter: unknown, ...args: unknown[]): void;
  enabled: boolean;
  namespace: string;
}

export default function createDebug(namespace: string): Debugger {
  const log = ((_formatter: unknown, ..._args: unknown[]): void => {}) as Debugger;
  log.enabled = false;
  log.namespace = namespace;
  return log;
}
