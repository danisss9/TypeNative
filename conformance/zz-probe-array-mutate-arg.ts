// Temporary probe: an array handed to a function that changes it in place
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function addOne(arr: any[]): void {
  arr.push(1);
}

const xs: number[] = [];
addOne(xs);
console.log(`PUSH ${xs.length} ${xs.join(',')}`);

function truncate(arr: any[]): void {
  arr.length = 1;
}

const ys = [1, 2, 3];
truncate(ys);
console.log(`TRUNC ${ys.length} ${ys.join(',')}`);

function setAt(arr: any[]): void {
  arr[0] = 9;
}

const zs = [1, 2, 3];
setAt(zs);
console.log(`SETAT ${zs.join(',')}`);

interface Box {
  items: string[];
}

function clear(box: Box): void {
  box.items.length = 0;
}

const b: Box = { items: ['a', 'b'] };
clear(b);
console.log(`FIELD ${b.items.length}`);
console.log('ok');
