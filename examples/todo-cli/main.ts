// A to-do list for the terminal, kept in a JSON file. Commands are meant to be
// run many times a day (or from shell hooks), so process startup dominates
// every call: that is where a native binary pays off.
//
//   todo add Buy milk         add an item
//   todo list                 show open and done items
//   todo done 2               mark item 2 as done
//   todo rm 2                 delete item 2
//
// Items live in ~/.todo.json; set TODO_FILE to use another file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface Item {
  id: number;
  text: string;
  done: boolean;
  created: string;
}

interface Store {
  nextId: number;
  items: Item[];
}

const file = process.env.TODO_FILE ?? path.join(os.homedir(), '.todo.json');

function load(): Store {
  if (!fs.existsSync(file)) return { nextId: 1, items: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Store;
}

// Write to a temp file, then rename over the old one: a crash mid-write never
// leaves a half-written list behind
function save(store: Store): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, file);
}

function findItem(store: Store, arg: string | undefined): Item {
  const id = Number(arg);
  const item = store.items.find((i) => i.id === id);
  if (!item) {
    console.error(`todo: no item with id ${arg ?? '(none)'}`);
    process.exit(1);
  }
  return item;
}

function usage(): void {
  console.log('usage: todo add <text> | list | done <id> | rm <id>');
}

const [command = 'list', ...rest] = process.argv.slice(2);
const store = load();

if (command === 'add') {
  const text = rest.join(' ').trim();
  if (text === '') {
    usage();
    process.exit(1);
  }
  const item: Item = { id: store.nextId, text: text, done: false, created: new Date().toISOString() };
  store.nextId += 1;
  store.items.push(item);
  save(store);
  console.log(`added #${item.id}: ${item.text}`);
} else if (command === 'list') {
  if (store.items.length === 0) {
    console.log('nothing to do');
  }
  for (const item of store.items) {
    console.log(`${item.done ? '[x]' : '[ ]'} ${String(item.id).padStart(3)}  ${item.text}`);
  }
  const open = store.items.filter((i) => !i.done).length;
  if (store.items.length > 0) console.log(`\n${open} open, ${store.items.length - open} done`);
} else if (command === 'done') {
  const item = findItem(store, rest[0]);
  item.done = true;
  save(store);
  console.log(`done #${item.id}: ${item.text}`);
} else if (command === 'rm') {
  const item = findItem(store, rest[0]);
  store.items = store.items.filter((i) => i.id !== item.id);
  save(store);
  console.log(`removed #${item.id}: ${item.text}`);
} else {
  usage();
  process.exit(1);
}
