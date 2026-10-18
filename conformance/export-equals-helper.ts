function twice(n: number): number { return n * 2; }
// @ts-ignore TS1203: tsc rejects export = when targeting ES modules
export = { twice };
