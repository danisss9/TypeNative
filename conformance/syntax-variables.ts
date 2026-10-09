// Variable Declarations and operations
const s1: string = '123';
const s2: string = '456';
console.log(s1 + s2);
assert(s1 + s2 === '123456', 'String concatenation failed');

const n1: number = 10;
const n2: number = 20;
console.log(n1 + n2 - n1);
assert(n1 + n2 - n1 === 20, 'Arithmetic failed');

const bool1: boolean = true;
const bool2: boolean = false;
console.log((bool1 && !bool1) || bool2);
assert((bool1 && !bool1) || bool2 === false, 'Boolean logic failed');
