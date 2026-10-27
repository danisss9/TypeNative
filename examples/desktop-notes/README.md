# Desktop Notes

A desktop notes app built as a local web app. It's a `node:http` server that
edits plain Markdown files in a folder, and its UI opens in an **app window**:
Edge or Chrome in `--app` mode, so there are no tabs or address bar. The HTML,
CSS and JS live in [ui.ts](ui.ts) as a TypeScript string, so the compiled
binary is the whole app. There is no Electron, no bundled Chromium and no Node
runtime, and no asset folder to ship next to it.

Demonstrates: `node:http` routing with GET / PUT / POST / DELETE, request
bodies, `fs` reads, writes, listing and `statSync`, a local `.ts` module
import, `child_process.spawn` with `detached` + `unref()` to launch the
window, `setInterval`, `process.memoryUsage()` and `process.exit`.

## How it works

- `GET /` serves the page from `ui.ts`. `/api/notes` lists notes (name, size,
  modified time), and `/api/notes/<name>` reads, saves (`PUT`) or deletes one.
  Note names are restricted to `[\w\- ]`, so they can't escape the folder.
- The editor autosaves 400 ms after you stop typing. Notes are plain
  `<name>.md` files, so you can also edit them with any other tool.
- When the window closes, the page sends `navigator.sendBeacon('/api/bye')`
  (plus any unsaved text), and the app exits 3 s later unless a reload
  reconnects. If the page stops polling for 90 s, the app also exits. That
  timeout is long because Chromium throttles timers in hidden windows to one
  per minute.

## Run it

```sh
node main.ts                     # notes in ~/Notes, opens the window
node main.ts --dir ./my-notes    # another folder
node main.ts --no-open --port 8080   # server only: open http://127.0.0.1:8080
```

With TypeNative, build once and ship the single file:

```sh
npx typenative --source main.ts --output dist/notes.exe --release
./dist/notes.exe
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/desktop-notes/main.ts --output dist/notes.exe
```

The window opens with `msedge --app=…` on Windows (always installed on
Windows 10/11), `open -na "Google Chrome" --args --app=…` on macOS (falling
back to the default browser), and `xdg-open` on Linux.

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=10]`. The script compiles `main.ts`, fills
a temp notes folder with 200 notes for each runtime, and then alternates
between the runtimes. Each run starts the app headless (`--no-open`) and times
**spawn until `GET /` answers 200**, which is what the user waits for before
the window can paint. It then lists the notes, opens 20 of them, saves one,
and reads the app's own **resident memory** from `/api/info`.

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0,
TypeNative 0.4.1, default (non-`--release`) build.

| Spawn → first page | min       | median    | mean      | max       |
|--------------------|-----------|-----------|-----------|-----------|
| Node.js            | 176.73 ms | 201.48 ms | 207.96 ms | 254.39 ms |
| TypeNative         | 29.37 ms  | 35.73 ms  | 42.79 ms  | 94.59 ms  |

| Resident memory | min      | median   | mean     | max      |
|-----------------|----------|----------|----------|----------|
| Node.js         | 71.9 MiB | 72.3 MiB | 72.3 MiB | 72.7 MiB |
| TypeNative      | 11.8 MiB | 15.3 MiB | 14.7 MiB | 15.8 MiB |

**TypeNative serves the first page 5.6x sooner and uses 4.7x less memory**
(median). The whole app is a single 9.9 MiB binary, the UI included. An
Electron build of the same app would ship about 100 MiB of Chromium and Node.
This app uses the browser the OS already has, and its backend idles at about
15 MiB. These figures cover the app process only. The Edge/Chrome window's
own memory is the same for both runtimes.
