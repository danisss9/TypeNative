// c ? f : g of declared functions: a function value
function createA(x: number, kind: string): string { return 'A' + x + kind; }
function createB(x: number, kind: string, extra?: boolean): string { return 'B' + x + kind; }
const out: string[] = [];
for (let i = 0; i < 2; i++) {
  const createOp = i === 0 ? createA : createB;
  out.push(createOp(i, 'k'));
}
const pick = (i: number) => (i === 0 ? createA : createB);
out.push(pick(0)(7, 'z'));
console.log(out.join(','));
assert(out.join(',') === 'A0k,B1k,A7z', 'conditional functions');
