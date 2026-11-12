# Mandelbrot PNG

Renders the Mandelbrot set and writes it as a PNG. The PNG encoder is about
40 lines of TypeScript on top of `node:zlib` (`deflateSync` for the pixel
data, `crc32` for the chunk checksums). The program needs no image library,
no native addon such as `sharp` or `canvas`, and no `node_modules`: the
compiled binary is a single 4.2 MB file.

Demonstrates: a tight floating-point loop, a function returning a tuple that
the caller destructures, `Uint8Array` / `DataView` big-endian writes,
`zlib.deflateSync` + `zlib.crc32`, `Math.log2` / `Math.cos`, and
`fs.writeFileSync` of binary data.

![Mandelbrot render, 640x360](preview.png)

## Run it

With Node.js:

```sh
node main.ts 1920 1080 mandelbrot.png
# Rendered 1920x1080 in 533 ms, encoded 416056 bytes in 50 ms -> mandelbrot.png
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/mandelbrot.exe
./dist/mandelbrot.exe 1920 1080 mandelbrot.png
# Rendered 1920x1080 in 534 ms, encoded 418872 bytes in 46 ms -> mandelbrot.png
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/mandelbrot-png/main.ts --output dist/mandelbrot.exe
```

The two PNGs aren't byte-identical, because Node's deflate is zlib and
TypeNative's is Go's `compress/flate`. They do decode to **identical pixels**.

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [width=1920] [height=1080] [runs=10]`. The
script compiles `main.ts`, times **complete process runs** (spawn to exit) of
both runtimes rendering the same image, then decodes both PNGs (checking every
chunk CRC) and compares the pixels.

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600, Node v26.13.0, Go 1.27.4,
TypeNative 0.5.0 (unreleased changes), default (non-`--release`) build.

| Runtime    | min       | median    | mean      | max       |
|------------|-----------|-----------|-----------|-----------|
| Node.js    | 499.84 ms | 513.64 ms | 508.85 ms | 518.01 ms |
| TypeNative | 449.83 ms | 452.28 ms | 466.67 ms | 599.75 ms |

**TypeNative is 1.1x faster end to end** (median). There's no JIT warm-up.
The render loop itself takes about the same time in both runtimes. V8 compiles a tight float loop like the escape-time
iteration into machine code about as good as Go's. The difference is mostly
Node's startup. For recursion and
call-heavy code the compute gap is larger (see [fibonacci](../fibonacci/),
2.0x). This example's main advantage is distribution: one dependency-free
binary that writes images.
