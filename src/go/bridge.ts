// Go bridge: name resolution and emitters for `go:*` imports.
//
// Resolves package members (default, namespace and named imports), emits
// calls with argument/result conversion, struct construction, field access
// and method calls through the metadata method set.
//
// Kept in a plain style because this file is part of the self-hosted
// compiler and must transpile with TypeNative.

import { goPackage, goTypeInfo, GoMethod, GoParam, allGoPaths } from './metadata.js';
import { toGo, fromGo, mustCall, checkCall, isGoNumericKind } from './convert.js';
import { isSyncCallback, isBlockingCall, goPathAliases } from './overrides.js';

export type AstNode = any;

export interface BridgeServices {
  pkg: (name: string) => void;
  helper: (id: string) => void;
  temp: (prefix: string) => string;
  typeOf: (node: AstNode) => string;
  visit: (node: AstNode) => string;
  categoryOf: (node: AstNode) => string;
  goTypeOf: (node: AstNode) => string;
  isIdentifier: (node: AstNode) => boolean;
  isPropertyAccess: (node: AstNode) => boolean;
  isArrowFunction: (node: AstNode) => boolean;
  isFunctionExpression: (node: AstNode) => boolean;
  isObjectLiteral: (node: AstNode) => boolean;
  // Record a callback parameter's TS-facing Go type for the body visit.
  declareLocal: (name: string, goType: string) => void;
}

let services: BridgeServices = {
  pkg: (_name: string) => {},
  helper: (_id: string) => {},
  temp: (prefix: string) => prefix,
  typeOf: (_node: AstNode) => '',
  visit: (_node: AstNode) => '',
  categoryOf: (_node: AstNode) => '',
  goTypeOf: (_node: AstNode) => 'interface{}',
  isIdentifier: (_node: AstNode) => false,
  isPropertyAccess: (_node: AstNode) => false,
  isArrowFunction: (_node: AstNode) => false,
  isFunctionExpression: (_node: AstNode) => false,
  isObjectLiteral: (_node: AstNode) => false,
  declareLocal: (_name: string, _goType: string) => {}
};

export function bindBridgeServices(s: BridgeServices): void {
  services = s;
}

// Local import name → Go package path ('strings' → 'strings').
const localToPath: Record<string, string> = {};
// Local name → qualified member ('Sprintf' → 'fmt.Sprintf').
const memberAliases: Record<string, string> = {};
// Package path → local qualifier used in emitted code.
const pathToLocal: Record<string, string> = {};

export function resetGoBridge(): void {
  for (const key of Object.keys(localToPath)) delete localToPath[key];
  for (const key of Object.keys(memberAliases)) delete memberAliases[key];
  for (const key of Object.keys(pathToLocal)) delete pathToLocal[key];
}

// Register a `go:` import's local names. qualifier is the emitted package
// qualifier (real name or collision alias).
export function registerGoImport(
  path: string,
  qualifier: string,
  defaultName: string | null,
  namespaceName: string | null,
  named: Array<{ imported: string; local: string }>
): void {
  pathToLocal[path] = qualifier;
  if (defaultName) {
    localToPath[defaultName] = path;
    if (defaultName !== qualifier) memberAliases[defaultName] = qualifier;
  }
  if (namespaceName) {
    localToPath[namespaceName] = path;
    if (namespaceName !== qualifier) memberAliases[namespaceName] = qualifier;
  }
  for (const entry of named) {
    memberAliases[entry.local] = `${qualifier}.${entry.imported}`;
  }
}

// Register a go:builtin local name (ref/chan/GoError have no Go import).
export function registerGoBuiltin(local: string, imported: string): void {
  memberAliases[local] = `go:builtin.${imported}`;
}

// Qualifier used in emitted code for a package path.
export function goQualifier(path: string): string {
  if (pathToLocal[path]) return pathToLocal[path];
  const info = goPackage(path);
  const name = info ? info.name : (path.split('/').pop() ?? path);
  return goPathAliases[path] ?? name;
}

// Register the qualifier for a package pulled in only as a type reference.
export function ensureGoQualifier(path: string): void {
  if (!pathToLocal[path]) {
    pathToLocal[path] = goQualifier(path);
  }
}

// Package path of a local namespace name, '' when none.
export function goPathOf(local: string): string {
  return localToPath[local] ?? '';
}

// Qualified member of a local name ('Sprintf' → 'fmt.Sprintf'), '' when none.
export function goMemberOf(local: string): string {
  return memberAliases[local] ?? '';
}

// Ensure the packages named by a Go type are imported (cross-package
// result types like hash.Hash32 need their own import).
export function ensureGoTypePackages(goType: string): void {
  if (!goType) return;
  const cleaned = goType.replace(/\[[^\]]*\]/g, ' ').replace(/[*,{}()]/g, ' ');
  for (const part of cleaned.split(/\s+/)) {
    if (!part || part === 'error' || part === 'any' || part === 'interface{}') continue;
    const dot = part.lastIndexOf('.');
    if (dot < 0) continue;
    const path = part.slice(0, dot);
    if (knownPaths[path]) {
      services.pkg(path);
      ensureGoQualifier(path);
    }
  }
}

let knownPaths: Record<string, boolean> = {};

export function initKnownPaths(): void {
  knownPaths = {};
  for (const p of allGoPaths()) knownPaths[p] = true;
}

// Split 'qualifier.Member' into path + member using the import table.
export function splitGoMember(qualified: string): { path: string; member: string } | null {
  const dot = qualified.indexOf('.');
  if (dot < 0) return null;
  const qualifier = qualified.slice(0, dot);
  const member = qualified.slice(dot + 1);
  for (const path of Object.keys(pathToLocal)) {
    if (pathToLocal[path] === qualifier) return { path, member };
  }
  return null;
}

// Rewrite a metadata Go type with the emitted qualifiers
// (*compress/gzip.Writer → *gzip.Writer, *net/url.URL → *tnurl.URL).
export function goLocalType(goType: string): string {
  if (!goType) return goType;
  let out = goType;
  for (const path of Object.keys(pathToLocal)) {
    const qualifier = pathToLocal[path];
    out = out.split(path + '.').join(qualifier + '.');
  }
  return out;
}

// Whether an identifier or property access refers to a Go bridge member.
export function isGoMember(node: AstNode): boolean {
  if (services.isIdentifier(node)) {
    return !!memberAliases[node.text];
  }
  if (services.isPropertyAccess(node)) {
    const base = node.expression;
    if (services.isIdentifier(base) && localToPath[base.text]) return true;
  }
  return false;
}

// Emitted qualifier + member for a callee expression.
function calleeTarget(callee: AstNode): { path: string; member: string; qualifier: string } | null {
  if (services.isIdentifier(callee)) {
    const qualified = memberAliases[callee.text];
    if (!qualified) return null;
    const split = splitGoMember(qualified);
    if (!split) return null;
    return { path: split.path, member: split.member, qualifier: goQualifier(split.path) };
  }
  if (services.isPropertyAccess(callee)) {
    const base = callee.expression;
    if (!services.isIdentifier(base)) return null;
    const path = localToPath[base.text];
    if (!path) return null;
    return { path, member: callee.name.text, qualifier: goQualifier(path) };
  }
  return null;
}

// Local name of a go:builtin function (ref/chan), '' when none.
function goBuiltinName(callee: AstNode): string {
  if (services.isIdentifier(callee)) {
    const qualified = goMemberOf(callee.text);
    if (qualified && qualified.startsWith('go:builtin.')) {
      return qualified.slice('go:builtin.'.length);
    }
  }
  return '';
}

// Whether the node is a go:builtin ref<T>(init?) call.
export function isGoRefCall(node: AstNode): boolean {
  return !!node && node.kind === 'CallExpression' && goBuiltinName(node.expression) === 'ref';
}

// go:builtin calls: ref<T>(init?) → new(T), chan<T>(size?) → make(chan T).
function visitGoBuiltinCall(node: AstNode): string | undefined {
  const name = goBuiltinName(node.expression);
  if (!name) return undefined;
  if (name === 'ref') {
    const typeArg = (node.typeArguments ?? [])[0];
    const goType = typeArg ? services.goTypeOf(typeArg) : 'interface{}';
    const arg = (node.arguments ?? [])[0];
    if (arg) {
      return `func() *${goType} { v := ${services.goTypeOf(typeArg ?? arg)}(${services.visit(arg)}); return &v }()`;
    }
    return `new(${goType})`;
  }
  if (name === 'chan') {
    const size = (node.arguments ?? [])[0];
    // Element type from the contextual annotation is unavailable here;
    // default to interface{} (callers annotate: const ch: GoChan<T> = ...).
    if (size) return `make(chan interface{}, int(${services.visit(size)}))`;
    return 'make(chan interface{})';
  }
  return undefined;
}

// Emit a call of a Go package function with argument/result conversion.
export function visitGoCall(node: AstNode): string | undefined {
  const builtin = visitGoBuiltinCall(node);
  if (builtin !== undefined) return builtin;
  const target = calleeTarget(node.expression);
  if (!target) return undefined;
  const info = goPackage(target.path);
  if (!info) return undefined;
  const fn = info.funcs[target.member];
  if (!fn) return undefined;
  services.pkg(target.path);
  const argNodes = node.arguments ?? [];
  // Generic functions: params with the inferred type args (callbacks get
  // concrete signatures: maps.DeleteFunc's func(K, V) bool).
  let params = fn.params;
  if (fn.tparams.length > 0) {
    const subst = inferTypeArgs(fn, argNodes);
    params = fn.params.map((p) => ({ name: p.name, goType: substituteType(p.goType, subst) }));
  }
  const args = emitGoArgs(argNodes, params, fn.variadic, target.path, target.member);
  let call = `${target.qualifier}.${target.member}(${args.join(', ')})`;
  const results = instantiateResults(fn, argNodes);
  for (const r of results) ensureGoTypePackages(r);
  if (isBlockingCall(target.path, target.member)) {
    call = emitBlocking(call, results, isStatement(node));
  } else {
    call = emitResults(call, results, isStatement(node));
  }
  return call;
}

// Substitute a generic function's type params from the argument types
// (slices.Values[Slice ~[]E, E any](s Slice) iter.Seq[E] on a []float64
// arg → iter.Seq[float64]). Type params nothing pins down become any.
function instantiateResults(fn: { tparams: string[]; tcores?: string[]; params: GoParam[]; results: string[] }, argNodes: AstNode[]): string[] {
  if (fn.tparams.length === 0) return fn.results;
  const subst = inferTypeArgs(fn, argNodes);
  return fn.results.map((r) => substituteType(r, subst));
}

function inferTypeArgs(fn: { tparams: string[]; tcores?: string[]; params: GoParam[] }, argNodes: AstNode[]): Record<string, string> {
  const cores: Record<string, string> = {};
  for (let i = 0; i < fn.tparams.length; i++) {
    cores[fn.tparams[i]] = (fn.tcores ?? [])[i] ?? '';
  }
  const subst: Record<string, string> = {};
  for (let i = 0; i < argNodes.length && fn.params.length > 0; i++) {
    const param = fn.params[Math.min(i, fn.params.length - 1)];
    unifyParam(param.goType.replace(/^\.\.\./, ''), services.typeOf(argNodes[i]) ?? '', subst, cores);
  }
  for (const tp of fn.tparams) {
    if (subst[tp] === undefined) subst[tp] = 'any';
  }
  return subst;
}

function unifyParam(paramType: string, argType: string, subst: Record<string, string>, cores: Record<string, string>): void {
  if (!paramType || !argType) return;
  // TS arrays are slice references.
  if (argType.startsWith('*[]')) argType = argType.slice(1);
  // A type param: bind it, then match its constraint's core type
  // (Map ~map[K]V binds K and V too).
  if (cores[paramType] !== undefined) {
    if (subst[paramType] === undefined) subst[paramType] = argType;
    if (cores[paramType]) unifyParam(cores[paramType], argType, subst, cores);
    return;
  }
  if (paramType.startsWith('[]') && argType.startsWith('[]')) {
    unifyParam(paramType.slice(2), argType.slice(2), subst, cores);
    return;
  }
  if (paramType.startsWith('*') && argType.startsWith('*')) {
    unifyParam(paramType.slice(1), argType.slice(1), subst, cores);
    return;
  }
  if (paramType.startsWith('map[') && argType.startsWith('map[')) {
    const p = splitMapType(paramType);
    const a = splitMapType(argType);
    if (p && a) {
      unifyParam(p[0], a[0], subst, cores);
      unifyParam(p[1], a[1], subst, cores);
    }
    return;
  }
  // Generic named types: iter.Seq[E] against iter.Seq[float64].
  const pOpen = paramType.indexOf('[');
  const aOpen = argType.indexOf('[');
  if (pOpen > 0 && aOpen > 0 && paramType.slice(0, pOpen) === argType.slice(0, aOpen) && paramType.endsWith(']') && argType.endsWith(']')) {
    const pArgs = splitTopLevel(paramType.slice(pOpen + 1, -1));
    const aArgs = splitTopLevel(argType.slice(aOpen + 1, -1));
    for (let i = 0; i < pArgs.length && i < aArgs.length; i++) unifyParam(pArgs[i], aArgs[i], subst, cores);
  }
}

// 'map[K]V' → ['K', 'V'].
function splitMapType(goType: string): string[] | null {
  let depth = 0;
  for (let i = 4; i < goType.length; i++) {
    const ch = goType[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      if (depth === 0) return [goType.slice(4, i), goType.slice(i + 1)];
      depth--;
    }
  }
  return null;
}

// Replace type-param identifiers (not selector or path parts) in a Go type.
function substituteType(goType: string, subst: Record<string, string>): string {
  let out = '';
  let i = 0;
  while (i < goType.length) {
    const ch = goType[i];
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < goType.length && /[A-Za-z0-9_]/.test(goType[j])) j++;
      const word = goType.slice(i, j);
      const prev = i > 0 ? goType[i - 1] : '';
      // A selector (pkg.Name) or path part, but `...S` is a variadic param.
      const selector = prev === '/' || (prev === '.' && !goType.slice(0, i).endsWith('...'));
      out += !selector && subst[word] !== undefined ? subst[word] : word;
      i = j;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

// Whether the call node is used as a bare statement (its value discarded).
function isStatement(node: AstNode): boolean {
  return !!node.parent && node.parent.kind === 'ExpressionStatement';
}

// Emit converted arguments.
function emitGoArgs(
  nodes: AstNode[],
  params: Array<{ name: string; goType: string }>,
  variadic: boolean,
  path: string,
  funcName: string
): string[] {
  const out: string[] = [];
  const intArgs = formatIntArgs(nodes, params, variadic);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const param = params[i] ?? params[params.length - 1];
    // Callback arguments become Go closures with the exact signature.
    if (
      param &&
      (services.isArrowFunction(node) || services.isFunctionExpression(node)) &&
      isFuncType(param.goType)
    ) {
      out.push(emitCallback(node, param.goType, path, funcName));
      continue;
    }
    if (!param) {
      out.push(services.visit(node));
      continue;
    }
    let paramType = param.goType;
    const isVariadicSlot = !!variadic && i >= params.length - 1;
    if (isVariadicSlot) {
      paramType = paramType.startsWith('...') ? paramType.slice(3) : paramType;
    } else if (paramType.startsWith('...')) {
      paramType = paramType.slice(3);
    }
    // A slice filling a variadic slot spreads (f([a, b]) → f(a, b)).
    const fromTypeEarly = services.typeOf(node) ?? '';
    const fromSlice = fromTypeEarly.startsWith('*[]') ? fromTypeEarly.slice(1) : fromTypeEarly;
    // `...any` takes the array as one value (fmt.Sprintf('%v', arr)).
    const anyVariadic = paramType === 'any' || paramType === 'interface{}';
    if (isVariadicSlot && !anyVariadic && fromSlice.startsWith('[]') && node.kind !== 'SpreadElement') {
      out.push(`${services.visit(node)}...`);
      continue;
    }
    // Empty array literal into a slice slot: emit the typed empty literal.
    if (
      paramType.startsWith('[]') &&
      node.kind === 'ArrayLiteralExpression' &&
      (node.elements ?? []).length === 0
    ) {
      out.push(`${paramType}{}`);
      continue;
    }
    const visited = services.visit(node);
    const fromType = services.typeOf(node) ?? '';
    if (intArgs[i] && fromType === 'float64') {
      out.push(`int64(${visited})`);
      continue;
    }
    ensureGoTypePackages(paramType);
    out.push(toGo(visited, fromType, paramType));
  }
  // Trailing error params already thrown upstream (template.Must(t)):
  // pad with nil so Go's Must wrappers type-check.
  for (let i = nodes.length; i < params.length; i++) {
    const paramType = params[i].goType;
    if (paramType === 'error') {
      out.push('nil');
    } else {
      break;
    }
  }
  return out;
}

// printf-style calls (`format string, a ...any`) with a literal format:
// which argument indexes feed an integer verb (%d %x %o %b %c %U). TS
// numbers are float64, which those verbs reject, so they pass as int64.
function formatIntArgs(nodes: AstNode[], params: Array<{ name: string; goType: string }>, variadic: boolean): boolean[] {
  const flags: boolean[] = [];
  if (!variadic || params.length < 2) return flags;
  const last = params[params.length - 1].goType;
  if (last !== '...any' && last !== '...interface{}') return flags;
  const formatIndex = params.length - 2;
  if (params[formatIndex].name !== 'format' || params[formatIndex].goType !== 'string') return flags;
  const formatNode = nodes[formatIndex];
  if (!formatNode || (formatNode.kind !== 'StringLiteral' && formatNode.kind !== 'NoSubstitutionTemplateLiteral')) return flags;
  const format: string = formatNode.text ?? '';
  let arg = formatIndex + 1;
  for (let i = 0; i < format.length; i++) {
    if (format[i] !== '%') continue;
    i++;
    // Flags, width, precision; `*` consumes an argument.
    while (i < format.length && '+-# 0123456789.*[]'.indexOf(format[i]) >= 0) {
      if (format[i] === '*') arg++;
      i++;
    }
    if (i >= format.length || format[i] === '%') continue;
    if ('dxXobcOU'.indexOf(format[i]) >= 0) flags[arg] = true;
    arg++;
  }
  return flags;
}

// Wrap results: (T, error) throws, error-only throws as a statement and
// yields the error value in value position, tuples pass through.
function emitResults(call: string, results: string[], asStatement = false): string {
  if (results.length === 0) return call;
  const last = results[results.length - 1];
  if (last === 'error') {
    const core = results.slice(0, -1);
    if (core.length === 0) {
      if (asStatement) return checkCall(call);
      return call;
    }
    const wrapped = mustCall(call, core.length);
    if (asStatement) return wrapped;
    if (core.length === 1) return fromGo(wrapped, core[0]);
    // (A, B, error): pack the two values into a slice.
    const temps = core.map((_, i) => `__v${i}`);
    return `func() []interface{} { ${temps.join(', ')} := ${wrapped}; return []interface{}{${packTuple(temps, core)}} }()`;
  }
  if (results.length === 1) {
    if (asStatement) return call;
    return fromGo(call, results[0]);
  }
  // Multiple values: pack into a slice (TS tuple). Multi-value calls can't
  // appear in a composite literal, so go through temps.
  if (asStatement) return call;
  const temps = results.map((_, i) => `__v${i}`);
  return `func() []interface{} { ${temps.join(', ')} := ${call}; return []interface{}{${packTuple(temps, results)}} }()`;
}

// Tuple elements read as TS-facing values (ints → float64), matching
// goTupleTypes so destructuring can assert them back.
function packTuple(temps: string[], types: string[]): string {
  return temps.map((t, i) => fromGo(t, types[i])).join(', ');
}

// TS-facing element types of a multi-value Go call ((A, B) or
// (A, B, error)); undefined for anything else.
export function goTupleTypes(node: AstNode): string[] | undefined {
  if (!node || node.kind !== 'CallExpression') return undefined;
  let results: string[] | undefined;
  const target = calleeTarget(node.expression);
  if (target) {
    const fn = goPackage(target.path)?.funcs[target.member];
    if (fn) results = instantiateResults(fn, node.arguments ?? []);
  } else if (services.isPropertyAccess(node.expression)) {
    const recvType = services.typeOf(node.expression.expression);
    const method = recvType ? goMethodInfo(recvType, node.expression.name.text) : null;
    if (method) results = method.results;
  }
  if (!results) return undefined;
  const core = results.length > 0 && results[results.length - 1] === 'error' ? results.slice(0, -1) : results;
  if (core.length < 2) return undefined;
  return core.map((t) => goResultType([t]) ?? 'interface{}');
}

// Wrap a blocking call so it runs on a goroutine while the baton holder
// pumps pending loop tasks.
function emitBlocking(call: string, results: string[], asStatement = false): string {
  services.helper('goBlocking');
  const wrapped = `tnGoBlocking(func() interface{} { return ${call} })`;
  return emitResults(wrapped, results, asStatement);
}

function isFuncType(goType: string): boolean {
  return goType.startsWith('func(') || goTypeInfo(goType) !== null && goTypeInfo(goType)?.kind === 'func';
}

// Go result type of each TS closure emitted as a Go callback; the
// transpiler converts its `return` values to it.
const callbackResults = new Map<AstNode, string>();

export function goCallbackResultType(fn: AstNode): string | undefined {
  return callbackResults.get(fn);
}

// Emit a TS closure as a Go closure with the exact Go signature. Params
// the TS body sees as numbers (Go ints) are re-declared as float64.
function emitCallback(node: AstNode, goType: string, path: string, funcName: string): string {
  const sig = parseFuncSig(goType);
  if (!sig) return services.visit(node);
  const params: string[] = [];
  const prelude: string[] = [];
  for (let i = 0; i < sig.params.length; i++) {
    const declared = (node.parameters ?? [])[i];
    const name = declared && services.isIdentifier(declared.name) ? services.visit(declared.name) : `_`;
    const paramType = stripParamName(sig.params[i]);
    ensureGoTypePackages(paramType);
    const tsType = goResultType([paramType]) ?? paramType;
    if (name !== '_' && tsType !== paramType) {
      const raw = services.temp('p');
      params.push(`${raw} ${goLocalType(paramType)}`);
      prelude.push(`${name} := ${fromGo(raw, paramType)}; _ = ${name}`);
    } else {
      params.push(`${name} ${goLocalType(paramType)}`);
    }
    if (name !== '_') services.declareLocal(name, tsType);
  }
  void isSyncCallback(path, funcName);
  const result = sig.results.length === 1 ? sig.results[0] : '';
  if (result) {
    ensureGoTypePackages(result);
    callbackResults.set(node, result);
  }
  const resultDecl = sig.results.length > 0 ? ' ' + sig.results.map((r) => goLocalType(r)).join(', ') : '';
  const head = `func(${params.join(', ')})${resultDecl}`;
  const pre = prelude.length > 0 ? prelude.join('; ') + '; ' : '';
  if (node.body && node.body.kind === 'Block') {
    return `${head} { ${pre}${services.visit(node.body)} }`;
  }
  const body = services.visit(node.body);
  if (!result) return `${head} { ${pre}${body} }`;
  return `${head} { ${pre}return ${toGo(body, services.typeOf(node.body) ?? '', result)} }`;
}

// "name T" → "T" (metadata signatures keep parameter names).
function stripParamName(param: string): string {
  const p = param.trim();
  let depth = 0;
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth--;
    else if (ch === ' ' && depth === 0) {
      const head = p.slice(0, i);
      const rest = p.slice(i + 1).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(head) && rest && head !== 'func' && head !== 'chan' && head !== 'map') return rest;
      return p;
    }
  }
  return p;
}

function parseFuncSig(goType: string): { params: string[]; results: string[] } | null {
  if (!goType.startsWith('func(')) {
    const info = goTypeInfo(goType);
    if (!info || info.kind !== 'func') return null;
    goType = info.under;
  }
  if (!goType.startsWith('func(')) return null;
  const rest = goType.slice(4);
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '(') depth++;
    else if (rest[i] === ')') {
      depth--;
      if (depth === 0) {
        const params = rest.slice(1, i);
        const results = rest.slice(i + 1).trim();
        return { params: splitTopLevel(results ? params : params), results: parseResultList(results) };
      }
    }
  }
  return null;
}

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function parseResultList(s: string): string[] {
  s = s.trim();
  if (!s) return [];
  if (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1);
  return splitTopLevel(s);
}

// Infer the Go type of a bridge expression.
export function inferGoType(node: AstNode): string | undefined {
  if (node && node.kind === 'CallExpression') {
    const builtinName = goBuiltinName(node.expression);
    if (builtinName === 'chan') return 'chan interface{}';
    if (builtinName === 'ref') {
      const typeArg = (node.typeArguments ?? [])[0];
      const goType = typeArg ? services.goTypeOf(typeArg) : 'interface{}';
      return `*${goType}`;
    }
    const target = calleeTarget(node.expression);
    if (target) {
      const info = goPackage(target.path);
      const fn = info?.funcs[target.member];
      if (fn) return goResultType(instantiateResults(fn, node.arguments ?? []));
    }
    // Method call on a Go-typed receiver.
    if (services.isPropertyAccess(node.expression)) {
      const recvType = services.typeOf(node.expression.expression);
      if (recvType) {
        const method = goMethodInfo(recvType, node.expression.name.text);
        if (method) return goResultType(method.results);
      }
    }
    return undefined;
  }
  if (services.isIdentifier(node)) {
    const qualified = memberAliases[node.text];
    if (!qualified) return undefined;
    if (qualified.startsWith('go:builtin.')) return undefined;
    if (qualified === 'go:builtin') return undefined;
    const split = splitGoMember(qualified);
    if (!split) return undefined;
    const info = goPackage(split.path);
    if (!info) return undefined;
    // A package qualifier alone has no value type.
    if (split.member === goQualifier(split.path)) return undefined;
    const fn = info.funcs[split.member];
    if (fn) return goResultType(fn.results);
    const c = info.consts[split.member];
    if (c) {
      if (c.kind === 'typed' && c.goType) return c.goType;
      if (c.kind === 'string') return 'string';
      if (c.kind === 'bool') return 'bool';
      return 'float64';
    }
    const v = info.vars[split.member];
    if (v) return v.goType;
    const t = info.types[split.member];
    if (t) return split.member;
    return undefined;
  }
  if (services.isPropertyAccess(node)) {
    const base = node.expression;
    const member = node.name.text;
    // Package member (pkg.Func, pkg.Const, pkg.Var, pkg.Type).
    if (services.isIdentifier(base)) {
      const path = localToPath[base.text];
      if (path) {
        const info = goPackage(path);
        if (!info) return undefined;
        const fn = info.funcs[member];
        if (fn) return goResultType(fn.results);
        const c = info.consts[member];
        if (c) return constGoType(path, member);
        const v = info.vars[member];
        if (v) return v.goType;
        const t = info.types[member];
        if (t) return member;
      }
    }
    // Field or method on a Go-typed receiver (any base shape).
    const recvType = services.typeOf(base);
    if (recvType) {
      const field = goFieldType(recvType, member);
      // Reads convert like results (int fields read as float64).
      if (field) return goResultType([field]);
      const method = goMethodInfo(recvType, member);
      if (method) return goResultType(method.results);
    }
    return undefined;
  }
  return undefined;
}

function goResultType(results: string[]): string | undefined {
  if (results.length === 0) return undefined;
  const last = results[results.length - 1];
  const core = last === 'error' ? results.slice(0, -1) : results;
  if (core.length === 0) return 'error';
  if (core.length === 1) {
    const t = core[0];
    if (isGoNumericKind(t) && t !== 'float64') return 'float64';
    // Numeric slices read back as []float64 (fromGo); []byte stays.
    if (t.startsWith('[]')) {
      const elem = t.slice(2);
      if (elem !== 'byte' && elem !== 'uint8' && elem !== 'float64' && isGoNumericKind(elem)) return '[]float64';
    }
    return t;
  }
  return '[]interface{}';
}

function constGoType(path: string, name: string): string {
  const info = goPackage(path);
  const c = info?.consts[name];
  if (!c) return 'float64';
  if (c.kind === 'typed' && c.goType) return c.goType;
  if (c.kind === 'string') return 'string';
  if (c.kind === 'bool') return 'bool';
  return 'float64';
}

// Field type of a Go struct value.
export function goFieldType(recvType: string, field: string): string | undefined {
  const info = goTypeInfo(recvType);
  if (!info) return undefined;
  for (const f of info.fields) {
    if (f.name === field) return f.goType;
  }
  return undefined;
}

// Method info of a Go type (value or pointer receiver).
export function goMethodInfo(recvType: string, method: string): GoMethod | null {
  const info = goTypeInfo(recvType);
  if (!info) return null;
  let found: GoMethod | null = null;
  for (const m of info.methods) {
    if (m.name === method) found = m;
  }
  if (!found) {
    for (const m of info.ifaceMethods) {
      if (m.name === method) found = m;
    }
  }
  if (!found || info.tparams.length === 0) return found;
  // Generic receiver (unique.Handle[string]): substitute its type args.
  const open = recvType.indexOf('[');
  if (open < 0 || !recvType.endsWith(']')) return found;
  const args = splitTopLevel(recvType.slice(open + 1, -1));
  const subst: Record<string, string> = {};
  for (let i = 0; i < info.tparams.length && i < args.length; i++) subst[info.tparams[i]] = args[i];
  return {
    name: found.name,
    ptr: found.ptr,
    params: found.params.map((p) => ({ name: p.name, goType: substituteType(p.goType, subst) })),
    results: found.results.map((r) => substituteType(r, subst))
  };
}

// Emit a method call on a Go value with conversion.
export function visitGoMethod(node: AstNode, recv: string, recvType: string): string | undefined {
  if (!services.isPropertyAccess(node.expression)) return undefined;
  const method = node.expression.name.text;
  const info = goMethodInfo(recvType, method);
  if (!info) return undefined;
  const args = emitGoArgs(node.arguments ?? [], info.params, false, '', '');
  const call = `${recv}.${method}(${args.join(', ')})`;
  for (const r of info.results) ensureGoTypePackages(r);
  return emitResults(call, info.results, isStatement(node));
}

// Emit `new pkg.T({...})` as a Go composite literal.
export function visitGoNew(node: AstNode, path: string, typeName: string): string | undefined {
  const info = goPackage(path);
  if (!info) return undefined;
  const type = info.types[typeName];
  if (!type) return undefined;
  const qualifier = goQualifier(path);
  const first = (node.arguments ?? [])[0];
  if (first && services.isObjectLiteral(first)) {
    const entries: string[] = [];
    for (const prop of first.properties ?? []) {
      const name = prop.name ? services.visit(prop.name) : '';
      const fieldType = fieldGoTypeOf(type, prop.name?.text ?? '');
      const fromType = services.typeOf(prop.initializer) ?? '';
      let value = services.visit(prop.initializer);
      if (fieldType && fromType === `*${fieldType}`) {
        // new pkix.Name({...}) into a value field: dereference.
        value = `*${value}`;
      } else if (fieldType) {
        ensureGoTypePackages(fieldType);
        value = toGo(value, fromType, fieldType);
      }
      entries.push(`${name}: ${value}`);
    }
    const ptr = hasPtrReceiver(type);
    const lit = `${qualifier}.${typeName}{${entries.join(', ')}}`;
    return ptr ? `&${lit}` : lit;
  }
  const empty = `${qualifier}.${typeName}{}`;
  return hasPtrReceiver(type) ? `&${empty}` : empty;
}

function fieldGoTypeOf(type: { fields: Array<{ name: string; goType: string }> }, field: string): string | undefined {
  for (const f of type.fields) {
    if (f.name === field) return f.goType;
  }
  return undefined;
}

function hasPtrReceiver(type: { methods: GoMethod[] }): boolean {
  for (const m of type.methods) {
    if (m.ptr) return true;
  }
  return false;
}
