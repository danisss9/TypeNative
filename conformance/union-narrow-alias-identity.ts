// A union of object type aliases narrowed to one member keeps the object's
// identity: a write through the narrowed value reaches the array's element
// (the React Compiler's Place | SpreadPattern call arguments)
type Place = {
  kind: 'Identifier';
  name: string;
  effect: string;
  reactive: boolean;
};

type SpreadPattern = {
  kind: 'Spread';
  place: Place;
};

function* eachArgument(args: Array<Place | SpreadPattern>): Iterable<Place> {
  for (const arg of args) {
    if (arg.kind === 'Identifier') {
      yield arg;
    } else {
      yield arg.place;
    }
  }
}

const inner: Place = { kind: 'Identifier', name: 'b', effect: 'unknown', reactive: false };
const args: Array<Place | SpreadPattern> = [
  { kind: 'Identifier', name: 'a', effect: 'unknown', reactive: false },
  { kind: 'Spread', place: inner },
];

for (const place of eachArgument(args)) {
  place.effect = 'read';
  place.reactive = true;
}

const first = args[0];
console.log(first.kind === 'Identifier' ? first.effect : 'spread', first.kind === 'Identifier' ? first.reactive : false);
console.log(inner.effect, inner.reactive);

// narrowed by a direct check, too
for (const arg of args) {
  if (arg.kind === 'Identifier') arg.name = arg.name + '!';
}
console.log(first.kind === 'Identifier' ? first.name : '');

// an array built from existing members (pushed, mapped): the narrowed
// values are still those objects
const places: Place[] = [
  { kind: 'Identifier', name: 'c', effect: 'unknown', reactive: false },
  { kind: 'Identifier', name: 'd', effect: 'unknown', reactive: false },
];
const pushed: Array<Place | SpreadPattern> = [];
pushed.push(places[0]);
pushed.push({ kind: 'Spread', place: places[1] });
for (const place of eachArgument(pushed)) place.effect = 'capture';
console.log(places[0].effect, places[1].effect);

const mapped: Array<Place | SpreadPattern> = places.map((p) => p);
for (const place of eachArgument(mapped)) place.effect = 'freeze';
console.log(places[0].effect, places[1].effect);

type Call = { kind: 'Call'; args: Array<Place | SpreadPattern> };
const call: Call = { kind: 'Call', args: [places[0], { kind: 'Spread', place: places[1] }] };
for (const place of eachArgument(call.args)) place.effect = 'store';
console.log(places[0].effect, places[1].effect);
