// Ternary expressions, Optional chaining and Nullish coalescing operator
const score: number = 70;
const ternaryResult: string = score >= 60 ? 'pass' : 'fail';
assert(ternaryResult === 'pass', 'ternary — basic');

const nullableText: string | null = null;
const withFallback: string = nullableText ?? 'default';
assert(withFallback === 'default', 'nullish coalescing — fallback');

const nonNullText: string | null = 'value';
const withoutFallback: string = nonNullText ?? 'default';
assert(withoutFallback === 'value', 'nullish coalescing — keeps left side');

class User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }
}

const user: User | null = new User('Dani');
const noUser: User | null = null;

const userName: string = user?.name ?? 'unknown';
const missingUserName: string = (noUser as User | null)?.name ?? 'unknown';
assert(userName === 'Dani', 'optional chaining property — value');
assert(missingUserName === 'unknown', 'optional chaining property — nil');

const userMethodName: string = user?.getName() ?? 'unknown';
const missingUserMethodName: string = (noUser as User | null)?.getName() ?? 'unknown';
assert(userMethodName === 'Dani', 'optional chaining method — value');
assert(missingUserMethodName === 'unknown', 'optional chaining method — nil');
