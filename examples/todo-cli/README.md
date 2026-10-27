# Todo CLI

A to-do list for the terminal that keeps its items in a JSON file. Tools like
this run dozens of times a day, sometimes from shell prompts or git hooks.
Each call does a little work, so most of the wait is **process startup**.
That's where a native binary is a big improvement.

Demonstrates: `process.argv` destructuring with a default and a rest element,
`node:fs` reads and atomic writes (write a temp file, then `renameSync`),
`os.homedir()`, `process.env`, `JSON.parse` / `JSON.stringify`, interfaces and
`process.exit` codes.

## Usage

```sh
todo add Buy milk      # added #1: Buy milk
todo add Write docs    # added #2: Write docs
todo done 1            # done #1: Buy milk
todo                   # same as `todo list`
# [x]   1  Buy milk
# [ ]   2  Write docs
#
# 1 open, 1 done
todo rm 2              # removed #2: Write docs
```

Items are stored in `~/.todo.json`. Set `TODO_FILE` to use another file.

## Run it

With Node.js:

```sh
node main.ts add Buy milk
```

With TypeNative, build a binary and put it on your `PATH`:

```sh
npx typenative --source main.ts --output dist/todo.exe --release
./dist/todo.exe add Buy milk
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/todo-cli/main.ts --output dist/todo.exe
```

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=30]`. The script compiles `main.ts`, fills
a temp file with 50 items for each runtime, and then times **complete process
runs** (spawn to exit) of `todo list` and `todo add`.

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0,
TypeNative 0.4.1, default (non-`--release`) build.

| Command     | Runtime    | min       | median    | mean      | max       |
|-------------|------------|-----------|-----------|-----------|-----------|
| `todo list` | Node.js    | 104.98 ms | 111.37 ms | 112.74 ms | 130.05 ms |
| `todo list` | TypeNative | 14.45 ms  | 16.26 ms  | 16.44 ms  | 20.40 ms  |
| `todo add`  | Node.js    | 105.63 ms | 112.74 ms | 113.33 ms | 133.39 ms |
| `todo add`  | TypeNative | 15.23 ms  | 16.98 ms  | 17.15 ms  | 23.72 ms  |

**TypeNative answers each command 6.6–6.8x faster** (median). At about 16 ms,
a call feels instant. At about 110 ms, there's a visible pause, and it adds up
when the tool runs from a prompt or a hook on every keystroke or commit. The
binary is a single 3.8 MB file, with no Node install and no `node_modules`.
