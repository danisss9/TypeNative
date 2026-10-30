// Intersection types: object types merged (shared fields once), a class or
// interface with extra fields, and never fields left out
interface Named {
  name: string;
}
interface Aged {
  age: number;
  name: string;
}
type Person = Named & Aged & { email?: string };
const p: Person = { name: 'ana', age: 30 };
assert(p.name === 'ana' && p.age === 30 && p.email === undefined, 'merged fields');
type WithId<T> = T & { id: number };
const q: WithId<Named> = { name: 'bo', id: 7 };
assert(q.id === 7 && q.name === 'bo', 'generic intersection');
function greet(x: Named & { greeting: string }): string {
  return `${x.greeting}, ${x.name}`;
}
assert(greet({ name: 'cy', greeting: 'hi' }) === 'hi, cy', 'parameter');
console.log(p.name, p.age, q.id, greet({ name: 'cy', greeting: 'hi' }));
