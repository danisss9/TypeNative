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
  nickname?: string;
  age?: number;
  active?: boolean;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }
}

const user: User | null = new User('Fernando');
const noUser: User | null = null;

const userName: string = user?.name ?? 'unknown';
const missingUserName: string = (noUser as User | null)?.name ?? 'unknown';
assert(userName === 'Fernando', 'optional chaining property — value');
assert(missingUserName === 'unknown', 'optional chaining property — nil');

const userMethodName: string = user?.getName() ?? 'unknown';
const missingUserMethodName: string = (noUser as User | null)?.getName() ?? 'unknown';
assert(userMethodName === 'Fernando', 'optional chaining method — value');
assert(missingUserMethodName === 'unknown', 'optional chaining method — nil');

const profile = new User('Not Fernando');
const nickname: string = profile.nickname ?? 'guest';
const age: number = profile.age ?? 30;
const active: boolean = profile.active ?? true;

assert(nickname === 'guest', 'optional property string — fallback');
assert(age === 30, 'optional property number — fallback');
assert(active === true, 'optional property boolean — fallback');

interface ProfileInfo {
  nickname?: string;
  age?: number;
  active?: boolean;
}

const profileInfo: ProfileInfo = {};
const infoNickname: string = profileInfo.nickname ?? 'guest-interface';
const infoAge: number = profileInfo.age ?? 21;
const infoActive: boolean = profileInfo.active ?? false;

assert(infoNickname === 'guest-interface', 'interface optional property string — fallback');
assert(infoAge === 21, 'interface optional property number — fallback');
assert(infoActive === false, 'interface optional property boolean — fallback');
