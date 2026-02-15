// toString

// Number toString
let num2: number = 42;
let num2Str: string = num2.toString();
console.log(num2Str);
assert(num2Str == '42', 'number toString failed');

// Boolean toString
let flag: boolean = true;
let flagStr: string = flag.toString();
console.log(flagStr);
assert(flagStr == 'true', 'boolean toString failed');

// Array toString
let arr2: number[] = [1, 2, 3];
let arr2Str: string = arr2.toString();
console.log(arr2Str);

// String toString
let greet: string = 'hello';
let greetStr: string = greet.toString();
console.log(greetStr);
assert(greetStr == 'hello', 'string toString failed');
