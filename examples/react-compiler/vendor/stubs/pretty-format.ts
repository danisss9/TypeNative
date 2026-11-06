// Stand-in for `pretty-format` (https://github.com/jestjs/jest, packages/
// pretty-format), which the React Compiler only calls to print debug output:
// behind its `DEBUG` constants (false), in `Dominator.debug()`, and for the
// `debugLogIRs` logger hook, none of which this example uses. Kept to the
// signature the compiler calls; it prints with JSON.stringify, Maps and Sets
// as arrays of entries.

export default function prettyFormat(value: unknown): string {
  return JSON.stringify(
    value,
    (_key: string, v: unknown): unknown => {
      if (v instanceof Map) return [...v.entries()];
      if (v instanceof Set) return [...v.values()];
      return v;
    },
    2,
  );
}
