// An empty object made for an any variable, stored on a node's Record field
// and filled afterwards, is the node's object: the keys set after storing it
// are on the node (Babel's addExtra: extra = {}; node.extra = extra;
// extra[key] = value)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

interface Node {
  type: string;
  value?: string;
  extra?: Record<string, any>;
}

function addExtra(node: Partial<Node>, key: string, value: any): void {
  if (!node) return;
  let { extra } = node;
  if (extra == null) {
    extra = {};
    node.extra = extra;
  }
  extra[key] = value;
}

const literal: Node = { type: 'StringLiteral', value: 'react' };
addExtra(literal, 'rawValue', 'react');
addExtra(literal, 'raw', "'react'");
check('rawValue', literal.extra?.rawValue, 'react');
check('raw', literal.extra?.raw, "'react'");
check('keys', Object.keys(literal.extra ?? {}).join(','), 'rawValue,raw');
console.log('ok');
