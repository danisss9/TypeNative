# Desktop Notes

A desktop notes app in a native webview window. It's a `node:http` server that
edits plain Markdown files in a folder, and its UI renders in a window opened
with the [`@webviewjs/webview`](https://www.npmjs.com/package/@webviewjs/webview)
API. The HTML, CSS and JS live in [ui.ts](ui.ts) as a TypeScript string, so the
compiled binary is the whole app. There is no Electron, no bundled Chromium, no
Node runtime and no asset folder to ship next to it.

The same `main.ts` runs both ways. Under Node.js the import is the npm package.
Compiled, it's TypeNative's built-in version, so the binary needs neither the
package nor a C toolchain.

Demonstrates: a webview window, `node:http` routing with GET / PUT / POST /
DELETE, request bodies, `fs` reads, writes, listing and `statSync`, a local `.ts`
module import, `setInterval`, `process.memoryUsage()` and `process.exit`.

## How it works

- `GET /` serves the page from `ui.ts`. `/api/notes` lists notes (name, size,
  modified time), and `/api/notes/<name>` reads, saves (`PUT`) or deletes one.
  Note names are restricted to `[\w\- ]`, so they can't escape the folder.
- The editor autosaves 400 ms after you stop typing. Notes are plain
  `<name>.md` files, so you can also edit them with any other tool.
- The window loads the page from that local server. Closing it ends the app. Text
  the autosave hasn't reached goes out as a `navigator.sendBeacon` on
  `beforeunload`, and the app waits 300 ms for it to arrive.
- **Under Node.js the window gets a process of its own**, which is this script
  run with `--window <url>`. On Windows the npm package's event pump can hold the
  JS thread for as long as the window is idle, and the server needs that thread.
  Compiled apps run the window on its own thread, so they stay one process.
- The webview's profile lives in a folder the app chooses with
  `createWebContext`. The default sits beside the executable, which is read-only
  for `node.exe` under Program Files.

## Run it

Under Node.js, install the webview package first. This example pins
`1.0.0-rc.4`, because the `latest` tag (0.6.0) froze more readily in testing.

```sh
npm install
node main.ts                     # notes in ~/Notes, opens the window
node main.ts --dir ./my-notes    # another folder
node main.ts --no-open --port 8080   # server only: open http://127.0.0.1:8080
```

With TypeNative, build once and ship the single file. `--gui` leaves out the
console window on Windows:

```sh
npx typenative --source main.ts --output dist/notes.exe --gui --release
./dist/notes.exe
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/desktop-notes/main.ts --output dist/notes.exe --gui
```

## What the window is on each platform

| Platform                             | Compiled with TypeNative             | Under Node.js        |
|--------------------------------------|--------------------------------------|----------------------|
| Windows                              | Embedded WebView2                    | Embedded WebView2    |
| Windows without the WebView2 runtime | Edge or Chrome in app mode           | Not supported        |
| macOS                                | Chrome, Edge or Chromium in app mode | Embedded WebKit      |
| Linux                                | Chrome, Edge or Chromium in app mode | Embedded WebKitGTK   |

**Only Windows has been run end to end.** The macOS and Linux builds compile, but
neither column has been tried on those systems. TypeNative uses no cgo, which rules
out WebKit on those platforms for now, so a compiled app there needs a browser
installed and shows the browser's window frame. Node.js on Linux needs the WebKitGTK
libraries.

## Benchmark: Node.js vs TypeNative

Reproduce with `npm install`, then `node bench.mjs [runs=10]`. The script compiles
`main.ts`, fills a temp notes folder with 200 notes for each runtime, and then
alternates between the runtimes. Each run starts the app headless (`--no-open`) and
times **spawn until `GET /` answers 200**, which is what the user waits for before
the window can paint. It then lists the notes, opens 20 of them, saves one, and
reads the app's own **resident memory** from `/api/info`.

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600, Node v26.13.0, Go 1.27.4,
TypeNative 0.5.0 (unreleased changes), default (non-`--release`) build.

| Spawn → first page | min       | median    | mean      | max       |
|--------------------|-----------|-----------|-----------|-----------|
| Node.js            | 94.46 ms  | 99.11 ms  | 103.46 ms | 119.13 ms |
| TypeNative         | 20.61 ms  | 22.41 ms  | 25.95 ms  | 60.24 ms  |

| Resident memory | min      | median   | mean     | max      |
|-----------------|----------|----------|----------|----------|
| Node.js         | 71.2 MiB | 72.6 MiB | 72.5 MiB | 73.0 MiB |
| TypeNative      | 7.0 MiB  | 10.8 MiB | 10.5 MiB | 11.0 MiB |

**TypeNative serves the first page 4.4x sooner and uses 6.7x less memory**
(median). The app is a single 13.9 MiB binary with the UI included. An Electron
build of the same app would ship about 100 MiB of Chromium and Node. This app uses
the webview the OS already has, and its backend idles at about 11 MiB.

These figures cover the headless server process only. They leave out the webview's
own processes, which are about the same for both runtimes, and the extra window
process Node.js runs.
