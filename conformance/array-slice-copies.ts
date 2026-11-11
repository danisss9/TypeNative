// Array.prototype.slice returns a copy: pushing onto the copy (or writing its
// elements) leaves the original alone (the React Compiler's
// nextBlock ??= block.slice(0, i); nextBlock.push(...replacements))
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Stmt = { kind: string; id: number };

function transform(block: Stmt[]): void {
  let next: Stmt[] | null = null;
  for (let i = 0; i < block.length; i++) {
    const stmt = block[i];
    if (stmt.kind === 'label') {
      next ??= block.slice(0, i);
      next.push({ kind: 'inner', id: stmt.id * 10 }, { kind: 'inner', id: stmt.id * 10 + 1 });
    } else if (next !== null) {
      next.push(stmt);
    }
  }
  if (next !== null) {
    block.length = 0;
    block.push(...next);
  }
}

const block: Stmt[] = [
  { kind: 'instr', id: 1 },
  { kind: 'label', id: 2 },
  { kind: 'instr', id: 3 },
  { kind: 'return', id: 4 },
];
transform(block);
check('flattened', block.map((s) => `${s.kind}${s.id}`).join(','), 'instr1,inner20,inner21,instr3,return4');

const xs = [1, 2, 3, 4];
const head = xs.slice(0, 2);
head.push(99);
head[0] = 42;
check('original kept', xs.join(','), '1,2,3,4');
check('copy changed', head.join(','), '42,2,99');
const tail = xs.slice(2);
tail[0] = 7;
check('tail copy', xs[2], 3);
console.log('ok');
