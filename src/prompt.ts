// Interactive prompts for the self-hosted native binary.
// Implemented exclusively with TypeNative-mapped APIs (node:readline → Go helper)
// so this module transpiles. Under Node the namespace import of node:readline is
// valid but `question` is only available once transpiled — the Node CLI wrapper
// (src/cli.ts) resolves prompts via inquirer instead and never calls these.
import * as readlineSync from 'node:readline';

export function ask(message: string): string {
  let input: string = readlineSync.question(message + ' ');
  while (input.trim() === '') {
    console.log('Please enter a non-empty value.');
    input = readlineSync.question(message + ' ');
  }
  return input.trim();
}

export function askMultiline(message: string): string {
  console.log(message);
  console.log("(finish with a line containing only 'END')");
  const lines: string[] = [];
  let line: string = readlineSync.question('');
  while (line.trim() !== 'END') {
    lines.push(line);
    line = readlineSync.question('');
  }
  return lines.join('\n');
}

export function confirm(message: string): boolean {
  const answer: string = readlineSync.question(message + ' (y/n): ');
  return answer.trim().toLowerCase() === 'y';
}
