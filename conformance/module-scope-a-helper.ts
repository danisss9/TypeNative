// Declares the same top-level names as module-scope-b-helper.ts
export const NAME = 'a';
function local(): string {
  return 'a-local';
}
export function describe(): string {
  return `${NAME}:${local()}`;
}
export class Thing {
  id(): string {
    return 'A';
  }
}
export interface Shape {
  a: number;
}
export default function hello(): string {
  return 'hi a';
}
