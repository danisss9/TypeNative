// Temporary probe: a typed visitor object's keys, and a property added to it
// later (Babel's explode mutates visitor objects: deletes keys and adds the
// types an alias names).
interface Visitor {
  Function?: (path: any) => void;
  Identifier?: (path: any) => void;
  enter?: any;
  exit?: any;
}

const collector: Visitor = {
  Function: () => {},
  Identifier: () => {},
};

console.log(`KEYS ${Object.keys(collector).join(',')}`);
const dynamic: any = collector;
const extraKey = 'ForStatement';
dynamic[extraKey] = () => {};
console.log(`AFTER ${Object.keys(dynamic).join(',')}`);
console.log(`READ ${typeof dynamic[extraKey]} FN ${typeof dynamic['Function']}`);

// (a function-valued key replaced by an object, as ensureEntranceObjects does)
const identifierKey = 'Identifier';
dynamic[identifierKey] = { enter: dynamic[identifierKey] };
const replaced: any = dynamic[identifierKey];
console.log(`REPLACED ${typeof replaced} ${Object.keys(replaced ?? {}).join(',')} ${typeof replaced?.enter}`);
console.log('ok');
