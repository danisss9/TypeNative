interface User { name: string; age: number }
type Keys = keyof User;
type Flags = { [K in Keys]: boolean };
const k: Keys = 'name';
const f: Flags = { name: true, age: false };
assert(k === 'name' && f.name, 'keyof / mapped');
type Settings = { [K in 'dark' | 'compact']?: boolean };
const settings: Settings = { dark: true };
const totals: { [K in string]: number } = { a: 1 };
assert(settings.dark === true && settings.compact === undefined && totals['a'] === 1, 'mapped over literals / string');
