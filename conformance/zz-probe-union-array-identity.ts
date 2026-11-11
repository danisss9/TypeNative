// Temporary probe: an array of a union (an object or a spread), where one
// member's object must keep its identity when narrowed back out of the array
interface Item {
  kind: string;
  name: string;
  count: number;
}

interface Spread {
  kind: string;
  place: Item;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const items: (Item | Spread)[] = [{ kind: 'a', name: 'x', count: 1 }, { kind: 'Spread', place: { kind: 'a', name: 'y', count: 2 } }];

for (const it of items) {
  const item: Item = it.kind === 'Spread' ? (it as Spread).place : (it as Item);
  item.count = item.count + 10;
}

const first = items[0] as Item;
assert(first.count === 11, `first count ${first.count}`);
const second = (items[1] as Spread).place;
assert(second.count === 12, `second count ${second.count}`);
console.log('ok');
