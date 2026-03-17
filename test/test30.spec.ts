// Array destructuring, object shorthand, static class members

// Array destructuring
const pair2: number[] = [10, 20];
const [a2, b2] = pair2;
assert(a2 === 10, `array destructuring a2: ${a2}`);
assert(b2 === 20, `array destructuring b2: ${b2}`);

const triple: number[] = [1, 2, 3];
const [x2, , z2] = triple;
assert(x2 === 1, `triple x2: ${x2}`);
assert(z2 === 3, `triple z2: ${z2}`);

// Object shorthand in object literals
interface Person {
  name: string;
  age: number;
}

const personName: string = 'Alice';
const personAge: number = 30;
const person: Person = { name: personName, age: personAge };
assert(person.name === 'Alice', `shorthand name: ${person.name}`);
assert(person.age === 30, `shorthand age: ${person.age}`);

// Static class members
class CounterExample {
  static count: number = 0;

  static increment(): number {
    CounterExample.count = CounterExample.count + 1;
    return CounterExample.count;
  }

  static reset(): void {
    CounterExample.count = 0;
  }
}

CounterExample.increment();
CounterExample.increment();
const val: number = CounterExample.increment();
assert(val === 3, `static increment: ${val}`);
CounterExample.reset();
assert(CounterExample.count === 0, `static reset: ${CounterExample.count}`);
