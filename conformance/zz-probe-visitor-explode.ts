// Temporary probe: Babel's visitor explosion over a typed object literal —
// the alias expansion has to add the concrete node types with the handlers
// (traverse/src/visitors.ts: explode, mergePair's enter/exit concat, and the
// mergeVisitorPairs loop)
interface Visitor {
  Function?: (path: any) => void;
  ForStatement?: (path: any) => void;
  Identifier?: (path: any) => void;
  Scopable?: (path: any) => void;
  enter?: any;
  exit?: any;
}

const FLIPPED_ALIAS_KEYS: Record<string, string[]> = {
  Function: ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'],
  Scopable: ['FunctionDeclaration', 'ArrowFunctionExpression', 'BlockStatement'],
};

const calls: string[] = [];

function ensureEntranceObjects(obj: any): void {
  for (const key of Object.keys(obj)) {
    const fns = obj[key];
    if (typeof fns === 'function') obj[key] = { enter: fns };
  }
}

function ensureCallbackArrays(obj: any): void {
  if (obj.enter && !Array.isArray(obj.enter)) obj.enter = [obj.enter];
  if (obj.exit && !Array.isArray(obj.exit)) obj.exit = [obj.exit];
}

function mergePair(dest: any, src: any): void {
  for (const phase of ['enter', 'exit']) {
    if (!src[phase]) continue;
    dest[phase] = [].concat(dest[phase] || [], src[phase]);
  }
}

function explode(visitor: any): any {
  if (visitor._exploded) return visitor;
  visitor._exploded = true;
  ensureEntranceObjects(visitor);
  ensureCallbackArrays(visitor);
  for (const nodeType of Object.keys(visitor)) {
    if (nodeType === 'enter' || nodeType === 'exit' || nodeType[0] === '_') continue;
    const aliases = FLIPPED_ALIAS_KEYS[nodeType];
    if (!aliases) continue;
    const fns = visitor[nodeType];
    delete visitor[nodeType];
    for (const alias of aliases) {
      const existing = visitor[alias];
      if (existing) mergePair(existing, fns);
      else visitor[alias] = { ...fns };
    }
  }
  // enter/exit callbacks are arrays before the visitor is used
  for (const nodeType of Object.keys(visitor)) {
    if (nodeType === 'enter' || nodeType === 'exit' || nodeType[0] === '_') continue;
    ensureCallbackArrays(visitor[nodeType]);
  }
  return visitor;
}

const collector: Visitor = {
  Function: () => calls.push('function'),
  ForStatement: () => calls.push('for'),
  Identifier: () => calls.push('identifier'),
};

const merged: any = { _verified: true, _exploded: true };
for (const visitor of [collector as any]) {
  const exploded = explode(visitor);
  mergePair(merged, exploded);
  for (const key of Object.keys(visitor)) {
    if (key === 'enter' || key === 'exit' || key[0] === '_') continue;
    const nodeVisitor = (merged[key] ||= {});
    mergePair(nodeVisitor, visitor[key]);
  }
}

const arrow = merged['ArrowFunctionExpression'];
assert(arrow !== undefined, 'the alias type is in the merged visitor');
assert(typeof arrow.enter?.[0] === 'function', `the arrow handler is a function (${typeof arrow.enter?.[0]})`);
arrow.enter[0]();
assert(calls[calls.length - 1] === 'function', `the arrow handler is the Function one (${calls[calls.length - 1]})`);
assert(merged['ForStatement'] !== undefined, 'an exact type keeps its handler');
assert(typeof merged['Identifier'].enter[0] === 'function', 'a second exact type keeps its handler');
console.log('ok');
