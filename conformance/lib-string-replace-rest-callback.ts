// s.replace(re, (...match) => …): the rest parameter takes the match, the
// groups, the offset and the string
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ESCAPE_RE = /'|\\|\n|\r/g;

function escapeString(input: string): string {
  return input.replace(ESCAPE_RE, (...match: string[]) => {
    if (match[0] == '\n') return '\\n';
    if (match[0] == '\r') return '\\r';
    return `\\${match[0]}`;
  });
}

assert(escapeString("I'm here\na\\b") === "I\\'m here\\na\\\\b", escapeString("I'm here\na\\b"));
const parts: string[] = [];
'x1y22'.replace(/(\d)(\d)?/g, (...args: any[]) => {
  parts.push(`${args[0]}|${args[1]}|${args[2]}|${args[3]}|${args[4]}`);
  return '';
});
assert(parts.join(' ') === '1|1|undefined|1|x1y22 22|2|2|3|x1y22', parts.join(' '));
const tail = 'ab'.replace(/b/, (m: string, ...rest: any[]) => `${m}:${rest.join(',')}`);
assert(tail === 'ab:1,ab', tail);
console.log('ok');
