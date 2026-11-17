// Top-level await in a module (the import and the export make this one)
import { format } from 'node:util';

const answer = await Promise.resolve(41);
assert(answer + 1 === 42, 'await a promise at the top level');

const ticked = await new Promise<string>((resolve) => setTimeout(() => resolve('tick'), 1));
assert(format('%s', ticked) === 'tick', 'await a timer at the top level');

export {};
