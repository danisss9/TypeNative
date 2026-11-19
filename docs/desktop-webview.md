# Desktop Apps (`@webviewjs/webview`)

TypeNative lets you build standalone native desktop GUI applications using the [`@webviewjs/webview`](https://www.npmjs.com/package/@webviewjs/webview) API. The same TypeScript source runs under Node.js (with the npm package) and compiles to a single dependency-free native binary with TypeNative (no npm package or C toolchain required at runtime).

For a complete example app with benchmarks, see [examples/desktop-notes](../examples/desktop-notes/). For full API status, see [Native app windows in conformance.md](../conformance.md#native-app-windows-webviewjswebview).

## Quick Example

```ts
import { Application } from '@webviewjs/webview';

const app = new Application();
const win = app.createBrowserWindow({
  title: 'Hello TypeNative',
  width: 800,
  height: 600,
  logical: true
});

win.createWebview({
  html: '<h1>Hello from a native window!</h1>'
});

app.run();
```

Build as a windowed app (hides the console window on Windows):

```sh
npx typenative --source app.ts --output hello.exe --gui --release
```

## Supported API

### Application & WebContext

- `new Application()`, `app.run()`, `app.exit()`, `app.isReady()`, `app.whenReady()`
- `app.createWebContext({ dataDirectory })` — custom profile/cache directory (defaults to the per-user cache folder when compiled)
- `app.setMenu(menu)` — native menu bar
- `app.createTrayIcon(options)` — system tray icon (`TrayIcon` methods, tooltips, context menus, `click` / `double-click` events)
- Application events: `ready`, `window-close-requested`, `application-close-requested`, `custom-menu-click`

### BrowserWindow

- `app.createBrowserWindow({ title, width, height, logical, resizable, menu, ... })`
- `win.createWebview({ url, html, enableDevtools, webContext, ... })` — one webview per window (`enableDevtools` also enables the right-click context menu)
- Window controls: `setTitle`, `close`, `show`, `hide`, `focus`, `setSize`, `setMinSize`, `setMaxSize`, `setPosition`, `center`, `setMaximized`, `setMinimized`, `setFullscreen`, `setResizable`, `setDecorations`, `setClosable`, `setMaximizable`, `setMinimizable`, `setAlwaysOnTop`, `setAlwaysOnBottom`, `setContentProtection`, `setSkipTaskbar`, `setEnable`, `startDragging`, `openFileDialog`, `hasMenu`, plus geometry and state getters
- Window events: `close`, `resize`, `move`, `focus`, `blur`

> **Note:** `event.preventDefault()` on `close` is not supported because the native window is already closed when the `close` event fires. Save state beforehand (e.g., on the page's `beforeunload`).

### Webview, IPC & Custom Protocols

- Navigation & scripting: `view.loadUrl`, `view.loadHtml`, `view.evaluateScript`, `view.reload`, `view.url`, `view.zoom`, `view.setWebviewVisibility`, `view.focus`, `view.dispose`
- **IPC:** `view.onIpcMessage` and `view.expose` (exposing sync/async TypeScript methods and static properties to the page via `window.ipc.postMessage` / `window.__webviewjs__` RPC)
- **Custom protocols:** `win.registerProtocol`, `WebContext.isCustomProtocolRegistered`, and URI helpers—intercepts requests and returns Fetch `Response` or `CustomProtocolResponse` objects

### Notifications

- `new Notification(...)`, `Notification.permission`, `Notification.requestPermission()`, `show()`, `click` / `close` events
- Implemented with Win32 balloon notifications (`Shell_NotifyIconW`) on Windows, `osascript` on macOS, and `notify-send` on Linux

## How Windows Are Hosted by Platform

| Platform | Window Host | Close Detection |
| --- | --- | --- |
| Windows | Embedded **WebView2** (pure Go, no cgo) | Native window message loop exit |
| Windows (no WebView2 runtime) | Edge or Chrome in app mode (`TYPENATIVE_WEBVIEW=browser` forces this) | Win32 job object emptying |
| macOS / Linux | Chrome, Edge, or Chromium in app mode | DevTools pipe page-close signal |

- If no supported browser or runtime is found, opening a window throws `ERR_WEBVIEW_NO_BROWSER`.
- In browser app mode, calling `loadUrl`, `loadHtml`, `evaluateScript`, or `reload` after the window has opened throws `ERR_WEBVIEW_UNSUPPORTED`, and native Win32 window controls operate in state-only mode.

## Node.js Parity Tips

When running the same source under Node.js on Windows:
- Pass an explicit `dataDirectory` to `createWebContext` (the `@webviewjs/webview` npm package defaults to a profile directory next to `node.exe`, which may be read-only under `Program Files`).
- Under Node.js on Windows, the npm package's event pump can block Node timers/HTTP servers in the same process while idle; compiled TypeNative binaries do not have this limitation. See [examples/desktop-notes](../examples/desktop-notes/) for a pattern that works smoothly in both runtimes.
