// conformance-flags: --no-typecheck
// A context object handed through a generic parameter to callbacks typed
// with its concrete shape is the same object: its Map and array fields are
// shared by every callback (the React Compiler's recursivelyTraverseItems)
type Range = { start: number; end: number };
type Item = { id: number; range: Range };

type TraversalContext = {
  starts: Map<number, number>;
  log: Array<string>;
  next: number;
};

function traverse<T, TContext>(
  items: Array<T>,
  getRange: (val: T) => Range,
  context: TContext,
  enter: (val: T, context: TContext) => void,
  exit: (val: T, context: TContext) => void,
): void {
  const active: Array<T> = [];
  for (const item of items) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (getRange(item).start >= getRange(active[i]).end) {
        exit(active[i], context);
        active.length = i;
      } else {
        break;
      }
    }
    enter(item, context);
    active.push(item);
  }
  let curr = active.pop();
  while (curr != null) {
    exit(curr, context);
    curr = active.pop();
  }
}

function onEnter(item: Item, context: TraversalContext): void {
  context.starts.set(item.id, context.next++);
  context.log.push(`enter ${item.id}`);
}

function onExit(item: Item, context: TraversalContext): void {
  const start = context.starts.get(item.id);
  context.log.push(`exit ${item.id} from ${start}`);
}

const items: Item[] = [
  { id: 0, range: { start: 1, end: 5 } },
  { id: 1, range: { start: 2, end: 3 } },
  { id: 2, range: { start: 6, end: 8 } },
];
const context: TraversalContext = { starts: new Map(), log: [], next: 10 };
traverse(items, (item) => item.range, context, onEnter, onExit);
console.log(context.log.join('; '));
console.log(context.starts.size, context.next);

// an inline context literal (no declared type at the call; its new Map() is
// untyped, as in the vendored compiler: hence --no-typecheck)
const log: string[] = [];
traverse(
  items,
  (item) => item.range,
  { starts: new Map(), log, next: 0 },
  onEnter,
  onExit,
);
console.log(log.join('; '));
