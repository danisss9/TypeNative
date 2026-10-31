// Declares the same top-level names as module-scope-a-helper.ts
export const NAME = 'b';
function local(): string {
  return 'b-local';
}
export function describe(): string {
  // a parameter shadowing a module binding keeps its own meaning
  const shadow = (NAME: string): string => NAME.toUpperCase();
  return `${NAME}:${local()}:${shadow('x')}`;
}
export class Thing {
  id(): string {
    return 'B';
  }
}
export interface Shape {
  b: string;
}
export default function hello(): string {
  return 'hi b';
}
