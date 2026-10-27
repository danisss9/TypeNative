// The app's whole user interface: one HTML page with inline CSS and JS. It is
// a TypeScript string, so it is compiled into the binary (no files to ship
// next to it) and works unchanged under Node.js.
export const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notes</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9; --side: #eceef2; --text: #1d2330; --muted: #677085;
    --line: #d9dde5; --accent: #3d7be0; --active: #dde6f7; --danger: #c4402e;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #16191f; --side: #1d212a; --text: #e8ebf2; --muted: #8b93a7;
            --line: #2b313d; --active: #26324a; }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { margin: 0; display: flex; background: var(--bg); color: var(--text);
         font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  aside { width: 240px; flex-shrink: 0; background: var(--side); display: flex; flex-direction: column;
          border-right: 1px solid var(--line); }
  aside header { display: flex; gap: 6px; padding: 12px; }
  #search { flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px;
            background: var(--bg); color: inherit; font: inherit; }
  button { border: 0; border-radius: 6px; padding: 6px 10px; font: inherit; cursor: pointer;
           background: var(--accent); color: #fff; }
  button.ghost { background: transparent; color: var(--danger); }
  ul { list-style: none; margin: 0; padding: 0 6px; overflow-y: auto; flex: 1; }
  li { padding: 8px 10px; border-radius: 6px; cursor: pointer; }
  li.active { background: var(--active); }
  li small { display: block; color: var(--muted); font-size: 12px; }
  aside footer { padding: 10px 12px; font-size: 12px; color: var(--muted); border-top: 1px solid var(--line); }
  main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  main header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
  #title { flex: 1; font-weight: 600; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #status { color: var(--muted); font-size: 12px; }
  textarea { flex: 1; border: 0; padding: 16px; resize: none; outline: none; background: transparent; color: inherit;
             font: 15px/1.6 ui-monospace, "Cascadia Code", Menlo, monospace; }
  .empty { margin: auto; color: var(--muted); }
  @media (max-width: 560px) { aside { width: 150px; } }
</style>
</head>
<body>
<aside>
  <header>
    <input id="search" placeholder="Search" autocomplete="off">
    <button id="new" title="New note">+</button>
  </header>
  <ul id="list"></ul>
  <footer id="info"></footer>
</aside>
<main>
  <header>
    <div id="title">No note selected</div>
    <span id="status"></span>
    <button id="delete" class="ghost" hidden>Delete</button>
  </header>
  <textarea id="editor" spellcheck="false" hidden></textarea>
  <div class="empty" id="empty">Create a note with +</div>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  let notes = [];
  let current = null;
  let saveTimer = 0;

  const ago = (ms) => {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return new Date(ms).toLocaleDateString();
  };

  async function loadList() {
    notes = await (await fetch('/api/notes')).json();
    render();
  }

  function render() {
    const q = $('search').value.toLowerCase();
    $('list').innerHTML = '';
    for (const n of notes.filter((n) => n.name.toLowerCase().includes(q))) {
      const li = document.createElement('li');
      li.className = n.name === current ? 'active' : '';
      li.textContent = n.name;
      const meta = document.createElement('small');
      meta.textContent = ago(n.modified) + ' · ' + n.size + ' B';
      li.append(meta);
      li.onclick = () => open(n.name);
      $('list').append(li);
    }
  }

  async function open(name) {
    await flush();
    const res = await fetch('/api/notes/' + encodeURIComponent(name));
    current = name;
    $('editor').value = res.ok ? await res.text() : '';
    $('title').textContent = name;
    $('editor').hidden = false;
    $('delete').hidden = false;
    $('empty').hidden = true;
    $('status').textContent = '';
    $('editor').focus();
    render();
  }

  async function flush() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = 0;
    await save();
  }

  async function save() {
    saveTimer = 0;
    await fetch('/api/notes/' + encodeURIComponent(current), { method: 'PUT', body: $('editor').value });
    $('status').textContent = 'Saved';
    await loadList();
  }

  $('editor').oninput = () => {
    $('status').textContent = 'Editing…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  };

  $('new').onclick = async () => {
    let n = 1;
    while (notes.some((x) => x.name === 'Untitled ' + n)) n++;
    current = 'Untitled ' + n;
    await fetch('/api/notes/' + encodeURIComponent(current), { method: 'PUT', body: '' });
    await loadList();
    open(current);
  };

  $('delete').onclick = async () => {
    clearTimeout(saveTimer);
    saveTimer = 0;
    await fetch('/api/notes/' + encodeURIComponent(current), { method: 'DELETE' });
    current = null;
    $('editor').hidden = true;
    $('delete').hidden = true;
    $('empty').hidden = false;
    $('title').textContent = 'No note selected';
    await loadList();
  };

  $('search').oninput = render;

  async function refreshInfo() {
    try {
      const i = await (await fetch('/api/info')).json();
      $('info').textContent = i.dir + ' · ' + i.runtime + ' · ' + (i.rss / 1048576).toFixed(1) + ' MiB';
    } catch {
      $('info').textContent = 'disconnected';
    }
  }

  loadList().then(() => notes.length && open(notes[0].name));
  refreshInfo();
  // Polling doubles as the app's heartbeat
  setInterval(refreshInfo, 5000);
  // Closing the window saves, then tells the app to quit
  addEventListener('pagehide', () => {
    if (saveTimer) navigator.sendBeacon('/api/notes/' + encodeURIComponent(current), $('editor').value);
    navigator.sendBeacon('/api/bye');
  });
</script>
</body>
</html>
`;
