# Vendored: `marked`

|            |                                                                                     |
| ---------- | ----------------------------------------------------------------------------------- |
| Upstream   | [markedjs/marked](https://github.com/markedjs/marked)                               |
| Tag        | `v18.1.2`                                                                           |
| Commit     | `5beecae42b0beb07eaccc3a732560f56867a8301`                                          |
| License    | MIT ([LICENSE](LICENSE))                                                            |
| Copied     | `src/` and `LICENSE`, byte for byte. Upstream's tests, docs, man page and `bin/` aren't vendored |

`bin/main.js` is ported to [../../main.ts](../../main.ts) instead of vendored.
It's a JavaScript file that imports the built package, and main.ts parses the
same options and makes the same `marked.parse` / `marked.lexer` calls from
TypeScript (its header comment lists the differences).

## Patches

None. `src/` is upstream's tree unmodified. To check:

```sh
git clone --depth 1 --branch v18.1.2 https://github.com/markedjs/marked.git /tmp/marked
diff -r /tmp/marked/src src && diff /tmp/marked/LICENSE LICENSE
```

Anything in this tree that TypeNative couldn't compile was fixed in the
transpiler, never here. Each fix has a probe in [conformance/](../../../../conformance/).
