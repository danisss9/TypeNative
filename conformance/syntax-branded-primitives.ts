// Branded primitives (number & { __brand: 'Id' }) are the primitive
type XrefId = number & { __brand: 'XrefId' };
type Name = string & { __brand: 'Name' };
class Job {
  private nextXrefId: XrefId = 0 as XrefId;
  allocate(): XrefId { return this.nextXrefId++ as XrefId; }
}
const j = new Job();
const ids: XrefId[] = [j.allocate(), j.allocate(), j.allocate()];
const n = 'abc' as Name;
const m = new Map<XrefId, Name>([[ids[1], n]]);
console.log(ids.join(','), ids[2] + 1, n.toUpperCase(), m.get(1 as XrefId));
assert(ids.join(',') === '0,1,2' && ids[2] + 1 === 3, 'branded numbers');
assert(n.toUpperCase() === 'ABC' && m.get(1 as XrefId) === 'abc', 'branded strings');
