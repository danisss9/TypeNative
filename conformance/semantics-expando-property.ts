// A property set on an object whose class doesn't declare it: kept on the
// object and read back (JS adds it to the object)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Icu {
  constructor(public expression: string) {}
  describe(): string {
    return `icu(${this.expression})`;
  }
}

function nameIcu(target: any, name: string): void {
  target.name = name;
}

const icu = new Icu('count');
nameIcu(icu, 'ICU_1');
const read: any = icu;
assert(read.name === 'ICU_1', 'expando read back');
assert(icu.describe() === 'icu(count)', 'declared members kept');
nameIcu(icu, 'ICU_2');
assert(read.name === 'ICU_2', 'expando overwritten');
const other: any = new Icu('x');
assert(other.name === undefined, 'no expando on another object');
console.log('ok');
