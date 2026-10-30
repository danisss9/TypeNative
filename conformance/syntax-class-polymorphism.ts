// Overridden methods dispatch on the runtime class: through a base-class
// variable, through any values, and from a base method calling an override;
// generic classes erase to one Go type
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  speak(loud?: boolean): string {
    return `${this.name} makes a sound${loud ? '!' : ''}`;
  }
  describe(): string {
    return `[${this.speak()}]`;
  }
  get upper(): string {
    return this.name.toUpperCase();
  }
}
class Dog extends Animal {
  speak(loud?: boolean): string {
    return `${this.name} barks${loud ? '!' : ''}`;
  }
  fetch(...items: string[]): number {
    return items.length;
  }
}
const pets: Animal[] = [new Animal('cat'), new Dog('rex')];
assert(pets[1].describe() === '[rex barks]', 'base method calls the override');
assert(pets.map((p) => p instanceof Dog).join() === 'false,true', 'instanceof');
const anys: any[] = [new Animal('cat'), new Dog('rex'), { speak: (loud: boolean) => `obj ${loud}` }];
assert(anys.map((p) => p.speak(true)).join('|') === 'cat makes a sound!|rex barks!|obj true', 'any receivers');
const d: any = anys[1];
assert(d.fetch('a', 'b') === 2 && d.upper === 'REX' && d.name === 'rex', 'methods, getters and fields of any');

class Box<T = unknown> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
  map<U>(fn: (v: T) => U): Box<U> {
    return new Box<U>(fn(this.value));
  }
}
const n = new Box(3).map((v) => v * 2);
const s = new Box('x').map((v) => v + 'y');
assert(n.value === 6 && s.value === 'xy' && n instanceof Box, 'generic class');
console.log(pets[1].describe(), d.upper, n.value, s.value);
