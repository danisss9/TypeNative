# Duplicate Finder

Scans a directory tree, finds files with identical content and writes a JSON
report of the duplicates and the space they waste. It's a disk-bound and
hash-bound tool you can hand to anyone as one binary, with no runtime to
install.

Demonstrates: `fs.readdirSync` with `recursive` + `withFileTypes`,
`fs.statSync`, `fs.readFileSync` / `fs.writeFileSync`, SHA-256 via
`crypto.createHash`, `Map` grouping, sorting with a compound comparator,
`reduce`, `JSON.stringify` with indentation and `performance.now()`.

## How it works

1. Walk the tree and group every non-empty file by size.
2. Hash (SHA-256) only the files whose size matches at least one other file.
   A file with a unique size can't have a duplicate, so it's never read.
3. Files with the same hash form a duplicate group. Groups are sorted by
   wasted bytes (`size × (copies − 1)`) and written to the report.

```sh
node main.ts ~/Downloads report.json
# Scanned 2000 files (243.5 MiB), hashed 1494
# Found 449 duplicate groups wasting 81.9 MiB
#   <copies> x <size> B  <first path>      (the 5 biggest groups)
# Report written to report.json in 412 ms
```

`report.json` lists every group with its hash, size and full file paths.

## Run it

With Node.js:

```sh
node main.ts <dir> [report.json]
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/dupes.exe
./dist/dupes.exe <dir> [report.json]
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/dupe-finder/main.ts --output dist/dupes.exe
```

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=10]`. The script compiles `main.ts` and
generates a deterministic fixture tree in a temp directory: 2,000 files
(1 KiB–256 KiB, 243.5 MiB) across 280 folders. A quarter of the files are
exact copies of earlier ones, and another quarter have the same size as an
earlier file but different bytes, so they get hashed without being
duplicates. It runs each runtime once to warm the OS file cache, then times
**complete process runs** of both and checks that the two reports are
byte-identical.

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0,
TypeNative 0.4.1, default (non-`--release`) build.

| Runtime    | min       | median    | mean      | max       |
|------------|-----------|-----------|-----------|-----------|
| Node.js    | 659.14 ms | 674.33 ms | 675.70 ms | 700.33 ms |
| TypeNative | 398.94 ms | 412.47 ms | 411.52 ms | 423.42 ms |

Both runtimes found the same 449 duplicate groups (1,494 files hashed,
81.9 MiB wasted). **TypeNative finishes the scan 1.6x faster** (median). The
work is reading and hashing about 180 MiB, so the gap comes from Go's
SHA-256 and file I/O, and from skipping the ~100 ms Node startup. The OS
file cache is warm in both cases. On a cold cache, disk speed dominates and
the gap narrows.
