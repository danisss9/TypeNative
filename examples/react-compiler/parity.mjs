// Parity check: Node.js vs the TypeNative build of the React Compiler.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout, then runs the vendored React Compiler over each fixture below with
// both runtimes. stdout, stderr and the exit code must match byte for byte —
// including the `// CompileSuccess`/`// CompileError` lines the compiler's
// logger produces, so memo slot and block counts are checked too. Failures are
// written to .cache/failures/.
//
// The fixtures mirror what the compiler's own test fixtures cover: components
// and hooks, the compiler's test pragmas on the first line, JSX with
// conditionals, lists and event handlers, and the error paths (a compile
// error, a skipped function, an unparseable file).
//
// Usage:  node parity.mjs [filter]     (filter: a substring of a fixture name)

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const fixturesDir = path.join(cache, 'fixtures');
const failuresDir = path.join(cache, 'failures');
const exePath = path.join(cache, process.platform === 'win32' ? 'react-compile.exe' : 'react-compile');
const filter = process.argv[2] ?? '';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(1);
  }
}

// A component with hooks, a derived list, conditionals and event handlers,
// the shape of a real screen
const todoList = `// @compilationMode:"infer"
import { useState } from 'react';

export function TodoList({ todos, filter, onToggle }) {
  const [query, setQuery] = useState('');
  const visible = todos.filter(
    (todo) => (filter === 'all' || todo.status === filter) && todo.title.includes(query),
  );
  const remaining = todos.filter((todo) => todo.status !== 'done').length;

  if (todos.length === 0) {
    return <p className="empty">Nothing to do</p>;
  }
  return (
    <section>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <ul>
        {visible.map((todo) => (
          <li key={todo.id} className={todo.status} onClick={() => onToggle(todo.id)}>
            {todo.title}
          </li>
        ))}
      </ul>
      <footer>{remaining} of {todos.length} left</footer>
    </section>
  );
}

export function useTotal(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
}
`;

const FIXTURES = {
  // The example's built-in demo (infer mode: only components and hooks)
  'demo-infer': todoList,
  // All mode: plain functions compile too (memo slots on every function)
  'mode-all': `import { useState } from 'react';

export function Component({ label }) {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      {label}: {count}
    </button>
  );
}

function helper(values) {
  return values.map((v) => v * 2).join(',');
}
`,
  // Annotation mode: only "use memo" functions compile, others are skipped
  'mode-annotation': `// @compilationMode:"annotation"
export function Component({ items }) {
  "use memo";
  return <ul>{items.map((item) => <li key={item.id}>{item.title}</li>)}</ul>;
}

export function Skipped({ items }) {
  return <ul>{items.map((item) => <li key={item.id}>{item.title}</li>)}</ul>;
}
`,
  // JSX outlining: large JSX subtrees are extracted into their own functions
  'jsx-outlining': `// @enableJsxOutlining
export function Dashboard({ user, stats, onRefresh }) {
  const unread = stats.filter((s) => !s.read).length;
  return (
    <div className="dashboard">
      <header>
        <h1>Welcome back, {user.name}</h1>
        <span className={unread > 0 ? 'badge active' : 'badge'}>{unread} unread</span>
        <button onClick={() => onRefresh()}>Refresh</button>
      </header>
      <main>
        {stats.map((stat) => (
          <div key={stat.id} className="stat">
            <h3>{stat.title}</h3>
            <p>{stat.value}</p>
          </div>
        ))}
      </main>
      <footer>{user.email}</footer>
    </div>
  );
}
`,
  // Hooks through a custom hook, mutable refs, effects
  'hooks-and-refs': `import { useEffect, useRef, useState } from 'react';

export function useCounter(start) {
  const [count, setCount] = useState(start);
  const increment = () => setCount((c) => c + 1);
  const reset = () => setCount(start);
  return { count, increment, reset };
}

export function Stopwatch({ running }) {
  const { count, increment, reset } = useCounter(0);
  const last = useRef(null);
  useEffect(() => {
    last.current = count;
  }, [count]);
  return (
    <p onClick={increment} onDoubleClick={reset}>
      {count} (was {last.current})
    </p>
  );
}
`,
  // Control flow: nested conditionals, ternaries, fragments, void tags
  'control-flow': `export function Panel({ open, kind, children }) {
  if (!open) {
    return null;
  }
  return (
    <>
      <div className={kind === 'error' ? 'panel error' : 'panel'}>
        {kind === 'error' ? <strong>Something went wrong</strong> : <span>Info</span>}
        {children}
        <br />
        <hr />
      </div>
      <img src="x.png" alt="an image" />
    </>
  );
}
`,
  // Values captured by closures stay reactive; destructuring in parameters
  'closures-and-destructuring': `import { useMemo, useState } from 'react';

export function SortableList({ entries, compare }) {
  const [key, setKey] = useState('name');
  const [reverse, setReverse] = useState(false);
  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => (a[key] < b[key] ? -1 : 1));
    if (reverse) copy.reverse();
    return copy;
  }, [entries, key, reverse]);
  return (
    <ol data-key={key}>
      {sorted.map(({ id, name }) => (
        <li key={id} onClick={() => setKey(name)}>
          {name}
        </li>
      ))}
      <li onClick={() => setReverse(!reverse)}>reverse</li>
    </ol>
  );
}
`,
  // "use no memo": the compiler skips the function and logs why
  'skip-use-no-memo': `export function Unmemoized({ text }) {
  "use no memo";
  return <p>{text}</p>;
}

export function Memoized({ text }) {
  return <p>{text}</p>;
}
`,
  // A compile error: hooks cannot run conditionally
  'error-conditional-hook': `import { useState } from 'react';

export function Component({ enabled }) {
  if (enabled) {
    const [value, setValue] = useState(0);
    return <button onClick={() => setValue(value + 1)}>{value}</button>;
  }
  return null;
}
`,
  // A compile error: mutating props during render
  'error-mutate-prop': `export function Component({ items }) {
  items.sort((a, b) => a.id - b.id);
  return items.map((item) => <li key={item.id}>{item.title}</li>);
}
`,
  // A compile error: unknown hook-like call in a component
  'error-unknown-hook': `import { useUnknown } from 'somewhere';

export function Component() {
  const value = useUnknown();
  return <p>{value}</p>;
}
`,
  // A file the parser rejects: the error is printed as a comment, exit 1
  'parse-error': `export function Broken({
  return <div>never parsed</div>;
}
`,
  // TypeScript source: the parser runs with the typescript plugin
  'typescript-syntax': `import { useState } from 'react';

type Item = { id: number; title: string; done?: boolean };

export function Checklist({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const done = items.filter((item): item is Item & { done: true } => item.done === true).length;
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => setItems(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}>
          {item.done ? '\\u2713' : '\\u25cb'} {item.title}
        </li>
      ))}
      <footer>{done}/{items.length} done</footer>
    </ul>
  );
}
`,
  // Preserve existing memoization: manual useMemo/useCallback must survive
  'validate-manual-memo': `// @validatePreserveExistingMemoizationGuarantees
import { useCallback, useMemo } from 'react';

export function Grid({ rows, cols, onSelect }) {
  const cells = useMemo(() => {
    const out = [];
    for (const row of rows) {
      for (const col of cols) {
        out.push({ row, col });
      }
    }
    return out;
  }, [rows, cols]);
  const select = useCallback((cell) => onSelect(cell.row, cell.col), [onSelect]);
  return (
    <table>
      {cells.map((cell) => (
        <td key={\`\${cell.row}:\${cell.col}\`} onClick={() => select(cell)}>
          {cell.row} / {cell.col}
        </td>
      ))}
    </table>
  );
}
`,
  // State updates in effects and event handlers; optional chaining
  'effects-and-optional-chains': `import { useEffect, useState } from 'react';

export function Ticker({ interval, onPause }) {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (interval == null) return;
    const id = setInterval(() => setTicks((t) => t + 1), interval);
    return () => clearInterval(id);
  }, [interval]);
  return (
    <div>
      <span>{ticks} ticks</span>
      {onPause != null && <button onClick={() => onPause?.(ticks)}>Pause</button>}
    </div>
  );
}
`,
};

function spawnCollect(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: here });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: signal ? signal : code });
    });
  });
}

const names = Object.keys(FIXTURES).filter((name) => name.includes(filter));
if (names.length === 0) {
  console.error(`no fixtures match "${filter}"`);
  process.exit(1);
}

console.log('Compiling main.ts with TypeNative ...');
run(process.execPath, [cli, '--source', path.join(here, 'main.ts'), '--output', exePath], { cwd: repoRoot });

fs.rmSync(failuresDir, { recursive: true, force: true });
fs.mkdirSync(failuresDir, { recursive: true });
fs.mkdirSync(fixturesDir, { recursive: true });

let passed = 0;
let next = 0;
const failed = [];
async function worker() {
  while (next < names.length) {
    const index = next++;
    const name = names[index];
    const file = path.join(fixturesDir, `${name}.jsx`);
    fs.writeFileSync(file, FIXTURES[name]);
    const [node, native] = await Promise.all([
      spawnCollect(process.execPath, ['run-node.mjs', file]),
      spawnCollect(exePath, [file])
    ]);
    if (node.stdout === native.stdout && node.stderr === native.stderr && node.code === native.code) {
      passed++;
      continue;
    }
    failed.push(name);
    const report = (label, r) => `--- ${label} (exit ${r.code})\n${r.stdout}${r.stderr ? `--- ${label} stderr\n${r.stderr}` : ''}`;
    fs.writeFileSync(
      path.join(failuresDir, `${index}-${name}.txt`),
      `${name}\n--- source\n${FIXTURES[name]}\n${report('node', node)}${report('native', native)}`
    );
  }
}
await Promise.all(Array.from({ length: Math.max(1, Math.min(8, os.availableParallelism() - 1)) }, worker));

for (const name of failed.sort()) console.log(`FAIL ${name}`);
console.log(`${passed}/${names.length} fixtures match (${((100 * passed) / Math.max(1, names.length)).toFixed(2)}%)`);
process.exitCode = failed.length > 0 ? 1 : 0;
