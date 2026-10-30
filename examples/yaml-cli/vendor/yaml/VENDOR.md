# Vendored: `yaml`

|            |                                                                                     |
| ---------- | ----------------------------------------------------------------------------------- |
| Upstream   | [eemeli/yaml](https://github.com/eemeli/yaml)                                       |
| Tag        | `v3.0.0-2`                                                                          |
| Commit     | `15aa653fa2b94c4c9041a04964e83b9d794cf345`                                          |
| License    | ISC ([LICENSE](LICENSE))                                                            |
| Copied     | `src/` and `LICENSE`, byte for byte. Upstream's tests, docs and `bin.js` aren't vendored |

`bin.js` is ported to [../../main.ts](../../main.ts) instead of vendored. It's a
JavaScript file that imports the built package, and main.ts makes the same
`cli()` call from TypeScript.

## Patches

None. `src/` is upstream's tree unmodified. To check:

```sh
git clone --depth 1 --branch v3.0.0-2 https://github.com/eemeli/yaml.git /tmp/yaml
diff -r /tmp/yaml/src src && diff /tmp/yaml/LICENSE LICENSE
```

Anything in this tree that TypeNative couldn't compile was fixed in the
transpiler, never here. Each fix has a probe in [conformance/](../../../../conformance/).
