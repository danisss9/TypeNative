// Temporary probe: length assignment on a dynamic array value
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

interface Node {
  kind: string;
}

interface Union {
  items?: Node[];
}

function trim(value: any): void {
  const items = value.items;
  if (items !== undefined) {
    items.length = 1;
  }
}

const u: Union = { items: [{ kind: 'a' }, { kind: 'b' }, { kind: 'c' }] };
trim(u);
assert(u.items !== undefined, 'items kept');
assert((u.items ?? []).length === 1, `truncated (${(u.items ?? []).length})`);

function grow(value: any): void {
  const items = value.items;
  items.length = 4;
}

const g: Union = { items: [{ kind: 'a' }] };
grow(g);
assert((g.items ?? []).length === 4, `grown (${(g.items ?? []).length})`);
console.log('ok');
