import { createNodeRegistry, NodeCall, NodeRegistry, SourcePosition } from './node/registry.js';
import { registerPath } from './node/path.js';
import { registerFs } from './node/fs.js';
import { registerUrl } from './node/url.js';
import { registerOs } from './node/os.js';
import { registerChildProcess } from './node/child_process.js';
import { registerReadline } from './node/readline.js';
import { registerCore, registerConstants } from './node/core.js';
import { registerBuffer } from './node/buffer.js';
import { registerProcess } from './node/process.js';
import { registerUtil } from './node/util.js';
import { registerUtilExtra } from './node/util_extra.js';
import { registerConsole } from './node/console.js';
import { registerAssert } from './node/assert.js';
import { registerPunycode } from './node/punycode.js';
import { registerQuerystring } from './node/querystring.js';
import { registerStringDecoder } from './node/string_decoder.js';
import { registerCrypto } from './node/crypto.js';
import { registerCryptoKeys } from './node/crypto_keys.js';
import { registerZlib } from './node/zlib.js';
import { registerFsWatch } from './node/fs_watch.js';
import { registerTypedArrays, isTypedArrayGoType } from './node/typed_arrays.js';
import { registerTimers } from './node/timers.js';
import { registerEvents } from './node/events.js';
import { registerStream } from './node/stream.js';
import { registerDiagnosticsChannel } from './node/diagnostics_channel.js';
import { registerNet } from './node/net.js';
import { registerDns } from './node/dns.js';
import { registerHttp } from './node/http.js';
import { registerTls } from './node/tls.js';
import { registerDgram } from './node/dgram.js';
import { registerSqlite } from './node/sqlite.js';
import { registerFetch } from './node/fetch.js';
import { registerStreamWeb } from './node/stream_web.js';
import { registerAsyncHooks } from './node/async_hooks.js';
import { registerTest } from './node/test.js';
import { registerWorkerThreads } from './node/worker_threads.js';
import { registerCluster } from './node/cluster.js';
import { registerHttp2 } from './node/http2.js';
import { registerSystemExtra } from './node/system_extra.js';
import { registerModuleV8 } from './node/module_v8.js';
import { goStdlib } from './go/stdlib.generated.js';
import {
  goPackage,
  goTypeInfo as goMetaTypeInfo,
  hasGoPackage,
  isGoNumeric as isGoNumericType,
  GoType,
  GoParam
} from './go/metadata.js';
import { bindConvertServices, initConvertPaths, isGoBasicKind, isGoNumericKind, toGo as toGoType, fromGo as fromGoType } from './go/convert.js';
import { goPathAliases } from './go/overrides.js';
import {
  bindBridgeServices,
  resetGoBridge,
  initKnownPaths,
  goLocalType,
  ensureGoTypePackages,
  registerGoBuiltin,
  registerGoImport,
  goQualifier,
  goPathOf,
  goMemberOf,
  visitGoCall,
  visitGoMethod,
  visitGoNew,
  inferGoType,
  goFieldType,
  goMethodInfo,
  isGoRefCall,
  goTupleTypes,
  goCallbackResultType,
  ensureGoQualifier,
  goAnnotationType,
  splitGoMember,
  GoNamedImport
} from './go/bridge.js';

// Normalized JSON AST node (see src/parse-node.ts and tsparser/main.go)
type AstNode = any;
// Parser injected by the caller: Node CLI uses the typescript npm package,
// the self-hosted binary spawns the tsparser Go tool.
type ParseFunction = (code: string, tsx: boolean) => AstNode;

// Shim over the removed `typescript` import: predicates and kind names operate
// on the normalized JSON AST ({kind: 'Xxx', ...} plain objects) produced by
// src/parse-node.ts (Node) or the tsparser Go tool (self-hosted).
// Kept as a `ts` object so the transpiler code keeps its shape.
function isArrayBindingPattern(n: AstNode): boolean {
  return n?.kind === 'ArrayBindingPattern';
}

function isArrayLiteralExpression(n: AstNode): boolean {
  return n?.kind === 'ArrayLiteralExpression';
}

function isArrayTypeNode(n: AstNode): boolean {
  return n?.kind === 'ArrayType';
}

function isArrowFunction(n: AstNode): boolean {
  return n?.kind === 'ArrowFunction';
}

function isAsExpression(n: AstNode): boolean {
  return n?.kind === 'AsExpression';
}

function isAwaitExpression(n: AstNode): boolean {
  return n?.kind === 'AwaitExpression';
}

function isBinaryExpression(n: AstNode): boolean {
  return n?.kind === 'BinaryExpression';
}

function isBlock(n: AstNode): boolean {
  return n?.kind === 'Block';
}

function isBreakStatement(n: AstNode): boolean {
  return n?.kind === 'BreakStatement';
}

function isCallExpression(n: AstNode): boolean {
  return n?.kind === 'CallExpression';
}

function isCaseBlock(n: AstNode): boolean {
  return n?.kind === 'CaseBlock';
}

function isCaseClause(n: AstNode): boolean {
  return n?.kind === 'CaseClause';
}

function isClassDeclaration(n: AstNode): boolean {
  return n?.kind === 'ClassDeclaration';
}

function isConditionalExpression(n: AstNode): boolean {
  return n?.kind === 'ConditionalExpression';
}

function isConstructorDeclaration(n: AstNode): boolean {
  return n?.kind === 'Constructor';
}

function isDefaultClause(n: AstNode): boolean {
  return n?.kind === 'DefaultClause';
}

function isDoStatement(n: AstNode): boolean {
  return n?.kind === 'DoStatement';
}

function isElementAccessExpression(n: AstNode): boolean {
  return n?.kind === 'ElementAccessExpression';
}

function isEnumDeclaration(n: AstNode): boolean {
  return n?.kind === 'EnumDeclaration';
}

function isExportAssignment(n: AstNode): boolean {
  return n?.kind === 'ExportAssignment';
}

function isExportDeclaration(n: AstNode): boolean {
  return n?.kind === 'ExportDeclaration';
}

function isExpressionStatement(n: AstNode): boolean {
  return n?.kind === 'ExpressionStatement';
}

function isForInStatement(n: AstNode): boolean {
  return n?.kind === 'ForInStatement';
}

function isForOfStatement(n: AstNode): boolean {
  return n?.kind === 'ForOfStatement';
}

function isForStatement(n: AstNode): boolean {
  return n?.kind === 'ForStatement';
}

function isFunctionDeclaration(n: AstNode): boolean {
  return n?.kind === 'FunctionDeclaration';
}

function isFunctionExpression(n: AstNode): boolean {
  return n?.kind === 'FunctionExpression';
}

function isFunctionTypeNode(n: AstNode): boolean {
  return n?.kind === 'FunctionType';
}

function isGetAccessor(n: AstNode): boolean {
  return n?.kind === 'GetAccessor';
}

function isIdentifier(n: AstNode): boolean {
  return n?.kind === 'Identifier';
}

function isIfStatement(n: AstNode): boolean {
  return n?.kind === 'IfStatement';
}

function isImportDeclaration(n: AstNode): boolean {
  return n?.kind === 'ImportDeclaration';
}

function isInterfaceDeclaration(n: AstNode): boolean {
  return n?.kind === 'InterfaceDeclaration';
}

function isLiteralTypeNode(n: AstNode): boolean {
  return n?.kind === 'LiteralType';
}

function isMethodDeclaration(n: AstNode): boolean {
  return n?.kind === 'MethodDeclaration';
}

function isMethodSignature(n: AstNode): boolean {
  return n?.kind === 'MethodSignature';
}

function isNamedImports(n: AstNode): boolean {
  return n?.kind === 'NamedImports';
}

function isNamespaceImport(n: AstNode): boolean {
  return n?.kind === 'NamespaceImport';
}

function isNewExpression(n: AstNode): boolean {
  return n?.kind === 'NewExpression';
}

function isNoSubstitutionTemplateLiteral(n: AstNode): boolean {
  return n?.kind === 'NoSubstitutionTemplateLiteral';
}

function isNonNullExpression(n: AstNode): boolean {
  return n?.kind === 'NonNullExpression';
}

function isNumericLiteral(n: AstNode): boolean {
  return n?.kind === 'NumericLiteral';
}

function isObjectBindingPattern(n: AstNode): boolean {
  return n?.kind === 'ObjectBindingPattern';
}

function isObjectLiteralExpression(n: AstNode): boolean {
  return n?.kind === 'ObjectLiteralExpression';
}

function isOmittedExpression(n: AstNode): boolean {
  return n?.kind === 'OmittedExpression';
}

function isParenthesizedExpression(n: AstNode): boolean {
  return n?.kind === 'ParenthesizedExpression';
}

function isPostfixUnaryExpression(n: AstNode): boolean {
  return n?.kind === 'PostfixUnaryExpression';
}

function isPrefixUnaryExpression(n: AstNode): boolean {
  return n?.kind === 'PrefixUnaryExpression';
}

function isPropertyAccessExpression(n: AstNode): boolean {
  return n?.kind === 'PropertyAccessExpression';
}

function isPropertyAssignment(n: AstNode): boolean {
  return n?.kind === 'PropertyAssignment';
}

function isPropertyDeclaration(n: AstNode): boolean {
  return n?.kind === 'PropertyDeclaration';
}

function isPropertySignature(n: AstNode): boolean {
  return n?.kind === 'PropertySignature';
}

function isRegularExpressionLiteral(n: AstNode): boolean {
  return n?.kind === 'RegularExpressionLiteral';
}

function isReturnStatement(n: AstNode): boolean {
  return n?.kind === 'ReturnStatement';
}

function isSetAccessor(n: AstNode): boolean {
  return n?.kind === 'SetAccessor';
}

function isShorthandPropertyAssignment(n: AstNode): boolean {
  return n?.kind === 'ShorthandPropertyAssignment';
}

function isSourceFile(n: AstNode): boolean {
  return n?.kind === 'SourceFile';
}

function isSpreadElement(n: AstNode): boolean {
  return n?.kind === 'SpreadElement';
}

function isTypeOfExpression(n: AstNode): boolean {
  return n?.kind === 'TypeOfExpression';
}

function isStringLiteral(n: AstNode): boolean {
  return n?.kind === 'StringLiteral';
}

function isSwitchStatement(n: AstNode): boolean {
  return n?.kind === 'SwitchStatement';
}

function isTemplateExpression(n: AstNode): boolean {
  return n?.kind === 'TemplateExpression';
}

function isThrowStatement(n: AstNode): boolean {
  return n?.kind === 'ThrowStatement';
}

function isTryStatement(n: AstNode): boolean {
  return n?.kind === 'TryStatement';
}

function isTypeAliasDeclaration(n: AstNode): boolean {
  return n?.kind === 'TypeAliasDeclaration';
}

function isTypeAssertionExpression(n: AstNode): boolean {
  return n?.kind === 'TypeAssertionExpression';
}

function isTypeReferenceNode(n: AstNode): boolean {
  return n?.kind === 'TypeReference';
}

function isUnionTypeNode(n: AstNode): boolean {
  return n?.kind === 'UnionType';
}

function isVariableDeclaration(n: AstNode): boolean {
  return n?.kind === 'VariableDeclaration';
}

function isVariableDeclarationList(n: AstNode): boolean {
  return n?.kind === 'VariableDeclarationList';
}

function isVariableStatement(n: AstNode): boolean {
  return n?.kind === 'VariableStatement';
}

function isWhileStatement(n: AstNode): boolean {
  return n?.kind === 'WhileStatement';
}

function isToken(_n: AstNode): boolean {
  return true;
}

const SyntaxKind: Record<string, string> = {
  BooleanKeyword: 'BooleanKeyword',
  ExclamationToken: 'ExclamationToken',
  ExtendsKeyword: 'ExtendsKeyword',
  FalseKeyword: 'FalseKeyword',
  MinusMinusToken: 'MinusMinusToken',
  MinusToken: 'MinusToken',
  NullKeyword: 'NullKeyword',
  NumberKeyword: 'NumberKeyword',
  PlusPlusToken: 'PlusPlusToken',
  PlusToken: 'PlusToken',
  QuestionDotToken: 'QuestionDotToken',
  QuestionQuestionToken: 'QuestionQuestionToken',
  StaticKeyword: 'StaticKeyword',
  StringKeyword: 'StringKeyword',
  SuperKeyword: 'SuperKeyword',
  ThisKeyword: 'ThisKeyword',
  TildeToken: 'TildeToken',
  TrueKeyword: 'TrueKeyword',
  UndefinedKeyword: 'UndefinedKeyword',
};

// Local replacement for nanoid's customAlphabet — must stay transpilable by
// TypeNative itself (no dependencies), only using mapped String methods.
const GO_SAFE_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Ids come from a Park–Miller generator reset for every transpilation, so the
// same source always gives the same Go (reproducible builds; the self-hosted
// compiler's output can be compared with the Node CLI's). The products stay
// below 2^46, exact in a float64 in both runtimes.
let goSafeIdSeed = 1;

function goSafeId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) {
    goSafeIdSeed = (goSafeIdSeed * 16807) % 2147483647;
    id += GO_SAFE_ALPHABET.charAt(goSafeIdSeed % GO_SAFE_ALPHABET.length);
  }
  return id;
}

let parseFunction: ParseFunction;
// Declarations of every parsed file, collected before visiting (functions are
// hoisted, so call sites may precede them) for contextual typing
const declaredFunctions = new Map<string, AstNode>();
// Top-level variable declarations by name (`typeof x` resolves to their type)
const declaredVariables = new Map<string, AstNode>();
const declaredInterfaces = new Map<string, AstNode>();
const declaredTypeAliases = new Map<string, AstNode>();
// Package-level declarations of the main file's top-level variables
const mainPackageVariables: string[] = [];
// True while emitting a separate Go file, whose top-level statements sit at package scope
let emittingModuleFile = false;
const importedPackages = new Set<string>();
// Side-effect `import 'go:time/tzdata'` packages, imported as `_`
const goSideEffectImports = new Set<string>();
let outsideNodes: AstNode[] = [];
const classNames = new Set<string>();
let promiseResolveName: string = '';
let promiseRejectName: string = '';
// Go keywords that cannot be used as identifiers
const dangerousNames = new Set([
  'main',
  // Go reserved keywords
  'break', 'case', 'chan', 'const', 'continue',
  'default', 'defer', 'else', 'fallthrough', 'for',
  'func', 'go', 'goto', 'if', 'import',
  'interface', 'map', 'package', 'range', 'return',
  'select', 'struct', 'switch', 'type', 'var',
]);
const renamedFunctions = new Map<string, string>();
// Go type of the receiver of the method call being emitted (for method handlers)
let currentReceiverGoType: string | undefined;
// Inside an object-literal method/getter, `this` refers to the instance variable
let thisOverrideName: string | undefined;
let thisOverrideFn: AstNode | undefined;
// Classes with accessor members: "Class.prop" in these sets means reads/writes
// of the property are Get_prop() / Set_prop(...) calls
const classGetterMethods = new Set<string>();
// Labels of non-loop statements being emitted: `break label` jumps past them
const blockLabels = new Set<string>();
const classSetterMethods = new Set<string>();
// Classes with a generator method named [Symbol.iterator]: className → yield type
const classIteratorMethods = new Map<string, string>();
// Every parsed class declaration by name (for inheritance lookup)
const declaredClasses = new Map<string, AstNode>();
// Class → parent class name (skip the Error special case)
const classParentNames = new Map<string, string>();
// Functions declared `async` (their calls at top level drain before exit)
const asyncFunctionNames = new Set<string>();
// Generator functions (declared with `function*`)
const generatorFunctionNames = new Set<string>();
// While emitting an async/generator function body: `return`/`yield` send here
let asyncChannelVar: string | undefined;
let asyncFunctionNode: AstNode | undefined;
// True while emitting the body of an async function (not a generator): its
// return settles the promise (ordered wake); a generator's sends stay raw
let asyncChannelIsAsync = false;
// Variables holding JS arrays: stored as *[]T so aliasing shares the slice
// header (push/splice through any alias are visible everywhere)
const referenceArrays = new Set<string>();

// An ExpressionWithTypeArguments in an extends / implements clause (a type)
function isHeritageType(node: AstNode): boolean {
  return node.parent?.kind === 'HeritageClause';
}

// Whether a null literal goes into the program's own data (an object's
// field, an array, an argument of its own function or class, a variable):
// there JS null stays distinct from undefined. Values handed to the runtime
// (callback results, Node / Go arguments) stay nil.
function storesJsNull(expr: AstNode): boolean {
  let node = expr;
  while (node.parent && isParenthesizedExpression(node.parent)) node = node.parent;
  const parent = node.parent;
  if (!parent) return false;
  if (isPropertyAssignment(parent) || isArrayLiteralExpression(parent) || isVariableDeclaration(parent) || isPropertyDeclaration(parent)) return true;
  if (isBinaryExpression(parent) && parent.right === node && parent.operatorToken.kind === 'EqualsToken') return true;
  if (isNewExpression(parent) && isIdentifier(parent.expression)) return classNames.has(parent.expression.text);
  if (isCallExpression(parent) && (parent.arguments ?? []).includes(node)) {
    const callee = parent.expression;
    if (isIdentifier(callee)) return declaredFunctions.has(callee.text);
    if (isPropertyAccessExpression(callee)) {
      if (['set', 'add', 'push', 'unshift'].includes(callee.name.text)) return true;
      return !!classNameOfGoType(inferExpressionType(callee.expression) ?? '');
    }
  }
  return false;
}

// Calls whose result may be missing (null / undefined): a regex match, a Map
// lookup, an array search or removal
const MAYBE_MISSING_METHODS = new Set(['exec', 'match', 'get', 'find', 'findLast', 'at', 'pop', 'shift']);

// Whether the array variable `ref` names may hold null: declared nullable, or
// given a regex match (null when nothing matches) or null
const nullableArrayCache = new Map<AstNode, Set<string>>();
function mayHoldNullArray(ref: AstNode): boolean {
  let scope = ref.parent;
  while (scope && !FUNCTION_LIKE_KINDS.has(scope.kind) && !isSourceFile(scope)) scope = scope.parent;
  if (!scope) return false;
  let names = nullableArrayCache.get(scope);
  if (!names) {
    const found = new Set<string>();
    const nullish = (e: AstNode | undefined): boolean => {
      if (!e) return false;
      const u = unwrapParentheses(e);
      if (isNilLiteral(u)) return true;
      return isCallExpression(u) && isPropertyAccessExpression(u.expression) && MAYBE_MISSING_METHODS.has(u.expression.name.text);
    };
    const walk = (n: AstNode): void => {
      if (n.kind === 'VariableDeclaration' && isIdentifier(n.name)) {
        const t = n.type;
        const nullableType = !!t && isUnionTypeNode(t) && (t.types ?? []).some((m: AstNode) => m.kind === 'NullKeyword' || m.kind === 'UndefinedKeyword' || (isLiteralTypeNode(m) && m.literal?.kind === 'NullKeyword'));
        if (nullableType || nullish(n.initializer)) found.add(n.name.text);
      }
      if (isBinaryExpression(n) && n.operatorToken.kind === 'EqualsToken' && isIdentifier(n.left) && nullish(n.right)) found.add(n.left.text);
      for (const child of childNodes(n)) if (!FUNCTION_LIKE_KINDS.has(child.kind)) walk(child);
    };
    walk(scope.body ?? scope);
    names = found;
    nullableArrayCache.set(scope, names);
  }
  return names.has(ref.text);
}

// Registers a variable's Go type; array-typed variables become *[]T references
// (dynamic []interface{} arrays stay plain: they flow through runtime helpers)
function setVarGoType(name: string, goType: string | undefined): void {
  if (!name) return;
  if (goType && goType.startsWith('[]') && goType !== '[]interface{}' && goType !== '[]byte') {
    variableGoTypes.set(name, `*${goType}`);
    referenceArrays.add(name);
    return;
  }
  referenceArrays.delete(name);
  if (goType) variableGoTypes.set(name, goType);
  else variableGoTypes.delete(name);
}

// Struct field / member names: Go keywords get a trailing underscore
function goFieldName(name: string): string {
  return name !== 'main' && dangerousNames.has(name) ? `${name}_` : name;
}

function isFieldNameIdentifier(node: AstNode): boolean {
  const parent = node.parent;
  if (!parent || parent.name !== node) return false;
  return (
    isPropertyAccessExpression(parent) ||
    isPropertyAssignment(parent) ||
    isPropertySignature(parent) ||
    isPropertyDeclaration(parent) ||
    // Method names live in the receiver's scope, like fields: `copy()` shadows nothing
    isMethodDeclaration(parent) ||
    isMethodSignature(parent)
  );
}
const variableTypes = new Map<string, string>();
const variableGoTypes = new Map<string, string>();
const variableClassNames = new Map<string, string>();
const classPropertyTypes = new Map<string, Map<string, string>>();
const classMethodReturnTypes = new Map<string, Map<string, string>>();
const interfacePropertyTypes = new Map<string, Map<string, string>>();
const typeAliases = new Map<string, AstNode>();
const enumNames = new Set<string>();
const enumBaseTypes = new Map<string, 'string' | 'float64' | 'interface{}'>();
// Member types of heterogeneous enums ("E.A" → float64 / string)
const enumMemberGoTypes = new Map<string, string>();
// Maps local TS name → Go qualified name (e.g. 'Println' → 'fmt.Println', 'myFmt' → 'fmt')
const importAliases = new Map<string, string>();
// Tracks static methods per class: Set of "ClassName.methodName" strings
const classStaticMethods = new Set<string>();
// Tracks static properties per class: Set of "ClassName.propName" strings
const classStaticProps = new Set<string>();
// Static getters (`static get tagName()`): reads call C_Get_tagName()
const classStaticGetters = new Set<string>();
// The Go parameter list of each class's NewC constructor
const classConstructorSignatures = new Map<string, string>();
// Set when the program uses classes as values (TnClass descriptors are emitted)
let classValuesUsed = false;
// Classes whose Go types were emitted
const emittedClasses = new Set<string>();

// A class as a value: its TnClass descriptor
function classValue(name: string): string {
  classValuesUsed = true;
  useHelper('classes');
  return `TnClass_${getSafeName(name)}`;
}

// The TnClass descriptor of every emitted class: name, Go type, parent,
// constructor (arguments converted as for dynamic calls) and static members
function emitClassDescriptors(): string {
  const out: string[] = [];
  for (const name of [...emittedClasses].sort()) {
    const declaration = declaredClasses.get(name);
    const goName = getSafeName(name);
    const parent = classParentNames.get(name);
    const signature = classConstructorSignatures.get(name);
    let ctor = 'nil';
    if (signature !== undefined) {
      const paramTypes = signature ? goFuncParamTypes(`func(${signature})`) : [];
      ctor = `func(__args ...interface{}) interface{} { return New${goName}(${paramTypes.map((t, i) => dispatchArgument(t, i)).join(', ')}) }`;
    }
    const statics: string[] = [];
    for (const member of declaration?.members ?? []) {
      if (!(member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) continue;
      if (!isIdentifier(member.name) && !isStringLiteral(member.name)) continue;
      const key = member.name.text;
      const field = goFieldName(key);
      if (isPropertyDeclaration(member)) statics.push(`${toGoStringLiteral(key)}: func() interface{} { return ${goName}_${field} }`);
      else if (isMethodDeclaration(member) && member.body) statics.push(`${toGoStringLiteral(key)}: func() interface{} { return ${goName}_${field} }`);
      else if (isGetAccessor(member)) statics.push(`${toGoStringLiteral(key)}: func() interface{} { return ${goName}_Get_${field}() }`);
    }
    // Seq.from(v, fn) on an Array subclass (looked up by type: the
    // descriptor can't name itself in its own initializer)
    if (isArraySubclass(name)) {
      statics.push(`"from": func() interface{} { return func(__src interface{}, __fn ...interface{}) interface{} { return TnArraySubclassFrom(tnClassesByType[reflect.TypeOf((*${goName})(nil))], __src, __fn...) } }`);
    }
    const parentRef = parent && emittedClasses.has(parent) ? `TnClass_${getSafeName(parent)}` : 'nil';
    out.push(
      `var TnClass_${goName} = tnRegisterClass(&TnClass{Name: ${toGoStringLiteral(name)}, Type: reflect.TypeOf((*${goName})(nil)), Parent: ${parentRef}, New: ${ctor}, statics: map[string]func() interface{}{${statics.join(', ')}}})`
    );
  }
  return out.join('\n');
}

// A class name used as a value (not new C / C.x / instanceof C / extends C)
function isClassValueReference(node: AstNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (isNewExpression(parent) && parent.expression === node) return false;
  if (isPropertyAccessExpression(parent) && parent.expression === node) return false;
  if (isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (isBinaryExpression(parent) && parent.operatorToken.kind === 'InstanceOfKeyword' && parent.right === node) return false;
  // (f<T> as a value is f; in extends / implements it is a type)
  if (parent.kind === 'ExpressionWithTypeArguments') return !isHeritageType(parent);
  if (parent.kind === 'HeritageClause') return false;
  if (isClassDeclaration(parent) || parent.kind === 'ClassExpression') return parent.name !== node;
  if (parent.kind === 'TypeQuery' || parent.kind === 'TypeReference' || parent.kind === 'QualifiedName') return false;
  if (['ImportSpecifier', 'ExportSpecifier', 'ImportClause', 'NamespaceImport', 'ExportAssignment'].includes(parent.kind)) return false;
  if (isCallExpression(parent) && parent.expression === node) return false;
  if ((isPropertyAssignment(parent) || isPropertyDeclaration(parent) || isMethodDeclaration(parent)) && parent.name === node) return false;
  if (parent.kind === 'TypeOfExpression') return false;
  return true;
}

// Whether a class used as a value goes where a constructor function is
// expected (a construct signature, (…) => T): its NewC function then
function expectsConstructorFunction(node: AstNode): boolean {
  const contextual = resolveTypeNode(getContextualTypeNode(node));
  if (!contextual) {
    // an argument of a function value whose Go parameter is a func type
    const call = node.parent;
    if (!isCallExpression(call) || call.expression === node) return false;
    const calleeType = inferExpressionType(call.expression);
    if (!calleeType?.startsWith('func(')) return false;
    const paramType = goFuncParamTypes(calleeType)[(call.arguments ?? []).indexOf(node)];
    return !!paramType && paramType.startsWith('func(');
  }
  if (isFunctionTypeNode(contextual) || contextual.kind === 'ConstructorType') return true;
  let members: AstNode[] = contextual.kind === 'TypeLiteral' ? (contextual.members ?? []) : [];
  if (isTypeReferenceNode(contextual) && isIdentifier(contextual.typeName)) {
    members = declaredInterfaces.get(contextual.typeName.text)?.members ?? [];
  }
  return members.length > 0 && members.every((m: AstNode) => m.kind === 'ConstructSignature' || m.kind === 'CallSignature');
}
// Callback for resolving import specifiers to source code.
// specifier: the raw import string (relative path or package name)
// fromDir: directory of the file containing the import (null = main file's dir)
// Returns the file content and its directory (for resolving that file's own imports)
let fileResolver: ((specifier: string, fromDir: string | null) => ResolvedSourceFile | null) | null = null;
// Resolves a go:embed path from a file's directory to a pattern relative to
// the entry file's directory; null when missing or outside it
let embedResolver: ((pattern: string, fromDir: string | null) => string | null) | null = null;
// The embed patterns the program uses (the CLI copies them next to the Go sources)
const embedPatterns = new Set<string>();
// Directory of the file currently being processed (null = main entry file)
let currentFileDir: string | null = null;
// Name of the file currently being parsed, as diagnostics and line directives show it
let currentFileName = '';
// Names of the parsed source files, indexed by the fileIndex stamped on each
// SourceFile node (line markers and diagnostics refer to them)
const sourceFileNames: string[] = [];
// Errors found while transpiling (unsupported syntax, unresolved imports)
const diagnostics: TranspileDiagnostic[] = [];
// While a module file's top-level statement is visited: its variables'
// assignments (run by the module's init function, in order)
let moduleInitAssignments: string[] | null = null;
// The modules' init functions, in JS evaluation order (imports first)
const moduleInitOrder: string[] = [];
// Tracks already-included files by a stable key to prevent duplicates/cycles
const includedLocalImports = new Set<string>();
// Collects Go source files generated from local TS imports (filename → content)
let localImportFiles: Map<string, string> = new Map();
// Lower-cased Go file names handed out so far: a file's name is reserved
// before its imports are transpiled, and Schema.go / schema.go would collide
// on case-insensitive file systems
const reservedGoFileNames = new Set<string>();
// Second entry points (new Worker('./w.ts') / fork('./c.ts')): file key → id,
// and the files still to compile
const entryPointIds = new Map<string, string>();
let pendingEntryPoints: { id: string; file: ResolvedSourceFile }[] = [];
let mainSourcePath = '';
// Token kind names → operator source text (JSON AST tokens carry kind names)
const OPERATOR_TEXT = {
    EqualsEqualsEqualsToken: '===',
    ExclamationEqualsEqualsToken: '!==',
    EqualsEqualsToken: '==',
    ExclamationEqualsToken: '!=',
    LessThanToken: '<',
    LessThanEqualsToken: '<=',
    GreaterThanToken: '>',
    GreaterThanEqualsToken: '>=',
    PlusToken: '+',
    MinusToken: '-',
    AsteriskToken: '*',
    SlashToken: '/',
    PercentToken: '%',
    AsteriskAsteriskToken: '**',
    AmpersandToken: '&',
    BarToken: '|',
    CaretToken: '^',
    LessThanLessThanToken: '<<',
    GreaterThanGreaterThanToken: '>>',
    AmpersandAmpersandToken: '&&',
    BarBarToken: '||',
    EqualsToken: '=',
    PlusEqualsToken: '+=',
    MinusEqualsToken: '-=',
    AsteriskEqualsToken: '*=',
    SlashEqualsToken: '/=',
    PercentEqualsToken: '%=',
    CommaToken: ',',
    QuestionQuestionToken: '??'
}

function operatorTokenText(token) {
    return OPERATOR_TEXT[token?.kind] ?? token?.kind ?? '';
}

function defaultParseFunction(_code: string, _tsx: boolean): AstNode {
    throw new Error('transpileToNative: no parse function injected (options.parse)');
}

// Parses via the injected parser and links each node to its parent: the JSON
// AST carries no parent pointers, but the transpiler walks up via node.parent.
function parseSource(code: string): AstNode {
  return registerSourceFile(parseAndLower(code));
}

// Parses a file and applies the AST lowerings (module forms, namespaces, …)
function parseAndLower(code: string): AstNode {
  const sourceFile = parseFunction(code, currentFileIsTsx);
  stripThisParameters(sourceFile);
  lowerIndexSignatures(sourceFile);
  lowerAmbientDeclarations(sourceFile);
  lowerModuleForms(sourceFile);
  lowerDisposeSymbols(sourceFile);
  lowerNamespaces(sourceFile);
  lowerNestedDestructuring(sourceFile);
  lowerPrototypeCalls(sourceFile);
  lowerConstructorCalls(sourceFile);
  lowerForOfAssignments(sourceFile);
  lowerExpandoFunctions(sourceFile);
  lowerClassExpressions(sourceFile);
  lowerWeakCollections(sourceFile);
  lowerGlobalThis(sourceFile);
  return sourceFile;
}

// Links parents, numbers the file for line markers and records its top-level
// functions, interfaces and type aliases
function registerSourceFile(sourceFile: AstNode): AstNode {
  linkParents(sourceFile, undefined);
  sourceFile.fileIndex = sourceFileNames.length;
  sourceFileNames.push(currentFileName);
  for (const stmt of sourceFile.statements ?? []) {
    if (isVariableStatement(stmt)) {
      for (const d of stmt.declarationList?.declarations ?? []) {
        if (!isIdentifier(d.name)) continue;
        declaredVariables.set(d.name.text, d);
        // (see the variable declaration emitter)
        if (isRegExpTypeNode(d.type) && assignsStatefulRegex(d)) d.type = { kind: 'TnGoType', goType: '*TnRegex', parent: d };
      }
    }
    if (!stmt.name || !isIdentifier(stmt.name)) continue;
    if (isFunctionDeclaration(stmt)) {
      declaredFunctions.set(stmt.name.text, stmt);
      if ((stmt.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) {
        asyncFunctionNames.add(stmt.name.text);
      }
      if (stmt.asteriskToken) generatorFunctionNames.add(stmt.name.text);
    } else if (isInterfaceDeclaration(stmt)) declaredInterfaces.set(stmt.name.text, stmt);
    else if (isTypeAliasDeclaration(stmt)) declaredTypeAliases.set(stmt.name.text, stmt.type);
  }
  return sourceFile;
}

// Index (into sourceFileNames) of the file a node was parsed from, or -1
function sourceFileIndexOf(node: AstNode): number {
  let current = node;
  while (current && current.kind !== 'SourceFile') current = current.parent;
  return current && typeof current.fileIndex === 'number' ? current.fileIndex : -1;
}

// Line markers: generated statements and declarations start with
// /*tn@<file>:<line>:<column>*/, which applyLineDirectives turns into Go
// /*line file.ts:line:column*/ directives once the code is complete, so Go
// compile errors and stack traces point at the TypeScript source. The marker
// carries no file name until then: names like strings.ts would otherwise look
// like uses of a Go package to the import pruning.
// A line holding only this sentinel becomes //line <go file>:<next line>,
// which returns the following generated code (helpers) to its real Go position
const LINE_RESET = '/*tn@' + 'reset*/';
// First line of every generated Go file (Go's convention for generated code;
// the CLI only deletes stale .go files that start with it)
export const GENERATED_HEADER = '// Code generated by TypeNative. DO NOT EDIT.';

function lineMarker(node: AstNode): string {
  if (!node?.line) return '';
  const fileIndex = sourceFileIndexOf(node);
  if (fileIndex < 0) return '';
  return `/*tn@${fileIndex}:${node.line}:${node.column}*/`;
}

// Prefixes generated code with its node's line marker (after any leading
// whitespace, so the position applies to the code's first token)
function withLineMarker(node: AstNode, code: string): string {
  // (a //go: directive must start its line)
  if (!code.trim() || code.trimStart().startsWith('//go:')) return code;
  const marker = lineMarker(node);
  if (!marker) return code;
  const indent = code.length - code.trimStart().length;
  return code.slice(0, indent) + marker + code.slice(indent);
}

// Replaces line markers with Go line directives and resets with //line
// directives back to the generated file (goFile, as Go should report it).
// One statement often spans several Go lines (assert → if + panic): every
// unmarked line after a marker repeats its directive, so those lines report
// the statement's line instead of counting on from it.
function applyLineDirectives(code: string, goFile: string): string {
  const lines = code.split('\n');
  let pin = '';
  // Inside a multi-line raw string or block comment, where nothing may be inserted
  let state = '';
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index];
    if (text === LINE_RESET) {
      lines[index] = `//line ${goFile}:${index + 2}`;
      pin = '';
      continue;
    }
    const startState = state;
    if (text.includes('`') || text.includes('/*') || text.includes('*/')) state = goLineEndState(text, state);
    if (text.includes('/*tn@')) {
      // (regex literals inline: a /g regex held in a variable compiles to a
      // replace-first in the self-hosted compiler). Later lines repeat the
      // line's last directive; text like "/*tn@" in a string matches nothing
      lines[index] = text.replace(
        /\/\*tn@(\d+):(\d+):(\d+)\*\//g,
        (_match: string, file: string, line: string, column: string) => {
          pin = `/*line ${sourceFileNames[Number(file)]}:${line}:${column}*/`;
          return pin;
        }
      );
    } else if (pin && startState === '' && text.trim() && !text.trimStart().startsWith('//go:')) {
      const indent = text.length - text.trimStart().length;
      lines[index] = text.slice(0, indent) + pin + text.slice(indent);
    }
  }
  return lines.join('\n');
}

// The multi-line context after a Go line that starts in state: '' (code),
// '`' (inside a raw string) or '*' (inside a block comment)
function goLineEndState(line: string, state: string): string {
  let rest = line;
  if (state !== '') {
    const close = state === '`' ? '`' : '*/';
    const end = rest.indexOf(close);
    if (end < 0) return state;
    rest = rest.slice(end + close.length);
  }
  // Go literals and comments that end on this line, matched leftmost-first
  // like Go's scanner (a quote inside a raw string is not a string): what's
  // left after them is an unclosed raw string or comment
  rest = rest.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|\/\*.*?\*\/|\/\/.*/g, ' ');
  const rawString = rest.indexOf('`');
  const comment = rest.indexOf('/*');
  if (rawString < 0 && comment < 0) return '';
  if (comment < 0 || (rawString >= 0 && rawString < comment)) return '`';
  return '*';
}

// Records a transpile error at the node (or its nearest positioned ancestor)
function reportError(node: AstNode, message: string): void {
  let positioned = node;
  while (positioned && !positioned.line) positioned = positioned.parent;
  const fileIndex = sourceFileIndexOf(node);
  const line: number = positioned ? positioned.line : 0;
  const column: number = positioned ? positioned.column : 0;
  diagnostics.push({
    file: fileIndex >= 0 ? sourceFileNames[fileIndex] : currentFileName,
    line: line,
    column: column,
    message: message
  });
}

// `this: T` parameters only type `this`; they are not real parameters
function stripThisParameters(node: AstNode): void {
  if (Array.isArray(node.parameters)) {
    node.parameters = node.parameters.filter((p: AstNode) => !(isIdentifier(p.name) && p.name.text === 'this'));
  }
  for (const child of childNodes(node)) stripThisParameters(child);
}

// { [k: K]: V } and { [K in string]: V } → Record<K, V>; an interface that is
// only an index signature becomes an alias of that Record
function lowerIndexSignatures(node: AstNode): void {
  for (const child of childNodes(node)) lowerIndexSignatures(child);
  const keyKind = node.typeParameter?.constraint?.kind;
  if (node.kind === 'MappedType' && (keyKind === 'StringKeyword' || keyKind === 'NumberKeyword')) {
    const keyType: AstNode = { kind: keyKind };
    makeRecordReference(node, keyType, node.type);
    return;
  }
  const members: AstNode[] = node.members ?? [];
  // { (a: A): R } / { new (a: A): C } → (a: A) => R / (a: A) => C
  const isSignature = (m: AstNode) => m.kind === 'CallSignature' || m.kind === 'ConstructSignature';
  if (members.length === 1 && isSignature(members[0]) && (node.kind === 'TypeLiteral' || node.kind === 'InterfaceDeclaration')) {
    const fnType: AstNode = { kind: 'FunctionType', parameters: members[0].parameters ?? [], type: members[0].type };
    if (node.kind === 'TypeLiteral') {
      for (const key of Object.keys(node)) if (key !== 'parent') delete node[key];
      node.kind = 'FunctionType';
      node.parameters = fnType.parameters;
      node.type = fnType.type;
    } else {
      delete node.members;
      delete node.heritageClauses;
      node.kind = 'TypeAliasDeclaration';
      node.type = fnType;
    }
    return;
  }
  if (members.length !== 1 || members[0].kind !== 'IndexSignature') return;
  const signature = members[0];
  if (node.kind === 'TypeLiteral') makeRecordReference(node, signature.parameters[0].type, signature.type);
  if (node.kind === 'InterfaceDeclaration') {
    const record: AstNode = { kind: 'TypeLiteral' };
    makeRecordReference(record, signature.parameters[0].type, signature.type);
    delete node.members;
    delete node.heritageClauses;
    node.kind = 'TypeAliasDeclaration';
    node.type = record;
  }
}

// Turns node into the type reference Record<keyType, valueType>
function makeRecordReference(node: AstNode, keyType: AstNode, valueType: AstNode): void {
  for (const key of Object.keys(node)) if (key !== 'parent') delete node[key];
  const typeName: AstNode = { kind: 'Identifier', text: 'Record' };
  node.kind = 'TypeReference';
  node.typeName = typeName;
  node.typeArguments = [keyType, valueType];
}

function lowerAmbientDeclarations(node: AstNode): void {
  for (const child of childNodes(node)) lowerAmbientDeclarations(child);
  if (!Array.isArray(node.statements)) return;
  const isDeclare = (m: AstNode) => m.kind === 'DeclareKeyword';
  node.statements = node.statements.filter((statement: AstNode) => {
    if (statement.kind === 'VariableStatement' && statement.modifiers) {
      // declare / export on variables don't change the emitted Go (an
      // ambient variable names a global: the module linker keeps its name)
      if (statement.modifiers.some(isDeclare)) statement.ambient = true;
      if (statement.modifiers.some((m: AstNode) => m.kind === 'ExportKeyword')) statement.exported = true;
      statement.modifiers = statement.modifiers.filter((m: AstNode) => !isDeclare(m) && m.kind !== 'ExportKeyword');
      return true;
    }
    return !(statement.modifiers ?? []).some(isDeclare);
  });
  mergeDeclarations(node);
}

// Declaration merging within one scope: a repeated interface or enum adds its
// members to the first declaration, and an interface named like a class adds
// its properties to the class as fields
function mergeDeclarations(node: AstNode): void {
  const first = new Map<string, AstNode>();
  for (const statement of node.statements) {
    if (!statement.name?.text) continue;
    const kind = statement.kind;
    const key = `${kind}:${statement.name.text}`;
    const mergeable = kind === 'InterfaceDeclaration' || kind === 'EnumDeclaration';
    if (kind === 'ClassDeclaration' || (mergeable && !first.has(key))) first.set(key, statement);
  }
  node.statements = node.statements.filter((statement: AstNode) => {
    const kind = statement.kind;
    if ((kind !== 'InterfaceDeclaration' && kind !== 'EnumDeclaration') || !statement.name?.text) return true;
    const name = statement.name.text;
    const cls = kind === 'InterfaceDeclaration' ? first.get(`ClassDeclaration:${name}`) : undefined;
    if (cls) {
      const declared = new Set<string>();
      for (const m of cls.members ?? []) {
        if (m.name?.text) declared.add(m.name.text);
      }
      const classMembers: AstNode[] = cls.members ?? [];
      for (const m of statement.members ?? []) {
        if (m.kind !== 'PropertySignature' || !m.name?.text || declared.has(m.name.text)) continue;
        classMembers.push({ ...m, kind: 'PropertyDeclaration', parent: cls });
      }
      cls.members = classMembers;
      return false;
    }
    const target = first.get(`${kind}:${name}`);
    if (!target || target === statement) return true;
    const members: AstNode[] = target.members ?? [];
    for (const member of statement.members ?? []) {
      member.parent = target;
      members.push(member);
    }
    target.members = members;
    if (statement.heritageClauses) {
      const clauses: AstNode[] = target.heritageClauses ?? [];
      for (const clause of statement.heritageClauses) clauses.push(clause);
      target.heritageClauses = clauses;
    }
    return false;
  });
}

// Every module form becomes an import declaration (all files share one Go package):
//   export { a, b as c } from './m'  → import { a, b as c } from './m'
//   export * from './m'               → import './m'
//   import x = require('./m')         → import * as x from './m'
//   const x = await import('./m')     → import * as x from './m'
function lowerModuleForms(node: AstNode): void {
  for (const child of childNodes(node)) lowerModuleForms(child);
  if (!Array.isArray(node.statements)) return;
  node.statements = node.statements.map((statement: AstNode): AstNode => {
    const namespaceImport = (name: AstNode, specifier: AstNode): AstNode => ({
      kind: 'ImportDeclaration',
      moduleSpecifier: specifier,
      importClause: { kind: 'ImportClause', namedBindings: { kind: 'NamespaceImport', name } }
    });
    if (statement.kind === 'ExportDeclaration' && statement.moduleSpecifier && !statement.isTypeOnly) {
      const clause = statement.exportClause;
      // (reexport: the module linker reads these as exports too)
      if (clause?.kind === 'NamespaceExport') {
        const reexported = namespaceImport(clause.name, statement.moduleSpecifier);
        reexported.reexport = true;
        return reexported;
      }
      const importClause: AstNode | undefined = clause
        ? { kind: 'ImportClause', namedBindings: { kind: 'NamedImports', elements: clause.elements ?? [] } }
        : undefined;
      return { kind: 'ImportDeclaration', moduleSpecifier: statement.moduleSpecifier, importClause, reexport: true };
    }
    if (statement.kind === 'ImportEqualsDeclaration' && statement.moduleReference?.kind === 'ExternalModuleReference') {
      return namespaceImport(statement.name, statement.moduleReference.expression);
    }
    const declarations: AstNode[] = statement.kind === 'VariableStatement' ? (statement.declarationList?.declarations ?? []) : [];
    const init = declarations.length === 1 ? declarations[0].initializer : undefined;
    const call = init?.kind === 'AwaitExpression' ? init.expression : undefined;
    if (call?.kind === 'CallExpression' && call.expression?.kind === 'ImportKeyword' && isStringLiteral(call.arguments?.[0]) && isIdentifier(declarations[0].name)) {
      return namespaceImport(declarations[0].name, call.arguments[0]);
    }
    return statement;
  });
}

// Names whose identifier is a property / member name, not a reference
const MEMBER_NAME_PARENTS = new Set([
  'PropertyAccessExpression', 'PropertyAssignment', 'PropertySignature', 'MethodSignature',
  'PropertyDeclaration', 'MethodDeclaration', 'GetAccessor', 'SetAccessor', 'EnumMember'
]);

// Top-level names a statement list declares
function getDeclaredNames(statements: AstNode[]): string[] {
  const names: string[] = [];
  for (const statement of statements) {
    if (statement.kind === 'VariableStatement') {
      for (const d of statement.declarationList?.declarations ?? []) if (isIdentifier(d.name)) names.push(d.name.text);
    } else if (isIdentifier(statement.name)) {
      names.push(statement.name.text);
    }
  }
  return names;
}

// Renames references to the given names (not property/member names) to prefix_name
function renameIdentifiers(node: AstNode, names: Set<string>, prefix: string): void {
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = node[key];
    const children: AstNode[] = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
    for (const child of children) {
      if (!child || typeof child.kind !== 'string') continue;
      if (isIdentifier(child) && names.has(child.text)) {
        if (key === 'name' && MEMBER_NAME_PARENTS.has(node.kind)) continue;
        if (key === 'right' && node.kind === 'QualifiedName') continue;
        if (node.kind === 'ShorthandPropertyAssignment') {
          // { unit } keeps its key: { unit: N_unit }
          node.kind = 'PropertyAssignment';
          const initializer: AstNode = { kind: 'Identifier', text: `${prefix}_${child.text}` };
          node.initializer = initializer;
          continue;
        }
        child.text = `${prefix}_${child.text}`;
      } else {
        renameIdentifiers(child, names, prefix);
      }
    }
  }
}

// Flattens the namespaces in a statement list; returns the namespace names found
// (nested ones as Outer_Inner)
function flattenNamespaces(statements: AstNode[]): { statements: AstNode[]; namespaces: string[] } {
  const out: AstNode[] = [];
  const namespaces: string[] = [];
  for (const statement of statements) {
    const isDeclare = (statement.modifiers ?? []).some((m: AstNode) => m.kind === 'DeclareKeyword');
    if (statement.kind !== 'ModuleDeclaration' || !isIdentifier(statement.name) || isDeclare) {
      out.push(statement);
      continue;
    }
    const prefix = statement.name.text;
    // namespace A.B { } nests a ModuleDeclaration as the body
    const body: AstNode[] =
      statement.body?.kind === 'ModuleDeclaration' ? [statement.body] : (statement.body?.statements ?? []);
    const inner = flattenNamespaces(body);
    rewriteNamespaceAccess(inner.statements, new Set(inner.namespaces));
    const names = new Set([...getDeclaredNames(inner.statements), ...inner.namespaces]);
    for (const child of inner.statements) {
      const wrapper: AstNode = { kind: 'Block', statements: [child] };
      renameIdentifiers(wrapper, names, prefix);
    }
    namespaces.push(prefix);
    for (const n of inner.namespaces) namespaces.push(`${prefix}_${n}`);
    out.push(...inner.statements);
  }
  return { statements: out, namespaces };
}

// N.x / N.Inner.x (expressions) and N.T (types) → the flattened identifiers
function rewriteNamespaceAccess(nodes: AstNode[], namespaces: Set<string>): void {
  const rewrite = (node: AstNode): AstNode => {
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = node[key];
      if (Array.isArray(value)) node[key] = value.map((v) => (v && typeof v.kind === 'string' ? rewrite(v) : v));
      else if (value && typeof value.kind === 'string') node[key] = rewrite(value);
    }
    const left = node.kind === 'PropertyAccessExpression' ? node.expression : node.kind === 'QualifiedName' ? node.left : undefined;
    const right = node.kind === 'PropertyAccessExpression' ? node.name : node.kind === 'QualifiedName' ? node.right : undefined;
    if (isIdentifier(left) && namespaces.has(left.text) && isIdentifier(right)) {
      const flattened: AstNode = { kind: 'Identifier', text: `${left.text}_${right.text}` };
      return flattened;
    }
    return node;
  };
  for (let i = 0; i < nodes.length; i++) nodes[i] = rewrite(nodes[i]);
}

function lowerNamespaces(sourceFile: AstNode): void {
  const flat = flattenNamespaces(sourceFile.statements ?? []);
  sourceFile.statements = flat.statements;
  if (flat.namespaces.length > 0) rewriteNamespaceAccess(sourceFile.statements, new Set(flat.namespaces));
}

// Destructuring the declaration code handles flat patterns only; nested
// ones are split into steps through temporaries:
//   const { a, o: { b } } = x    → const { a, o: __d1 } = x, { b } = __d1
//   for (const { k } of xs) …    → for (const __d2 of xs) { const { k } = __d2; … }
//   function f({ o: { b } }) {…} → function f(__d3) { const { o: { b } } = __d3; … }
let destructureTempSeed = 0;

function destructureTemp(at: AstNode): AstNode {
  destructureTempSeed++;
  return { kind: 'Identifier', text: `__d${destructureTempSeed}`, line: at.line, column: at.column };
}

function isBindingPatternNode(n: AstNode): boolean {
  return isObjectBindingPattern(n) || isArrayBindingPattern(n);
}

function hasNestedPattern(pattern: AstNode): boolean {
  return (pattern.elements ?? []).some((el: AstNode) => el.kind === 'BindingElement' && isBindingPatternNode(el.name));
}

// A declaration whose pattern nests patterns → itself (with temporaries) and
// the declarations that destructure them
function flattenDeclaration(declaration: AstNode): AstNode[] {
  if (!isBindingPatternNode(declaration.name)) return [declaration];
  const extra: AstNode[] = [];
  for (const el of declaration.name.elements ?? []) {
    if (el.kind !== 'BindingElement' || !isBindingPatternNode(el.name)) continue;
    const temp = destructureTemp(el);
    const nested: AstNode = {
      kind: 'VariableDeclaration',
      name: el.name,
      initializer: { kind: 'Identifier', text: temp.text, line: el.line, column: el.column },
      line: el.line,
      column: el.column
    };
    el.name = temp;
    for (const d of flattenDeclaration(nested)) extra.push(d);
  }
  return [declaration, ...extra];
}

function destructuringStatement(pattern: AstNode, value: AstNode, at: AstNode): AstNode {
  const declaration: AstNode = { kind: 'VariableDeclaration', name: pattern, initializer: value, line: at.line, column: at.column };
  return {
    kind: 'VariableStatement',
    declarationList: { kind: 'VariableDeclarationList', declarationKind: 'const', declarations: flattenDeclaration(declaration) },
    line: at.line,
    column: at.column
  };
}

function lowerNestedDestructuring(node: AstNode): void {
  for (const child of childNodes(node)) lowerNestedDestructuring(child);
  if (node.kind === 'VariableDeclarationList') {
    const declarations: AstNode[] = [];
    for (const d of node.declarations ?? []) for (const flat of flattenDeclaration(d)) declarations.push(flat);
    node.declarations = declarations;
  }
  if ((node.kind === 'ForOfStatement' || node.kind === 'ForInStatement') && node.initializer?.kind === 'VariableDeclarationList') {
    const declaration = (node.initializer.declarations ?? [])[0];
    if (declaration && isObjectBindingPattern(declaration.name)) {
      const temp = destructureTemp(declaration);
      const pattern = declaration.name;
      declaration.name = temp;
      const body: AstNode[] = isBlock(node.statement) ? (node.statement.statements ?? []) : [node.statement];
      node.statement = {
        kind: 'Block',
        statements: [destructuringStatement(pattern, { kind: 'Identifier', text: temp.text }, declaration), ...body],
        line: node.statement.line,
        column: node.statement.column
      };
    }
  }
  if (FUNCTION_LIKE_KINDS.has(node.kind) && node.body) {
    const prologue: AstNode[] = [];
    for (const param of node.parameters ?? []) {
      if (!isBindingPatternNode(param.name) || !hasNestedPattern(param.name)) continue;
      const temp = destructureTemp(param);
      prologue.push(destructuringStatement(param.name, { kind: 'Identifier', text: temp.text }, param));
      param.name = temp;
    }
    if (prologue.length > 0) {
      const statements: AstNode[] = isBlock(node.body)
        ? (node.body.statements ?? [])
        : [{ kind: 'ReturnStatement', expression: node.body, line: node.body.line, column: node.body.column }];
      node.body = { kind: 'Block', statements: [...prologue, ...statements], line: node.body.line, column: node.body.column };
    }
  }
}

// Built-ins that construct when called without `new`: RegExp(…), Error(…)
const CONSTRUCTING_BUILTINS = new Set(['RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError', 'Array']);

// for (x of xs) / for (obj.k of xs) with an existing target: a fresh loop
// variable assigned to it, so the target keeps the last element after the loop
//   for (const __fo of xs) { x = __fo; … }
let forOfTargetCount = 0;
function lowerForOfAssignments(node: AstNode): void {
  for (const child of childNodes(node)) lowerForOfAssignments(child);
  if (node.kind !== 'ForOfStatement' || !node.initializer || isVariableDeclarationList(node.initializer)) return;
  const target = node.initializer;
  if (!isIdentifier(target) && !isPropertyAccessExpression(target) && !isElementAccessExpression(target)) return;
  const at = { line: node.line, column: node.column };
  const name = `__fo${++forOfTargetCount}`;
  const loopVar: AstNode = { kind: 'Identifier', text: name, ...at };
  node.initializer = {
    kind: 'VariableDeclarationList', declarationKind: 'const', ...at,
    declarations: [{ kind: 'VariableDeclaration', name: loopVar, ...at }]
  };
  const assign: AstNode = {
    kind: 'ExpressionStatement', ...at,
    expression: { kind: 'BinaryExpression', left: target, operatorToken: { kind: 'EqualsToken' }, right: { kind: 'Identifier', text: name, ...at }, ...at }
  };
  const body = node.statement;
  node.statement = isBlock(body)
    ? { ...body, statements: [assign, ...(body.statements ?? [])] }
    : { kind: 'Block', statements: [assign, body], ...at };
}

function lowerConstructorCalls(node: AstNode): void {
  for (const child of childNodes(node)) lowerConstructorCalls(child);
  if (isCallExpression(node) && isIdentifier(node.expression) && CONSTRUCTING_BUILTINS.has(node.expression.text)) {
    node.kind = 'NewExpression';
  }
}

// Built-in prototype methods called on another value:
//   Array.prototype.push.apply(a, xs) → a.push(...xs)
//   Array.prototype.slice.call(a, 1)  → a.slice(1)
//   Object.prototype.hasOwnProperty.call(o, k) → Object.hasOwn(o, k)
function lowerPrototypeCalls(node: AstNode): void {
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] && typeof value[i].kind === 'string') {
          lowerPrototypeCalls(value[i]);
          value[i] = lowerPrototypeCall(value[i]);
        }
      }
    } else if (value && typeof value.kind === 'string') {
      lowerPrototypeCalls(value);
      node[key] = lowerPrototypeCall(value);
    }
  }
}

function lowerPrototypeCall(node: AstNode): AstNode {
  if (!isCallExpression(node) || !isPropertyAccessExpression(node.expression)) return node;
  const how = node.expression.name.text;
  const method = node.expression.expression;
  if ((how !== 'call' && how !== 'apply') || !isPropertyAccessExpression(method) || !isPropertyAccessExpression(method.expression)) return node;
  const proto = method.expression;
  if (!isIdentifier(proto.expression) || proto.name.text !== 'prototype' || !['Array', 'Object', 'String'].includes(proto.expression.text)) return node;
  const args: AstNode[] = node.arguments ?? [];
  if (args.length === 0) return node;
  const at = { line: node.line, column: node.column };
  if (proto.expression.text === 'Object' && method.name.text === 'hasOwnProperty' && how === 'call') {
    return {
      ...node,
      expression: { kind: 'PropertyAccessExpression', expression: { kind: 'Identifier', text: 'Object', ...at }, name: { kind: 'Identifier', text: 'hasOwn' }, ...at },
      arguments: args
    };
  }
  if (proto.expression.text === 'Object') return node;
  const rest: AstNode[] = how === 'apply'
    ? (args[1] ? [{ kind: 'SpreadElement', expression: args[1], ...at }] : [])
    : args.slice(1);
  return {
    ...node,
    expression: { kind: 'PropertyAccessExpression', expression: args[0], name: { kind: 'Identifier', text: method.name.text }, ...at },
    arguments: rest
  };
}

// Properties assigned to a top-level function (`visit.BREAK = BREAK`, as in
// `const visit: { (n: Node): void; BREAK: symbol } = function …`) become
// module-level variables: the assignment declares visit__BREAK where it
// stood, and every visit.BREAK reads it. A call-signature type literal on
// the function becomes its plain function type.
function lowerExpandoFunctions(sourceFile: AstNode): void {
  const statements: AstNode[] = sourceFile.statements ?? [];
  const functions = new Map<string, AstNode | undefined>();
  for (const statement of statements) {
    if (isFunctionDeclaration(statement) && isIdentifier(statement.name)) functions.set(statement.name.text, undefined);
    if (statement.kind !== 'VariableStatement') continue;
    for (const d of statement.declarationList?.declarations ?? []) {
      const init = d.initializer;
      if (isIdentifier(d.name) && init && (isFunctionExpression(init) || isArrowFunction(init))) functions.set(d.name.text, d);
    }
  }
  if (functions.size === 0) return;
  const props = new Map<string, Set<string>>();
  sourceFile.statements = statements.map((statement: AstNode): AstNode => {
    const expr = statement.kind === 'ExpressionStatement' ? statement.expression : undefined;
    const target = expr && isBinaryExpression(expr) && expr.operatorToken.kind === 'EqualsToken' ? expr.left : undefined;
    if (!target || !isPropertyAccessExpression(target) || !isIdentifier(target.expression) || !isIdentifier(target.name)) {
      return statement;
    }
    const fnName: string = target.expression.text;
    if (!functions.has(fnName)) return statement;
    const names = props.get(fnName) ?? new Set<string>();
    names.add(target.name.text);
    props.set(fnName, names);
    const declaration: AstNode = {
      kind: 'VariableDeclaration',
      name: { kind: 'Identifier', text: `${fnName}__${target.name.text}`, line: target.line, column: target.column },
      initializer: expr.right,
      line: statement.line,
      column: statement.column
    };
    return {
      kind: 'VariableStatement',
      declarationList: { kind: 'VariableDeclarationList', declarationKind: 'const', declarations: [declaration] },
      exported: true,
      line: statement.line,
      column: statement.column,
      endLine: statement.endLine,
      endColumn: statement.endColumn
    };
  });
  if (props.size === 0) return;
  // (importers' f.prop reads are linked to these, see linkModule)
  sourceFile.expandos = props;
  for (const [fnName, declaration] of functions) {
    const type = declaration?.type;
    if (!props.has(fnName) || type?.kind !== 'TypeLiteral') continue;
    const call = (type.members ?? []).find((m: AstNode) => m.kind === 'CallSignature');
    declaration.type = call ? { ...call, kind: 'FunctionType' } : undefined;
  }
  const rewrite = (node: AstNode): AstNode => {
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = node[key];
      if (Array.isArray(value)) node[key] = value.map((v) => (v && typeof v.kind === 'string' ? rewrite(v) : v));
      else if (value && typeof value.kind === 'string') node[key] = rewrite(value);
    }
    if (isPropertyAccessExpression(node) && isIdentifier(node.expression) && isIdentifier(node.name)) {
      const names = props.get(node.expression.text);
      if (names && names.has(node.name.text)) {
        return { kind: 'Identifier', text: `${node.expression.text}__${node.name.text}`, line: node.line, column: node.column };
      }
    }
    return node;
  };
  sourceFile.statements = sourceFile.statements.map((statement: AstNode) => rewrite(statement));
}

const DISPOSE_SYMBOLS: Record<string, string> = { dispose: '__dispose', asyncDispose: '__asyncDispose' };

function getDisposeSymbolName(expr: AstNode): string | undefined {
  if (!isPropertyAccessExpression(expr) || !isIdentifier(expr.expression) || expr.expression.text !== 'Symbol') return undefined;
  return DISPOSE_SYMBOLS[expr.name.text];
}

// [Symbol.dispose]() { … } → __dispose() { … }; x[Symbol.dispose]() → x.__dispose()
function lowerDisposeSymbols(node: AstNode): void {
  for (const child of childNodes(node)) lowerDisposeSymbols(child);
  if (node.name?.kind === 'ComputedPropertyName') {
    const name = getDisposeSymbolName(node.name.expression);
    if (name) {
      const identifier: AstNode = { kind: 'Identifier', text: name };
      node.name = identifier;
    }
  }
  if (node.kind === 'ElementAccessExpression') {
    const name = getDisposeSymbolName(node.argumentExpression);
    if (name) {
      const identifier: AstNode = { kind: 'Identifier', text: name };
      node.kind = 'PropertyAccessExpression';
      node.name = identifier;
      delete node.argumentExpression;
    }
  }
}

// const Point = class { … } → class Point { … } (the variable names the class)
function lowerClassExpressions(node: AstNode): void {
  for (const child of childNodes(node)) lowerClassExpressions(child);
  if (!Array.isArray(node.statements)) return;
  node.statements = node.statements.map((statement: AstNode): AstNode => {
    const declarations: AstNode[] = statement.kind === 'VariableStatement' ? (statement.declarationList?.declarations ?? []) : [];
    const initializer = declarations.length === 1 ? declarations[0].initializer : undefined;
    if (initializer?.kind !== 'ClassExpression' || !isIdentifier(declarations[0].name)) return statement;
    return { ...initializer, kind: 'ClassDeclaration', name: declarations[0].name, modifiers: statement.modifiers };
  });
}

// WeakMap / WeakSet → Map / Set: same API; weakness is not observable
function lowerWeakCollections(node: AstNode): void {
  for (const child of childNodes(node)) lowerWeakCollections(child);
  const name = node.kind === 'NewExpression' ? node.expression : node.kind === 'TypeReference' ? node.typeName : undefined;
  if (isIdentifier(name) && (name.text === 'WeakMap' || name.text === 'WeakSet')) name.text = name.text.slice(4);
}

// globalThis.x (typed) is the global x itself; (globalThis as any) stays a dynamic object
function lowerGlobalThis(node: AstNode): void {
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (isPropertyAccessExpression(child) && isIdentifier(child.expression) && child.expression.text === 'globalThis') {
      node[key] = child.name;
    }
  }
  for (const child of childNodes(node)) lowerGlobalThis(child);
}

function linkParents(node: AstNode, parent: AstNode | undefined): void {
  node.parent = parent;
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && child.kind) linkParents(child, node);
      }
    } else if (value && typeof value === 'object' && value.kind) {
      linkParents(value, node);
    }
  }
}

// Renders a type node's source text syntactically (no typechecker needed).
function isAnyTypeNode(n: AstNode): boolean {
  return n?.kind === 'AnyKeyword' || n?.kind === 'UnknownKeyword';
}

function typeNodeToText(node) {
    if (!node)
        return 'any';
    const keywordMap = {
        NumberKeyword: 'number',
        StringKeyword: 'string',
        BooleanKeyword: 'boolean',
        AnyKeyword: 'any',
        UnknownKeyword: 'any',
        VoidKeyword: 'void',
        UndefinedKeyword: 'undefined',
        NullKeyword: 'null',
        NeverKeyword: 'never',
        ObjectKeyword: 'object',
        TrueKeyword: 'true',
        FalseKeyword: 'false'
    };
    if (keywordMap[node.kind])
        return keywordMap[node.kind];
    if (node.kind === 'TypeReference' && node.typeName) {
        return typeNodeToText(node.typeName);
    }
    if (node.kind === 'Identifier')
        return node.text;
    if (node.kind === 'ArrayType' && node.elementType) {
        return `${typeNodeToText(node.elementType)}[]`;
    }
    return 'any';
}

// Iterates the child nodes of a normalized JSON AST node (own enumerable
function childNodes(node) {
    const out: any[] = [];
    for (const key of Object.keys(node ?? {})) {
        if (key === 'kind' || key === 'text' || key === 'parent')
            continue;
        const v = node[key];
        if (v && typeof v === 'object' && typeof v.kind === 'string') {
            out.push(v);
        }
        else if (Array.isArray(v)) {
            for (const el of v) {
                if (el && typeof el === 'object' && typeof el.kind === 'string')
                    out.push(el);
            }
        }
    }
    return out;
}

// Default import namespaces from npm/local packages (e.g. `import ts from 'typescript'` → 'ts')
// Property accesses on these are stripped: ts.createSourceFile → createSourceFile
const defaultImportNamespaces = new Set<string>();
// Go helper functions required by the current transpilation (e.g. 'exec', 'readFile').
// Helper sources are appended to every generated Go file that references them.
const usedHelpers = new Set<string>();
// Packages that were imported only because a helper needs them. Tracked so
// per-file import lists can exclude them (helpers are emitted once, in the
// main file, which carries these imports instead).
const helperProvidedPackages = new Set<string>();

// An error in the TypeScript source; line and column are 1-based (0 when unknown)
export type TranspileDiagnostic = { file: string; line: number; column: number; message: string };

// diagnostics: errors that make the Go code incomplete; the CLI stops on any.
// embeds: go:embed patterns relative to the entry file's directory, to copy
// to the same paths next to the Go sources
export type TranspileResult = {
  main: string;
  files: Map<string, string>;
  diagnostics: TranspileDiagnostic[];
  embeds: string[];
};

// A file found by readFile; path names it in diagnostics and line directives
export type ResolvedSourceFile = { content: string; dir: string; tsx?: boolean; path?: string };

export type TranspileOptions = {
  readFile?: (specifier: string, fromDir: string | null) => ResolvedSourceFile | null;
  // go:embed paths (see embedResolver); without it embed.string & co. are errors
  resolveEmbed?: (pattern: string, fromDir: string | null) => string | null;
  parse?: ParseFunction;
  // the entry source is .tsx (JSX)
  tsx?: boolean;
  // the entry file's name in diagnostics and line directives (default 'main.ts')
  fileName?: string;
  // the main Go file's path as Go should report it (default 'code.go'): line
  // directives return the runtime helpers to their real positions in it
  goFile?: string;
  // GOOS the program is built for (default 'linux'): picks OS-specific helpers
  goos?: string;
  // the absolute directory relative file names are relative to (forward
  // slashes): node:test reports, snapshots and coverage name files absolutely
  cwd?: string;
};

// GOOS of the current transpilation (see platformHelper)
let targetGoos = 'linux';

// Whether the file being parsed is .tsx
let currentFileIsTsx = false;

export function transpileToNative(code: string, options?: TranspileOptions): TranspileResult {
  fileResolver = options?.readFile ?? null;
  embedResolver = options?.resolveEmbed ?? null;
  embedPatterns.clear();
  parseFunction = options?.parse ?? defaultParseFunction;
  currentFileIsTsx = !!options?.tsx;
  currentFileName = options?.fileName ?? (currentFileIsTsx ? 'main.tsx' : 'main.ts');
  const goFile = options?.goFile ?? 'code.go';
  targetGoos = options?.goos ?? 'linux';
  sourceFileNames.length = 0;
  diagnostics.length = 0;
  goSafeIdSeed = 1;
  consoleGroupsUsed = code.includes('console.group');
  declaredFunctions.clear();
  nullableArrayCache.clear();
  declaredVariables.clear();
  arrayReferenceCache.clear();
  declaredInterfaces.clear();
  declaredTypeAliases.clear();
  variableTypeNodes.clear();
  goRefVariables.clear();
  narrowedVariables.clear();
  bindNodeRegistryServices();
  nodeLocalNames.clear();
  goPackageLocalNames.clear();
  resetGoBridge();
  initKnownPaths();
  initConvertPaths();
  nodeParentClassKeys.clear();
  asyncFunctionNames.clear();
  generatorFunctionNames.clear();
  currentFileDir = null;
  sourceRoot = options?.cwd ?? '';
  mockedCallKeys.clear();
  mockedMemberNames.clear();
  structGetterFields.clear();
  structMethodFields.clear();
  // Programs that import node:test count what runs, for --experimental-test-coverage
  coverageOn = /['"]node:test['"]/.test(code);
  coverageCounters = 0;
  coverageEmitted.clear();
  coverageFiles.length = 0;
  linkedModules.clear();
  linkedTopNames.clear();
  destructureTempSeed = 0;
  moduleInitOrder.length = 0;
  moduleInitAssignments = null;
  // With a file resolver, the entry and every module it reaches are linked first
  const sourceFile = fileResolver
    ? linkModule(options?.fileName ?? currentFileName, code, null, currentFileIsTsx, currentFileName)
    : parseSource(code);
  collectMockTargets(sourceFile);
  instrumentCoverage(sourceFile, code);
  importedPackages.clear();
  goSideEffectImports.clear();
  outsideNodes = [];
  classNames.clear();
  promiseResolveName = '';
  renamedFunctions.clear();
  variableTypes.clear();
  variableGoTypes.clear();
  variableClassNames.clear();
  classPropertyTypes.clear();
  classMethodReturnTypes.clear();
  interfacePropertyTypes.clear();
  typeAliases.clear();
  enumNames.clear();
  enumBaseTypes.clear();
  importAliases.clear();
  includedLocalImports.clear();
  requireFunctionNames.clear();
  entryPointIds.clear();
  pendingEntryPoints = [];
  mainSourcePath = options?.fileName ?? '';
  localImportFiles = new Map();
  reservedGoFileNames.clear();
  defaultImportNamespaces.clear();
  classStaticMethods.clear();
  classStaticProps.clear();
  classStaticGetters.clear();
  classConstructorSignatures.clear();
  classValuesUsed = false;
  emittedClasses.clear();
  classGetterMethods.clear();
  classSetterMethods.clear();
  classIteratorMethods.clear();
  seedNodeClassTables();
  declaredClasses.clear();
  classParentNames.clear();
  referenceArrays.clear();
  usedHelpers.clear();
  helperProvidedPackages.clear();
  mainPackageVariables.length = 0;
  goInterfaceAdapters.clear();
  classMethodSignatures.clear();
  dynamicMethodCalls.clear();
  // Every linked module's classes are known before any is emitted (a
  // type-only import can reach a class before its declaration is visited)
  for (const mod of linkedModules.values()) {
    for (const statement of mod.ast.statements ?? []) {
      if (isClassDeclaration(statement) && isIdentifier(statement.name)) {
        classNames.add(statement.name.text);
        declaredClasses.set(statement.name.text, statement);
        for (const member of statement.members ?? []) {
          if (!(member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) continue;
          const key = `${statement.name.text}.${memberKey(member.name)}`;
          if (isMethodDeclaration(member)) classStaticMethods.add(key);
          else if (isPropertyDeclaration(member)) classStaticProps.add(key);
          else if (isGetAccessor(member) || isSetAccessor(member)) {
            classStaticProps.add(key);
            if (isGetAccessor(member)) classStaticGetters.add(key);
          }
        }
      }
    }
  }
  for (const [className, declaration] of declaredClasses) {
    for (const clause of declaration.heritageClauses ?? []) {
      const parent = clause.types?.[0]?.expression;
      if (clause.token === 'ExtendsKeyword' && isIdentifier(parent) && declaredClasses.has(parent.text)) {
        classParentNames.set(className, parent.text);
      }
    }
  }
  // and their members (parents first: subclasses inherit the tables)
  const registered = new Set<string>();
  const registerWithParents = (className: string): void => {
    if (registered.has(className)) return;
    registered.add(className);
    const parent = classParentNames.get(className);
    if (parent) registerWithParents(parent);
    const declaration = declaredClasses.get(className);
    if (declaration) registerClassMembers(declaration);
  };
  for (const className of [...declaredClasses.keys()]) registerWithParents(className);
  // and so are the fields of every interface and object type alias
  for (const mod of linkedModules.values()) {
    for (const statement of mod.ast.statements ?? []) {
      if (!isIdentifier(statement.name)) continue;
      if (isInterfaceDeclaration(statement)) {
        const properties = new Map<string, string>();
        collectInterfaceProperties(statement, properties);
        if (properties.size > 0) interfacePropertyTypes.set(statement.name.text, properties);
      } else if (isTypeAliasDeclaration(statement) && statement.type?.kind === 'TypeLiteral') {
        const properties = new Map<string, string>();
        for (const member of statement.type.members ?? []) {
          if (isPropertySignature(member) && isIdentifier(member.name)) {
            properties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
          }
        }
        if (properties.size > 0) interfacePropertyTypes.set(statement.name.text, properties);
      }
    }
  }
  const transpiledCode = visit(sourceFile, { addFunctionOutside: true });
  const transpiledCodeOutside = outsideNodes.map((n) => withLineMarker(n, visit(n, { isOutside: true }))).join('\n');
  // Worker / fork files, including the ones they start in turn
  while (pendingEntryPoints.length > 0) {
    const entry = pendingEntryPoints.shift()!;
    compileEntryPoint(entry.id, entry.file);
  }

  // Keep the process alive until detached async work and timers settle
  const drains: string[] = [];
  // The event loop runs until no timers, async work or open handles remain
  if (usedHelpers.has('eventLoop')) drains.push('TnRunLoop()');
  // process.exitCode
  if (usedHelpers.has('nodeProcess')) drains.push('TnProcessExit()');
  const drainCode = drains.length > 0 ? `\n${LINE_RESET}\n\t${drains.join('\n\t')}` : '';

  // Go bridge types are qualified by path internally (net/http.Cookie)
  const mainCode = localizeGoPaths(transpiledCode);
  const outsideCode = localizeGoPaths(transpiledCodeOutside);
  const packageVariables = mainPackageVariables.map((v) => localizeGoPaths(v));
  // Go bridge packages pulled in for a type that never got emitted
  // (a method's result type, a param type needing no conversion) would be
  // unused imports, which Go rejects.
  const emitted = stripEmbedDirectives(stripGoStrings(`${mainCode}\n${outsideCode}\n${packageVariables.join('\n')}`));
  const coverageCode = coverageFiles.length > 0 ? `\n\n${coverageTables()}` : '';
  // (generated before the helpers: they may use more of them)
  const dispatchCode = dynamicMethodCalls.size > 0 ? `\n\n${emitDynamicDispatchers()}` : '';
  const classCode = (classValuesUsed ? `\n\n${emitClassDescriptors()}` : '') + `\n\n${emitToJSONWrappers()}`;
  const helpersCode = emitGoHelpers() + coverageCode + dispatchCode + classCode;
  const mainImports = [...importedPackages].filter((pkg) => {
    if (!hasGoPackage(pkg)) return true;
    const pkgName = goPathAliases[pkg] ?? pkg.split('/').pop()!;
    return referencesQualifier(emitted, pkgName) || referencesQualifier(helpersCode, pkgName);
  });
  for (const pkg of goSideEffectImports) {
    if (!mainImports.includes(pkg)) mainImports.push(pkg);
  }
  const blankEmbed = hasEmbedDirective(packageVariables.join('\n')) && !mainImports.includes('embed');
  if (blankEmbed) mainImports.push('embed');
  const importLine = (pkg: string): string =>
    (goSideEffectImports.has(pkg) && !importedPackages.has(pkg)) || (pkg === 'embed' && blankEmbed)
      ? `import _ "${pkg}"`
      : goImportLine(pkg);
  // process.on('uncaughtException'): a throw in the top-level code is handed to it too
  // With second entry points, TN_ENTRY runs one of them instead of the program
  const moduleInits = moduleInitOrder.map((name) => `${name}()\n\t`).join('');
  const mainBody = `${coverageLoaded(sourceFile)}${mainCode.trim()}`;
  const programCode = usedHelpers.has('entryPoints')
    ? `if __entry := tnEntryPoints[tnCurrentEntry]; __entry != nil {\n\t__entry()\n\t} else {\n\t${mainBody}\n\t}`
    : mainBody;
  const body = usedHelpers.has('nodeUncaught') ? `func() {\n\tdefer TnMainRecover()\n\t${moduleInits}${programCode}\n\t}()` : `${moduleInits}${programCode}`;
  const main = `${GENERATED_HEADER}

package main

${mainImports.sort().map((pkg) => importLine(pkg)).join('\n')}

${packageVariables.join('\n')}
${LINE_RESET}
func main() {
    ${body}${drainCode}
}

${outsideCode.trim()}
${LINE_RESET}
${helpersCode}`.trimEnd();
  return {
    main: applyLineDirectives(main, goFile),
    files: localImportFiles,
    diagnostics: diagnostics.slice(),
    embeds: [...embedPatterns]
  };
}

export // Property map of an interface, including inherited properties (flattened —
// Go struct literals cannot initialize embedded fields)
function collectInterfaceProperties(iface: AstNode, into: Map<string, string>, seen = new Set<string>()): void {
  let name: string | undefined;
  if (iface.name && isIdentifier(iface.name)) name = iface.name.text;
  if (name && seen.has(name)) return;
  if (name) seen.add(name);
  for (const clause of iface.heritageClauses ?? []) {
    if (clause.token === 'ExtendsKeyword') {
      for (const type of clause.types ?? []) {
        if (isIdentifier(type.expression)) {
          const base = declaredInterfaces.get(type.expression.text);
          if (base) collectInterfaceProperties(base, into, seen);
        }
      }
    }
  }
  // an object type (it has properties): its methods are func-typed fields
  const withMethods = interfaceHasProperties(iface);
  for (const member of (iface.members ?? [])) {
    if (isPropertySignature(member) && isIdentifier(member.name)) {
      into.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
    } else if (withMethods && isMethodSignature(member) && isIdentifier(member.name)) {
      into.set(member.name.text, methodSignatureFieldType(member));
    }
  }
}

// The func type of an interface method held as a field
function methodSignatureFieldType(member: AstNode): string {
  const fnType: AstNode = { kind: 'FunctionType', parameters: member.parameters, type: member.type, parent: member };
  return getType(fnType);
}

// Whether an interface (or one it extends) declares properties: it compiles
// to a struct then, a Go interface only when it has methods alone
function interfaceHasProperties(iface: AstNode, seen = new Set<string>()): boolean {
  const name = iface.name && isIdentifier(iface.name) ? iface.name.text : '';
  if (name && seen.has(name)) return false;
  if (name) seen.add(name);
  if ((iface.members ?? []).some((m: AstNode) => isPropertySignature(m))) return true;
  for (const clause of iface.heritageClauses ?? []) {
    for (const type of clause.types ?? []) {
      const base = isIdentifier(type.expression) ? declaredInterfaces.get(type.expression.text) : undefined;
      if (base && interfaceHasProperties(base, seen)) return true;
    }
  }
  return false;
}

function visit(node: AstNode, options: VisitNodeOptions = {}): string {
  // a function's own variables shadow same-named outer ones only inside it
  if (node && node.body && FUNCTION_LIKE_KINDS.has(node.kind)) {
    const restore = saveVariableTypes(functionScopeNames(node));
    const code = visitNode(node, options);
    restore();
    return code;
  }
  // and a block's (a case clause's) own variables only inside the block
  if (node && (node.kind === 'Block' || node.kind === 'CaseClause' || node.kind === 'DefaultClause')) {
    const names = blockScopeNames(node);
    if (names.length > 0) {
      const restore = saveVariableTypes(names);
      const code = visitNode(node, options);
      restore();
      return code;
    }
  }
  return visitNode(node, options);
}

function visitNode(node: AstNode, options: VisitNodeOptions = {}): string {
  let code: string = '';

  // Reads of a narrowed nullable property path dereference it
  if (narrowedVariables.size > 0 && isPropertyAccessExpression(node) && !options.skipNarrowing) {
    const key = getNarrowingKey(node);
    if (key && narrowedVariables.has(key) && isNarrowableReference(node)) {
      return `(*${visit(node, { ...options, skipNarrowing: true })})`;
    }
  }

  if (isSourceFile(node)) {
    return (node.statements ?? [])
      .map((n) => withLineMarker(n, visit(n, { addFunctionOutside: true })) + coverageAfter(n))
      .filter((n) => !!n)
      .join(options.inline ? '' : '\n\t');
  } else if (isJsxNode(node)) {
    return visitJsx(node);
  } else if (isIdentifier(node) && node.text === 'globalThis') {
    useHelper('globalThis');
    return 'TnGlobalThis';
  } else if (isIdentifier(node)) {
    if (isFieldNameIdentifier(node)) return goFieldName(node.text);
    if (node.text === 'Boolean' && isCallExpression(node.parent) && node.parent.arguments?.[0] === node) {
      const receiver = isPropertyAccessExpression(node.parent.expression)
        ? inferExpressionType(node.parent.expression.expression)
        : undefined;
      const elementType = receiver?.startsWith('[]') ? receiver.slice(2) : 'interface{}';
      return `func(__v ${elementType}) bool { return ${truthinessCheck('__v', elementType)} }`;
    }
    if (node.text === 'undefined') return 'nil';
    // resolve / reject passed as values (setTimeout(resolve, ms)): closures over the channel
    const isCallee = isCallExpression(node.parent) && node.parent.expression === node;
    if (!isCallee && promiseResolveName && node.text === promiseResolveName) {
      useHelper('promise');
      return 'TnResolver(ch)';
    }
    if (!isCallee && promiseRejectName && node.text === promiseRejectName) {
      useHelper('promise');
      return 'TnRejecter(ch)';
    }
    if (node.text === 'NaN' || node.text === 'Infinity') {
      importedPackages.add('math');
      return node.text === 'NaN' ? 'math.NaN()' : 'math.Inf(1)';
    }
    if (nodeLocalNames.size > 0 || nodeRegistry.globals[node.text]) {
      const nodeValue = visitNodeValue(node);
      if (nodeValue !== undefined) return nodeValue;
    }
    const goAlias = importAliases.get(node.text);
    if (goAlias) return goAlias;
    // Map / Set as class values (`new Type()` of a parameter)
    if ((node.text === 'Map' || node.text === 'Set') && !variableGoTypes.has(node.text) && !classNames.has(node.text) && isClassValueReference(node)) {
      useHelper('classes');
      useHelper('orderedMap');
      return `TnClass_${node.text}`;
    }
    // String / Number / Boolean as functions (`.map(String)`)
    if (['String', 'Number', 'Boolean'].includes(node.text) && !variableGoTypes.has(node.text) && isClassValueReference(node)) {
      useHelper('dynamic');
      if (node.text === 'String') return 'func(__v interface{}) string { return TnJSString(__v) }';
      if (node.text === 'Number') return 'func(__v interface{}) float64 { return TnNumber(__v) }';
      return 'func(__v interface{}) bool { return TnTruthy(__v) }';
    }
    // A class passed as a value is its TnClass descriptor; where a
    // constructor function is expected (make(Box) for a construct signature)
    // its NewBox function
    if (classNames.has(node.text) && isClassValueReference(node) && !isTypeParameterInScope(node.text, node)) {
      return expectsConstructorFunction(node) ? `TnCtorOf(${classValue(node.text)}, New${getSafeName(node.text)})` : classValue(node.text);
    }
    // Array references: reads go through the shared slice-header pointer
    // (`arr === null` tests the reference itself)
    if (referenceArrays.has(node.text)) {
      const parent = node.parent;
      const comparedToNil =
        parent && isBinaryExpression(parent) &&
        ['EqualsEqualsEqualsToken', 'ExclamationEqualsEqualsToken', 'EqualsEqualsToken', 'ExclamationEqualsToken'].includes(parent.operatorToken.kind) &&
        isNilLiteral(parent.left === node ? parent.right : parent.left);
      if (comparedToNil) return getSafeName(node.text);
      // (one that may hold null — a regex match — reads as a nil slice then)
      const mutated = isAssignmentTarget(node) || (isPropertyAccessExpression(parent) && parent.expression === node && MUTATING_ARRAY_METHODS.has(parent.name.text));
      if (!mutated && mayHoldNullArray(node)) {
        useHelper('dynamic');
        return `TnDerefSlice(${getSafeName(node.text)})`;
      }
      return `(*${getSafeName(node.text)})`;
    }
    if (narrowedVariables.has(node.text) && isNarrowableReference(node)) {
      return `(*${getSafeName(node.text)})`;
    }
    const typeofNarrowed = typeofNarrowedType(node.text);
    if (typeofNarrowed && isNarrowableReference(node) && !isAssignmentTarget(node) && (variableGoTypes.get(node.text) ?? 'interface{}') === 'interface{}') {
      // (a primitive may be held as a *T: a nullable field read dynamically)
      if (['float64', 'string', 'bool'].includes(typeofNarrowed)) {
        useHelper('dynamic');
        return `TnNarrow[${typeofNarrowed}](${getSafeName(node.text)})`;
      }
      return `interface{}(${getSafeName(node.text)}).(${typeofNarrowed})`;
    }
    return getSafeName(node.text);
  } else if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
    return toGoStringLiteral(node.text);
  } else if (isAsExpression(node)) {
    return toGoValueOfType(node.expression, getAsExpressionType(node));
  } else if (isTypeAssertionExpression(node)) {
    // <T>x: like `x as T`
    return toGoValueOfType(node.expression, getAsExpressionType(node));
  } else if (isTemplateExpression(node)) {
    return visitTemplateExpression(node);
  } else if (node.kind === 'TaggedTemplateExpression' && isStringRawTag(node.tag)) {
    // String.raw`a\n${x}`: the raw source text with the values interpolated
    const template = node.template;
    const raw = (part: AstNode) => toGoStringLiteral(part.rawText ?? part.text);
    if (template.kind === 'NoSubstitutionTemplateLiteral') return raw(template);
    const pieces = [raw(template.head)];
    for (const span of template.templateSpans ?? []) {
      pieces.push(jsStringOf(visit(span.expression), inferExpressionType(span.expression)), raw(span.literal));
    }
    return `(${pieces.join(' + ')})`;
  } else if (node.kind === 'TaggedTemplateExpression') {
    // tag`x${2}` → tag(["x", ""], 2)
    const tag = visit(node.tag);
    const template = node.template;
    const parts: string[] = [];
    const args: string[] = [];
    if (template.kind === 'NoSubstitutionTemplateLiteral') {
      parts.push(toGoStringLiteral(template.text));
    } else {
      parts.push(toGoStringLiteral(template.head.text));
      for (const span of template.templateSpans ?? []) {
        args.push(visit(span.expression));
        parts.push(toGoStringLiteral(span.literal.text));
      }
    }
    return `${tag}([]string{${parts.join(', ')}}${args.length ? `, ${args.join(', ')}` : ''})`;
  } else if (isNumericLiteral(node)) {
    return `float64(${node.text})`;
  } else if (node.kind === 'BigIntLiteral') {
    useHelper('bigint');
    return `TnBigInt("${String(node.text).replace(/n$/, '')}")`;
  } else if (isToken(node) && node.kind === 'TrueKeyword') {
    return `true`;
  } else if (isToken(node) && node.kind === 'FalseKeyword') {
    return `false`;
  } else if (isToken(node) && node.kind === 'NullKeyword') {
    return `nil`;
  } else if (isRegularExpressionLiteral(node)) {
    const text = node.text; // e.g. /pattern/flags
    const lastSlash = text.lastIndexOf('/');
    const pattern = text.substring(1, lastSlash);
    const flags = text.substring(lastSlash + 1);
    const goPattern = translateJsRegexPattern(pattern);
    // /g needs lastIndex state; backreferences and lookarounds need the
    // backtracking engine — both live in the TnRegex wrapper
    if (needsStatefulRegex(pattern, flags)) {
      useHelper('fancyRegex');
      return `TnRegexCompile("${goPattern}", "${flags}", ${toGoStringLiteral(pattern)})`;
    }
    importedPackages.add('regexp');
    const goFlags = jsRegexFlagsToGo(flags);
    return `regexp.MustCompile("${goFlags}${goPattern}")`;
  } else if (isArrayLiteralExpression(node)) {
    const type = getArrayLiteralElementType(node);
    const hasSpread = (node.elements ?? []).some((e) => isSpreadElement(e));
    if (hasSpread) {
      return visitSpreadArrayLiteral(node, type);
    }
    // (dynamic elements of a typed literal assert their type)
    return `[]${type} {${(node.elements ?? []).map((e) => (arrayElementNeedsConversion(e, type) ? toGoValueOfType(e, type) : visit(e))).join(', ')}}`;
  } else if (isBlock(node)) {
    return `{\n\t\t${coverageEnter(node)}${options.prefixBlockContent ?? ''}${visitBlockStatements(
      node.statements ?? []
    )}${options.extraBlockContent ?? ''}${fallbackReturn(node)}}${options.inline ? '' : '\n\t'}`;
  } else if (node.kind === 'TnArrayItems') {
    useHelper('arraySubclass');
    return `(*${visit(node.expression)}.TnItems())`;
  } else if (isElementAccessExpression(node)) {
    // seq[i] on an Array subclass: its elements
    if (node.expression.kind !== 'TnArrayItems' && arraySubclassOf(node.expression) && !isStringLiteral(node.argumentExpression)) {
      node.expression = arrayItemsNode(node.expression);
    }
    if (hasQuestionDot(node)) {
      return visitOptionalElementAccess(node);
    }
    // Enum['Member'] is the member; NumericEnum[value] its name (reverse mapping)
    if (isIdentifier(node.expression) && enumNames.has(node.expression.text)) {
      const enumGoName = getSafeName(node.expression.text);
      const key = node.argumentExpression;
      if (isStringLiteral(key)) {
        return `${enumGoName}_${getEnumMemberName(key)}`;
      }
      if (enumBaseTypes.get(node.expression.text) === 'float64') {
        return `${enumGoName}__name(float64(${visit(key)}))`;
      }
    }
    if (isDynamicValue(node.expression)) {
      useHelper('dynamic');
      return `TnIndex(${visit(node.expression)}, ${visit(node.argumentExpression)})`;
    }
    // process.env['X'] → TnGetenv("X")
    if (isProcessEnv(node.expression)) {
      useHelper('getenv');
      return `TnGetenv(${visit(node.argumentExpression)})`;
    }
    // Maps (Record/Map) and string keys index directly; arrays/strings need an int index
    const targetType = inferExpressionType(node.expression);
    if (targetType === 'string') {
      // s[i] in JS is a one-character string ("" when out of range)
      useHelper('dynamic');
      return `TnCharAt(${visit(node.expression)}, ${numericIndex(node.argumentExpression)})`;
    }
    if (targetType?.startsWith('*TnMap[')) {
      return `${visit(node.expression)}.Get(${toGoValueOfType(node.argumentExpression, extractMapKeyType(targetType))})`;
    }
    // obj['field'] / obj[key] on a class instance or typed object
    if (targetType && isFieldObjectType(targetType)) {
      const member = visitObjectMemberAccess(node, targetType);
      if (member) return member;
    }
    if (isStringLiteral(node.argumentExpression)) {
      return `${visit(node.expression)}[${visit(node.argumentExpression)}]`;
    }
    // Typed array elements read as numbers (out of range: 0)
    if (isTypedArrayGoType(targetType) && !isAssignmentTarget(node)) {
      return `${visit(node.expression)}.Get(${visit(node.argumentExpression)})`;
    }
    // Buffer / Uint8Array elements read as numbers
    if (targetType === '[]byte' && !isAssignmentTarget(node)) {
      useHelper('dynamic');
      return `float64(TnAt(${visit(node.expression)}, ${visit(node.argumentExpression)}))`;
    }
    // pair[0] on a [string, number] tuple ([]interface{}): the element's type
    const tupleElement = tupleElementGoType(node);
    if (tupleElement && !isAssignmentTarget(node)) {
      useHelper('dynamic');
      return `TnAs[${tupleElement}](TnAt(${visit(node.expression)}, ${numericIndex(node.argumentExpression)}))`;
    }
    // Reading past the end of an array gives undefined in JS: the zero value here
    if (targetType?.startsWith('[]') && !isAssignmentTarget(node)) {
      useHelper('dynamic');
      return `TnAt(${visit(node.expression)}, ${numericIndex(node.argumentExpression)})`;
    }
    return `${visit(node.expression)}[int(${numericIndex(node.argumentExpression)})]`;
  } else if (isPropertyAccessExpression(node)) {
    // seq.length on an Array subclass
    if (node.name.text === 'length' && node.expression.kind !== 'TnArrayItems' && arraySubclassOf(node.expression)) {
      return `float64(len(${visit(arrayItemsNode(node.expression))}))`;
    }
    if (isMockAccess(node)) {
      nodeRegistry.helper('nodeTest');
      return visitMockAccess(node);
    }
    if (isProcessEnv(node.expression) && !isCallee(node) && !isAssignmentTarget(node)) {
      useHelper('getenv');
      return `TnGetenv("${node.name.text}")`;
    }
    if (!isCallee(node) && !isAssignmentTarget(node)) {
      const nodeValue = visitNodeValue(node);
      if (nodeValue !== undefined) return nodeValue;
    }
    const regexProperty = visitRegexProperty(node);
    if (regexProperty) return regexProperty;
    // Go package member or field on a Go value.
    if (!isCallee(node) || isCallee(node)) {
      const goProp = visitGoProperty(node);
      if (goProp !== undefined) return goProp;
    }
    // import.meta.url — the file URL of the running program
    if (isNewTargetNode(node.expression) && node.name.text === 'name') return '__newTarget';
    if (node.expression.kind === 'MetaProperty' && node.name.text === 'url') {
      useHelper('moduleUrl');
      return 'TnModuleURL()';
    }
    if (hasDynamicProperties(node.expression) && node.name.text === 'length' && !isCallee(node)) {
      useHelper('dynamic');
      return `TnLength(${visit(node.expression)})`;
    }
    if (hasDynamicProperties(node.expression) && !isCallee(node) && !isProcessEnv(node.expression)) {
      useHelper('dynamic');
      return `TnGetRef(${visit(node.expression)}, "${node.name.text}")`;
    }
    if (hasQuestionDot(node)) {
      return visitOptionalPropertyAccess(node);
    }
    // fn.name / fn.length on a declared function, class or function variable
    if (isIdentifier(node.expression) && (node.name.text === 'name' || node.name.text === 'length') && !isAssignmentTarget(node)) {
      const fnInfo = functionNameAndLength(node.expression.text);
      if (fnInfo) return node.name.text === 'name' ? toGoStringLiteral(fnInfo.name) : `float64(${fnInfo.arity})`;
    }
    // Symbol.for / Symbol.keyFor: keep the names (`for` is a Go keyword) so the
    // call handlers match
    if (isIdentifier(node.expression) && node.expression.text === 'Symbol' && (node.name.text === 'for' || node.name.text === 'keyFor')) {
      return `Symbol.${node.name.text}`;
    }
    // super.method() → the parent's implementation on the embedded struct
    if (node.expression.kind === 'SuperKeyword') {
      const ownerClass = getEnclosingClassName(node);
      const parentName = ownerClass ? classParentNames.get(ownerClass) : undefined;
      if (parentName) {
        // super.x on an accessor reads the parent's getter
        if (!isCallee(node) && !isAssignmentTarget(node) && classGetterMethods.has(`${parentName}.${node.name.text}`)) {
          return `self.${goFieldName(parentName)}.Get_${visit(node.name)}()`;
        }
        return `self.${goFieldName(parentName)}.${visit(node.name)}`;
      }
      return visit(node.name);
    }
    if (isIdentifier(node.expression) && enumNames.has(node.expression.text)) {
      return `${getSafeName(node.expression.text)}_${getEnumMemberName(node.name)}`;
    }
    // Strip default import namespace: `ts.createSourceFile` → `createSourceFile`
    if (isIdentifier(node.expression) && defaultImportNamespaces.has(node.expression.text)) {
      return visit(node.name);
    }
    // C.prototype: the class stands in for its prototype
    if (isIdentifier(node.expression) && classNames.has(node.expression.text) && node.name.text === 'prototype') {
      return classValue(node.expression.text);
    }
    // x.constructor: the class of a class instance
    if (node.name.text === 'constructor' && !isCallee(node) && !isAssignmentTarget(node)) {
      useHelper('classes');
      return `TnClassOf(${visit(node.expression)})`;
    }
    // Static member access: `Counter.count` → `Counter_count`, also when the
    // member is inherited (`Child.make` → `Parent_make`) or private (`C.#n`)
    if (isIdentifier(node.expression)) {
      const memberName = memberKey(node.name);
      const owner = staticMemberOwner(node.expression.text, memberName);
      // a static getter is a call (a setter is called by the assignment)
      if (owner && classStaticGetters.has(`${owner}.${memberName}`) && !isAssignmentTarget(node)) {
        return `${owner}_Get_${goFieldName(memberName)}()`;
      }
      // the declaration's name (member names only rename Go keywords)
      if (owner) return `${owner}_${node.name.kind === 'PrivateIdentifier' ? visit(node.name) : goFieldName(memberName)}`;
    }
    const leftSide = visit(node.expression);
    const rightSide = visit(node.name);
    const objectType = resolveExpressionType(node.expression);
    // Anonymous-struct function fields (object-literal methods/getters): a
    // property read invokes the closure, unless it is itself being called
    const leftGoType = inferExpressionType(node.expression);
    // A match array's .index (string[] has no other .index)
    if (rightSide === 'index' && leftGoType === '[]string' && !isCallee(node) && !isAssignmentTarget(node)) {
      useHelper('regexMatch');
      return `TnMatchIndex(${leftSide})`;
    }
    if (
      leftGoType?.includes('struct{') &&
      !isCallee(node) &&
      getStructFieldGoType(leftGoType.replace(/^\*/, ''), node.name.text)?.startsWith('func')
    ) {
      // Getters invoke on read; a method read is the function value itself
      if (!isStructMethodField(leftGoType, node.name.text) || isStructGetterField(leftGoType, node.name.text)) {
        return `${leftSide}.${rightSide}()`;
      }
      return `${leftSide}.${rightSide}`;
    }
    // Class getter reads are accessor calls: c.v → c.Get_v()
    if (
      (leftGoType?.startsWith('*') || node.expression.kind === 'ThisKeyword') &&
      !leftGoType?.startsWith('*TnMap[') &&
      !leftGoType?.includes('struct{') &&
      !leftGoType?.startsWith('*[]')
    ) {
      const className =
        node.expression.kind === 'ThisKeyword'
          ? getEnclosingClassName(node)
          : leftGoType
            ? leftGoType.slice(1).replace(/\[.*\]$/, '')
            : undefined;
      const accessorName = memberKey(node.name);
      if (className && classGetterMethods.has(`${className}.${accessorName}`)) {
        return `${leftSide}.Get_${rightSide}()`;
      }
    }
    // Record/Map reads via dot syntax are key lookups; method callees keep their name
    if (
      (objectType === 'Map' || objectType === 'Record') &&
      rightSide !== 'size' &&
      rightSide !== 'length' &&
      !isCallee(node) &&
      !isAssignmentTarget(node)
    ) {
      return `${leftSide}.Get(${toGoStringLiteral(rightSide)})`;
    }
    // an object with its own `length` field (not an array's length)
    if (
      rightSide === 'length' &&
      leftGoType?.startsWith('*') &&
      !leftGoType.startsWith('*[]') &&
      !leftGoType.startsWith('*TnMap[') &&
      getObjectFieldGoType(leftGoType, 'length')
    ) {
      return `${leftSide}.length`;
    }
    return getAcessString(leftSide, rightSide, objectType);
  } else if (isVariableDeclaration(node)) {
    const requireDeclaration = visitRequireDeclaration(node);
    if (requireDeclaration !== undefined) return requireDeclaration;
    const embedDeclaration = visitEmbedDeclaration(node);
    if (embedDeclaration !== undefined) return embedDeclaration;
    const nodeAlias = visitNodeAliasDeclaration(node);
    if (nodeAlias !== undefined) return nodeAlias;
    // Object destructuring: const { x, y } = obj
    if (isObjectBindingPattern(node.name) && node.initializer) {
      let initExpr = visit(node.initializer);
      const initType = inferExpressionType(node.initializer);
      const parts: string[] = [];
      // Evaluate the initializer once (const { a, b } = new X())
      if ((node.name.elements ?? []).length > 1 && !isIdentifier(node.initializer)) {
        const source = getTempName('src');
        parts.push(`${source} := ${initExpr}`);
        initExpr = source;
      }
      for (const el of node.name.elements ?? []) {
        const localName = visit(el.name);
        const rawProp = el.propertyName ?? el.name;
        const propName = isIdentifier(rawProp) ? rawProp.text : visit(rawProp);
        const structName = initType ? initType.replace(/^\*/, '') : '';
        // Struct literal fields, or the properties of a class (Node classes included)
        const fieldType = initType
          ? getObjectFieldGoType(initType, propName)
          : undefined;
        const defaultVal = el.initializer;
        if (!defaultVal && classGetterMethods.has(`${structName}.${propName}`)) {
          parts.push(`${localName} := (${initExpr}).Get_${goFieldName(propName)}()`);
        } else if (!defaultVal && isStructGetterField(structName, propName)) {
          parts.push(`${localName} := (${initExpr}).${goFieldName(propName)}()`);
        } else if (defaultVal) {
          // Missing property (nil) takes the default
          const defType = inferExpressionType(defaultVal) ?? fieldType ?? 'interface{}';
          const tmp = getTempName('destructure');
          useHelper('dynamic');
          parts.push(
            `${localName} := func() ${defType} { ${tmp} := interface{}((${initExpr}).${goFieldName(propName)}); if TnIsNil(${tmp}) { return ${visit(defaultVal)} }; return TnAs[${defType}](${tmp}) }()`
          );
        } else if (!initType || initType === 'interface{}') {
          // a dynamic source: its property by name (undefined when missing)
          useHelper('dynamic');
          parts.push(`${localName} := TnGetRef(${initExpr}, ${toGoStringLiteral(propName)})`);
        } else if (fieldType === 'interface{}' && genericMemberPrimitive(node.initializer, rawProp)) {
          // a member typed by a class type parameter that the source's type
          // binds to a primitive (`node as Scalar<number>`)
          const primitive = genericMemberPrimitive(node.initializer, rawProp)!;
          useHelper('dynamic');
          parts.push(`${localName} := TnAs[${primitive}]((${initExpr}).${goFieldName(propName)})`);
          registerLocalVariable(bindingName(el, localName), primitive);
          continue;
        } else {
          parts.push(`${localName} := (${initExpr}).${goFieldName(propName)}`);
        }
        registerLocalVariable(
          bindingName(el, localName),
          defaultVal ? (inferExpressionType(defaultVal) ?? fieldType) : (fieldType ?? (!initType || initType === 'interface{}' ? 'interface{}' : undefined))
        );
        // the member's declared type (its function type's optional parameters …)
        const sourceTypeNode = getExpressionTypeNode(node.initializer);
        const memberTypeNode = sourceTypeNode && isIdentifier(rawProp) ? getMemberTypeNode(sourceTypeNode, rawProp.text) : undefined;
        if (memberTypeNode) variableTypeNodes.set(bindingName(el, localName), memberTypeNode);
      }
      return parts.concat(destructuredUseMarks(node)).join(';\n\t');
    }
    // Array destructuring: const [a, b] = arr
    if (isArrayBindingPattern(node.name) && node.initializer) {
      const initGoType = inferExpressionType(node.initializer);
      const initExpr = isDynamicValue(node.initializer)
        ? toGoValueOfType(node.initializer, '[]interface{}')
        : visit(node.initializer);
      const tmpVar = getTempName('arr');
      const elemType = initGoType?.startsWith('[]') ? initGoType.slice(2) : undefined;
      // Multi-value Go calls: each element asserts back to its own type
      const tupleTypes = goTupleTypes(unwrapParentheses(node.initializer));
      const parts = [`${tmpVar} := ${initExpr}`];
      node.name.elements.forEach((el, idx) => {
        const tupleType = tupleTypes?.[idx];
        if (tupleType && !isOmittedExpression(el) && isIdentifier((el as AstNode).name) && !(el as AstNode).initializer) {
          const localName = visit((el as AstNode).name);
          if (localName === '_' || localName.startsWith('_')) {
            parts.push(`_ = ${tmpVar}`);
            return;
          }
          ensureGoTypePackages(tupleType);
          parts.push(`${localName} := ${tmpVar}[${idx}].(${goLocalType(tupleType)})`);
          registerLocalVariable(bindingName(el, localName), tupleType);
          return;
        }
        if (isOmittedExpression(el)) return;
        const bindEl = el as AstNode;
        const localName = visit(bindEl.name);
        if (bindEl.dotDotDotToken) {
          // `...rest` copies the remaining elements (empty past the end)
          importedPackages.add('slices');
          parts.push(`${localName} := slices.Clone(${tmpVar}[min(${idx}, len(${tmpVar})):])`);
          registerLocalVariable(bindingName(el, localName), initGoType?.startsWith('[]') ? initGoType : undefined);
          return;
        }
        const defaultVal = bindEl.initializer;
        if (defaultVal) {
          // Missing element (past the end) takes the default
          const defType = inferExpressionType(defaultVal) ?? elemType ?? 'interface{}';
          parts.push(
            `${localName} := func() ${defType} { if len(${tmpVar}) > ${idx} { return ${tmpVar}[${idx}] }; return ${visit(defaultVal)} }()`
          );
        } else if (localName === '_' || localName.startsWith('_')) {
          parts.push(`_ = ${tmpVar}`);
        } else if (elemType && ['string', 'float64', 'bool'].includes(elemType) && isIdentifier(bindEl.name) && comparedToNullish(bindEl.name.text, node)) {
          // a primitive the code tests for undefined: nil past the end
          useHelper('dynamic');
          // (a regex match's unmatched groups are undefined too)
          if (elemType === 'string') useHelper('regexMatch');
          parts.push(`${localName} := ${elemType === 'string' ? 'TnMatchGroup' : 'TnAtPtr'}(${tmpVar}, float64(${idx}))`);
          registerLocalVariable(bindingName(el, localName), `*${elemType}`);
          return;
        } else {
          // Reading past the end gives undefined in JS: the zero value here
          useHelper('dynamic');
          parts.push(`${localName} := TnAt(${tmpVar}, float64(${idx}))`);
        }
        registerLocalVariable(
          bindingName(el, localName),
          defaultVal ? inferExpressionType(defaultVal) : elemType
        );
      });
      return parts.concat(destructuredUseMarks(node)).join(';\n\t');
    }
    // let re: RegExp assigned a regex only the JS-semantics engine serves: that
    // regex type (RE2 values are wrapped into it)
    if (isIdentifier(node.name) && isRegExpTypeNode(node.type) && assignsStatefulRegex(node)) {
      node.type = { kind: 'TnGoType', goType: '*TnRegex', parent: node };
    }
    // let x; / let x = undefined: typed by what the code assigns to it later
    if (isIdentifier(node.name) && !node.type && (!node.initializer || isNilLiteral(node.initializer))) {
      node.type = { kind: 'TnGoType', goType: inferEvolvingLetType(node), parent: node };
    }
    // `const x: any = expr` keeps inference (x := expr) for objects, so their
    // members still dispatch; a primitive stays dynamic (`x - 1` on '6', and x
    // may be reassigned another type); `any` elsewhere is interface{}
    const anyInitType = isAnyTypeNode(node.type) && node.initializer ? inferExpressionType(node.initializer) : undefined;
    const isInferredAny =
      isAnyTypeNode(node.type) && !!node.initializer && !['string', 'float64', 'bool'].includes(anyInitType ?? '');
    let type: string = isInferredAny ? ':' : getType(node.type!);
    // Array aliasing: b = a keeps pointing at the same backing array
    if (
      isIdentifier(node.name) &&
      node.initializer &&
      isIdentifier(unwrapParentheses(node.initializer)) &&
      referenceArrays.has(unwrapParentheses(node.initializer).text)
    ) {
      const srcName = (unwrapParentheses(node.initializer) as AstNode).text;
      const srcType = variableGoTypes.get(srcName) ?? inferExpressionType(node.initializer);
      setVarGoType(node.name.text, srcType?.startsWith('*') ? srcType.slice(1) : srcType);
      const stored = variableGoTypes.get(node.name.text) ?? '*[]interface{}';
      const aliasTop = isVariableStatement(node.parent?.parent) && isSourceFile(node.parent?.parent?.parent);
      if (aliasTop) {
        if (emittingModuleFile) {
          return `var ${getSafeName(node.name.text)} ${stored} = ${getSafeName(srcName)}`;
        }
        mainPackageVariables.push(`var ${getSafeName(node.name.text)} ${stored}`);
        return `${getSafeName(node.name.text)} = ${getSafeName(srcName)}`;
      }
      return `${getSafeName(node.name.text)} := ${getSafeName(srcName)}`;
    }
    // Track variable type for type-aware method dispatch
    if (isIdentifier(node.name)) {
      // A declaration replaces whatever an earlier variable of the same name recorded
      const inferredType =
        node.initializer && (!node.type || isInferredAny)
          ? inferExpressionType(node.initializer)
          : undefined;
      variableTypes.delete(node.name.text);
      variableClassNames.delete(node.name.text);
      narrowedVariables.delete(node.name.text);
      if (node.type && !isInferredAny) variableTypeNodes.set(node.name.text, node.type);
      else variableTypeNodes.delete(node.name.text);
      if (node.initializer && isArrayBufferExpression(node.initializer)) arrayBufferVariables.add(node.name.text);
      else arrayBufferVariables.delete(node.name.text);
      if (node.initializer && isGoRefCall(node.initializer)) goRefVariables.add(node.name.text);
      else goRefVariables.delete(node.name.text);
      if (node.type && !isInferredAny) {
        variableGoTypes.set(node.name.text, getType(node.type));
      } else if (inferredType) {
        variableGoTypes.set(node.name.text, inferredType);
      } else {
        variableGoTypes.delete(node.name.text);
      }
      const cat = node.type ? getTypeCategory(node.type) : undefined;
      if (cat) {
        variableTypes.set(node.name.text, cat);
        if (cat === 'class' && node.type) {
          const className = getClassNameFromTypeNode(node.type);
          if (className) {
            variableClassNames.set(node.name.text, className);
          }
        }
      } else if (
        node.initializer &&
        isNewExpression(node.initializer) &&
        isIdentifier(node.initializer.expression)
      ) {
        if (node.initializer.expression.text === 'RegExp') {
          variableTypes.set(node.name.text, 'RegExp');
        } else if (node.initializer.expression.text === 'Date') {
          variableTypes.set(node.name.text, 'Date');
        } else if (classNames.has(node.initializer.expression.text)) {
          variableTypes.set(node.name.text, 'class');
          variableClassNames.set(node.name.text, node.initializer.expression.text);
        }
      } else if (node.initializer && isRegularExpressionLiteral(node.initializer)) {
        variableTypes.set(node.name.text, 'RegExp');
      }
      // Array-typed variables hold references (*[]T)
      if (node.type && !isInferredAny) {
        setVarGoType(node.name.text, getType(node.type));
      } else if (inferredType) {
        setVarGoType(node.name.text, inferredType);
      } else {
        setVarGoType(node.name.text, undefined);
      }
      if (referenceArrays.has(node.name.text) && type.startsWith('[]')) {
        type = variableGoTypes.get(node.name.text)!;
      }
      // const v = undefined / void 0: Go cannot infer a type from nil
      if (type === ':' && inferredType === 'nil') {
        type = 'interface{}';
        setVarGoType(node.name.text, 'interface{}');
      }
    }
    let initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
    // Wrap non-nil values assigned to nullable primitive pointer types
    // Only wrap for primitive pointers (*string, *float64, *bool), not class pointers
    if (node.initializer && (type.startsWith('*') || isDynamicValue(node.initializer))) {
      initializer = `= ${toGoValueOfType(node.initializer, type)}`;
    }
    // Array references take the address of the fresh array
    if (
      node.initializer &&
      isIdentifier(node.name) &&
      referenceArrays.has(node.name.text) &&
      type === ':'
    ) {
      initializer = `= ${toGoValueOfType(node.initializer, variableGoTypes.get(node.name.text))}`;
    }
    // Package scope has no `:=`: module-level declarations need `var x = expr`
    const isTopLevelStatement =
      isVariableStatement(node.parent?.parent) && isSourceFile(node.parent?.parent?.parent);
    const isPackageScope = emittingModuleFile && isTopLevelStatement;
    // A module's top-level variable is declared at package scope and set when
    // the module's code runs (in order, as in JS: a Go initializer would
    // order — and reject as cycles — closures referring back to it)
    if (isPackageScope && moduleInitAssignments && node.initializer && isIdentifier(node.name)) {
      const knownType = type === ':' ? variableGoTypes.get(node.name.text) : type;
      if (knownType && knownType !== 'nil' && knownType !== ':') {
        ensureGoTypePackages(knownType);
        const name = getSafeName(node.name.text);
        moduleInitAssignments.push(`${name} ${initializer}`);
        return `var ${name} ${goLocalType(knownType)}`;
      }
    }
    if (type === ':' && isPackageScope) {
      return `var ${getSafeName(node.name.text)} ${initializer}`;
    }
    const isMainTopLevel = !emittingModuleFile && isTopLevelStatement;
    const packageType = type === ':' ? variableGoTypes.get(node.name.text) : type;
    if (isMainTopLevel && packageType && packageType !== 'nil' && isIdentifier(node.name)) {
      const name = getSafeName(node.name.text);
      ensureGoTypePackages(packageType);
      mainPackageVariables.push(`var ${name} ${goLocalType(packageType)}`);
      return initializer ? `${name} ${initializer}` : '';
    }
    const declName = isIdentifier(node.name) ? getSafeName(node.name.text) : visit(node.name);
    // const f = (…) => … f(…) … / const id = setInterval(() => clearInterval(id)):
    // a Go closure can't see the variable in its own :=, so declare first, then assign
    if (
      type === ':' &&
      isIdentifier(node.name) &&
      containsNode(node.initializer, (n) => isIdentifier(n) && n.text === node.name.text && !isFieldNameIdentifier(n))
    ) {
      const initType = inferExpressionType(node.initializer) ?? '';
      ensureGoTypePackages(initType);
      return `var ${declName} ${goLocalType(initType)}\n\t\t${declName} ${initializer}`;
    }
    const emitType = type === ':' ? type : goLocalType(type);
    if (type !== ':') ensureGoTypePackages(type);
    // a local JS never reads is fine; Go rejects it unless it is used
    const loopHeader = node.parent?.parent;
    const inLoopHeader = !!loopHeader && (isForStatement(loopHeader) || isForOfStatement(loopHeader) || isForInStatement(loopHeader));
    const markUsed = !isPackageScope && !isMainTopLevel && !options.inline && !inLoopHeader && isIdentifier(node.name) ? `;\n\t\t_ = ${declName}` : '';
    return `${type === ':' ? '' : 'var '}${declName} ${emitType}${
      type === ':' ? '' : ' '
    }${initializer}${markUsed}`;
  } else if (node.kind === 'ExpressionWithTypeArguments' && !isHeritageType(node)) {
    // f<T> as a value (an instantiation expression): f
    return visit(node.expression);
  } else if (isCallExpression(node) && node.expression?.kind === 'ImportKeyword') {
    // import(specifier) of a module not known at compile time: modules are
    // linked into the binary, so the promise rejects (a literal specifier is
    // a static import, see lowerDynamicImports)
    useHelper('promise');
    useHelper('error');
    useHelper('dynamic');
    const specifier = (node.arguments ?? [])[0];
    const spec = specifier ? jsStringOf(visit(specifier), inferExpressionType(specifier)) : '"undefined"';
    return `TnPromiseReject[interface{}](TnNodeError("Error", "ERR_UNSUPPORTED_DYNAMIC_IMPORT", "Cannot import " + ${spec} + ": import() of a module not known at compile time is not supported in native builds"))`;
  } else if (isCallExpression(node) && !node.tnArrayReference && isIdentifier(node.expression) && returnsArrayReference(declaredFunctions.get(node.expression.text))) {
    // a call of an array reference function: the array, where a value is read
    node.tnArrayReference = true;
    const code = visit(node);
    node.tnArrayReference = false;
    return `(*${code})`;
  } else if (isCallExpression(node)) {
    // obj.fn!(…): the non-null assertion has no run-time effect
    while (node.expression?.kind === 'NonNullExpression') {
      node.expression = node.expression.expression;
      node.expression.parent = node;
    }
    // seq.at(i) / super.push(x) on an Array subclass: an Array method (one
    // the class doesn't declare itself) works on the elements
    if (isPropertyAccessExpression(node.expression) && node.expression.expression.kind !== 'TnArrayItems') {
      const arrayClass = arraySubclassOf(node.expression.expression);
      const method = node.expression.name.text;
      const ownMethod = node.expression.expression.kind === 'SuperKeyword'
        ? classDeclaresMethod(classParentNames.get(arrayClass) ?? '', method)
        : classDeclaresMethod(arrayClass, method);
      if (arrayClass && !ownMethod && method !== 'toString' && method !== 'constructor') {
        node.expression.expression = arrayItemsNode(node.expression.expression);
      }
    }
    const firstIteration = visitFirstIteration(node);
    if (firstIteration !== undefined) return firstIteration;
    const mockableCall = visitMockableCall(node);
    if (mockableCall !== undefined) return mockableCall;
    if (
      hasQuestionDot(node) ||
      (isPropertyAccessExpression(node.expression) && hasQuestionDot(node.expression))
    ) {
      return visitOptionalCall(node);
    }
    if (isPropertyAccessExpression(node.expression) && isOptionalChain(node.expression.expression)) {
      const receiverType = inferExpressionType(node.expression.expression);
      if (receiverType && NULLABLE_PRIMITIVE_TYPES.includes(receiverType)) {
        return visitNullablePrimitiveOptionalCall(node, visit(node.expression.expression), receiverType);
      }
    }
    const typedArrayCall = visitTypedArrayCall(node);
    if (typedArrayCall !== undefined) return typedArrayCall;
    const nodeCall = visitNodeCall(node);
    if (nodeCall !== undefined) return nodeCall;
    // (a declaration's initializer is handled by visitEmbedDeclaration)
    const embedCall = embedIntrinsic(node.expression);
    if (embedCall) {
      reportError(node, `embed.${embedCall}() must initialize a top-level variable`);
      return '';
    }
    const goCall = visitGoCall(node);
    if (goCall !== undefined) return goCall;
    // Method call on a Go-typed receiver (pkg.Type value).
    if (isPropertyAccessExpression(node.expression)) {
      const recvType = inferExpressionType(node.expression.expression);
      if (recvType && recvType.startsWith('chan ')) {
        const chanCall = visitGoChanCall(node, visit(node.expression.expression));
        if (chanCall !== undefined) return chanCall;
      }
      if (recvType && goMetaTypeInfo(recvType)) {
        const goMethod = visitGoMethod(node, visit(node.expression.expression), recvType);
        if (goMethod !== undefined) return goMethod;
      }
    }
    const recordCall = visitRecordFunctionCall(node);
    if (recordCall) return recordCall;
    const dynamicCall = visitDynamicMethodCall(node);
    if (dynamicCall) return dynamicCall;
    const dispatched = visitDynamicDispatch(node);
    if (dispatched) return dispatched;
    // f(…) where f holds a function as any (a destructured member of an
    // untyped object, a parameter typed `typeof x`): a reflective call
    // (a local held as any shadows a same-named function elsewhere)
    const dynamicLocal = isIdentifier(node.expression) && variableGoTypes.get(node.expression.text) === 'interface{}';
    if (
      (isIdentifier(node.expression) || isParenthesizedExpression(node.expression)) &&
      (dynamicLocal ||
        (!(isIdentifier(node.expression) && (declaredFunctions.has(node.expression.text) || classNames.has(node.expression.text))) &&
          isDynamicValue(node.expression))) &&
      !(node.arguments ?? []).some((a: AstNode) => isSpreadElement(a))
    ) {
      useHelper('dynamic');
      useHelper('error');
      return `TnCallValue(${[visit(node.expression), ...(node.arguments ?? []).map((a: AstNode) => visit(a))].join(', ')})`;
    }
    const regexReplace = visitRegexReplace(node);
    if (regexReplace) return regexReplace;
    // IIFE with named function expression: (function name() { ... })()
    if (
      isParenthesizedExpression(node.expression) &&
      isFunctionExpression(node.expression.expression)
    ) {
      const fn = node.expression.expression;
      const parameterInfo = getFunctionParametersInfo(fn.parameters ?? []);
      if (fn.body && isBlock(fn.body)) {
        prescanVariableDeclarations(fn.body);
      }
      const inferredRetType = inferFunctionBodyReturnType(fn);
      const returnType = inferredRetType ? ` ${inferredRetType}` : '';
      const args = (node.arguments ?? []).map((a) => visit(a)).join(', ');
      return `func(${parameterInfo.signature})${returnType} ${visit(fn.body!, { prefixBlockContent: parameterInfo.prefixBlockContent }).trimEnd()}(${args})`;
    }
    // Handle setTimeout specially to get raw delay value
    if (isIdentifier(node.expression) && node.expression.text === 'setTimeout') {
      useHelper('timerWait');
      importedPackages.add('time');
      const callback = visit((node.arguments ?? [])[0]);
      const delayNode = (node.arguments ?? [])[1];
      const delay = isNumericLiteral(delayNode) ? delayNode.text : visit(delayNode);
      // Registered on the wait group so the process lives until it fires (or is cleared)
      return `TnSetTimeout(${delay ?? '0'}, func() { (${callback.trim()})() })`;
    }
    // p.then(cb) on a channel-based Promise: wait for the value, run the callback
    if (
      isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'then' &&
      !hasQuestionDot(node.expression)
    ) {
      const recvType = inferExpressionType(node.expression.expression);
      if (recvType?.startsWith('chan ')) {
        const elemType = recvType.slice(5) || 'interface{}';
        const cb = (node.arguments ?? [])[0];
        if (cb && (isArrowFunction(cb) || isFunctionExpression(cb))) {
          for (const p of cb.parameters ?? []) {
            if (isIdentifier(p.name)) {
              variableGoTypes.set(p.name.text, elemType);
              variableTypeNodes.delete(p.name.text);
              variableTypes.delete(p.name.text);
              variableClassNames.delete(p.name.text);
            }
          }
        }
        useHelper('asyncWait');
        const recv = visit(node.expression.expression);
        const cbs = (node.arguments ?? []).map((a) => visit(a));
        const cbExpr = cbs[0] ?? 'func(interface{}) {}';
        useHelper('eventLoop');
        // A callback without parameters (then(() => …)) takes no value
        const takesValue = !(cb && (isArrowFunction(cb) || isFunctionExpression(cb)) && (cb.parameters ?? []).length === 0);
        const receive = takesValue ? `__v := <-__tnP` : `<-__tnP`;
        const invoke = takesValue ? `(${cbExpr})(__v)` : `(${cbExpr})()`;
        // The promise expression is a go-statement argument: it runs now, with
        // the baton (exec() registering its listeners off the loop would race it)
        return `__tnWaitGroup.Add(1)\n\t\tgo func(__tnCtx TnAsyncContext, __tnP ${recvType}) {\n\t\t\t${receive}\n\t\t\tTnLoopPost(func() {\n\t\t\t\tdefer __tnWaitGroup.Done()\n\t\t\t\tTnAsyncRun(__tnCtx, func() { ${invoke} })\n\t\t\t})\n\t\t}(TnAsyncSnapshot(), ${recv})`;
      }
    }
    // Array.from(arrayLike, mapFn) — array-likes are { length } structs
    if (
      isPropertyAccessExpression(node.expression) &&
      isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Array' &&
      node.expression.name.text === 'from'
    ) {
      const sourceNode = (node.arguments ?? [])[0];
      if (isTypedArrayGoType(inferExpressionType(sourceNode)) && (node.arguments ?? []).length === 1) {
        return `${visit(sourceNode)}.tnFloats()`;
      }
      const callbackNode = (node.arguments ?? [])[1];
      const sourceType = inferExpressionType(sourceNode) ?? '';
      const isArrayLikeStruct = sourceType.startsWith('*struct{') && /\blength /.test(sourceType);
      // an iterable (array, Set, Map, string, Array subclass): [...source],
      // mapped like map((v, i) => fn(v, i))
      const iterable =
        sourceType.startsWith('[]') || sourceType.startsWith('*[]') || sourceType.startsWith('*TnMap[') ||
        sourceType === 'string' || !!arraySubclassOf(sourceNode);
      if (iterable && !isArrayLikeStruct) {
        const spread: AstNode = { kind: 'ArrayLiteralExpression', elements: [], parent: node, line: node.line, column: node.column };
        const element: AstNode = { kind: 'SpreadElement', expression: sourceNode, parent: spread };
        spread.elements = [element];
        sourceNode.parent = element;
        if (!callbackNode) return visit(spread);
        const access: AstNode = { kind: 'PropertyAccessExpression', expression: spread, name: { kind: 'Identifier', text: 'map' } };
        const mapped: AstNode = { kind: 'CallExpression', expression: access, arguments: [callbackNode], parent: node.parent, line: node.line, column: node.column };
        spread.parent = access;
        access.parent = mapped;
        callbackNode.parent = mapped;
        return visit(mapped);
      }
      if (!isArrayLikeStruct) {
        useHelper('arraySubclass');
        return `TnToArrayMapped(${visit(sourceNode)}, ${callbackNode ? visit(callbackNode) : 'nil'})`;
      }
      const paramTypes = ['interface{}', 'float64'];
      if (callbackNode && (isArrowFunction(callbackNode) || isFunctionExpression(callbackNode))) {
        (callbackNode.parameters ?? []).forEach((p: AstNode, index: number) => {
          if (isIdentifier(p.name) && paramTypes[index]) variableGoTypes.set(p.name.text, paramTypes[index]);
        });
      }
      const source = visit(sourceNode);
      const cb = callbackNode ? visit(callbackNode) : undefined;
      const srcVar = getTempName('from');
      const iVar = getTempName('i');
      const itemExpr = cb
        ? `(${cb})(${paramTypes.slice(0, (callbackNode?.parameters ?? []).length).map((t, i) => (i === 0 ? 'nil' : `float64(${iVar})`)).join(', ')})`
        : 'nil';
      return `func() []interface{} { ${srcVar} := ${source}; __n := int(${srcVar}.length); __out := make([]interface{}, 0, __n); for ${iVar} := 0; ${iVar} < __n; ${iVar}++ { __out = append(__out, ${itemExpr}) }; return __out }()`;
    }
    const arrayHigherOrderCall = visitArrayHigherOrderCall(node);
    if (arrayHigherOrderCall) {
      return arrayHigherOrderCall;
    }
    const promiseCall = visitPromiseCall(node);
    if (promiseCall) return promiseCall;
    const functionCall = visitFunctionCallApply(node);
    if (functionCall) return functionCall;
    const objectCall = visitObjectCall(node);
    if (objectCall) return objectCall;
    const caller = visit(node.expression);
    const safeCaller = getSafeName(caller);
    // (explicit type arguments for erased type parameters are dropped)
    const calleeDeclaration = isIdentifier(node.expression) ? declaredFunctions.get(node.expression.text) : undefined;
    const erasedParams = calleeDeclaration ? erasedFunctionTypeParameters(calleeDeclaration) : undefined;
    const keptTypeArgs = (node.typeArguments ?? []).filter(
      (_t: AstNode, i: number) => !erasedParams?.has(calleeDeclaration?.typeParameters?.[i]?.name?.text)
    );
    const typeArgs = getTypeArguments(keptTypeArgs);
    // Handle spread arguments: fn(...arr) → fn(arr...)
    const hasSpreadArg = (node.arguments ?? []).some((a) => isSpreadElement(a));
    const args = hasSpreadArg ? visitSpreadCallArguments(node) : visitCallArguments(node);
    // Resolve object type for type-aware method dispatch
    let objectType: string | undefined;
    if (isPropertyAccessExpression(node.expression)) {
      // super.m(): the parent class's method (never a built-in's handler)
      objectType = node.expression.expression.kind === 'SuperKeyword' ? 'class' : resolveExpressionType(node.expression.expression);
    }
    currentCallArgTypes = (node.arguments ?? []).map((a: AstNode) => inferExpressionType(a));
    if (!hasSpreadArg && (objectType === 'string' || objectType === 'array')) {
      coerceBuiltinMethodArguments(node, objectType, args, currentCallArgTypes);
    }
    if (!hasSpreadArg) coerceNumericGlobalArguments(node, args, currentCallArgTypes);
    currentCallArgNodes = node.arguments ?? [];
    currentCallNode = node;
    currentReceiverGoType = isPropertyAccessExpression(node.expression)
      ? inferExpressionType(node.expression.expression)
      : undefined;
    return getCallString(safeCaller, args, typeArgs, objectType);
  } else if (isPrefixUnaryExpression(node)) {
    if (node.operator === 'ExclamationToken') {
      return `!${wrapCondition(toGoCondition(node.operand))}`;
    }
    if (isIncrementOrDecrement(node)) return visitIncrementOrDecrement(node, true);
    // +date / -date: the time value in milliseconds
    if ((node.operator === 'PlusToken' || node.operator === 'MinusToken') && inferExpressionType(node.operand) === 'time.Time') {
      return `${node.operator === 'MinusToken' ? '-' : ''}float64(${visit(node.operand)}.UnixMilli())`;
    }
    if (node.operator === 'TildeToken' && inferExpressionType(node.operand) === '*tnbig.Int') {
      useHelper('bigint');
      return `new(tnbig.Int).Not(${visit(node.operand)})`;
    }
    if (node.operator === 'TildeToken') {
      useHelper('dynamic');
      return `float64(^TnInt32(${visit(node.operand)}))`;
    }
    // -10n / -x on bigints (*big.Int)
    if (node.operator === 'MinusToken' && node.operand.kind === 'BigIntLiteral') {
      useHelper('bigint');
      return `TnBigInt("-${String(node.operand.text).replace(/n$/, '')}")`;
    }
    if (node.operator === 'MinusToken' && inferExpressionType(node.operand) === '*tnbig.Int') {
      return `new(tnbig.Int).Neg(${visit(node.operand)})`;
    }
    // -0: Go constant arithmetic has no negative zero
    if (node.operator === 'MinusToken' && isNumericLiteral(node.operand) && Number(node.operand.text) === 0) {
      importedPackages.add('math');
      return 'math.Copysign(0, -1)';
    }
    return `${getOperatorText(node.operator)}${visit(node.operand)}`;
  } else if (isPostfixUnaryExpression(node)) {
    return visitIncrementOrDecrement(node, false);
  } else if (node.kind === 'VoidExpression') {
    // void expr evaluates expr and gives undefined
    if (isNumericLiteral(node.expression)) return 'nil';
    return `func() interface{} { _ = ${visit(node.expression)}; return nil }()`;
  } else if (node.kind === 'SatisfiesExpression') {
    return visit(node.expression);
  } else if (node.kind === 'DeleteExpression') {
    return visitDelete(node);
  } else if (node.kind === 'TypeOfExpression') {
    return visitTypeOf(node);
  } else if (isConditionalExpression(node)) {
    return visitConditionalExpression(node);
  } else if (isBinaryExpression(node)) {
    if (node.operatorToken.kind === 'QuestionQuestionToken') {
      return visitNullishCoalescingExpression(node);
    }
    // seq[i] = v / seq.length = n on an Array subclass: its elements
    if (isElementAccessExpression(node.left) && node.left.expression.kind !== 'TnArrayItems' && arraySubclassOf(node.left.expression) && !isStringLiteral(node.left.argumentExpression)) {
      node.left.expression = arrayItemsNode(node.left.expression);
    }
    if (node.operatorToken.kind === 'EqualsToken' && isPropertyAccessExpression(node.left) && node.left.name.text === 'length' && arraySubclassOf(node.left.expression)) {
      return `${visit(node.left.expression)}.Set_length(${visit(node.right)})`;
    }
    // o.x += v / o[k] ??= v on a dynamic object: read, combine, write back
    const compoundTarget = unwrapParentheses(node.left);
    if (
      ASSIGNMENT_OPERATORS.has(node.operatorToken.kind) && node.operatorToken.kind !== 'EqualsToken' && isDiscardedValue(node) &&
      (isPropertyAccessExpression(compoundTarget) || isElementAccessExpression(compoundTarget)) &&
      !hasQuestionDot(compoundTarget) && hasDynamicProperties(compoundTarget.expression)
    ) {
      return visitDynamicCompoundAssignment(node, compoundTarget);
    }
    // a, b: both run, the value is b's
    if (node.operatorToken.kind === 'CommaToken') {
      discardedExpressions.add(node.left);
      const first = visit(node.left);
      if (isDiscardedValue(node)) {
        discardedExpressions.add(node.right);
        return `${first}; ${visit(node.right)}`;
      }
      return `func() ${inferExpressionType(node.right) ?? 'interface{}'} { ${first}; return ${visit(node.right)} }()`;
    }
    // An assignment whose value is used (`while ((ch = s[++i]))`, `f(x = 1)`):
    // assign, then read the target back
    if (ASSIGNMENT_OPERATORS.has(node.operatorToken.kind) && !isDiscardedValue(node)) {
      discardedExpressions.add(node);
      const statement = visit(node);
      discardedExpressions.delete(node);
      const targetType = inferExpressionType(node.left) ?? 'interface{}';
      // (an array reference that may now hold null reads as a nil slice)
      const read = isIdentifier(node.left) && referenceArrays.has(node.left.text) && mayHoldNullArray(node.left)
        ? (useHelper('dynamic'), `TnDerefSlice(${getSafeName(node.left.text)})`)
        : visit(node.left);
      return `func() ${targetType} { ${statement}; return ${read} }()`;
    }
    if (
      node.operatorToken.kind === 'InstanceOfKeyword' &&
      isIdentifier(node.right) &&
      (node.right.text === 'Error' || BUILTIN_ERROR_NAMES.has(node.right.text)) &&
      !classNames.has(node.right.text)
    ) {
      useHelper('error');
      return `TnIsErrorOf(${visit(node.left)}, ${toGoStringLiteral(node.right.text)})`;
    }
    if (node.operatorToken.kind === 'InstanceOfKeyword' && isIdentifier(node.right) && !classNames.has(node.right.text)) {
      // x instanceof Int32Array / URL / …: a Node global class's Go type
      const nodeClassKey = nodeClassKeyOfName(node.right.text);
      const nodeClass = nodeClassKey ? nodeRegistry.classes[nodeClassKey] : undefined;
      if (nodeClass) {
        return `func() bool { _, ok := interface{}(${visit(node.left)}).(${nodeClass.goType}); return ok }()`;
      }
    }
    if (node.operatorToken.kind === 'InstanceOfKeyword' && isIdentifier(node.right) && !classNames.has(node.right.text)) {
      const builtinCheck = builtinInstanceOf(visit(node.left), node.right.text);
      if (builtinCheck) return builtinCheck;
    }
    if (node.operatorToken.kind === 'InstanceOfKeyword' && isIdentifier(node.right) && node.right.text === 'Object' && !classNames.has('Object')) {
      useHelper('classes');
      useHelper('dynamic');
      return `TnIsObject(${visit(node.left)})`;
    }
    // x instanceof X, X holding a class value
    if (node.operatorToken.kind === 'InstanceOfKeyword' && (!isIdentifier(node.right) || (!classNames.has(node.right.text) && isDynamicValue(node.right)))) {
      useHelper('classes');
      return `TnInstanceOf(${visit(node.left)}, ${visit(node.right)})`;
    }
    if (node.operatorToken.kind === 'InstanceOfKeyword' && isIdentifier(node.right)) {
      // x instanceof C: the runtime type is C's pointer type, or a subclass's
      const rightClass: string = node.right.text;
      const targets = [rightClass, ...subclassNames(rightClass)].map((c) => `*${getSafeName(c)}`);
      if (targets.length === 1) {
        return `func() bool { _, ok := interface{}(${visit(node.left)}).(${targets[0]}); return ok }()`;
      }
      return `func() bool { switch interface{}(${visit(node.left)}).(type) { case ${targets.join(', ')}: return true }; return false }()`;
    }
    // Symbol.iterator in x: whether x is iterable
    if (
      node.operatorToken.kind === 'InKeyword' &&
      isPropertyAccessExpression(node.left) && isIdentifier(node.left.expression) &&
      node.left.expression.text === 'Symbol' && node.left.name.text === 'iterator'
    ) {
      useHelper('iterable');
      return `TnIsIterable(${visit(node.right)})`;
    }
    if (node.operatorToken.kind === 'InKeyword') {
      // #x in obj: obj was built by the class declaring #x (or a subclass)
      if (node.left.kind === 'PrivateIdentifier') {
        const owner = privateNameOwner(node, node.left.text);
        if (owner) {
          const targets = [owner, ...subclassNames(owner)].map((c) => `*${getSafeName(c)}`);
          return `func() bool { switch interface{}(${visit(node.right)}).(type) { case ${targets.join(', ')}: return true }; return false }()`;
        }
      }
      if (isProcessEnv(node.right)) {
        useHelper('nodeProcess');
        return `TnHasEnv(${visit(node.left)})`;
      }
      // a dynamic value, or a typed object (a class instance, a struct): by
      // property name (an unset field is absent)
      const rightType = inferExpressionType(node.right) ?? '';
      if (isDynamicValue(node.right) || !rightType.startsWith('*TnMap[')) {
        useHelper('dynamic');
        return `TnHas(interface{}(${visit(node.right)}), ${visit(node.left)})`;
      }
      return `${visit(node.right)}.Has(${visit(node.left)})`;
    }
    if (isLogicalOperator(node.operatorToken)) {
      const logical = visitLogicalExpression(node);
      if (logical) return logical;
    }
    // x ??= v → assign only when x is nil
    if (node.operatorToken.kind === 'BarBarEqualsToken' || node.operatorToken.kind === 'AmpersandAmpersandEqualsToken') {
      // a ||= b assigns when a is falsy; a &&= b when a is truthy
      const target = visit(node.left);
      const condition = toGoCondition(node.left);
      const value = toGoValueOfType(node.right, inferExpressionType(node.left));
      const test = node.operatorToken.kind === 'BarBarEqualsToken' ? `!${wrapCondition(condition)}` : condition;
      return `if ${test} { ${target} = ${value} }`;
    }
    if (node.operatorToken.kind === 'QuestionQuestionEqualsToken') {
      const target = visit(node.left);
      const value = toGoValueOfType(node.right, inferExpressionType(node.left));
      return `if ${target} == nil { ${target} = ${value} }`;
    }
    let op = operatorTokenText(node.operatorToken);
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    // Go's % is not defined on float64 (TS numbers all map to float64)
    if (op === '/' && isNumericLiteral(node.right) && Number(node.right.text) === 0) {
      return `func(a, b float64) float64 { return a / b }(${visit(node.left)}, ${visit(node.right)})`;
    }
    const bitwise = visitBitwise(node, op);
    if (bitwise) return bitwise;
    // BigInt arithmetic and comparisons (*big.Int)
    const bigLeft = inferExpressionType(node.left);
    const bigRight = inferExpressionType(node.right);
      if (bigLeft === '*tnbig.Int' || bigRight === '*tnbig.Int') {
      useHelper('bigint');
      let bl = visit(node.left);
      let br = visit(node.right);
      // number | bigint values (node:sqlite's changes): === is true only for an
      // equal bigint; other operators convert the dynamic side
      const dynamicSide = bigLeft === 'interface{}' ? bl : bigRight === 'interface{}' ? br : '';
      if (dynamicSide) {
        const bigSide = dynamicSide === bl ? br : bl;
        if (op === '==') return `TnBigSame(${dynamicSide}, ${bigSide})`;
        if (op === '!=') return `!TnBigSame(${dynamicSide}, ${bigSide})`;
        if (dynamicSide === bl) bl = `TnToBigInt(${bl})`;
        else br = `TnToBigInt(${br})`;
      }
      if (op === '==') return `${bl}.Cmp(${br}) == 0`;
      if (op === '!=') return `${bl}.Cmp(${br}) != 0`;
      if (op === '<') return `${bl}.Cmp(${br}) < 0`;
      if (op === '>') return `${bl}.Cmp(${br}) > 0`;
      if (op === '<=') return `${bl}.Cmp(${br}) <= 0`;
      if (op === '>=') return `${bl}.Cmp(${br}) >= 0`;
      useHelper('bigint');
    if (op === '+') return `new(tnbig.Int).Add(${bl}, ${br})`;
      if (op === '-') return `new(tnbig.Int).Sub(${bl}, ${br})`;
      if (op === '*') return `new(tnbig.Int).Mul(${bl}, ${br})`;
      if (op === '/') return `new(tnbig.Int).Div(${bl}, ${br})`;
      if (op === '%') return `new(tnbig.Int).Rem(${bl}, ${br})`;
      if (op === '**') return `new(tnbig.Int).Exp(${bl}, ${br}, nil)`;
    }
    // number | undefined operands: undefined reads as NaN (`w > 0` is false)
    if (
      (bigLeft === '*float64' || bigRight === '*float64') &&
      ['<', '>', '<=', '>=', '-', '*', '/', '%', '**', '+'].includes(op) &&
      !(op === '+' && (bigLeft === 'string' || bigRight === 'string'))
    ) {
      useHelper('numTruthy');
      const operand = (side: AstNode, goType: string | undefined): string =>
        goType === '*float64' ? `TnNumPtr(${visit(side)})` : goType === 'interface{}' ? `TnNumber(${visit(side)})` : visit(side);
      if (isDynamicGoType(bigLeft) || isDynamicGoType(bigRight)) useHelper('dynamic');
      const l = operand(node.left, bigLeft);
      const r = operand(node.right, bigRight);
      if (op === '%') {
        importedPackages.add('math');
        return `math.Mod(${l}, ${r})`;
      }
      if (op === '**') {
        importedPackages.add('math');
        return `math.Pow(${l}, ${r})`;
      }
      return `${l} ${op} ${r}`;
    }
    // String enum members (type E string) concatenate as strings
    if (op === '+' && [bigLeft, bigRight].some((t) => !!t && enumBaseTypes.get(t) === 'string')) {
      const asString = (side: AstNode, goType: string | undefined): string =>
        goType && enumBaseTypes.get(goType) === 'string' ? `string(${visit(side)})` : visit(side);
      const bothEnums = [bigLeft, bigRight].every((t) => !!t && enumBaseTypes.get(t) === 'string');
      if (bigLeft === 'string' || bigRight === 'string' || bothEnums) {
        return `${asString(node.left, bigLeft)} + ${asString(node.right, bigRight)}`;
      }
    }
    // Dates in arithmetic and ordering compare their time values (b - a, d1 < d2)
    if (
      (bigLeft === 'time.Time' || bigRight === 'time.Time') &&
      ['-', '*', '/', '%', '**', '<', '>', '<=', '>='].includes(op)
    ) {
      const asMillis = (side: AstNode, goType: string | undefined): string =>
        goType === 'time.Time' ? `float64(${visit(side)}.UnixMilli())` : visit(side);
      const dl = asMillis(node.left, bigLeft);
      const dr = asMillis(node.right, bigRight);
      if (op === '%') {
        importedPackages.add('math');
        return `math.Mod(${dl}, ${dr})`;
      }
      if (op === '**') {
        importedPackages.add('math');
        return `math.Pow(${dl}, ${dr})`;
      }
      return `${dl} ${op} ${dr}`;
    }
    if (op === '**') {
      importedPackages.add('math');
      return `math.Pow(${visit(node.left)}, ${visit(node.right)})`;
    }
    // Named Go numerics (time.Duration): coerce the float64 side so Go's
    // operator type-checks (time.Second * 2 → time.Second * time.Duration(2)).
    if (['<', '>', '<=', '>=', '-', '*', '/', '+', '+=', '-=', '*=', '/='].includes(op)) {
      const numericCoercion = visitGoNumericArithmetic(node, op);
      if (numericCoercion) return numericCoercion;
    }
    // x.Kind() === reflect.String: the method result reads as a number
    if (op === '==' || op === '!=') {
      const numericEquality = visitGoNumericArithmetic(node, op);
      if (numericEquality) return numericEquality;
    }
    if (op === '**=') {
      importedPackages.add('math');
      const target = visit(node.left);
      return `${target} = math.Pow(${target}, ${visit(node.right)})`;
    }
    if (op === '%') {
      importedPackages.add('math');
      return `math.Mod(${visit(node.left)}, ${visit(node.right)})`;
    }
    if (op === '%=') {
      importedPackages.add('math');
      const left = visit(node.left);
      return `${left} = math.Mod(${left}, ${visit(node.right)})`;
    }
    if (['<', '>', '<=', '>=', '-', '*', '/', '+', '+=', '-=', '*=', '/='].includes(op)) {
      const dynamicArithmetic = visitDynamicArithmetic(node, op);
      if (dynamicArithmetic) return dynamicArithmetic;
    }
    if (op === '==' || op === '!=') {
      // any values: JS equality (objects by identity) without Go's uncomparable-type panic
      if (
        (isDynamicValue(node.left) || isDynamicValue(node.right)) &&
        !isNilLiteral(node.left) &&
        !isNilLiteral(node.right)
      ) {
        useHelper('dynamic');
        // == / != coerce primitives; === / !== don't
        const loose = node.operatorToken.kind === 'EqualsEqualsToken' || node.operatorToken.kind === 'ExclamationEqualsToken';
        const same = `${loose ? 'TnLooseEqual' : 'TnSame'}(${visit(node.left)}, ${visit(node.right)})`;
        return op === '==' ? same : `!${same}`;
      }
      // x == null on an interface{} value or an optional chain (emitted as
      // interface{}): a nil pointer inside it is nullish too
      const nilOther = isNilLiteral(node.right) ? node.left : isNilLiteral(node.left) ? node.right : undefined;
      const optionalChain = !!nilOther && (hasQuestionDot(nilOther) || (isCallExpression(nilOther) && hasQuestionDot(nilOther.expression)));
      if (nilOther && !isNilLiteral(nilOther) && (optionalChain || inferExpressionType(nilOther) === 'interface{}')) {
        useHelper('dynamic');
        // (x === undefined is false for null)
        const strict = node.operatorToken.kind === 'EqualsEqualsEqualsToken' || node.operatorToken.kind === 'ExclamationEqualsEqualsToken';
        const nilNode = nilOther === node.left ? node.right : node.left;
        const test = strict && unwrapParentheses(nilNode).kind !== 'NullKeyword' ? 'TnIsUndefined' : 'TnIsNil';
        return `${op === '!=' ? '!' : ''}${test}(${visit(nilOther)})`;
      }
      const nullableComparison = visitNullableComparison(node, op);
      if (nullableComparison) return nullableComparison;
      // A value type (string, number, struct…) is never null/undefined
      const otherSide = isNilLiteral(node.right) ? node.left : isNilLiteral(node.left) ? node.right : undefined;
      const otherType = otherSide ? inferExpressionType(otherSide) : undefined;
      if (otherType && otherType !== 'nil' && !isNilableGoType(otherType)) {
        return op === '!=' ? 'true' : 'false';
      }
      // JS loose equality across primitive types (ToNumber coercion)
      const leftType = inferExpressionType(node.left);
      const rightType = inferExpressionType(node.right);
      const hasBool = leftType === 'bool' || rightType === 'bool';
      const hasNumberOrString =
        leftType === 'float64' || leftType === 'string' || rightType === 'float64' || rightType === 'string';
      if (hasBool && hasNumberOrString) {
        const boolNode = leftType === 'bool' ? node.left : node.right;
        useHelper('dynamic');
        const eq = `TnNumber(${visit(boolNode)}) == ${visit(leftType === 'bool' ? node.right : node.left)}`;
        return op === '==' ? eq : `!(${eq})`;
      }
      if (
        (leftType === 'string' && rightType === 'float64') ||
        (leftType === 'float64' && rightType === 'string')
      ) {
        const strNode = leftType === 'string' ? node.left : node.right;
        const numNode = leftType === 'string' ? node.right : node.left;
        useHelper('dynamic');
        const eq = `TnParseFloat(${visit(strNode)}) == ${visit(numNode)}`;
        return op === '==' ? eq : `!(${eq})`;
      }
    }
    // new.target === C → the target class name is C's
    if ((op === '==' || op === '!=') && (isNewTargetNode(node.left) || isNewTargetNode(node.right))) {
      const other = isNewTargetNode(node.left) ? node.right : node.left;
      return `__newTarget ${op} ${isIdentifier(other) ? toGoStringLiteral(other.text) : '""'}`;
    }
    const nodeAssignment = visitNodeAssignment(node);
    if (nodeAssignment !== undefined) return nodeAssignment;
    const goFieldAssignment = visitGoFieldAssignment(node, op);
    if (goFieldAssignment !== undefined) return goFieldAssignment;
    // ta[i] = v / ta[i] op= v on a typed array: Set converts to the element type
    if (isElementAccessExpression(node.left) && isTypedArrayGoType(inferExpressionType(node.left.expression))) {
      const typedAssignment = visitTypedArrayAssignment(node.left, op, node.right);
      if (typedAssignment !== undefined) return typedAssignment;
    }
    // buf[i] = v on a Buffer / Uint8Array: bytes wrap modulo 256
    if (op === '=' && isElementAccessExpression(node.left) && inferExpressionType(node.left.expression) === '[]byte') {
      useHelper('buffer');
      return `${visit(node.left.expression)}[int(${visit(node.left.argumentExpression)})] = TnByte(${visit(node.right)})`;
    }
    // obj[key] = v on a class instance or typed object: a switch over its fields
    if (op === '=' && isElementAccessExpression(node.left) && !isStringLiteral(node.left.argumentExpression)) {
      const objectGoType = inferExpressionType(node.left.expression);
      if (objectGoType && isFieldObjectType(objectGoType) && inferExpressionType(node.left.argumentExpression) !== 'float64') {
        const fieldNames = objectFieldNames(objectGoType);
        if (fieldNames.length > 0) {
          useHelper('dynamic');
          const cases = fieldNames.map(
            (f) => `case ${toGoStringLiteral(f)}: o.${goFieldName(f)} = TnAs[${getObjectFieldGoType(objectGoType, f) ?? 'interface{}'}](v)`
          );
          return `func(o ${objectGoType}, k string, v interface{}) { switch k { ${cases.join('; ')} } }(${visit(node.left.expression)}, ${toGoValueOfType(node.left.argumentExpression, 'string')}, ${visit(node.right)})`;
        }
      }
    }
    // arr[i] = v on an array: writing past the end grows it, as in JS
    if (op === '=' && isElementAccessExpression(node.left) && isExpressionStatement(node.parent)) {
      const growing = visitGrowingArrayWrite(node.left, node.right);
      if (growing) return growing;
    }
    // obj[key] = v on any
    if (op === '=' && isElementAccessExpression(node.left) && isDynamicValue(node.left.expression)) {
      useHelper('dynamic');
      return `TnSetIndex(${visit(node.left.expression)}, ${visit(node.left.argumentExpression)}, ${visit(node.right)})`;
    }
    if (op === '=' && isPropertyAccessExpression(node.left) && isDynamicValue(node.left.expression)) {
      useHelper('dynamic');
      return `TnSet(${visit(node.left.expression)}, "${node.left.name.text}", ${visit(node.right)})`;
    }
    // Class setter writes are accessor calls: c.v = x → c.Set_v(x)
    if (op === '=' && isPropertyAccessExpression(node.left)) {
      const ownerGoType = inferExpressionType(node.left.expression);
      // Object-literal setters are Set_x closure fields
      const literalSetter = `Set_${goFieldName(node.left.name.text)} func(`;
      if (ownerGoType?.startsWith('*struct{') && ownerGoType.includes(literalSetter)) {
        return `${visit(node.left.expression)}.Set_${goFieldName(node.left.name.text)}(${visit(node.right)})`;
      }
      const setterClass =
        ownerGoType?.startsWith('*') && !ownerGoType.startsWith('*TnMap[') && !ownerGoType.includes('struct{')
          ? ownerGoType.slice(1).replace(/\[.*\]$/, '')
          : node.left.expression.kind === 'ThisKeyword'
            ? getEnclosingClassName(node)
            : undefined;
      const setterName = memberKey(node.left.name);
      if (setterClass && classSetterMethods.has(`${setterClass}.${setterName}`)) {
        return `${visit(node.left.expression)}.Set_${visit(node.left.name)}(${visit(node.right)})`;
      }
    }
    // m[k] = v on an ordered map
    if (isElementAccessExpression(node.left) && isAssignmentTarget(node.left)) {
      const mapType = inferExpressionType(node.left.expression);
      if (mapType?.startsWith('*TnMap[')) {
        const map = visit(node.left.expression);
        const key = toGoValueOfType(node.left.argumentExpression, extractMapKeyType(mapType));
        const value =
          op === '='
            ? toGoValueOfType(node.right, extractMapValueType(mapType))
            : `${map}.Get(${key}) ${op.slice(0, -1)} ${visit(node.right)}`;
        return `${map}.Set(${key}, ${value})`;
      }
    }
    // arr.length = n truncates the slice
    if (
      op === '=' &&
      isPropertyAccessExpression(node.left) &&
      node.left.name.text === 'length' &&
      inferExpressionType(node.left.expression)?.startsWith('[]')
    ) {
      const array = visit(node.left.expression);
      return `${array} = ${array}[:int(${visit(node.right)})]`;
    }
    // obj.field = v: the value converts to the field's type (boxed into a
    // nullable field, asserted from a dynamic value)
    if (op === '=' && isPropertyAccessExpression(node.left) && !isDynamicValue(node.left.expression) && !hasQuestionDot(node.left)) {
      const target = visit(node.left);
      // (a member the emitter reads dynamically is written dynamically)
      if ((target.startsWith('TnGet(') || target.startsWith('TnGetRef('))) {
        useHelper('dynamic');
        return `TnSet(${visit(node.left.expression)}, ${toGoStringLiteral(node.left.name.text)}, ${visit(node.right)})`;
      }
      const fieldType = inferExpressionType(node.left);
      if (fieldType && fieldType !== 'interface{}') return `${target} = ${toGoValueOfType(node.right, fieldType)}`;
    }
    // Assigning to a typed variable converts the value (boxes it into a
    // nullable primitive, asserts a dynamic one …)
    if (op === '=' && isIdentifier(node.left)) {
      let leftType = variableGoTypes.get(node.left.text);
      // (an array variable that is not an array reference holds the slice)
      if (leftType?.startsWith('*[]') && !referenceArrays.has(node.left.text)) leftType = leftType.slice(1);
      if (leftType && leftType !== 'interface{}' && leftType !== ':') {
        const target = referenceArrays.has(node.left.text) ? getSafeName(node.left.text) : visit(node.left);
        return `${target} = ${toGoValueOfType(node.right, leftType)}`;
      }
    }
    if (op === '&&' || op === '||') {
      const right = withNarrowing(getNarrowedNames(node.left, op === '&&'), () => visit(node.right));
      return `${visit(node.left)} ${op} ${right}`;
    }
    if (op === '+') {
      const leftType = inferExpressionType(node.left);
      const rightType = inferExpressionType(node.right);
      if (leftType === 'string' && rightType !== 'string') {
        return `${visit(node.left)} + ${jsStringOf(visit(node.right), rightType)}`;
      }
      if (rightType === 'string' && leftType !== 'string') {
        return `${jsStringOf(visit(node.left), leftType)} + ${visit(node.right)}`;
      }
    }
    // x += y on a dynamic (any) variable: JS's + (concatenation or sum)
    if (op === '+=' && isIdentifier(node.left) && variableGoTypes.get(node.left.text) === 'interface{}') {
      useHelper('dynamic');
      return `${visit(node.left)} = TnDynamicAdd(${visit(node.left)}, ${visit(node.right)})`;
    }
    // s += n on a string: the value converts as JS renders it
    if (op === '+=' && inferExpressionType(node.left) === 'string') {
      const rightType = inferExpressionType(node.right);
      if (rightType !== 'string') return `${visit(node.left)} += ${jsStringOf(visit(node.right), rightType)}`;
    }
    return `${visit(node.left)} ${op} ${visit(node.right)}`;
  } else if (isParenthesizedExpression(node)) {
    return `(${visit(node.expression)})`;
  } else if (node.kind === 'YieldExpression') {
    // Inside a generator: yield sends the value over the generator's channel
    if (asyncChannelVar && getEnclosingFunction(node) === asyncFunctionNode) {
      if (node.asteriskToken) {
        // yield* other(): forward every value of the delegated generator
        return `for __yv := range ${visit(node.expression)} {\n\t\t\t${asyncChannelVar} <- __yv\n\t\t}`;
      }
      return `${asyncChannelVar} <- ${visit(node.expression ?? 'nil')}`;
    }
    return '';
  } else if (isAwaitExpression(node)) {
    // Promises are channels: the await keeps the event loop running while it
    // waits (a bare receive would block it). Inside an async function body —
    // a goroutine of its own — TnAwait parks for the ordered wake (promise
    // continuations resume in settlement order); an await in code running
    // inline on the loop goroutine (an async callback) must keep draining the
    // loop itself
    useHelper('promise');
    const awaitFn =
      asyncChannelVar && asyncChannelIsAsync && getEnclosingFunction(node) === asyncFunctionNode
        ? 'TnAwait'
        : 'TnAwaitInline';
    // a value that may or may not be a promise (any): awaited when it is one
    const awaitedType = inferExpressionType(node.expression);
    if (awaitedType && !awaitedType.startsWith('chan ')) {
      useHelper('dynamic');
      return `TnAwaitValue(interface{}(${visit(node.expression)}), ${awaitFn === 'TnAwaitInline'})`;
    }
    return `${awaitFn}(${visit(node.expression)})`;
  } else if (isVariableDeclarationList(node)) {
    return (
      (node.declarations ?? []).map((n) => visit(n)).join(options.inline ? ';' : ';\n\t') +
      (options.inline ? '' : ';\n\t')
    );
  } else if (isExpressionStatement(node)) {
    // A detached top-level async call keeps the process alive until it settles
    const exprStmt = node.expression;
    if (
      isCallExpression(exprStmt) &&
      isIdentifier(exprStmt.expression) &&
      asyncFunctionNames.has(exprStmt.expression.text) &&
      !emittingModuleFile
    ) {
      useHelper('asyncWait');
      useHelper('promise');
      return `__tnWaitGroup.Add(1)\n\t\tTnDetach(${visit(exprStmt)});\n\t`;
    }
    return visit(node.expression) + (options.inline ? '' : ';\n\t');
  } else if (isForStatement(node)) {
    const multi = visitMultiForHeader(node);
    if (multi) return multi;
    return `for ${node.initializer ? forHeaderInit(visit(node.initializer, { inline: true })) : ''}; ${
      node.condition ? toGoCondition(node.condition) : ''
    }; ${node.incrementor ? visit(node.incrementor, { inline: true }) : ''}${visitLoopBody(node.statement)}`;
  } else if (isForInStatement(node)) {
    const varName = isVariableDeclarationList(node.initializer)
      ? visit(node.initializer.declarations[0].name)
      : visit(node.initializer as AstNode);
    const forInType = inferExpressionType(node.expression) ?? '';
    // objects (structs, dynamic values): their own property names
    if (!forInType.startsWith('*TnMap[') && !forInType.startsWith('map[') && !forInType.startsWith('[]') && !forInType.startsWith('*[]') && forInType !== 'string') {
      useHelper('dynamic');
      return `for _, ${varName} := range TnKeys(${visit(node.expression, { inline: true })})${visitLoopBody(node.statement, `_ = ${varName}\n\t\t`)}`;
    }
    const iterated = visit(node.expression, { inline: true });
    const isOrderedMap = forInType.startsWith('*TnMap[');
    // A key the body never reads would be "declared and not used" in Go
    return `for ${varName} := range ${iterated}${isOrderedMap ? '.All()' : ''}${visitLoopBody(
      node.statement,
      `_ = ${varName}\n\t\t`
    )}`;
  } else if (isForOfStatement(node)) {
    // Unwrap Object.entries(x) → treat x as the iterable
    let iterNode: AstNode = node.expression;
    if (
      isCallExpression(iterNode) &&
      isPropertyAccessExpression(iterNode.expression) &&
      isIdentifier(iterNode.expression.expression) &&
      iterNode.expression.expression.text === 'Object' &&
      iterNode.expression.name.text === 'entries' &&
      iterNode.arguments.length > 0 &&
      isOrderedMapArg(iterNode.arguments[0])
    ) {
      iterNode = iterNode.arguments[0] as AstNode;
    }
    // for (const x of seq) over an Array subclass: its elements
    if (iterNode.kind !== 'TnArrayItems' && arraySubclassOf(iterNode)) {
      iterNode = arrayItemsNode(iterNode);
      node.expression = iterNode;
    }
    // (a dynamic iterable — array, Map, Set, string — as its elements)
    const dynamicIterable = isDynamicValue(iterNode);
    if (dynamicIterable) useHelper('arraySubclass');
    let iterExpr = dynamicIterable ? `TnToArray(${visit(iterNode, { inline: true })})` : visit(iterNode, { inline: true });
    let iterType = inferExpressionType(iterNode);
    // Node class instances iterate through their iterator method (URLSearchParams → entries())
    const nodeIterator = iterType ? nodeRegistry.iterators[iterType] : undefined;
    if (iterType && nodeIterator) {
      const cls = nodeRegistry.classes[nodeRegistry.classByGoType[iterType]];
      iterExpr = `${iterExpr}.${nodeIterator}()`;
      iterType = cls?.methods[nodeIterator] ?? iterType;
    }
    if (iterType && iterType.startsWith('*TnMap[')) {
      const valueType = extractMapValueType(iterType);
      const isSet = valueType === 'struct{}';
      const varInfo = getForOfVarNames(node.initializer);
      registerLocalVariable(varInfo[0], extractMapKeyType(iterType));
      if (varInfo.length >= 2 && !isSet) registerLocalVariable(varInfo[1], valueType);
      if (varInfo.length >= 2 && !isSet) {
        return `for ${varInfo[0]}, ${varInfo[1]} := range ${iterExpr}.All()${visitLoopBody(node.statement)}`;
      }
      return `for ${varInfo[0]} := range ${iterExpr}.All()${visitLoopBody(node.statement)}`;
    }
    return visitForOfSequence(node, iterExpr, iterType);
  } else if (isWhileStatement(node)) {
    // while ((x = next()) !== null) → for { x = next(); if !(x != nil) { break }; … }
    const hoisted = getHoistedConditionAssignment(node.expression);
    if (hoisted) {
      // (the variable, now read in the test)
      const condition: AstNode = { ...node.expression };
      condition.left = { ...hoisted.left, parent: condition };
      const prefix = `${visit(hoisted, { inline: true })};\n\t\tif !(${visit(condition, {
        inline: true
      })}) {\n\t\t\tbreak\n\t\t}\n\t\t`;
      return `for ${visitLoopBody(node.statement, prefix)}`;
    }
    return `for ${toGoCondition(node.expression)}${visitLoopBody(node.statement)}`;
  } else if (isDoStatement(node)) {
    // The body runs before the first test; `continue` goes to the test, as
    // Go's post statement does
    const again = getTempName('do');
    return `for ${again} := true; ${again}; ${again} = ${toGoCondition(node.expression)}${visitLoopBody(node.statement)}`;
  } else if (isIfStatement(node)) {
    // Go requires the branch body to be a block even for single statements
    // Go requires a block body; `} else` must stay on the same line, so the
    // terminating ';' is only added when no else branch follows
    const thenTerm = node.elseStatement ? '' : ';';
    const thenCode = withNarrowing(getNarrowedNames(node.expression, true), () =>
      isBlock(node.thenStatement)
        ? visit(node.thenStatement, { inline: !!node.elseStatement })
        : `{\n${withLineMarker(node.thenStatement, visit(node.thenStatement))}\n}${thenTerm}`
    );
    const condition = `if ${toGoCondition(node.expression)} ${thenCode}`;
    if (node.elseStatement) {
      // else-if chains stay chained; other single statements get a block
      const elseCode = withNarrowing(getNarrowedNames(node.expression, false), () =>
        isBlock(node.elseStatement) || isIfStatement(node.elseStatement)
          ? visit(node.elseStatement)
          : `{\n${withLineMarker(node.elseStatement, visit(node.elseStatement))}\n};\n\t`
      );
      return `${condition} else ${elseCode}`;
    }
    return condition;
  } else if (isSwitchStatement(node)) {
    // A nullable primitive (*T) switches on its value or nil; a value type
    // with a `case undefined:` switches as any
    const discriminantType = inferExpressionType(node.expression);
    let discriminant = visit(node.expression);
    const hasNilCase = (node.caseBlock?.clauses ?? []).some((c: AstNode) => isCaseClause(c) && isNilLiteral(c.expression));
    if (discriminantType && NULLABLE_PRIMITIVE_TYPES.includes(discriminantType)) {
      useHelper('dynamic');
      discriminant = `TnPtrValue(${discriminant})`;
    } else if (hasNilCase && discriminantType && !isNilableGoType(discriminantType)) {
      discriminant = `interface{}(${discriminant})`;
    }
    return `switch ${discriminant} ${visit(node.caseBlock)}` + (options.inline ? '' : '\n\t');
  } else if (isCaseBlock(node)) {
    return `{\n\t\t${(node.clauses ?? []).map((c) => visit(c)).join('\n\t\t')}\n\t}`;
  } else if (isCaseClause(node) || isDefaultClause(node)) {
    // A clause ends at its first jump (a plain `break` leaves the switch, as
    // Go's cases do); without one it falls through, except out of the last
    // clause (Go rejects that)
    const kept: AstNode[] = [];
    let jumps = false;
    for (const statement of node.statements ?? []) {
      if (isBreakStatement(statement) && !statement.label) {
        jumps = true;
        break;
      }
      kept.push(statement);
      if (isReturnStatement(statement) || isThrowStatement(statement) || isBreakStatement(statement) || statement.kind === 'ContinueStatement') {
        jumps = true;
        break;
      }
    }
    const siblingClauses: AstNode[] = node.parent?.clauses ?? [];
    const isFallThrough = !jumps && siblingClauses[siblingClauses.length - 1] !== node;
    const head = isCaseClause(node) ? `case ${visit(node.expression, { inline: true })}: ` : 'default: ';
    return `${head}\n\t\t\t${coverageEnter(node)}${kept.map((s) => visit(s)).join('')}${isFallThrough ? 'fallthrough\n\t' : ''}`;
  } else if (isBreakStatement(node)) {
    if (node.label && blockLabels.has(node.label.text)) return `goto ${getSafeName(node.label.text)}__end`;
    return node.label ? `break ${getSafeName(node.label.text)}` : 'break';
  } else if (node.kind === 'ContinueStatement') {
    return node.label ? `continue ${getSafeName(node.label.text)};\n\t` : 'continue;\n\t';
  } else if (node.kind === 'LabeledStatement') {
    const label = getSafeName(node.label.text);
    const labeled = node.statement;
    const breakable = ['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'DoStatement', 'SwitchStatement'];
    if (!breakable.includes(labeled.kind)) {
      // label: { … break label; … } — Go only breaks out of loops and
      // switches: jump past the statement instead (an unused label is dropped)
      const labelText = node.label.text;
      const used = containsNode(labeled, (n) => isBreakStatement(n) && n.label?.text === labelText);
      if (!used) return visit(labeled, options);
      blockLabels.add(labelText);
      const body = visit(labeled);
      blockLabels.delete(labelText);
      return `${body}\n\t${label}__end:\n\t;` + (options.inline ? '' : '\n\t');
    }
    return `${label}:\n\t\t${visit(labeled)}` + (options.inline ? '' : ';\n\t');
  } else if (isThrowStatement(node)) {
    const expr = node.expression;
    if (
      isNewExpression(expr) &&
      isIdentifier(expr.expression) &&
      expr.expression.text === 'Error'
    ) {
      useHelper('error');
      const args = expr.arguments ?? [];
      const msg = args.length > 0 ? visit(args[0]) : '""';
      return `panic(TnNewError(${msg}))` + (options.inline ? '' : ';\n\t');
    }
    return `panic(${visit(expr)})` + (options.inline ? '' : ';\n\t');
  } else if (isTryStatement(node)) {
    return visitTryStatement(node, options);
  } else if (isReturnStatement(node)) {
    // return f() where f returns nothing: call it, then return
    if (node.expression && isVoidCall(node.expression)) {
      const bare: AstNode = { ...node, expression: undefined };
      return `${visit(node.expression)};\n\t\t${visit(bare, options)}`;
    }
    // Handle return new Promise(...)
    if (
      node.expression &&
      isNewExpression(node.expression) &&
      isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Promise'
    ) {
      return visitPromiseReturn(node.expression, options);
    }
    // Inside an async function or generator the channel carries the result
    if (asyncChannelVar && getEnclosingFunction(node) === asyncFunctionNode) {
      if (!node.expression) return 'return';
      // An async return settles its promise (ordered wake); a generator's
      // sends stay raw (their consumers receive raw)
      if (asyncChannelIsAsync) {
        // `return otherPromise()` settles with the awaited value; the explicit
        // type argument converts into an unannotated function's interface{}
        const chanType = getPromiseChannelType(asyncFunctionNode!);
        const returnedType = inferExpressionType(node.expression);
        const returned =
          returnedType?.startsWith('chan ') && chanType !== returnedType
            ? `TnAwait(${visit(node.expression)})`
            : visit(node.expression);
        return `TnAsyncSend[${chanType}](${asyncChannelVar}, ${returned}); return` + (options.inline ? '' : ';\n\t');
      }
      return `${asyncChannelVar} <- ${visit(node.expression)}; return` + (options.inline ? '' : ';\n\t');
    }
    const enclosingFn = getEnclosingFunction(node);
    const isAsync = enclosingFn?.modifiers?.some((m) => m.kind === 'AsyncKeyword');
    // (the function's result type as its signature declares it: computed
    // without the narrowing in effect here)
    const returnGoType =
      enclosingFn && !isAsync ? withoutNarrowing(() => inferFunctionBodyReturnType(enclosingFn)) : undefined;
    // TS closures passed as Go callbacks return the Go result type
    const goCallbackResult = enclosingFn ? goCallbackResultType(enclosingFn) : undefined;
    const value = !node.expression
      ? ''
      : goCallbackResult !== undefined
        ? toGoType(visit(node.expression), inferExpressionType(node.expression) ?? '', goCallbackResult)
        : toGoValueOfType(node.expression, returnGoType);
    const terminator = options.inline ? '' : ';\n\t';
    // (an array reference function returns the array it found, by reference)
    const returned = node.expression && enclosingFn && returnGoType && returnsArrayReference(enclosingFn)
      ? arrayReferenceOf(node.expression, returnGoType)
      : value;
    if (tryReturn && enclosingFn === tryReturn.fn) return tryAwareReturn(returned) + terminator;
    return `return ${returned}` + terminator;
  } else if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    // overload signatures have no body: only the implementation is emitted
    if (!node.body) return '';
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      return '';
    }

    const typeParams = getTypeParameters(node.typeParameters, node);
    const parameterInfo = withContextualParameters(
      node,
      getFunctionParametersInfo(node.parameters ?? [])
    );

    if (node.body && isBlock(node.body)) {
      prescanVariableDeclarations(node.body);
    }
    // (with the function's own locals typed: other functions' same-named
    // variables are still registered at this point)
    const inferredRetType =
      node.body && isBlock(node.body) && !node.type
        ? withFunctionScopeTypes(node, () => inferFunctionBodyReturnType(node) ?? '') || undefined
        : inferFunctionBodyReturnType(node);
    // (a function returning one of its arguments' array fields returns a
    // reference to it: see returnsArrayReference)
    const returnType = inferredRetType ? ` ${returnsArrayReference(node) ? '*' : ''}${inferredRetType}` : '';

    if (options.isOutside) {
      // async functions run their body in a goroutine sending over a channel
      const isAsync = (node.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword');
      if (isAsync && node.name && !node.asteriskToken) {
        return emitChannelFunction(node, true);
      }
      if (node.asteriskToken && node.name) {
        return emitChannelFunction(node, false);
      }
      const name = node.name ? visit(node.name, { inline: true }) : '';
      const safeName = getSafeName(name);
      return `func ${safeName}${typeParams}(${parameterInfo.signature})${returnType} ${visit(
        node.body!,
        {
          prefixBlockContent: parameterInfo.prefixBlockContent
        }
      )}`;
    }

    // an async function expression kept as a value returns a promise
    if (isFunctionExpression(node) && isPromiseReturningArrow(node) && !node.asteriskToken) return emitAsyncArrow(node);
    if (!node.name) {
      return `func${typeParams}(${parameterInfo.signature})${returnType} ${visit(node.body!, {
        prefixBlockContent: parameterInfo.prefixBlockContent
      }).trimEnd()}`;
    }

    const name = visit(node.name, { inline: true });
    const safeName = getSafeName(name);
    const literal = `func${typeParams}(${parameterInfo.signature})${returnType} ${visit(node.body!, {
      prefixBlockContent: parameterInfo.prefixBlockContent
    }).trimEnd()}`;
    if (isFunctionExpression(node)) {
      // A named function expression is a value; its name is visible only in
      // its own body (for recursion)
      const selfReferenced = containsNode(node.body, (n) => isIdentifier(n) && n.text === node.name.text && !isFieldNameIdentifier(n));
      if (!selfReferenced || typeParams) return literal;
      const fnType = `func(${goFuncParamTypes(`func(${parameterInfo.signature})`).join(', ')})${returnType}`;
      return `func() ${fnType} { var ${safeName} ${fnType}; ${safeName} = ${literal}; return ${safeName} }()`;
    }
    return `${safeName} := ${literal}`;
  } else if (isArrowFunction(node)) {
    // An async arrow kept as a value (assigned, returned) returns a promise
    // like an async function; one passed straight to a call runs inline
    if (isPromiseReturningArrow(node)) return emitAsyncArrow(node);
    const parameterInfo = withContextualParameters(
      node,
      getFunctionParametersInfo(node.parameters ?? [])
    );
    const inferredRetType = inferFunctionBodyReturnType(node);
    const returnType = inferredRetType ? ` ${inferredRetType}` : '';
    if (parameterInfo.prefixBlockContent && !isBlock(node.body)) {
      return `func(${parameterInfo.signature})${returnType} {\n\t\t${coverageEnter(node)}${parameterInfo.prefixBlockContent}return ${toGoValueOfType(node.body, inferredRetType)};\n\t}`;
    }
    if (!isBlock(node.body)) {
      // void-style calls (console.*, assert) emit statements, not values
      if (isVoidStatementCall(node.body as AstNode) || !inferredRetType) {
        // `(c) => (body += c)`: the parenthesized expression is a statement
        let statement: AstNode = node.body;
        while (statement.kind === 'ParenthesizedExpression') statement = statement.expression;
        discardedExpressions.add(statement);
        return `func(${parameterInfo.signature})${returnType} { ${coverageEnter(node)}${visit(statement)}; }`;
      }
      // (the result converts to the declared or contextual result type)
      return `func(${parameterInfo.signature})${returnType} { ${coverageEnter(node)}return ${toGoValueOfType(node.body as AstNode, inferredRetType)}; }`;
    }
    return `func(${parameterInfo.signature})${returnType} ${visit(node.body, {
      prefixBlockContent: parameterInfo.prefixBlockContent
    }).trimEnd()}`;
  } else if (node.kind === 'ThisKeyword') {
    if (thisOverrideName && getEnclosingFunction(node) === thisOverrideFn) return thisOverrideName;
    if (isThisOfPlainFunction(node)) {
      useHelper('decorators');
      return 'TnThis';
    }
    return 'self';
  } else if (node.kind === 'PrivateIdentifier') {
    // #field → a mangled struct field, distinct from a public `field`
    return privateGoName(node.text);
  } else if (isEnumDeclaration(node)) {
    const enumName = node.name.text;
    enumNames.add(enumName);
    enumBaseTypes.set(enumName, getEnumBaseType(node));

    if (options.addFunctionOutside) {
      if (enumHasComputedMember(node)) return visitEnumDeclaration(node, true);
      outsideNodes.push(node);
      return '';
    }

    return visitEnumDeclaration(node);
  } else if (isTypeAliasDeclaration(node)) {
    typeAliases.set(node.name.text, node.type);
    if (node.type?.kind !== 'TypeLiteral') return '';
    // type X = { a: T } → type X struct { a T }
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      const properties = new Map<string, string>();
      for (const member of node.type.members ?? []) {
        if (isPropertySignature(member) && isIdentifier(member.name)) {
          properties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
        }
      }
      if (properties.size > 0) interfacePropertyTypes.set(visit(node.name), properties);
      return '';
    }
    const localProperties = new Map<string, string>();
    for (const member of node.type.members ?? []) {
      if (isPropertySignature(member) && isIdentifier(member.name)) {
        localProperties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
      }
    }
    if (localProperties.size > 0) interfacePropertyTypes.set(visit(node.name), localProperties);
    const fields = (node.type.members ?? [])
      .filter((m) => isPropertySignature(m) && isIdentifier(m.name))
      .map((m) => `\t${goFieldName(m.name.text)} ${getOptionalNodeType(m.type, !!m.questionToken)}`);
    const terminator = options.isOutside ? '' : ';\n\t';
    return `type ${visit(node.name)}${getTypeParameters(node.typeParameters)} struct {\n${fields.join('\n')}\n}${terminator}`;
  } else if (isInterfaceDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);

      const properties = new Map<string, string>();
      collectInterfaceProperties(node, properties);
      if (properties.size > 0) {
        interfacePropertyTypes.set(visit(node.name), properties);
      }
      return '';
    }

    const name = visit(node.name);
    const typeParams = getTypeParameters(node.typeParameters);

    const extendedInterfaces: string[] = [];
    if ((node.heritageClauses ?? [])) {
      for (const clause of (node.heritageClauses ?? [])) {
        if (clause.token === 'ExtendsKeyword') {
          for (const type of (clause.types ?? [])) {
            extendedInterfaces.push(visit(type.expression));
          }
        }
      }
    }

    const methods: string[] = [];
    const properties: string[] = [];
    for (const member of (node.members ?? [])) {
      if (isMethodSignature(member)) {
        const methodName = visit(member.name);
        const params = (member.parameters ?? [])
          .map((p) => `${visit(p.name)} ${getType(p.type!)}`)
          .join(', ');
        const returnType = member.type ? ` ${getType(member.type)}` : '';
        methods.push(`\t${methodName}(${params})${returnType}`);
      } else if (isPropertySignature(member) && isIdentifier(member.name)) {
        properties.push(
          `\t${goFieldName(member.name.text)} ${getOptionalNodeType(member.type, !!member.questionToken)}`
        );
      }
    }

    // with properties (own or inherited) it is a struct; methods are func fields
    if (interfaceHasProperties(node)) {
      if (extendedInterfaces.length === 0 && methods.length === 0) {
        return `type ${name}${typeParams} struct {\n${properties.join('\n')}\n}`;
      }
      // Flattened inherited properties: literals can set every field directly
      const flattened = new Map<string, string>();
      collectInterfaceProperties(node, flattened);
      const fields: string[] = [];
      flattened.forEach((propType, prop) => {
        fields.push(`\t${goFieldName(prop)} ${propType}`);
      });
      return `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}`;
    }

    const members = [...extendedInterfaces.map((e) => `\t${e}`), ...methods];

    return `type ${name}${typeParams} interface {\n${members.join('\n')}\n}${extendedInterfaces.length === 0 ? emitInterfaceAdapter(node) : ''}`;
  } else if (isClassDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      registerClassMembers(node);
      return visitClassDecorators(node);
    }

    const name = visit(node.name!);
    emittedClasses.add(name);
    // Class type parameters are erased (as in JS): T is interface{} inside
    // the class, and every Box<…> is the one Go type *Box
    const typeParams = '';
    const typeParamNames = '';

    let parentClass: string | null = null;
    if ((node.heritageClauses ?? [])) {
      for (const clause of (node.heritageClauses ?? [])) {
        if (clause.token === 'ExtendsKeyword') {
          parentClass = nodeParentGoName(clause.types[0].expression) || visit(clause.types[0].expression);
        }
      }
    }
    const extendsError = parentClass === 'Error';
    if (extendsError) useHelper('error');
    // class C extends Array: the elements live in an embedded TnArray
    const extendsArray = parentClass === 'Array' && !declaredClasses.has('Array');
    if (extendsArray) {
      useHelper('arraySubclass');
      parentClass = null;
    }
    applyNodeHookTypes(parentClass, node);
    if (parentClass && !extendsError) classParentNames.set(name, parentClass);
    const isAbstractClass = (node.modifiers ?? []).some((m: AstNode) => m.kind === 'AbstractKeyword');

    const fields: string[] = [];
    if (parentClass) {
      fields.push(`\t${extendsError ? 'TnError' : parentClass}`);
    }
    if (extendsArray) fields.push('\tTnArray');
    for (const member of (node.members ?? [])) {
      // static properties are package-level Class_name variables, not fields
      if (isPropertyDeclaration(member) && !(member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) {
        const fieldName =
          member.name?.kind === 'PrivateIdentifier'
            ? privateGoName(member.name.text)
            : visit(member.name);
        let fieldType: string;
        if (member.type && isArrayTypeNode(member.type)) {
          fieldType = `[]${getType(member.type, true)}`;
        } else {
          fieldType = getPropertyDeclarationType(member);
        }
        fields.push(`\t${fieldName} ${fieldType}`);
      }
    }
    for (const param of getParameterProperties(node)) {
      fields.push(`\t${goFieldName(param.name.text)} ${getParameterGoType(param)}`);
    }

    // fields of the methods mock.method may replace (see emitMockableMethod)
    const mockSlots: string[] = [];
    if (mockedMemberNames.size > 0) fields.push(MOCK_SLOTS_MARK);
    let result = `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}\n\n`;

    const ctor = (node.members ?? []).find((m) => isConstructorDeclaration(m) && !!m.body) as
      | AstNode
      | undefined;
    const isCtorSuperCall = (s: AstNode): boolean =>
      isExpressionStatement(s) &&
      isCallExpression(s.expression) &&
      s.expression.expression.kind === 'SuperKeyword';
    const superCalledInCtor = (ctor?.body?.statements ?? []).some(isCtorSuperCall);
    if (ctor) {
      const ctorParameterInfo = getFunctionParametersInfo(ctor.parameters ?? []);

      // As in TS (ES2020 class fields): super(), then parameter properties,
      // then field initializers, then the rest of the body
      const parameterAssignments = getParameterProperties(node)
        .map((p) => `self.${goFieldName(p.name.text)} = ${visit(p.name)}\n\t\t`)
        .join('');
      const instanceInit = `${parameterAssignments}${fieldInitializers(node)}`;
      const bodyStatements =
        (ctor.body?.statements ?? [])
          .map((s: AstNode) => {
            // super(...) initializes the embedded parent (or the Error message)
            if (isCtorSuperCall(s) && extendsArray) {
              return `self.TnArray.items = TnArrayInit(${arrayInitArguments(s.expression.arguments ?? [])})\n\t\t${instanceInit}`;
            }
            if (isCtorSuperCall(s)) {
              // (converted to the parent constructor's parameter types)
              const parentParams = !nodeParentClassKeys.has(parentClass ?? '') && parentClass ? constructorParameterNodes(parentClass) : [];
              const args = (s.expression.arguments ?? []).map((a: AstNode, i: number) => {
                const param = parentParams[i];
                return param && !param.dotDotDotToken && !param.initializer && !isSpreadElement(a) ? toGoValueOfType(a, getParameterGoType(param)) : visit(a);
              });
              for (let i = args.length; i < parentParams.length; i++) {
                const param = parentParams[i];
                if (!param.questionToken || param.initializer || param.dotDotDotToken) break;
                args.push(`*new(${getParameterGoType(param)})`);
              }
              if (extendsError) return `self.message = ${args[0] ?? '""'}\n\t\tself.TnError.tnCapture(3)\n\t\t${instanceInit}`;
              return `self.${goFieldName(parentClass!)} = *${parentConstructorCall(parentClass!, args)}\n\t\t${instanceInit}`;
            }
            return visit(s);
          })
          .join('\t') ?? '';

      const parentInit =
        parentClass && !extendsError && !superCalledInCtor
          ? `self.${goFieldName(parentClass)} = *${parentConstructorCall(parentClass, [])}\n\t\t`
          : '';
      const leadingInit = superCalledInCtor ? '' : `${parentInit}${instanceInit}`;
      const ctorBody = `{\n\t\tself := &${name}${typeParamNames}{}\n\t\t${coverageEnter(ctor.body)}${nodeSelfLink(parentClass)}${ctorParameterInfo.prefixBlockContent}${leadingInit}${bodyStatements}${nodeSelfLink(parentClass, node)}return self;\n\t}`;
      result += emitConstructor(name, typeParams, typeParamNames, ctorParameterInfo.signature, ctorBody);
    } else if (extendsError) {
      // class X extends Error {} — the constructor takes the message
      classConstructorSignatures.set(name, 'message string');
      result += `func New${name}${typeParams}(message string) *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\tself.message = message\n\t\tself.TnError.tnCapture(3)\n\t\t${fieldInitializers(node)}return self\n\t}\n\n`;
    } else {
      // No constructor: JS's implicit constructor(...args) { super(...args) }
      // takes the nearest ancestor constructor's parameters
      const inherited = parentClass && !extendsError ? inheritedConstructorParameters(parentClass) : null;
      // (Array's implicit constructor takes the elements)
      const signature = inherited ? inherited.signature : extendsArray ? '__elements ...interface{}' : '';
      const forwarded = inherited ? inherited.forward : [];
      const parentInit =
        parentClass && !extendsError ? `self.${goFieldName(parentClass)} = *${parentConstructorCall(parentClass, forwarded)}\n\t\t` : '';
      const arrayInit = extendsArray ? 'self.TnArray.items = TnArrayInit(__elements)\n\t\t' : '';
      const ctorBody = `{\n\t\tself := &${name}${typeParamNames}{}\n\t\t${parentInit}${arrayInit}${fieldInitializers(node)}${nodeSelfLink(parentClass, node)}return self\n\t}`;
      result += emitConstructor(name, typeParams, typeParamNames, signature, ctorBody);
    }

    // Inherited concrete methods are copied onto the subclass: Go embedding
    // promotes the parent's receiver, which would break `this` dispatch
    const ownMethodNames = new Set<string>();
    for (const member of (node.members ?? [])) {
      if (!isMethodDeclaration(member) && !isGetAccessor(member)) continue;
      if (member.name?.kind === 'PrivateIdentifier') continue;
      if (!member.name?.text) continue;
      ownMethodNames.add(member.name.text);
    }
    const copiedMethods: string[] = [];
    // Accessors and fields the class declares itself shadow inherited accessors
    const ownAccessorKeys = new Set<string>();
    for (const member of node.members ?? []) {
      if (!member.name?.text) continue;
      const ownKey = memberKey(member.name);
      if (isGetAccessor(member) || isPropertyDeclaration(member)) ownAccessorKeys.add(`get:${ownKey}`);
      if (isSetAccessor(member) || isPropertyDeclaration(member)) ownAccessorKeys.add(`set:${ownKey}`);
    }
    for (const param of getParameterProperties(node)) {
      ownAccessorKeys.add(`get:${param.name.text}`);
      ownAccessorKeys.add(`set:${param.name.text}`);
    }
    if (parentClass && !extendsError) {
      // Walk the parent chain (iteratively — no local recursive closures)
      const pending: string[] = [parentClass];
      const seenClasses = new Set<string>();
      const ancestors: AstNode[] = [];
      while (pending.length > 0) {
        const nextName = pending.pop();
        if (!nextName || seenClasses.has(nextName)) continue;
        seenClasses.add(nextName);
        const ancestor = declaredClasses.get(nextName);
        if (!ancestor) continue;
        ancestors.push(ancestor);
        for (const clause of ancestor.heritageClauses ?? []) {
          if (clause.token === 'ExtendsKeyword') {
            pending.push(visit(clause.types[0].expression));
          }
        }
      }
      // Copy from the topmost ancestor down so overrides shadow correctly
      let ancestorIndex = ancestors.length - 1;
      while (ancestorIndex >= 0) {
        const ancestor = ancestors[ancestorIndex];
        for (const member of (ancestor.members ?? [])) {
          if ((isGetAccessor(member) || isSetAccessor(member)) && member.body && member.name?.text) {
            if (member.modifiers?.some((m: AstNode) => m.kind === 'StaticKeyword')) continue;
            const accessorKey = `${isGetAccessor(member) ? 'get' : 'set'}:${memberKey(member.name)}`;
            if (ownAccessorKeys.has(accessorKey)) continue;
            ownAccessorKeys.add(accessorKey);
            copiedMethods.push(emitAccessor(member, `${name}${typeParamNames}`, mockSlots));
            continue;
          }
          if (!isMethodDeclaration(member)) continue;
          if (!member.body || member.asteriskToken) continue; // abstract / generator
          if (member.modifiers?.some((m: AstNode) => m.kind === 'StaticKeyword')) continue;
          if (member.modifiers?.some((m: AstNode) => m.kind === 'AbstractKeyword')) continue;
          const methodName =
            memberKey(member.name);
          if (!methodName || ownMethodNames.has(methodName)) continue;
          ownMethodNames.add(methodName);
          const goMethodName = goFieldName(methodName);
          if (getDecorators(member).length > 0) {
            copiedMethods.push(emitDecoratedMethod(name, typeParamNames, member, visit(ancestor.name)));
            continue;
          }
          if ((member.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) {
            copiedMethods.push(`${lineMarker(member)}${emitChannelFunction(member, true, `func (self *${name}${typeParamNames}) ${goMethodName}`)}\n`);
            continue;
          }
          let methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
          if (usesArgumentsObject(member)) methodParameterInfo = withArgumentsObject(member, methodParameterInfo, false);
          // `return this` in an unannotated ancestor method returns the subclass here
          let inheritedReturnType = methodReturnGoType(member);
          if (returnsOnlyThis(member)) {
            inheritedReturnType = `*${name}${typeParamNames}`;
          }
          const returnType = inheritedReturnType ? ` ${inheritedReturnType}` : '';
          recordMethodSignature(name, methodName, goMethodName, methodParameterInfo.signature, inheritedReturnType ?? '');
          const copiedBody = visit(member.body, { prefixBlockContent: methodParameterInfo.prefixBlockContent });
          const copiedSlotKey = mockSlotKey('method', methodName);
          const copiedMockable = mockedMemberNames.has(copiedSlotKey)
            ? emitMockableMethod(`${name}${typeParamNames}`, goMethodName, copiedSlotKey, methodParameterInfo.signature, returnType, copiedBody, mockSlots)
            : '';
          copiedMethods.push(
            copiedMockable
              ? `${lineMarker(member)}${copiedMockable}\n`
              : `${lineMarker(member)}func (self *${name}${typeParamNames}) ${goMethodName}(${methodParameterInfo.signature})${returnType} ${copiedBody}\n`
          );
        }
        ancestorIndex--;
      }
    }

    for (const member of (node.members ?? [])) {
      if (isMethodDeclaration(member) && member.asteriskToken && member.body) {
        // Generator method: *[Symbol.iterator]() → Symbol_iterator() chan T
        let genName: string | undefined;
        if (member.name?.kind === 'ComputedPropertyName') {
          const expr = member.name.expression;
          if (
            isPropertyAccessExpression(expr) &&
            isIdentifier(expr.expression) &&
            expr.expression.text === 'Symbol' &&
            expr.name.text === 'iterator'
          ) {
            genName = 'Symbol_iterator';
          }
        } else if (member.name && member.name.text) {
          genName = memberKey(member.name);
        }
        if (genName) {
          const yieldType = getGeneratorYieldType(member);
          const prevChannel = asyncChannelVar;
          const prevFn = asyncFunctionNode;
          const prevIsAsync = asyncChannelIsAsync;
          asyncChannelVar = '__ch';
          asyncFunctionNode = member;
          asyncChannelIsAsync = false;
          const methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
          const genBody = visit(member.body, { prefixBlockContent: methodParameterInfo.prefixBlockContent });
          asyncChannelVar = prevChannel;
          asyncFunctionNode = prevFn;
          asyncChannelIsAsync = prevIsAsync;
          result += `${lineMarker(member)}func (self *${name}${typeParamNames}) ${genName}(${methodParameterInfo.signature}) chan ${yieldType} {\n\t__ch := make(chan ${yieldType})\n\tgo func() {\n\t\tdefer close(__ch)\n\t\t${genBody.trim()}\n\t}()\n\treturn __ch\n}\n\n`;
        }
        continue;
      }
      if (isMethodDeclaration(member)) {
        const methodName = visit(member.name);
        let methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
        if (usesArgumentsObject(member)) methodParameterInfo = withArgumentsObject(member, methodParameterInfo, false);
        const ownReturnType = methodReturnGoType(member);
        const returnType = ownReturnType ? ` ${ownReturnType}` : '';
        const isStatic = member.modifiers?.some((m) => m.kind === 'StaticKeyword');
        if (!member.body) continue; // abstract method — implemented by subclasses
        if (isAbstractClass && !isStatic) continue; // only reachable via subclasses
        const isAsyncMethod = (member.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword');
        if (getDecorators(member).length > 0) {
          result += emitDecoratedMethod(name, typeParamNames, member, name);
        } else if (isAsyncMethod) {
          // async methods run like async functions: a promise channel
          const header = isStatic ? `func ${name}_${methodName}` : `func (self *${name}${typeParamNames}) ${methodName}`;
          result += `${lineMarker(member)}${emitChannelFunction(member, true, header)}\n\n`;
        } else if (isStatic) {
          // Static methods become package-level functions named ClassName_methodName
          result += `${lineMarker(member)}func ${name}_${methodName}(${methodParameterInfo.signature})${returnType} ${visit(
            member.body!,
            { prefixBlockContent: methodParameterInfo.prefixBlockContent }
          )}\n\n`;
        } else {
          recordMethodSignature(name, memberKey(member.name) ?? methodName, methodName, methodParameterInfo.signature, ownReturnType ?? '');
          const body = visit(member.body!, { prefixBlockContent: methodParameterInfo.prefixBlockContent });
          const slotKey = mockSlotKey('method', memberKey(member.name) ?? methodName);
          const mockable = mockedMemberNames.has(slotKey)
            ? emitMockableMethod(`${name}${typeParamNames}`, methodName, slotKey, methodParameterInfo.signature, returnType, body, mockSlots)
            : '';
          result += mockable
            ? `${lineMarker(member)}${mockable}\n\n`
            : `${lineMarker(member)}func (self *${name}${typeParamNames}) ${methodName}(${methodParameterInfo.signature})${returnType} ${body}\n\n`;
        }
      } else if (isGetAccessor(member) || isSetAccessor(member)) {
        result += emitAccessor(member, `${name}${typeParamNames}`, mockSlots);
      }
    }
    result += copiedMethods.join('\n');

    // Static property declarations → package-level vars named ClassName_propName
    for (const member of (node.members ?? [])) {
      if (
        isPropertyDeclaration(member) &&
        member.modifiers?.some((m: AstNode) => m.kind === 'StaticKeyword')
      ) {
        const fieldName = visit(member.name);
        const fieldType =
          member.type
            ? getOptionalNodeType(member.type, !!member.questionToken)
            : toFieldGoType(member.initializer ? inferExpressionType(member.initializer) : undefined);
        const initializer = member.initializer ? ` = ${visit(member.initializer)}` : '';
        result += `var ${name}_${fieldName} ${fieldType}${initializer}\n\n`;
      }
    }
    // static { … } blocks run once at program start, after the static fields
    for (const member of node.members ?? []) {
      if (member.kind === 'ClassStaticBlockDeclaration' && member.body) {
        result += `func init() ${visit(member.body).trimEnd()}\n\n`;
      }
    }

    return result.replace(MOCK_SLOTS_MARK, mockSlots.join('\n')).trim();
  } else if (isNewExpression(node)) {
    const nodeNew = visitNodeNew(node);
    if (nodeNew !== undefined) return nodeNew;
    const goTarget = goNewTarget(node);
    if (goTarget) {
      importedPackages.add(goTarget.path);
      const goNew = visitGoNew(node, goTarget.path, goTarget.typeName);
      if (goNew !== undefined) return goNew;
    }
    const className = visit(node.expression);
    if (className === 'Promise') {
      return visitNewPromise(node);
    }
    if (className === 'RegExp') {
      importedPackages.add('regexp');
      const nodeArgs = node.arguments ?? [];
      if (nodeArgs.length >= 2 && isStringLiteral(nodeArgs[1])) {
        const pattern = visit(nodeArgs[0]);
        const flags = jsRegexFlagsToGo(nodeArgs[1].text);
        return `regexp.MustCompile("${flags}" + ${pattern})`;
      }
      if (nodeArgs.length >= 1) {
        return `regexp.MustCompile(${visit(nodeArgs[0])})`;
      }
      return `regexp.MustCompile("")`;
    }
    // Tagged so `instanceof Map` / `Set` can tell them from records
    if (className === 'Map') {
      useHelper('orderedMap');
      return `TnJSCollection(${visitNewMap(node)}, 1)`;
    }
    if (className === 'Set') {
      useHelper('orderedMap');
      return `TnJSCollection(${visitNewSet(node)}, 2)`;
    }
    // new WeakRef(obj) / new FinalizationRegistry(callback)
    if (className === 'WeakRef' && !classNames.has(className) && node.arguments?.[0]) {
      useHelper('weakRefs');
      const targetType = inferExpressionType(node.arguments[0]) ?? '';
      if (!targetType.startsWith('*')) {
        reportError(node, 'Unsupported WeakRef target: only objects (class instances, object literals) can be weakly referenced');
        return 'nil';
      }
      return `TnNewWeakRef(${visit(node.arguments[0])})`;
    }
    if (className === 'FinalizationRegistry' && !classNames.has(className) && node.arguments?.[0]) {
      useHelper('weakRefs');
      const callback = node.arguments[0];
      const params = goFuncParamTypes(functionValueGoType(callback));
      const held = params[0] && params[0] !== 'interface{}' ? `TnAs[${params[0]}](__h)` : '__h';
      return `TnNewFinalizationRegistry(func(__h interface{}) { ${visit(callback)}(${params.length > 0 ? held : ''}) })`;
    }
    // new AggregateError(errors, message?): errors is an iterable of reasons
    if (className === 'AggregateError' && !classNames.has(className)) {
      useHelper('error');
      const errs = (node.arguments ?? [])[0];
      const msg = (node.arguments ?? [])[1] ? visit(node.arguments[1]) : '""';
      const list = errs ? toGoValueOfType(errs, '[]interface{}') : '[]interface{}{}';
      return `func() *TnError { __e := TnNodeError("AggregateError", "", ${msg}); __e.props["errors"] = ${list}; return __e }()`;
    }
    // new TypeError(message) & co.: a TnError with that name
    if (BUILTIN_ERROR_NAMES.has(className) && !classNames.has(className)) {
      useHelper('error');
      const msg = (node.arguments ?? [])[0] ? visit(node.arguments[0]) : '""';
      return withErrorOptions(`TnNodeError(${toGoStringLiteral(className)}, "", ${msg})`, (node.arguments ?? [])[1]);
    }
    // new Error(message) → a TnError value with a .message
    if (className === 'Error') {
      useHelper('error');
      const msg = (node.arguments ?? [])[0] ? visit(node.arguments[0]) : '""';
      return withErrorOptions(`TnNewError(${msg})`, (node.arguments ?? [])[1]);
    }
    // new Date() / new Date(ms) → Go time
    // new Date(value) / new Date(y, m, d?, …): local time, as in JS
    if (className === 'Date') {
      importedPackages.add('time');
      const dateArgs: AstNode[] = node.arguments ?? [];
      if (dateArgs.length === 0) {
        useHelper('clock');
        return 'TnTimeNow()';
      }
      useHelper('date');
      if (dateArgs.length >= 2) {
        return `TnDateFields(time.Local, ${dateArgs.map((a) => asFloatOperand(a, visit(a))).join(', ')})`;
      }
      const argType = inferExpressionType(dateArgs[0]);
      if (argType === 'float64') return `TnDateFromMs(${visit(dateArgs[0])})`;
      if (argType === 'string') return `TnParseDate(${visit(dateArgs[0])})`;
      if (argType === 'time.Time') return visit(dateArgs[0]);
      return `TnNewDate(${visit(dateArgs[0])})`;
    }
    // new Array<number>(3) → make([]float64, 3); new Array(n) of any values
    if (className === 'Array' && !classNames.has('Array') && (node.arguments ?? []).length <= 1) {
      const elementType = (node.typeArguments ?? []).length === 1 ? getType(node.typeArguments[0]) : 'interface{}';
      const length = (node.arguments ?? [])[0] ? toGoValueOfType(node.arguments[0], 'float64') : '0';
      return `make([]${elementType}, int(${length}))`;
    }
    const typeArgs = getTypeArguments((node.typeArguments ?? []));
    // Array-reference parameters (*[]T) box their array arguments
    // (new this(…) in a static method constructs the class declaring it)
    const thisOwner = node.expression.kind === 'ThisKeyword' ? getEnclosingClassName(node) : undefined;
    const ctorClass = thisOwner ?? className;
    const ctorParams = classNames.has(ctorClass) ? constructorParameterNodes(ctorClass) : [];
    const args = (node.arguments ?? []).map((a: AstNode, i: number) => {
      const param = i < ctorParams.length ? ctorParams[i] : undefined;
      // (array references box their arrays, nullable parameters their values)
      if (param && !param.dotDotDotToken && !param.initializer && !isSpreadElement(a)) {
        return toGoValueOfType(a, getParameterGoType(param));
      }
      return visit(a);
    });
    // new F(…) where F holds a constructor function (construct signature)
    if (!classNames.has(className) && inferExpressionType(node.expression)?.startsWith('func(')) {
      return `${className}(${args.join(', ')})`;
    }
    // omitted optional parameters are zero values (nil for pointers)
    for (let i = args.length; i < ctorParams.length; i++) {
      const param = ctorParams[i];
      if (!param.questionToken || param.initializer || param.dotDotDotToken) break;
      args.push(`*new(${getParameterGoType(param)})`);
    }
    // new this(…) in a static method: the class declaring it
    if (thisOwner) return `New${getSafeName(thisOwner)}(${args.join(', ')})`;
    // new X(…) where X holds a class value (tag.nodeClass, this.constructor)
    if (!classNames.has(className) && !isIdentifier(node.expression) || (isIdentifier(node.expression) && !classNames.has(node.expression.text) && isDynamicValue(node.expression))) {
      useHelper('classes');
      useHelper('dynamic');
      useHelper('error');
      return `TnNew(${[visit(node.expression), ...(node.arguments ?? []).map((a: AstNode) => visit(a))].join(', ')})`;
    }
    // (class type parameters are erased)
    return `New${className}${classNames.has(className) ? '' : typeArgs}(${args.join(', ')})`;
  } else if (isObjectLiteralExpression(node)) {
    if (isDynamicObjectLiteral(node)) {
      // { ...a, k: v } → copy a's properties, then set k (in source order)
      if ((node.properties ?? []).some((p) => p.kind === 'SpreadAssignment')) {
        // an ordered record, so the keys keep their order
        useHelper('dynamicSpread');
        const steps = (node.properties ?? []).map((p) => {
          if (p.kind === 'SpreadAssignment') return `TnAssignInto(__obj, ${visit(p.expression)})`;
          if (isShorthandPropertyAssignment(p)) return `__obj.Set(${mapKeyText(p.name)}, ${visit(p.name)})`;
          return `__obj.Set(${propertyKeyString(p.name)}, ${visit(p.initializer)})`;
        });
        return `func() *TnMap[string, interface{}] { __obj := TnNewMap[string, interface{}](); ${steps.join('; ')}; return __obj }()`;
      }
      const entries = (node.properties ?? [])
        .map((p) => {
          if (isPropertyAssignment(p)) return `${propertyKeyString(p.name)}: ${visit(p.initializer)}`;
          if (isShorthandPropertyAssignment(p)) return `${mapKeyText(p.name)}: ${visit(p.name)}`;
          return '';
        })
        .filter((e) => e);
      return `map[string]interface{}${compositeBody(entries)}`;
    }
    const recordSpread = visitRecordSpreadLiteral(node);
    if (recordSpread) return recordSpread;
    const contextualType = objectLiteralContextualType(node);
    if (isRecordTypeNode(contextualType)) {
      return visitMapLiteral(node, contextualType);
    }
    let typeName = contextualType ? getTypeText(contextualType) : '';
    // { ...ctx, indent: x }: a copy of ctx's object type, when it has every key
    const firstProp = (node.properties ?? [])[0];
    if ((!typeName || typeName === 'interface{}') && firstProp?.kind === 'SpreadAssignment') {
      const spreadType = inferExpressionType(firstProp.expression) ?? '';
      const structName = spreadType.startsWith('*') ? spreadType.slice(1) : '';
      const fields = structName ? interfacePropertyTypes.get(structName) : undefined;
      const coversKeys = !!fields && (node.properties ?? []).every((p: AstNode) =>
        p.kind === 'SpreadAssignment' || ((isPropertyAssignment(p) || isShorthandPropertyAssignment(p)) && isIdentifier(p.name) && fields.has(p.name.text)));
      if (coversKeys && isObjectTypeName(structName)) typeName = spreadType;
    }
    if (!typeName || typeName === 'interface{}') {
      return visitAnonymousStructLiteral(node);
    }
    // Objects are pointers: the struct type is typeName without its *; generic
    // types are instantiated with the contextual type arguments (Box<number> → Box[float64])
    const typeArgs =
      isTypeReferenceNode(contextualType) && contextualType.typeName.text === typeName.replace(/^\*/, '')
        ? getTypeArguments(contextualType.typeArguments)
        : '';
    const structName = typeName.replace(/^\*/, '') + (typeName.endsWith(']') ? '' : typeArgs);
    if (isMethodInterfaceName(typeName.replace(/^\*/, ''))) return visitInterfaceLiteral(node, typeName.replace(/^\*/, ''), typeArgs);
    // { ...base, x: 1, ...more } → a fresh object of the type, each source's
    // properties copied in order (unset fields of a typed source are absent)
    if ((node.properties ?? []).some((p) => p.kind === 'SpreadAssignment')) {
      useHelper('objectAssignTo');
      const sources: string[] = [];
      let run: AstNode[] = [];
      const flush = () => {
        if (run.length > 0) sources.push(dynamicObjectLiteral({ kind: 'ObjectLiteralExpression', properties: run, parent: node }));
        run = [];
      };
      for (const p of node.properties ?? []) {
        if (p.kind === 'SpreadAssignment') {
          flush();
          sources.push(visit(p.expression));
        } else run.push(p);
      }
      flush();
      return `TnAssignTo(new(${structName}), ${sources.join(', ')})`;
    }

    const fieldTypes = typeArgs ? undefined : (interfacePropertyTypes.get(structName) ?? classPropertyTypes.get(structName));
    const properties = (node.properties ?? [])
      .map((p) => {
        if (isPropertyAssignment(p)) {
          const fieldType = isIdentifier(p.name)
            ? (fieldTypes?.get(p.name.text) ?? getStructFieldGoType(typeName, p.name.text))
            : undefined;
          return `${visit(p.name)}: ${toGoValueOfType(p.initializer, fieldType)}`;
        }
        // Shorthand: { name } → name: name
        if (isShorthandPropertyAssignment(p)) {
          return `${goFieldName(p.name.text)}: ${toGoValueOfType(
            p.name,
            fieldTypes?.get(p.name.text) ?? getStructFieldGoType(typeName, p.name.text)
          )}`;
        }
        // Spread: { ...obj } — not easily supported in Go structs, omit
        return '';
      })
      .filter((p) => p);
    // m(x) { … } shorthand: a function field, assigned once the object
    // exists (`this` is the object); its type is the field's
    const methodSteps: string[] = [];
    for (const p of node.properties ?? []) {
      if (!isMethodDeclaration(p) || !isIdentifier(p.name) || !p.body) continue;
      const fieldType = fieldTypes?.get(p.name.text) ?? getStructFieldGoType(typeName, p.name.text) ?? methodFuncType(p);
      const prevName = thisOverrideName;
      const prevFn = thisOverrideFn;
      thisOverrideName = '__obj';
      thisOverrideFn = p;
      const paramInfo = withContextualParameters(p, getFunctionParametersInfo(p.parameters ?? []));
      const result = fieldType.startsWith('func(') ? goFuncReturnType(fieldType) : inferFunctionBodyReturnType(p);
      const body = visit(p.body, { prefixBlockContent: paramInfo.prefixBlockContent });
      thisOverrideName = prevName;
      thisOverrideFn = prevFn;
      methodSteps.push(`__obj.${goFieldName(p.name.text)} = func(${paramInfo.signature})${result ? ` ${result}` : ''} ${body.trimEnd()}`);
    }
    if (methodSteps.length > 0) {
      return `func() *${structName} {\n\t\t__obj := &${structName}${compositeBody(properties)}\n\t\t${methodSteps.join('\n\t\t')}\n\t\treturn __obj\n\t}()`;
    }

    return `&${structName}${compositeBody(properties)}`;
  } else if (isPropertyAssignment(node)) {
    return `${visit(node.name)}: ${visit(node.initializer)}`;
  } else if (isNonNullExpression(node)) {
    const innerType = inferExpressionType(node.expression);
    if (innerType && NULLABLE_PRIMITIVE_TYPES.includes(innerType)) return `(*${visit(node.expression)})`;
    return visit(node.expression);
  } else if (isImportDeclaration(node)) {
    return visitImportDeclaration(node);
  } else if (isExportDeclaration(node) || isExportAssignment(node)) {
    return '';
  } else if (node.kind === 'EmptyStatement' || node.kind === 'DebuggerStatement') {
    // `;` and `debugger` do nothing in a native binary
    return '';
  }

  const syntaxKind = node.kind;
  if (!['VariableStatement', 'EndOfFileToken'].includes(syntaxKind)) {
    // The Go output would be incomplete: an error, not a guess (its children
    // are not visited, which would only report follow-on errors)
    reportError(node, `Unsupported syntax: ${syntaxKind}`);
    return '';
  }

  for (const child of childNodes(node)) {
    code += visit(child);
  }

  return code;
}

export type VisitNodeOptions = {
  inline?: boolean;
  extraBlockContent?: string;
  prefixBlockContent?: string;
  addFunctionOutside?: boolean;
  isOutside?: boolean;
  skipNarrowing?: boolean;
};

// Renders composite literal entries; multi-line entries need trailing commas
// (Go inserts a semicolon after a newline that ends in `}`)
// Visits a value going into a slot of Go type `goType`; non-nil values for
// nullable primitives (*string/*float64/*bool) are boxed into pointers
// A value of Go type `from` where `to` is expected (conversions in adapters)
function convertBetweenGoTypes(value: string, from: string, to: string): string {
  if (from === to || to === 'interface{}') return value;
  useHelper('dynamic');
  if (NULLABLE_PRIMITIVE_TYPES.includes(to)) return `TnAsPtr[${to.slice(1)}](interface{}(${value}))`;
  return `TnAs[${to}](interface{}(${value}))`;
}

// A function value of Go type `from` stored where `to` is expected (JS
// passes functions with fewer or differently typed parameters): a wrapper
// converting the arguments and the result
function adaptFunctionValue(code: string, from: string, to: string): string {
  const fromParams = goFuncParamTypes(from);
  const toParams = goFuncParamTypes(to);
  if (fromParams.concat(toParams).some((t) => t.startsWith('...'))) return code;
  const fromResult = goFuncReturnType(from) ?? '';
  const toResult = goFuncReturnType(to) ?? '';
  const names = toParams.map((_t: string, i: number) => `__a${i}`);
  const args = fromParams.map((t: string, i: number) => (i < toParams.length ? convertBetweenGoTypes(names[i], toParams[i], t) : `*new(${t})`));
  const call = `__f(${args.join(', ')})`;
  const body = !toResult
    ? call
    : !fromResult
      ? `${call}; return *new(${toResult})`
      : `return ${convertBetweenGoTypes(call, fromResult, toResult)}`;
  const params = names.map((n: string, i: number) => `${n} ${toParams[i]}`).join(', ');
  return `func() ${to} { __f := ${code}; return func(${params})${toResult ? ` ${toResult}` : ''} { ${body} } }()`;
}

function toGoValueOfType(expr: AstNode, goType: string | undefined): string {
  // a class where a constructor function is expected ({ new (s): Node }):
  // a function constructing it (arguments converted at run time)
  const classRef = unwrapParentheses(expr);
  if (goType?.startsWith('func(') && isIdentifier(classRef) && classNames.has(classRef.text) && !variableGoTypes.has(classRef.text)) {
    const params = goFuncParamTypes(goType);
    if (!params.some((t) => t.startsWith('...'))) {
      const result = goFuncReturnType(goType) ?? '';
      useHelper('dynamic');
      useHelper('error');
      const names = params.map((_t: string, i: number) => `__a${i}`);
      const created = `TnNew(${[classValue(classRef.text), ...names].join(', ')})`;
      const body = !result ? created : result === 'interface{}' ? `return ${created}` : `return TnAs[${result}](${created})`;
      return `TnCtorOf(${classValue(classRef.text)}, func(${params.map((t: string, i: number) => `${names[i]} ${t}`).join(', ')})${result ? ` ${result}` : ''} { ${body} })`;
    }
  }
  // null into an any slot: JS null (distinct from undefined there)
  if (goType === 'interface{}' && unwrapParentheses(expr).kind === 'NullKeyword' && storesJsNull(expr)) {
    useHelper('dynamic');
    return 'TnNull';
  }
  // T | undefined into an any slot: its value, or nil (not a typed nil pointer)
  if (goType === 'interface{}' && NULLABLE_PRIMITIVE_TYPES.includes(inferExpressionType(expr) ?? '')) {
    useHelper('dynamic');
    return `TnPtrValue(${visit(expr)})`;
  }
  // a && b / a || b where a boolean is expected: its truthiness
  const logical = unwrapParentheses(expr);
  if (goType === 'bool' && isBinaryExpression(logical) && isLogicalOperator(logical.operatorToken)) return toGoCondition(logical);
  // a function of another Go signature (fewer parameters, other types)
  // (function literals follow the slot's type themselves, unless their
  // parameters are all annotated with other types)
  const unwrappedExpr = unwrapParentheses(expr);
  const isLiteral = isArrowFunction(unwrappedExpr) || isFunctionExpression(unwrappedExpr);
  const annotatedLiteral =
    isLiteral &&
    !!goType && (unwrappedExpr.parameters ?? []).every((p: AstNode) => !!p.type && !p.dotDotDotToken) &&
    (unwrappedExpr.parameters ?? []).length === goFuncParamTypes(goType).length;
  if (goType?.startsWith('func(') && !goType.includes('[') && (!isLiteral || annotatedLiteral)) {
    const exprType = inferExpressionType(expr) ?? (isIdentifier(unwrappedExpr) && declaredFunctions.has(unwrappedExpr.text) ? functionValueGoType(unwrappedExpr) : undefined);
    if (exprType?.startsWith('func(') && exprType.replace(/\s+/g, '') !== goType.replace(/\s+/g, '') && !exprType.includes('[')) {
      return adaptFunctionValue(visit(expr), exprType, goType);
    }
  }
  // (x as Task) on an any value stays dynamic; a typed slot asserts it
  if (goType && goType !== 'interface{}' && isAsExpression(expr) && getAsExpressionType(expr) === 'interface{}' && isDynamicValue(expr.expression)) {
    expr = expr.expression;
  }
  if (goType === 'string' && inferExpressionType(expr) === 'TnJsxNode') return `string(${visit(expr)})`;
  if (
    goType &&
    ((isObjectLiteralExpression(expr) && (expr.properties ?? []).length === 0 && goType.startsWith('*TnMap[')) ||
      (isArrayLiteralExpression(expr) && (expr.elements ?? []).length === 0 && goType.startsWith('[]')))
  ) {
    const mapArgs = splitMapTypeArgs(goType);
    if (mapArgs) return orderedMapLiteral(mapArgs[0], mapArgs[1], []);
    return `${goType}{}`;
  }
    // Array reference slots (*[]T): literals take an address, aliases pass through
    if (goType && goType.startsWith('*[]')) {
      // Go bridge element types are qualified (*[]io/fs.DirEntry)
      goType = goLocalType(goType);
      if (isIdentifier(expr) && referenceArrays.has(expr.text)) {
        return getSafeName(expr.text);
      }
      if (isArrayLiteralExpression(expr) && (expr.elements ?? []).length === 0) return `&${goType.slice(1)}{}`;
      if (isArrayLiteralExpression(expr)) {
        const code = visit(expr);
        // Spread-built arrays (append chains) are not addressable
        return code.startsWith('[')
          ? `&${code}`
          : `func() ${goType} { __v := ${code}; return &__v }()`;
      }
      // (x as string[]) on an any value, or (rows as Row[]) on an array of any
      // values (node:sqlite's all()): convert, then box
      const castSource = isAsExpression(expr) ? expr.expression : expr;
      const dynamicElements = goType !== '*[]interface{}' && inferExpressionType(castSource) === '[]interface{}';
      if (isDynamicValue(castSource) || dynamicElements) {
        useHelper('dynamic');
        // (a reference to an array of this type is shared, not copied)
        return `TnArrayRef[${goType.slice(3)}](${visit(castSource)})`;
      }
      // a call of an array reference function: the reference itself
      const refCall = unwrapParentheses(expr);
      if (isCallExpression(refCall) && isIdentifier(refCall.expression) && returnsArrayReference(declaredFunctions.get(refCall.expression.text))) {
        refCall.tnArrayReference = true;
        const code = visit(refCall);
        refCall.tnArrayReference = false;
        return code;
      }
      // an object's array field (it.sep): its address, so the callee's
      // pushes and splices change the field (the array is shared, as in JS)
      // (as an argument only: a variable keeps the array, not the field slot)
      const passed = isCallExpression(expr.parent) && (expr.parent.arguments ?? []).includes(expr);
      if (passed && isPropertyAccessExpression(unwrapParentheses(expr)) && !hasQuestionDot(unwrapParentheses(expr)) && inferExpressionType(expr) === goType.slice(1)) {
        const field = visit(expr);
        if (/^[\w.()*]+$/.test(field) && !field.endsWith(')')) return `&${field}`;
      }
      // re.exec(s) / s.match(re): no match is null, not an empty array
      const call = unwrapParentheses(expr);
      if (isCallExpression(call) && isPropertyAccessExpression(call.expression) && MAYBE_MISSING_METHODS.has(call.expression.name.text)) {
        return `func() ${goType} { __v := ${visit(expr)}; if __v == nil { return nil }; return &__v }()`;
      }
      return `func() ${goType} { __v := ${visit(expr)}; return &__v }()`;
    }
  const code = visit(expr);
  if (goType && goType !== 'interface{}' && goType !== ':' && isDynamicValue(expr)) {
    useHelper('dynamic');
    // T | undefined: box the dynamic value (nil when missing or of another type)
    if (goType.startsWith('*')) return `TnAsPtr[${goType.slice(1)}](${code})`;
    return `TnAs[${goType}](${code})`;
  }
  // an RE2 regex where the JS-semantics regex type is expected: wrapped
  if (goType === '*TnRegex' && inferExpressionType(expr) === '*regexp.Regexp') {
    useHelper('fancyRegex');
    return `TnRegexWrap(${visit(expr)})`;
  }
  // a Map of other key / value types: converted entry by entry (a copy)
  if (goType?.startsWith('*TnMap[') && !isNilLiteral(expr)) {
    const exprType = inferExpressionType(expr) ?? '';
    if (exprType.startsWith('*TnMap[') && exprType !== goType) {
      useHelper('dynamic');
      return `TnAs[${goType}](interface{}(${visit(expr)}))`;
    }
  }
  // an array of another element type ([]*Token where any[] is expected):
  // converted element by element (a copy)
  if (goType && /^\*?\[\]/.test(goType) && !isArrayLiteralExpression(unwrapParentheses(expr))) {
    const exprType = inferExpressionType(expr) ?? '';
    const target = goType.replace(/^\*/, '');
    const source = exprType.replace(/^\*/, '');
    if (/^\[\]/.test(source) && source !== target && source !== '[]byte' && target !== '[]byte' && !goType.includes('...')) {
      useHelper('dynamic');
      const converted = `TnAs[${target}](interface{}(${visit(expr)}))`;
      return goType.startsWith('*') ? `func() ${goType} { __v := ${converted}; return &__v }()` : converted;
    }
  }
  // a value of another object type where a struct is expected (TS types are
  // structural): converted field by field (a copy)
  if (goType?.startsWith('*') && isStructGoType(goType.slice(1)) && !isNilLiteral(expr) && !isObjectLiteralExpression(unwrapParentheses(expr))) {
    const exprType = inferExpressionType(expr) ?? '';
    if (exprType.startsWith('*') && exprType !== goType && isStructGoType(exprType.slice(1)) && !classNames.has(exprType.slice(1)) && !classNames.has(goType.slice(1))) {
      useHelper('dynamic');
      return `TnAs[${goType}](interface{}(${code}))`;
    }
  }
  // *Struct slot: take the address (shares the value, like a JS object reference)
  if (goType?.startsWith('*') && isStructGoType(goType.slice(1)) && !isNilLiteral(expr)) {
    // an untyped literal (&struct{...}) converts to the named pointer type
    if (isObjectLiteralExpression(expr)) return code.startsWith('&struct{') ? `(${goType})(${code})` : code;
    if (inferExpressionType(expr) !== goType.slice(1)) return code;
    // the element itself (not a bounds-checked copy), so mutations are shared
    if (isElementAccessExpression(expr) && inferExpressionType(expr.expression)?.startsWith('[]')) {
      return `&${visit(expr.expression)}[int(${visit(expr.argumentExpression)})]`;
    }
    if (isIdentifier(expr) || isPropertyAccessExpression(expr)) {
      return `&${code}`;
    }
    return `func() ${goType} { v := ${code}; return &v }()`;
  }
  // T | undefined where a T is expected: undefined reads as the zero value
  // (NaN for a number)
  if (goType && ['string', 'float64', 'bool'].includes(goType) && inferExpressionType(expr) === `*${goType}`) {
    return derefNullablePrimitive(code, goType);
  }
  if (!goType || !NULLABLE_PRIMITIVE_TYPES.includes(goType) || isNilLiteral(expr)) {
    return code;
  }
  if (isConditionalExpression(expr)) return code;
  if (
    isBinaryExpression(expr) &&
    expr.operatorToken.kind === 'QuestionQuestionToken' &&
    getNullishEmitType(expr) === goType
  ) {
    return code;
  }
  if (inferExpressionType(expr) !== goType.slice(1)) return code;
  return `func() ${goType} { v := ${code}; return &v }()`;
}

const NULLABLE_PRIMITIVE_TYPES = ['*string', '*float64', '*bool'];

function derefNullablePrimitive(code: string, goType: string): string {
  useHelper('numTruthy');
  return goType === 'float64' ? `TnNumPtr(${code})` : `TnDeref(${code})`;
}

// Nullable primitives (T | null → *T) that a guard has narrowed to T in the
// code being emitted; reads of them dereference the pointer
const narrowedVariables = new Set<string>();

function isNullablePrimitiveVariable(name: string): boolean {
  return NULLABLE_PRIMITIVE_TYPES.includes(variableGoTypes.get(name) ?? '');
}

// Narrowing key of a variable or property path (`opts.source`), if it has one
function getNarrowingKey(expr: AstNode): string | undefined {
  if (isIdentifier(expr)) return expr.text;
  if (expr.kind === 'ThisKeyword') return 'this';
  if (isPropertyAccessExpression(expr) && !hasQuestionDot(expr)) {
    const objectKey = getNarrowingKey(expr.expression);
    return objectKey ? `${objectKey}.${expr.name.text}` : undefined;
  }
  return undefined;
}

// Runs compute with no variable narrowed
function withoutNarrowing<T>(compute: () => T): T {
  const saved = [...narrowedVariables];
  narrowedVariables.clear();
  const result = compute();
  for (const name of saved) narrowedVariables.add(name);
  return result;
}

// Emits `emit()` with `names` narrowed
function withNarrowing(names: string[], emit: () => string): string {
  const added = names.filter((n) => !narrowedVariables.has(n));
  for (const name of added) narrowedVariables.add(name);
  const code = emit();
  for (const name of added) narrowedVariables.delete(name);
  return code;
}

function isProcessEnv(expr: AstNode): boolean {
  while (isParenthesizedExpression(expr) || isAsExpression(expr) || isNonNullExpression(expr)) {
    expr = expr.expression;
  }
  if (
    isPropertyAccessExpression(expr) &&
    isIdentifier(expr.expression) &&
    expr.expression.text === 'process' &&
    expr.name.text === 'env'
  ) {
    return true;
  }
  return resolveNodeKey(expr) === 'process.env';
}

// Whether an expression is (part of) an optional chain: a?.b, a?.b(), a?.b().c
function isOptionalChain(expr: AstNode): boolean {
  if (isCallExpression(expr)) {
    return hasQuestionDot(expr) || isOptionalChain(expr.expression);
  }
  if (isPropertyAccessExpression(expr) || isElementAccessExpression(expr)) {
    return hasQuestionDot(expr) || isOptionalChain(expr.expression);
  }
  return false;
}

// x in `x?.m(...)` / `x?.p`
function getOptionalChainBase(expr: AstNode): AstNode | undefined {
  const access = isCallExpression(expr) ? expr.expression : expr;
  if (isPropertyAccessExpression(access) && hasQuestionDot(access)) return access.expression;
  return undefined;
}

// Variables known non-null when `condition` evaluates to `whenTrue`
function getNarrowedNames(condition: AstNode, whenTrue: boolean): string[] {
  if (isParenthesizedExpression(condition)) return getNarrowedNames(condition.expression, whenTrue);
  if (whenTrue) {
    const chainBase = getOptionalChainBase(condition);
    if (chainBase) return nullableKeys([chainBase]);
  }
  if (isIdentifier(condition) || isPropertyAccessExpression(condition)) {
    return whenTrue ? nullableKeys([condition]) : [];
  }
  if (isPrefixUnaryExpression(condition) && condition.operator === 'ExclamationToken') {
    return getNarrowedNames(condition.operand, !whenTrue);
  }
  if (!isBinaryExpression(condition)) return [];
  const kind = condition.operatorToken.kind;
  if (kind === 'AmpersandAmpersandToken') {
    return whenTrue
      ? [...getNarrowedNames(condition.left, true), ...getNarrowedNames(condition.right, true)]
      : [];
  }
  if (kind === 'BarBarToken') {
    return whenTrue
      ? []
      : [...getNarrowedNames(condition.left, false), ...getNarrowedNames(condition.right, false)];
  }
  // x instanceof C on a dynamic variable: x is a *C (C without subclasses)
  if (kind === 'InstanceOfKeyword') {
    const operand = unwrapParentheses(condition.left);
    const className = isIdentifier(condition.right) ? condition.right.text : '';
    if (
      whenTrue && isIdentifier(operand) && classNames.has(className) && !isPolymorphicClass(className) &&
      (variableGoTypes.get(operand.text) ?? 'interface{}') === 'interface{}' && !referenceArrays.has(operand.text)
    ) {
      return [typeofNarrowingKey(operand.text, `*${getSafeName(className)}`)];
    }
    return [];
  }
  const isNotEqual = kind === 'ExclamationEqualsEqualsToken' || kind === 'ExclamationEqualsToken';
  const isEqual = kind === 'EqualsEqualsEqualsToken' || kind === 'EqualsEqualsToken';
  if (!isNotEqual && !isEqual) return [];
  const checked = isNilLiteral(condition.right)
    ? condition.left
    : isNilLiteral(condition.left)
      ? condition.right
      : undefined;
  if (!checked) {
    const typeOfSide = isTypeOfExpression(condition.left) ? condition.left : isTypeOfExpression(condition.right) ? condition.right : undefined;
    const tagSide = typeOfSide === condition.left ? condition.right : condition.left;
    if (typeOfSide && isStringLiteral(tagSide)) {
      if (isEqual !== whenTrue) return [];
      // typeof x === 'number' on a dynamic variable: x is that type
      const operand = unwrapParentheses(typeOfSide.expression);
      const tagType = ({ number: 'float64', string: 'string', boolean: 'bool' } as Record<string, string>)[tagSide.text];
      if (tagType && isIdentifier(operand) && (variableGoTypes.get(operand.text) ?? 'interface{}') === 'interface{}' && !referenceArrays.has(operand.text) && !declaredFunctions.has(operand.text)) {
        return [typeofNarrowingKey(operand.text, tagType)];
      }
      // typeof x === 'string' (any tag but 'undefined'): x is set
      return tagSide.text === 'undefined' ? [] : nullableKeys([typeOfSide.expression]);
    }
    // x === <non-null value>
    if (!isEqual || !whenTrue) return [];
    const leftType = inferExpressionType(condition.left);
    const rightType = inferExpressionType(condition.right);
    if (rightType && !NULLABLE_PRIMITIVE_TYPES.includes(rightType)) return nullableKeys([condition.left]);
    if (leftType && !NULLABLE_PRIMITIVE_TYPES.includes(leftType)) return nullableKeys([condition.right]);
    return [];
  }
  return isNotEqual === whenTrue ? nullableKeys([checked]) : [];
}

// A dynamic (interface{}) variable narrowed by `typeof x === 'number'` is
// read as that Go type
function typeofNarrowingKey(name: string, goType: string): string {
  return `${name}#typeof:${goType}`;
}

function typeofNarrowedType(name: string): string | undefined {
  if (narrowedVariables.size === 0) return undefined;
  const prefix = typeofNarrowingKey(name, '');
  for (const key of narrowedVariables) if (key.startsWith(prefix)) return key.slice(prefix.length);
  return undefined;
}

// Narrowing keys of the given expressions that are nullable primitives (*T)
function nullableKeys(exprs: AstNode[]): string[] {
  const keys: string[] = [];
  for (const expr of exprs) {
    const key = getNarrowingKey(expr);
    if (!key || narrowedVariables.has(key)) continue;
    if (NULLABLE_PRIMITIVE_TYPES.includes(inferExpressionType(expr) ?? '')) keys.push(key);
  }
  return keys;
}

// Identifier occurrences that read the variable (not declarations, member
// names, or assignment targets)
function isNarrowableReference(node: AstNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (isPropertyAccessExpression(parent) && parent.name === node) return false;
  // { x } reads the variable x
  if (parent.name === node && !isShorthandPropertyAssignment(parent)) return false;
  if (isBinaryExpression(parent) && parent.left === node) {
    const op = parent.operatorToken.kind;
    if (op === 'EqualsToken' || op === 'QuestionQuestionEqualsToken') return false;
  }
  return true;
}

function alwaysExits(statement: AstNode): boolean {
  if (
    isReturnStatement(statement) ||
    isThrowStatement(statement) ||
    isBreakStatement(statement) ||
    statement.kind === 'ContinueStatement'
  ) {
    return true;
  }
  if (isBlock(statement)) {
    const statements = statement.statements ?? [];
    return statements.length > 0 && alwaysExits(statements[statements.length - 1]);
  }
  return false;
}

// Statements of a block; after `if (!x) return;`, x stays narrowed for the rest
function visitBlockStatements(statements: AstNode[]): string {
  const added: string[] = [];
  const parts: string[] = [];
  for (let index = 0; index < statements.length; index++) {
    const statement = statements[index];
    if (isUsingDeclaration(statement)) {
      parts.push(withLineMarker(statement, visitUsingDeclaration(statement, statements.slice(index + 1))));
      break;
    }
    parts.push(withLineMarker(statement, visit(statement)) + coverageAfter(statement));
    if (isIfStatement(statement) && !statement.elseStatement && alwaysExits(statement.thenStatement)) {
      for (const name of getNarrowedNames(statement.expression, false)) {
        if (!narrowedVariables.has(name)) {
          narrowedVariables.add(name);
          added.push(name);
        }
      }
    }
  }
  for (const name of added) narrowedVariables.delete(name);
  return parts.join('\t');
}

function isUsingDeclaration(statement: AstNode): boolean {
  const kind = statement.kind === 'VariableStatement' ? statement.declarationList?.declarationKind : undefined;
  return kind === 'using' || kind === 'await using';
}

// using x = r; …rest → x := r; defer dispose(x); …rest. In a function body Go's
// defer is the block end; nested blocks run the rest in a closure so disposal
// happens when the block ends (return/break/continue there keep the defer form)
function visitUsingDeclaration(statement: AstNode, rest: AstNode[]): string {
  const isAwait = statement.declarationList.declarationKind === 'await using';
  const disposals = (statement.declarationList.declarations ?? [])
    .filter((d: AstNode) => isIdentifier(d.name))
    .map((d: AstNode) => {
      const name = visit(d.name);
      const goType = inferExpressionType(d.initializer) ?? '';
      const className = goType.replace(/^\*/, '').replace(/\[.*$/, '');
      const classNode = declaredClasses.get(className);
      const hasAsync = (classNode?.members ?? []).some((m: AstNode) => m.name?.text === '__asyncDispose');
      if (isAwait && hasAsync) useHelper('promise');
      // The disposal may run on an async fn's goroutine or inline in a callback
      const awaitFn =
        asyncChannelVar && asyncChannelIsAsync && getEnclosingFunction(statement) === asyncFunctionNode
          ? 'TnAwait'
          : 'TnAwaitInline';
      const call = isAwait && hasAsync ? `${awaitFn}(${name}.__asyncDispose())` : `${name}.__dispose()`;
      return `defer func() { if ${name} != nil { ${call} } }()`;
    })
    .reverse();
  const declaration: AstNode = { ...statement, declarationList: { ...statement.declarationList, declarationKind: 'const' } };
  const head = `${visit(declaration)}${disposals.join('\n\t\t')}\n\t\t`;
  const block = statement.parent;
  const isFunctionBody = !!block?.parent && block.parent.body === block;
  const restBlock: AstNode = { kind: 'Block', statements: rest };
  const exits = containsNode(restBlock, (n) =>
    n.kind === 'ReturnStatement' || n.kind === 'BreakStatement' || n.kind === 'ContinueStatement'
  );
  if (isFunctionBody || exits) return head + visitBlockStatements(rest);
  return `func() {\n\t\t${head}${visitBlockStatements(rest)}}()\n\t`;
}

// Binary arithmetic with a bridged named numeric: coerce the float64 side.
function visitGoNumericArithmetic(node: AstNode, op: string): string | undefined {
  const leftType = inferExpressionType(node.left);
  const rightType = inferExpressionType(node.right);
  const leftNumeric = leftType && isGoNumericType(leftType) ? leftType : undefined;
  const rightNumeric = rightType && isGoNumericType(rightType) ? rightType : undefined;
  if (!leftNumeric && !rightNumeric) return undefined;
  if (leftNumeric && rightNumeric) return undefined;
  const numericType = leftNumeric ?? rightNumeric;
  if (!numericType) return undefined;
  const left = leftNumeric ? visit(node.left) : `${numericType}(${visit(node.left)})`;
  const right = rightNumeric ? visit(node.right) : `${numericType}(${visit(node.right)})`;
  if (['+=', '-=', '*=', '/='].includes(op)) {
    const target = visit(node.left);
    const baseOp = op.slice(0, -1);
    return `${target} = ${left} ${baseOp} ${right}`;
  }
  return `${left} ${op} ${right}`;
}

function visitDynamicArithmetic(node: AstNode, op: string): string | undefined {
  const leftDynamic = isDynamicValue(node.left);
  const rightDynamic = isDynamicValue(node.right);
  if (!leftDynamic && !rightDynamic) return undefined;
  const isConcat =
    (op === '+' || op === '+=') && [node.left, node.right].some((side) => inferExpressionType(side) === 'string');
  const operand = (side: AstNode, dynamic: boolean) => {
    if (!dynamic) return visit(side);
    if (isConcat) {
      // String(x) as JS renders it (Buffers decode, numbers in JS notation)
      useHelper('dynamic');
      return `TnJSString(${visit(side)})`;
    }
    useHelper('dynamic');
    // - * / % convert with ToNumber ('6' - 1, date - date); + keeps the number cast
    return op === '+' || op === '+=' ? `TnAs[float64](${visit(side)})` : `TnNumber(${visit(side)})`;
  };
  // Two dynamic operands: + decides at run time, as in JS
  if ((op === '+' || op === '+=') && leftDynamic && rightDynamic && !isConcat) {
    useHelper('dynamic');
    const sum = `TnDynamicAdd(${visit(node.left)}, ${visit(node.right)})`;
    return op === '+=' ? `${visit(node.left)} = ${sum}` : sum;
  }
  // Compound assignment with a dynamic left side reads through the interface
  const isCompound = ['+=', '-=', '*=', '/='].includes(op);
  if (isCompound && leftDynamic) {
    const binOp = op.slice(0, -1);
    const converted = isConcat
      ? `TnDynamicAdd(${visit(node.left)}, ${visit(node.right)})`
      : `TnAs[float64](${visit(node.left)}) ${binOp} ${operand(node.right, rightDynamic)}`;
    useHelper('dynamic');
    return `${visit(node.left)} = ${converted}`;
  }
  return `${operand(node.left, leftDynamic && !isCompound)} ${op} ${operand(node.right, rightDynamic)}`;
}

// `x === v` where x is *T and v is T: equal only when x is non-nil and *x == v
function visitNullableComparison(node: AstNode, op: string): string | undefined {
  const leftType = inferExpressionType(node.left);
  const rightType = inferExpressionType(node.right);
  let pointerSide: AstNode;
  let valueSide: AstNode;
  if (leftType && NULLABLE_PRIMITIVE_TYPES.includes(leftType) && rightType === leftType.slice(1)) {
    pointerSide = node.left;
    valueSide = node.right;
  } else if (
    rightType &&
    NULLABLE_PRIMITIVE_TYPES.includes(rightType) &&
    leftType === rightType.slice(1)
  ) {
    pointerSide = node.right;
    valueSide = node.left;
  } else {
    return undefined;
  }
  const tmp = getTempName('cmp');
  const equal = `${tmp} != nil && *${tmp} == ${visit(valueSide)}`;
  return `func() bool { ${tmp} := ${visit(pointerSide)}; return ${op === '==' ? equal : `!(${equal})`} }()`;
}

// Go type of a Map/Set/Record: an insertion-ordered map
function mapGoType(keyType: string, valueType: string): string {
  useHelper('orderedMap');
  return `*TnMap[${keyType}, ${valueType}]`;
}

// [K, V] of a *TnMap[K, V] type string
function splitMapTypeArgs(mapType: string): [string, string] | undefined {
  if (!mapType.startsWith('*TnMap[')) return undefined;
  const body = mapType.slice(7, -1);
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) return [body.slice(0, i).trim(), body.slice(i + 1).trim()];
  }
  return undefined;
}

// Key type of a map type string: *TnMap[K, V] → K
function extractMapKeyType(mapType: string): string {
  const args = splitMapTypeArgs(mapType);
  if (args) return args[0];
  let depth = 0;
  for (let i = 4; i < mapType.length; i++) {
    if (mapType[i] === '[') depth++;
    else if (mapType[i] === ']') {
      if (depth === 0) return mapType.slice(4, i);
      depth--;
    }
  }
  return 'interface{}';
}

// Field type of an anonymous struct type string: struct{ a T; b U } → field b → U
function getStructFieldGoType(structType: string, field: string): string | undefined {
  structType = structType.replace(/^\*/, '');
  if (!structType.startsWith('struct{')) return undefined;
  const body = structType.slice(7, structType.lastIndexOf('}'));
  let depth = 0;
  let start = 0;
  const fields: string[] = [];
  for (let i = 0; i <= body.length; i++) {
    const ch = i < body.length ? body[i] : ';';
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') depth--;
    else if (ch === ';' && depth === 0) {
      fields.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  for (const entry of fields) {
    const space = entry.indexOf(' ');
    if (space > 0 && entry.slice(0, space) === goFieldName(field)) return entry.slice(space + 1).trim();
  }
  return undefined;
}

// A Go expression as the string JS would produce for it (numbers like JS:
// 1000000, 0.5, NaN; not Go's 1e+06)
function jsStringOf(code: string, goType: string | undefined): string {
  if (goType === 'string') return code;
  if (goType === '[]byte') {
    useHelper('buffer');
    return `TnBufferToString(${code}, "")`;
  }
  if (goType === 'float64') {
    useHelper('dynamic');
    return `TnNumStr(${code})`;
  }
  if (goType === 'bool') {
    importedPackages.add('strconv');
    return `strconv.FormatBool(${code})`;
  }
  if (goType === 'interface{}') {
    useHelper('dynamic');
    useHelper('error');
    return `TnJSString(${code})`;
  }
  if (goType === 'time.Time') {
    useHelper('date');
    return `TnDateString(${code})`;
  }
  // Errors: `${err}` is "Name: message"; arrays join with commas
  if (goType === '*TnError' || goType?.startsWith('[]') || goType?.startsWith('*[]')) {
    useHelper('dynamic');
    useHelper('error');
    return `TnJSString(${code})`;
  }
  // Node classes with a toString() (MIMEType, X509Certificate, …)
  const nodeKey = goType ? nodeRegistry.classByGoType[goType] : undefined;
  if (nodeKey && 'toString' in nodeRegistry.classes[nodeKey].methods) return `${code}.toString()`;
  importedPackages.add('fmt');
  return `fmt.Sprintf("%v", ${code})`;
}

// JS bitwise operators work on 32-bit integers (ToInt32 / ToUint32)
// Go-typed numeric operands (typed constants like x509.KeyUsageCertSign,
// int fields) read as float64 so the TnInt32 helpers accept them
function asFloatOperand(node: AstNode, code: string): string {
  const goType = inferExpressionType(node);
  if (goType && goType !== 'float64' && isGoNumericKind(goType)) return `float64(${code})`;
  return code;
}

function visitBitwise(node: AstNode, op: string): string | undefined {
  const kind = node.operatorToken.kind;
  const base: Record<string, string> = {
    AmpersandToken: '&',
    BarToken: '|',
    CaretToken: '^',
    LessThanLessThanToken: '<<',
    GreaterThanGreaterThanToken: '>>',
    GreaterThanGreaterThanGreaterThanToken: '>>>',
    AmpersandEqualsToken: '&',
    BarEqualsToken: '|',
    CaretEqualsToken: '^',
    LessThanLessThanEqualsToken: '<<',
    GreaterThanGreaterThanEqualsToken: '>>',
    GreaterThanGreaterThanGreaterThanEqualsToken: '>>>'
  };
  const bitOp = base[kind];
  if (!bitOp) return undefined;
  const isAssignment = kind.endsWith('EqualsToken');
  // Bigint operands: math/big's bitwise methods (two's complement, as in JS)
  if (inferExpressionType(node.left) === '*tnbig.Int' || inferExpressionType(node.right) === '*tnbig.Int') {
    useHelper('bigint');
    const bl = visit(node.left);
    const br = visit(node.right);
    const methods: Record<string, string> = { '&': 'And', '|': 'Or', '^': 'Xor' };
    let bigValue: string;
    if (methods[bitOp]) bigValue = `new(tnbig.Int).${methods[bitOp]}(${bl}, ${br})`;
    else if (bitOp === '<<') bigValue = `TnBigShift(${bl}, ${br})`;
    else if (bitOp === '>>') bigValue = `TnBigShift(${bl}, new(tnbig.Int).Neg(${br}))`;
    else bigValue = `func() *tnbig.Int { panic(TnNodeError("TypeError", "", "BigInts have no unsigned right shift, use >> instead")) }()`;
    if (bitOp === '>>>') useHelper('error');
    return isAssignment ? `${bl} = ${bigValue}` : bigValue;
  }
  useHelper('dynamic');
  const left = asFloatOperand(node.left, visit(node.left));
  const right = asFloatOperand(node.right, visit(node.right));
  let value: string;
  if (bitOp === '>>>') value = `float64(TnUint32(${left}) >> (TnUint32(${right}) & 31))`;
  else if (bitOp === '<<' || bitOp === '>>') {
    value = `float64(TnInt32(${left}) ${bitOp} (TnUint32(${right}) & 31))`;
  } else value = `float64(TnInt32(${left}) ${bitOp} TnInt32(${right}))`;
  return isAssignment ? `${left} = ${value}` : value;
}

// delete obj.key / delete obj[key] on maps (Records and dynamic objects)
function visitDelete(node: AstNode): string {
  const target = unwrapParentheses(node.expression);
  const object = target.expression;
  const key = isPropertyAccessExpression(target)
    ? toGoStringLiteral(target.name.text)
    : visit(target.argumentExpression);
  if (isProcessEnv(object)) {
    importedPackages.add('os');
    return `func() bool { os.Unsetenv(${key}); return true }()`;
  }
  const objectType = inferExpressionType(object);
  if (objectType?.startsWith('*TnMap[')) return `${visit(object)}.Delete(${key})`;
  useHelper('dynamic');
  return `TnDelete(${visit(object)}, ${key})`;
}

// f(...xs): variadic callees take xs...; fixed-parameter functions get
// xs[0], xs[1], … for their remaining parameters
function visitSpreadCallArguments(node: AstNode): string[] {
  const fn = isIdentifier(node.expression) ? declaredFunctions.get(node.expression.text) : undefined;
  const params: AstNode[] = fn?.parameters ?? [];
  const isVariadic = !fn || params.some((p) => p.dotDotDotToken);
  const result: string[] = [];
  for (const arg of node.arguments ?? []) {
    if (!isSpreadElement(arg)) {
      result.push(visit(arg));
    } else if (isVariadic) {
      // xs.push(...typed) on an array of any values: the elements boxed
      const receiverType = isPropertyAccessExpression(node.expression) ? (inferExpressionType(node.expression.expression) ?? '') : '';
      const sourceType = (inferExpressionType(arg.expression) ?? '').replace(/^\*\[\]/, '[]');
      const boxed = !fn && receiverType.replace(/^\*\[\]/, '[]') === '[]interface{}' && sourceType !== '[]interface{}' && (sourceType.startsWith('[]') || sourceType === 'interface{}' || !sourceType);
      if (boxed) useHelper('arraySubclass');
      result.push(boxed ? `TnToArray(${visit(arg.expression)})...` : `${visit(arg.expression)}...`);
    } else {
      useHelper('dynamic');
      const source = visit(arg.expression);
      const start = result.length;
      for (let i = start; i < params.length; i++) result.push(`TnAt(${source}, ${i - start})`);
    }
  }
  return result;
}

// self.field = initializer for each instance field that has one
// Whether a class's constructor chain (its own or an ancestor's) reads new.target
function usesNewTarget(className: string): boolean {
  let current = className;
  for (let depth = 0; depth < 50; depth++) {
    const classNode = declaredClasses.get(current);
    if (!classNode) return false;
    const ctor = (classNode.members ?? []).find((m: AstNode) => isConstructorDeclaration(m) && !!m.body);
    if (ctor?.body && containsNode(ctor.body, (n) => isNewTargetNode(n))) return true;
    const extendsClause = (classNode.heritageClauses ?? []).find((c: AstNode) => c.token === 'ExtendsKeyword');
    if (!extendsClause) return false;
    current = visit(extendsClause.types[0].expression);
  }
  return false;
}

function isNewTargetNode(node: AstNode): boolean {
  return node?.kind === 'MetaProperty' && node.name?.text === 'target';
}

// The parent part of a subclass constructor: new.target-aware chains pass the target on
// Subclass instances of Node classes with overridable methods register
// themselves on the embedded struct (`self.TnTransform.tnSelf = self`)
function nodeSelfLink(parentClass: string | null, classNode?: AstNode): string {
  if (!parentClass || !nodeParentClassKeys.has(parentClass)) return '';
  const key = nodeParentClassKeys.get(parentClass) ?? '';
  const cls = nodeRegistry.classes[key];
  if (!cls || !('tnSelf' in cls.props)) return '';
  let code = `self.${parentClass}.tnSelf = self\n\t\t`;
  // Overridden hook methods (_transform …) are registered on the embedded struct
  if (classNode && nodeRegistry.hookPrefixes[key]) {
    for (const member of classNode.members ?? []) {
      if (!isMethodDeclaration(member) || !member.name || !isIdentifier(member.name)) continue;
      const name: string = member.name.text;
      if (name in nodeRegistry.hookParams) code += `self.${parentClass}.setHook(${toGoStringLiteral(name)}, self.${name})\n\t\t`;
    }
  }
  return code;
}

// Hook methods of subclasses of Node classes take the hooks' parameter types
function applyNodeHookTypes(parentClass: string | null, classNode: AstNode): void {
  if (!parentClass || !nodeParentClassKeys.has(parentClass)) return;
  if (!nodeRegistry.hookPrefixes[nodeParentClassKeys.get(parentClass) ?? '']) return;
  for (const member of classNode.members ?? []) {
    if (!isMethodDeclaration(member) || !member.name || !isIdentifier(member.name)) continue;
    const name: string = member.name.text;
    if (name in nodeRegistry.hookParams) member.tnParamTypes = nodeRegistry.hookParams[name];
  }
}

// class X extends EventEmitter: the parent is a Node helper struct
const nodeParentClassKeys = new Map<string, string>();

function nodeParentGoName(expr: AstNode): string {
  const key = resolveNodeKey(expr);
  const cls = key ? nodeRegistry.classes[key] : undefined;
  if (!cls || !cls.goType.startsWith('*') || !nodeRegistry.constructors[key]) return '';
  const goName = cls.goType.slice(1);
  nodeParentClassKeys.set(goName, key);
  return goName;
}

// The constructor parameters of a user class: its own, else the nearest
// ancestor's (the implicit constructor forwards them)
function constructorParameterNodes(className: string): AstNode[] {
  let current = className;
  for (let depth = 0; depth < 50 && current; depth++) {
    const classNode = declaredClasses.get(current);
    if (!classNode) return [];
    const ctor = (classNode.members ?? []).find((m: AstNode) => isConstructorDeclaration(m) && !!m.body);
    if (ctor) return ctor.parameters ?? [];
    current = classParentNames.get(current) ?? '';
  }
  return [];
}

// The parameters of the nearest user-class ancestor with a constructor, as a
// Go signature and the argument list forwarding them (null when none, or when
// they need destructuring)
function inheritedConstructorParameters(parentClass: string): { signature: string; forward: string[] } | null {
  let current = parentClass;
  for (let depth = 0; depth < 50 && current; depth++) {
    const classNode = declaredClasses.get(current);
    if (!classNode) return null;
    const ctor = (classNode.members ?? []).find((m: AstNode) => isConstructorDeclaration(m) && !!m.body);
    if (ctor) {
      const params: AstNode[] = ctor.parameters ?? [];
      if (params.length === 0 || params.some((p: AstNode) => !isIdentifier(p.name))) return null;
      const info = getFunctionParametersInfo(params);
      const forward: string[] = [];
      for (const part of splitGoParameters(info.signature)) {
        const trimmed = part.trim();
        const space = trimmed.indexOf(' ');
        const paramName = trimmed.substring(0, space);
        forward.push(trimmed.substring(space + 1).trim().startsWith('...') ? `${paramName}...` : paramName);
      }
      return { signature: info.signature, forward: forward };
    }
    current = classParentNames.get(current) ?? '';
  }
  return null;
}

function parentConstructorCall(parentClass: string, args: string[]): string {
  if (nodeParentClassKeys.has(parentClass)) {
    const key = nodeParentClassKeys.get(parentClass) ?? '';
    const call: NodeCall = { args, nodes: [], types: args.map(() => ''), recv: '' };
    const ctor: string = nodeRegistry.constructors[key](call);
    return ctor;
  }
  if (!usesNewTarget(parentClass)) return `New${parentClass}(${args.join(', ')})`;
  return `new${parentClass}As(${['__newTarget', ...args].join(', ')})`;
}

// Splits a Go parameter list at top-level commas
function splitGoParameters(signature: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of signature) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// NewX(…) — or, for new.target-aware classes, newXAs(__newTarget string, …) plus a
// NewX(…) that calls it with "X"
// Go signatures of the methods each class's Go type has (own and copied from
// ancestors): class → JS method name → its Go name, parameters and result.
// Dynamic calls (x.m() on an any value) dispatch over these (TnCall_m).
interface MethodSignature {
  goName: string;
  params: string;
  result: string;
}
const classMethodSignatures = new Map<string, Map<string, MethodSignature>>();
// Methods called on dynamic values: their dispatchers are emitted at the end
const dynamicMethodCalls = new Set<string>();

function recordMethodSignature(className: string, jsName: string, goName: string, params: string, result: string): void {
  const methods = classMethodSignatures.get(className) ?? new Map<string, MethodSignature>();
  methods.set(jsName, { goName: goName, params: params, result: result.trim() });
  classMethodSignatures.set(className, methods);
}

// x.m(…) on a dynamic value: TnCall_m dispatches on the value's class
function visitDynamicDispatch(node: AstNode): string | undefined {
  if (!isPropertyAccessExpression(node.expression) || !isIdentifier(node.expression.name)) return undefined;
  const receiver = node.expression.expression;
  if (!isDynamicValue(receiver) || hasQuestionDot(node.expression)) return undefined;
  const method: string = node.expression.name.text;
  if ((ARRAY_ONLY_METHODS.has(method) || STRING_ONLY_METHODS.has(method)) && !(MUTATING_ARRAY_METHODS.has(method) && classMethodNamed(method))) return undefined;
  useHelper('dynamic');
  useHelper('error');
  dynamicMethodCalls.add(method);
  const args = (node.arguments ?? []).map((a: AstNode) => (isSpreadElement(a) ? `${visit(a.expression)}...` : visit(a)));
  const hasSpread = (node.arguments ?? []).some((a: AstNode) => isSpreadElement(a));
  const argList = hasSpread
    ? `${visit(receiver)}, append([]interface{}{${args.filter((a: string) => !a.endsWith('...')).join(', ')}}, TnAs[[]interface{}](${args.find((a: string) => a.endsWith('...'))!.slice(0, -3)})...)...`
    : [visit(receiver), ...args].join(', ');
  const call = `TnCall_${dispatcherSuffix(method)}(${argList})`;
  // a result type known statically (the receiver's declared class) is asserted
  const resultType = method === 'toString' ? 'string' : inferExpressionType(node);
  if (!resultType || resultType === 'interface{}' || resultType === 'any' || resultType === 'nil') return call;
  return NULLABLE_PRIMITIVE_TYPES.includes(resultType) ? `TnAsPtr[${resultType.slice(1)}](${call})` : `TnAs[${resultType}](${call})`;
}

function dispatcherSuffix(method: string): string {
  return method.replace(/[^A-Za-z0-9_]/g, '_');
}

// A parameter's value from a dispatcher's argument list
function dispatchArgument(goType: string, index: number): string {
  if (goType.startsWith('...')) {
    const element = goType.slice(3);
    return element === 'interface{}' ? `TnRestArgs(__args, ${index})...` : `TnRestArgsAs[${element}](__args, ${index})...`;
  }
  if (NULLABLE_PRIMITIVE_TYPES.includes(goType)) return `TnAsPtr[${goType.slice(1)}](TnArg(__args, ${index}))`;
  if (goType === 'interface{}') return `TnArg(__args, ${index})`;
  return `TnAs[${goType}](TnArg(__args, ${index}))`;
}

// Whether some class declares a method of this name
function classMethodNamed(method: string): boolean {
  for (const declaration of declaredClasses.values()) {
    if ((declaration.members ?? []).some((m: AstNode) => isMethodDeclaration(m) && memberKey(m.name) === method)) return true;
  }
  return false;
}

// JSON.stringify calls a class's toJSON(key, …) through TnToJSON, and
// String(x) / templates its toString(…) through TnToString (Go can match
// only an exact method signature)
function emitToJSONWrappers(): string {
  const out: string[] = [];
  for (const [className, methods] of classMethodSignatures) {
    const toString = methods.get('toString');
    if (toString && toString.result === 'string') {
      const paramTypes = toString.params ? goFuncParamTypes(`func(${toString.params})`) : [];
      out.push(`func (self *${getSafeName(className)}) TnToString() string {\n\tvar __args []interface{}\n\t_ = __args\n\treturn self.${toString.goName}(${paramTypes.map((t, i) => dispatchArgument(t, i)).join(', ')})\n}`);
    }
    const sig = methods.get('toJSON');
    if (!sig) continue;
    const paramTypes = sig.params ? goFuncParamTypes(`func(${sig.params})`) : [];
    const callArgs = paramTypes.map((t, i) => dispatchArgument(t, i)).join(', ');
    const call = `self.${sig.goName}(${callArgs})`;
    out.push(`func (self *${getSafeName(className)}) TnToJSON(key string) interface{} {\n\t__args := []interface{}{key}\n\t_ = __args\n\t${sig.result ? `return ${call}` : `${call}\n\treturn nil`}\n}`);
  }
  if (out.length > 0) useHelper('dynamic');
  return out.join('\n\n');
}

// The TnCall_m dispatchers of the dynamic calls the program makes
function emitDynamicDispatchers(): string {
  const out: string[] = [];
  for (const method of [...dynamicMethodCalls].sort()) {
    const cases: string[] = [];
    for (const [className, methods] of classMethodSignatures) {
      const sig = methods.get(method);
      if (!sig) continue;
      const paramTypes = sig.params ? goFuncParamTypes(`func(${sig.params})`) : [];
      const callArgs = paramTypes.map((t, i) => dispatchArgument(t, i)).join(', ');
      const call = `o.${sig.goName}(${callArgs})`;
      cases.push(`\tcase *${getSafeName(className)}:\n\t\t${sig.result ? `return ${call}` : `${call}\n\t\treturn nil`}`);
    }
    const suffix = dispatcherSuffix(method);
    const body = cases.length > 0 ? `\tswitch o := __recv.(type) {\n${cases.join('\n')}\n\t}\n` : '';
    // (toString on any other value: its JS string form)
    const fallback = method === 'toString' ? 'TnJSString(__recv)' : `TnCallMember(__recv, ${toGoStringLiteral(method)}, __args...)`;
    out.push(`func TnCall_${suffix}(__recv interface{}, __args ...interface{}) interface{} {\n${body}\treturn ${fallback}\n}`);
  }
  return out.join('\n\n');
}

function emitConstructor(name: string, typeParams: string, typeParamNames: string, signature: string, body: string): string {
  classConstructorSignatures.set(name, signature);
  if (!usesNewTarget(name)) return `func New${name}${typeParams}(${signature}) *${name}${typeParamNames} ${body}\n\n`;
  const forward = splitGoParameters(signature).map((p) => {
    const [paramName, paramType] = [p.slice(0, p.indexOf(' ')), p.slice(p.indexOf(' ') + 1)];
    return paramType.startsWith('...') ? `${paramName}...` : paramName;
  });
  const internal = ['__newTarget string', signature].filter((part) => part).join(', ');
  return (
    `func new${name}As${typeParams}(${internal}) *${name}${typeParamNames} ${body}\n\n` +
    `func New${name}${typeParams}(${signature}) *${name}${typeParamNames} {\n\t\treturn new${name}As${typeParamNames}(${[toGoStringLiteral(name), ...forward].join(', ')})\n\t}\n\n`
  );
}

function fieldInitializers(classNode: AstNode): string {
  const counted = typeof classNode.covFields === 'number' ? `${coverageCount(classNode.covFields)}\n\t\t` : '';
  return counted + (classNode.members ?? [])
    .filter(
      (m: AstNode) =>
        isPropertyDeclaration(m) &&
        m.initializer &&
        (isIdentifier(m.name) || m.name?.kind === 'PrivateIdentifier') &&
        !(m.modifiers ?? []).some((mod: AstNode) => mod.kind === 'StaticKeyword')
    )
    .map((m: AstNode) => {
      const fieldName = memberKey(m.name);
      return `self.${goFieldName(fieldName)} = ${toGoValueOfType(m.initializer, getPropertyDeclarationType(m))}\n\t\t`;
    })
    .join('');
}

// A class field's type: declared, else inferred from its initializer (n = 1 → float64)
function getPropertyDeclarationType(member: AstNode): string {
  if (member.type || !member.initializer) return getOptionalNodeType(member.type, !!member.questionToken);
  return toFieldGoType(inferExpressionType(member.initializer));
}

// Sorts in place and returns the array; without a comparator, compares as strings (like JS)
function sortArray(obj: string, args: string[]): string {
  importedPackages.add('sort');
  const arrayType = currentReceiverGoType?.startsWith('[]') ? currentReceiverGoType : '[]interface{}';
  // (elements converted to the comparator's parameter types)
  const comparatorType = currentCallArgTypes[0] ?? '';
  const paramTypes = comparatorType.startsWith('func(') ? goFuncParamTypes(comparatorType) : [];
  const element = (v: string, i: number) => (paramTypes[i] && !paramTypes[i].startsWith('...') ? convertBetweenGoTypes(v, arrayType.slice(2), paramTypes[i]) : v);
  let less = `(${args[0]})(${element('__s[i]', 0)}, ${element('__s[j]', 1)}) < 0`;
  if (!args[0]) {
    // the default order compares the elements as strings
    useHelper('dynamic');
    less = `TnJSString(__s[i]) < TnJSString(__s[j])`;
  }
  return `func() ${arrayType} { __s := ${obj}; sort.SliceStable(__s, func(i, j int) bool { return ${less} }); return __s }()`;
}

function mathCall(fn: string, args: string[]): string {
  importedPackages.add('math');
  return `math.${fn}(${args.join(', ')})`;
}

// Go types of the arguments of the call being emitted (for call handlers)
let currentCallArgTypes: (string | undefined)[] = [];
// The argument nodes of that call (for handlers that need more than the types)
let currentCallArgNodes: AstNode[] = [];
const ASSIGNMENT_OPERATORS = new Set([
  'EqualsToken', 'PlusEqualsToken', 'MinusEqualsToken', 'AsteriskEqualsToken', 'SlashEqualsToken',
  'PercentEqualsToken', 'AsteriskAsteriskEqualsToken', 'LessThanLessThanEqualsToken',
  'GreaterThanGreaterThanEqualsToken', 'GreaterThanGreaterThanGreaterThanEqualsToken',
  'AmpersandEqualsToken', 'BarEqualsToken', 'CaretEqualsToken', 'BarBarEqualsToken',
  'AmpersandAmpersandEqualsToken', 'QuestionQuestionEqualsToken'
]);
// The call expression whose method handler is running (see getCallString)
let currentCallNode: AstNode | undefined;

// Whether an expression's value is thrown away: an expression statement, or a
// for loop's initializer / incrementor
// Expressions emitted as statements though their parent would use the value
// (a void arrow's expression body)
const discardedExpressions = new Set<AstNode>();

function isDiscardedValue(node: AstNode): boolean {
  if (discardedExpressions.has(node)) return true;
  let child = node;
  let parent = node.parent;
  while (parent && isParenthesizedExpression(parent)) {
    child = parent;
    parent = parent.parent;
  }
  if (!parent) return true;
  if (isExpressionStatement(parent)) return true;
  if (parent.kind === 'VoidExpression') return true;
  return isForStatement(parent) && (parent.initializer === child || parent.incrementor === child);
}

// for headers with several declarations / updates: Go's parallel forms
// (i, j := 0, 10 and i, j = i+1, j-1)
// Go's for header takes no var declaration: `var x T [= v]` → `x := …`
function forHeaderInit(init: string): string {
  const declaration = /^var (\w+) ([^=]+?)(?: = ([\s\S]*))?;?$/.exec(init.trim());
  if (!declaration) return init;
  const [, name, goType, value] = declaration;
  return value === undefined ? `${name} := *new(${goType})` : `${name} := (${goType})(${value})`;
}

function visitMultiForHeader(node: AstNode): string | undefined {
  const declarations: AstNode[] = isVariableDeclarationList(node.initializer) ? (node.initializer.declarations ?? []) : [];
  const updates: AstNode[] = [];
  const collect = (expr: AstNode | undefined) => {
    if (!expr) return;
    if (isBinaryExpression(expr) && expr.operatorToken.kind === 'CommaToken') {
      collect(expr.left);
      collect(expr.right);
    } else updates.push(expr);
  };
  collect(node.incrementor);
  if (declarations.length < 2 && updates.length < 2) return undefined;
  let init = visit(node.initializer!, { inline: true });
  if (declarations.length >= 2) {
    for (const d of declarations) {
      if (isIdentifier(d.name) && d.initializer) registerLocalVariable(d.name.text, inferExpressionType(d.initializer));
    }
    init = `${declarations.map((d) => visit(d.name)).join(', ')} := ${declarations.map((d) => (d.initializer ? visit(d.initializer) : 'nil')).join(', ')}`;
  }
  let post = updates.length < 2 ? visit(node.incrementor!, { inline: true }) : '';
  if (updates.length >= 2) {
    const targets: string[] = [];
    const values: string[] = [];
    let simple = true;
    for (const u of updates) {
      if ((isPrefixUnaryExpression(u) || isPostfixUnaryExpression(u)) && isIncrementOrDecrement(u)) {
        const target = visit(u.operand);
        targets.push(target);
        values.push(`${target} ${u.operator === 'PlusPlusToken' ? '+' : '-'} 1`);
      } else if (isBinaryExpression(u) && u.operatorToken.kind === 'EqualsToken') {
        targets.push(visit(u.left));
        values.push(visit(u.right));
      } else simple = false;
    }
    // i++, o += w: Go's post statement is one simple statement, so other
    // updates run in order inside a call
    post = simple
      ? `${targets.join(', ')} = ${values.join(', ')}`
      : `func() { ${updates.map((u) => { discardedExpressions.add(u); return visit(u, { inline: true }); }).join('; ')} }()`;
  }
  const condition = node.condition ? toGoCondition(node.condition) : '';
  // let i = 0, ch = s[i]: a later initializer reads an earlier variable, which
  // a Go `a, b := …` can't see — declared one by one before the loop
  const readsEarlier = declarations.some((d, k) =>
    k > 0 && !!d.initializer && containsNode(d.initializer, (n) => isIdentifier(n) && declarations.slice(0, k).some((e) => isIdentifier(e.name) && e.name.text === n.text))
  );
  if (readsEarlier) {
    const decls = declarations.map((d) => `${visit(d.name)} := ${d.initializer ? visit(d.initializer) : 'nil'}; _ = ${visit(d.name)}`).join('; ');
    return `{ ${decls}\n\tfor ; ${condition}; ${post}${visitLoopBody(node.statement)}}\n\t`;
  }
  return `for ${init}; ${condition}; ${post}${visitLoopBody(node.statement)}`;
}

function isIncrementOrDecrement(node: AstNode): boolean {
  return node.operator === 'PlusPlusToken' || node.operator === 'MinusMinusToken';
}

// x++ / ++x: Go only has the statement form, so used as a value they become
// a closure returning the old (postfix) or new (prefix) value
function visitIncrementOrDecrement(node: AstNode, isPrefix: boolean): string {
  // ta[i]++ on a typed array: read, convert back on Set
  if (isElementAccessExpression(node.operand) && isTypedArrayGoType(inferExpressionType(node.operand.expression))) {
    const sign = node.operator === 'PlusPlusToken' ? '+' : '-';
    const arr = getTempName('ta');
    const index = getTempName('i');
    const old = getTempName('old');
    const result = isPrefix ? `${arr}.Get(${index})` : old;
    return `func() float64 { ${arr}, ${index} := ${visit(node.operand.expression)}, ${visit(node.operand.argumentExpression)}; ${old} := ${arr}.Get(${index}); ${arr}.Set(${index}, ${old} ${sign} 1); return ${result} }()`;
  }
  const target = visit(node.operand, { inline: true });
  const op = node.operator === 'PlusPlusToken' ? '++' : '--';
  const parent = node.parent;
  const isStatement =
    isExpressionStatement(parent) || (isForStatement(parent) && parent.incrementor === node);
  if (isStatement) return `${target}${op}`;
  if (isPrefix) return `func() float64 { ${target}${op}; return ${target} }()`;
  return `func() float64 { __old := ${target}; ${target}${op}; return __old }()`;
}

// Expression replacing the receiver of the typed-array call being inlined by
// visitArrayHigherOrderCall ('' otherwise)
let typedArrayReceiverExpr = '';
// Variables holding an ArrayBuffer (typed-array constructors view these)
const arrayBufferVariables = new Set<string>();

const TYPED_ARRAY_CALLBACK_METHODS = [
  'map', 'filter', 'forEach', 'some', 'every', 'find', 'findIndex', 'findLast', 'findLastIndex', 'reduce',
  'reduceRight', 'entries'
];

// Whether a []byte expression is an ArrayBuffer rather than a Uint8Array /
// Buffer: new ArrayBuffer(n), x.buffer, an ArrayBuffer-typed variable, and
// slices of those
function isArrayBufferExpression(node: AstNode): boolean {
  if (!node) return false;
  const expr = unwrapParentheses(node);
  if (isAsExpression(expr)) return isArrayBufferTypeNode(expr.type) || isArrayBufferExpression(expr.expression);
  if (isNewExpression(expr) && isIdentifier(expr.expression)) {
    return expr.expression.text === 'ArrayBuffer' || expr.expression.text === 'SharedArrayBuffer';
  }
  if (isPropertyAccessExpression(expr)) return expr.name.text === 'buffer';
  if (isCallExpression(expr) && isPropertyAccessExpression(expr.expression) && expr.expression.name.text === 'slice') {
    return isArrayBufferExpression(expr.expression.expression);
  }
  if (isIdentifier(expr)) {
    return arrayBufferVariables.has(expr.text) || isArrayBufferTypeNode(variableTypeNodes.get(expr.text));
  }
  return false;
}

function isArrayBufferTypeNode(typeNode: AstNode): boolean {
  if (!typeNode || !isTypeReferenceNode(typeNode) || !isIdentifier(typeNode.typeName)) return false;
  const name = typeNode.typeName.text;
  return name === 'ArrayBuffer' || name === 'SharedArrayBuffer' || name === 'ArrayBufferLike';
}

// ta[i] = v / ta[i] op= v: one Set with the value converted like JS
function visitTypedArrayAssignment(target: AstNode, op: string, right: AstNode): string | undefined {
  const value = visit(right);
  if (op === '=') return `${visit(target.expression)}.Set(${visit(target.argumentExpression)}, ${value})`;
  const arr = getTempName('ta');
  const index = getTempName('i');
  const current = `${arr}.Get(${index})`;
  let combined = '';
  if (op === '+=' || op === '-=' || op === '*=' || op === '/=') combined = `${current} ${op[0]} (${value})`;
  else if (op === '%=') {
    importedPackages.add('math');
    combined = `math.Mod(${current}, ${value})`;
  } else if (op === '**=') {
    importedPackages.add('math');
    combined = `math.Pow(${current}, ${value})`;
  } else if (op === '&=' || op === '|=' || op === '^=') {
    useHelper('dynamic');
    combined = `float64(TnInt32(${current}) ${op[0]} TnInt32(${value}))`;
  } else if (op === '<<=' || op === '>>=') {
    useHelper('dynamic');
    combined = `float64(TnInt32(${current}) ${op.slice(0, 2)} (uint32(TnInt32(${value})) & 31))`;
  } else if (op === '>>>=') {
    useHelper('dynamic');
    combined = `float64(uint32(TnInt32(${current})) >> (uint32(TnInt32(${value})) & 31))`;
  } else return undefined;
  return `func() float64 { ${arr}, ${index} := ${visit(target.expression)}, ${visit(target.argumentExpression)}; return ${arr}.Set(${index}, ${combined}) }()`;
}

// Calls on typed arrays the Go type can't take: callback methods are inlined
// over the elements as numbers (map / filter results become the same kind of
// typed array); ArrayBuffer#slice copies
function visitTypedArrayCall(node: AstNode): string | undefined {
  if (!isPropertyAccessExpression(node.expression)) return undefined;
  const method = node.expression.name.text;
  const recvNode = node.expression.expression;
  if (method === 'slice' && isArrayBufferExpression(recvNode)) {
    useHelper('typedArrays');
    const args = (node.arguments ?? []).map((a: AstNode) => `, ${visit(a)}`).join('');
    return `TnArrayBufferSlice(${visit(recvNode)}${args})`;
  }
  const recvType = inferExpressionType(recvNode);
  if (!isTypedArrayGoType(recvType) || !TYPED_ARRAY_CALLBACK_METHODS.includes(method)) return undefined;
  const resultType = inferExpressionType(node) ?? '';
  const arr = getTempName('ta');
  const recv = visit(recvNode);
  typedArrayReceiverExpr = `${arr}.tnFloats()`;
  const inner = visitArrayHigherOrderCall(node);
  typedArrayReceiverExpr = '';
  if (!inner) return undefined;
  if (method === 'forEach') return `func() { ${arr} := ${recv}; ${inner} }()`;
  const value = method === 'map' || method === 'filter' ? `${arr}.tnLike(${inner})` : inner;
  return `func() ${resultType} { ${arr} := ${recv}; return ${value} }()`;
}

// Adapter types generated so far ('IntHeap__container_heap_Interface')
const goInterfaceAdapters = new Set<string>();

// get prop() { … } → func (self *T) Get_prop() RetType { … };
// set prop(val) { … } → func (self *T) Set_prop(val ValType) { … }
function emitAccessor(member: AstNode, receiver: string, mockSlots: string[] = []): string {
  const accessorName = visit(member.name);
  const tsName: string = memberKey(member.name) ?? accessorName;
  // static get x() / set x(v): package functions C_Get_x / C_Set_x
  if ((member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) {
    const owner = receiver.replace(/\[.*$/, '');
    if (isGetAccessor(member)) {
      const returnType = member.type ? ` ${getType(member.type)}` : ' interface{}';
      return `${lineMarker(member)}func ${owner}_Get_${accessorName}()${returnType} ${visit(member.body!)}\n\n`;
    }
    const info = getFunctionParametersInfo(member.parameters ?? []);
    return `${lineMarker(member)}func ${owner}_Set_${accessorName}(${info.signature}) ${visit(member.body!, { prefixBlockContent: info.prefixBlockContent })}\n\n`;
  }
  if (isGetAccessor(member)) {
    const returnType = ` ${member.type ? getType(member.type) : methodReturnGoType(member) || 'interface{}'}`;
    const body = visit(member.body!);
    const slotKey = mockSlotKey('get', tsName);
    const mockable = mockedMemberNames.has(slotKey) ? emitMockableMethod(receiver, `Get_${accessorName}`, slotKey, '', returnType, body, mockSlots) : '';
    if (mockable) return `${lineMarker(member)}${mockable}\n\n`;
    return `${lineMarker(member)}func (self *${receiver}) Get_${accessorName}()${returnType} ${body}\n\n`;
  }
  const parameterInfo = getFunctionParametersInfo(member.parameters ?? []);
  const body = visit(member.body!, { prefixBlockContent: parameterInfo.prefixBlockContent });
  const slotKey = mockSlotKey('set', tsName);
  const mockable = mockedMemberNames.has(slotKey) ? emitMockableMethod(receiver, `Set_${accessorName}`, slotKey, parameterInfo.signature, '', body, mockSlots) : '';
  if (mockable) return `${lineMarker(member)}${mockable}\n\n`;
  return `${lineMarker(member)}func (self *${receiver}) Set_${accessorName}(${parameterInfo.signature}) ${body}\n\n`;
}

// arr[i] = v through a pointer to the slice, so a write past the end can grow
// it (holes read as the zero value, not undefined); '' when the array isn't
// addressable or isn't a plain array
function visitGrowingArrayWrite(target: AstNode, value: AstNode): string {
  const arrayType = inferExpressionType(target.expression) ?? '';
  const sliceType = arrayType.startsWith('*[]') ? arrayType.slice(1) : arrayType;
  if (!sliceType.startsWith('[]') || sliceType === '[]byte' || isTypedArrayGoType(arrayType)) return '';
  const elementType = sliceType.slice(2);
  const container = unwrapParentheses(target.expression);
  let pointer = '';
  if (container.kind === 'TnArrayItems') {
    pointer = `${visit(container.expression)}.TnItems()`;
  } else if (isIdentifier(container) && referenceArrays.has(container.text)) {
    pointer = getSafeName(container.text);
  } else if (isIdentifier(container) || isPropertyAccessExpression(container)) {
    const code = visit(container);
    // a field read through a getter call isn't addressable
    if (code.endsWith(')')) return '';
    pointer = `&${code}`;
  } else if (isElementAccessExpression(container)) {
    // m[0][1] = v: the inner array, addressed in its container
    const outerType = inferExpressionType(container.expression) ?? '';
    if (!outerType.replace(/^\*/, '').startsWith('[][]')) return '';
    const outer = unwrapParentheses(container.expression);
    const outerCode = isIdentifier(outer) && referenceArrays.has(outer.text) ? `(*${getSafeName(outer.text)})` : visit(outer);
    pointer = `&${outerCode}[int(${visit(container.argumentExpression)})]`;
  } else {
    return '';
  }
  useHelper('arrayWrite');
  return `TnSetAt[${elementType}](${pointer}, ${visit(target.argumentExpression)}, ${toGoValueOfType(value, elementType)})`;
}

// A TS (key, value) callback (JSON replacer / reviver) as the Go
// func(string, interface{}) interface{} the JSON helpers call; '' if not a function
function jsonCallbackAdapter(fnNode: AstNode | undefined, fnCode: string): string {
  const fnType = fnNode ? inferExpressionType(fnNode) ?? '' : '';
  if (!fnType.startsWith('func(')) return '';
  const close = goFuncReturnType(fnType);
  const paramList = fnType.slice(5, fnType.length - (close ? close.length + 1 : 0) - 1).trim();
  const params = splitGoParameters(paramList).map((p) => {
    // `func(k string, v any)`: drop parameter names
    const space = p.indexOf(' ');
    const first = space > 0 ? p.slice(0, space) : p;
    return space > 0 && !['chan', 'func', 'map', 'struct', 'interface'].includes(first) && /^[A-Za-z_]\w*$/.test(first)
      ? p.slice(space + 1)
      : p;
  });
  useHelper('dynamic');
  const args: string[] = [];
  if (params.length > 0) args.push(params[0] === 'string' ? '__k' : `TnAs[${params[0]}](__k)`);
  if (params.length > 1) args.push(params[1] === 'interface{}' || params[1] === 'any' ? '__v' : `TnAs[${params[1]}](__v)`);
  const call = `${fnCode}(${args.join(', ')})`;
  return `func(__k string, __v interface{}) interface{} { ${close ? `return ${call}` : `${call}; return nil`} }`;
}

// An async arrow function that isn't an argument of a call: it is lowered to a
// promise-returning function (callbacks keep running inline, see the arrow emitter)
function isPromiseReturningArrow(node: AstNode): boolean {
  if (!isArrowFunction(node) && !isFunctionExpression(node)) return false;
  if (!(node.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) return false;
  let parent = node.parent;
  while (parent && isParenthesizedExpression(parent)) parent = parent.parent;
  return !((isCallExpression(parent) || isNewExpression(parent)) && (parent.arguments ?? []).includes(node));
}

// async (…) => body as `func(…) chan T`, run like an async function
function emitAsyncArrow(node: AstNode): string {
  if (isBlock(node.body)) return emitChannelFunction(node, true, 'func');
  // a concise body is the promise's value: emitted as `{ return body }`
  const original = node.body;
  const returned: AstNode = { kind: 'ReturnStatement', expression: original };
  const block: AstNode = { kind: 'Block', statements: [returned], parent: node };
  returned.parent = block;
  node.body = block;
  const emitted = emitChannelFunction(node, true, 'func');
  node.body = original;
  return emitted;
}

// Object.groupBy(items, cb) → Record<string, T[]>; Map.groupBy → Map<K, T[]>
function groupByGoType(items: AstNode, callback: AstNode, asMap: boolean): string {
  const itemsType = (inferExpressionType(items) ?? '').replace(/^\*/, '');
  const elementType = itemsType.startsWith('[]') ? itemsType.slice(2) : 'interface{}';
  const keyType = asMap ? goFuncReturnType(functionValueGoType(callback)) ?? 'interface{}' : 'string';
  return `*TnMap[${keyType}, []${elementType}]`;
}

// (item, index) of an Object.groupBy / Map.groupBy key selector: the items'
// element type and number
function groupByCallbackParamType(param: AstNode): string | undefined {
  const fn = param.parent;
  const call = fn?.parent;
  if (!fn || !isCallExpression(call) || call.arguments?.[1] !== fn || !isPropertyAccessExpression(call.expression)) return undefined;
  const owner = call.expression.expression;
  if (!isIdentifier(owner) || (owner.text !== 'Object' && owner.text !== 'Map') || call.expression.name.text !== 'groupBy') return undefined;
  const index = (fn.parameters ?? []).indexOf(param);
  if (index === 1) return 'float64';
  if (index !== 0) return undefined;
  const itemsType = (inferExpressionType(call.arguments[0]) ?? '').replace(/^\*/, '');
  return itemsType.startsWith('[]') ? itemsType.slice(2) : undefined;
}

function visitGroupBy(args: string[], asMap: boolean): string {
  useHelper('orderedMap');
  useHelper('dynamic');
  const [itemsNode, callbackNode] = currentCallArgNodes;
  const mapType = groupByGoType(itemsNode, callbackNode, asMap);
  const [keyType, valueType] = splitMapTypeArgs(mapType) ?? ['string', '[]interface{}'];
  const callbackParams = goFuncParamTypes(functionValueGoType(callbackNode));
  const callArgs = ['__x', 'float64(__i)'].slice(0, callbackParams.length).join(', ');
  const key = asMap ? `${args[1]}(${callArgs})` : `TnJSString(${args[1]}(${callArgs}))`;
  const grouped = `func() ${mapType} { __g := TnNewMap[${keyType}, ${valueType}](); for __i, __x := range ${args[0]} { _ = __i; __k := ${key}; __g.Set(__k, append(__g.Get(__k), __x)) }; return __g }()`;
  return asMap ? `TnJSCollection(${grouped}, 1)` : grouped;
}

// Promise.withResolvers<T>()'s result: { promise, resolve, reject }
function promiseWithResolversGoType(t: string): string {
  return `*struct{ promise chan ${t}; resolve func(...interface{}); reject func(...interface{}) }`;
}

// A class instance / typed object (a pointer to a struct with known fields)
function isFieldObjectType(goType: string): boolean {
  if (!goType.startsWith('*') || goType.startsWith('*[]') || goType.startsWith('*TnMap[')) return false;
  // typed arrays and Node classes index / dispatch on their own
  if (isTypedArrayGoType(goType) || goType in nodeRegistry.classByGoType) return false;
  return objectFieldNames(goType).length > 0 || objectGetterNames(goType).length > 0;
}

// The getters a class declares or inherits (read through Get_x())
function objectGetterNames(goType: string): string[] {
  const base = goType.replace(/^\*/, '').replace(/\[.*$/, '');
  const names: string[] = [];
  for (const key of classGetterMethods) {
    if (key.startsWith(`${base}.`) && !key.slice(base.length + 1).startsWith('__')) names.push(key.slice(base.length + 1));
  }
  return names;
}

// The common Go type of an object's readable members, or interface{}
function objectMemberCommonType(goType: string): string {
  const types = [...objectFieldNames(goType), ...objectGetterNames(goType)].map(
    (f) => getObjectFieldGoType(goType, f) ?? 'interface{}'
  );
  return types.length > 0 && types.every((t) => t === types[0]) ? types[0] : 'interface{}';
}

// obj['field'] → obj.field (a getter call for accessors); obj[key] → a switch
// over the fields and getters ('' when it doesn't apply)
function visitObjectMemberAccess(node: AstNode, goType: string): string {
  const key = node.argumentExpression;
  if (inferExpressionType(key) === 'float64') return '';
  const object = visit(node.expression);
  const getters = objectGetterNames(goType);
  if (isStringLiteral(key)) {
    if (getters.includes(key.text) && !isAssignmentTarget(node)) return `${object}.Get_${goFieldName(key.text)}()`;
    return `${object}.${goFieldName(key.text)}`;
  }
  if (isAssignmentTarget(node)) return '';
  const resultType = objectMemberCommonType(goType);
  const cases = [
    ...objectFieldNames(goType).map((f) => `case ${toGoStringLiteral(f)}: return o.${goFieldName(f)}`),
    ...getters.map((g) => `case ${toGoStringLiteral(g)}: return o.Get_${goFieldName(g)}()`)
  ];
  return `func(o ${goType}, k string) ${resultType} { switch k { ${cases.join('; ')} }; var zero ${resultType}; return zero }(${object}, ${toGoValueOfType(key, 'string')})`;
}

const ITERATOR_HELPERS = new Set(['next', 'map', 'filter', 'flatMap', 'take', 'drop', 'toArray', 'forEach', 'some', 'every', 'find', 'reduce']);

// A callback of an iterator helper as func(T, float64) R (its own arity may be smaller)
function iteratorCallbackAdapter(callbackNode: AstNode | undefined, callback: string, elementType: string, resultType: string): string {
  const fnType = callbackNode ? functionValueGoType(callbackNode) : '';
  const arity = goFuncParamTypes(fnType).length;
  const callResult = goFuncReturnType(fnType) ?? '';
  const call = `${callback}(${['__v', '__i'].slice(0, arity).join(', ')})`;
  if (!resultType) return `func(__v ${elementType}, __i float64) { ${call} }`;
  const value = resultType === 'bool' ? truthinessCheck(call, callResult) : call;
  return `func(__v ${elementType}, __i float64) ${resultType} { return ${value} }`;
}

// gen.map(fn) / filter / take / drop / flatMap / toArray / forEach / some /
// every / find / reduce / next() on a generator's channel
function visitIteratorHelper(
  receiver: string,
  method: string,
  elementType: string,
  args: string[],
  callbackNode: AstNode | undefined,
  extraArgs: AstNode[]
): string {
  useHelper('iterators');
  const callbackResult = goFuncReturnType(callbackNode ? functionValueGoType(callbackNode) : '') ?? 'interface{}';
  switch (method) {
    case 'next':
      return `TnIterNext(${receiver})`;
    case 'map':
      return `TnIterMap(${receiver}, ${iteratorCallbackAdapter(callbackNode, args[0], elementType, callbackResult)})`;
    case 'flatMap':
      return `TnIterFlatMap(${receiver}, ${iteratorCallbackAdapter(callbackNode, args[0], elementType, callbackResult.startsWith('[]') ? callbackResult : '[]interface{}')})`;
    case 'filter':
    case 'some':
    case 'every':
    case 'find': {
      const name = { filter: 'Filter', some: 'Some', every: 'Every', find: 'Find' }[method];
      return `TnIter${name}(${receiver}, ${iteratorCallbackAdapter(callbackNode, args[0], elementType, 'bool')})`;
    }
    case 'take':
      return `TnIterTake(${receiver}, ${args[0]})`;
    case 'drop':
      return `TnIterDrop(${receiver}, ${args[0]})`;
    case 'toArray':
      return `TnIterToArray(${receiver})`;
    case 'forEach':
      return `TnIterForEach(${receiver}, ${iteratorCallbackAdapter(callbackNode, args[0], elementType, '')})`;
    case 'reduce': {
      const accType = extraArgs[0] ? inferExpressionType(extraArgs[0]) ?? elementType : elementType;
      const fnType = callbackNode ? functionValueGoType(callbackNode) : '';
      const arity = goFuncParamTypes(fnType).length;
      const call = `${args[0]}(${['__a', '__v', '__i'].slice(0, arity).join(', ')})`;
      const reducer = `func(__a ${accType}, __v ${elementType}, __i float64) ${accType} { return ${call} }`;
      return `TnIterReduce(${receiver}, ${reducer}, ${args[1] ?? `*new(${accType})`}, ${args.length > 1})`;
    }
  }
  return `${receiver}.${method}(${args.join(', ')})`;
}

// (value, index) / (acc, value, index) of an iterator helper callback on a generator
function iteratorCallbackParamType(param: AstNode): string | undefined {
  const fn = param.parent;
  const call = fn?.parent;
  if (!fn || !isCallExpression(call) || call.arguments?.[0] !== fn || !isPropertyAccessExpression(call.expression)) return undefined;
  const method = call.expression.name.text;
  if (!ITERATOR_HELPERS.has(method)) return undefined;
  const receiverType = inferExpressionType(call.expression.expression) ?? '';
  if (!receiverType.startsWith('chan ')) return undefined;
  const elementType = receiverType.slice(5);
  const index = (fn.parameters ?? []).indexOf(param);
  if (method === 'reduce') {
    if (index === 0) return call.arguments[1] ? inferExpressionType(call.arguments[1]) : elementType;
    return index === 1 ? elementType : index === 2 ? 'float64' : undefined;
  }
  return index === 0 ? elementType : index === 1 ? 'float64' : undefined;
}

// The result type of an iterator helper call on a generator
function iteratorHelperGoType(expr: AstNode, receiverType: string, method: string): string | undefined {
  const elementType = receiverType.slice(5);
  const callbackResult = expr.arguments?.[0] ? goFuncReturnType(functionValueGoType(expr.arguments[0])) : undefined;
  switch (method) {
    case 'next':
      return `*TnIterResult[${elementType}]`;
    case 'map':
      return `chan ${callbackResult ?? 'interface{}'}`;
    case 'flatMap':
      return callbackResult?.startsWith('[]') ? `chan ${callbackResult.slice(2)}` : 'chan interface{}';
    case 'filter':
    case 'take':
    case 'drop':
      return receiverType;
    case 'toArray':
      return `[]${elementType}`;
    case 'some':
    case 'every':
      return 'bool';
    case 'find':
      return elementType;
    case 'reduce':
      return expr.arguments?.[1] ? inferExpressionType(expr.arguments[1]) : elementType;
  }
  return undefined;
}

// Array.of(a, b, …): a slice of the arguments' common type
function arrayOfGoType(argTypes: (string | undefined)[]): string {
  const first = argTypes[0];
  if (!first || argTypes.some((t) => t !== first)) return '[]interface{}';
  return `[]${first}`;
}

// Every declared class that extends `className`, directly or not
function subclassNames(className: string): string[] {
  const result: string[] = [];
  for (const candidate of classParentNames.keys()) {
    let parent = classParentNames.get(candidate);
    for (let depth = 0; depth < 20 && parent; depth++) {
      if (parent === className) {
        result.push(candidate);
        break;
      }
      parent = classParentNames.get(parent);
    }
  }
  return result;
}

// The enclosing class that declares private name `#x`
function privateNameOwner(node: AstNode, privateName: string): string | undefined {
  let current: AstNode | undefined = node.parent;
  while (current) {
    if (
      isClassDeclaration(current) &&
      current.name &&
      (current.members ?? []).some((m: AstNode) => m.name?.kind === 'PrivateIdentifier' && m.name.text === privateName)
    ) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}

// x instanceof Map / Set / Date / Array on built-in values
function builtinInstanceOf(value: string, name: string): string {
  if (name === 'Map' || name === 'WeakMap' || name === 'Set' || name === 'WeakSet') {
    useHelper('orderedMap');
    const kind = name.endsWith('Map') ? 1 : 2;
    return `func() bool { m, ok := interface{}(${value}).(interface{ TnJSKind() uint8 }); return ok && m.TnJSKind() == ${kind} }()`;
  }
  if (name === 'Date') {
    importedPackages.add('time');
    return `func() bool { _, ok := interface{}(${value}).(time.Time); return ok }()`;
  }
  // (bigint primitives are *big.Int values; there are no BigInt objects)
  if (name === 'BigInt') {
    useHelper('bigint');
    return `func() bool { _, ok := interface{}(${value}).(*tnbig.Int); return ok }()`;
  }
  if (name === 'Array') {
    useHelper('isArray');
    return `TnIsArray(${value})`;
  }
  // primitive wrapper objects (new String(…)) don't exist in TypeNative
  if (name === 'String' || name === 'Number' || name === 'Boolean') return `func() bool { _ = ${value}; return false }()`;
  return '';
}

// #x → __x: a Go name that a public member `x` can't clash with
function privateGoName(text: string): string {
  return `__${text.slice(1)}`;
}

// A member's name as the class registries key it (private names mangled)
function memberKey(name: AstNode | undefined): string {
  if (!name) return '';
  if (name.kind === 'PrivateIdentifier') return privateGoName(name.text);
  return name.text ?? '';
}

// Names a class declares itself: fields, methods, accessors, parameter
// properties (private ones without the '#')
function ownMemberNames(cls: AstNode): Set<string> {
  const names = new Set<string>();
  for (const member of cls.members ?? []) {
    if (!member.name?.text) continue;
    names.add(memberKey(member.name));
  }
  for (const param of getParameterProperties(cls)) names.add(param.name.text);
  return names;
}

// The class declaring static member `memberName`, searched from `className`
// up the inheritance chain (statics are package-level Class_member names)
// The Go type of static property (or getter) `memberName` of a class
function staticPropertyGoType(className: string, memberName: string): string | undefined {
  const owner = staticMemberOwner(className, memberName);
  if (!owner) return undefined;
  for (const member of declaredClasses.get(owner)?.members ?? []) {
    if (memberKey(member.name) !== memberName || !(member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) continue;
    if (isPropertyDeclaration(member)) {
      if (member.type) return getType(member.type);
      const t = member.initializer ? inferExpressionType(member.initializer) : undefined;
      return t && t !== 'nil' ? t : undefined;
    }
    if (isGetAccessor(member)) return methodReturnGoType(member) || undefined;
  }
  return undefined;
}

function staticMemberOwner(className: string, memberName: string): string | undefined {
  let name = className;
  for (let depth = 0; depth < 20 && name; depth++) {
    const key = `${name}.${memberName}`;
    if (classStaticMethods.has(key) || classStaticProps.has(key)) return name;
    name = classParentNames.get(name) ?? '';
  }
  return undefined;
}

// A class method declaration, searched up the inheritance chain
function findClassMethod(className: string, methodName: string): AstNode | undefined {
  let name = className;
  for (let depth = 0; depth < 20 && name; depth++) {
    const cls = declaredClasses.get(name);
    if (!cls) return undefined;
    // (of overloads, the implementation)
    const overloads = (cls.members ?? []).filter((member: AstNode) => member.kind === 'MethodDeclaration' && member.name && member.name.text === methodName);
    if (overloads.length > 0) return overloads.find((member: AstNode) => !!member.body) ?? overloads[0];
    name = classParentNames.get(name) ?? '';
  }
  return undefined;
}

// A Go value of type `from` as a class method parameter of type `to`
function adaptGoValue(expr: string, from: string, to: string): string {
  if (from === to || to === 'interface{}' || to === 'any' || !to) return expr;
  if (from === 'any' || from === 'interface{}') return `${expr}.(${goLocalType(to)})`;
  if (to === 'float64' && isGoNumericKind(from)) return `float64(${expr})`;
  return expr;
}

// heap.Push(h, x) with h an instance of `class IntHeap implements
// heap.Interface`: Go needs Len() int, the class has Len(): number. The
// adapter struct holds the instance and gives each interface method the
// exact Go signature, converting arguments and results.
function adaptClassToGoInterface(expr: string, fromType: string, toType: string, iface: GoType): string {
  const className = fromType.slice(1);
  if (!declaredClasses.has(className)) return '';
  for (const m of iface.ifaceMethods) {
    if (!findClassMethod(className, m.name)) return '';
  }
  const adapterName = `${className}__${toType.replace(/[^A-Za-z0-9]/g, '_')}`;
  if (!goInterfaceAdapters.has(adapterName)) {
    goInterfaceAdapters.add(adapterName);
    const methods: string[] = [];
    for (const m of iface.ifaceMethods) {
      const method = findClassMethod(className, m.name);
      const declared: AstNode[] = method.parameters ?? [];
      const params: string[] = [];
      const args: string[] = [];
      m.params.forEach((p: GoParam, i: number) => {
        ensureGoTypePackages(p.goType);
        const variadic = p.goType.startsWith('...');
        params.push(`p${i} ${goLocalType(p.goType)}`);
        if (i >= declared.length) return;
        const target = declared[i].type ? getType(declared[i].type) : 'interface{}';
        args.push(variadic ? `p${i}...` : adaptGoValue(`p${i}`, p.goType, target));
      });
      const call = `a.v.${getSafeName(m.name)}(${args.join(', ')})`;
      let body = call;
      let results = '';
      if (m.results.length === 1) {
        ensureGoTypePackages(m.results[0]);
        results = ` ${goLocalType(m.results[0])}`;
        // (a truthiness check: a missing Map entry is '' in the self-hosted build)
        const recorded = classMethodReturnTypes.get(className)?.get(m.name);
        const returned = method.type ? getType(method.type) : recorded ? recorded : 'interface{}';
        body = `return ${toGoType(call, returned, m.results[0])}`;
      } else if (m.results.length > 1) {
        results = ` (${m.results.map((r: string) => goLocalType(r)).join(', ')})`;
        body = `return ${call}`;
      }
      methods.push(`func (a *${adapterName}) ${m.name}(${params.join(', ')})${results} { ${body} }`);
    }
    mainPackageVariables.push(`// ${className} as a ${toType}\ntype ${adapterName} struct{ v *${className} }\n\n${methods.join('\n')}`);
  }
  return `&${adapterName}{v: ${expr}}`;
}

function compositeBody(rawEntries: string[]): string {
  const entries = rawEntries.map((e) => e.trimEnd());
  if (!entries.some((e) => e.includes('\n'))) return `{${entries.join(', ')}}`;
  return `{\n\t${entries.join(',\n\t')},\n}`;
}

// Struct field type for an inferred value type (null/unknown → interface{})
function toFieldGoType(goType: string | undefined): string {
  return !goType || goType === 'nil' ? 'interface{}' : goType;
}

function isDictionaryLiteral(node: AstNode): boolean {
  // Keys that are not Go identifiers ('Content-Type') can't be struct fields
  if (hasNonIdentifierKeys(node)) return true;
  const declaration = node.parent;
  if (!isVariableDeclaration(declaration) || !isIdentifier(declaration.name)) return false;
  let scope = declaration.parent;
  while (scope && !isBlock(scope) && !isSourceFile(scope)) scope = scope.parent;
  if (!scope) return false;
  const name = declaration.name.text;
  return containsNode(
    scope,
    (n) =>
      isElementAccessExpression(n) &&
      isIdentifier(n.expression) &&
      n.expression.text === name &&
      !isStringLiteral(n.argumentExpression)
  );
}

function hasNonIdentifierKeys(node: AstNode): boolean {
  if (!isObjectLiteralExpression(node)) return false;
  let sawKey = false;
  for (const p of node.properties ?? []) {
    if (!isPropertyAssignment(p)) {
      if (p.kind === 'SpreadAssignment' || isMethodDeclaration(p) || isGetAccessor(p) || isSetAccessor(p)) return false;
      continue;
    }
    // Go identifiers have no `$` ({ $id: 1 }, node:sqlite's named parameters)
    if (isStringLiteral(p.name) && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name.text)) sawKey = true;
    if (isIdentifier(p.name) && p.name.text.includes('$')) sawKey = true;
  }
  return sawKey;
}

function containsNode(root: AstNode, predicate: (n: AstNode) => boolean): boolean {
  for (const child of childNodes(root)) {
    if (predicate(child) || containsNode(child, predicate)) return true;
  }
  return false;
}

function getDictionaryValueType(node: AstNode): string {
  let valueType: string | undefined;
  for (const p of node.properties ?? []) {
    if (!isPropertyAssignment(p)) continue;
    const t = inferExpressionType(p.initializer);
    if (!t || (valueType && t !== valueType)) return 'interface{}';
    valueType = t;
  }
  return valueType ?? 'interface{}';
}

// Go type of an object literal, matching what the visitor emits
// Object literals that are dynamic objects: in an any context, or spreading an any value
function isDynamicObjectLiteral(node: AstNode): boolean {
  if (isAnyContext(getContextualTypeNode(node))) return true;
  // { [key]: v } has no struct shape (a Record context makes a typed map instead)
  if (
    (node.properties ?? []).some((p: AstNode) => p.name?.kind === 'ComputedPropertyName') &&
    !isRecordTypeNode(resolveTypeNode(getContextualTypeNode(node)))
  ) {
    return true;
  }
  // { name: { … } } nested in a dynamic object (with no declared member type) is dynamic too
  const parent = node.parent;
  if (
    isPropertyAssignment(parent) &&
    parent.initializer === node &&
    isObjectLiteralExpression(parent.parent) &&
    !getContextualTypeNode(node) &&
    isDynamicObjectLiteral(parent.parent)
  ) {
    return true;
  }
  return (node.properties ?? []).some(
    (p: AstNode) => p.kind === 'SpreadAssignment' && isDynamicValue(p.expression)
  );
}

// Object-literal accessors by anonymous-struct type: a getter's read invokes
// its closure, while a method's read is the function value itself (as in Node).
// Unregistered func fields (spread copies & co.) keep the read-invoke default.
const structGetterFields = new Map<string, Set<string>>();
const structMethodFields = new Map<string, Set<string>>();

function registerStructAccessors(structType: string, node: AstNode): void {
  for (const p of node.properties ?? []) {
    const isGetter = isGetAccessor(p);
    if ((!isGetter && !isMethodDeclaration(p)) || !isIdentifier(p.name)) continue;
    const registry = isGetter ? structGetterFields : structMethodFields;
    let names = registry.get(structType);
    if (!names) {
      names = new Set();
      registry.set(structType, names);
    }
    names.add(goFieldName(p.name.text));
  }
}

function isStructGetterField(structType: string, field: string): boolean {
  return structGetterFields.get(structType.replace(/^\*/, ''))?.has(goFieldName(field)) ?? false;
}

function isStructMethodField(structType: string, field: string): boolean {
  return structMethodFields.get(structType.replace(/^\*/, ''))?.has(goFieldName(field)) ?? false;
}

// The element type node of T[] / Array<T> / ReadonlyArray<T>
function arrayElementTypeNode(typeNode: AstNode | undefined): AstNode | undefined {
  if (!typeNode) return undefined;
  if (isArrayTypeNode(typeNode)) return typeNode.elementType;
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName) && ['Array', 'ReadonlyArray'].includes(typeNode.typeName.text) && (typeNode.typeArguments ?? []).length === 1 && !classNames.has(typeNode.typeName.text)) {
    return typeNode.typeArguments[0];
  }
  return undefined;
}

// The object type literals a union consists of (aliases resolved), or
// undefined when it has other members
function objectLiteralUnionMembers(types: AstNode[]): AstNode[] | undefined {
  const members = types.map((t: AstNode) => {
    const r = resolveTypeNode(t);
    if (isTypeReferenceNode(r) && isIdentifier(r.typeName)) {
      const alias = declaredTypeAliases.get(r.typeName.text);
      if (alias?.kind === 'TypeLiteral') return alias;
    }
    return r;
  });
  if (members.length < 2 || !members.every((m: AstNode | undefined) => m?.kind === 'TypeLiteral')) return undefined;
  if (members.some((m: AstNode) => (m.members ?? []).some((f: AstNode) => !isPropertySignature(f) || !isIdentifier(f.name)))) return undefined;
  return members as AstNode[];
}

// A union of object type literals as one struct: each field is the members'
// common type (one present in only some of them is optional; one whose
// types differ is any; never contributes nothing)
function mergedObjectUnionType(types: AstNode[]): string | undefined {
  const members = objectLiteralUnionMembers(types);
  if (!members) return undefined;
  const order: string[] = [];
  const fieldTypes = new Map<string, Set<string>>();
  const presence = new Map<string, number>();
  for (const member of members) {
    for (const f of member.members ?? []) {
      const name: string = f.name.text;
      if (!fieldTypes.has(name)) {
        fieldTypes.set(name, new Set());
        presence.set(name, 0);
        order.push(name);
      }
      presence.set(name, (presence.get(name) ?? 0) + 1);
      if (f.type?.kind === 'NeverKeyword') continue;
      fieldTypes.get(name)!.add(getOptionalNodeType(f.type, !!f.questionToken));
    }
  }
  const fields = order.map((name) => {
    const typesOf = [...fieldTypes.get(name)!];
    // (T and *T: the nullable one)
    const bare = new Set(typesOf.map((t) => (NULLABLE_PRIMITIVE_TYPES.includes(t) ? t.slice(1) : t)));
    let goType = typesOf.length === 0 ? 'interface{}' : bare.size === 1 ? typesOf.find((t) => t.startsWith('*')) ?? typesOf[0] : 'interface{}';
    if (presence.get(name)! < members.length) goType = makeNullableType(goType);
    return `${goFieldName(name)} ${goType}`;
  });
  return `*struct{ ${fields.join('; ')} }`;
}

// An object literal's contextual type; of a union of object types (a
// discriminated union), the member the literal is: the one its `type: '…'`
// (any string-literal-typed key) selects, else the first with all its keys
function objectLiteralContextualType(node: AstNode): AstNode | undefined {
  const contextual = resolveTypeNode(getContextualTypeNode(node));
  if (!contextual || !isUnionTypeNode(contextual)) return contextual;
  // (a union of object type literals is one merged object type)
  if (objectLiteralUnionMembers((contextual.types ?? []).filter((t: AstNode) => t.kind !== 'NullKeyword' && t.kind !== 'UndefinedKeyword'))) return contextual;
  const members = (contextual.types ?? [])
    .map((t: AstNode) => resolveTypeNode(t))
    .filter((t: AstNode | undefined) => !!t && t.kind !== 'NullKeyword' && t.kind !== 'UndefinedKeyword') as AstNode[];
  const objectMembers = members.filter((t) => t.kind === 'TypeLiteral' || (isTypeReferenceNode(t) && isIdentifier(t.typeName) && declaredInterfaces.has(t.typeName.text)));
  // (Map | Record<string, T>: an object literal is the Record)
  const record = members.find((t) => isRecordTypeNode(t));
  if (record && objectMembers.length === 0) return record;
  if (objectMembers.length === 0 || objectMembers.length !== members.length) return contextual;
  const props = (node.properties ?? []).filter((p: AstNode) => (isPropertyAssignment(p) || isShorthandPropertyAssignment(p)) && (isIdentifier(p.name) || isStringLiteral(p.name)));
  if (props.length !== (node.properties ?? []).length) return contextual;
  const literalValue = (p: AstNode): string | undefined =>
    isPropertyAssignment(p) && (isStringLiteral(p.initializer) || isNoSubstitutionTemplateLiteral(p.initializer)) ? p.initializer.text : undefined;
  const literalTypes = (t: AstNode | undefined): string[] => {
    const r = resolveTypeNode(t);
    if (!r) return [];
    if (isLiteralTypeNode(r) && isStringLiteral(r.literal)) return [r.literal.text];
    if (isUnionTypeNode(r)) return (r.types ?? []).flatMap((m: AstNode) => literalTypes(m));
    return [];
  };
  const fits = (member: AstNode) => props.every((p: AstNode) => {
    const memberType = getMemberTypeNode(member, p.name.text);
    if (!memberType || memberType.kind === 'NeverKeyword') return false;
    const tags = literalTypes(memberType);
    const value = literalValue(p);
    return tags.length === 0 || value === undefined || tags.includes(value);
  });
  return objectMembers.find(fits) ?? contextual;
}

function getObjectLiteralGoType(node: AstNode): string {
  if (isDynamicObjectLiteral(node)) return 'interface{}';
  const contextualType = objectLiteralContextualType(node);
  if (isRecordTypeNode(contextualType)) return getType(contextualType);
  const typeName = contextualType ? getType(contextualType) : '';
  if (typeName && typeName !== 'interface{}' && typeName !== ':') return typeName;
  if (isDictionaryLiteral(node)) return mapGoType('string', getDictionaryValueType(node));
  const fields = new Map<string, string>();
  for (const p of node.properties ?? []) {
    if (p.kind === 'SpreadAssignment') {
      const srcType = inferExpressionType(p.expression);
      const parsedFields = parseStructFields((srcType ?? '').replace(/^\*/, ''));
      for (const entry of parsedFields) {
        if (!fields.has(entry[0])) fields.set(entry[0], entry[1]);
      }
      continue;
    }
    if ((isMethodDeclaration(p) || isGetAccessor(p)) && isIdentifier(p.name)) {
      fields.set(goFieldName(p.name.text), methodFuncType(p));
      continue;
    }
    if (isSetAccessor(p) && isIdentifier(p.name)) {
      fields.set(`Set_${goFieldName(p.name.text)}`, methodFuncType(p));
      continue;
    }
    if (!isPropertyAssignment(p) && !isShorthandPropertyAssignment(p)) continue;
    const value = isPropertyAssignment(p) ? p.initializer : p.name;
    fields.set(goFieldName(p.name.text), toFieldGoType(inferExpressionType(value)));
  }
  const structType = `struct{ ${structFieldsBody(fields)} }`;
  registerStructAccessors(structType, node);
  return `*${structType}`;
}

// Values typed `any`/`unknown` are handled at runtime (TnGet/TnSet/...),
// never by guessing their type
function isDynamicValue(expr: AstNode): boolean {
  // Go bridge results spell it `any`
  const type = inferExpressionType(expr);
  return type === 'interface{}' || type === 'any';
}

// A value whose type is a type parameter (a: T in f<T>): its properties are read dynamically
function isTypeParameterValue(expr: AstNode): boolean {
  const type = inferExpressionType(expr);
  return !!type && isUnboundGoType(type) && isTypeParameterInScope(type, expr);
}

function hasDynamicProperties(expr: AstNode): boolean {
  return isDynamicValue(expr) || isTypeParameterValue(expr);
}

// Whether an expression is written to (x = …, x += …, x++)
function isAssignmentTarget(node: AstNode): boolean {
  const parent = node.parent;
  if (isBinaryExpression(parent) && parent.left === node) {
    return /^(EqualsToken|.*EqualsToken)$/.test(parent.operatorToken.kind) &&
      !['EqualsEqualsToken', 'EqualsEqualsEqualsToken', 'ExclamationEqualsToken', 'ExclamationEqualsEqualsToken', 'LessThanEqualsToken', 'GreaterThanEqualsToken'].includes(parent.operatorToken.kind);
  }
  return (
    (isPrefixUnaryExpression(parent) || isPostfixUnaryExpression(parent)) &&
    ['PlusPlusToken', 'MinusMinusToken'].includes(parent.operator)
  );
}

// `x as T`: an any value cast to an object type stays dynamic (a JS object
// cannot become a Go struct); other casts convert to T; `as const` is erased
function getAsExpressionType(node: AstNode): string {
  if (
    isTypeReferenceNode(node.type) &&
    isIdentifier(node.type.typeName) &&
    node.type.typeName.text === 'const'
  ) {
    return inferExpressionType(node.expression) ?? 'interface{}';
  }
  const target = getType(node.type);
  // (x as File): dynamic values holding Node class instances assert to them
  if (nodeRegistry.classByGoType[target]) return target;
  if (isDynamicValue(node.expression) && (isStructGoType(target) || target.startsWith('*'))) {
    return 'interface{}';
  }
  return target;
}

function isCallee(node: AstNode): boolean {
  return isCallExpression(node.parent) && node.parent.expression === node;
}

// Whether a type node is `any`/`unknown`, directly or through aliases
function isAnyContext(typeNode: AstNode | undefined): boolean {
  for (let depth = 0; typeNode && depth < 10; depth++) {
    if (isAnyTypeNode(typeNode)) return true;
    // any | undefined is still any
    if (isUnionTypeNode(typeNode)) {
      return (typeNode.types ?? []).some((t: AstNode) => isAnyContext(t));
    }
    if (!isTypeReferenceNode(typeNode) || !isIdentifier(typeNode.typeName)) return false;
    typeNode = declaredTypeAliases.get(typeNode.typeName.text);
  }
  return false;
}

const JS_MAP_METHODS = new Set(['get', 'set', 'has', 'delete', 'clear', 'keys', 'values', 'entries', 'forEach']);

// rec.fn(args) where rec is a Record/dictionary (an ordered map) holding functions.
// Names of JS Map methods (get, set, …) are Map methods unless rec is typed as a Record.
function getRecordFunctionCall(node: AstNode): { receiver: AstNode; mapType: string } | undefined {
  if (!isCallExpression(node) || !isPropertyAccessExpression(node.expression)) return undefined;
  const receiver = node.expression.expression;
  const mapType = inferExpressionType(receiver);
  if (!mapType?.startsWith('*TnMap[')) return undefined;
  if (!extractMapValueType(mapType).startsWith('func(')) return undefined;
  if (JS_MAP_METHODS.has(node.expression.name.text) && !isRecordTypeNode(resolveTypeNode(getExpressionTypeNode(receiver)))) {
    return undefined;
  }
  return { receiver, mapType };
}

function visitRecordFunctionCall(node: AstNode): string | undefined {
  const call = getRecordFunctionCall(node);
  if (!call) return undefined;
  const args = (node.arguments ?? []).map((a: AstNode) => visit(a)).join(', ');
  return `${visit(call.receiver)}.Get(${toGoStringLiteral(node.expression.name.text)})(${args})`;
}

function isRecordTypeNode(typeNode: AstNode): boolean {
  return (
    isTypeReferenceNode(typeNode) &&
    isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === 'Record' &&
    (typeNode.typeArguments ?? []).length === 2
  );
}

// Object literal keys as Go map keys: identifiers become string literals
function mapKeyText(name: AstNode): string {
  if (isIdentifier(name)) return toGoStringLiteral(name.text);
  if (name.kind === 'ComputedPropertyName') return visit(name.expression);
  return visit(name);
}

// A key of a dynamic object (map[string]interface{}): computed keys become
// strings the way JS property keys do ({ [1]: x } has the key "1")
function propertyKeyString(name: AstNode): string {
  if (name.kind !== 'ComputedPropertyName') return mapKeyText(name);
  return jsStringOf(visit(name.expression), inferExpressionType(name.expression));
}

// { a: 1 } typed as Record<K, V> → map[K]V{"a": 1}
// An ordered map built from "key, value" entries (in source order)
function orderedMapLiteral(keyType: string, valueType: string, entries: string[]): string {
  useHelper('orderedMap');
  const constructor = `TnNewMap[${keyType}, ${valueType}]()`;
  if (entries.length === 0) return constructor;
  const sets = entries.map((e) => `.Set(${e})`).join('');
  return `${constructor}${sets}`;
}

// The Record type of a spread in an object literal ({ ...process.env, K: v }),
// when every spread is a string-keyed record
function recordSpreadType(node: AstNode): string | undefined {
  let mapType: string | undefined;
  for (const p of node.properties ?? []) {
    if (p.kind !== 'SpreadAssignment') continue;
    const t = inferExpressionType(p.expression);
    if (!t || !t.startsWith('*TnMap[string, ') || (mapType && t !== mapType)) return undefined;
    mapType = t;
  }
  return mapType;
}

// { ...record, k: v } → a new record with record's entries, then k
function visitRecordSpreadLiteral(node: AstNode): string | undefined {
  const mapType = recordSpreadType(node);
  if (!mapType) return undefined;
  useHelper('orderedMap');
  const valueType = extractMapValueType(mapType) ?? 'interface{}';
  const steps = (node.properties ?? []).map((p: AstNode) => {
    if (p.kind === 'SpreadAssignment') {
      return `{ __src := ${visit(p.expression)}; for _, __k := range __src.Keys() { __obj.Set(__k, __src.Get(__k)) } }`;
    }
    if (isShorthandPropertyAssignment(p)) return `__obj.Set(${mapKeyText(p.name)}, ${visit(p.name)})`;
    if (isPropertyAssignment(p)) return `__obj.Set(${mapKeyText(p.name)}, ${toGoValueOfType(p.initializer, valueType)})`;
    return '';
  });
  return `func() ${mapType} { __obj := TnNewMap[string, ${valueType}](); ${steps.filter((x: string) => x).join('; ')}; return __obj }()`;
}

function visitMapLiteral(node: AstNode, recordType: AstNode): string {
  const keyType = getType(recordType.typeArguments[0]);
  const valueType = getType(recordType.typeArguments[1]);
  const entries: string[] = [];
  for (const p of node.properties ?? []) {
    if (isPropertyAssignment(p)) entries.push(`${mapKeyText(p.name)}, ${toGoValueOfType(p.initializer, valueType)}`);
    else if (isShorthandPropertyAssignment(p)) entries.push(`${mapKeyText(p.name)}, ${visit(p.name)}`);
  }
  return orderedMapLiteral(keyType, valueType, entries);
}

// Field name → Go type entries of a struct type string: struct{ a T; b U }
function parseStructFields(structType: string): [string, string][] {
  if (!structType.startsWith('struct{')) return [];
  const body = structType.slice(7, structType.lastIndexOf('}'));
  const out: [string, string][] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = i < body.length ? body[i] : ';';
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') depth--;
    else if (ch === ';' && depth === 0) {
      const entry = body.slice(start, i).trim();
      start = i + 1;
      if (!entry) continue;
      const space = entry.indexOf(' ');
      if (space > 0) out.push([entry.slice(0, space), entry.slice(space + 1).trim()]);
    }
  }
  return out;
}

// Go func type of an object-literal method or getter
function methodFuncType(member: AstNode): string {
  const params = (member.parameters ?? []).map((p: AstNode) => getParameterGoType(p)).join(', ');
  const ret = member.type
    ? getType(member.type)
    : inferFunctionBodyReturnType(member) ?? '';
  return `func(${params})${ret ? ` ${ret}` : ''}`;
}

// Object literal with no contextual type → anonymous struct with inferred fields,
// or a map when the variable holding it is indexed dynamically (obj[key]).
// Methods and getters become function fields whose closures capture the
// instance; spreads copy the source struct's fields.
function visitAnonymousStructLiteral(node: AstNode): string {
  if (isDictionaryLiteral(node)) {
    const valueType = getDictionaryValueType(node);
    const entries = (node.properties ?? [])
      .filter((p) => isPropertyAssignment(p))
      .map((p) => `${mapKeyText(p.name)}, ${visit(p.initializer)}`);
    return orderedMapLiteral('string', valueType, entries);
  }
  const fields = new Map<string, string>();
  const values: string[] = [];
  const steps: string[] = [];
  let sawSpread = false;
  for (const p of node.properties ?? []) {
    if (p.kind === 'SpreadAssignment') {
      const srcType = inferExpressionType(p.expression);
      const srcFields = srcType?.includes('struct{')
        ? parseStructFields(srcType.replace(/^\*/, ''))
        : [];
      for (const entry of srcFields) {
        if (!fields.has(entry[0])) fields.set(entry[0], entry[1]);
      }
      if (!sawSpread) {
        sawSpread = true;
        steps.push(`__obj := *(${visit(p.expression)})`);
      } else {
        steps.push(
          srcFields
            .map((entry) => `__obj.${entry[0]} = (${visit(p.expression)}).${entry[0]}`)
            .join(';\n\t\t')
        );
      }
      continue;
    }
    if ((isMethodDeclaration(p) || isGetAccessor(p) || isSetAccessor(p)) && isIdentifier(p.name)) {
      // a setter is a Set_x closure field: `o.x = v` calls it
      const field = isSetAccessor(p) ? `Set_${goFieldName(p.name.text)}` : goFieldName(p.name.text);
      fields.set(field, methodFuncType(p));
      const prevName = thisOverrideName;
      const prevFn = thisOverrideFn;
      thisOverrideName = '__obj';
      thisOverrideFn = p;
      const paramInfo = getFunctionParametersInfo(p.parameters ?? []);
      const retType = methodFuncType(p).slice(methodFuncType(p).indexOf(')') + 1);
      const body = visit(p.body!, { prefixBlockContent: paramInfo.prefixBlockContent });
      thisOverrideName = prevName;
      thisOverrideFn = prevFn;
      steps.push(`__obj.${field} = func(${paramInfo.signature})${retType} ${body.trimEnd()}`);
      continue;
    }
    const isProp = isPropertyAssignment(p);
    if (!isProp && !isShorthandPropertyAssignment(p)) continue;
    const field = goFieldName(p.name.text);
    const valueNode = isProp ? p.initializer : p.name;
    if (sawSpread) {
      steps.push(`__obj.${field} = ${toGoValueOfType(valueNode, fields.get(field))}`);
    } else {
      fields.set(field, toFieldGoType(inferExpressionType(valueNode)));
      values.push(`${field}: ${visit(valueNode)}`);
    }
    if (sawSpread && !fields.has(field)) {
      fields.set(field, toFieldGoType(inferExpressionType(valueNode)));
    }
  }
  const structType = `struct{ ${structFieldsBody(fields)} }`;
  registerStructAccessors(structType, node);
  if (steps.length === 0) {
    return `&${structType}${compositeBody(values)}`;
  }
  const self = sawSpread ? '__obj' : getTempName('obj');
  const lines: string[] = [];
  if (sawSpread) {
    for (const step of steps) lines.push(step);
    lines.push('return &__obj');
  } else {
    lines.push(`${self} := &${structType}${compositeBody(values)}`);
    for (const step of steps) lines.push(step.replace(/__obj\./g, `${self}.`));
    lines.push(`return ${self}`);
  }
  return `func() *${structType} {\n\t\t${lines.join(';\n\t\t')}\n\t}()`;
}

// Follows type aliases and strips null/undefined from unions
function resolveTypeNode(typeNode: AstNode, depth = 0): AstNode | undefined {
  if (!typeNode || depth > 10) return typeNode;
  if (isAnyTypeNode(typeNode)) return undefined;
  if (typeNode.kind === 'ParenthesizedType') return resolveTypeNode(typeNode.type, depth + 1);
  // readonly T[]: T[]
  if (typeNode.kind === 'TypeOperator' && typeNode.operator === 'ReadonlyKeyword') return resolveTypeNode(typeNode.type, depth + 1);
  if (isUnionTypeNode(typeNode)) {
    const nonNull = (typeNode.types ?? []).filter(
      (t) =>
        t.kind !== 'NullKeyword' &&
        t.kind !== 'UndefinedKeyword' &&
        !(isLiteralTypeNode(t) && t.literal?.kind === 'NullKeyword')
    );
    return nonNull.length === 1 ? resolveTypeNode(nonNull[0], depth + 1) : typeNode;
  }
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    // Readonly<T> / Required<T> / Omit<T, …> & co. have T's members
    if (UTILITY_TYPES.has(typeNode.typeName.text) && (typeNode.typeArguments ?? []).length > 0 && !declaredTypeAliases.has(typeNode.typeName.text)) {
      return resolveTypeNode(typeNode.typeArguments[0], depth + 1);
    }
    const alias = declaredTypeAliases.get(typeNode.typeName.text);
    if (alias && alias.kind !== 'TypeLiteral') return resolveTypeNode(alias, depth + 1);
  }
  // T['key']: the member's type
  if (typeNode.kind === 'IndexedAccessType') {
    const index = typeNode.indexType;
    const key = index?.kind === 'LiteralType' && isStringLiteral(index.literal) ? index.literal.text : undefined;
    const member = key ? getMemberTypeNode(typeNode.objectType, key) : undefined;
    return member ? resolveTypeNode(member, depth + 1) : typeNode;
  }
  return typeNode;
}

function getEnclosingFunction(node: AstNode): AstNode | undefined {
  let current = node.parent;
  while (current) {
    if (
      isFunctionDeclaration(current) ||
      isFunctionExpression(current) ||
      isArrowFunction(current) ||
      isMethodDeclaration(current) ||
      isGetAccessor(current) ||
      isSetAccessor(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

// Name of the class declaration enclosing this node, if any
function getEnclosingClassName(node: AstNode): string | undefined {
  let current: AstNode | undefined = node;
  while (current) {
    if (isClassDeclaration(current) && current.name && isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}

// The Go type of `this` inside a class body (methods, constructor, field
// initializers, arrow functions within them): *ClassName / *Box[T]; undefined
// inside function expressions and object literals, where `this` is something else
function thisGoType(node: AstNode): string | undefined {
  let current: AstNode | undefined = node.parent;
  while (current) {
    if (isClassDeclaration(current)) {
      if (!current.name || !isIdentifier(current.name)) return undefined;
      return `*${current.name.text}`;
    }
    if (isFunctionExpression(current) || isFunctionDeclaration(current) || isObjectLiteralExpression(current)) return undefined;
    current = current.parent;
  }
  return undefined;
}

// Declared return type of a function, unwrapping Promise<T> for async functions
function getReturnTypeNode(fn: AstNode): AstNode | undefined {
  const typeNode = fn?.type ?? (fn ? getContextualFunctionType(fn)?.type : undefined);
  if (
    isTypeReferenceNode(typeNode) &&
    isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === 'Promise'
  ) {
    return typeNode.typeArguments?.[0];
  }
  return typeNode;
}

// Type of member `name` within an object type (interface, type literal, Record)
function getMemberTypeNode(typeNode: AstNode, name: string): AstNode | undefined {
  const resolved = resolveTypeNode(typeNode);
  if (!resolved) return undefined;
  // A & B: the member of the last constituent that has it (it narrows the others)
  if (resolved.kind === 'IntersectionType') {
    let found: AstNode | undefined;
    for (const part of resolved.types ?? []) found = getMemberTypeNode(part, name) ?? found;
    return found;
  }
  if (isRecordTypeNode(resolved)) return resolved.typeArguments[1];
  // a union of object type literals: the member type the field has (not never)
  if (isUnionTypeNode(resolved)) {
    const members = objectLiteralUnionMembers((resolved.types ?? []).filter((t: AstNode) => t.kind !== 'NullKeyword' && t.kind !== 'UndefinedKeyword'));
    for (const member of members ?? []) {
      const field = (member.members ?? []).find((f: AstNode) => f.name.text === name && f.type?.kind !== 'NeverKeyword');
      if (field) return field.type;
    }
    return undefined;
  }
  // an anonymous Go object type: its field's Go type
  if (resolved.kind === 'TnGoType') {
    const fieldType = getStructFieldGoType(resolved.goType, name);
    return fieldType ? { kind: 'TnGoType', goType: fieldType, parent: resolved.parent } : undefined;
  }
  let members: AstNode[] = [];
  if (resolved.kind === 'TypeLiteral') {
    members = resolved.members ?? [];
  } else if (isTypeReferenceNode(resolved) && isIdentifier(resolved.typeName)) {
    const aliasLiteral = declaredTypeAliases.get(resolved.typeName.text);
    if (aliasLiteral?.kind === 'TypeLiteral') members = aliasLiteral.members ?? [];
    // a class: its declared property (or parameter property), else its parent's
    const cls = declaredClasses.get(resolved.typeName.text);
    if (cls && !declaredInterfaces.has(resolved.typeName.text)) {
      // (Box<number>: a member typed by the class's type parameter T is number)
      const typeArgs: AstNode[] = resolved.typeArguments ?? [];
      const substitute = (t: AstNode | undefined): AstNode | undefined => {
        if (!t || !isTypeReferenceNode(t) || !isIdentifier(t.typeName) || (t.typeArguments ?? []).length > 0) return t;
        const index = (cls.typeParameters ?? []).findIndex((tp: AstNode) => tp.name?.text === t.typeName.text);
        return index > -1 && typeArgs[index] ? typeArgs[index] : t;
      };
      for (const member of cls.members ?? []) {
        if (isPropertyDeclaration(member) && isIdentifier(member.name) && member.name.text === name && !(member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) {
          return substitute(member.type);
        }
      }
      const param = getParameterProperties(cls).find((p: AstNode) => p.name.text === name);
      if (param) return param.type;
      const parent = classParentNames.get(resolved.typeName.text);
      return parent ? getMemberTypeNode({ kind: 'TypeReference', typeName: { kind: 'Identifier', text: parent } }, name) : undefined;
    }
    const iface = declaredInterfaces.get(resolved.typeName.text);
    if (iface) {
      members = iface.members ?? [];
      for (const clause of iface.heritageClauses ?? []) {
        for (const base of clause.types ?? []) {
          const baseType = { kind: 'TypeReference', typeName: base.expression };
          const inherited = getMemberTypeNode(baseType, name);
          if (inherited) return inherited;
        }
      }
    }
  }
  for (const member of members) {
    if (isPropertySignature(member) && isIdentifier(member.name) && member.name.text === name) {
      return member.type;
    }
    // a method signature is its function type (not a generic interface's:
    // its type parameters aren't substituted)
    if (isMethodSignature(member) && isIdentifier(member.name) && member.name.text === name && !(member.parent?.typeParameters ?? []).length) {
      if (!member.tnFunctionType) {
        member.tnFunctionType = { kind: 'FunctionType', parameters: member.parameters, type: member.type, parent: member };
      }
      return member.tnFunctionType;
    }
  }
  return undefined;
}

// The type an expression is expected to have from where it appears
// (TypeScript's "contextual type"), derived syntactically from declarations
// Declared type nodes of variables/parameters in scope (latest declaration wins)
const variableTypeNodes = new Map<string, AstNode>();
// Variables initialized by go:builtin ref<T>() (their `.value` dereferences)
const goRefVariables = new Set<string>();

// Declared type (as a type node) of an assignable expression, when known
function getExpressionTypeNode(expr: AstNode): AstNode | undefined {
  if (isIdentifier(expr)) return variableTypeNodes.get(expr.text);
  if (isParenthesizedExpression(expr)) return getExpressionTypeNode(expr.expression);
  // x as T: T (not `as const`)
  if ((isAsExpression(expr) || isTypeAssertionExpression(expr)) && !(isTypeReferenceNode(expr.type) && isIdentifier(expr.type.typeName) && expr.type.typeName.text === 'const')) {
    return expr.type;
  }
  if (isPropertyAccessExpression(expr)) {
    if (expr.expression.kind === 'ThisKeyword') {
      let current = expr.parent;
      while (current && !isClassDeclaration(current)) current = current.parent;
      const member = (current?.members ?? []).find(
        (m: AstNode) => isPropertyDeclaration(m) && isIdentifier(m.name) && m.name.text === expr.name.text
      );
      return member?.type;
    }
    const objectType = getExpressionTypeNode(expr.expression);
    return objectType ? getMemberTypeNode(objectType, expr.name.text) : undefined;
  }
  if (isElementAccessExpression(expr)) {
    const objectType = resolveTypeNode(getExpressionTypeNode(expr.expression));
    if (isArrayTypeNode(objectType)) return objectType.elementType;
    if (
      isTypeReferenceNode(objectType) &&
      isIdentifier(objectType.typeName) &&
      ['Record', 'Map'].includes(objectType.typeName.text)
    ) {
      return objectType.typeArguments?.[1];
    }
  }
  return undefined;
}

function getContextualTypeNode(node: AstNode): AstNode | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  if (isParenthesizedExpression(parent)) return getContextualTypeNode(parent);
  if (isConditionalExpression(parent) && parent.condition !== node) {
    return getContextualTypeNode(parent);
  }
  if (isBinaryExpression(parent)) {
    const op = parent.operatorToken.kind;
    if ((op === 'QuestionQuestionToken' || op === 'BarBarToken') && parent.right === node) {
      // (else the left operand's anonymous object or array type)
      const outer = getContextualTypeNode(parent);
      if (outer) return outer;
      const leftType = inferExpressionType(parent.left);
      return leftType && (leftType.startsWith('*struct{') || /^\*?\[\]/.test(leftType)) ? { kind: 'TnGoType', goType: leftType, parent: node } : undefined;
    }
    if (op === 'EqualsToken' && parent.right === node) {
      // (else the Go type of the target: an anonymous object type, an array)
      const declared = getExpressionTypeNode(parent.left);
      if (declared) return declared;
      const targetType = inferExpressionType(parent.left);
      return targetType && (targetType.startsWith('*struct{') || /^\*?\[\]/.test(targetType)) ? { kind: 'TnGoType', goType: targetType, parent: node } : undefined;
    }
  }
  // `x satisfies T` keeps the type its own context gives it (T when none)
  if (parent.kind === 'SatisfiesExpression') return getContextualTypeNode(parent) ?? parent.type;
  if (isAsExpression(parent) || isTypeAssertionExpression(parent)) {
    // `as const` adds no type: the context is the assertion's own
    if (isTypeReferenceNode(parent.type) && isIdentifier(parent.type.typeName) && parent.type.typeName.text === 'const') {
      return getContextualTypeNode(parent);
    }
    return parent.type;
  }
  if (
    (isVariableDeclaration(parent) || isPropertyDeclaration(parent) || parent.kind === 'Parameter') &&
    parent.initializer === node
  ) {
    return parent.type;
  }
  if (isReturnStatement(parent)) {
    return getReturnTypeNode(getEnclosingFunction(parent));
  }
  if (isArrowFunction(parent) && parent.body === node) {
    const declared = getReturnTypeNode(parent);
    if (declared) return declared;
    // rows.map((r) => ({ … })) where the result must be Note[]: each item is a Note
    const call = parent.parent;
    if (
      isCallExpression(call) &&
      (call.arguments ?? [])[0] === parent &&
      isPropertyAccessExpression(call.expression) &&
      call.expression.name.text === 'map'
    ) {
      const resultType = resolveTypeNode(getContextualTypeNode(call));
      if (isArrayTypeNode(resultType)) return resultType.elementType;
    }
    // items.reduce((acc, x) => ({ … }), init): the accumulator is the result type
    if (isReduceCall(call) && (call.arguments ?? [])[0] === parent) return getContextualTypeNode(call);
    return undefined;
  }
  if (isReduceCall(parent) && (parent.arguments ?? [])[1] === node) return getContextualTypeNode(parent);
  // xs.push(v) / xs.unshift(v): the array's element type
  if (
    isCallExpression(parent) && isPropertyAccessExpression(parent.expression) &&
    ['push', 'unshift'].includes(parent.expression.name.text) && (parent.arguments ?? []).includes(node)
  ) {
    const arrayType = resolveTypeNode(getExpressionTypeNode(parent.expression.expression));
    const declaredElement = arrayElementTypeNode(arrayType);
    if (declaredElement) return declaredElement;
    const goType = inferExpressionType(parent.expression.expression) ?? '';
    const element = goType.replace(/^\*?\[\]\*?/, '');
    if (/^[A-Za-z_]\w*$/.test(element) && (declaredInterfaces.has(element) || declaredTypeAliases.has(element))) {
      return { kind: 'TypeReference', typeName: { kind: 'Identifier', text: element } };
    }
    // an anonymous object type: the element's Go type itself
    const elementGoType = goType.replace(/^\*?\[\]/, '');
    if (elementGoType.startsWith('*struct{')) return { kind: 'TnGoType', goType: elementGoType, parent: node };
  }
  // new C(…): the constructor's parameter (declared by C or inherited)
  if (isNewExpression(parent) && isIdentifier(parent.expression)) {
    const index = (parent.arguments ?? []).indexOf(node);
    const ctor = index > -1 ? classConstructorDeclaration(parent.expression.text) : undefined;
    const param = ctor?.parameters?.[index];
    if (param && !param.dotDotDotToken) return param.type;
  }
  // map.set(k, v): the Map's value type
  if (
    isCallExpression(parent) && isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === 'set' && (parent.arguments ?? [])[1] === node
  ) {
    const mapType = inferExpressionType(parent.expression.expression) ?? '';
    const valueType = mapType.startsWith('*TnMap[') ? extractMapValueType(mapType) : '';
    if (valueType.startsWith('*struct{')) return { kind: 'TnGoType', goType: valueType, parent: node };
  }
  if (isCallExpression(parent) && (isIdentifier(parent.expression) || isPropertyAccessExpression(parent.expression))) {
    const index = (parent.arguments ?? []).indexOf(node);
    const fn = getCalleeSignature(parent);
    if (index > -1 && fn) return fn.parameters?.[index]?.type;
  }
  if (
    isPropertyAssignment(parent) &&
    parent.initializer === node &&
    (isIdentifier(parent.name) || isStringLiteral(parent.name))
  ) {
    const objectType = isObjectLiteralExpression(parent.parent) ? objectLiteralContextualType(parent.parent) : getContextualTypeNode(parent.parent);
    return objectType ? getMemberTypeNode(objectType, parent.name.text) : undefined;
  }
  if (isArrayLiteralExpression(parent)) {
    const arrayType = resolveTypeNode(getContextualTypeNode(parent));
    const declaredElement = arrayElementTypeNode(arrayType);
    if (declaredElement) return declaredElement;
    // a Go array type: its element (a named object type, or an anonymous one)
    if (arrayType?.kind === 'TnGoType' && /^\*?\[\]/.test(arrayType.goType)) {
      const elementGoType = arrayType.goType.replace(/^\*?\[\]/, '');
      const named = elementGoType.replace(/^\*/, '');
      if (/^[A-Za-z_]\w*$/.test(named) && (declaredInterfaces.has(named) || declaredTypeAliases.has(named))) {
        return { kind: 'TypeReference', typeName: { kind: 'Identifier', text: named } };
      }
      if (elementGoType.startsWith('*struct{')) return { kind: 'TnGoType', goType: elementGoType, parent: node };
    }
  }
  return undefined;
}

// A type parameter of an enclosing function or class (T inside function f<T>)
function isTypeParameterInScope(name: string, node: AstNode): boolean {
  for (let n = node; n; n = n.parent) {
    if ((n.typeParameters ?? []).some((tp: AstNode) => tp.name?.text === name)) return true;
  }
  return false;
}

// Element type of an array literal: from its contextual type (declared
// variable/parameter/return type), else inferred from its first typed element
function getArrayLiteralElementType(node: AstNode): string {
  const contextual = resolveTypeNode(getContextualTypeNode(node));
  if (isArrayTypeNode(contextual)) {
    const elem = getType(contextual.elementType);
    // An unbound type parameter (call-site []T) resolves from the elements
    if (!isUnboundGoType(elem) || isTypeParameterInScope(elem, node)) return elem;
  }
  if (contextual?.kind === 'TupleType') return getTupleElementType(contextual);
  if (contextual?.kind === 'TnGoType' && /^\*?\[\]/.test(contextual.goType)) return contextual.goType.replace(/^\*?\[\]/, '');
  if (
    isTypeReferenceNode(contextual) &&
    isIdentifier(contextual.typeName) &&
    contextual.typeName.text === 'Array' &&
    contextual.typeArguments?.length === 1
  ) {
    const elem = getType(contextual.typeArguments[0]);
    if (!isUnboundGoType(elem)) return elem;
  }
  let firstElementType: string | undefined;
  for (const element of node.elements ?? []) {
    if (isSpreadElement(element)) {
      const spreadType = inferExpressionType(element.expression);
      if (spreadType?.startsWith('[]')) return spreadType.slice(2);
      if (isTypedArrayGoType(spreadType)) return 'float64';
      if (spreadType === 'string') return 'string';
      if (spreadType?.startsWith('*TnMap[') && extractMapValueType(spreadType) === 'struct{}') {
        return extractMapKeyType(spreadType);
      }
      if (spreadType?.startsWith('*TnMap[')) return '[]interface{}';
      // a dynamic source: elements of any type
      if (!spreadType || spreadType === 'interface{}') return 'interface{}';
      continue;
    }
    // mixed element types ([['a', 1]]) make an interface{} array
    const elementType = inferExpressionType(element);
    if (elementType && elementType !== 'nil' && !isUnboundGoType(elementType)) {
      if (firstElementType && firstElementType !== elementType) return 'interface{}';
      if (!firstElementType) firstElementType = elementType;
    }
  }
  // [null, 1]: null has no place in a []float64
  if (firstElementType && ['float64', 'string', 'bool'].includes(firstElementType) && (node.elements ?? []).some((e: AstNode) => isNilLiteral(e))) return 'interface{}';
  return firstElementType ?? 'interface{}';
}

// A Go type that is a generic type parameter of the enclosing function (T)
// rather than a concrete type: unresolvable at the call site
function isUnboundGoType(goType: string | undefined): boolean {
  if (!goType) return false;
  // Only a bare identifier can be a type parameter; composite types are concrete
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(goType)) return false;
  if (['float64', 'string', 'bool', 'int', 'interface{}', 'byte', 'rune'].includes(goType)) return false;
  return (
    !classNames.has(goType) &&
    !interfacePropertyTypes.has(goType) &&
    !enumNames.has(goType) &&
    !typeAliases.has(goType) &&
    !declaredInterfaces.has(goType)
  );
}

// A field-name → type map rendered as a Go struct type body
function structFieldsBody(fields: Map<string, string>): string {
  const parts: string[] = [];
  fields.forEach((fieldType, fieldName) => {
    parts.push(`${fieldName} ${fieldType}`);
  });
  return parts.join('; ');
}

// Loop bodies must be blocks in Go; `prefix` is emitted before the body's statements
function visitLoopBody(statement: AstNode, prefix = ''): string {
  if (isBlock(statement)) return visit(statement, { prefixBlockContent: prefix });
  return `{\n\t\t${prefix}${visit(statement)}}\n\t`;
}

// `(x = expr) op rhs` as a loop condition: returns the assignment to hoist
function getHoistedConditionAssignment(condition: AstNode): AstNode | undefined {
  if (!isBinaryExpression(condition)) return undefined;
  let left = condition.left;
  while (isParenthesizedExpression(left)) left = left.expression;
  if (isBinaryExpression(left) && left.operatorToken.kind === 'EqualsToken') return left;
  return undefined;
}

// Function type a function literal is expected to have (e.g. from a declared
// variable, parameter, or Record value type)
function getContextualFunctionType(fn: AstNode): AstNode | undefined {
  // { m(x) { … } } in an object literal: the member's type in the literal's type
  if (isMethodDeclaration(fn) && isObjectLiteralExpression(fn.parent) && (isIdentifier(fn.name) || isStringLiteral(fn.name))) {
    const objectType = getContextualTypeNode(fn.parent);
    const member = objectType ? resolveTypeNode(getMemberTypeNode(objectType, fn.name.text)) : undefined;
    return isFunctionTypeNode(member) ? member : undefined;
  }
  if (!isArrowFunction(fn) && !isFunctionExpression(fn)) return undefined;
  const contextual = resolveTypeNode(getContextualTypeNode(fn));
  return isFunctionTypeNode(contextual) ? contextual : undefined;
}

function unwrapParentheses(expr: AstNode): AstNode {
  while (isParenthesizedExpression(expr)) expr = expr.expression;
  return expr;
}

function isReduceCall(node: AstNode): boolean {
  return (
    isCallExpression(node) &&
    isPropertyAccessExpression(node.expression) &&
    (node.expression.name.text === 'reduce' || node.expression.name.text === 'reduceRight')
  );
}

// The Go type of tuple[i] (a literal index into a tuple-typed value held as
// []interface{}): '' when not a tuple read or the element is itself dynamic
function tupleElementGoType(expr: AstNode): string {
  if (!isNumericLiteral(expr.argumentExpression)) return '';
  if (inferExpressionType(expr.expression) !== '[]interface{}') return '';
  let typeNode = resolveTypeNode(getExpressionTypeNode(expr.expression));
  if (!typeNode && isIdentifier(expr.expression)) typeNode = resolveTypeNode(callbackParameterTypeNode(expr.expression));
  if (!typeNode || typeNode.kind !== 'TupleType') return '';
  const element = (typeNode.elements ?? [])[Number(expr.argumentExpression.text)];
  if (!element) return '';
  const goType = getType(element.kind === 'NamedTupleMember' ? element.type : element);
  return !goType || goType === 'interface{}' || isUnboundGoType(goType) ? '' : goType;
}

// The declared element type of an untyped callback parameter of an array
// method (pairs.sort((a, b) => …) with pairs: [string, number][])
function callbackParameterTypeNode(name: AstNode): AstNode | undefined {
  let fn: AstNode | undefined = name.parent;
  while (fn && !isArrowFunction(fn) && !isFunctionExpression(fn)) fn = fn.parent;
  if (!fn) return undefined;
  const index = (fn.parameters ?? []).findIndex((p: AstNode) => isIdentifier(p.name) && p.name.text === name.text);
  if (index < 0 || fn.parameters[index].type) return undefined;
  const call = fn.parent;
  if (!isCallExpression(call) || !isPropertyAccessExpression(call.expression)) return undefined;
  const method = call.expression.name.text;
  const elementParams: Record<string, number[]> = {
    sort: [0, 1], toSorted: [0, 1], map: [0], filter: [0], forEach: [0], some: [0], every: [0], find: [0],
    findIndex: [0], findLast: [0], findLastIndex: [0], flatMap: [0], reduce: [1], reduceRight: [1]
  };
  const slots = elementParams[method];
  if (!slots || !slots.includes(index) || (call.arguments ?? [])[0] !== fn) return undefined;
  const arrayType = resolveTypeNode(getExpressionTypeNode(call.expression.expression));
  return isArrayTypeNode(arrayType) ? arrayType.elementType : undefined;
}

function getTupleElementType(tuple: AstNode): string {
  const types = (tuple.elements ?? []).map((t: AstNode) => getType(t.kind === 'NamedTupleMember' ? t.type : t));
  return types.length > 0 && types.every((t: string) => t === types[0]) ? types[0] : 'interface{}';
}

function getTypeText(typeNode: AstNode): string {
  if (!typeNode) return ':';
  // Partial<T> etc. construct T
  if (
    isTypeReferenceNode(typeNode) &&
    isIdentifier(typeNode.typeName) &&
    UTILITY_TYPES.has(typeNode.typeName.text) &&
    typeNode.typeArguments?.length
  ) {
    return getTypeText(typeNode.typeArguments[0]);
  }
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    return typeNode.typeName.text;
  }
  return getType(typeNode);
}

function toGoStringLiteral(value: string): string {
  // Go source can't hold a BOM past the start, and Go strings (UTF-8) can't
  // hold a lone surrogate: those become U+FFFD, as when converted at run time
  return JSON.stringify(value)
    .replace(/\uFEFF/g, '\\uFEFF')
    .replace(/\\(\\|u[dD][89a-fA-F][0-9a-fA-F]{2})/g, (escape: string, body: string) => (body === '\\' ? escape : '\\uFFFD'));
}

// A spread source as a Go slice; Sets spread their elements (map keys) and
// strings spread into []string of runes (like JS [...str])
function visitSpreadSource(expr: AstNode): string {
  if (expr.kind !== 'TnArrayItems' && arraySubclassOf(expr)) expr = arrayItemsNode(expr);
  const sourceType = inferExpressionType(expr);
  if (sourceType?.startsWith('*TnMap[') && extractMapValueType(sourceType) === 'struct{}') {
    return `${visit(expr)}.Keys()`;
  }
  // [...map]: its [key, value] pairs
  if (sourceType?.startsWith('*TnMap[')) return `${visit(expr)}.Entries()`;
  if (sourceType === 'string') {
    return `func() []string { __parts := []string{}; for _, __r := range ${visit(expr)} { __parts = append(__parts, string(__r)) }; return __parts }()`;
  }
  if (isTypedArrayGoType(sourceType)) return `${visit(expr)}.tnFloats()`;
  // a dynamic value: its elements (any iterable)
  if (!sourceType || sourceType === 'interface{}') {
    useHelper('arraySubclass');
    return `TnToArray(${visit(expr)})`;
  }
  return visit(expr);
}

function visitSpreadArrayLiteral(node: AstNode, elemType: string): string {
  // Build append chain for arrays with spread elements
  // [...arr1, x, y, ...arr2] → append(append(append([]T{}, arr1...), x, y), arr2...)
  type Chunk = { isSpread: boolean; items: AstNode[] };
  const chunks: Chunk[] = [];

  for (const el of (node.elements ?? [])) {
    if (isSpreadElement(el)) {
      chunks.push({ isSpread: true, items: [el.expression] });
    } else {
      const last = chunks.length > 0 ? chunks[chunks.length - 1] : undefined;
      if (last && !last.isSpread) {
        last.items.push(el);
      } else {
        chunks.push({ isSpread: false, items: [el] });
      }
    }
  }

  const baseType = elemType || 'interface{}';
  let result = `[]${baseType}{}`;
  for (const chunk of chunks) {
    if (chunk.isSpread) {
      // (elements of another type spread into an any[]: boxed one by one)
      const source = visitSpreadSource(chunk.items[0]);
      const sourceType = (inferExpressionType(chunk.items[0]) ?? '').replace(/^\*\[\]/, '[]');
      const boxed = baseType === 'interface{}' && sourceType.startsWith('[]') && sourceType !== '[]interface{}' && !arraySubclassOf(chunk.items[0]);
      if (boxed) useHelper('arraySubclass');
      result = `append(${result}, ${boxed ? `TnToArray(${source})` : source}...)`;
    } else {
      result = `append(${result}, ${chunk.items.map((e) => (arrayElementNeedsConversion(e, baseType) ? toGoValueOfType(e, baseType) : visit(e))).join(', ')})`;
    }
  }
  return result;
}

function visitTemplateExpression(node: AstNode): string {
  const parts: string[] = [];

  if (node.head.text.length > 0) {
    parts.push(toGoStringLiteral(node.head.text));
  }

  for (const span of node.templateSpans) {
    const spanType = inferExpressionType(span.expression);
    if (spanType && NULLABLE_PRIMITIVE_TYPES.includes(spanType)) {
      useHelper('dynamic');
      parts.push(`TnFormat(${visit(span.expression)})`);
    } else {
      parts.push(jsStringOf(visit(span.expression), spanType));
    }

    if (span.literal.text.length > 0) {
      parts.push(toGoStringLiteral(span.literal.text));
    }
  }

  if (parts.length === 0) {
    return '""';
  }

  return parts.join(' + ');
}

// An expression-bodied arrow whose callee emits Go statements (no value):
// console.log(...), assert(...)
function isVoidStatementCall(expr: AstNode): boolean {
  if (!isCallExpression(expr)) return false;
  if (isIdentifier(expr.expression)) {
    const name = expr.expression.text;
    return name === 'assert' || (!!promiseResolveName && name === promiseResolveName) || (!!promiseRejectName && name === promiseRejectName);
  }
  return (
    isPropertyAccessExpression(expr.expression) &&
    isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'console'
  );
}

function hasQuestionDot(node: AstNode): boolean {
  return (
    'questionDotToken' in node &&
    !!(node as { questionDotToken?: AstNode }).questionDotToken
  );
}

function getTempName(prefix: string): string {
  return `__${prefix}_${goSafeId()}__`;
}

function inferExpectedTypeFromContext(node: AstNode): string | undefined {
  const parent = node.parent;
  if (isVariableDeclaration(parent) && parent.initializer === node && parent.type) {
    return getType(parent.type);
  }
  if (isReturnStatement(parent)) {
    let scope: AstNode | undefined = parent.parent;
    while (scope) {
      if (
        isFunctionDeclaration(scope) ||
        isMethodDeclaration(scope) ||
        isFunctionExpression(scope) ||
        isArrowFunction(scope)
      ) {
        if (scope.type) return getType(scope.type);
        break;
      }
      scope = scope.parent;
    }
  }
  return undefined;
}

function prescanVariableDeclarations(block: AstNode): void {
  for (const stmt of block.statements) {
    if (isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (isIdentifier(decl.name) && !variableGoTypes.has(decl.name.text)) {
          if (decl.type) {
            setVarGoType(decl.name.text, getType(decl.type));
          } else if (decl.initializer) {
            const inferredType = inferExpressionType(decl.initializer);
            if (inferredType) setVarGoType(decl.name.text, inferredType);
          }
        }
      }
    }
  }
}

function inferFunctionBodyReturnType(
  node: AstNode | AstNode | AstNode
): string | undefined {
  if (node.type) return getType(node.type);
  const contextualFn = getContextualFunctionType(node);
  if (contextualFn?.type) return getType(contextualFn.type);
  if (isArrowFunction(node) && !isBlock(node.body)) {
    const bodyType = inferExpressionType(node.body as AstNode);
    // `() => undefined`: nil is not a Go type
    return bodyType === 'nil' ? 'interface{}' : bodyType;
  }
  if (node.body && isBlock(node.body)) {
    // the returns' common type; values of different types make it any, and
    // `return undefined` beside a value makes it nullable
    let returnsNil = false;
    let returnsValue = false;
    const types: string[] = [];
    for (const stmt of collectReturnStatements(node.body)) {
      if (!stmt.expression || isVoidCall(stmt.expression)) continue;
      returnsValue = true;
      const exprType = inferExpressionType(stmt.expression);
      if (exprType === 'nil') returnsNil = true;
      else if (exprType && !types.includes(exprType)) types.push(exprType);
    }
    const distinct = [...new Set(types.map((t) => t.replace(/^\*\[\]/, '[]')))];
    if (distinct.length === 1) return returnsNil ? makeNullableType(types[0]) : types[0];
    if (distinct.length > 1 || returnsNil || returnsValue) return 'interface{}';
  }
  return undefined;
}

// Go result type of a class method: declared, else inferred from its returns
// like a function's ('' for none). Unannotated async methods keep ''. The
// body's locals are typed only for the inference (variable types are global),
// so classes registered ahead of other code don't leak them.
function methodReturnGoType(member: AstNode): string {
  if (member.type) return getType(member.type);
  if ((member.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) return '';
  if (!member.body || !isBlock(member.body)) return '';
  if (!Array.isArray(member.body.statements)) return inferFunctionBodyReturnType(member) ?? '';
  return withFunctionScopeTypes(member, () => inferFunctionBodyReturnType(member) ?? '');
}

// Runs compute with a function's parameters and locals typed from their
// declarations (variable types are global by name: other functions' entries
// for the same names are set aside, then restored)
function withFunctionScopeTypes(fn: AstNode, compute: () => string): string {
  const declarations: AstNode[] = [];
  const walk = (n: AstNode): void => {
    if (n.kind === 'VariableDeclaration' && isIdentifier(n.name)) declarations.push(n);
    for (const child of childNodes(n)) if (!FUNCTION_LIKE_KINDS.has(child.kind) && child.kind !== 'ClassDeclaration') walk(child);
  };
  if (fn.body) walk(fn.body);
  const names: string[] = [];
  for (const p of fn.parameters ?? []) if (isIdentifier(p.name)) names.push(p.name.text);
  for (const d of declarations) names.push(d.name.text);
  const restore = saveVariableTypes(names);
  for (const p of fn.parameters ?? []) registerParameterType(p);
  for (const d of declarations) {
    if (d.type) {
      setVarGoType(d.name.text, getType(d.type));
      variableTypeNodes.set(d.name.text, d.type);
    } else if (d.initializer && !isNilLiteral(d.initializer)) {
      const inferred = inferExpressionType(d.initializer);
      if (inferred) setVarGoType(d.name.text, inferred);
      else variableGoTypes.delete(d.name.text);
      variableTypeNodes.delete(d.name.text);
    }
  }
  const result = compute();
  restore();
  return result;
}

// Records the variable-table entries of `names`; the returned function puts
// them back (variable types are global by name)
function saveVariableTypes(names: string[]): () => void {
  const saved = names.map((name) => ({
    name: name,
    goType: variableGoTypes.get(name),
    reference: referenceArrays.has(name),
    typeNode: variableTypeNodes.get(name),
    category: variableTypes.get(name),
    className: variableClassNames.get(name)
  }));
  return () => {
    for (const entry of saved.reverse()) {
      if (entry.goType !== undefined) variableGoTypes.set(entry.name, entry.goType);
      else variableGoTypes.delete(entry.name);
      if (entry.reference) referenceArrays.add(entry.name);
      else referenceArrays.delete(entry.name);
      if (entry.typeNode !== undefined) variableTypeNodes.set(entry.name, entry.typeNode);
      else variableTypeNodes.delete(entry.name);
      if (entry.category !== undefined) variableTypes.set(entry.name, entry.category);
      else variableTypes.delete(entry.name);
      if (entry.className !== undefined) variableClassNames.set(entry.name, entry.className);
      else variableClassNames.delete(entry.name);
    }
  };
}

// The variables a block declares directly
function blockScopeNames(block: AstNode): string[] {
  const names: string[] = [];
  const addBinding = (name: AstNode): void => {
    if (!name) return;
    if (isIdentifier(name)) names.push(name.text);
    else for (const el of name.elements ?? []) if (!isOmittedExpression(el)) addBinding(el.name);
  };
  for (const statement of block.statements ?? []) {
    if (isVariableStatement(statement)) for (const d of statement.declarationList?.declarations ?? []) addBinding(d.name);
  }
  return names;
}

// The names a function binds itself: its parameters and the variables its
// body declares (not those of nested functions)
function functionScopeNames(fn: AstNode): string[] {
  const names: string[] = [];
  const addBinding = (name: AstNode): void => {
    if (!name) return;
    if (isIdentifier(name)) names.push(name.text);
    else for (const el of name.elements ?? []) if (!isOmittedExpression(el)) addBinding(el.name);
  };
  for (const p of fn.parameters ?? []) addBinding(p.name);
  const walk = (n: AstNode): void => {
    if (n.kind === 'VariableDeclaration') addBinding(n.name);
    for (const child of childNodes(n)) if (!FUNCTION_LIKE_KINDS.has(child.kind) && child.kind !== 'ClassDeclaration') walk(child);
  };
  if (fn.body) walk(fn.body);
  return names;
}

// A method typed `this`, or an unannotated one whose every `return` is
// `return this`: in a subclass it returns the subclass
function returnsOnlyThis(member: AstNode): boolean {
  // (a `this` annotation returning another value — a clone — keeps its declared type)
  if (member.type && member.type.kind !== 'ThisType') return false;
  if (!member.body || !isBlock(member.body)) return member.type?.kind === 'ThisType' && !member.body;
  const returns = collectReturnStatements(member.body);
  return returns.length > 0 && returns.every((r) => r.expression?.kind === 'ThisKeyword');
}

// A function body that can end without a `return` (an exhaustive switch
// without `default`, or an implicit `undefined` result) still needs one in Go:
// the result type's zero value
function fallbackReturn(block: AstNode): string {
  const fn = block.parent;
  if (!fn || fn.body !== block || fn.asteriskToken) return '';
  if ((fn.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) return '';
  let goType = '';
  if (isMethodDeclaration(fn)) {
    goType = methodReturnGoType(fn);
  } else if (isFunctionDeclaration(fn) || isFunctionExpression(fn) || isArrowFunction(fn)) {
    goType = goCallbackResultType(fn) ?? inferFunctionBodyReturnType(fn) ?? '';
  } else if (isGetAccessor(fn)) {
    goType = fn.type ? getType(fn.type) : 'interface{}';
  }
  if (!goType) return '';
  const statements = block.statements ?? [];
  const last = statements[statements.length - 1];
  if (last && (isReturnStatement(last) || isThrowStatement(last))) return '';
  return `\n\treturn *new(${goType})\n\t`;
}

// The return statements of a function body in source order, including those
// nested in if / loops / switch / try, but not those of nested functions.
// (Returned rather than pushed into a parameter: an any[] passed to a function
// doesn't share appends once self-hosted.)
function collectReturnStatements(node: AstNode): AstNode[] {
  if (!node) return [];
  if (isReturnStatement(node)) return [node];
  let found: AstNode[] = [];
  if (isBlock(node) || node.kind === 'CaseClause' || node.kind === 'DefaultClause') {
    for (const stmt of node.statements ?? []) found = found.concat(collectReturnStatements(stmt));
  } else if (isIfStatement(node)) {
    found = collectReturnStatements(node.thenStatement);
    if (node.elseStatement) found = found.concat(collectReturnStatements(node.elseStatement));
  } else if (
    node.kind === 'ForStatement' ||
    node.kind === 'ForOfStatement' ||
    node.kind === 'ForInStatement' ||
    node.kind === 'WhileStatement' ||
    node.kind === 'DoStatement' ||
    node.kind === 'LabeledStatement'
  ) {
    found = collectReturnStatements(node.statement);
  } else if (node.kind === 'SwitchStatement') {
    for (const clause of node.caseBlock?.clauses ?? []) found = found.concat(collectReturnStatements(clause));
  } else if (node.kind === 'TryStatement') {
    found = collectReturnStatements(node.tryBlock);
    if (node.catchClause) found = found.concat(collectReturnStatements(node.catchClause.block));
    if (node.finallyBlock) found = found.concat(collectReturnStatements(node.finallyBlock));
  }
  return found;
}

function getEnclosingParameterType(expr: AstNode): string | undefined {
  const primitives = ['NumberKeyword', 'StringKeyword', 'BooleanKeyword', 'BigIntKeyword'];
  for (let node = expr.parent; node; node = node.parent) {
    if (!isArrowFunction(node) && !isFunctionExpression(node) && node.kind !== 'FunctionDeclaration' && !isMethodDeclaration(node)) {
      continue;
    }
    const param = (node.parameters ?? []).find((p: AstNode) => isIdentifier(p.name) && p.name.text === expr.text);
    if (!param) continue;
    if (!param.type || param.questionToken || param.initializer) return undefined;
    // ...values: number[] reads as []float64 in the body
    if (param.dotDotDotToken) {
      const elem = param.type.kind === 'ArrayType' ? param.type.elementType : undefined;
      return elem && primitives.includes(elem.kind) ? `[]${getType(elem)}` : undefined;
    }
    return primitives.includes(param.type.kind) ? getParameterGoType(param) : undefined;
  }
  return undefined;
}

function inferArrowFunctionGoType(node: AstNode | AstNode): string {
  // Mirrors getFunctionParametersInfo: trailing defaulted parameters become
  // a variadic `...interface{}`
  const parameters: AstNode[] = node.parameters ?? [];
  const firstDefaultIndex = parameters.findIndex((p) => !!p.initializer);
  const hasTrailingDefaults =
    firstDefaultIndex > -1 && !parameters.slice(firstDefaultIndex).some((p) => !p.initializer && !(p.questionToken && !p.dotDotDotToken));
  const paramTypes = (hasTrailingDefaults ? parameters.slice(0, firstDefaultIndex) : parameters).map(
    (p) => getParameterGoType(p)
  );
  if (hasTrailingDefaults) paramTypes.push('...interface{}');
  const params = paramTypes.join(', ');
  // (the result with the function's own parameters and locals typed)
  const retType = isPromiseReturningArrow(node)
    ? `chan ${getPromiseChannelType(node)}`
    : node.type ? inferFunctionBodyReturnType(node) : withFunctionScopeTypes(node, () => inferFunctionBodyReturnType(node) ?? '') || undefined;
  return `func(${params})${retType ? ` ${retType}` : ''}`;
}

// fn.mock on a function value: the call record of a node:test mock (functions have no fields in Go)
function isMockAccess(node: AstNode): boolean {
  if (!isPropertyAccessExpression(node) || node.name.text !== 'mock' || !nodeRegistry.modules['test']) return false;
  if (mockedMemberAccess(node.expression)) return true;
  return !!inferExpressionType(mockedMemberTarget(node.expression))?.startsWith('func(');
}

function inferExpressionType(expr: AstNode): string | undefined {
  const inferred = inferExpressionTypeOf(expr);
  if (inferred !== undefined) return inferred;
  // a method called on a dynamic value goes through a dispatcher: any result
  if (isCallExpression(expr) && isPropertyAccessExpression(expr.expression) && !hasQuestionDot(expr.expression) && expr.expression.expression.kind !== 'SuperKeyword' && isDynamicValue(expr.expression.expression)) {
    return 'interface{}';
  }
  return undefined;
}

function inferExpressionTypeOf(expr: AstNode): string | undefined {
  if (expr?.kind === 'TnArrayItems') return '[]interface{}';
  // an Array subclass's elements are any (its type parameters are erased)
  if (isElementAccessExpression(expr) && expr.expression.kind !== 'TnArrayItems' && arraySubclassOf(expr.expression) && !isStringLiteral(expr.argumentExpression)) {
    return 'interface{}';
  }
  if (isMockAccess(expr)) return '*TnMockFunctionContext';
  if (expr?.kind === 'ThisKeyword') return thisGoType(expr);
  if (isCallExpression(expr) && expr.expression?.kind === 'ImportKeyword') return 'chan interface{}';
  // f<T> as a value (an instantiation expression): f
  if (expr?.kind === 'ExpressionWithTypeArguments' && !isHeritageType(expr)) return inferExpressionType(expr.expression);
  if (isAwaitExpression(expr)) {
    // await unwraps the promise channel
    const inner = inferExpressionType(expr.expression);
    return inner?.startsWith('chan ') ? inner.slice(5) || 'struct{}' : 'interface{}';
  }
  if (isArrowFunction(expr) || isFunctionExpression(expr)) {
    return inferArrowFunctionGoType(expr);
  }
  if (isParenthesizedExpression(expr)) return inferExpressionType(expr.expression);
  if (isNonNullExpression(expr)) {
    const innerType = inferExpressionType(expr.expression);
    return innerType && NULLABLE_PRIMITIVE_TYPES.includes(innerType) ? innerType.slice(1) : innerType;
  }
  if (isAsExpression(expr)) return getAsExpressionType(expr);
  if (isTypeAssertionExpression(expr)) return getType(expr.type);
  const nodeType = inferNodeExpressionType(expr);
  if (nodeType !== undefined) return nodeType === '' ? undefined : nodeType;
  const goType = inferGoExpressionType(expr);
  if (goType !== undefined) return goType;
  if (
    isStringLiteral(expr) ||
    isNoSubstitutionTemplateLiteral(expr) ||
    isTemplateExpression(expr)
  ) {
    return 'string';
  }
  if (isNumericLiteral(expr)) return 'float64';
  if (expr.kind === 'VoidExpression') return 'nil';
  if (expr.kind === 'SatisfiesExpression') return inferExpressionType(expr.expression);
  if (expr.kind === 'BigIntLiteral') return '*tnbig.Int';
  if (expr.kind === 'TypeOfExpression') return 'string';
  if (isJsxNode(expr)) return 'TnJsxNode';
  if (expr.kind === 'TaggedTemplateExpression' && isStringRawTag(expr.tag)) return 'string';
  // sql`…` with a Node class method as the tag (node:sqlite's tag store)
  if (expr.kind === 'TaggedTemplateExpression' && isPropertyAccessExpression(expr.tag)) {
    const recvType = inferExpressionType(expr.tag.expression);
    const cls = recvType ? nodeRegistry.classes[nodeRegistry.classByGoType[recvType]] : undefined;
    const result = cls?.methods[expr.tag.name.text];
    if (result) return result;
  }
  if (isRegularExpressionLiteral(expr)) {
    const lastSlash = expr.text.lastIndexOf('/');
    if (needsStatefulRegex(expr.text.substring(1, lastSlash), expr.text.substring(lastSlash + 1))) {
      return '*TnRegex';
    }
    return '*regexp.Regexp';
  }
  if (isNewExpression(expr) && isIdentifier(expr.expression) && expr.expression.text === 'RegExp') {
    return '*regexp.Regexp';
  }
  if (expr.kind === 'TrueKeyword' || expr.kind === 'FalseKeyword')
    return 'bool';
  if (expr.kind === 'NullKeyword') return 'nil';
  if (isIdentifier(expr) && expr.text === 'undefined') return 'nil';
  if (isIdentifier(expr)) {
    // A primitive-typed parameter of an enclosing function: its annotation,
    // not a same-named variable registered earlier (inferring the return type
    // of an arrow before it is visited)
    const enclosingParamType = getEnclosingParameterType(expr);
    if (enclosingParamType) return enclosingParamType;
    let varType: string | undefined = variableGoTypes.get(expr.text);
    const typeofNarrowed = (varType ?? 'interface{}') === 'interface{}' ? typeofNarrowedType(expr.text) : undefined;
    if (typeofNarrowed && isNarrowableReference(expr) && !isAssignmentTarget(expr)) return typeofNarrowed;
    // Array references are read as the slice they point to
    if (varType?.startsWith('*[]')) varType = varType.slice(1);
    // (a narrowed variable is still written with its declared type)
    return narrowedVariables.has(expr.text) && varType?.startsWith('*') && !isAssignmentTarget(expr) ? varType.slice(1) : varType;
  }
  if (isArrayLiteralExpression(expr)) {
    return `[]${getArrayLiteralElementType(expr)}`;
  }
  if (isObjectLiteralExpression(expr)) return recordSpreadType(expr) ?? getObjectLiteralGoType(expr);
  // new f(…) where f holds a constructor function: its result
  if (isNewExpression(expr) && !(isIdentifier(expr.expression) && classNames.has(expr.expression.text))) {
    const ctorType = expr.expression.kind === 'ThisKeyword' ? '' : (inferExpressionType(expr.expression) ?? '');
    if (ctorType.startsWith('func(')) return goFuncReturnType(ctorType) ?? 'interface{}';
  }
  // new (expr)(…) / new x(…) where x holds a class value: any instance
  if (isNewExpression(expr) && (!isIdentifier(expr.expression) && expr.expression.kind !== 'ThisKeyword' && !isPropertyAccessExpression(expr.expression) || (isIdentifier(expr.expression) && variableGoTypes.get(expr.expression.text) === 'interface{}'))) {
    return 'interface{}';
  }
  // new this(…) in a static method: an instance of the class declaring it
  if (isNewExpression(expr) && expr.expression.kind === 'ThisKeyword') {
    const owner = getEnclosingClassName(expr);
    // (NewC's result, even for a class with subclasses)
    if (owner) return `*${getSafeName(owner)}`;
  }
  if (isNewExpression(expr) && isIdentifier(expr.expression)) {
    const ctorName = expr.expression.text;
    if (classNames.has(ctorName)) return `*${ctorName}`;
    if (ctorName === 'Error' || (BUILTIN_ERROR_NAMES.has(ctorName) && !classNames.has(ctorName))) return '*TnError';
    if (ctorName === 'Promise' && (expr.typeArguments ?? []).length > 0) {
      return `chan ${getType(expr.typeArguments[0]) || 'struct{}'}`;
    }
    const typeArguments = getCollectionTypeArguments(expr);
    if (ctorName === 'Array' && (expr.typeArguments ?? []).length === 1) {
      return `[]${getType(expr.typeArguments[0])}`;
    }
    // new Array(n): any values (see its emitter)
    if (ctorName === 'Array' && !classNames.has('Array') && (expr.arguments ?? []).length <= 1) return '[]interface{}';
    if (ctorName === 'Date') {
      return 'time.Time';
    }
    if (ctorName === 'WeakRef' && !classNames.has(ctorName) && expr.arguments?.[0]) {
      const target = inferExpressionType(expr.arguments[0]) ?? '';
      return target.startsWith('*') ? `*TnWeakRef[${target.slice(1)}]` : 'interface{}';
    }
    if (ctorName === 'FinalizationRegistry' && !classNames.has(ctorName)) return '*TnFinalizationRegistry';
    if (ctorName === 'Map' && typeArguments.length === 2) {
      return mapGoType(getType(typeArguments[0]), getType(typeArguments[1]));
    }
    // as visitNewMap emits it: from a contextual type, else interface{} keys and values
    if (ctorName === 'Map' && !classNames.has(ctorName)) {
      const contextual = getCollectionTypeArguments(expr);
      return contextual.length === 2
        ? mapGoType(getType(contextual[0]), getType(contextual[1]))
        : mapGoType('interface{}', 'interface{}');
    }
    if (ctorName === 'Set' && typeArguments.length === 1) {
      return mapGoType(getType(typeArguments[0]), 'struct{}');
    }
    if (ctorName === 'Set' && !classNames.has(ctorName)) return mapGoType(newSetElementType(expr), 'struct{}');
  }

  if (isElementAccessExpression(expr)) {
    const tupleElement = tupleElementGoType(expr);
    if (tupleElement) return tupleElement;
    const objectType = inferExpressionType(expr.expression);
    if (objectType === 'string') return 'string';
    if (objectType?.startsWith('[]')) return objectType.slice(2);
    if (objectType && isFieldObjectType(objectType) && inferExpressionType(expr.argumentExpression) !== 'float64') {
      if (isStringLiteral(expr.argumentExpression)) return getObjectFieldGoType(objectType, expr.argumentExpression.text);
      return objectMemberCommonType(objectType);
    }
    if (isTypedArrayGoType(objectType)) return 'float64';
    if (objectType?.startsWith('*TnMap[')) return extractMapValueType(objectType);
    const declared = getExpressionTypeNode(expr);
    if (declared) return getType(declared);
  }

  if (
    isPropertyAccessExpression(expr) &&
    isIdentifier(expr.expression) &&
    expr.expression.text === 'process' &&
    expr.name.text === 'argv'
  ) {
    return '[]string';
  }
  // import.meta.url is a string
  if (isPropertyAccessExpression(expr) && isNewTargetNode(expr.expression) && expr.name.text === 'name') return 'string';
  if (isPropertyAccessExpression(expr) && expr.expression.kind === 'MetaProperty' && expr.name.text === 'url') {
    return 'string';
  }
  if (isIdentifier(expr) && (expr.text === 'NaN' || expr.text === 'Infinity')) return 'float64';
  if (isPropertyAccessExpression(expr) && isIdentifier(expr.expression) && expr.expression.text === 'Number') {
    return 'float64';
  }
  // process.env.X (also through casts: (process.env as any).X)
  if (isPropertyAccessExpression(expr) && isProcessEnv(expr.expression)) return 'string';
  if (
    isPrefixUnaryExpression(expr) &&
    (expr.operator === 'MinusToken' || expr.operator === 'TildeToken') &&
    (expr.operand.kind === 'BigIntLiteral' || inferExpressionType(expr.operand) === '*tnbig.Int')
  ) {
    return '*tnbig.Int';
  }
  if (
    (isPrefixUnaryExpression(expr) || isPostfixUnaryExpression(expr)) &&
    ['MinusToken', 'PlusToken', 'TildeToken', 'PlusPlusToken', 'MinusMinusToken'].includes(expr.operator)
  ) {
    return 'float64';
  }
  if (isCallExpression(expr)) {
    // A typed string ('' when not a plain name): mixing `any` text with
    // `string | undefined` compiles natively to a boxed *string that never matches
    const callee: string = isIdentifier(expr.expression)
      ? String(expr.expression.text)
      : isPropertyAccessExpression(expr.expression) && isIdentifier(expr.expression.expression)
        ? `${expr.expression.expression.text}.${expr.expression.name.text}`
        : '';
    const promiseType = inferPromiseCallType(expr);
    if (promiseType) return promiseType;
    const objectCallType = inferObjectCallType(expr);
    if (objectCallType) return objectCallType;
    if (isIdentifier(expr.expression) && expr.expression.text === 'structuredClone') {
      return inferExpressionType(expr.arguments?.[0]);
    }
    // Promise.all([...]) resolves to a slice over a channel
    if (
      isPropertyAccessExpression(expr.expression) &&
      isIdentifier(expr.expression.expression) &&
      expr.expression.expression.text === 'Promise' &&
      expr.expression.name.text === 'all'
    ) {
      const elem = promiseAllElementType(expr);
      if (elem) return `chan []${elem}`;
      return 'chan []interface{}';
    }
    // Generator functions return a channel of yielded values
    if (
      isIdentifier(expr.expression) &&
      generatorFunctionNames.has(expr.expression.text)
    ) {
      const fn = declaredFunctions.get(expr.expression.text);
      if (fn) return `chan ${getGeneratorYieldType(fn)}`;
    }
    if (callee === 'Array.of') return arrayOfGoType((expr.arguments ?? []).map((a: AstNode) => inferExpressionType(a)));
    if (callee === 'Iterator.from' && expr.arguments?.[0]) {
      const sourceType = (inferExpressionType(expr.arguments[0]) ?? '').replace(/^\*/, '');
      if (sourceType.startsWith('chan ')) return sourceType;
      return sourceType.startsWith('[]') ? `chan ${sourceType.slice(2)}` : 'chan interface{}';
    }
    if ((callee === 'Object.groupBy' || callee === 'Map.groupBy') && expr.arguments?.length === 2) {
      return groupByGoType(expr.arguments[0], expr.arguments[1], callee === 'Map.groupBy');
    }
    if (callee === 'Promise.withResolvers') {
      return promiseWithResolversGoType((expr.typeArguments ?? [])[0] ? getType(expr.typeArguments[0]) : 'interface{}');
    }
    if (callee === 'Promise.try' && expr.arguments?.[0]) {
      const result = goFuncReturnType(functionValueGoType(expr.arguments[0])) ?? '';
      return result.startsWith('chan ') ? result : `chan ${result || 'struct{}'}`;
    }
    // f.bind(thisArg, a…): a function of the remaining parameters
    if (isPropertyAccessExpression(expr.expression) && expr.expression.name.text === 'bind') {
      const fnType = functionValueGoType(expr.expression.expression);
      if (fnType) {
        const rest = goFuncParamTypes(fnType).slice(Math.max(0, (expr.arguments ?? []).length - 1));
        const result = goFuncReturnType(fnType);
        return `func(${rest.join(', ')})${result ? ` ${result}` : ''}`;
      }
    }
    if (callee === 'Object.assign') {
      const targetType = objectAssignTargetType(expr);
      if (targetType) return targetType;
    }
    if (callee && BUILTIN_CALL_TYPES[callee]) return BUILTIN_CALL_TYPES[callee];
    if (callee.startsWith('Math.')) return 'float64';
  }
  // Object.keys(map) / Object.values(map)
  if (
    isCallExpression(expr) &&
    isPropertyAccessExpression(expr.expression) &&
    isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'Object'
  ) {
    const mapType = inferExpressionType(expr.arguments?.[0]);
    if (mapType?.startsWith('*TnMap[')) {
      if (expr.expression.name.text === 'keys') return `[]${extractMapKeyType(mapType)}`;
      if (expr.expression.name.text === 'values') return `[]${extractMapValueType(mapType)}`;
      if (expr.expression.name.text === 'entries') return '[][]interface{}';
    } else if (expr.arguments?.[0]) {
      if (expr.expression.name.text === 'keys') return '[]string';
      if (expr.expression.name.text === 'values') return '[]interface{}';
      if (expr.expression.name.text === 'entries') return '[][]interface{}';
    }
  }
  if (isCallExpression(expr) && isIdentifier(expr.expression)) {
    const builtinType = BUILTIN_FUNCTION_TYPES[expr.expression.text];
    if (builtinType && !declaredFunctions.has(expr.expression.text)) return builtinType;
  }

  const regexPropertyType = inferRegexPropertyType(expr);
  if (regexPropertyType) return regexPropertyType;
  if (isPropertyAccessExpression(expr) && inferExpressionType(expr.expression) === '*TnDecoratorContext') {
    return ['static', 'private'].includes(expr.name.text) ? 'bool' : 'string';
  }
  if (isPropertyAccessExpression(expr) && expr.name.text === 'length' && hasDynamicProperties(expr.expression)) {
    return 'float64';
  }
  if ((isPropertyAccessExpression(expr) || isElementAccessExpression(expr)) && isDynamicValue(expr.expression)) {
    return 'interface{}';
  }
  if (isPropertyAccessExpression(expr) && !isCallee(expr) && isTypeParameterValue(expr.expression)) {
    return 'interface{}';
  }
  if (
    isCallExpression(expr) &&
    isPropertyAccessExpression(expr.expression) &&
    isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'Array' &&
    expr.expression.name.text === 'from'
  ) {
    // as its emitter builds it: [...source], or its mapped values
    const source = (expr.arguments ?? [])[0];
    const callback = (expr.arguments ?? [])[1];
    const sourceType = (source ? inferExpressionType(source) ?? '' : '').replace(/^\*\[\]/, '[]');
    if (callback) {
      const result = goFuncReturnType(functionValueGoType(callback) ?? '');
      return result && (sourceType.startsWith('[]') || sourceType.startsWith('*TnMap[') || sourceType === 'string') ? `[]${result}` : '[]interface{}';
    }
    if (sourceType.startsWith('[]') && !arraySubclassOf(source)) return sourceType;
    if (isTypedArrayGoType(sourceType)) return '[]float64';
    if (sourceType === 'string') return '[]string';
    if (sourceType.startsWith('*TnMap[')) return extractMapValueType(sourceType) === 'struct{}' ? `[]${extractMapKeyType(sourceType)}` : '[][]interface{}';
    return '[]interface{}';
  }
  if (isCallExpression(expr) && isObjectKeysOfDynamic(expr)) return '[]string';
  // f?.() is undefined when f is
  if (isCallExpression(expr) && hasQuestionDot(expr)) {
    const fnType = inferExpressionType(expr.expression) ?? '';
    const returnType = fnType.startsWith('func(') ? goFuncReturnType(fnType) : undefined;
    return returnType ? makeNullableType(returnType) : undefined;
  }
  const recordCall = isCallExpression(expr) ? getRecordFunctionCall(expr) : undefined;
  if (recordCall) return goFuncReturnType(extractMapValueType(recordCall.mapType));
  if (
    isCallExpression(expr) &&
    isPropertyAccessExpression(expr.expression) &&
    isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'JSON' &&
    expr.expression.name.text === 'parse'
  ) {
    return 'interface{}';
  }
  if (
    isCallExpression(expr) &&
    isPropertyAccessExpression(expr.expression) &&
    isDynamicValue(expr.expression.expression)
  ) {
    const method = expr.expression.name.text;
    const castCall = castDynamicReceiverCall(expr);
    if (castCall) return inferExpressionType(castCall);
    if (method === 'includes') return 'bool';
    if (method === 'indexOf') return 'float64';
    if (method === 'slice' || method === 'concat') return 'interface{}';
  }
  if (isFirstIterationCall(expr)) {
    const sourceType = (inferExpressionType(expr.expression.expression) ?? '').replace(/^\*\[\]/, '[]');
    return `*TnIterResult[${sourceType.startsWith('[]') ? sourceType.slice(2) : 'interface{}'}]`;
  }
  // { value, done } of an iterator step
  if (isPropertyAccessExpression(expr) && (inferExpressionType(expr.expression) ?? '').startsWith('*TnIterResult[')) {
    return expr.name.text === 'done' ? 'bool' : (inferExpressionType(expr.expression) ?? '').slice(14, -1);
  }
  if (isPropertyAccessExpression(expr)) {
    const narrowingKey = getNarrowingKey(expr);
    if (narrowingKey && narrowedVariables.has(narrowingKey) && !isAssignmentTarget(expr)) {
      // Narrowed: the declared (pointer) type without its pointer
      narrowedVariables.delete(narrowingKey);
      const nullableType = inferExpressionType(expr);
      narrowedVariables.add(narrowingKey);
      if (nullableType?.startsWith('*')) return nullableType.slice(1);
    }
    if (isIdentifier(expr.expression) && enumNames.has(expr.expression.text)) {
      // Numeric enums are float64 constants; string enums keep their type
      if (enumBaseTypes.get(expr.expression.text) === 'float64') return 'float64';
      if (enumBaseTypes.get(expr.expression.text) === 'interface{}') {
        return enumMemberGoTypes.get(`${expr.expression.text}.${getEnumMemberName(expr.name)}`) ?? 'interface{}';
      }
      const enumType = getSafeName(expr.expression.text);
      return enumType;
    }
    // C.x: a static property (its annotation, else its initializer's type)
    if (isIdentifier(expr.expression) && classNames.has(expr.expression.text) && !variableGoTypes.has(expr.expression.text)) {
      const staticType = staticPropertyGoType(expr.expression.text, memberKey(expr.name));
      if (staticType) return staticType;
    }
    // x.constructor: a class value (or nil)
    if (expr.name.text === 'constructor') return 'interface{}';
    const leftType = inferExpressionType(expr.expression);
    if (expr.name.text === 'length') return 'float64';
    if (expr.name.text === 'index' && leftType === '[]string') return 'float64';
    // record.key reads the Record's value type
    if (leftType?.startsWith('*TnMap[') && expr.name.text !== 'size' && !isCallee(expr)) {
      const objectType = resolveExpressionType(expr.expression);
      if (objectType === 'Record' || objectType === 'Map' || objectType === undefined) {
        const valueType = extractMapValueType(leftType);
        if (valueType !== 'struct{}') return valueType;
      }
    }

    const resolvedLeftType = leftType?.replace(/^\*/, '').replace(/\[.*\]$/, '');
    const resolvedPropertyType = resolvedLeftType
      ? (classPropertyTypes.get(resolvedLeftType)?.get(memberKey(expr.name)) ??
        interfacePropertyTypes.get(resolvedLeftType)?.get(memberKey(expr.name)))
      : undefined;

    if (hasQuestionDot(expr)) {
      if (leftType && leftType.startsWith('*')) {
        const memberType =
          resolvedPropertyType ??
          getStructFieldGoType(leftType.slice(1), memberKey(expr.name)) ??
          'interface{}';
        return makeNullableType(memberType);
      }
      return 'interface{}';
    }

    if (resolvedPropertyType) {
      return resolvedPropertyType;
    }
    const structFieldType = leftType ? getStructFieldGoType(leftType.replace(/^\*/, ''), memberKey(expr.name)) : undefined;
    if (structFieldType) return structFieldType;

    if (isIdentifier(expr.expression)) {
      const className = variableClassNames.get(expr.expression.text);
      const memberType = className
        ? classPropertyTypes.get(className)?.get(memberKey(expr.name))
        : undefined;
      if (memberType) return memberType;
    }
  }

  if (isCallExpression(expr) && isIdentifier(expr.expression)) {
    // f(…) where a local f holds a function as any: a dynamic call
    if (variableGoTypes.get(expr.expression.text) === 'interface{}') return 'interface{}';
    const fn = declaredFunctions.get(expr.expression.text);
    if (fn?.type) return getType(fn.type);
    // an unannotated function: its returns, with its locals typed
    const dynamicLocal = variableGoTypes.get(expr.expression.text);
    if (fn && !dynamicLocal && !fn.asteriskToken && !(fn.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword') && !inferringFunctions.has(fn)) {
      inferringFunctions.add(fn);
      const result = methodReturnGoType(fn);
      inferringFunctions.delete(fn);
      if (result) return result;
    }
    const fnValueType = variableGoTypes.get(expr.expression.text);
    if (fnValueType?.startsWith('func(')) return goFuncReturnType(fnValueType);
  }

  if (isCallExpression(expr) && isPropertyAccessExpression(expr.expression)) {
    // private methods are registered without their '#'
    const methodName = memberKey(expr.expression.name);
    // Class.staticMethod(): its declared or inferred result
    if (isIdentifier(expr.expression.expression) && classNames.has(expr.expression.expression.text)) {
      const owner = staticMemberOwner(expr.expression.expression.text, methodName);
      const staticMethod = owner
        ? (declaredClasses.get(owner)?.members ?? []).find(
            (m: AstNode) =>
              isMethodDeclaration(m) &&
              (m.modifiers ?? []).some((mod: AstNode) => mod.kind === 'StaticKeyword') &&
              (memberKey(m.name)) === methodName
          )
        : undefined;
      if (staticMethod) {
        const isAsync = (staticMethod.modifiers ?? []).some((mod: AstNode) => mod.kind === 'AsyncKeyword');
        const staticType =
          isAsync && !staticMethod.type ? `chan ${getPromiseChannelType(staticMethod)}` : methodReturnGoType(staticMethod);
        if (staticType) return staticType;
      }
    }
    const ownerType = inferExpressionType(expr.expression.expression);

    if (
      ownerType &&
      NULLABLE_PRIMITIVE_TYPES.includes(ownerType) &&
      (hasQuestionDot(expr) ||
        hasQuestionDot(expr.expression) ||
        isOptionalChain(expr.expression.expression))
    ) {
      const tmp = getTempName('optt');
      const call = makeNarrowedReceiverCall(expr, tmp, ownerType);
      const resultType = withNarrowingType([tmp], () => inferExpressionType(call));
      variableGoTypes.delete(tmp);
      return resultType ? makeNullableType(resultType) : undefined;
    }

    // obj.fn() on a typed object: its function field's result
    if (ownerType?.startsWith('*') && !classNameOfGoType(ownerType)) {
      const fieldType = inferExpressionType(expr.expression);
      if (fieldType?.startsWith('func(')) return goFuncReturnType(fieldType);
    }
    if (ownerType === 'string') {
      const stringMethodType = STRING_METHOD_RETURN_TYPES[methodName];
      if (stringMethodType) return stringMethodType;
    }
    if (ownerType === '*regexp.Regexp' || ownerType === '*TnRegex') {
      if (methodName === 'exec') {
        // Named-group patterns return a match object with a .groups record
        const receiver = expr.expression.expression;
        if (isRegularExpressionLiteral(receiver) && /\(\?<[A-Za-z_]/.test(receiver.text ?? '')) {
          useHelper('namedGroups');
          return '*TnMatch';
        }
        return '[]string';
      }
      if (methodName === 'test') return 'bool';
    }
    if (ownerType === 'time.Time') {
      if (methodName === 'getTime' || methodName === 'valueOf' || methodName === 'getMilliseconds' ||
          methodName === 'getSeconds' || methodName === 'getMinutes' || methodName === 'getHours' ||
          methodName === 'getDate' || methodName === 'getDay' || methodName === 'getMonth' ||
          methodName === 'getFullYear' || methodName.startsWith('getUTC')) return 'float64';
      if (methodName === 'toISOString' || methodName === 'toJSON' || methodName === 'toString' ||
          methodName === 'toDateString' || methodName === 'toTimeString') return 'string';
    }

    if (ownerType && ownerType.startsWith('*TnMap[')) {
      if (['has', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom'].includes(methodName)) return 'bool';
      if (['union', 'intersection', 'difference', 'symmetricDifference'].includes(methodName)) return ownerType;
      if (methodName === 'get') {
        const valueType = extractMapValueType(ownerType);
        return isStructGoType(valueType) ? `*${valueType}` : valueType;
      }
    }

    if (isTypedArrayGoType(ownerType)) {
      if (methodName === 'map' || methodName === 'filter') return ownerType;
      if (methodName === 'some' || methodName === 'every') return 'bool';
      if (['find', 'findIndex', 'findLast', 'findLastIndex'].includes(methodName)) return 'float64';
      if (methodName === 'reduce' || methodName === 'reduceRight') {
        return (expr.arguments?.[1] ? inferExpressionType(expr.arguments[1]) : undefined) ?? 'float64';
      }
      if (methodName === 'entries') return '[][]interface{}';
    }
    if (
      methodName === 'from' &&
      isIdentifier(expr.expression.expression) &&
      expr.expression.expression.text === 'Array' &&
      isTypedArrayGoType(inferExpressionType(expr.arguments?.[0]))
    ) {
      return '[]float64';
    }

    // (an array reference *[]T answers like its []T)
    const arrayOwnerType = ownerType?.startsWith('*[]') ? ownerType.slice(1) : ownerType;
    if (isArrayLikeGoType(arrayOwnerType)) {
      const elementType = getArrayElementTypeFromGoType(arrayOwnerType!);
      if (methodName === 'map') {
        const callback = expr.arguments[0];
        const mappedType = callback
          ? inferArrayCallbackReturnType(callback, elementType, elementType)
          : elementType;
        return `[]${mappedType}`;
      }
      if (['filter', 'slice', 'concat', 'reverse', 'sort'].includes(methodName)) {
        return `[]${elementType}`;
      }
      if (['some', 'every', 'includes'].includes(methodName)) return 'bool';
      if (['indexOf', 'lastIndexOf', 'findIndex'].includes(methodName)) return 'float64';
      if (['pop', 'shift', 'at'].includes(methodName)) return elementType;
      if (['concat', 'toSorted', 'toReversed', 'with', 'copyWithin', 'toSpliced'].includes(methodName)) return arrayOwnerType;
      if (methodName === 'splice') return arrayOwnerType;
      if (methodName === 'reduceRight' && expr.arguments?.[1]) return inferExpressionType(expr.arguments[1]);
      // the accumulator: the initial value's type, else the element type
      if (methodName === 'reduce') {
        return (expr.arguments?.[1] ? inferExpressionType(expr.arguments[1]) : undefined) ?? elementType;
      }
      if (methodName === 'flat' && elementType.startsWith('[]')) return elementType;
      if (methodName === 'flat' || methodName === 'flatMap') return `[]${elementType}`;
      if (methodName === 'entries') return '[][]interface{}';
      if (methodName === 'find') return elementType;
      if (methodName === 'join') return 'string';
    }

    if (ownerType?.startsWith('*TnWeakRef[') && methodName === 'deref') return `*${ownerType.slice('*TnWeakRef['.length, -1)}`;
    if (ownerType?.startsWith('chan ') && ITERATOR_HELPERS.has(methodName)) {
      const helperType = iteratorHelperGoType(expr, ownerType, methodName);
      if (helperType) return helperType;
    }
    if (ownerType === '*TnFinalizationRegistry' && methodName === 'unregister') return 'bool';
    // Map / Set iteration: m.keys() → []K, m.values() → []V
    if (ownerType?.startsWith('*TnMap[') && (methodName === 'keys' || methodName === 'values' || methodName === 'entries')) {
      const keyType = extractMapKeyType(ownerType);
      const valueType = extractMapValueType(ownerType);
      if (methodName === 'entries') return '[][]interface{}';
      if (methodName === 'keys' || valueType === 'struct{}') return `[]${keyType}`;
      return `[]${valueType}`;
    }
    if (ownerType && ownerType.startsWith('*')) {
      const className = ownerType.replace(/^\*/, '').replace(/\[.*\]$/, '');
      const returnType = classMethodReturnTypes.get(className)?.get(methodName);
      if (returnType) {
        if (hasQuestionDot(expr) || hasQuestionDot(expr.expression)) {
          return makeNullableType(returnType);
        }
        return returnType;
      }
    }

    if (isIdentifier(expr.expression.expression)) {
      const className = variableClassNames.get(expr.expression.expression.text);
      const returnType = className
        ? classMethodReturnTypes.get(className)?.get(methodName)
        : undefined;
      if (returnType) {
        if (hasQuestionDot(expr) || hasQuestionDot(expr.expression)) {
          return makeNullableType(returnType);
        }
        return returnType;
      }
    }
  }

  if (isConditionalExpression(expr)) {
    const whenTrueType = inferExpressionType(expr.whenTrue);
    const whenFalseType = inferExpressionType(expr.whenFalse);
    // `c ? value : undefined` is nullable
    if (whenTrueType === 'nil' && whenFalseType) return makeNullableType(whenFalseType);
    if (whenFalseType === 'nil' && whenTrueType) return makeNullableType(whenTrueType);
    if (whenTrueType && whenTrueType === whenFalseType) return whenTrueType;
    if (whenTrueType && whenFalseType === `*${whenTrueType}`) return whenFalseType;
    if (whenFalseType && whenTrueType === `*${whenFalseType}`) return whenTrueType;
    // one dynamic branch makes the result dynamic (`typeof v === 'number' ? v * 10 : v`)
    if ([whenTrueType, whenFalseType].some((t) => t === 'interface{}' || t === 'any')) return 'interface{}';
    // an empty literal ({} / []) takes the other branch's type
    const isEmptyLiteral = (n: AstNode) =>
      (isObjectLiteralExpression(unwrapParentheses(n)) && (unwrapParentheses(n).properties ?? []).length === 0) ||
      (isArrayLiteralExpression(unwrapParentheses(n)) && (unwrapParentheses(n).elements ?? []).length === 0);
    if (whenTrueType && isEmptyLiteral(expr.whenFalse)) return whenTrueType;
    if (whenFalseType && isEmptyLiteral(expr.whenTrue)) return whenFalseType;
    // branches of different types (`f ? f(x) : 'none'`)
    if (whenTrueType && whenFalseType && whenTrueType.replace(/^\*\[\]/, '[]') !== whenFalseType.replace(/^\*\[\]/, '[]')) {
      return 'interface{}';
    }
    const branchType = whenTrueType ?? whenFalseType;
    return branchType === 'nil' ? 'interface{}' : branchType;
  }

  if (
    isBinaryExpression(expr) &&
    expr.operatorToken.kind === 'QuestionQuestionToken'
  ) {
    return getNullishResultType(expr);
  }
  if (isPrefixUnaryExpression(expr) && expr.operator === 'ExclamationToken') return 'bool';
  if (isBinaryExpression(expr)) {
    const kind = expr.operatorToken.kind;
    if (COMPARISON_OPERATORS.has(kind) || kind === 'InKeyword' || kind === 'InstanceOfKeyword') {
      return 'bool';
    }
    // an assignment's value is the target's
    if (ASSIGNMENT_OPERATORS.has(kind)) return inferExpressionType(expr.left);
    if (kind === 'CommaToken') return inferExpressionType(expr.right);
    // BigInt operands stay bigint
    if (
      [
        'AsteriskToken', 'SlashToken', 'PercentToken', 'AsteriskAsteriskToken', 'PlusToken', 'MinusToken',
        'AmpersandToken', 'BarToken', 'CaretToken', 'LessThanLessThanToken', 'GreaterThanGreaterThanToken'
      ].includes(kind) &&
      (inferExpressionType(expr.left) === '*tnbig.Int' || inferExpressionType(expr.right) === '*tnbig.Int')
    ) {
      return '*tnbig.Int';
    }
    if (isLogicalOperator(expr.operatorToken)) {
      return isLogicalValueExpression(expr) ? getLogicalValueType(expr) : 'bool';
    }
    if (
      [
        'MinusToken',
        'AsteriskToken',
        'SlashToken',
        'PercentToken',
        'AsteriskAsteriskToken',
        'AmpersandToken',
        'BarToken',
        'CaretToken',
        'LessThanLessThanToken',
        'GreaterThanGreaterThanToken',
        'GreaterThanGreaterThanGreaterThanToken'
      ].includes(kind)
    ) {
      return 'float64';
    }
    if (kind === 'PlusToken') {
      const isString = [expr.left, expr.right].some((side) => {
        const sideType = inferExpressionType(side);
        return sideType === 'string' || (!!sideType && enumBaseTypes.get(sideType) === 'string');
      });
      if (isString) return 'string';
      // two dynamic values: a string or a number, known at run time
      if (isDynamicValue(expr.left) && isDynamicValue(expr.right)) return 'interface{}';
      return 'float64';
    }
    if (['LessThanToken', 'GreaterThanToken', 'LessThanEqualsToken', 'GreaterThanEqualsToken'].includes(kind)) {
      return 'bool';
    }
  }

  return undefined;
}

// Functions whose result is being inferred (a recursive call doesn't recurse)
const inferringFunctions = new Set<AstNode>();

const BUILTIN_CALL_TYPES: Record<string, string> = {
  'JSON.stringify': 'string',
  Symbol: '*TnSymbol',
  'Object.create': 'interface{}',
  'Object.getPrototypeOf': 'interface{}',
  'Object.getOwnPropertyDescriptors': 'map[string]interface{}',
  isFinite: 'bool',
  encodeURIComponent: 'string',
  decodeURIComponent: 'string',
  'Object.fromEntries': 'interface{}',
  'Date.UTC': 'float64',
  'Date.parse': 'float64',
  'Math.asinh': 'float64',
  'Math.acosh': 'float64',
  'Math.atanh': 'float64',
  'Math.fround': 'float64',
  'Math.imul': 'float64',
  'Math.clz32': 'float64',
  'Math.sumPrecise': 'float64',
  'Number.isSafeInteger': 'bool',
  'Number.parseInt': 'float64',
  'Number.parseFloat': 'float64',
  'Object.is': 'bool',
  'String.fromCodePoint': 'string',
  'Symbol.for': '*TnSymbol',
  'Symbol.keyFor': '*string',
  BigInt: '*tnbig.Int',
  'BigInt.asIntN': '*tnbig.Int',
  'BigInt.asUintN': '*tnbig.Int',
  'Number.isNaN': 'bool',
  'Number.isFinite': 'bool',
  'Number.isInteger': 'bool',
  isNaN: 'bool',
  'Object.assign': '*TnMap[string, interface{}]',
  'Date.now': 'float64'
};

// Object.freeze & co. record the integrity level (1 preventExtensions, 2 seal,
// 3 freeze) by identity; TypeScript's Readonly<T> result types reject writes
const OBJECT_INTEGRITY_LEVELS: Record<string, number> = { preventExtensions: 1, seal: 2, freeze: 3 };
const OBJECT_INTEGRITY_CHECKS: Record<string, number> = { isExtensible: 1, isSealed: 2, isFrozen: 3 };

function getObjectCallName(node: AstNode): string | undefined {
  if (!isCallExpression(node) || !isPropertyAccessExpression(node.expression)) return undefined;
  if (!isIdentifier(node.expression.expression) || node.expression.expression.text !== 'Object') return undefined;
  return node.expression.name.text;
}

// The Go type of a property of an object type (anonymous struct, interface or class)
function getObjectFieldGoType(objectType: string, field: string): string | undefined {
  const base = objectType.replace(/^\*/, '').replace(/\[.*$/, '');
  return (
    getStructFieldGoType(objectType, field) ??
    interfacePropertyTypes.get(base)?.get(field) ??
    classPropertyTypes.get(base)?.get(field)
  );
}

// The property names of a typed object (an object type literal, interface or
// class; class getters live on the prototype, so they are not own properties)
function objectFieldNames(objectType: string): string[] {
  const bare = objectType.replace(/^\*/, '');
  const parsed = parseStructFields(bare);
  if (parsed.length > 0) {
    // Go field names back to TS names (keywords carry a trailing '_')
    return parsed
      .map((entry) => entry[0])
      .map((f) => (f.endsWith('_') && goFieldName(f.slice(0, -1)) === f ? f.slice(0, -1) : f));
  }
  const base = bare.replace(/\[.*$/, '');
  const props = interfacePropertyTypes.get(base) ?? classPropertyTypes.get(base);
  const names: string[] = [];
  if (!props) return names;
  for (const f of props.keys()) {
    if (!classGetterMethods.has(`${base}.${f}`)) names.push(f);
  }
  return names;
}

function inferObjectCallType(expr: AstNode): string | undefined {
  const name = getObjectCallName(expr);
  if (!name) return undefined;
  if (OBJECT_INTEGRITY_LEVELS[name] || name === 'defineProperty') return inferExpressionType(expr.arguments?.[0]);
  if (OBJECT_INTEGRITY_CHECKS[name] || name === 'hasOwn') return 'bool';
  if (name === 'getOwnPropertyNames') return inferExpressionType({ ...expr, expression: { ...expr.expression, name: { kind: 'Identifier', text: 'keys' } } });
  return undefined;
}

function visitObjectCall(node: AstNode): string | undefined {
  const name = getObjectCallName(node);
  if (!name) return undefined;
  const args: AstNode[] = node.arguments ?? [];
  if (OBJECT_INTEGRITY_LEVELS[name]) {
    useHelper('objectIntegrity');
    return `TnSetIntegrity(${visit(args[0])}, ${OBJECT_INTEGRITY_LEVELS[name]})`;
  }
  if (OBJECT_INTEGRITY_CHECKS[name]) {
    useHelper('objectIntegrity');
    const check = `TnHasIntegrity(${visit(args[0])}, ${OBJECT_INTEGRITY_CHECKS[name]})`;
    return name === 'isExtensible' ? `!${check}` : check;
  }
  if (name === 'getOwnPropertyNames') {
    return visit({ ...node, expression: { ...node.expression, name: { kind: 'Identifier', text: 'keys' } } });
  }
  const objectType = inferExpressionType(args[0]) ?? '';
  const key = args[1];
  if (name === 'hasOwn') {
    if (isDynamicValue(args[0])) {
      useHelper('dynamic');
      return `TnHas(${visit(args[0])}, ${visit(key)})`;
    }
    if (objectType.startsWith('*TnMap[')) return `${visit(args[0])}.Has(${visit(key)})`;
    // a computed key on a typed object: a switch over its declared fields
    if (!isStringLiteral(key)) {
      const fieldNames = objectFieldNames(objectType);
      if (fieldNames.length === 0) {
        useHelper('dynamic');
        return `TnHas(${visit(args[0])}, ${visit(key)})`;
      }
      const cases = fieldNames.map((f) => {
        const fieldType = getObjectFieldGoType(objectType, f) ?? '';
        return `case ${toGoStringLiteral(f)}: return ${/^\*(float64|string|bool)$/.test(fieldType) ? `o.${goFieldName(f)} != nil` : 'true'}`;
      });
      return `func(o ${objectType}, k string) bool { switch k { ${cases.join('; ')} }; return false }(${visit(args[0])}, ${visit(key)})`;
    }
    const fieldType = getObjectFieldGoType(objectType, key.text);
    if (!fieldType) return 'false';
    // an absent optional primitive is nil
    return /^\*(float64|string|bool)$/.test(fieldType) ? `(${visit(args[0])}.${goFieldName(key.text)} != nil)` : 'true';
  }
  // Object.create / getPrototypeOf / getOwnPropertyDescriptors /
  // defineProperties: class values stand in for prototypes
  if (name === 'create' || name === 'getPrototypeOf' || name === 'getOwnPropertyDescriptors' || name === 'defineProperties') {
    useHelper('classes');
    useHelper('dynamic');
    useHelper('error');
    if (name === 'getPrototypeOf') return `TnClassOf(${visit(args[0])})`;
    if (name === 'getOwnPropertyDescriptors') return `TnOwnPropertyDescriptors(${visit(args[0])})`;
    if (name === 'defineProperties') return `TnDefineProperties(${visit(args[0])}, ${visit(args[1])})`;
    return `TnObjectCreate(${visit(args[0])}, ${args[1] ? visit(args[1]) : 'nil'})`;
  }
  if (name === 'defineProperty') {
    const descriptor = args[2];
    const valueProp = isObjectLiteralExpression(descriptor)
      ? (descriptor.properties ?? []).find((p: AstNode) => isPropertyAssignment(p) && isIdentifier(p.name) && p.name.text === 'value')
      : undefined;
    // a descriptor held in a variable (or with accessors only): set at run time
    if (!valueProp) {
      useHelper('classes');
      useHelper('dynamic');
      useHelper('error');
      return `TnDefineProperty(${visit(args[0])}, ${toGoValueOfType(key, 'string')}, ${isObjectLiteralExpression(descriptor) ? 'nil' : visit(descriptor)})`;
    }
    const target = visit(args[0]);
    // (a property key as JS converts it: a string)
    const keyString = jsStringOf(visit(key), inferExpressionType(key));
    if (isDynamicValue(args[0])) {
      useHelper('dynamic');
      return `TnSet(${target}, ${keyString}, ${visit(valueProp.initializer)})`;
    }
    if (objectType.startsWith('*TnMap[')) {
      return `${target}.Set(${toGoValueOfType(key, extractMapKeyType(objectType))}, ${toGoValueOfType(valueProp.initializer, extractMapValueType(objectType))})`;
    }
    if (!isStringLiteral(key)) {
      const fieldNames = objectFieldNames(objectType);
      if (fieldNames.length === 0) {
        useHelper('dynamic');
        return `TnSet(${target}, ${keyString}, ${visit(valueProp.initializer)})`;
      }
      useHelper('dynamic');
      const cases = fieldNames.map(
        (f) => `case ${toGoStringLiteral(f)}: o.${goFieldName(f)} = TnAs[${getObjectFieldGoType(objectType, f) ?? 'interface{}'}](v)`
      );
      return `func(o ${objectType}, k string, v interface{}) { switch k { ${cases.join('; ')} } }(${target}, ${keyString}, ${visit(valueProp.initializer)})`;
    }
    return `${target}.${goFieldName(key.text)} = ${toGoValueOfType(valueProp.initializer, getObjectFieldGoType(objectType, key.text))}`;
  }
  return undefined;
}

const PROMISE_COMBINATORS = new Set(['race', 'allSettled', 'any']);

function isPromiseStaticCall(node: AstNode, names: Set<string>): boolean {
  return (
    isCallExpression(node) &&
    isPropertyAccessExpression(node.expression) &&
    isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Promise' &&
    names.has(node.expression.name.text)
  );
}

// p.catch(cb) / p.finally(cb) on a promise channel
function isPromiseMethodCall(node: AstNode): boolean {
  return (
    isCallExpression(node) &&
    isPropertyAccessExpression(node.expression) &&
    ['catch', 'finally'].includes(node.expression.name.text) &&
    !!inferExpressionType(node.expression.expression)?.startsWith('chan ')
  );
}

// The value type of Promise.reject(…): from sibling promises in an array, else the
// enclosing function's Promise<T>
function getRejectedPromiseType(node: AstNode): string {
  const parent = node.parent;
  if (isArrayLiteralExpression(parent)) {
    for (const sibling of parent.elements ?? []) {
      if (sibling === node || isPromiseStaticCall(sibling, new Set(['reject']))) continue;
      const type = inferExpressionType(sibling);
      if (type?.startsWith('chan ')) return type.slice(5);
    }
  }
  return getPromiseChannelType(node);
}

function inferPromiseCallType(expr: AstNode): string | undefined {
  if (isPromiseStaticCall(expr, new Set(['reject']))) return `chan ${getRejectedPromiseType(expr)}`;
  if (isPromiseStaticCall(expr, PROMISE_COMBINATORS)) {
    const elem = promiseAllElementType(expr) ?? 'interface{}';
    return expr.expression.name.text === 'allSettled' ? `chan []*TnSettled[${elem}]` : `chan ${elem}`;
  }
  if (isPromiseMethodCall(expr)) return inferExpressionType(expr.expression.expression);
  return undefined;
}

function visitPromiseCall(node: AstNode): string | undefined {
  const args = node.arguments ?? [];
  if (isPromiseStaticCall(node, new Set(['reject']))) {
    useHelper('promise');
    return `TnPromiseReject[${getRejectedPromiseType(node)}](${args[0] ? visit(args[0]) : 'nil'})`;
  }
  if (isPromiseStaticCall(node, PROMISE_COMBINATORS)) {
    useHelper('promise');
    const name = node.expression.name.text;
    return `TnPromise${name[0].toUpperCase()}${name.slice(1)}(${args[0] ? visit(args[0]) : '[]chan interface{}{}'})`;
  }
  if (!isPromiseMethodCall(node)) return undefined;
  useHelper('promise');
  const receiver = visit(node.expression.expression);
  const callback = args[0];
  const cb = callback ? visit(callback) : 'func() {}';
  if (node.expression.name.text === 'finally') return `TnPromiseFinally(${receiver}, ${cb})`;
  // .catch(() => …) ignores the reason; .catch((e) => value) settles with the value
  const handler = callback && (callback.parameters ?? []).length === 0 ? `func(_ interface{}) { (${cb})() }` : cb;
  const returnsValue = callback && !/\)$/.test(inferExpressionType(callback) ?? ')');
  return `TnPromiseCatch${returnsValue ? 'Value' : ''}(${receiver}, ${handler})`;
}

// Element type of `await Promise.all([...])` from the first promise channel
function promiseAllElementType(expr: AstNode): string | undefined {
  const arrayNode = (expr.arguments ?? [])[0];
  const first = arrayNode?.elements?.[0];
  const chanType = first ? inferExpressionType(first) : undefined;
  return chanType?.startsWith('chan ') ? chanType.slice(5) : undefined;
}

const BUILTIN_FUNCTION_TYPES: Record<string, string> = {
  parseFloat: 'float64',
  parseInt: 'float64',
  Number: 'float64',
  String: 'string',
  setTimeout: '*TnTimeout',
  setInterval: '*TnInterval'
};

const STRING_METHOD_RETURN_TYPES: Record<string, string> = {
  trim: 'string',
  trimStart: 'string',
  normalize: 'string',
  trimEnd: 'string',
  toUpperCase: 'string',
  toLowerCase: 'string',
  slice: 'string',
  substring: 'string',
  replace: 'string',
  replaceAll: 'string',
  padStart: 'string',
  padEnd: 'string',
  repeat: 'string',
  charAt: 'string',
  concat: 'string',
  at: 'string',
  split: '[]string',
  match: '[]string',
  matchAll: '[][]string',
  includes: 'bool',
  startsWith: 'bool',
  endsWith: 'bool',
  indexOf: 'float64',
  lastIndexOf: 'float64',
  search: 'float64',
  charCodeAt: 'float64',
  codePointAt: 'float64',
  localeCompare: 'float64',
  substr: 'string',
  trimLeft: 'string',
  trimRight: 'string',
  toLocaleUpperCase: 'string',
  toLocaleLowerCase: 'string',
  isWellFormed: 'bool',
  toWellFormed: 'string'
};

// Return type of a Go func type string: `func(a T) R` → `R`
function goFuncReturnType(funcType: string): string | undefined {
  let depth = 0;
  for (let i = 4; i < funcType.length; i++) {
    const ch = funcType[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return funcType.slice(i + 1).trim() || undefined;
    }
  }
  return undefined;
}

const COMPARISON_OPERATORS = new Set<string>([
  'EqualsEqualsEqualsToken',
  'ExclamationEqualsEqualsToken',
  'EqualsEqualsToken',
  'ExclamationEqualsToken',
  'LessThanToken',
  'LessThanEqualsToken',
  'GreaterThanToken',
  'GreaterThanEqualsToken'
]);

function isLogicalOperator(token: AstNode): boolean {
  return token?.kind === 'AmpersandAmpersandToken' || token?.kind === 'BarBarToken';
}

// JS truthiness of an expression as a Go bool, by its Go type
function toGoCondition(expr: AstNode): string {
  if (isParenthesizedExpression(expr)) return `(${toGoCondition(expr.expression)})`;
  if (isPrefixUnaryExpression(expr) && expr.operator === 'ExclamationToken') {
    return `!${wrapCondition(toGoCondition(expr.operand))}`;
  }
  if (isBinaryExpression(expr) && isLogicalOperator(expr.operatorToken)) {
    const isAnd = expr.operatorToken.kind === 'AmpersandAmpersandToken';
    const right = withNarrowing(getNarrowedNames(expr.left, isAnd), () => toGoCondition(expr.right));
    return `${toGoCondition(expr.left)} ${isAnd ? '&&' : '||'} ${right}`;
  }
  // an array reference (*[]T): set unless nil (an array is always truthy)
  if (isIdentifier(expr) && referenceArrays.has(expr.text)) return `${getSafeName(expr.text)} != nil`;
  return truthinessCheck(visit(expr, { inline: true }), inferExpressionType(expr));
}

function truthinessCheck(code: string, goType: string | undefined): string {
  if (goType === 'bool' || goType === ':') return code;
  // an unknown (or named Go) type: JS truthiness at run time
  if (!goType || goType === 'interface{}') {
    useHelper('dynamic');
    return `TnTruthy(${code})`;
  }
  if (NULLABLE_PRIMITIVE_TYPES.includes(goType) && !/^[\w.()*]+$/.test(code)) {
    return `func() bool { __t := ${code}; return ${truthinessCheck('__t', goType)} }()`;
  }
  // structs (value types) are always truthy
  if (isStructGoType(goType)) return 'true';
  if (goType === 'string') return `${code} != ""`;
  // NaN is falsy too
  if (goType === 'float64') {
    useHelper('numTruthy');
    return `TnNumTruthy(${code})`;
  }
  if (goType === '*bool') return `(${code} != nil && *${code})`;
  if (goType === '*string') return `(${code} != nil && *${code} != "")`;
  if (goType === '*float64') return `(${code} != nil && *${code} != 0)`;
  if (
    goType.startsWith('*') ||
    goType.startsWith('[]') ||
    goType.startsWith('map[') ||
    goType.startsWith('func') ||
    goType.startsWith('chan ') ||
    goType === 'interface{}'
  ) {
    return `${code} != nil`;
  }
  // string enums (type E string): empty is falsy
  if (enumBaseTypes.get(goType) === 'string') return `${code} != ""`;
  useHelper('dynamic');
  return `TnTruthy(${code})`;
}

// Parenthesizes a condition unless it is already atomic
function wrapCondition(condition: string): string {
  return /^[\w.]+$/.test(condition) || /^\(.*\)$/.test(condition) ? condition : `(${condition})`;
}

// `a || b` with non-bool operands is a value (JS returns an operand), not a bool
function isLogicalValueExpression(expr: AstNode): boolean {
  const leftType = inferExpressionType(expr.left);
  const rightType = inferExpressionType(expr.right);
  // a && b is b (or a when falsy): a value when b isn't a boolean
  if (expr.operatorToken.kind === 'AmpersandAmpersandToken') return !!rightType && rightType !== 'bool' && rightType !== ':';
  if (expr.operatorToken.kind !== 'BarBarToken') return false;
  return !!leftType && leftType !== 'bool' && !!rightType && rightType !== 'bool';
}

function getLogicalValueType(expr: AstNode): string {
  const leftType = inferExpressionType(expr.left) ?? 'interface{}';
  const rightType = inferExpressionType(expr.right);
  // a && b: b's type when a can only be a falsy b-typed value or a boolean false
  if (expr.operatorToken.kind === 'AmpersandAmpersandToken') {
    return leftType === rightType ? leftType : 'interface{}';
  }
  if (rightType === 'nil') return makeNullableType(leftType);
  if (leftType.startsWith('*') && rightType === leftType.slice(1)) return rightType;
  // operands of unrelated types (`hour || 0` with a string hour): any
  if (rightType && rightType !== leftType && rightType !== `*${leftType}` && rightType.replace(/^\*\[\]/, '[]') !== leftType.replace(/^\*\[\]/, '[]')) {
    return 'interface{}';
  }
  return leftType;
}

// && / || : boolean form when any operand is non-bool (truthiness), value form for
// `a || fallback`; undefined keeps the plain Go operator (both operands bool/unknown)
function visitLogicalExpression(expr: AstNode): string | undefined {
  const leftType = inferExpressionType(expr.left);
  const rightType = inferExpressionType(expr.right);
  const isBoolOrUnknown = (t: string | undefined) => !t || t === 'bool' || t === ':';
  if (isBoolOrUnknown(leftType) && isBoolOrUnknown(rightType)) return undefined;
  if (!isLogicalValueExpression(expr)) return toGoCondition(expr);
  // a || b → func() T { if truthy(a) { return a }; return b }()
  // a && b → func() T { if !truthy(a) { return a }; return b }()
  const isAnd = expr.operatorToken.kind === 'AmpersandAmpersandToken';
  const resultType = getLogicalValueType(expr);
  const tmp = getTempName('or');
  if (isAnd) {
    const leftValue = resultType === 'interface{}' && NULLABLE_PRIMITIVE_TYPES.includes(leftType ?? '') ? `TnPtrValue(${tmp})` : resultType === leftType ? tmp : resultType === 'interface{}' ? tmp : `*new(${resultType})`;
    if (resultType === 'interface{}') useHelper('dynamic');
    return `func() ${resultType} { ${tmp} := ${visit(expr.left)}; if !(${truthinessCheck(tmp, leftType)}) { return ${leftValue} }; return ${toGoValueOfType(expr.right, resultType)} }()`;
  }
  let leftValue = tmp;
  if (leftType!.startsWith('*') && resultType === leftType!.slice(1)) leftValue = `*${tmp}`;
  else if (resultType === 'interface{}' && NULLABLE_PRIMITIVE_TYPES.includes(leftType!)) {
    useHelper('dynamic');
    leftValue = `TnPtrValue(${tmp})`;
  }
  else if (resultType === `*${leftType}`) leftValue = `&${tmp}`;
  return `func() ${resultType} { ${tmp} := ${visit(expr.left)}; if ${truthinessCheck(tmp, leftType)} { return ${leftValue} }; return ${toGoValueOfType(expr.right, resultType)} }()`;
}

// The Go type of a variable declared without a type or value (let x;):
// what its assignments store, nullable (it starts out undefined); interface{}
// when they disagree or there are none
function isRegExpTypeNode(typeNode: AstNode | undefined): boolean {
  return !!typeNode && isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName) && typeNode.typeName.text === 'RegExp' && !classNames.has('RegExp');
}

// Whether a variable's initializer or an assignment to it is a *TnRegex
function assignsStatefulRegex(declaration: AstNode): boolean {
  const name: string = declaration.name.text;
  if (declaration.initializer && inferExpressionType(declaration.initializer) === '*TnRegex') return true;
  let scope = declaration.parent;
  while (scope && !FUNCTION_LIKE_KINDS.has(scope.kind) && !isSourceFile(scope)) scope = scope.parent;
  return !!scope && containsNode(scope.body ?? scope, (n) =>
    isBinaryExpression(n) && n.operatorToken.kind === 'EqualsToken' && isIdentifier(n.left) && n.left.text === name && inferExpressionType(n.right) === '*TnRegex'
  );
}

function inferEvolvingLetType(declaration: AstNode): string {
  const name: string = declaration.name.text;
  let scope = declaration.parent;
  while (scope && !FUNCTION_LIKE_KINDS.has(scope.kind) && !isSourceFile(scope)) scope = scope.parent;
  const types = new Set<string>();
  const walk = (n: AstNode): void => {
    if (
      isBinaryExpression(n) &&
      n.operatorToken.kind === 'EqualsToken' &&
      isIdentifier(n.left) &&
      n.left.text === name &&
      !isNilLiteral(n.right)
    ) {
      const t = inferExpressionType(n.right);
      types.add(!t || t === 'nil' ? 'interface{}' : t);
    }
    for (const child of childNodes(n)) walk(child);
  };
  if (scope) walk(scope.body ?? scope);
  if (types.size !== 1) return 'interface{}';
  const only = [...types][0];
  return makeNullableType(only);
}

function makeNullableType(typeName: string): string {
  if (!typeName || typeName === 'interface{}' || typeName.startsWith('*'))
    return typeName || 'interface{}';
  if (['string', 'float64', 'bool'].includes(typeName)) return `*${typeName}`;
  if (isStructGoType(typeName)) return `*${typeName}`;
  return typeName;
}

// Go struct types (value types that cannot be nil): anonymous structs and
// property-only interfaces / object type aliases
// Object types that compile to Go structs: property-only interfaces and
// object type aliases (values of these types are *Name, like JS references)
// A declared interface with method signatures (a Go interface type)
function isMethodInterfaceName(name: string): boolean {
  const iface = declaredInterfaces.get(name);
  return !!iface && (iface.members ?? []).some((m: AstNode) => isMethodSignature(m)) && !interfaceHasProperties(iface);
}

// type P_obj struct { get_fn func() T; … } + func (o *P_obj) get() T { return o.get_fn() }
function emitInterfaceAdapter(node: AstNode): string {
  const name = visit(node.name);
  const typeParams = getTypeParameters(node.typeParameters);
  const typeParamNames = getTypeParameterNames(node.typeParameters);
  const fields: string[] = [];
  const methods: string[] = [];
  for (const member of node.members ?? []) {
    if (!isMethodSignature(member)) continue;
    const methodName = visit(member.name);
    const params = (member.parameters ?? []).map((p: AstNode) => `${visit(p.name)} ${getType(p.type!)}`);
    const args = (member.parameters ?? []).map((p: AstNode) => visit(p.name));
    const returnType = member.type ? getType(member.type) : '';
    const signature = `func(${params.join(', ')})${returnType ? ` ${returnType}` : ''}`;
    fields.push(`\t${methodName}_fn ${signature}`);
    methods.push(
      `func (o *${name}_obj${typeParamNames}) ${methodName}(${params.join(', ')})${returnType ? ` ${returnType}` : ''} { ${returnType ? 'return ' : ''}o.${methodName}_fn(${args.join(', ')}) }`
    );
  }
  return `\n\ntype ${name}_obj${typeParams} struct {\n${fields.join('\n')}\n}\n\n${methods.join('\n\n')}`;
}

// { get: () => 4, set(v) { … } } typed as a method interface → &P_obj{get_fn: …, set_fn: …}
function visitInterfaceLiteral(node: AstNode, interfaceName: string, typeArgs: string): string {
  const fields = (node.properties ?? []).map((p: AstNode) => {
    const fieldName = `${visit(p.name)}_fn`;
    if (isPropertyAssignment(p)) return `${fieldName}: ${visit(p.initializer)}`;
    if (isShorthandPropertyAssignment(p)) return `${fieldName}: ${visit(p.name)}`;
    if (isMethodDeclaration(p)) {
      const fn: AstNode = { kind: 'FunctionExpression', parameters: p.parameters, type: p.type, body: p.body, parent: p.parent };
      return `${fieldName}: ${visit(fn)}`;
    }
    return '';
  });
  return `&${interfaceName}_obj${typeArgs}${compositeBody(fields.filter((f: string) => f))}`;
}

function isObjectTypeName(name: string): boolean {
  const alias = declaredTypeAliases.get(name) ?? typeAliases.get(name);
  if (alias) return alias.kind === 'TypeLiteral';
  const iface = declaredInterfaces.get(name);
  if (iface) return interfaceHasProperties(iface);
  return interfacePropertyTypes.has(name);
}

// The keys a mapped type iterates: string literals of a union, or keyof an object type
function getMappedTypeKeys(constraint: AstNode | undefined): string[] | undefined {
  const keys = resolveTypeNode(constraint);
  if (!keys) return undefined;
  if (keys.kind === 'TypeOperator' && keys.operator === 'KeyOfKeyword') {
    const fields = getObjectTypeFields(keys.type);
    return fields.length > 0 ? fields.map((f) => f.split(' ')[0]) : undefined;
  }
  const types: AstNode[] = isUnionTypeNode(keys) ? (keys.types ?? []) : [keys];
  if (!types.every((t) => isLiteralTypeNode(t) && isStringLiteral(t.literal))) return undefined;
  return types.map((t) => goFieldName(t.literal.text));
}

function getMappedType(typeNode: AstNode): string {
  const valueType = typeNode.type ? getOptionalNodeType(typeNode.type, !!typeNode.questionToken) : 'interface{}';
  const keys = getMappedTypeKeys(typeNode.typeParameter?.constraint);
  if (keys) return `*struct{ ${keys.map((k) => `${k} ${valueType}`).join('; ')} }`;
  return 'interface{}';
}

const UTILITY_TYPES = new Set(['Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'NonNullable']);

// "name T" field declarations of an object type (type literal, alias or interface)
// An object type's fields (name → Go type): an interface's with inherited
// ones, a type literal's or object type alias's; methods are func fields
function objectTypeFieldMap(typeNode: AstNode): Map<string, string> {
  const out = new Map<string, string>();
  let members: AstNode[] = [];
  if (typeNode.kind === 'TypeLiteral') members = typeNode.members ?? [];
  else if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    const iface = declaredInterfaces.get(name);
    if (iface) {
      collectInterfaceProperties(iface, out);
      return out;
    }
    const alias = declaredTypeAliases.get(name) ?? typeAliases.get(name);
    if (alias?.kind === 'TypeLiteral') members = alias.members ?? [];
    else if (alias) return objectTypeFieldMap(alias);
  } else if (typeNode.kind === 'ParenthesizedType') return objectTypeFieldMap(typeNode.type);
  for (const m of members) {
    if (isPropertySignature(m) && isIdentifier(m.name)) out.set(m.name.text, getOptionalNodeType(m.type, !!m.questionToken));
    else if (isMethodSignature(m) && isIdentifier(m.name)) out.set(m.name.text, methodSignatureFieldType(m));
  }
  return out;
}

function getObjectTypeFields(typeNode: AstNode): string[] {
  let members: AstNode[] = [];
  const resolved = typeNode.kind === 'TypeLiteral' ? typeNode : undefined;
  if (resolved) members = resolved.members ?? [];
  else if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    const alias = declaredTypeAliases.get(name) ?? typeAliases.get(name);
    members = alias?.kind === 'TypeLiteral' ? (alias.members ?? []) : (declaredInterfaces.get(name)?.members ?? []);
  }
  return members
    .filter((m) => isPropertySignature(m) && isIdentifier(m.name))
    .map((m) => `${goFieldName(m.name.text)} ${getOptionalNodeType(m.type, !!m.questionToken)}`);
}

// Object.assign(target, …) result type, when it has one: a typed target's
// own type (it is mutated and returned); for a literal target, the type the
// context expects, else that of a sole typed source ({} copies it)
function objectAssignTargetType(call: AstNode): string | undefined {
  const args = call.arguments ?? [];
  if (args.length === 0 || args.some((a: AstNode) => isSpreadElement(a))) return undefined;
  const target = unwrapParentheses(args[0]);
  const assignable = (t: string | undefined): t is string =>
    !!t && (t.startsWith('*TnMap[') || (t.startsWith('*') && (isStructGoType(t.slice(1)) || classNames.has(t.slice(1)))));
  if (!isObjectLiteralExpression(target)) {
    const t = inferExpressionType(target);
    return assignable(t) ? t : 'interface{}';
  }
  const contextual = getContextualTypeNode(call);
  let expected = contextual ? getType(contextual) : undefined;
  const parent = call.parent;
  if (!expected && parent && isBinaryExpression(parent) && parent.operatorToken.kind === 'EqualsToken' && parent.right === call) {
    expected = inferExpressionType(parent.left);
  }
  if (assignable(expected)) return expected;
  if ((target.properties ?? []).length === 0 && args.length >= 2) {
    const t = inferExpressionType(args[1]);
    if (assignable(t) && (args.length === 2 || t.startsWith('*TnMap['))) return t;
  }
  // Object.assign({ defaults }, options): options' object type, when it has
  // every key of the defaults
  if (args.length === 2) {
    const t = inferExpressionType(args[1]);
    if (assignable(t) && !t.startsWith('*TnMap[')) {
      const fields = new Set(objectFieldNames(t));
      const keys = (target.properties ?? []).map((p: AstNode) => (p.name && (isIdentifier(p.name) || isStringLiteral(p.name)) ? p.name.text : undefined));
      if (keys.every((k: string | undefined) => !!k && fields.has(k))) return t;
    }
  }
  return undefined;
}

// A fresh empty value of a pointer Go type (&S{}, an empty Map)
function newGoValueOf(goType: string): string {
  const mapArgs = goType.startsWith('*TnMap[') ? splitMapTypeArgs(goType) : undefined;
  if (mapArgs) {
    useHelper('orderedMap');
    return `TnNewMap[${mapArgs[0]}, ${mapArgs[1]}]()`;
  }
  return `new(${goType.slice(1)})`;
}

// An object literal as a dynamic object (map[string]interface{})
function dynamicObjectLiteral(node: AstNode): string {
  const entries = (node.properties ?? []).map((p: AstNode) => {
    if (isShorthandPropertyAssignment(p)) return `${mapKeyText(p.name)}: ${visit(p.name)}`;
    if (isPropertyAssignment(p)) return `${propertyKeyString(p.name)}: ${visit(p.initializer)}`;
    reportError(p, 'Unsupported Object.assign source property');
    return '';
  });
  return `map[string]interface{}${compositeBody(entries)}`;
}

function isStructGoType(goType: string): boolean {
  return goType.startsWith('struct{') || interfacePropertyTypes.has(goType);
}

function visitConditionalExpression(node: AstNode): string {
  const resultType =
    inferExpectedTypeFromContext(node) || inferExpressionType(node) || 'interface{}';
  const whenTrue = withNarrowing(getNarrowedNames(node.condition, true), () =>
    toGoValueOfType(node.whenTrue, resultType)
  );
  const whenFalse = withNarrowing(getNarrowedNames(node.condition, false), () =>
    toGoValueOfType(node.whenFalse, resultType)
  );

  const countThen = typeof node.covThen === 'number' ? `${coverageCount(node.covThen)}; ` : '';
  const countElse = typeof node.covElse === 'number' ? `${coverageCount(node.covElse)}; ` : '';
  return `func() ${resultType} { if ${toGoCondition(node.condition)} { ${countThen}return ${whenTrue} }; ${countElse}return ${whenFalse} }()`;
}

// Type of `a ?? b`: NonNullable<A> | B — nullable only when b can be null too
function getNullishResultType(expr: AstNode): string | undefined {
  const leftType = inferExpressionType(expr.left);
  const rightType = inferExpressionType(expr.right);
  const leftValueType =
    leftType && NULLABLE_PRIMITIVE_TYPES.includes(leftType) ? leftType.slice(1) : leftType;
  if (!rightType || rightType === 'nil') return leftType;
  if (rightType === leftValueType) return rightType;
  if (leftValueType && rightType === `*${leftValueType}`) return rightType;
  if (leftValueType === 'interface{}') return 'interface{}';
  // (an operand of unknown type may hold any value: only a primitive
  // fallback types the result)
  if (!leftValueType) return ['string', 'float64', 'bool'].includes(rightType) ? rightType : 'interface{}';
  return leftValueType;
}

// Inside a ?? chain an operand keeps its own type; otherwise the context decides
function getNullishEmitType(node: AstNode): string | undefined {
  const parent = node.parent;
  const inChain = isBinaryExpression(parent) && parent.operatorToken.kind === 'QuestionQuestionToken';
  return (inChain ? undefined : inferExpectedTypeFromContext(node)) || getNullishResultType(node);
}

// a ?? b ?? c: operands are tried in order; map lookups (comma-ok) and nil-able
// values may be missing, anything else is always defined and ends the chain
function visitNullishCoalescingExpression(node: AstNode): string {
  const operands = flattenNullishChain(node);
  const resultType = getNullishEmitType(node) || 'interface{}';
  const steps: string[] = [];
  for (let i = 0; i < operands.length; i++) {
    const operand = operands[i];
    const isLast = i === operands.length - 1;
    const tmp = getTempName('nullish');
    const lookup = isLast ? undefined : getMapLookup(operand);
    const operandType = inferExpressionType(operand);
    const arrayType =
      !isLast && isElementAccessExpression(operand) ? inferExpressionType(operand.expression) : undefined;
    if (arrayType?.startsWith('[]')) {
      // arr[i] ?? x: out of range is undefined in JS
      const array = getTempName('arr');
      const index = getTempName('idx');
      steps.push(
        `if ${array}, ${index} := ${visit(operand.expression)}, int(${visit(operand.argumentExpression)}); ${index} >= 0 && ${index} < len(${array}) { return ${convertGoValue(`${array}[${index}]`, arrayType.slice(2), resultType)} }`
      );
    } else if (lookup) {
      const valueType = extractMapValueType(inferExpressionType(lookup.mapNode) ?? '');
      steps.push(
        `if ${tmp}, ok := ${lookup.map}.Lookup(${lookup.key}); ok { return ${convertGoValue(tmp, valueType, resultType)} }`
      );
    } else if (!isLast && operandType && isNilableGoType(operandType)) {
      // (an any value may hold a nil pointer: unset too)
      const present = operandType === 'interface{}' ? (useHelper('dynamic'), `!TnIsNil(${tmp})`) : `${tmp} != nil`;
      steps.push(
        `if ${tmp} := ${visit(operand)}; ${present} { return ${convertGoValue(tmp, operandType, resultType)} }`
      );
    } else if (!isLast && !operandType) {
      // an operand of unknown type: missing when nil (or a nil pointer)
      useHelper('dynamic');
      const value = resultType === 'interface{}' ? tmp : `TnAs[${resultType}](${tmp})`;
      steps.push(`if ${tmp} := interface{}(${visit(operand)}); !TnIsNil(${tmp}) { return ${value} }`);
    } else {
      steps.push(`return ${toGoValueOfType(operand, resultType)}`);
      break;
    }
  }
  return `func() ${resultType} { ${steps.join('; ')} }()`;
}

function flattenNullishChain(node: AstNode): AstNode[] {
  if (isBinaryExpression(node) && node.operatorToken.kind === 'QuestionQuestionToken') {
    return [...flattenNullishChain(node.left), node.right];
  }
  if (isParenthesizedExpression(node)) return flattenNullishChain(node.expression);
  return [node];
}

// Converts a Go variable between T and *T as the target type requires
function convertGoValue(variable: string, fromType: string, toType: string): string {
  if (toType === `*${fromType}`) return `&${variable}`;
  if (fromType === `*${toType}`) return `*${variable}`;
  // dynamic (any) values hold the concrete type at runtime (a primitive may
  // be held as a *T)
  if (fromType === 'interface{}' && toType !== 'interface{}') {
    useHelper('dynamic');
    return ['float64', 'string', 'bool'].includes(toType) ? `TnNarrow[${toType}](${variable})` : `TnAs[${toType}](${variable})`;
  }
  return variable;
}

// Map lookups (m.get(k) on a Map, m[k] on a Record): Go code of the map and key
function getMapLookup(expr: AstNode): { map: string; key: string; mapNode: AstNode } | undefined {
  if (
    isCallExpression(expr) &&
    isPropertyAccessExpression(expr.expression) &&
    expr.expression.name.text === 'get' &&
    inferExpressionType(expr.expression.expression)?.startsWith('*TnMap[')
  ) {
    const mapType = inferExpressionType(expr.expression.expression)!;
    return {
      map: visit(expr.expression.expression),
      key: toGoValueOfType(expr.arguments[0], extractMapKeyType(mapType)),
      mapNode: expr.expression.expression
    };
  }
  if (isElementAccessExpression(expr) && inferExpressionType(expr.expression)?.startsWith('*TnMap[')) {
    const mapType = inferExpressionType(expr.expression)!;
    return {
      map: visit(expr.expression),
      key: toGoValueOfType(expr.argumentExpression, extractMapKeyType(mapType)),
      mapNode: expr.expression
    };
  }
  return undefined;
}

function isNilableGoType(goType: string): boolean {
  if (
    goType.startsWith('*') ||
    goType.startsWith('[]') ||
    goType.startsWith('map[') ||
    goType.startsWith('func') ||
    goType.startsWith('chan ') ||
    goType === 'interface{}' ||
    goType === 'error'
  ) {
    return true;
  }
  // Go bridge named types over nil-able kinds (net.IP, io.Reader, http.Header)
  const kind = goMetaTypeInfo(goType)?.kind;
  return kind === 'interface' || kind === 'slice' || kind === 'map' || kind === 'func' || kind === 'chan';
}

function visitOptionalPropertyAccess(node: AstNode): string {
  const baseExpr = visit(node.expression);
  const baseType = inferExpressionType(node.expression);
  if (!baseType || !baseType.startsWith('*') || baseType.startsWith('*TnMap[')) {
    // Record/Map members are key lookups even through optional chains
    const objectType = resolveExpressionType(node.expression);
    if (objectType === 'Map' || objectType === 'Record') {
      return `${baseExpr}.Get(${toGoStringLiteral(node.name.text)})`;
    }
    // m?.index: NaN (compares like undefined) when there is no match
    if (node.name.text === 'index' && baseType === '[]string') {
      useHelper('regexMatch');
      return `TnMatchIndex(${baseExpr})`;
    }
    return getAcessString(baseExpr, visit(node.name), objectType);
  }

  const className = baseType.replace(/^\*/, '').replace(/\[.*\]$/, '');
  const propertyType =
    classPropertyTypes.get(className)?.get(node.name.text) ??
    interfacePropertyTypes.get(className)?.get(node.name.text) ??
    getStructFieldGoType(className, node.name.text) ??
    'interface{}';
  const nullableType = makeNullableType(propertyType);
  const tmp = getTempName('opt');
  // Class getters (also Node classes' accessors such as err.syscall) are calls
  const propertyAccess = classGetterMethods.has(`${className}.${node.name.text}`)
    ? `${tmp}.Get_${visit(node.name)}()`
    : `${tmp}.${visit(node.name)}`;

  if (nullableType.startsWith('*') && nullableType.slice(1) === propertyType) {
    const valueTemp = getTempName('optv');
    return `func() ${nullableType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { var __zero ${nullableType}; return __zero }; ${valueTemp} := ${propertyAccess}; return &${valueTemp} }()`;
  }

  return `func() ${nullableType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { var __zero ${nullableType}; return __zero }; return ${propertyAccess} }()`;
}

function visitOptionalElementAccess(node: AstNode): string {
  const baseExpr = visit(node.expression);
  const baseType = inferExpressionType(node.expression);
  if (!baseType || !baseType.startsWith('*') || baseType.startsWith('*TnMap[')) {
    const plainAccess: AstNode = { ...node, questionDotToken: undefined };
    return visit(plainAccess);
  }

  // obj?.[key] on a typed object (a struct, a class instance): by name
  if (!baseType.startsWith('*[]')) {
    useHelper('dynamic');
    const objTmp = getTempName('opte');
    return `func() interface{} { ${objTmp} := ${baseExpr}; if ${objTmp} == nil { return nil }; return TnIndex(${objTmp}, ${visit(node.argumentExpression)}) }()`;
  }
  const valueType = inferExpectedTypeFromContext(node) ?? 'interface{}';
  const nullableType = makeNullableType(valueType);
  const tmp = getTempName('opte');
  const elementExpr = `${tmp}[int(${visit(node.argumentExpression)})]`;

  if (nullableType.startsWith('*') && nullableType.slice(1) === valueType) {
    const valueTemp = getTempName('optev');
    return `func() ${nullableType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { var __zero ${nullableType}; return __zero }; ${valueTemp} := ${elementExpr}; return &${valueTemp} }()`;
  }

  return `func() ${nullableType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { var __zero ${nullableType}; return __zero }; return ${elementExpr} }()`;
}

// The call with its receiver replaced by a narrowed temporary of the receiver's type
function makeNarrowedReceiverCall(node: AstNode, tmp: string, baseType: string): AstNode {
  variableGoTypes.set(tmp, baseType);
  const receiver: AstNode = { kind: 'Identifier', text: tmp };
  const access: AstNode = { ...node.expression, questionDotToken: undefined, expression: receiver };
  const call: AstNode = { ...node, questionDotToken: undefined, expression: access, parent: node.parent };
  receiver.parent = access;
  access.parent = call;
  return call;
}

function visitNullablePrimitiveOptionalCall(node: AstNode, baseExpr: string, baseType: string): string {
  const tmp = getTempName('optc');
  const call = makeNarrowedReceiverCall(node, tmp, baseType);
  const resultType = makeNullableType(withNarrowingType([tmp], () => inferExpressionType(call)) ?? 'interface{}');
  const callCode = withNarrowing([tmp], () => visit(call));
  const value = resultType.startsWith('*') ? `func() ${resultType} { v := ${callCode}; return &v }()` : callCode;
  return `func() ${resultType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { return nil }; return ${value} }()`;
}

function withNarrowingType(names: string[], infer: () => string | undefined): string | undefined {
  const added = names.filter((n) => !narrowedVariables.has(n));
  for (const name of added) narrowedVariables.add(name);
  const type = infer();
  for (const name of added) narrowedVariables.delete(name);
  return type;
}

function visitOptionalCall(node: AstNode): string {
  // f?.(): call only when the function value is not nil
  if (hasQuestionDot(node)) {
    // Node functions that may be absent (process.send?.(…))
    const nodeKey = resolveNodeKey(node.expression);
    const guarded = nodeKey ? nodeRegistry.functions[`${nodeKey}?.`] : undefined;
    if (guarded) {
      const callArgs: AstNode[] = node.arguments ?? [];
      const guardedCall: NodeCall = { args: callArgs.map((a: AstNode) => visit(a)), nodes: callArgs, types: callArgs.map((a: AstNode) => inferExpressionType(a) ?? ''), recv: '' };
      return guarded(guardedCall);
    }
    const fnType = inferExpressionType(node.expression) ?? '';
    const returnType = fnType.startsWith('func(') ? goFuncReturnType(fnType) : undefined;
    const fn = getTempName('fn');
    const args = (node.arguments ?? []).map((a: AstNode) => visit(a)).join(', ');
    // a function value held as any: called with its arguments converted
    if (!fnType.startsWith('func(')) {
      useHelper('dynamic');
      useHelper('error');
      const callee = node.expression;
      const fnValue =
        isPropertyAccessExpression(callee) && hasDynamicProperties(callee.expression) && (!hasQuestionDot(callee) || isDynamicValue(callee.expression))
          ? `TnGet(${visit(callee.expression)}, ${toGoStringLiteral(callee.name.text)})`
          : visit(callee);
      return `func() interface{} { ${fn} := ${fnValue}; if TnIsNil(${fn}) { return nil }; return TnCallValue(${[fn, args].filter((a) => a).join(', ')}) }()`;
    }
    if (!returnType) {
      if (isDiscardedValue(node)) return `func() { if ${fn} := ${visit(node.expression)}; ${fn} != nil { ${fn}(${args}) } }()`;
      return `func() interface{} { if ${fn} := ${visit(node.expression)}; ${fn} != nil { ${fn}(${args}) }; return nil }()`;
    }
    const resultType = makeNullableType(returnType);
    const value = resultType === returnType ? `${fn}(${args})` : `func() ${resultType} { v := ${fn}(${args}); return &v }()`;
    return `func() ${resultType} { ${fn} := ${visit(node.expression)}; if ${fn} == nil { return nil }; return ${value} }()`;
  }
  if (!isPropertyAccessExpression(node.expression)) {
    return `${visit(node.expression)}(${(node.arguments ?? []).map((a) => visit(a)).join(', ')})`;
  }

  const baseNode = node.expression.expression;
  const methodName = node.expression.name.text;
  const baseExpr = visit(baseNode);
  const baseType = inferExpressionType(baseNode);
  const args = (node.arguments ?? []).map((a) => visit(a)).join(', ');

  if (baseType && NULLABLE_PRIMITIVE_TYPES.includes(baseType)) {
    return visitNullablePrimitiveOptionalCall(node, baseExpr, baseType);
  }
  if (!baseType || !baseType.startsWith('*') || baseType.startsWith('*TnMap[')) {
    const plainAccess: AstNode = { ...node.expression, questionDotToken: undefined };
    const plainCall: AstNode = { ...node, questionDotToken: undefined, expression: plainAccess };
    plainAccess.parent = plainCall;
    return visit(plainCall);
  }

  // a?.m(…) whose value is unused (a statement, or a void method as an arrow's
  // body): call only when a is set, through the usual method dispatch
  const parentKind = node.parent?.kind;
  if (parentKind === 'ExpressionStatement' || (parentKind === 'ArrowFunction' && node.parent.body === node)) {
    const guard = getTempName('optc');
    const call = makeNarrowedReceiverCall(node, guard, baseType);
    const callType = withNarrowingType([guard], () => inferExpressionType(call));
    if (parentKind === 'ExpressionStatement' || callType === '') {
      const callCode = withNarrowing([guard], () => visit(call));
      return `func() { ${guard} := ${baseExpr}; if ${guard} != nil { ${callCode} } }()`;
    }
  }
  const className = baseType.replace(/^\*/, '').replace(/\[.*\]$/, '');
  const returnType = classMethodReturnTypes.get(className)?.get(methodName) ?? 'interface{}';
  const nullableType = makeNullableType(returnType);
  const tmp = getTempName('optc');
  const callExpr = `${tmp}.${methodName}(${args})`;

  if (nullableType.startsWith('*') && nullableType.slice(1) === returnType) {
    const valueTemp = getTempName('optcv');
    return `func() ${nullableType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { var __zero ${nullableType}; return __zero }; ${valueTemp} := ${callExpr}; return &${valueTemp} }()`;
  }

  return `func() ${nullableType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { var __zero ${nullableType}; return __zero }; return ${callExpr} }()`;
}

function isArrayLikeGoType(goType: string | undefined): boolean {
  return !!goType && goType.startsWith('[]');
}

function getArrayElementTypeFromGoType(goType: string): string {
  if (!goType.startsWith('[]')) return 'interface{}';
  const elementType = goType.slice(2);
  return elementType || 'interface{}';
}

function inferArrayCallbackReturnType(
  callback: AstNode,
  elementType: string,
  fallbackType: string
): string {
  if (isArrowFunction(callback) || isFunctionExpression(callback)) {
    if (callback.type) {
      const explicitType = getType(callback.type);
      return explicitType || fallbackType;
    }
    // The element parameter has the element type while the body is inferred
    const param = (callback.parameters ?? [])[0];
    const paramName = param && isIdentifier(param.name) && !param.type ? param.name.text : '';
    const hadParam = paramName ? variableGoTypes.has(paramName) : false;
    const savedParam = paramName ? variableGoTypes.get(paramName) : undefined;
    if (paramName) variableGoTypes.set(paramName, elementType);
    const inferred = isBlock(callback.body) ? inferFunctionBodyReturnType(callback) : inferExpressionType(callback.body);
    if (paramName && hadParam && savedParam !== undefined) variableGoTypes.set(paramName, savedParam);
    else if (paramName) variableGoTypes.delete(paramName);
    return inferred ?? fallbackType;
  }

  if (isIdentifier(callback)) {
    const knownType = variableGoTypes.get(callback.text);
    if (knownType) return knownType;
    // .map(String) / .map(Number) / .filter(Boolean)
    const builtinResult = ({ String: 'string', Number: 'float64', Boolean: 'bool' } as Record<string, string>)[callback.text];
    if (builtinResult && Object.hasOwn({ String: 1, Number: 1, Boolean: 1 }, callback.text)) return builtinResult;
  }

  return fallbackType;
}

type ArrayCallbackInfo = {
  fnExpr: string;
  paramCount: number;
  returnType: string;
};

function buildArrayCallbackInfo(
  callback: AstNode,
  elementType: string,
  forcedReturnType?: string,
  paramTypes: string[] = [elementType, 'float64', `[]${elementType}`]
): ArrayCallbackInfo {
  if (isArrowFunction(callback) || isFunctionExpression(callback)) {
    const paramCount = (callback.parameters ?? []).length;
    // ([k, v]) => … / ({ a }) => …: a temporary parameter unpacked first
    const unpack: string[] = [];
    (callback.parameters ?? []).slice(0, paramTypes.length).forEach((p: AstNode, index: number) => {
      if (isIdentifier(p.name)) registerLocalVariable(p.name.text, paramTypes[index]);
      else unpack.push(destructureCallbackParam(p.name, `__dp${index}`, paramTypes[index]));
    });
    const callbackReturnType =
      forcedReturnType ?? inferArrayCallbackReturnType(callback, elementType, elementType);

    const params = (callback.parameters ?? [])
      .slice(0, paramTypes.length)
      .map((p: AstNode, index: number) => `${isIdentifier(p.name) ? visit(p.name) : `__dp${index}`} ${paramTypes[index]}`);

    const prefix = unpack.join('');
    let body = isBlock(callback.body)
      ? visit(callback.body, { inline: true })
      : forcedReturnType === 'bool'
        ? `{ return ${toGoCondition(callback.body)}; }`
        : forcedReturnType === ''
          ? `{ ${visit(unwrapParentheses(callback.body))}; }`
          : `{ return ${visit(callback.body)}; }`;
    if (prefix) body = `{ ${prefix}${body.slice(body.indexOf('{') + 1)}`;
    if (!isBlock(callback.body)) body = `{ ${coverageEnter(callback)}${body.slice(body.indexOf('{') + 1)}`;

    return {
      fnExpr: `func(${params.join(', ')}) ${callbackReturnType} ${body}`,
      paramCount,
      returnType: callbackReturnType
    };
  }

  // a predicate (some / filter / find …) whose result isn't a boolean: its truthiness
  const callbackType = functionValueGoType(callback) ?? '';
  const callbackResult = callbackType.startsWith('func(') ? goFuncReturnType(callbackType) : undefined;
  if (forcedReturnType === 'bool' && callbackType.startsWith('func(') && callbackResult !== 'bool' && !(isIdentifier(callback) && callback.text === 'Boolean')) {
    const arity = Math.min(goFuncParamTypes(callbackType).length, paramTypes.length);
    const names = ['__v', '__i', '__a'].slice(0, arity);
    const params = names.map((n, i) => `${n} ${paramTypes[i]}`).join(', ');
    const call = `(${visit(callback)})(${names.map((n, i) => convertBetweenGoTypes(n, paramTypes[i], goFuncParamTypes(callbackType)[i])).join(', ')})`;
    return { fnExpr: `func(${params}) bool { return ${truthinessCheck(call, callbackResult)} }`, paramCount: arity, returnType: 'bool' };
  }
  // (String / Number / Boolean as callbacks return their primitive)
  const builtinResult = isIdentifier(callback) && !variableGoTypes.has(callback.text)
    ? ({ String: 'string', Number: 'float64', Boolean: 'bool' } as Record<string, string>)[callback.text]
    : undefined;
  return {
    fnExpr: visit(callback),
    paramCount: 1,
    returnType: forcedReturnType ?? (builtinResult && Object.hasOwn({ String: 1, Number: 1, Boolean: 1 }, callback.text) ? builtinResult : 'interface{}')
  };
}

// Unpacks a destructured callback parameter (source of Go type goType) into
// locals: tuples / arrays by index, objects by field, record or dynamic key
function destructureCallbackParam(pattern: AstNode, source: string, goType: string): string {
  let code = '';
  (pattern.elements ?? []).forEach((el: AstNode, index: number) => {
    if (isOmittedExpression(el) || !el.name || !isIdentifier(el.name)) return;
    let value: string;
    let valueType = 'interface{}';
    if (isArrayBindingPattern(pattern)) {
      const arrayType = goType.startsWith('*[]') ? goType.slice(1) : goType;
      if (arrayType.startsWith('[]')) {
        const ref = goType.startsWith('*[]') ? `(*${source})` : source;
        value = `${ref}[${index}]`;
        valueType = arrayType.slice(2);
      } else {
        useHelper('dynamic');
        value = `TnIndex(${source}, float64(${index}))`;
      }
    } else {
      const field: string = (el.propertyName ?? el.name).text;
      if (goType.startsWith('*TnMap[string, ')) {
        value = `${source}.Get(${JSON.stringify(field)})`;
        valueType = extractMapValueType(goType);
      } else if (goType === 'interface{}' || goType === '') {
        useHelper('dynamic');
        value = `TnGetRef(${source}, ${JSON.stringify(field)})`;
      } else {
        value = `${source}.${goFieldName(field)}`;
        valueType =
          interfacePropertyTypes.get(goType)?.get(field) ?? getStructFieldGoType(goType, field) ?? 'interface{}';
      }
    }
    registerLocalVariable(el.name.text, valueType);
    code += `${visit(el.name)} := ${value}; _ = ${visit(el.name)}; `;
  });
  return code;
}

function buildArrayCallbackInvocation(
  callbackInfo: ArrayCallbackInfo,
  itemVar: string,
  indexVar: string,
  arrayVar: string
): string {
  const args: string[] = [];
  if (callbackInfo.paramCount > 0) args.push(itemVar);
  if (callbackInfo.paramCount > 1) args.push(`float64(${indexVar})`);
  if (callbackInfo.paramCount > 2) args.push(arrayVar);
  const call = `(${callbackInfo.fnExpr})(${args.join(', ')})`;
  if (callbackInfo.paramCount > 0) return call;
  const returnType = callbackInfo.returnType ? ` ${callbackInfo.returnType}` : '';
  const ret = callbackInfo.returnType ? 'return ' : '';
  return `func()${returnType} { _ = ${itemVar}; ${ret}${call} }()`;
}

// Like buildArrayCallbackInvocation but for reduce: (acc, item, idx, arr)
function buildArrayCallbackInvocationReduce(
  callbackInfo: ArrayCallbackInfo,
  accVar: string,
  itemVar: string,
  indexVar: string,
  arrayVar: string
): string {
  const args: string[] = [];
  if (callbackInfo.paramCount > 0) args.push(accVar);
  if (callbackInfo.paramCount > 1) args.push(itemVar);
  if (callbackInfo.paramCount > 2) args.push(`float64(${indexVar})`);
  if (callbackInfo.paramCount > 3) args.push(arrayVar);
  return `(${callbackInfo.fnExpr})(${args.join(', ')})`;
}

function visitArrayHigherOrderCall(node: AstNode): string | undefined {
  // Set by visitTypedArrayCall for this call only (callbacks may hold other calls)
  const typedReceiver = typedArrayReceiverExpr;
  typedArrayReceiverExpr = '';
  if (!isPropertyAccessExpression(node.expression)) return undefined;

  const methodName = node.expression.name.text;
  if (!['map', 'filter', 'some', 'find', 'findIndex', 'findLast', 'findLastIndex', 'every', 'forEach', 'reduce', 'reduceRight', 'join', 'entries', 'flatMap'].includes(methodName)) {
    return undefined;
  }

  const arrayExprNode = node.expression.expression;
  // generators (channels) take the iterator helpers instead
  if (!typedReceiver && inferExpressionType(arrayExprNode)?.startsWith('chan ')) return undefined;
  // a class's own map() / filter() / … method
  const receiverClass = classNameOfGoType(inferExpressionType(arrayExprNode) ?? '');
  if (!typedReceiver && receiverClass && findClassMethod(receiverClass, methodName)) return undefined;
  const arrayExpr = typedReceiver ? typedReceiver : visit(arrayExprNode);
  const ownerType = typedReceiver ? '[]float64' : inferExpressionType(arrayExprNode);
  const elementType = isArrayLikeGoType(ownerType)
    ? getArrayElementTypeFromGoType(ownerType!)
    : 'interface{}';

  if (methodName === 'forEach' && ownerType?.startsWith('*TnMap[')) {
    const callback = (node.arguments ?? [])[0];
    if (!callback) return undefined;
    const keyType = extractMapKeyType(ownerType);
    const valueType = extractMapValueType(ownerType);
    const info = buildArrayCallbackInfo(callback, valueType, '', [
      valueType === 'struct{}' ? keyType : valueType,
      keyType
    ]);
    const key = getTempName('key');
    const value = getTempName('value');
    const args = [valueType === 'struct{}' ? key : value, key].slice(0, info.paramCount).join(', ');
    return `func() { for ${key}, ${value} := range ${arrayExpr}.All() { _, _ = ${key}, ${value}; (${info.fnExpr})(${args}) } }()`;
  }

  if (methodName === 'join') {
    // Only intercept array.join — if owner type is unknown/not array, fall through to callHandlers
    if (!isArrayLikeGoType(ownerType)) return undefined;
    importedPackages.add('strings');
    // join() with no argument defaults to "," in JS
    const separator = (node.arguments ?? [])[0] ? visit((node.arguments ?? [])[0]) : '","';
    const arrVar = getTempName('arrjoin');
    const partsVar = getTempName('parts');
    // (each element as String() gives it; null and undefined as '')
    if (elementType === 'string') return `strings.Join(${arrayExpr}, ${separator})`;
    useHelper('dynamic');
    return `func() string { ${arrVar} := ${arrayExpr}; ${partsVar} := make([]string, len(${arrVar})); for i, v := range ${arrVar} { if !TnIsNil(v) { ${partsVar}[i] = TnJSString(v) } }; return strings.Join(${partsVar}, ${separator}) }()`;
  }

  if (methodName === 'entries') {
    // [[index, value], ...] pairs, destructured by for...of
    if (!isArrayLikeGoType(ownerType)) return undefined;
    return `func() [][]interface{} { __out := [][]interface{}{}; for __i, __v := range ${arrayExpr} { __out = append(__out, []interface{}{float64(__i), __v}) }; return __out }()`;
  }

  const callback = (node.arguments ?? [])[0];
  if (!callback) {
    return undefined;
  }

  const arrVar = getTempName('arrhof');
  const idxVar = getTempName('i');
  const itemVar = getTempName('item');

  if (methodName === 'flatMap') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType);
    const innerType = callbackInfo.returnType.startsWith('[]')
      ? callbackInfo.returnType.slice(2)
      : elementType;
    const resultVar = getTempName('flatres');
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
    return `func() []${innerType} { ${arrVar} := ${arrayExpr}; ${resultVar} := []${innerType}{}; for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { ${resultVar} = append(${resultVar}, (${callbackCall})...) }; return ${resultVar} }()`;
  }

  if (methodName === 'map') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType);
    const mappedType = callbackInfo.returnType || 'interface{}';
    const resultVar = getTempName('mapres');
    const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    return `func() []${mappedType} { ${arrVar} := ${arrayExpr}; ${resultVar} := make([]${mappedType}, 0, len(${arrVar})); for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { ${resultVar} = append(${resultVar}, ${callbackCall}) }; return ${resultVar} }()`;
  }

  if (methodName === 'filter') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, 'bool');
    const resultVar = getTempName('filterres');
    const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    return `func() []${elementType} { ${arrVar} := ${arrayExpr}; ${resultVar} := make([]${elementType}, 0, len(${arrVar})); for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { if ${callbackCall} { ${resultVar} = append(${resultVar}, ${itemVar}) } }; return ${resultVar} }()`;
  }

  if (methodName === 'some') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, 'bool');
    const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    return `func() bool { ${arrVar} := ${arrayExpr}; for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { if ${callbackCall} { return true } }; return false }()`;
  }

  if (methodName === 'findIndex') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, 'bool');
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    return `func() float64 { ${arrVar} := ${arrayExpr}; for ${idxVar}, ${itemVar} := range ${arrVar} { if ${callbackCall} { return float64(${idxVar}) } }; return float64(-1) }()`;
  }

  if (methodName === 'findLastIndex' || methodName === 'findLast') {
    // Search from the end
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, 'bool');
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    const retType = methodName === 'findLast' ? elementType : 'float64';
    const hit = methodName === 'findLast' ? itemVar : `float64(${idxVar})`;
    return `func() ${retType} { ${arrVar} := ${arrayExpr}; for ${idxVar} := len(${arrVar}) - 1; ${idxVar} >= 0; ${idxVar}-- { ${itemVar} := ${arrVar}[${idxVar}]; if ${callbackCall} { return ${hit} } }; ${methodName === 'findLast' ? `var __zero ${elementType}; return __zero` : 'return float64(-1)'} }()`;
  }

  if (methodName === 'every') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, 'bool');
    const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    return `func() bool { ${arrVar} := ${arrayExpr}; for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { if !(${callbackCall}) { return false } }; return true }()`;
  }

  if (methodName === 'forEach') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, '');
    const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
    const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
    return `func() { ${arrVar} := ${arrayExpr}; for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { ${callbackCall} } }()`;
  }

  if (methodName === 'reduceRight') {
    importedPackages.add('slices');
    const reversed: AstNode = { kind: 'Identifier', text: `func() []${elementType} { __s := slices.Clone(${arrayExpr}); slices.Reverse(__s); return __s }()` };
    variableGoTypes.set(reversed.text, ownerType ?? '[]interface{}');
    const access: AstNode = { ...node.expression, name: { kind: 'Identifier', text: 'reduce' }, expression: reversed };
    const call: AstNode = { ...node, expression: access };
    reversed.parent = access;
    access.parent = call;
    access.name.parent = access;
    return visitArrayHigherOrderCall(call);
  }
  if (methodName === 'reduce') {
    const reduceCallback = (node.arguments ?? [])[0];
    if (!reduceCallback) return undefined;
    const initialValue = (node.arguments ?? [])[1] ? visit((node.arguments ?? [])[1] as AstNode) : undefined;
    const accType = initialValue
      ? (inferExpressionType((node.arguments ?? [])[1] as AstNode) ?? elementType)
      : elementType;
    const accVar = getTempName('acc');
    // Build a callback that takes (acc, item, idx, arr) — param count determines what gets passed
    const cbInfo = buildArrayCallbackInfo(reduceCallback, elementType, accType, [
      accType,
      elementType,
      'float64',
      `[]${elementType}`
    ]);
    const cbCall = buildArrayCallbackInvocationReduce(cbInfo, accVar, itemVar, idxVar, arrVar);
    // Only include the index loop var if the callback uses it (paramCount > 2)
    const reduceIdxVar = cbInfo.paramCount > 2 ? idxVar : '_';
    if (initialValue !== undefined) {
      return `func() ${accType} { ${arrVar} := ${arrayExpr}; ${accVar} := ${initialValue}; for ${reduceIdxVar}, ${itemVar} := range ${arrVar} { ${accVar} = ${cbCall} }; return ${accVar} }()`;
    }
    return `func() ${elementType} { ${arrVar} := ${arrayExpr}; ${accVar} := ${arrVar}[0]; for ${reduceIdxVar}, ${itemVar} := range ${arrVar}[1:] { ${accVar} = ${cbCall} }; return ${accVar} }()`;
  }

  // find
  const callbackInfo = buildArrayCallbackInfo(callback, elementType, 'bool');
  const rangeIndexVar = callbackInfo.paramCount > 1 ? idxVar : '_';
  const callbackCall = buildArrayCallbackInvocation(callbackInfo, itemVar, idxVar, arrVar);
  return `func() ${elementType} { ${arrVar} := ${arrayExpr}; for ${rangeIndexVar}, ${itemVar} := range ${arrVar} { if ${callbackCall} { return ${itemVar} } }; var __zero ${elementType}; return __zero }()`;
}

function getAliasType(name: string, seen = new Set<string>()): AstNode | undefined {
  // (declaredTypeAliases: every linked module's, before their files are visited)
  const aliasType = typeAliases.get(name) ?? declaredTypeAliases.get(name);
  if (!aliasType) return undefined;

  if (seen.has(name)) return undefined;
  if (isTypeReferenceNode(aliasType) && isIdentifier(aliasType.typeName)) {
    const nestedName = aliasType.typeName.text;
    if (typeAliases.has(nestedName) || declaredTypeAliases.has(nestedName)) {
      seen.add(name);
      return getAliasType(nestedName, seen) ?? aliasType;
    }
  }

  return aliasType;
}

function getOptionalNodeType(typeNode: AstNode | undefined, isOptional: boolean): string {
  // a `never` (or void) field only ever holds undefined
  const baseType = (typeNode ? getType(typeNode) : 'interface{}') || 'interface{}';
  if (!isOptional) return baseType;
  if (baseType === 'interface{}' || baseType.startsWith('*')) return baseType;
  if (['string', 'float64', 'bool'].includes(baseType)) return `*${baseType}`;
  return baseType;
}

function getEnumMemberName(name: AstNode): string {
  if (isIdentifier(name)) {
    return getSafeName(name.text);
  }

  if (isStringLiteral(name) || isNumericLiteral(name)) {
    const sanitized = name.text.replace(/[^a-zA-Z0-9_]/g, '_');
    return sanitized.length > 0 ? sanitized : 'Member';
  }

  return 'Member';
}

// string enums, numeric enums, or interface{} for heterogeneous ones (each member keeps its own type)
function getEnumBaseType(node: AstNode): 'string' | 'float64' | 'interface{}' {
  let hasString = false;
  let hasNumber = false;
  for (const member of (node.members ?? [])) {
    const initializer = member.initializer;
    if (initializer && (isStringLiteral(initializer) || isNoSubstitutionTemplateLiteral(initializer))) {
      hasString = true;
    } else {
      hasNumber = true;
    }
    enumMemberGoTypes.set(
      `${node.name.text}.${getEnumMemberName(member.name)}`,
      initializer && (isStringLiteral(initializer) || isNoSubstitutionTemplateLiteral(initializer)) ? 'string' : 'float64'
    );
  }
  if (hasString && hasNumber) return 'interface{}';
  return hasString ? 'string' : 'float64';
}

function readNumericEnumInitializer(initializer: AstNode): number | undefined {
  if (isNumericLiteral(initializer)) {
    return Number(initializer.text);
  }

  if (
    isPrefixUnaryExpression(initializer) &&
    initializer.operator === 'MinusToken' &&
    isNumericLiteral(initializer.operand)
  ) {
    return -Number(initializer.operand.text);
  }

  return undefined;
}

function enumHasComputedMember(node: AstNode): boolean {
  return (node.members ?? []).some(
    (m: AstNode) =>
      m.initializer &&
      !isStringLiteral(m.initializer) &&
      !isNoSubstitutionTemplateLiteral(m.initializer) &&
      readNumericEnumInitializer(m.initializer) === undefined
  );
}

function visitEnumDeclaration(node: AstNode, inPlace = false): string {
  const enumName = getSafeName(node.name.text);
  const baseType = enumBaseTypes.get(node.name.text) ?? getEnumBaseType(node);

  let nextNumericValue = 0;
  let canAutoIncrement = true;
  let hasComputedMember = false;
  const members: string[] = [];

  for (const member of (node.members ?? [])) {
    const memberName = getEnumMemberName(member.name);
    const symbolName = `${enumName}_${memberName}`;

    let valueExpr: string;
    if (member.initializer) {
      if (baseType === 'interface{}' && (isStringLiteral(member.initializer) || isNoSubstitutionTemplateLiteral(member.initializer))) {
        valueExpr = visit(member.initializer);
      } else if (baseType !== 'string') {
        const numericValue = readNumericEnumInitializer(member.initializer);
        if (numericValue !== undefined) {
          valueExpr = `${numericValue}`;
          nextNumericValue = numericValue + 1;
          canAutoIncrement = true;
        } else {
          valueExpr = `float64(${visit(member.initializer)})`;
          canAutoIncrement = false;
          hasComputedMember = true;
        }
      } else {
        valueExpr = visit(member.initializer);
      }
    } else if (baseType !== 'string') {
      const currentValue = canAutoIncrement ? nextNumericValue : 0;
      valueExpr = `${currentValue}`;
      nextNumericValue = currentValue + 1;
    } else {
      valueExpr = toGoStringLiteral(memberName);
    }

    members.push(`\t${symbolName} ${enumName} = ${enumName}(${valueExpr})`);
  }

  // Assigned in place: package variables declared, values set in source order
  if (inPlace) {
    return members
      .map((m) => {
        const name = m.slice(m.indexOf('\t') + 1, m.indexOf(' '));
        const raw = m.slice(m.indexOf(`= ${enumName}(`) + enumName.length + 3, -1);
        const value = /^-?[0-9.]+$/.test(raw) ? `float64(${raw})` : raw;
        const memberType =
          baseType === 'interface{}'
            ? (enumMemberGoTypes.get(`${node.name.text}.${name.slice(enumName.length + 1)}`) ?? 'interface{}')
            : baseType === 'float64'
              ? 'float64'
              : enumName;
        mainPackageVariables.push(`var ${name} ${memberType}`);
        return `${name} = ${memberType === enumName ? `${enumName}(${raw})` : value};\n\t`;
      })
      .join('');
  }
  // Heterogeneous enums: plain variables of each member's own type
  if (baseType === 'interface{}') {
    return `var (\n${members
      .map((m) => {
        const name = m.slice(m.indexOf('\t') + 1, m.indexOf(' '));
        const value = m.slice(m.indexOf(`= ${enumName}(`) + enumName.length + 3, -1);
        return `\t${name} = ${/^-?[0-9.]+$/.test(value) ? `float64(${value})` : value}`;
      })
      .join('\n')}\n)`;
  }
  // Numeric enums are plain float64 constants so they compare against numbers
  // (variables when a member is computed); string enums keep a named type
  if (baseType === 'float64') {
    // Reverse mapping (Color[0] → "Red"): the last member with the value wins, as in TS
    const reverse = members
      .map((m, i) => {
        const name = m.slice(m.indexOf('\t') + 1, m.indexOf(' '));
        const tsName = node.members[i].name.text;
        return `if v == ${name} { return ${toGoStringLiteral(tsName)} }`;
      })
      .reverse()
      .join('; ');
    return `${hasComputedMember ? 'var' : 'const'} (\n${members
      .map((m) => {
        const name = m.slice(m.indexOf('\t') + 1, m.indexOf(' '));
        const value = m.slice(m.lastIndexOf('=') + 1).trim();
        // Strip the enum conversion wrapper: Dir(0) → 0
        const plain = value.startsWith(`${enumName}(`) && value.endsWith(')')
          ? value.slice(enumName.length + 1, -1)
          : value;
        return `\t${name} float64 = ${plain}`;
      })
      .join('\n')}\n)\n\nfunc ${enumName}__name(v float64) string { ${reverse}; return "" }`;
  }

  return `type ${enumName} ${baseType}\n\nvar (\n${members.join('\n')}\n)`;
}

function getType(typeNode: AstNode, getArrayType = false): string {
  if (!typeNode) return ':';
  // a type the transpiler inferred (see inferEvolvingLetType)
  if (typeNode.kind === 'TnGoType') {
    return getArrayType && typeNode.goType.startsWith('[]') ? typeNode.goType.slice(2) : typeNode.goType;
  }
  if (typeNode.kind === 'ParenthesizedType') return getType(typeNode.type, getArrayType);
  // `this` in a class: the class (subclasses get their own, see the class emitter)
  // (a class with subclasses: `this` may be any of them, so it is held as any)
  if (typeNode.kind === 'ThisType') {
    const thisType = thisGoType(typeNode);
    // a fluent method (every return is `this`) keeps the class: copies in
    // subclasses return theirs
    const fluent = typeNode.parent?.type === typeNode && isMethodDeclaration(typeNode.parent) && returnsOnlyThis(typeNode.parent);
    return thisType && (fluent || !isPolymorphicClass(thisType.slice(1))) ? thisType : 'interface{}';
  }
  if (isArrayTypeNode(typeNode)) {
    // never[] / void[]: the element type is empty
    const elementType = getType(typeNode.elementType) || 'interface{}';
    return getArrayType ? elementType : `[]${elementType}`;
  }
  if (typeNode.kind === 'MappedType') return getMappedType(typeNode);
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName) && /DecoratorContext$/.test(typeNode.typeName.text)) {
    useHelper('decorators');
    return '*TnDecoratorContext';
  }
  if (
    isTypeReferenceNode(typeNode) &&
    typeNode.typeName?.kind === 'QualifiedName' &&
    typeNode.typeName.left?.text === 'JSX' &&
    typeNode.typeName.right?.text === 'Element'
  ) {
    useHelper('jsx');
    return 'TnJsxNode';
  }
  // readonly T[] → T[]; keyof T → string
  if (typeNode.kind === 'TypeOperator') {
    return typeNode.operator === 'KeyOfKeyword' ? 'string' : getType(typeNode.type, getArrayType);
  }
  // typeof x → x's type
  if (typeNode.kind === 'TypeQuery' && isIdentifier(typeNode.exprName)) {
    const declared = declaredVariables.get(typeNode.exprName.text);
    if (declared?.type && !isTypeParameterInScope(typeNode.exprName.text, typeNode)) return getType(declared.type, getArrayType);
    return variableGoTypes.get(typeNode.exprName.text) ?? 'interface{}';
  }
  // asserts x is T → no value; x is T → bool
  if (typeNode.kind === 'TypePredicate') return typeNode.assertsModifier ? '' : 'bool';
  // A & B of object types → one struct with all their fields
  if (typeNode.kind === 'IntersectionType') {
    // Tag & { extra }, with Tag a class or an interface with methods: Tag's
    // own Go type (a struct can't stand in for it)
    const head = (typeNode.types ?? [])[0];
    if (isTypeReferenceNode(head) && isIdentifier(head.typeName)) {
      const headName = head.typeName.text;
      if (classNames.has(headName) || isMethodInterfaceName(headName)) return getType(head, getArrayType);
    }
    // Every member's fields (inherited ones and methods too); when the head
    // already has them all (`Tag & { test: … }` narrowing a field), the head's type
    const memberFields = (typeNode.types ?? []).map((t: AstNode) => objectTypeFieldMap(t));
    const merged = new Map<string, string>();
    for (const fields of memberFields) for (const [field, fieldType] of fields) if (!merged.has(field)) merged.set(field, fieldType);
    if (merged.size === 0) return getType(typeNode.types[0]);
    if (memberFields.length > 0 && memberFields[0].size === merged.size && isTypeReferenceNode(head)) return getType(head, getArrayType);
    const fields = [...merged].map(([field, fieldType]) => `${goFieldName(field)} ${fieldType}`);
    return `*struct{ ${fields.join('; ')} }`;
  }
  // [A, B] tuples are slices: []A when all elements share a type, else []interface{}
  if (typeNode.kind === 'TupleType') {
    const elementType = getTupleElementType(typeNode);
    return getArrayType ? elementType : `[]${elementType}`;
  }
  // Handle union types (e.g. string | null, number | undefined)
  if (isUnionTypeNode(typeNode)) {
    const nonNullTypes = typeNode.types.filter(
      (t) =>
        t.kind !== 'NullKeyword' &&
        t.kind !== 'UndefinedKeyword' &&
        !(isLiteralTypeNode(t) && t.literal.kind === 'NullKeyword')
    );
    if (nonNullTypes.length === 1 && nonNullTypes.length < typeNode.types.length) {
      // This is a nullable type T | null or T | undefined
      const innerType = getType(nonNullTypes[0]);
      if (['float64', 'string', 'bool'].includes(innerType) || isStructGoType(innerType)) {
        return `*${innerType}`;
      }
      // Pointer/interface types already support nil
      return innerType;
    }
    // { kind: 'a', … } | { kind: 'b', … }: one object type with every
    // member's fields (JS objects of these shapes are interchangeable)
    const merged = mergedObjectUnionType(nonNullTypes);
    if (merged) return merged;
    // Non-nullable union or multi-type union → interface{}
    return 'interface{}';
  }
  if (isFunctionTypeNode(typeNode)) {
    // (...args: T[]) => R is variadic: func(...T) R
    const params = (typeNode.parameters ?? [])
      .map((p) => {
        const paramType = p.type ? getType(p.type) : 'interface{}';
        if (p.dotDotDotToken && paramType.startsWith('[]')) return `...${paramType.slice(2)}`;
        // optional parameters are nullable (as in declarations and at call sites)
        return p.questionToken ? makeNullableType(paramType) : paramType;
      })
      .join(', ');
    const retType = typeNode.type ? getType(typeNode.type) : '';
    return `func(${params})${retType ? ` ${retType}` : ''}`;
  }
  // Type guard: function isCat(p): p is Cat → Go bool
  if (typeNode.kind === 'TypePredicate') {
    return 'bool';
  }
  // symbol → a unique pointer type usable as a map key
  if (typeNode.kind === 'SymbolKeyword') {
    useHelper('symbol');
    return '*TnSymbol';
  }
  if (isTypeReferenceNode(typeNode)) {
    const nodeClassKey = nodeClassKeyOfTypeName(typeNode.typeName);
    if (nodeClassKey) return nodeRegistry.classes[nodeClassKey].goType;
    const goAnnotation = goAnnotationOf(typeNode.typeName);
    if (goAnnotation) return goAnnotation;
  }
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    if (enumNames.has(name)) {
      // Numeric enums lowered to float64 constants have no named type
      if (enumBaseTypes.get(name) === 'float64') return 'float64';
      if (enumBaseTypes.get(name) === 'interface{}') return 'interface{}';
      return getSafeName(name);
    }
    const aliasType = getAliasType(name);
    if (aliasType && aliasType.kind !== 'TypeLiteral') {
      return getType(aliasType, getArrayType);
    }
    if (name === 'Promise' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
      const inner = getType(typeNode.typeArguments[0]);
      return `chan ${inner || 'struct{}'}`;
    }
    // async generators are channels of what they yield
    if ((name === 'AsyncGenerator' || name === 'AsyncIterable' || name === 'AsyncIterableIterator') && (typeNode.typeArguments ?? []).length > 0) {
      return `chan ${getType(typeNode.typeArguments[0]) || 'interface{}'}`;
    }
    if (name === 'RegExp') {
      return '*regexp.Regexp';
    }
    if (name === 'Date' && !classNames.has(name)) {
      importedPackages.add('time');
      return 'time.Time';
    }
    // go:builtin GoError values are Go errors.
    if (name === 'GoError') {
      return 'error';
    }
    if (name === 'GoChan' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
      const inner = getType(typeNode.typeArguments[0]);
      return `chan ${inner || 'interface{}'}`;
    }
    if (name === 'GoRef' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
      const inner = getType(typeNode.typeArguments[0]);
      return `*${inner || 'interface{}'}`;
    }
    if (name === 'Error' || (BUILTIN_ERROR_NAMES.has(name) && !classNames.has(name))) {
      // with classes extending Error, an Error may be any of them
      return name === 'Error' && programExtendsError() ? 'interface{}' : '*TnError';
    }
    if (name === 'RegExpExecArray' || name === 'RegExpMatchArray') {
      return '[]string';
    }
    // Uint8Array / Buffer / ArrayBuffer annotations are Go []byte.
    if (name === 'Uint8Array' || name === 'Buffer' || name === 'ArrayBuffer') {
      return '[]byte';
    }
    if (name === 'TemplateStringsArray') return '[]string';
    // Array<T> / ReadonlyArray<T> are T[]
    if ((name === 'Array' || name === 'ReadonlyArray') && !classNames.has(name) && typeNode.typeArguments?.length === 1) {
      const elementType = getType(typeNode.typeArguments[0]);
      return getArrayType ? elementType : `[]${elementType}`;
    }
    if (
      (name === 'Map' || name === 'Record') &&
      typeNode.typeArguments &&
      typeNode.typeArguments.length === 2
    ) {
      return mapGoType(getType(typeNode.typeArguments[0]), getType(typeNode.typeArguments[1]));
    }
    if (name === 'Set' && typeNode.typeArguments && typeNode.typeArguments.length === 1) {
      return mapGoType(getType(typeNode.typeArguments[0]), 'struct{}');
    }
    if (name === 'WeakRef' && typeNode.typeArguments?.length === 1 && !classNames.has(name)) {
      const target = getType(typeNode.typeArguments[0]);
      return target.startsWith('*') ? `*TnWeakRef[${target.slice(1)}]` : 'interface{}';
    }
    if (name === 'FinalizationRegistry' && !classNames.has(name)) return '*TnFinalizationRegistry';
    if (name === 'PromiseWithResolvers' && typeNode.typeArguments?.length === 1) {
      return promiseWithResolversGoType(getType(typeNode.typeArguments[0]));
    }
    // Partial / Required / Readonly / Pick / Omit / NonNullable<T, ...> → T's Go type
    if (UTILITY_TYPES.has(name) && typeNode.typeArguments?.length) {
      return getType(typeNode.typeArguments[0], getArrayType);
    }
    if (isErasedTypeParameter(typeNode, name)) return primitiveTypeParameterConstraint(typeNode, name) ?? 'interface{}';
    // Built-in types with no Go counterpart of their own
    const builtinType = BUILTIN_TYPE_NAMES[name];
    if (builtinType !== undefined && !classNames.has(name) && !declaredInterfaces.has(name)) {
      if (builtinType === '[]interface{}' && (typeNode.typeArguments ?? []).length === 1) {
        return `[]${getType(typeNode.typeArguments[0]) || 'interface{}'}`;
      }
      return builtinType;
    }
    // (class type parameters are erased: Box<number> is *Box). A class with
    // subclasses is held as any: the value may be any of their Go types
    if (classNames.has(name)) return isPolymorphicClass(name) ? 'interface{}' : `*${name}`;
    const typeArgs = getTypeArguments(typeNode.typeArguments);
    if (isObjectTypeName(name)) {
      return `*${name}${typeArgs}`;
    }
    return `${name}${typeArgs}`;
  }

  // T extends U ? X : Y: known only at run time
  if (typeNode.kind === 'ConditionalType' || typeNode.kind === 'InferType') return 'interface{}';
  // Options['version']: the member's type, when the object type is known
  if (typeNode.kind === 'IndexedAccessType') {
    const index = typeNode.indexType;
    const key = index?.kind === 'LiteralType' && isStringLiteral(index.literal) ? index.literal.text : undefined;
    const member = key ? getMemberTypeNode(typeNode.objectType, key) : undefined;
    return member ? getType(member, getArrayType) || 'interface{}' : 'interface{}';
  }
  // { a: T; b?: U } → struct{ a T; b *U }
  // 'map' / 42 / true as a type: its primitive
  if (isLiteralTypeNode(typeNode) && typeNode.literal) {
    const literalKind = typeNode.literal.kind;
    if (literalKind === 'StringLiteral' || literalKind === 'NoSubstitutionTemplateLiteral') return 'string';
    if (literalKind === 'NumericLiteral' || literalKind === 'PrefixUnaryExpression') return 'float64';
    if (literalKind === 'TrueKeyword' || literalKind === 'FalseKeyword') return 'bool';
  }
  if (typeNode.kind === 'TypeLiteral') {
    // properties, and methods as func fields (when there are properties)
    const members = (typeNode.members ?? []).filter((m: AstNode) => isIdentifier(m.name));
    const hasProperties = members.some((m: AstNode) => isPropertySignature(m));
    const fields = members
      .filter((m: AstNode) => isPropertySignature(m) || (hasProperties && isMethodSignature(m)))
      .map((m: AstNode) =>
        `${goFieldName(m.name.text)} ${isMethodSignature(m) ? methodSignatureFieldType(m) : getOptionalNodeType(m.type, !!m.questionToken)}`
      );
    return fields.length > 0 ? `*struct{ ${fields.join('; ')} }` : 'interface{}';
  }

  // Syntactic replacement for the ts typechecker: render the type node's text
  let typeName = typeNodeToText(typeNode);
  const isArray = typeName.includes('[]');

  if (isArray) {
    if (getArrayType) {
      typeName = typeName.replace('[]', '');
    } else {
      return ':';
    }
  }

  switch (typeName) {
    case 'number':
      return 'float64';
    case 'boolean':
      return 'bool';
    case 'any':
      return 'interface{}';
    case 'void':
    case 'never':
      return '';
    case 'object':
      return 'interface{}';
    default:
      return typeName;
  }
}

function getTypeCategory(typeNode: AstNode | undefined): string | undefined {
  if (!typeNode) return undefined;
  if (isArrayTypeNode(typeNode)) return 'array';
  if (typeNode.kind === 'StringKeyword') return 'string';
  if (typeNode.kind === 'NumberKeyword') return 'number';
  if (typeNode.kind === 'BooleanKeyword') return 'boolean';
  if (isUnionTypeNode(typeNode)) {
    const nonNullTypes = typeNode.types.filter(
      (t) =>
        t.kind !== 'NullKeyword' &&
        t.kind !== 'UndefinedKeyword' &&
        !(isLiteralTypeNode(t) && t.literal.kind === 'NullKeyword')
    );
    if (nonNullTypes.length === 1) return getTypeCategory(nonNullTypes[0]);
  }
  if (isTypeReferenceNode(typeNode)) {
    const nodeClassKey = nodeClassKeyOfTypeName(typeNode.typeName);
    if (nodeClassKey) return nodeRegistry.classes[nodeClassKey].category;
  }
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    if (name === 'Map') return 'Map';
    if (name === 'Set') return 'Set';
    if (classNames.has(name)) return 'class';
    if ((name === 'Array' || name === 'ReadonlyArray') && !classNames.has(name)) return 'array';
    // an alias: its target's category
    const alias = declaredTypeAliases.get(name);
    if (alias && alias.kind !== 'TypeLiteral' && !aliasCategoryCheck.has(name)) {
      aliasCategoryCheck.add(name);
      const category = getTypeCategory(alias);
      aliasCategoryCheck.delete(name);
      return category;
    }
    return name;
  }
  return undefined;
}

const aliasCategoryCheck = new Set<string>();

function getClassNameFromTypeNode(typeNode: AstNode): string | undefined {
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    return classNames.has(typeNode.typeName.text) ? typeNode.typeName.text : undefined;
  }
  if (isUnionTypeNode(typeNode)) {
    const nonNullTypes = typeNode.types.filter(
      (t) =>
        t.kind !== 'NullKeyword' &&
        t.kind !== 'UndefinedKeyword' &&
        !(isLiteralTypeNode(t) && t.literal.kind === 'NullKeyword')
    );
    if (nonNullTypes.length === 1) {
      return getClassNameFromTypeNode(nonNullTypes[0]);
    }
  }
  return undefined;
}

function resolveExpressionType(expr: AstNode): string | undefined {
  if (isIdentifier(expr)) {
    const known = variableTypes.get(expr.text) ?? goTypeCategory(variableGoTypes.get(expr.text));
    // Named imports of Node values (import { METHODS } from 'node:http')
    if (known === undefined && nodeLocalNames.has(expr.text)) return goTypeCategory(inferExpressionType(expr));
    return known;
  }
  if (expr.kind === 'ThisKeyword') {
    return 'class';
  }
  return goTypeCategory(inferExpressionType(expr));
}

// Method-dispatch category of an inferred Go type (e.g. `const s = new Set<T>()`)
function goTypeCategory(goType: string | undefined): string | undefined {
  if (!goType) return undefined;
  if (goType.startsWith('*TnMap[')) return extractMapValueType(goType) === 'struct{}' ? 'Set' : 'Map';
  const nodeClassKey = nodeRegistry.classByGoType[goType];
  if (nodeClassKey) return nodeRegistry.classes[nodeClassKey].category;
  if (goType.startsWith('*[]')) goType = goType.slice(1);
  if (goType.startsWith('[]')) {
    if (goType === '[]byte') return 'Buffer';
    return 'array';
  }
  if (goType === 'string') return 'string';
  if (goType === '*regexp.Regexp' || goType === '*TnRegex') return 'RegExp';
  if (goType === 'time.Time') return 'Date';
  // Bridged Go values: methods pass through as Go methods.
  if (goMetaTypeInfo(goType)) return 'class';
  return undefined;
}

function isNilLiteral(node: AstNode): boolean {
  if (node.kind === 'NullKeyword') return true;
  if (isIdentifier(node) && node.text === 'undefined') return true;
  return false;
}

function getAcessString(leftSide: string, rightSide: string, objectType?: string): string {
  if (rightSide === 'length' && objectType === 'string') {
    // JS .length counts UTF-16 code units; code points match for the BMP
    // (O(1) for ASCII and recently indexed strings)
    useHelper('strIndex');
    return `TnStrLength(${leftSide})`;
  }
  if (rightSide === 'length' && objectType !== 'class') {
    return `float64(len(${leftSide}))`;
  }
  // Buffers / Uint8Arrays / ArrayBuffers are []byte
  if (rightSide === 'buffer' && objectType === 'Buffer') return leftSide;
  if (rightSide === 'byteOffset' && objectType === 'Buffer') return 'float64(0)';
  if (rightSide === 'byteLength' && objectType === 'Buffer') {
    return `float64(len(${leftSide}))`;
  }
  if (rightSide === 'size' && (objectType === 'Map' || objectType === 'Set')) {
    return `float64(${leftSide}.Len())`;
  }
  // process global properties
  if (leftSide === 'process') {
    if (rightSide === 'argv') {
      importedPackages.add('os');
      return 'os.Args';
    }
    if (rightSide === 'platform') {
      // Node's names: win32 / darwin / linux
      useHelper('osPlatform');
      return 'TnOsPlatform()';
    }
    if (rightSide === 'env') {
      // process.env.X is detected via the nested access below
      return 'process.env';
    }
  }

  if (leftSide === 'Math') {
    const mathConstants: Record<string, string> = {
      PI: 'math.Pi',
      E: 'math.E',
      LN2: 'math.Ln2',
      LN10: 'math.Ln10',
      LOG2E: 'math.Log2E',
      LOG10E: 'math.Log10E',
      SQRT2: 'math.Sqrt2',
      SQRT1_2: '(1 / math.Sqrt2)'
    };
    if (mathConstants[rightSide]) {
      importedPackages.add('math');
      return `float64(${mathConstants[rightSide]})`;
    }
  }
  if (leftSide === 'Number') {
    const constants: Record<string, string> = {
      MAX_SAFE_INTEGER: 'float64(9007199254740991)',
      MIN_SAFE_INTEGER: 'float64(-9007199254740991)',
      EPSILON: 'float64(2.220446049250313e-16)'
    };
    if (constants[rightSide]) return constants[rightSide];
    if (['MAX_VALUE', 'MIN_VALUE', 'POSITIVE_INFINITY', 'NEGATIVE_INFINITY', 'NaN'].includes(rightSide)) {
      importedPackages.add('math');
      if (rightSide === 'MAX_VALUE') return 'math.MaxFloat64';
      if (rightSide === 'MIN_VALUE') return 'math.SmallestNonzeroFloat64';
      if (rightSide === 'NEGATIVE_INFINITY') return 'math.Inf(-1)';
      return rightSide === 'NaN' ? 'math.NaN()' : 'math.Inf(1)';
    }
  }
  // process.env.X → TnGetenv("X") (os.Environ() is a []string in Go, not a map)
  if (leftSide === 'process.env' || leftSide === '(process.env)') {
    useHelper('getenv');
    return `TnGetenv("${rightSide}")`;
  }
  return `${leftSide}.${rightSide}`;
}

type CallHandler = (caller: string, args: string[], typeArgs: string) => string;

const callHandlers: Record<string, CallHandler> = {
  assert: (_caller, args) => {
    const message = args.length > 1 ? args[1] : '"Assertion failed"';
    return `if !(${args[0]}) {\n\t\tpanic(${message})\n\t}`;
  },
  'console.log': (_caller, args) => consoleOut('Stdout', args),
  'console.info': (_caller, args) => consoleOut('Stdout', args),
  'console.debug': (_caller, args) => consoleOut('Stdout', args),
  'console.trace': (_caller, args) => consoleOut('Stderr', args, 'Trace:'),
  'console.dir': (_caller, args) => {
    useHelper('nodeUtil');
    return consoleOut('Stdout', [`TnInspect(${args.join(', ')})`], '', true);
  },
  'console.assert': (_caller, args) => {
    const condition = args[0] ?? 'false';
    currentCallArgTypes = currentCallArgTypes.slice(1);
    const message = consoleOut('Stderr', args.slice(1), args.length > 1 ? 'Assertion failed:' : 'Assertion failed');
    return `if !(${condition}) {\n\t\t${message}\n\t}`;
  },
  'console.table': (_caller, args) => {
    useHelper('nodeUtil');
    return consoleOut('Stdout', [`TnConsoleTableString(${args.join(', ')})`], '', true);
  },
  'console.count': (_caller, args) => {
    useHelper('console');
    return `TnConsoleCount(${args.join(', ')})`;
  },
  'console.countReset': (_caller, args) => {
    useHelper('console');
    return `TnConsoleCountReset(${args.join(', ')})`;
  },
  'console.group': (_caller, args) => {
    useHelper('console');
    return `TnConsoleGroup(${consoleArgs(args).join(', ')})`;
  },
  'console.groupCollapsed': (_caller, args) => {
    useHelper('console');
    return `TnConsoleGroup(${consoleArgs(args).join(', ')})`;
  },
  'console.groupEnd': () => {
    useHelper('console');
    return 'TnConsoleGroupEnd()';
  },
  'console.time': (_caller, args) => {
    useHelper('console');
    return `TnConsoleTime(${args.slice(0, 1).join(', ')})`;
  },
  'console.timeEnd': (_caller, args) => {
    useHelper('console');
    return `TnConsoleTimeEnd(${args.slice(0, 1).join(', ')})`;
  },
  'console.timeLog': (_caller, args) => {
    useHelper('console');
    const label = args[0] ?? '"default"';
    currentCallArgTypes = currentCallArgTypes.slice(1);
    const extra = args.length > 1 ? consoleArgs(args.slice(1)) : [];
    importedPackages.add('fmt');
    importedPackages.add('strings');
    const text = extra.length > 0 ? `strings.TrimSuffix(fmt.Sprintln(${extra.join(', ')}), "\\n")` : '""';
    return `TnConsoleTimeLog(${label}, ${text})`;
  },
  'Math.hypot': (_caller, args) => mathCall('Hypot', args),
  'Math.cbrt': (_caller, args) => mathCall('Cbrt', args),
  'Math.exp': (_caller, args) => mathCall('Exp', args),
  'Math.expm1': (_caller, args) => mathCall('Expm1', args),
  'Math.log1p': (_caller, args) => mathCall('Log1p', args),
  'Math.asin': (_caller, args) => mathCall('Asin', args),
  'Math.acos': (_caller, args) => mathCall('Acos', args),
  'Math.atan': (_caller, args) => mathCall('Atan', args),
  'Math.atan2': (_caller, args) => mathCall('Atan2', args),
  'Math.sinh': (_caller, args) => mathCall('Sinh', args),
  'Math.cosh': (_caller, args) => mathCall('Cosh', args),
  'Math.tanh': (_caller, args) => mathCall('Tanh', args),
  'Math.asinh': (_caller, args) => mathCall('Asinh', args),
  'Math.acosh': (_caller, args) => mathCall('Acosh', args),
  'Math.atanh': (_caller, args) => mathCall('Atanh', args),
  'Math.fround': (_caller, args) => `float64(float32(${args[0]}))`,
  'Math.imul': (_caller, args) => {
    useHelper('dynamic');
    return `float64(TnInt32(${args[0]}) * TnInt32(${args[1]}))`;
  },
  'Math.clz32': (_caller, args) => {
    useHelper('dynamic');
    importedPackages.add('math/bits');
    return `float64(bits.LeadingZeros32(TnUint32(${args[0]})))`;
  },
  'Math.sumPrecise': (_caller, args) => {
    useHelper('builtins');
    return `TnSumPrecise(${args[0]})`;
  },
  'Number.isSafeInteger': (_caller, args) => {
    importedPackages.add('math');
    return `(${args[0]} == math.Trunc(${args[0]}) && math.Abs(${args[0]}) <= 9007199254740991)`;
  },
  'Number.parseInt': (_caller, args) => {
    useHelper('dynamic');
    return `TnParseInt(${args[0]}, ${args[1] ?? '10'})`;
  },
  'Number.parseFloat': (_caller, args) => {
    useHelper('dynamic');
    return `TnParseFloat(${args[0]})`;
  },
  'Object.groupBy': (_caller, args) => visitGroupBy(args, false),
  'Map.groupBy': (_caller, args) => visitGroupBy(args, true),
  'Iterator.from': (_caller, args) => {
    useHelper('iterators');
    const sourceType = (currentCallArgTypes[0] ?? '').replace(/^\*/, '');
    if (sourceType.startsWith('chan ')) return args[0];
    return `TnIterFrom(${args[0]})`;
  },
  'Object.is': (_caller, args) => {
    useHelper('builtins');
    return `TnObjectIs(${args[0]}, ${args[1]})`;
  },
  'Array.of': (_caller, args) => `${arrayOfGoType(currentCallArgTypes)}{${args.join(', ')}}`,
  'String.fromCodePoint': (_caller, args) => `string([]rune{${args.map((a) => `rune(int(${a}))`).join(', ')}})`,
  'Symbol.for': (_caller, args) => {
    useHelper('symbol');
    return `TnSymbolFor(${args[0]})`;
  },
  'Symbol.keyFor': (_caller, args) => {
    useHelper('symbol');
    return `TnSymbolKeyFor(${args[0]})`;
  },
  BigInt: (_caller, args) => {
    useHelper('builtins');
    return `TnBigIntOf(${args[0]})`;
  },
  'BigInt.asIntN': (_caller, args) => {
    useHelper('builtins');
    return `TnBigIntAsN(${args[0]}, ${args[1]}, true)`;
  },
  'BigInt.asUintN': (_caller, args) => {
    useHelper('builtins');
    return `TnBigIntAsN(${args[0]}, ${args[1]}, false)`;
  },
  isFinite: (_caller, args) => {
    importedPackages.add('math');
    return `(!math.IsInf(${args[0]}, 0) && !math.IsNaN(${args[0]}))`;
  },
  encodeURIComponent: (_caller, args) => {
    useHelper('uri');
    return `TnEncodeURIComponent(${args[0]})`;
  },
  decodeURIComponent: (_caller, args) => {
    useHelper('uri');
    return `TnDecodeURIComponent(${args[0]})`;
  },
  'Object.fromEntries': (_caller, args) => {
    useHelper('dynamic');
    return `TnFromEntries(${args[0]})`;
  },
  'Date.parse': (_caller, args) => {
    useHelper('date');
    return `TnDateMs(TnParseDate(${args[0]}))`;
  },
  'Date.UTC': (_caller, args) => {
    importedPackages.add('time');
    const part = (i: number, fallback: string) => (args[i] ? `int(${args[i]})` : fallback);
    return `float64(time.Date(${part(0, '1970')}, time.Month(${part(1, '0')}+1), ${part(2, '1')}, ${part(3, '0')}, ${part(4, '0')}, ${part(5, '0')}, ${part(6, '0')}*1000000, time.UTC).UnixMilli())`;
  },
  // Promise.withResolvers<T>(): the promise channel and its resolve / reject
  'Promise.withResolvers': (_caller, _args, typeArgs) => {
    useHelper('promise');
    const t = typeArgs ? typeArgs.slice(1, -1) : 'interface{}';
    return `func() ${promiseWithResolversGoType(t)} { ch := make(chan ${t}, 1); return &struct{ promise chan ${t}; resolve func(...interface{}); reject func(...interface{}) }{promise: ch, resolve: TnResolver[${t}](ch), reject: TnRejecter[${t}](ch)} }()`;
  },
  // Promise.try(fn, ...args): fn runs now; its result (or a promise it
  // returns) settles the promise, and a throw rejects it
  'Promise.try': (_caller, args) => {
    useHelper('promise');
    const fnType = currentCallArgNodes[0] ? functionValueGoType(currentCallArgNodes[0]) : '';
    const result = fnType ? goFuncReturnType(fnType) ?? '' : '';
    const call = `${args[0]}(${args.slice(1).join(', ')})`;
    if (result.startsWith('chan ')) {
      return `func() (__r ${result}) { defer func() { if p := recover(); p != nil { __r = make(${result}, 1); TnReject(__r, p) } }(); return ${call} }()`;
    }
    const t = result || 'struct{}';
    const settle = result ? `TnResolver[${t}](ch)(${call})` : `${call}; TnResolveZero(ch)`;
    return `func() chan ${t} { ch := make(chan ${t}, 1); func() { defer TnRejectExecutor(ch); ${settle} }(); return ch }()`;
  },
  'Promise.resolve': (_caller, args) => {
    const valueType = currentCallArgTypes[0] ?? 'interface{}';
    return `func() chan ${valueType} { __ch := make(chan ${valueType}, 1); __ch <- ${args[0] ?? 'nil'}; return __ch }()`;
  },
  structuredClone: (_caller, args) => {
    useHelper('structuredClone');
    return `TnStructuredClone(${args[0]})`;
  },
  setInterval: (_caller, args) => {
    useHelper('timerWait');
    return `TnSetInterval(${args[1] ?? '0'}, ${args[0]})`;
  },
  clearInterval: (_caller, args) => {
    useHelper('timerWait');
    return `TnClearInterval(${args[0]})`;
  },
  queueMicrotask: (_caller, args) => {
    useHelper('timerWait');
    return `TnQueueMicrotask(${args[0]})`;
  },
  clearTimeout: (_caller, args) => {
    useHelper('timerWait');
    return `TnClearTimeout(${args[0]})`;
  },
  'Math.random': () => {
    importedPackages.add('math/rand');
    return 'rand.Float64()';
  },
  'Math.floor': (_caller, args) => {
    importedPackages.add('math');
    return `math.Floor(${args[0]})`;
  },
  'Math.ceil': (_caller, args) => {
    importedPackages.add('math');
    return `math.Ceil(${args[0]})`;
  },
  'Math.round': (_caller, args) => {
    importedPackages.add('math');
    return `math.Round(${args[0]})`;
  },
  'Math.abs': (_caller, args) => {
    importedPackages.add('math');
    return `math.Abs(${args[0]})`;
  },
  // Math.max(...arr) → slices.Max(arr); otherwise Go's variadic builtin
  'Math.max': (_caller, args) => {
    if (args.length === 1 && args[0].endsWith('...')) {
      importedPackages.add('slices');
      return `slices.Max(${args[0].slice(0, -3)})`;
    }
    return `max(${args.join(', ')})`;
  },
  'Math.min': (_caller, args) => {
    if (args.length === 1 && args[0].endsWith('...')) {
      importedPackages.add('slices');
      return `slices.Min(${args[0].slice(0, -3)})`;
    }
    return `min(${args.join(', ')})`;
  },
  'Math.sqrt': (_caller, args) => {
    importedPackages.add('math');
    return `math.Sqrt(${args[0]})`;
  },
  'Math.pow': (_caller, args) => {
    importedPackages.add('math');
    return `math.Pow(${args[0]}, ${args[1]})`;
  },
  parseInt: (_caller, args) => {
    useHelper('dynamic');
    return `TnParseInt(${args[0]}, ${args[1] ?? '10'})`;
  },
  parseFloat: (_caller, args) => {
    useHelper('dynamic');
    return `TnParseFloat(${args[0]})`;
  },
  'process.exit': (_caller, args) => {
    importedPackages.add('os');
    return `os.Exit(int(${args[0] ?? '0'}))`;
  },
  'process.cwd': () => {
    importedPackages.add('os');
    return `func() string { __d, _ := os.Getwd(); return __d }()`;
  },
  'JSON.stringify': (_caller, args) => {
    useHelper('jsonStringify');
    useHelper('dynamic');
    if (args.length === 1) return `TnJSONStringify(${args[0]}, "")`;
    const replacerNode = currentCallArgNodes[1];
    const replacer = jsonCallbackAdapter(replacerNode, args[1]) || (isNilLiteral(replacerNode) ? 'nil' : args[1]);
    return `TnJSONStringifyWith(${args[0]}, ${replacer}, ${args[2] ?? 'nil'})`;
  },
  'JSON.parse': (_caller, args) => {
    useHelper('jsonStringify');
    if (args.length >= 2) {
      const reviver = jsonCallbackAdapter(currentCallArgNodes[1], args[1]);
      if (reviver) return `TnJSONParseWith(${args[0]}, ${reviver})`;
    }
    return `TnJSONParse(${args[0]})`;
  },
  // Maps / records have ordered keys; other objects go through reflection
  'Object.keys': (_caller, args) => {
    if (isOrderedMapArg(currentCallArgNodes[0])) return `${args[0]}.Keys()`;
    useHelper('dynamic');
    return `TnKeys(${args[0]})`;
  },
  'Object.values': (_caller, args) => {
    if (isOrderedMapArg(currentCallArgNodes[0])) return `${args[0]}.Values()`;
    useHelper('dynamic');
    return `TnValues(${args[0]})`;
  },
  // Outside for...of (which iterates the map directly): [key, value] pairs
  'Object.entries': (_caller, args) => {
    if (isOrderedMapArg(currentCallArgNodes[0])) return `${args[0]}.Entries()`;
    useHelper('dynamic');
    return `TnEntries(${args[0]})`;
  },
  // Object.assign copies sources into a fresh ordered map (mutating structs is
  // not observable the way it is in JS)
  'Object.assign': (_caller, args) => {
    const call = currentCallNode;
    const targetType = call ? objectAssignTargetType(call) : undefined;
    // (an existing object is updated in place and returned, whatever its type)
    const existingTarget = !!call && (call.arguments ?? []).length > 0 && !isObjectLiteralExpression(unwrapParentheses(call.arguments[0])) && !(call.arguments ?? []).some((a: AstNode) => isSpreadElement(a));
    if (call && (targetType || existingTarget)) {
      useHelper('objectAssignTo');
      const target = unwrapParentheses(call.arguments[0]);
      // a literal target: a fresh value of the type, its own properties first
      const literal = isObjectLiteralExpression(target);
      const head = literal ? newGoValueOf(targetType ?? "") : args[0];
      const sources = literal && (target.properties ?? []).length > 0 ? [dynamicObjectLiteral(target), ...args.slice(1)] : args.slice(1);
      return `TnAssignTo(${[head, ...sources].join(', ')})`;
    }
    useHelper('objectAssign');
    return `TnObjectAssign(${args.join(', ')})`;
  },
  // Promise.all: drain every promise channel, collect the results
  'Promise.all': (_caller, args) => {
    useHelper('promiseAll');
    return `TnPromiseAll(${args[0] ?? '[]chan interface{}{}'})`;
  },
  'Math.log': (_caller, args) => {
    importedPackages.add('math');
    return `math.Log(${args[0]})`;
  },
  'Math.log2': (_caller, args) => {
    importedPackages.add('math');
    return `math.Log2(${args[0]})`;
  },
  'Math.log10': (_caller, args) => {
    importedPackages.add('math');
    return `math.Log10(${args[0]})`;
  },
  'Math.sin': (_caller, args) => {
    importedPackages.add('math');
    return `math.Sin(${args[0]})`;
  },
  'Math.cos': (_caller, args) => {
    importedPackages.add('math');
    return `math.Cos(${args[0]})`;
  },
  'Math.tan': (_caller, args) => {
    importedPackages.add('math');
    return `math.Tan(${args[0]})`;
  },
  'Math.trunc': (_caller, args) => {
    importedPackages.add('math');
    return `math.Trunc(${args[0]})`;
  },
  'Math.sign': (_caller, args) => {
    return `func() float64 { if ${args[0]} > 0 { return 1 }; if ${args[0]} < 0 { return -1 }; return 0 }()`;
  },
  'Date.now': () => {
    importedPackages.add('time');
    useHelper('clock');
    return 'float64(TnTimeNow().UnixMilli())';
  },
  'console.error': (_caller, args) => consoleOut('Stderr', args),
  'console.warn': (_caller, args) => consoleOut('Stderr', args),
  'Array.isArray': (_caller, args) => {
    useHelper('isArray');
    return `TnIsArray(${args[0]})`;
  },
  'String': (_caller, args) => jsStringOf(args[0] ?? '""', currentCallArgTypes[0]),
  'String.fromCharCode': (_caller, args) => `string(rune(int(${args[0] ?? '0'})))`,
  // Symbol(description) — unique values for record keys
  Symbol: (_caller, args) => {
    useHelper('symbol');
    return `TnNewSymbol(${args[0] ?? '""'})`;
  },
  'Number': (_caller, args) => {
    useHelper('dynamic');
    return `TnNumber(${args[0]})`;
  },
  'Number.isNaN': (_caller, args) => {
    importedPackages.add('math');
    if (currentCallArgTypes[0] !== 'float64') {
      return `func() bool { __n, __ok := interface{}(${numberCheckArgument(args[0])}).(float64); return __ok && math.IsNaN(__n) }()`;
    }
    return `math.IsNaN(${args[0]})`;
  },
  isNaN: (_caller, args) => {
    importedPackages.add('math');
    return `math.IsNaN(${args[0]})`;
  },
  // (no coercion: anything but a number is false)
  'Number.isFinite': (_caller, args) => {
    importedPackages.add('math');
    if (currentCallArgTypes[0] !== 'float64') {
      return `func() bool { __n, __ok := interface{}(${numberCheckArgument(args[0])}).(float64); return __ok && !math.IsInf(__n, 0) && !math.IsNaN(__n) }()`;
    }
    return `!math.IsInf(${args[0]}, 0) && !math.IsNaN(${args[0]})`;
  },
  'Number.isInteger': (_caller, args) => {
    importedPackages.add('math');
    if (currentCallArgTypes[0] !== 'float64') {
      return `func() bool { __n, __ok := interface{}(${numberCheckArgument(args[0])}).(float64); return __ok && __n == math.Trunc(__n) && !math.IsInf(__n, 0) }()`;
    }
    return `(${args[0]} == math.Trunc(${args[0]}) && !math.IsInf(${args[0]}, 0))`;
  },
  // Object(x) is x (primitives are not boxed)
  'Object': (_caller, args) => `interface{}(${args[0] ?? 'map[string]interface{}{}'})`,
  'Boolean': (_caller, args) => `(${truthinessCheck(args[0] ?? 'false', currentCallArgTypes[0] ?? 'interface{}')})`,
};

// The argument of Number.isInteger & co. as a value to test (a number | undefined
// is its number, or nil)
function numberCheckArgument(arg: string): string {
  if (!NULLABLE_PRIMITIVE_TYPES.includes(currentCallArgTypes[0] ?? '')) return arg;
  useHelper('dynamic');
  return `TnPtrValue(${arg})`;
}

type MethodHandler = (obj: string, args: string[]) => string;

// Built-in Error subclasses (TnErrors carrying their name)
const BUILTIN_ERROR_NAMES = new Set(['TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError', 'AggregateError']);

// Whether the program uses console.group (then every console line is
// written through the indentation-aware helper)
let consoleGroupsUsed = false;

// One console line to stdout / stderr, with an optional leading word
function consoleOut(stream: string, args: string[], prefix = '', formatted = false): string {
  let parts = formatted ? args : consoleArgs(args);
  if (prefix) parts = [toGoStringLiteral(prefix), ...parts];
  importedPackages.add('fmt');
  if (consoleGroupsUsed) {
    useHelper('console');
    importedPackages.add('os');
    importedPackages.add('strings');
    return `TnConsoleWrite(os.${stream}, strings.TrimSuffix(fmt.Sprintln(${parts.join(', ')}), "\\n"))`;
  }
  if (stream === 'Stdout') return `fmt.Println(${parts.join(', ')})`;
  importedPackages.add('os');
  return `fmt.Fprintln(os.Stderr, ${parts.join(', ')})`;
}

// console.* arguments, printed like Node: strings as-is, numbers in JS
// notation, everything else through util.inspect (and a format string first
// argument through util.format)
// The inferred type of call argument i ('' when unknown); a plain lookup keeps
// the self-hosted build from dereferencing a missing (nil) entry
function callArgType(i: number): string {
  if (i >= currentCallArgTypes.length) return '';
  const t = currentCallArgTypes[i];
  return t ? t : '';
}

function consoleArgs(args: string[]): string[] {
  const types: string[] = args.map((_arg, i) => callArgType(i));
  const isFormatString = args.length > 1 && types[0] === 'string' && args[0].includes('%');
  const needsInspect = args.some((_arg, i) => !['string', 'float64', 'bool', '[]byte'].includes(types[i]));
  if (isFormatString || needsInspect) {
    useHelper('nodeUtil');
    return [`TnUtilFormat(${args.join(', ')})`];
  }
  return args.map((arg, i) => {
    if (types[i] === 'float64') {
      useHelper('dynamic');
      return `TnNumStr(${arg})`;
    }
    if (types[i] === '[]byte') {
      useHelper('buffer');
      return `TnBufferInspect(${arg})`;
    }
    return arg;
  });
}

const stringMethodHandlers: Record<string, MethodHandler> = {
  split: (obj, args) => {
    // Regex separators: JS split (captures included, limit counts items)
    const limit = args.length >= 2 ? `int(${args[1]})` : '-1';
    if (args[0]?.startsWith('regexp.MustCompile(') || variableGoTypes.get(args[0]) === '*regexp.Regexp') {
      useHelper('regexMatch');
      return `TnRegexpSplit(${args[0]}, ${obj}, ${limit})`;
    }
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `${args[0]}.SplitStr(${obj}, ${limit})`;
    }
    importedPackages.add('strings');
    // split(sep, limit): at most `limit` parts
    if (args.length >= 2) return `func() []string { __p := strings.Split(${obj}, ${args[0]}); return __p[:min(len(__p), max(0, int(${args[1]})))] }()`;
    return `strings.Split(${obj}, ${args[0]})`;
  },
  trim: (obj) => {
    importedPackages.add('strings');
    return `strings.TrimSpace(${obj})`;
  },
  trimStart: (obj) => {
    importedPackages.add('strings');
    return `strings.TrimLeft(${obj}, " \\t\\n\\r")`;
  },
  trimEnd: (obj) => {
    importedPackages.add('strings');
    return `strings.TrimRight(${obj}, " \\t\\n\\r")`;
  },
  toUpperCase: (obj) => {
    importedPackages.add('strings');
    return `strings.ToUpper(${obj})`;
  },
  toLowerCase: (obj) => {
    importedPackages.add('strings');
    return `strings.ToLower(${obj})`;
  },
  // (string positions are code points: see the strIndex helpers)
  indexOf: (obj, args) => {
    useHelper('strIndex');
    return `TnStrIndexOf(${obj}, ${args[0]}, ${args[1] ?? '0'})`;
  },
  charCodeAt: (obj, args) => {
    useHelper('strIndex');
    return `TnCharCodeAt(${obj}, ${args[0] ?? '0'})`;
  },
  localeCompare: (obj, args) => {
    importedPackages.add('strings');
    return `float64(strings.Compare(${obj}, ${args[0]}))`;
  },
  includes: (obj, args) => {
    importedPackages.add('strings');
    return `strings.Contains(${obj}, ${args[0]})`;
  },
  startsWith: (obj, args) => {
    importedPackages.add('strings');
    return `strings.HasPrefix(${obj}, ${args[0]})`;
  },
  endsWith: (obj, args) => {
    importedPackages.add('strings');
    return `strings.HasSuffix(${obj}, ${args[0]})`;
  },
  replace: (obj, args) => {
    importedPackages.add('strings');
    return `strings.Replace(${obj}, ${args[0]}, ${args[1]}, 1)`;
  },
  replaceAll: (obj, args) => {
    importedPackages.add('strings');
    return `strings.ReplaceAll(${obj}, ${args[0]}, ${args[1]})`;
  },
  repeat: (obj, args) => {
    importedPackages.add('strings');
    return `strings.Repeat(${obj}, int(${args[0]}))`;
  },
  charAt: (obj, args) => {
    useHelper('strIndex');
    return `TnCharAt(${obj}, ${args[0] ?? '0'})`;
  },
  substring: (obj, args) => {
    useHelper('strIndex');
    const end = optionalEndArgument(args);
    if (end) return `func() string { __e := ${end}; return TnSubstring(${obj}, ${args[0] ?? '0'}, TnDeref(__e), __e != nil) }()`;
    return `TnSubstring(${obj}, ${args[0] ?? '0'}, ${args[1] ?? '0'}, ${args.length >= 2})`;
  },
  slice: (obj, args) => {
    // (a Go array or slice of an unknown receiver slices as it is)
    if (currentReceiverGoType && currentReceiverGoType !== 'string') {
      if (args.length >= 2) return `${obj}[${sliceIndex(obj, args[0])}:${sliceIndex(obj, args[1])}]`;
      return `${obj}[${sliceIndex(obj, args[0] ?? '0')}:]`;
    }
    useHelper('strIndex');
    const end = optionalEndArgument(args);
    if (end) return `func() string { __e := ${end}; return TnStrSlice(${obj}, ${args[0] ?? '0'}, TnDeref(__e), __e != nil) }()`;
    return `TnStrSlice(${obj}, ${args[0] ?? '0'}, ${args[1] ?? '0'}, ${args.length >= 2})`;
  },
  concat: (obj, args) => `${obj} + ${args.join(' + ')}`,
  // normalize('NFC' | 'NFD' | 'NFKC' | 'NFKD')
  normalize: (obj, args) => {
    importedPackages.add('golang.org/x/text/unicode/norm');
    const form = args[0] ?? '"NFC"';
    const literal = /^"(NFC|NFD|NFKC|NFKD)"$/.exec(form);
    if (literal) return `tnnorm.${literal[1]}.String(${obj})`;
    return `func() string { switch ${form} { case "NFD": return tnnorm.NFD.String(${obj}); case "NFKC": return tnnorm.NFKC.String(${obj}); case "NFKD": return tnnorm.NFKD.String(${obj}) }; return tnnorm.NFC.String(${obj}) }()`;
  },
  padStart: (obj, args) => {
    useHelper('strIndex');
    return `TnStrPad(${obj}, ${args[0] ?? '0'}, ${args[1] ?? '" "'}, true)`;
  },
  padEnd: (obj, args) => {
    useHelper('strIndex');
    return `TnStrPad(${obj}, ${args[0] ?? '0'}, ${args[1] ?? '" "'}, false)`;
  },
  match: (obj, args) => {
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `${args[0]}.FindSub(${obj})`;
    }
    useHelper('regexMatch');
    return `TnRegexpExec(${toGoRegexp(args[0])}, ${obj})`;
  },
  matchAll: (obj, args) => {
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `${args[0]}.FindAllSub(${obj})`;
    }
    useHelper('regexMatch');
    return `TnRegexpMatchAll(${toGoRegexp(args[0])}, ${obj})`;
  },
  // A character index, like the other string methods
  search: (obj, args) => {
    useHelper('regexMatch');
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `func() float64 { __s := ${obj}; return TnMatchCharIndex(__s, ${args[0]}.FindIndexSub(__s)) }()`;
    }
    return `func() float64 { __s := ${obj}; return TnMatchCharIndex(__s, ${toGoRegexp(args[0])}.FindStringIndex(__s)) }()`;
  },
  lastIndexOf: (obj, args) => {
    useHelper('strIndex');
    return `TnStrLastIndexOf(${obj}, ${args[0]}, ${args[1] ?? '0'}, ${args.length >= 2})`;
  },
  codePointAt: (obj, args) => {
    useHelper('strIndex');
    return `TnCodePointAt(${obj}, ${args[0] ?? '0'})`;
  },
  substr: (obj, args) => {
    useHelper('strIndex');
    return `TnSubstr(${obj}, ${args[0] ?? '0'}, ${args[1] ?? '0'}, ${args.length >= 2})`;
  },
  trimLeft: (obj) => {
    importedPackages.add('strings');
    return `strings.TrimLeft(${obj}, " \\t\\n\\r")`;
  },
  trimRight: (obj) => {
    importedPackages.add('strings');
    return `strings.TrimRight(${obj}, " \\t\\n\\r")`;
  },
  toLocaleUpperCase: (obj) => {
    importedPackages.add('strings');
    return `strings.ToUpper(${obj})`;
  },
  toLocaleLowerCase: (obj) => {
    importedPackages.add('strings');
    return `strings.ToLower(${obj})`;
  },
  isWellFormed: (obj) => {
    importedPackages.add('unicode/utf8');
    return `utf8.ValidString(${obj})`;
  },
  toWellFormed: (obj) => {
    importedPackages.add('strings');
    return `strings.ToValidUTF8(${obj}, "\\uFFFD")`;
  },
  at: (obj, args) => {
    useHelper('strIndex');
    return `TnStrAt(${obj}, ${args[0] ?? '0'})`;
  },
  toString: (obj: string) => {
    importedPackages.add('fmt');
    return `fmt.Sprintf("%v", ${obj})`;
  }
};

const regexpMethodHandlers: Record<string, MethodHandler> = {
  test: (obj, args) =>
    currentReceiverGoType === '*TnRegex'
      ? `${obj}.Test(${args[0]})`
      : `${obj}.MatchString(${args[0]})`,
  exec: (obj, args) => {
    if (currentReceiverGoType === '*TnRegex') return `${obj}.Find(${args[0]})`;
    // Named groups come back as a match object with a .groups record
    if (obj.includes('(?P<')) {
      useHelper('namedGroups');
      return `TnRegexExecNamed(${obj}, ${args[0]})`;
    }
    useHelper('regexMatch');
    return `TnRegexpExec(${obj}, ${args[0]})`;
  }
};

// d.setHours(h, …) & co.: Dates are values, so the variable is reassigned
function dateSetter(field: string, utc: boolean): MethodHandler {
  return (obj, args) => {
    useHelper('date');
    const call = `TnDateSet(${obj}, ${toGoStringLiteral(field)}, ${utc}${args.map((a) => `, ${a}`).join('')})`;
    return isAddressable(obj) ? `func() float64 { ${obj} = ${call}; return TnDateMs(${obj}) }()` : `TnDateMs(${call})`;
  };
}

function dateFormatter(kind: string): MethodHandler {
  return (obj) => {
    useHelper('date');
    return `TnDateFormat(${obj}, ${toGoStringLiteral(kind)})`;
  };
}

const dateMethodHandlers: Record<string, MethodHandler> = {
  getTime: (obj) => {
    useHelper('date');
    return `TnDateMs(${obj})`;
  },
  getMilliseconds: (obj) => `float64((${obj}).Millisecond())`,
  getSeconds: (obj) => `float64((${obj}).Second())`,
  getMinutes: (obj) => `float64((${obj}).Minute())`,
  getHours: (obj) => `float64((${obj}).Hour())`,
  getDate: (obj) => `float64((${obj}).Day())`,
  getDay: (obj) => `float64(int((${obj}).Weekday()))`,
  getMonth: (obj) => `float64(int((${obj}).Month()) - 1)`,
  getFullYear: (obj) => `float64((${obj}).Year())`,
  toISOString: dateFormatter('iso'),
  toJSON: dateFormatter('iso'),
  getUTCMilliseconds: (obj) => `float64((${obj}).UTC().Nanosecond() / 1000000)`,
  getUTCSeconds: (obj) => `float64((${obj}).UTC().Second())`,
  getUTCMinutes: (obj) => `float64((${obj}).UTC().Minute())`,
  getUTCHours: (obj) => `float64((${obj}).UTC().Hour())`,
  getUTCDate: (obj) => `float64((${obj}).UTC().Day())`,
  getUTCDay: (obj) => `float64(int((${obj}).UTC().Weekday()))`,
  getUTCMonth: (obj) => `float64(int((${obj}).UTC().Month()) - 1)`,
  getUTCFullYear: (obj) => `float64((${obj}).UTC().Year())`,
  toString: dateFormatter('string'),
  toDateString: dateFormatter('date'),
  toTimeString: dateFormatter('time'),
  toUTCString: dateFormatter('utc'),
  toGMTString: dateFormatter('utc'),
  toLocaleDateString: dateFormatter('localeDate'),
  toLocaleTimeString: dateFormatter('localeTime'),
  toLocaleString: dateFormatter('locale'),
  getTimezoneOffset: (obj) => {
    useHelper('date');
    return `TnDateTimezoneOffset(${obj})`;
  },
  valueOf: (obj) => {
    useHelper('date');
    return `TnDateMs(${obj})`;
  },
  setTime: dateSetter('time', false),
  setFullYear: dateSetter('fullYear', false),
  setMonth: dateSetter('month', false),
  setDate: dateSetter('date', false),
  setHours: dateSetter('hours', false),
  setMinutes: dateSetter('minutes', false),
  setSeconds: dateSetter('seconds', false),
  setMilliseconds: dateSetter('milliseconds', false),
  setUTCFullYear: dateSetter('fullYear', true),
  setUTCMonth: dateSetter('month', true),
  setUTCDate: dateSetter('date', true),
  setUTCHours: dateSetter('hours', true),
  setUTCMinutes: dateSetter('minutes', true),
  setUTCSeconds: dateSetter('seconds', true),
  setUTCMilliseconds: dateSetter('milliseconds', true)
};

// append(base, args…) where some arguments are spreads (`x...`): one
// append per run, as Go allows a spread only as the last argument
function appendArguments(base: string, args: string[]): string {
  if (!args.some((a) => a.endsWith('...'))) return `append(${[base, ...args].join(', ')})`;
  let out = base;
  let run: string[] = [];
  for (const arg of args) {
    if (arg.endsWith('...')) {
      if (run.length > 0) out = `append(${[out, ...run].join(', ')})`;
      run = [];
      out = `append(${out}, ${arg})`;
    } else run.push(arg);
  }
  return run.length > 0 ? `append(${[out, ...run].join(', ')})` : out;
}

const arrayMethodHandlers: Record<string, MethodHandler> = {
  // push / unshift return the new length when their value is used
  push: (obj, args) =>
    currentCallNode && !isDiscardedValue(currentCallNode)
      ? `func() float64 { ${obj} = ${appendArguments(obj, args)}; return float64(len(${obj})) }()`
      : `${obj} = ${appendArguments(obj, args)}`,
  pop: (obj) => {
    const elementType = receiverElementType();
    if (!isAddressable(obj)) {
      return `func() ${elementType} { __s := ${obj}; if len(__s) == 0 { var __zero ${elementType}; return __zero }; return __s[len(__s)-1] }()`;
    }
    return `func() ${elementType} { if len(${obj}) == 0 { var __zero ${elementType}; return __zero }; __last := ${obj}[len(${obj})-1]; ${obj} = ${obj}[:len(${obj})-1]; return __last }()`;
  },
  shift: (obj) => {
    const elementType = receiverElementType();
    if (!isAddressable(obj)) {
      return `func() ${elementType} { __s := ${obj}; if len(__s) == 0 { var __zero ${elementType}; return __zero }; return __s[0] }()`;
    }
    return `func() ${elementType} { if len(${obj}) == 0 { var __zero ${elementType}; return __zero }; __first := ${obj}[0]; ${obj} = ${obj}[1:]; return __first }()`;
  },
  unshift: (obj, args) => {
    const prefix = appendArguments(`[]${receiverElementType()}{}`, args);
    return currentCallNode && !isDiscardedValue(currentCallNode)
      ? `func() float64 { ${obj} = append(${prefix}, ${obj}...); return float64(len(${obj})) }()`
      : `${obj} = append(${prefix}, ${obj}...)`;
  },
  join: (obj, args) => {
    importedPackages.add('strings');
    return `strings.Join(${obj}, ${args[0] ?? '","'})`;
  },
  slice: (obj, args) => {
    if (args.length >= 2) return `${obj}[${sliceIndex(obj, args[0])}:${sliceIndex(obj, args[1])}]`;
    return `${obj}[${sliceIndex(obj, args[0])}:]`;
  },
  reverse: (obj) => {
    importedPackages.add('slices');
    const arrayType = currentReceiverGoType?.startsWith('[]') ? currentReceiverGoType : '[]interface{}';
    return `func() ${arrayType} { __s := ${obj}; slices.Reverse(__s); return __s }()`;
  },
  // Removes `deleteCount` elements at `start`, returns them; extra args are inserted
  splice: (obj, args) => {
    const elementType = receiverElementType();
    if (args.length === 0) return `[]${elementType}{}`;
    const start = `${sliceIndex(obj, args[0])}`;
    if (args.length === 1) {
      return `func() []${elementType} { __rm := append([]${elementType}{}, ${obj}[${start}:]...); ${obj} = ${obj}[:${start}]; return __rm }()`;
    }
    const insert = args.slice(2);
    // (the deleted count is clamped to the elements after start)
    const inserted = insert.length > 0 ? appendArguments(`${obj}[:__start]`, insert) : `${obj}[:__start]`;
    return `func() []${elementType} { __start := ${start}; __end := __start + max(0, int(${args[1]})); if __end > len(${obj}) { __end = len(${obj}) }; __rm := append([]${elementType}{}, ${obj}[__start:__end]...); __tail := append([]${elementType}{}, ${obj}[__end:]...); ${obj} = ${inserted}; ${obj} = append(${obj}, __tail...); return __rm }()`;
  },
  fill: (obj, args) => {
    const elementType = receiverElementType();
    const value = args[0] ?? '0';
    return `func() []${elementType} { __s := ${obj}; for __i := range __s { __s[__i] = ${value} }; return __s }()`;
  },
  lastIndexOf: (obj, args) => {
    const elementType = receiverElementType();
    return `func() float64 { __x := ${args[0]}; for __i := len(${obj}) - 1; __i >= 0; __i-- { if ${elementEqualsFor(elementType, `${obj}[__i]`, '__x')} { return float64(__i) } }; return float64(-1) }()`;
  },
  // Sorts in place and returns the array; without a comparator, compares as strings (like JS)
  sort: (obj, args) => sortArray(obj, args),
  indexOf: (obj, args) =>
    `func() float64 { __x := ${args[0]}; for __i, __v := range ${obj} { if ${elementEquals('__v', '__x')} { return float64(__i) } }; return float64(-1) }()`,
  includes: (obj, args) =>
    `func() bool { __x := ${args[0]}; for _, __v := range ${obj} { if ${elementEquals('__v', '__x')} { return true } }; return false }()`,
  // concat(a, [b, c], d): arrays are flattened one level, other values appended
  concat: (obj, args) => {
    const parts = args.map((arg, i) => {
      if (currentCallArgTypes[i]?.startsWith('[]')) return `__r = append(__r, ${arg}...)`;
      // a dynamic value: flattened when it is an array at run time
      if (currentCallArgTypes[i] === 'interface{}' && receiverElementType() === 'interface{}') {
        useHelper('isArray');
        useHelper('arraySubclass');
        return `if __c := ${arg}; TnIsArray(__c) { __r = append(__r, TnToArray(__c)...) } else { __r = append(__r, __c) }`;
      }
      return `__r = append(__r, ${arg})`;
    });
    return `func() []${receiverElementType()} { __r := append([]${receiverElementType()}{}, ${obj}...); ${parts.join('; ')}; return __r }()`;
  },
  toSorted: (obj, args) => {
    importedPackages.add('slices');
    return sortArray(`slices.Clone(${obj})`, args);
  },
  // copyWithin(target, start, end?): copies in place (overlap-safe) and returns the array
  copyWithin: (obj, args) => {
    const end = args[2] ? sliceIndex('__s', args[2]) : 'len(__s)';
    return `func() []${receiverElementType()} { __s := ${obj}; __t := ${sliceIndex('__s', args[0] ?? '0')}; __start := ${sliceIndex('__s', args[1] ?? '0')}; __end := ${end}; if __start < __end { copy(__s[__t:], __s[__start:__end]) }; return __s }()`;
  },
  // toSpliced(start, deleteCount?, ...items): a spliced copy
  toSpliced: (obj, args) => {
    importedPackages.add('slices');
    const elementType = receiverElementType();
    const end = args.length >= 2 ? `min(__start+max(int(${args[1]}), 0), len(__s))` : 'len(__s)';
    return `func() []${elementType} { __s := ${obj}; __start := ${sliceIndex('__s', args[0] ?? '0')}; return slices.Concat(__s[:__start:__start], []${elementType}{${args.slice(2).join(', ')}}, __s[${end}:]) }()`;
  },
  toReversed: (obj) => {
    importedPackages.add('slices');
    return `func() []${receiverElementType()} { __s := slices.Clone(${obj}); slices.Reverse(__s); return __s }()`;
  },
  with: (obj, args) => {
    importedPackages.add('slices');
    return `func() []${receiverElementType()} { __s := slices.Clone(${obj}); __s[${sliceIndex('__s', args[0])}] = ${args[1]}; return __s }()`;
  },
  // [][]T → []T (one level, like JS's default depth)
  flat: (obj) => {
    const elementType = receiverElementType();
    if (!elementType.startsWith('[]')) return obj;
    return `func() ${elementType} { var __flat ${elementType}; for _, __inner := range ${obj} { __flat = append(__flat, __inner...) }; return __flat }()`;
  },
  toString: (obj: string) => {
    useHelper('dynamic');
    useHelper('error');
    return `TnJSString(${obj})`;
  },
  // padStart / padEnd for string arrays (rarely used, but added for completeness)
  at: (obj, args) => {
    return `func() interface{} { __i := int(${args[0]}); if __i < 0 { __i = len(${obj}) + __i }; if __i < 0 || __i >= len(${obj}) { return nil }; return ${obj}[__i] }()`;
  },
};

function receiverElementType(): string {
  return currentReceiverGoType?.startsWith('[]') ? currentReceiverGoType.slice(2) : 'interface{}';
}

// Go expressions that can be assigned to (variables, fields, index expressions,
// dereferenced array references)
function isAddressable(code: string): boolean {
  return /^[\w.]+(\[[^\]]*\])*$/.test(code) || /^\(\*[\w.]+\)$/.test(code);
}

// A regex argument as a *regexp.Regexp: compiled literals pass through, pattern
// strings are compiled
function toGoRegexp(arg: string): string {
  importedPackages.add('regexp');
  if (arg.startsWith('regexp.MustCompile(') || variableGoTypes.get(arg) === '*regexp.Regexp') return arg;
  return `regexp.MustCompile(${arg})`;
}

// A JS slice index: negative values count from the end
// A JS slice index: negative values count from the end; out-of-range values clamp
function sliceIndex(obj: string, index: string | undefined): string {
  if (index === undefined || index === '') return '0';
  if (index.startsWith('-')) return `max(0, int(float64(len(${obj})) + ${index}))`;
  return `min(int(${index}), len(${obj}))`;
}

// Equality of two array elements of the current receiver's element type
function elementEqualsFor(elementType: string, a: string, b: string): string {
  if (elementType === 'interface{}' || elementType.startsWith('*TnMap[') || elementType.startsWith('[]')) {
    useHelper('dynamic');
    return `TnSame(${a}, ${b})`;
  }
  return `${a} == ${b}`;
}

function elementEquals(a: string, b: string): string {
  return elementEqualsFor(receiverElementType(), a, b);
}

const mapMethodHandlers: Record<string, MethodHandler> = {
  set: (obj, args) => `${obj}.Set(${args[0]}, ${args[1]})`,
  get: (obj, args) => `${obj}.Get(${args[0]})`,
  has: (obj, args) => `${obj}.Has(${args[0]})`,
  delete: (obj, args) => `${obj}.Delete(${args[0]})`,
  clear: (obj) => `${obj}.Clear()`,
  keys: (obj) => `${obj}.Keys()`,
  values: (obj) => `${obj}.Values()`,
  entries: (obj) => `${obj}.Entries()`
};

const setMethodHandlers: Record<string, MethodHandler> = {
  add: (obj, args) => `${obj}.Set(${args[0]}, struct{}{})`,
  has: (obj, args) => `${obj}.Has(${args[0]})`,
  delete: (obj, args) => `${obj}.Delete(${args[0]})`,
  clear: (obj) => `${obj}.Clear()`,
  values: (obj) => `${obj}.Keys()`,
  union: (obj, args) => `${obj}.Union(${args[0]})`,
  intersection: (obj, args) => `${obj}.Intersection(${args[0]})`,
  difference: (obj, args) => `${obj}.Difference(${args[0]})`,
  symmetricDifference: (obj, args) => `${obj}.SymmetricDifference(${args[0]})`,
  isSubsetOf: (obj, args) => `${obj}.IsSubsetOf(${args[0]})`,
  isSupersetOf: (obj, args) => `${args[0]}.IsSubsetOf(${obj})`,
  isDisjointFrom: (obj, args) => `(${obj}.Intersection(${args[0]}).Len() == 0)`
};

// A table entry only when the table itself has it (not Object.prototype's valueOf …)
function ownMethodHandler(table: Record<string, MethodHandler>, key: string): MethodHandler | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

function getDynamicCallHandler(caller: string, objectType?: string): CallHandler | null {
  if (promiseResolveName && caller === promiseResolveName) {
    // The first resolution wins; later ones are ignored (as in JS)
    return (_caller, args) => {
      // resolve() without a value: the channel type's zero value
      if (args.length === 0 || args[0] === 'nil') {
        useHelper('promise');
        return 'TnResolveZero(ch)';
      }
      return `select { case ch <- ${args[0]}: default: }`;
    };
  }
  if (promiseRejectName && caller === promiseRejectName) {
    return (_caller, args) => {
      useHelper('promise');
      return `TnReject(ch, ${args[0] ?? 'nil'})`;
    };
  }
  const dotIndex = caller.lastIndexOf('.');
  if (dotIndex !== -1) {
    const methodName = caller.substring(dotIndex + 1);

    // toString() is universal — works for any type including numbers and
    // objects; a class's own toString(…) is its method
    if (methodName === 'toString' && objectType === 'class') return null;
    const receiverClassName = classNameOfGoType(currentReceiverGoType ?? '');
    if (receiverClassName && findClassMethod(receiverClassName, methodName)) return null;
    if (methodName === 'toString') {
      return (c, args) => {
        const obj = c.substring(0, dotIndex);
        if (currentReceiverGoType === 'time.Time') {
          useHelper('date');
          return `TnDateString(${obj})`;
        }
        if (args.length > 0) {
          // bigint.toString(radix)
          if (currentReceiverGoType === '*tnbig.Int') return `${obj}.Text(int(${args[0]}))`;
          importedPackages.add('strconv');
          return `strconv.FormatInt(int64(${obj}), int(${args[0]}))`;
        }
        return jsStringOf(
          obj,
          objectType === 'number' || objectType === 'float64'
            ? 'float64'
            : currentReceiverGoType === 'interface{}' ||
                currentReceiverGoType?.startsWith('[]') ||
                currentReceiverGoType?.startsWith('*[]')
              ? currentReceiverGoType
              : undefined
        );
      };
    }

    if (methodName === 'toExponential') {
      return (c, args) => {
        useHelper('builtins');
        return `TnToExponential(${c.substring(0, dotIndex)}, ${args[0] ?? '0'}, ${args.length > 0})`;
      };
    }
    if (methodName === 'toPrecision') {
      return (c, args) => {
        importedPackages.add('strconv');
        return `strconv.FormatFloat(${c.substring(0, dotIndex)}, 'g', int(${args[0] ?? '-1'}), 64)`;
      };
    }
    // number.toFixed(digits)
    if (methodName === 'toFixed') {
      return (c, args) => {
        importedPackages.add('strconv');
        return `strconv.FormatFloat(${c.substring(0, dotIndex)}, 'f', int(${args[0] ?? '0'}), 64)`;
      };
    }

    // Class instances use their own methods — never intercept; nor do typed
    // objects (struct pointers), whose function fields are called
    if (objectType === 'class') return null;
    const receiverStruct = currentReceiverGoType?.startsWith('*') ? currentReceiverGoType.slice(1) : '';
    if (receiverStruct && (receiverStruct.startsWith('struct{') || isObjectTypeName(receiverStruct.replace(/\[.*$/, '')) || classNames.has(receiverStruct.replace(/\[.*$/, '')))) return null;

    let handler: MethodHandler | undefined;
    // `map` reaches here as `map_` (Go keywords get a trailing underscore)
    const helperName = methodName.endsWith('_') && goFieldName(methodName.slice(0, -1)) === methodName ? methodName.slice(0, -1) : methodName;
    if (currentReceiverGoType?.startsWith('chan ') && ITERATOR_HELPERS.has(helperName)) {
      const elementType = currentReceiverGoType.slice(5);
      const callbackNode = currentCallArgNodes[0];
      const extraArgs = currentCallArgNodes.slice(1);
      return (c, args) => visitIteratorHelper(c.substring(0, dotIndex), helperName, elementType, args, callbackNode, extraArgs);
    }
    if (currentReceiverGoType?.startsWith('*TnWeakRef[') && methodName === 'deref') {
      return (c) => `${c.substring(0, dotIndex)}.deref()`;
    }
    if (currentReceiverGoType === '*TnFinalizationRegistry' && (methodName === 'register' || methodName === 'unregister')) {
      return (c, args) => {
        const obj = c.substring(0, dotIndex);
        if (methodName === 'unregister') return `${obj}.unregister(${args[0]})`;
        return `TnRegistryRegister(${obj}, ${args[0]}, ${args[1] ?? 'nil'}, ${args[2] ?? 'nil'})`;
      };
    }
    if (objectType === 'string') {
      handler = ownMethodHandler(stringMethodHandlers, methodName);
    } else if (objectType === 'array') {
      handler = ownMethodHandler(arrayMethodHandlers, methodName);
    } else if (objectType === 'RegExp') {
      handler = ownMethodHandler(regexpMethodHandlers, methodName);
    } else if (objectType === 'Date') {
      handler = ownMethodHandler(dateMethodHandlers, methodName);
    } else if (objectType === 'Map') {
      handler = ownMethodHandler(mapMethodHandlers, methodName);
    } else if (objectType === 'Set') {
      handler = ownMethodHandler(setMethodHandlers, methodName);
    } else {
      // Unknown type: try both maps for backward compatibility
      handler =
        ownMethodHandler(stringMethodHandlers, methodName) ??
        ownMethodHandler(arrayMethodHandlers, methodName) ??
        ownMethodHandler(regexpMethodHandlers, methodName);
    }

    if (handler) {
      return (c, args) => {
        const obj = c.substring(0, dotIndex);
        return handler!(obj, args);
      };
    }
  }
  return null;
}

function getCallString(
  caller: string,
  args: string[],
  typeArgs: string = '',
  objectType?: string
): string {
  // Parentheses from casts like `(mod as any).fn(...)` are stripped for lookup
  // (own entries only: a plain-object lookup would also find Object.prototype members)
  const bare = caller.replace(/[()]/g, '');
  const handler =
    (Object.hasOwn(callHandlers, caller) ? callHandlers[caller] : undefined) ??
    (Object.hasOwn(callHandlers, bare) ? callHandlers[bare] : undefined) ??
    getDynamicCallHandler(caller, objectType);
  if (handler) {
    return handler(caller, args, typeArgs);
  }
  return `${caller}${typeArgs}(${args.join(', ')})`;
}

function getOperatorText(operator: AstNode | AstNode): string {
  switch (operator) {
    case 'PlusToken':
      return '+';
    case 'MinusToken':
      return '-';
    case 'TildeToken':
      return '~';
    case 'ExclamationToken':
      return '!';
    case 'PlusPlusToken':
      return '++';
    case 'MinusMinusToken':
      return '--';
    default:
      console.error('Did not find operator', operator);
      return '';
  }
}

function getTimerName(name: string): string {
  return `__timer_${name.replaceAll(' ', '_').replaceAll('"', '')}__`;
}

// typeof x: a constant when the Go type is known, a runtime check for any values
// typeof of the built-in globals TypeNative provides
const GLOBAL_TYPEOF: Record<string, string> = {
  process: 'object', console: 'object', globalThis: 'object', JSON: 'object', Math: 'object',
  Buffer: 'function', Uint8Array: 'function', btoa: 'function', atob: 'function', String: 'function',
  Number: 'function', Boolean: 'function', Symbol: 'function', Array: 'function', Object: 'function',
  Map: 'function', Set: 'function', Date: 'function', RegExp: 'function', Promise: 'function', Error: 'function',
  BigInt: 'function'
};

function visitTypeOf(node: AstNode): string {
  const operand = unwrapParentheses(node.expression);
  // typeof process.emitWarning / Uint8Array.fromBase64 / buf.toBase64: a
  // function the runtime provides (or 'undefined' when it has none)
  if (isPropertyAccessExpression(operand) && !hasQuestionDot(operand)) {
    const key = resolveNodeKey(operand);
    if (key && nodeRegistry.functions[key]) return toGoStringLiteral('function');
    const receiverType = inferExpressionType(operand.expression) ?? '';
    const classKey = nodeRegistry.classByGoType[receiverType];
    if (classKey && nodeRegistry.methods[`${classKey}#${operand.name.text}`]) return toGoStringLiteral('function');
    // a global object's member the runtime lacks
    const baseKey = resolveNodeKey(operand.expression);
    if (baseKey && isIdentifier(operand.expression) && GLOBAL_TYPEOF[operand.expression.text] && !inferExpressionType(operand)) {
      return toGoStringLiteral('undefined');
    }
  }
  if (isIdentifier(operand) && GLOBAL_TYPEOF[operand.text] && !variableGoTypes.has(operand.text) && !classNames.has(operand.text)) {
    return toGoStringLiteral(GLOBAL_TYPEOF[operand.text]);
  }
  const goType = inferExpressionType(node.expression);
  const known: Record<string, string> = { string: 'string', float64: 'number', bool: 'boolean', nil: 'undefined' };
  if (goType && known[goType]) return toGoStringLiteral(known[goType]);
  // (a function or object value held in a variable or field may be unset)
  const mayBeUnset = !isArrowFunction(operand) && !isFunctionExpression(operand) && !isObjectLiteralExpression(operand) && !isNewExpression(operand) &&
    !(isIdentifier(operand) && (declaredFunctions.has(operand.text) || classNames.has(operand.text)));
  if (goType?.startsWith('func')) {
    return mayBeUnset ? `func() string { if ${visit(node.expression)} == nil { return "undefined" }; return "function" }()` : '"function"';
  }
  if (goType?.startsWith('*') && !NULLABLE_PRIMITIVE_TYPES.includes(goType) && mayBeUnset) {
    return `func() string { if ${visit(node.expression)} == nil { return "undefined" }; return "object" }()`;
  }
  if (goType && goType !== 'interface{}' && !NULLABLE_PRIMITIVE_TYPES.includes(goType)) return '"object"';
  useHelper('typeOf');
  return `TnTypeOf(${visit(node.expression)})`;
}

// x.method(...) with an any receiver, as a call on the receiver cast to the type
// that defines the method (array or string); undefined for other methods
function castDynamicReceiverCall(node: AstNode): AstNode | undefined {
  if (!isPropertyAccessExpression(node.expression) || isAsExpression(node.expression.expression)) {
    return undefined;
  }
  if (!isDynamicValue(node.expression.expression)) return undefined;
  const method = node.expression.name.text;
  let castType: AstNode | undefined;
  // (an Array subclass's own method dispatches on the instance)
  if (MUTATING_ARRAY_METHODS.has(method) && classMethodNamed(method)) return undefined;
  if (ARRAY_ONLY_METHODS.has(method)) castType = { kind: 'ArrayType', elementType: { kind: 'AnyKeyword' } };
  else if (STRING_ONLY_METHODS.has(method)) castType = { kind: 'StringKeyword' };
  if (!castType) return undefined;
  const cast: AstNode = { kind: 'AsExpression', expression: node.expression.expression, type: castType };
  const access: AstNode = { ...node.expression, expression: cast };
  const call: AstNode = { ...node, expression: access };
  cast.parent = access;
  access.parent = call;
  return call;
}

function isObjectKeysOfDynamic(node: AstNode): boolean {
  return (
    isPropertyAccessExpression(node.expression) &&
    isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Object' &&
    node.expression.name.text === 'keys' &&
    !!node.arguments?.[0] &&
    isDynamicValue(node.arguments[0])
  );
}

// Array methods that change the array (on an any value they write it back)
// Calls being emitted both ways (array method / class method dispatch)
const dynamicArrayOrDispatch = new Set<AstNode>();
const MUTATING_ARRAY_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

// An identifier or property access (something a value can be written back to)
function isAssignableExpression(expr: AstNode): boolean {
  return isIdentifier(expr) || isPropertyAccessExpression(expr);
}

const ARRAY_ONLY_METHODS = new Set([
  'map', 'filter', 'some', 'every', 'find', 'findIndex', 'findLast', 'findLastIndex', 'forEach', 'reduce',
  'reduceRight', 'join', 'flat', 'flatMap', 'sort', 'reverse', 'toSorted', 'toReversed', 'fill', 'splice',
  'copyWithin', 'toSpliced'
]);
const STRING_ONLY_METHODS = new Set([
  'startsWith', 'endsWith', 'trim', 'trimStart', 'trimEnd', 'toUpperCase', 'toLowerCase', 'split',
  'replace', 'replaceAll', 'charAt', 'charCodeAt', 'padStart', 'padEnd', 'repeat', 'match', 'matchAll', 'search',
  'substring', 'lastIndexOf'
]);

// x.method(...) where x is any: re-visit with the receiver cast to the type the
// method belongs to; methods of both strings and arrays dispatch at runtime
function visitDynamicMethodCall(node: AstNode): string | undefined {
  if (isObjectKeysOfDynamic(node)) {
    useHelper('dynamic');
    return `TnKeys(${visit(node.arguments[0])})`;
  }
  if (!isPropertyAccessExpression(node.expression) || !isDynamicValue(node.expression.expression)) {
    return undefined;
  }
  const method = node.expression.name.text;
  // a mutating array method on an any value: on its elements, written back
  // (a class declaring the method — an Array subclass's own push — dispatches;
  // when the value may be either, it is decided at run time)
  if (MUTATING_ARRAY_METHODS.has(method) && isAssignableExpression(node.expression.expression) && classMethodNamed(method) && !dynamicArrayOrDispatch.has(node)) {
    dynamicArrayOrDispatch.add(node);
    const dispatched = visitDynamicDispatch(node);
    const arrayPath = visitDynamicMethodCall(node);
    dynamicArrayOrDispatch.delete(node);
    if (dispatched && arrayPath) {
      useHelper('dynamic');
      const receiverCode = visit(node.expression.expression);
      if (isDiscardedValue(node)) return `func() { if TnIsSlice(${receiverCode}) { ${arrayPath} } else { ${dispatched} } }()`;
      return `func() interface{} { if TnIsSlice(${receiverCode}) { return ${arrayPath} }; return ${dispatched} }()`;
    }
  }
  if (MUTATING_ARRAY_METHODS.has(method) && isAssignableExpression(node.expression.expression) && (!classMethodNamed(method) || dynamicArrayOrDispatch.has(node))) {
    useHelper('dynamic');
    const receiver = node.expression.expression;
    const elements = getTempName('arr');
    const local: AstNode = { kind: 'Identifier', text: elements, parent: node.expression };
    registerLocalVariable(elements, '[]interface{}');
    const call: AstNode = { ...node, expression: { ...node.expression, expression: local } };
    call.expression.parent = call;
    local.parent = call.expression;
    const resultType = inferExpressionType(call) ?? '';
    const writeBack = isPropertyAccessExpression(receiver) && hasDynamicProperties(receiver.expression)
      ? `TnSet(${visit(receiver.expression)}, ${toGoStringLiteral(receiver.name.text)}, ${elements})`
      : `${visit(receiver)} = ${elements}`;
    const op = visit(call);
    const read = `${elements} := TnAs[[]interface{}](${visit(receiver)})`;
    if (!resultType || isDiscardedValue(node)) return `func() { ${read}; ${op}; ${writeBack} }()`;
    return `func() ${resultType} { ${read}; __r := ${op}; ${writeBack}; return __r }()`;
  }
  const castCall = castDynamicReceiverCall(node);
  if (castCall) return visit(castCall);
  const dynamicHelpers: Record<string, string> = {
    includes: 'TnIncludes',
    indexOf: 'TnIndexOf',
    slice: 'TnSlice',
    concat: 'TnConcat',
    toString: 'TnJSString'
  };
  const helper = dynamicHelpers[method];
  // (a plain-object lookup also finds Object.prototype members)
  if (!helper || typeof helper !== 'string') return undefined;
  // x.toString(ctx) on a class instance held as any: its own method
  if (method === 'toString' && (node.arguments ?? []).length > 0 && classMethodNamed('toString')) return undefined;
  if (method === 'toString') useHelper('error');
  useHelper('dynamic');
  const args = (node.arguments ?? []).map((a: AstNode) => visit(a));
  return `${helper}(${[visit(node.expression.expression), ...args].join(', ')})`;
}

function isRegexReplaceCall(node: AstNode): boolean {
  if (!isCallExpression(node) || !isPropertyAccessExpression(node.expression)) return false;
  const method = node.expression.name.text;
  if (method !== 'replace' && method !== 'replaceAll') return false;
  const pattern = (node.arguments ?? [])[0];
  if (!pattern || (node.arguments ?? []).length < 2) return false;
  return (
    isRegularExpressionLiteral(pattern) ||
    inferExpressionType(pattern) === '*regexp.Regexp' ||
    resolveExpressionType(pattern) === 'RegExp'
  );
}

// Element type of the array whose .sort(fn) receives this comparator
function getSortComparatorElementType(fn: AstNode): string | undefined {
  const call = fn.parent;
  if (!isCallExpression(call) || call.arguments?.[0] !== fn) return undefined;
  if (!isPropertyAccessExpression(call.expression) || !['sort', 'toSorted'].includes(call.expression.name.text)) {
    return undefined;
  }
  const arrayType = inferExpressionType(call.expression.expression);
  return arrayType?.startsWith('[]') ? arrayType.slice(2) : undefined;
}

function isRegexReplacerCallback(fn: AstNode): boolean {
  if (!isArrowFunction(fn) && !isFunctionExpression(fn)) return false;
  const call = fn.parent;
  return !!call && isRegexReplaceCall(call) && call.arguments[1] === fn;
}

// JS replacement patterns → Go: $& (whole match) → ${0}, $1 → ${1}
function jsReplacementToGo(replacement: AstNode): string {
  if (!isStringLiteral(replacement) && !isNoSubstitutionTemplateLiteral(replacement)) {
    // (computed at run time: its $ patterns converted then)
    useHelper('jsReplacement');
    return `TnJSReplacement(${toGoValueOfType(replacement, 'string')})`;
  }
  const text: string = replacement.text;
  let goPattern = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';
    if (ch !== '$') {
      goPattern += ch;
    } else if (next === '$') {
      goPattern += '$$';
      i++;
    } else if (next === '&') {
      goPattern += '${0}';
      i++;
    } else if (next >= '0' && next <= '9') {
      let digits = next;
      i++;
      while (i + 1 < text.length && text[i + 1] >= '0' && text[i + 1] <= '9') {
        digits += text[i + 1];
        i++;
      }
      goPattern += '${' + digits + '}';
    } else {
      goPattern += '$$';
    }
  }
  return toGoStringLiteral(goPattern);
}

// str.replace(/re/g, x) → re.ReplaceAllString; without g only the first match is
// replaced; a function replacer receives (match, ...groups)
function visitRegexReplace(node: AstNode): string | undefined {
  if (!isRegexReplaceCall(node)) return undefined;
  const pattern = node.arguments[0];
  const replacement = node.arguments[1];
  const isGlobal =
    node.expression.name.text === 'replaceAll' ||
    (isRegularExpressionLiteral(pattern) &&
      pattern.text.substring(pattern.text.lastIndexOf('/') + 1).includes('g'));
  const target = toGoValueOfType(node.expression.expression, 'string');
  const reIsWrapper = inferExpressionType(pattern) === '*TnRegex';
  const re = visit(pattern);
  importedPackages.add('regexp');

  if (isArrowFunction(replacement) || isFunctionExpression(replacement)) {
    useHelper('regexReplaceFunc');
    const callback = visit(replacement);
    const groupArgs = (replacement.parameters ?? [])
      .map((_p: AstNode, index: number) => `TnGroup(__m, ${index})`)
      .join(', ');
    if (reIsWrapper) {
      useHelper('fancyRegex');
      return `TnRegexReplaceFuncW(${re}, ${target}, func(__m []string) string { return (${callback})(${groupArgs}) }, ${isGlobal})`;
    }
    return `TnRegexReplaceFunc(${re}, ${target}, func(__m []string) string { return (${callback})(${groupArgs}) }, ${isGlobal})`;
  }

  const goReplacement = jsReplacementToGo(replacement);
  if (reIsWrapper) {
    useHelper('fancyRegex');
    return isGlobal
      ? `TnRegexWrapReplaceAll(${re}, ${target}, ${goReplacement})`
      : `TnRegexWrapReplaceFirst(${re}, ${target}, ${goReplacement})`;
  }
  if (isGlobal) return `${re}.ReplaceAllString(${target}, ${goReplacement})`;
  useHelper('regexReplaceFirst');
  return `TnRegexReplaceFirst(${re}, ${target}, ${goReplacement})`;
}

function jsRegexFlagsToGo(flags: string): string {
  let goFlags = '';
  if (flags.includes('i')) goFlags += 'i';
  if (flags.includes('m')) goFlags += 'm';
  if (flags.includes('s')) goFlags += 's';
  return goFlags ? `(?${goFlags})` : '';
}

// Escapes a JS regex pattern for a Go string literal and rewrites JS named
// groups to RE2 syntax: (?<name> → (?P<name>
function translateJsRegexPattern(pattern: string): string {
  return pattern
    // \u{1F600} / \u00e9 → RE2's \x{…}
    .replace(/\\u\{([0-9A-Fa-f]+)\}/g, '\\x{$1}')
    .replace(/\\u([0-9A-Fa-f]{4})/g, '\\x{$1}')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\(\?<([A-Za-z_][A-Za-z0-9_]*)>/g, '(?P<$1>');
}

// Patterns the plain RE2 path cannot serve: /g state or RE2-unsupported syntax.
// Named groups (?<name> are fine (translated to (?P<name>), so strip them
// before testing for lookarounds (?= (?! (?<= (?<!
function needsStatefulRegex(pattern: string, flags: string): boolean {
  // /g and /y keep lastIndex state; /u keeps its flag for .flags
  if (flags.includes('g') || flags.includes('y') || flags.includes('u')) return true;
  const stripped = pattern.replace(/\(\?<[A-Za-z_][A-Za-z0-9_]*>/g, '');
  // (?= (?! and any remaining (?< (lookbehind) need the backtracker
  return /\\[1-9]|\(\?[=!<]/.test(stripped);
}

const REGEX_FLAG_PROPERTIES: Record<string, string> = {
  global: 'g', ignoreCase: 'i', multiline: 'm', dotAll: 's', unicode: 'u', sticky: 'y'
};

function inferRegexPropertyType(expr: AstNode): string | undefined {
  if (!isPropertyAccessExpression(expr)) return undefined;
  const receiverType = inferExpressionType(expr.expression);
  if (receiverType !== '*TnRegex' && receiverType !== '*regexp.Regexp') return undefined;
  const name = expr.name.text;
  if (name === 'lastIndex') return 'float64';
  if (name === 'source' || name === 'flags') return 'string';
  if (REGEX_FLAG_PROPERTIES[name]) return 'bool';
  return undefined;
}

function visitRegexProperty(node: AstNode): string | undefined {
  const type = inferRegexPropertyType(node);
  if (!type || isCallee(node)) return undefined;
  const name = node.name.text;
  const receiver = visit(node.expression);
  useHelper('fancyRegex');
  if (inferExpressionType(node.expression) === '*TnRegex') {
    if (name === 'lastIndex' || name === 'source' || name === 'flags') return `${receiver}.${name}`;
    importedPackages.add('strings');
    return `strings.Contains(${receiver}.flags, "${REGEX_FLAG_PROPERTIES[name]}")`;
  }
  // plain RE2 regexes have no state; their flags (i/m/s) lead the pattern
  if (name === 'lastIndex') return 'float64(0)';
  if (name === 'source') return `TnRegexpSource(${receiver})`;
  if (name === 'flags') return `TnRegexpFlags(${receiver})`;
  importedPackages.add('strings');
  return `strings.Contains(TnRegexpFlags(${receiver}), "${REGEX_FLAG_PROPERTIES[name]}")`;
}

// Whether an expression is used as a value (argument, initializer, element, assigned or returned)
function isValuePosition(node: AstNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (isCallExpression(parent)) return (parent.arguments ?? []).includes(node);
  if (isVariableDeclaration(parent) || isPropertyAssignment(parent)) return parent.initializer === node;
  if (isArrayLiteralExpression(parent)) return true;
  if (isReturnStatement(parent)) return true;
  return isBinaryExpression(parent) && parent.operatorToken.kind === 'EqualsToken' && parent.right === node;
}

function isJsxNode(node: AstNode): boolean {
  return node?.kind === 'JsxElement' || node?.kind === 'JsxSelfClosingElement' || node?.kind === 'JsxFragment';
}

// JSX text: lines trimmed at their inner edges, blank lines dropped, joined by a space
function cleanJsxText(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i > 0) line = line.replace(/^ +/, '');
    if (i < lines.length - 1) line = line.replace(/ +$/, '');
    if (line) kept.push(line);
  }
  return kept.join(' ');
}

// The children of an element as []interface{} (text, {expressions}, nested elements)
function visitJsxChildren(children: AstNode[]): string {
  const parts: string[] = [];
  for (const child of children) {
    if (child.kind === 'JsxText') {
      const text = cleanJsxText(child.text ?? '');
      if (text) parts.push(toGoStringLiteral(text));
    } else if (child.kind === 'JsxExpression') {
      if (child.expression) parts.push(visit(child.expression));
    } else {
      parts.push(visit(child));
    }
  }
  return `[]interface{}{${parts.join(', ')}}`;
}

// An attribute's value: name="x", name={expr}, or a bare name (true)
function getJsxAttributeValue(attribute: AstNode): AstNode {
  if (!attribute.initializer) {
    const trueNode: AstNode = { kind: 'TrueKeyword', parent: attribute };
    return trueNode;
  }
  return attribute.initializer.kind === 'JsxExpression' ? attribute.initializer.expression : attribute.initializer;
}

function visitJsx(node: AstNode): string {
  useHelper('jsx');
  if (node.kind === 'JsxFragment') return `TnJsxChildren(${visitJsxChildren(node.children ?? [])})`;
  const opening = node.kind === 'JsxElement' ? node.openingElement : node;
  const children: AstNode[] = node.kind === 'JsxElement' ? (node.children ?? []) : [];
  const tag = opening.tagName;
  const attributes: AstNode[] = (opening.attributes?.properties ?? []).filter((a: AstNode) => a.kind === 'JsxAttribute');
  // <div …> / <my-element …>: an HTML element
  if (isIdentifier(tag) && (/^[a-z]/.test(tag.text) || tag.text.includes('-'))) {
    const attrs = attributes.map(
      (a: AstNode) => `{${toGoStringLiteral(a.name.text)}, ${visit(getJsxAttributeValue(a))}}`
    );
    return `TnJsxElement(${toGoStringLiteral(tag.text)}, []TnJsxAttr{${attrs.join(', ')}}, ${visitJsxChildren(children)})`;
  }
  // <Card title="x">…</Card> → Card({ title: "x", children: … })
  const call: AstNode = { kind: 'CallExpression', expression: tag, arguments: [], parent: node.parent };
  tag.parent = call;
  const properties: AstNode[] = [];
  for (const a of attributes) {
    const name: AstNode = { kind: 'Identifier', text: a.name.text };
    const property: AstNode = { kind: 'PropertyAssignment', name, initializer: getJsxAttributeValue(a) };
    property.initializer.parent = property;
    name.parent = property;
    properties.push(property);
  }
  const meaningful = children.filter((c: AstNode) => c.kind !== 'JsxText' || cleanJsxText(c.text ?? ''));
  if (meaningful.length > 0) {
    const name: AstNode = { kind: 'Identifier', text: 'children' };
    const fragment: AstNode = { kind: 'JsxFragment', children };
    const property: AstNode = { kind: 'PropertyAssignment', name, initializer: fragment };
    fragment.parent = property;
    name.parent = property;
    properties.push(property);
  }
  const props: AstNode = { kind: 'ObjectLiteralExpression', properties, parent: call };
  for (const property of properties) property.parent = props;
  const declared = isIdentifier(tag) ? declaredFunctions.get(tag.text) : undefined;
  if (properties.length > 0 || (declared?.parameters ?? []).length > 0) {
    const args: AstNode[] = [props];
    call.arguments = args;
  }
  return visit(call);
}

function getDecorators(node: AstNode): AstNode[] {
  return (node.modifiers ?? []).filter((m: AstNode) => m.kind === 'Decorator');
}

// `this` inside a function / function expression (not a class member, not an arrow's)
function isThisOfPlainFunction(node: AstNode): boolean {
  for (let n = node.parent; n; n = n.parent) {
    if (isArrowFunction(n)) continue;
    if (isFunctionExpression(n) || isFunctionDeclaration(n)) return !isPropertyAssignment(n.parent);
    if (isMethodDeclaration(n) || isConstructorDeclaration(n) || isPropertyDeclaration(n) || isGetAccessor(n) || isSetAccessor(n) || isClassDeclaration(n)) return false;
  }
  return false;
}

// fn.name / fn.length known at compile time: declared functions, classes
// (not one with a static `name`) and variables holding functions
function functionNameAndLength(target: string): { name: string; arity: number } | undefined {
  const declared = declaredFunctions.get(target);
  if (declared && !variableGoTypes.has(target)) {
    const params: AstNode[] = declared.parameters ?? [];
    const firstOptional = params.findIndex((p) => !!p.initializer || !!p.questionToken || !!p.dotDotDotToken);
    return { name: target, arity: firstOptional < 0 ? params.length : firstOptional };
  }
  if (classNames.has(target) && !variableGoTypes.has(target)) {
    if (staticMemberOwner(target, 'name') || staticMemberOwner(target, 'length')) return undefined;
    return { name: target, arity: 0 };
  }
  const varType = variableGoTypes.get(target);
  if (varType?.startsWith('func(')) {
    const params = goFuncParamTypes(varType).filter((p) => !p.startsWith('...'));
    return { name: target, arity: params.length };
  }
  return undefined;
}

// The Go func type of a function value, including a declared function's name
function functionValueGoType(expr: AstNode): string {
  const inferred = inferExpressionType(expr);
  if (inferred?.startsWith('func(')) return inferred;
  if (isIdentifier(expr) && !variableGoTypes.has(expr.text)) {
    const declared = declaredFunctions.get(expr.text);
    if (declared && !declared.asteriskToken && !(declared.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) {
      return inferArrowFunctionGoType(declared);
    }
  }
  return '';
}

// The parameter types of a Go func type (`func(a float64, string) R` → ['float64', 'string'])
function goFuncParamTypes(funcType: string): string[] {
  funcType = funcType.trim();
  const result = goFuncReturnType(funcType);
  const paramList = funcType.slice(5, funcType.length - (result ? result.length + 1 : 0) - 1).trim();
  return splitGoParameters(paramList).map((p) => {
    const space = p.indexOf(' ');
    const first = space > 0 ? p.slice(0, space) : p;
    const isName = space > 0 && !['chan', 'func', 'map', 'struct', 'interface'].includes(first) && /^[A-Za-z_]\w*$/.test(first);
    return isName ? p.slice(space + 1) : p;
  });
}

// f.call(thisArg, a, b) → f(a, b); f.apply(thisArg, args) → f(args[0], args[1], …);
// f.bind(thisArg, a) → a closure over the bound arguments (this is TnThis)
function visitFunctionCallApply(node: AstNode): string | undefined {
  if (!isPropertyAccessExpression(node.expression)) return undefined;
  const method = node.expression.name.text;
  if (method !== 'call' && method !== 'apply' && method !== 'bind') return undefined;
  const fnType = functionValueGoType(node.expression.expression);
  if (!fnType) return undefined;
  const fn = visit(node.expression.expression);
  const args: AstNode[] = (node.arguments ?? []).slice(1);
  const params = goFuncParamTypes(fnType);
  const result = goFuncReturnType(fnType) ?? '';
  const variadic = params.length > 0 && params[params.length - 1].startsWith('...');
  if (method === 'apply') {
    if (!args[0]) return `${fn}()`;
    if (variadic) return `${fn}(${visit(args[0])}...)`;
    // a non-variadic Go func takes the array's elements one by one (missing ones are zero)
    useHelper('dynamic');
    const picks = params.map((p, i) => `TnAs[${p}](TnAt(__a, ${i}))`).join(', ');
    return `func() ${result} { __a := ${toGoValueOfType(args[0], '[]interface{}')}; ${result ? 'return ' : ''}${fn}(${picks}) }()`;
  }
  if (method === 'bind') {
    const bound = args.map((a, i) => `__b${i} := ${toGoValueOfType(a, params[i] ?? 'interface{}')}`);
    const rest = params.slice(args.length);
    const restDecl = rest.map((p, i) => `__p${i} ${p}`).join(', ');
    const forward = [...args.map((_, i) => `__b${i}`), ...rest.map((p, i) => (p.startsWith('...') ? `__p${i}...` : `__p${i}`))];
    const inner = `func(${restDecl}) ${result} { ${result ? 'return ' : ''}__f(${forward.join(', ')}) }`;
    const setup = [`__f := ${fn}`, ...bound].join('; ');
    return `func() func(${rest.join(', ')}) ${result} { ${setup}; return ${inner} }()`;
  }
  return `${fn}(${args.map((a) => (isSpreadElement(a) ? `${visit(a.expression)}...` : visit(a))).join(', ')})`;
}

// Whether a decorator call returns a value (a replacement), or only has effects
function decoratorReturnsValue(decorator: AstNode): boolean {
  let fnType = inferExpressionType(decorator.expression);
  // @factory(args): the decorator is what the factory returns
  const factoryCall = decorator.expression;
  if (isCallExpression(factoryCall) && isIdentifier(factoryCall.expression)) {
    const factory = declaredFunctions.get(factoryCall.expression.text);
    if (factory) fnType = factory.type ? getType(factory.type) : inferFunctionBodyReturnType(factory);
  }
  if (fnType?.startsWith('func(')) return !!goFuncReturnType(fnType);
  const call: AstNode = { kind: 'CallExpression', expression: decorator.expression, arguments: [], parent: decorator };
  const returnType = inferExpressionType(call);
  return !!returnType && returnType !== 'struct{}';
}

// The decorated method m: m__undecorated holds the body; m calls the decorated function
// (Owner_m__decorated) with TnThis set to the receiver
function emitDecoratedMethod(className: string, typeParamNames: string, member: AstNode, ownerClass: string): string {
  useHelper('decorators');
  useHelper('dynamic');
  const methodName = visit(member.name);
  const info = getFunctionParametersInfo(member.parameters ?? []);
  if (info.signature.includes('...')) {
    reportError(member, `Unsupported decorated method ${methodName}: rest or default parameters`);
    return '';
  }
  const names = splitGoParameters(info.signature).map((p) => p.slice(0, p.indexOf(' ')));
  const returnType = methodReturnGoType(member);
  const result = returnType ? ` ${returnType}` : '';
  const body = visit(member.body, { prefixBlockContent: info.prefixBlockContent });
  const call = `${ownerClass}_${methodName}__decorated(${names.join(', ')})`;
  const invoke = returnType ? `return TnAs[${returnType}](${call})` : call;
  if ((member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword')) {
    return `func ${className}_${methodName}__undecorated(${info.signature})${result} ${body}\n\nfunc ${className}_${methodName}(${info.signature})${result} {\n\t\t${invoke}\n\t}\n\n`;
  }
  return (
    `func (self *${className}${typeParamNames}) ${methodName}__undecorated(${info.signature})${result} ${body}\n\n` +
    `func (self *${className}${typeParamNames}) ${methodName}(${info.signature})${result} {\n\t\t__prevThis := TnThis\n\t\tTnThis = self\n\t\tdefer func() { TnThis = __prevThis }()\n\t\t${invoke}\n\t}\n\n`
  );
}

// Applies a class's decorators where it is defined (in source order): each decorated
// method's function is wrapped bottom-up, then class decorators run
function visitClassDecorators(node: AstNode): string {
  const className = visit(node.name);
  const statements: string[] = [];
  for (const member of node.members ?? []) {
    const decorators = getDecorators(member);
    if (decorators.length === 0) continue;
    if (!isMethodDeclaration(member) || !member.body) {
      reportError(member, `Unsupported decorator on ${className}: only method and class decorators are supported`);
      continue;
    }
    useHelper('decorators');
    useHelper('dynamic');
    const methodName = visit(member.name);
    const isStatic = (member.modifiers ?? []).some((m: AstNode) => m.kind === 'StaticKeyword');
    const isPrivate = member.name?.kind === 'PrivateIdentifier';
    const params = splitGoParameters(getFunctionParametersInfo(member.parameters ?? []).signature);
    const paramTypes = params.map((p) => p.slice(p.indexOf(' ') + 1));
    const returnType = methodReturnGoType(member);
    const varName = `${className}_${methodName}__decorated`;
    mainPackageVariables.push(`var ${varName} func(...interface{}) interface{}`);
    const args = paramTypes.map((t, i) => `TnAs[${t}](__args[${i}])`).join(', ');
    const target = isStatic
      ? `${className}_${methodName}__undecorated(${args})`
      : `TnThis.(interface{ ${methodName}__undecorated(${paramTypes.join(', ')})${returnType ? ` ${returnType}` : ''} }).${methodName}__undecorated(${args})`;
    statements.push(`${varName} = func(__args ...interface{}) interface{} { ${returnType ? `return ${target}` : `${target}; return nil`} }`);
    for (const decorator of [...decorators].reverse()) {
      const context = `&TnDecoratorContext{kind: "method", name: ${toGoStringLiteral(isPrivate ? member.name.text : methodName)}, static: ${isStatic}, private: ${isPrivate}}`;
      const call = `(${visit(decorator.expression)})(${varName}, ${context})`;
      statements.push(decoratorReturnsValue(decorator) ? `${varName} = TnDecorate(${varName}, ${call})` : call);
    }
  }
  for (const decorator of [...getDecorators(node)].reverse()) {
    useHelper('decorators');
    const context = `&TnDecoratorContext{kind: "class", name: ${toGoStringLiteral(className)}}`;
    const call = `(${visit(decorator.expression)})(New${className}, ${context})`;
    statements.push(decoratorReturnsValue(decorator) ? `TnDecorateClass(${call})` : call);
  }
  return statements.map((statement) => `${statement};\n\t`).join('');
}

function isStringRawTag(tag: AstNode): boolean {
  return isPropertyAccessExpression(tag) && isIdentifier(tag.expression) && tag.expression.text === 'String' && tag.name.text === 'raw';
}

// Whether a visited regex argument is the stateful wrapper type
function isTnRegexArg(arg: string): boolean {
  return arg.startsWith('TnRegexCompile(') || variableGoTypes.get(arg) === '*TnRegex';
}

// Built-in type names → Go types ([]interface{}: Array<T> takes T)
const BUILTIN_TYPE_NAMES: Record<string, string> = {
  Object: 'interface{}',
  Function: 'interface{}',
  Iterable: 'interface{}',
  IterableIterator: 'interface{}',
  Iterator: 'interface{}',
  ArrayLike: 'interface{}',
  PropertyKey: 'interface{}',
  Extract: 'interface{}',
  Exclude: 'interface{}',
  ReturnType: 'interface{}',
  Parameters: 'interface{}',
  InstanceType: 'interface{}',
  ConstructorParameters: 'interface{}',
  Awaited: 'interface{}',
  String: 'string',
  Number: 'float64',
  Boolean: 'bool',
  Array: '[]interface{}'
};

// Whether a class is (or inherits from) a subclass of Array: its elements
// live in an embedded TnArray (see the arraySubclass helper)
function isArraySubclass(name: string): boolean {
  for (let n = name, depth = 0; n && depth < 20; depth++) {
    const declaration = declaredClasses.get(n);
    if (!declaration) return false;
    for (const clause of declaration.heritageClauses ?? []) {
      const base = clause.token === 'ExtendsKeyword' ? clause.types?.[0]?.expression : undefined;
      if (isIdentifier(base) && base.text === 'Array' && !declaredClasses.has('Array')) return true;
    }
    n = classParentNames.get(n) ?? '';
  }
  return false;
}

// The class of an Array-subclass instance an expression statically holds
// (`this` inside one, super in one), or ''
function arraySubclassOf(expr: AstNode): string {
  if (!expr) return '';
  if (expr.kind === 'SuperKeyword' || expr.kind === 'ThisKeyword') {
    const owner = getEnclosingClassName(expr);
    return owner && isArraySubclass(owner) ? owner : '';
  }
  const cls = classNameOfGoType(inferExpressionType(expr) ?? '');
  return cls && isArraySubclass(cls) ? cls : '';
}

// Whether a class (or an ancestor) declares a method of this name
function classDeclaresMethod(name: string, method: string): boolean {
  return !!findClassMethod(name, method);
}

// The elements of an Array-subclass instance as a plain array reference
// (a synthetic TnArrayItems node, so the array lowerings apply)
function arrayItemsNode(expr: AstNode): AstNode {
  const receiver: AstNode = expr.kind === 'SuperKeyword' ? { ...expr, kind: 'ThisKeyword' } : expr;
  const items: AstNode = { kind: 'TnArrayItems', expression: receiver, parent: expr.parent, line: expr.line, column: expr.column };
  receiver.parent = items;
  return items;
}

// super(…args) of an Array subclass: the arguments as a []interface{}
function arrayInitArguments(args: AstNode[]): string {
  if (args.length === 1 && isSpreadElement(args[0])) {
    useHelper('dynamic');
    return `TnAs[[]interface{}](${visitSpreadSource(args[0].expression)})`;
  }
  return `[]interface{}{${args.map((a: AstNode) => visit(a)).join(', ')}}`;
}

function isDynamicGoType(goType: string | undefined): boolean {
  return goType === 'interface{}';
}

// A class's name, fields, methods, accessors and static members in the
// lookup tables (from its declaration, before or while it is emitted)
function registerClassMembers(node: AstNode): void {
  const className = visit(node.name!);
  classNames.add(className);
  declaredClasses.set(className, node);

  const properties = new Map<string, string>();
  const methods = new Map<string, string>();
  const unannotatedMethods: AstNode[] = [];
  for (const member of (node.members ?? [])) {
    const memberModifiers = (member as AstNode).modifiers;
    const isStatic = memberModifiers?.some((m) => m.kind === 'StaticKeyword');
    const memberName = memberKey(member.name);
    if (isPropertyDeclaration(member) && memberName) {
      if (isStatic) {
        classStaticProps.add(`${className}.${memberName}`);
      } else {
        properties.set(memberName, getPropertyDeclarationType(member));
      }
    }
    if (isMethodDeclaration(member) && memberName) {
      if (isStatic) {
        classStaticMethods.add(`${className}.${memberName}`);
      } else {
        methods.set(memberName, member.type ? getType(member.type) : 'interface{}');
        if (!member.type) unannotatedMethods.push(member);
      }
    }
    if ((isGetAccessor(member) || isSetAccessor(member)) && memberName && isStatic) {
      classStaticProps.add(`${className}.${memberName}`);
      if (isGetAccessor(member)) classStaticGetters.add(`${className}.${memberName}`);
    }
    if (isGetAccessor(member) && memberName && !isStatic) {
      classGetterMethods.add(`${className}.${memberName}`);
      properties.set(memberName, member.type ? getType(member.type) : methodReturnGoType(member) || 'interface{}');
    }
    if (isSetAccessor(member) && memberName && !isStatic) {
      classSetterMethods.add(`${className}.${memberName}`);
    }
    // *[Symbol.iterator]() — the class is iterable via a generator channel
    if (isMethodDeclaration(member) && member.asteriskToken) {
      const computed = member.name?.kind === 'ComputedPropertyName' ? member.name.expression : undefined;
      if (
        computed &&
        isPropertyAccessExpression(computed) &&
        isIdentifier(computed.expression) &&
        computed.expression.text === 'Symbol' &&
        computed.name.text === 'iterator'
      ) {
        classIteratorMethods.set(className, getGeneratorYieldType(member));
      }
    }
  }
  for (const param of getParameterProperties(node)) {
    properties.set(param.name.text, getParameterGoType(param));
  }
  // Inherited members resolve through the subclass instance too
  let parentClassName: string | null = null;
  for (const clause of node.heritageClauses ?? []) {
    if (clause.token === 'ExtendsKeyword') {
      parentClassName = nodeParentGoName(clause.types[0].expression) || visit(clause.types[0].expression);
    }
  }
  if (parentClassName && parentClassName !== 'Error' && !(parentClassName === 'Array' && !declaredClasses.has('Array'))) {
    classParentNames.set(className, parentClassName);
    // Inherited accessors are copied onto the subclass (see the class emitter)
    for (const accessors of [classGetterMethods, classSetterMethods]) {
      const inherited = [...accessors].filter((key) => key.startsWith(`${parentClassName}.`));
      for (const key of inherited) {
        const accessorName = key.slice(parentClassName.length + 1);
        if (!ownMemberNames(node).has(accessorName)) accessors.add(`${className}.${accessorName}`);
      }
    }
    const parent = declaredClasses.get(parentClassName);
    if (parent) {
      const parentMethods = classMethodReturnTypes.get(parentClassName);
      if (parentMethods) {
        for (const inheritedMethod of parentMethods.keys()) {
          if (!methods.has(inheritedMethod)) {
            const inheritedType = parentMethods.get(inheritedMethod)!;
            const ancestorMethod = findClassMethod(parentClassName, inheritedMethod);
            // see the copied methods in the class emitter
            methods.set(inheritedMethod, ancestorMethod && returnsOnlyThis(ancestorMethod) ? `*${className}` : inheritedType);
          }
        }
      }
      const parentProps = classPropertyTypes.get(parentClassName);
      if (parentProps) {
        for (const inheritedProp of parentProps.keys()) {
          if (!properties.has(inheritedProp)) {
            properties.set(inheritedProp, parentProps.get(inheritedProp)!);
          }
        }
      }
    }
  }
  classPropertyTypes.set(className, properties);
  classMethodReturnTypes.set(className, methods);
  // Inferred once the class's fields and declared methods are known
  // (`return this.x`, `return this.other()`)
  for (const member of unannotatedMethods) {
    const memberName = memberKey(member.name);
    if ((member.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) {
      methods.set(memberName, `chan ${getPromiseChannelType(member)}`);
      continue;
    }
    const inferred = methodReturnGoType(member);
    if (inferred) methods.set(memberName, inferred);
  }
}

function visitDynamicCompoundAssignment(node: AstNode, target: AstNode): string {
  useHelper('dynamic');
  const obj = getTempName('o');
  const key = isPropertyAccessExpression(target) ? toGoStringLiteral(target.name.text) : visit(target.argumentExpression);
  const read = isPropertyAccessExpression(target) ? `TnGet(${obj}, ${key})` : `TnIndex(${obj}, ${key})`;
  const write = (value: string) => (isPropertyAccessExpression(target) ? `TnSet(${obj}, ${key}, ${value})` : `TnSetIndex(${obj}, ${key}, ${value})`);
  const rhs = visit(node.right);
  const kind = node.operatorToken.kind;
  let step: string;
  if (kind === 'BarBarEqualsToken') step = `if !TnTruthy(${read}) { ${write(rhs)} }`;
  else if (kind === 'AmpersandAmpersandEqualsToken') step = `if TnTruthy(${read}) { ${write(rhs)} }`;
  else if (kind === 'QuestionQuestionEqualsToken') step = `if TnIsNil(${read}) { ${write(rhs)} }`;
  else if (kind === 'PlusEqualsToken') step = write(`TnDynamicAdd(${read}, ${rhs})`);
  else {
    const op = operatorTokenText(node.operatorToken).slice(0, -1);
    importedPackages.add('math');
    const combined =
      op === '%' ? `math.Mod(TnNumber(${read}), TnNumber(${rhs}))`
        : op === '**' ? `math.Pow(TnNumber(${read}), TnNumber(${rhs}))`
          : ['&', '|', '^', '<<', '>>', '>>>'].includes(op) ? `float64(TnInt32(TnNumber(${read})) ${op === '>>>' ? '>>' : op} TnInt32(TnNumber(${rhs})))`
            : `TnNumber(${read}) ${op} TnNumber(${rhs})`;
    step = write(combined);
  }
  return `func() { ${obj} := ${visit(target.expression)}; ${step} }()`;
}

// Whether a class of the program extends Error
function programExtendsError(): boolean {
  for (const declaration of declaredClasses.values()) {
    for (const clause of declaration.heritageClauses ?? []) {
      const base = clause.token === 'ExtendsKeyword' ? clause.types?.[0]?.expression : undefined;
      if (isIdentifier(base) && base.text === 'Error') return true;
    }
  }
  return false;
}

// Whether some class extends this one
function isPolymorphicClass(name: string): boolean {
  for (const parent of classParentNames.values()) if (parent === name) return true;
  return false;
}

// A type parameter of an enclosing class or method (erased to interface{}:
// Go methods can't take type parameters), not of a generic function
function isErasedTypeParameter(typeNode: AstNode, name: string): boolean {
  for (let n = typeNode.parent; n; n = n.parent) {
    if (!(n.typeParameters ?? []).some((tp: AstNode) => tp.name?.text === name)) continue;
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunction'].includes(n.kind)) {
      return erasedFunctionTypeParameters(n).has(name);
    }
    return ['ClassDeclaration', 'ClassExpression', 'MethodDeclaration', 'Constructor', 'GetAccessor', 'SetAccessor'].includes(n.kind);
  }
  return false;
}

// <B extends boolean> / number / string: the primitive B stands for
function primitiveTypeParameterConstraint(typeNode: AstNode, name: string): string | undefined {
  for (let n = typeNode.parent; n; n = n.parent) {
    const tp = (n.typeParameters ?? []).find((p: AstNode) => p.name?.text === name);
    if (!tp) continue;
    const kind = tp.constraint?.kind;
    return kind === 'BooleanKeyword' ? 'bool' : kind === 'NumberKeyword' ? 'float64' : kind === 'StringKeyword' ? 'string' : undefined;
  }
  return undefined;
}

// A generic function's type parameters Go can't infer from the arguments
// (in no parameter's Go type, as T in `values: (T | Node<T>)[]`): erased
function erasedFunctionTypeParameters(fn: AstNode): Set<string> {
  if (fn.tnErasedTypeParameters) return fn.tnErasedTypeParameters;
  // (while the parameter types are computed, none is erased)
  fn.tnErasedTypeParameters = new Set<string>();
  const paramTypes = (fn.parameters ?? []).map((p: AstNode) => (p.type ? getType(p.type) : '')).join(' ');
  const erased = new Set<string>();
  for (const tp of fn.typeParameters ?? []) {
    const name: string = tp.name?.text ?? '';
    // (also <B extends boolean>: B is its primitive)
    const primitive = ['BooleanKeyword', 'NumberKeyword', 'StringKeyword'].includes(tp.constraint?.kind);
    if (name && (primitive || !new RegExp(`\\b${name}\\b`).test(paramTypes))) erased.add(name);
  }
  fn.tnErasedTypeParameters = erased;
  return erased;
}

function getTypeParameters(
  typeParameters: any,
  owner?: AstNode
): string {
  if (owner && FUNCTION_LIKE_KINDS.has(owner.kind)) {
    const erased = erasedFunctionTypeParameters(owner);
    typeParameters = (typeParameters ?? []).filter((tp: AstNode) => !erased.has(tp.name?.text));
  }
  if (!typeParameters || typeParameters.length === 0) return '';
  const params = typeParameters.map((tp) => {
    const name = visit(tp.name);
    const constraint = tp.constraint ? getType(tp.constraint) : 'any';
    // Go constraints cannot require fields: object-type bounds become any
    return `${name} ${constraint.startsWith('*') ? 'any' : constraint}`;
  });
  return `[${params.join(', ')}]`;
}

function getTypeParameterNames(
  typeParameters: any
): string {
  if (!typeParameters || typeParameters.length === 0) return '';
  const names = typeParameters.map((tp) => visit(tp.name));
  return `[${names.join(', ')}]`;
}

function getTypeArguments(typeArguments: readonly AstNode[] | undefined): string {
  if (!typeArguments || typeArguments.length === 0) return '';
  const args = typeArguments.map((ta) => getType(ta));
  return `[${args.join(', ')}]`;
}

type FunctionParametersInfo = {
  signature: string;
  prefixBlockContent: string;
};

function getParameterGoType(param: AstNode): string {
  // Node callbacks / hooks: `any`-typed parameters take Node's types too
  const nodeHookTypes: string[] | undefined = param.parent?.tnParamTypes;
  if (nodeHookTypes && param.type?.kind === 'AnyKeyword' && !param.dotDotDotToken) {
    const hookType = nodeHookTypes[(param.parent.parameters ?? []).indexOf(param)];
    if (hookType) return hookType;
  }
  // Rest parameter: ...args — use variadic syntax
  if (param.dotDotDotToken) {
    if (param.type) {
      let baseType = getType(param.type);
      // If annotated as T[], the variadic type is T
      if (baseType.startsWith('[]')) baseType = baseType.slice(2);
      return `...${baseType}`;
    }
    return '...interface{}';
  }
  if (param.type) {
    let explicitType = getType(param.type);
    if (explicitType === ':') return 'interface{}';
    // Array parameters are references (mutations are visible to the caller) —
    // except unbound type parameters (Go generics), template-tag arrays, and
    // dynamic []interface{} (runtime helper arrays)
    if (explicitType.startsWith('[]') && explicitType !== '[]interface{}' && explicitType !== '[]byte' && !param.dotDotDotToken) {
      const isTaggedTemplateArray =
        isTypeReferenceNode(param.type) &&
        isIdentifier(param.type.typeName) &&
        param.type.typeName.text === 'TemplateStringsArray';
      if (!isUnboundGoType(explicitType.slice(2)) && !isTaggedTemplateArray) {
        explicitType = `*${explicitType}`;
      }
    }
    return param.questionToken ? makeNullableType(explicitType) : explicitType;
  }

  if (param.initializer) {
    const inferredType = inferExpressionType(param.initializer);
    if (inferredType && inferredType !== 'nil' && inferredType !== ':') {
      return inferredType;
    }
  }

  if (param.parent && isRegexReplacerCallback(param.parent)) return 'string';
  const sortElementType = param.parent ? getSortComparatorElementType(param.parent) : undefined;
  if (sortElementType) return sortElementType;
  const groupByType = groupByCallbackParamType(param);
  if (groupByType) return groupByType;
  const iteratorType = iteratorCallbackParamType(param);
  if (iteratorType) return iteratorType;

  const contextualFn = param.parent ? getContextualFunctionType(param.parent) : undefined;
  if (contextualFn) {
    const index = (param.parent.parameters ?? []).indexOf(param);
    const contextualParam = contextualFn.parameters?.[index];
    const contextualParamType = contextualParam?.type;
    if (contextualParamType) {
      const contextualGoType = getType(contextualParamType);
      return contextualParam.questionToken ? makeNullableType(contextualGoType) : contextualGoType;
    }
  }
  // f = (x) => …, where f holds a function: the parameter of f's Go type
  const fn = param.parent;
  const slot = fn?.parent && isBinaryExpression(fn.parent) && fn.parent.operatorToken.kind === 'EqualsToken' && fn.parent.right === fn
    ? inferExpressionType(fn.parent.left)
    : undefined;
  if (slot?.startsWith('func(') && (isArrowFunction(fn) || isFunctionExpression(fn))) {
    const slotParam = goFuncParamTypes(slot)[(fn.parameters ?? []).indexOf(param)];
    if (slotParam && !slotParam.startsWith('...')) return slotParam;
  }
  // Callbacks of Node APIs: parameter types from the registry
  const nodeParamTypes: string[] | undefined = param.parent?.tnParamTypes;
  if (nodeParamTypes) {
    const nodeParamType = nodeParamTypes[(param.parent.parameters ?? []).indexOf(param)];
    if (nodeParamType) return nodeParamType;
  }

  return 'interface{}';
}

// Parameters are variables of the function body: record their types (replacing
// whatever an earlier variable of the same name had)
function registerParameterType(param: AstNode): void {
  if (!isIdentifier(param.name)) return;
  const name = param.name.text;
  const goType = getParameterGoType(param);
  if (goType.startsWith('...')) {
    // Rest parameters own a fresh array; plain slice storage is fine
    variableGoTypes.set(name, `[]${goType.slice(3)}`);
    referenceArrays.delete(name);
  } else {
    // The signature type already carries the reference wrapper when needed
    variableGoTypes.set(name, goType);
    if (goType.startsWith('*[]')) referenceArrays.add(name);
    else referenceArrays.delete(name);
  }
  const category = param.type ? getTypeCategory(param.type) : undefined;
  if (category) variableTypes.set(name, category);
  else variableTypes.delete(name);
  const className = param.type ? getClassNameFromTypeNode(param.type) : undefined;
  if (className) variableClassNames.set(name, className);
  else variableClassNames.delete(name);
  narrowedVariables.delete(name);
  if (param.type) variableTypeNodes.set(name, param.type);
  else variableTypeNodes.delete(name);
}

// s.slice(a, xs[i]) / substring: an end read past an array's end is
// undefined (the string's end), not 0 — the end as a *float64, nil then
function optionalEndArgument(args: string[]): string | undefined {
  const endNode = currentCallArgNodes[1];
  if (!endNode || args.length < 2) return undefined;
  const u = unwrapParentheses(endNode);
  if (inferExpressionType(endNode) === '*float64') return args[1];
  if (!isElementAccessExpression(u) || hasQuestionDot(u)) return undefined;
  const arrayType = (inferExpressionType(u.expression) ?? '').replace(/^\*\[\]/, '[]');
  if (arrayType !== '[]float64') return undefined;
  useHelper('dynamic');
  useHelper('numTruthy');
  return `TnAtPtr(${visit(u.expression)}, ${numericIndex(u.argumentExpression)})`;
}

// Parameter kinds of built-in string / array methods: s(tring), n(umber)
const STRING_METHOD_PARAMS: Record<string, string> = {
  indexOf: 'sn', lastIndexOf: 'sn', includes: 'sn', startsWith: 'sn', endsWith: 'sn', slice: 'nn',
  substring: 'nn', substr: 'nn', charAt: 'n', charCodeAt: 'n', codePointAt: 'n', at: 'n', padStart: 'ns',
  padEnd: 'ns', repeat: 'n', localeCompare: 's'
};
const ARRAY_METHOD_PARAMS: Record<string, string> = { slice: 'nn', at: 'n', join: 's', splice: 'nn' };

// Arguments of a built-in method that are dynamic (any) or number | undefined
// where it takes a string or a number: converted the way JS does (String(x),
// Number(x); an undefined number is NaN)
function coerceBuiltinMethodArguments(node: AstNode, objectType: string, args: string[], argTypes: (string | undefined)[]): void {
  if (!isPropertyAccessExpression(node.expression)) return;
  const kinds = (objectType === 'string' ? STRING_METHOD_PARAMS : ARRAY_METHOD_PARAMS)[node.expression.name.text];
  if (!kinds || !Object.hasOwn(objectType === 'string' ? STRING_METHOD_PARAMS : ARRAY_METHOD_PARAMS, node.expression.name.text)) return;
  for (let i = 0; i < args.length && i < kinds.length; i++) {
    const argType = argTypes[i];
    if (kinds[i] === 's' && argType === 'interface{}') {
      useHelper('dynamic');
      args[i] = `TnJSString(${args[i]})`;
      argTypes[i] = 'string';
    } else if (kinds[i] === 'n' && argType === 'interface{}') {
      useHelper('dynamic');
      args[i] = `TnNumber(${args[i]})`;
      argTypes[i] = 'float64';
    } else if (kinds[i] === 'n' && argType === '*float64') {
      useHelper('numTruthy');
      args[i] = `TnNumPtr(${args[i]})`;
      argTypes[i] = 'float64';
    }
  }
}

// An array literal element that is dynamic, or of another object type, where
// the literal's elements are typed
function arrayElementNeedsConversion(element: AstNode, elementType: string): boolean {
  if (isSpreadElement(element)) return false;
  // (null among any values is JS null)
  if (elementType === 'interface{}') return unwrapParentheses(element).kind === 'NullKeyword';
  const t = inferExpressionType(element);
  return t === 'interface{}' || (!!t && t !== elementType && t.startsWith('*') && elementType.startsWith('*'));
}

// isNaN(x), isFinite(x), Math.*(x…): their arguments convert to numbers
// (Number(x)), so dynamic and number | undefined values are converted first
function coerceNumericGlobalArguments(node: AstNode, args: string[], argTypes: (string | undefined)[]): void {
  const callee = node.expression;
  const isGlobal = (name: string) => isIdentifier(callee) && callee.text === name && !variableGoTypes.has(name) && !declaredFunctions.has(name);
  const isMath =
    isPropertyAccessExpression(callee) && isIdentifier(callee.expression) && callee.expression.text === 'Math' && !variableGoTypes.has('Math');
  if (!isMath && !isGlobal('isNaN') && !isGlobal('isFinite')) return;
  for (let i = 0; i < args.length; i++) {
    if (argTypes[i] === 'interface{}') {
      useHelper('dynamic');
      args[i] = `TnNumber(${args[i]})`;
      argTypes[i] = 'float64';
    } else if (argTypes[i] === '*float64') {
      useHelper('numTruthy');
      args[i] = `TnNumPtr(${args[i]})`;
      argTypes[i] = 'float64';
    }
  }
}

// x.values().next() (also keys() / entries()): the collection's first
// iteration result, { value, done } — the iterators of Maps, Sets and arrays
// are their element arrays here
function isFirstIterationCall(node: AstNode): boolean {
  if (!isCallExpression(node) || (node.arguments ?? []).length > 0 || !isPropertyAccessExpression(node.expression)) return false;
  if (node.expression.name.text !== 'next') return false;
  const source = node.expression.expression;
  return (
    isCallExpression(source) && (source.arguments ?? []).length === 0 && isPropertyAccessExpression(source.expression) &&
    ['values', 'keys', 'entries'].includes(source.expression.name.text)
  );
}

function visitFirstIteration(node: AstNode): string | undefined {
  if (!isFirstIterationCall(node)) return undefined;
  const source = node.expression.expression;
  const sourceType = (inferExpressionType(source) ?? '').replace(/^\*\[\]/, '[]');
  useHelper('iterators');
  if (sourceType.startsWith('[]')) return `TnIterFirst(${visit(source)})`;
  useHelper('arraySubclass');
  return `TnIterFirst(TnToArray(${visit(source)}))`;
}

// An array / string index as a number: a dynamic one converted (Number(x)),
// an undefined one NaN
function numericIndex(index: AstNode): string {
  const indexType = inferExpressionType(index);
  if (indexType === 'interface{}') {
    useHelper('dynamic');
    return `TnNumber(${visit(index)})`;
  }
  if (indexType === '*float64') {
    useHelper('numTruthy');
    return `TnNumPtr(${visit(index)})`;
  }
  return visit(index);
}

// The primitive Go type of member `name` of `source` when its type
// node binds it through a type argument (Scalar<number>'s value), else undefined
function genericMemberPrimitive(source: AstNode, name: AstNode): string | undefined {
  if (!isIdentifier(name)) return undefined;
  const sourceTypeNode = getExpressionTypeNode(source);
  if (!sourceTypeNode || !isTypeReferenceNode(sourceTypeNode) || (sourceTypeNode.typeArguments ?? []).length === 0) return undefined;
  const member = getMemberTypeNode(sourceTypeNode, name.text);
  const goType = member ? getType(member) : '';
  return ['string', 'float64', 'bool'].includes(goType) ? goType : undefined;
}

// The TS name a binding element declares (type tables are keyed by it, not
// by its Go name: `type` is emitted as a renamed identifier)
function bindingName(element: AstNode, goName: string): string {
  const name = element?.name ?? element;
  return isIdentifier(name) ? name.text : goName;
}

// Whether the code around a declaration tests variable `name` for undefined
// or null (x === undefined, x ?? y, switch (…x…) { case undefined: })
function comparedToNullish(name: string, declaration: AstNode): boolean {
  let scope = declaration.parent;
  while (scope && !FUNCTION_LIKE_KINDS.has(scope.kind) && !isSourceFile(scope)) scope = scope.parent;
  if (!scope) return false;
  const mentions = (n: AstNode | undefined) => !!n && containsNode(n, (m) => isIdentifier(m) && m.text === name);
  const isNameRef = (n: AstNode) => isIdentifier(unwrapParentheses(n)) && unwrapParentheses(n).text === name;
  return containsNode(scope.body ?? scope, (n) => {
    if (isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (op === 'QuestionQuestionToken' || op === 'QuestionQuestionEqualsToken') return isNameRef(n.left);
      if (['EqualsEqualsEqualsToken', 'ExclamationEqualsEqualsToken', 'EqualsEqualsToken', 'ExclamationEqualsToken'].includes(op)) {
        return (isNameRef(n.left) && isNilLiteral(n.right)) || (isNameRef(n.right) && isNilLiteral(n.left));
      }
    }
    if (n.kind === 'SwitchStatement' && mentions(n.expression)) {
      return (n.caseBlock?.clauses ?? []).some((c: AstNode) => c.kind === 'CaseClause' && isNilLiteral(c.expression));
    }
    return false;
  });
}

// A top-level function whose result is an array it found in its arguments
// (`return parent.start`, `return it.sep ?? it.start`): JS returns that very
// array, so a caller's push / splice changes it. Go slices are values, so the
// function returns a *[]T reference to the field instead (and its calls read
// through it). Only for functions never used as values.
const arrayReferenceCache = new Map<AstNode, boolean>();
function returnsArrayReference(fn: AstNode | undefined): boolean {
  if (!fn || !isFunctionDeclaration(fn) || !fn.body || !isBlock(fn.body) || fn.asteriskToken || !fn.name) return false;
  const cached = arrayReferenceCache.get(fn);
  if (cached !== undefined) return cached;
  arrayReferenceCache.set(fn, false);
  if ((fn.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) return false;
  const returns = collectReturnStatements(fn.body).map((r: AstNode) => r.expression).filter((e: AstNode | undefined) => !!e) as AstNode[];
  const isField = (e: AstNode): boolean => {
    const u = unwrapParentheses(e);
    if (isPropertyAccessExpression(u)) return !hasQuestionDot(u);
    if (isBinaryExpression(u) && u.operatorToken.kind === 'QuestionQuestionToken') return isField(u.left) && isField(u.right);
    return false;
  };
  if (!returns.some(isField)) return false;
  const supported = (e: AstNode): boolean => {
    const u = unwrapParentheses(e);
    return isField(u) || (isArrayLiteralExpression(u) && !(u.elements ?? []).some((el: AstNode) => isSpreadElement(el)));
  };
  if (!returns.every(supported)) return false;
  const name = fn.name.text;
  const usedAsValue = [...linkedModules.values()].some((m) => containsNode(m.ast, (n) =>
    isIdentifier(n) && n.text === name && n !== fn.name && !(isCallExpression(n.parent) && n.parent.expression === n) && !isFieldNameIdentifier(n) &&
    !['ImportSpecifier', 'ExportSpecifier'].includes(n.parent?.kind)
  ));
  if (usedAsValue) return false;
  const resultType = withFunctionScopeTypes(fn, () => inferFunctionBodyReturnType(fn) ?? '');
  const result = resultType.startsWith('[]') && resultType !== '[]byte';
  arrayReferenceCache.set(fn, result);
  return result;
}

// A returned array as a reference: a field's address, a new array's
function arrayReferenceOf(expr: AstNode, sliceType: string): string {
  const u = unwrapParentheses(expr);
  const goType = sliceType.replace(/^\*/, '');
  // (a field of a struct pointer is addressable, whatever the pointer's expression)
  if (isPropertyAccessExpression(u) && !hasQuestionDot(u) && inferExpressionType(u) === goType && (inferExpressionType(u.expression) ?? '').startsWith('*')) {
    const field = visit(u);
    if (!field.endsWith(')') && !field.startsWith('TnGet')) return `&(${field})`;
  }
  if (isBinaryExpression(u) && u.operatorToken.kind === 'QuestionQuestionToken') {
    // (a ?? b: a when it is set)
    return `func() *${goType} { if __r := ${arrayReferenceOf(u.left, goType)}; *__r != nil { return __r }; return ${arrayReferenceOf(u.right, goType)} }()`;
  }
  return `func() *${goType} { __v := ${toGoValueOfType(u, goType)}; return &__v }()`;
}

// `_ = x` for each name a destructuring declaration binds in a function
// (JS allows locals that are never read; Go does not)
function destructuredUseMarks(declaration: AstNode): string[] {
  const statement = declaration.parent?.parent;
  if (isVariableStatement(statement) && isSourceFile(statement.parent)) return [];
  const loop = declaration.parent?.parent;
  if (loop && (isForStatement(loop) || isForOfStatement(loop) || isForInStatement(loop))) return [];
  const names: string[] = [];
  for (const el of declaration.name.elements ?? []) {
    if (isOmittedExpression(el) || !isIdentifier(el.name)) continue;
    const name = getSafeName(el.name.text);
    if (name !== '_') names.push(`_ = ${name}`);
  }
  return names;
}

// The constructor `new C(…)` runs: C's own, else the nearest ancestor's
function classConstructorDeclaration(className: string): AstNode | undefined {
  for (let name: string | undefined = className; name; name = classParentNames.get(name)) {
    const ctor = (declaredClasses.get(name)?.members ?? []).find((m: AstNode) => isConstructorDeclaration(m) && !!m.body);
    if (ctor) return ctor;
  }
  return undefined;
}

// Constructor parameter properties: constructor(private x: T) declares field x
function getParameterProperties(classNode: AstNode): AstNode[] {
  const ctor = (classNode.members ?? []).find((m: AstNode) => isConstructorDeclaration(m) && !!m.body);
  return (ctor?.parameters ?? []).filter(
    (p: AstNode) => isIdentifier(p.name) && (p.modifiers ?? []).length > 0
  );
}

// Argument types of map.get/has/set/delete, set.add/has/delete, array.push
function getCollectionArgumentTypes(node: AstNode): string[] | undefined {
  if (!isPropertyAccessExpression(node.expression)) return undefined;
  const method = node.expression.name.text;
  let receiverType = inferExpressionType(node.expression.expression);
  // this.items.push(x): the field's declared type
  if (!receiverType) {
    const declared = getExpressionTypeNode(node.expression.expression);
    if (declared) receiverType = getType(declared);
  }
  if (receiverType?.startsWith('*TnMap[')) {
    const keyType = extractMapKeyType(receiverType);
    const valueType = extractMapValueType(receiverType);
    if (valueType === 'struct{}' && ['add', 'has', 'delete'].includes(method)) return [keyType];
    if (['get', 'has', 'delete'].includes(method)) return [keyType];
    if (method === 'set') return [keyType, valueType];
  }
  if (receiverType === '*regexp.Regexp' && (method === 'test' || method === 'exec')) return ['string'];
  if (receiverType?.startsWith('[]') && method === 'push') {
    return (node.arguments ?? []).map(() => receiverType.slice(2));
  }
  return undefined;
}

// TS lets a function literal omit trailing parameters of its contextual type;
// Go func types must match exactly, so the omitted ones are added as unused `_`
// Arguments of a call; for calls to declared functions, values are converted to
// the parameter types (nullable primitives boxed) and omitted optional
// parameters are passed as zero values (nil for pointers)
// A call to a function that returns nothing (declared `void`, or a declared
// function without a value-returning `return`)
function isVoidCall(expr: AstNode): boolean {
  expr = unwrapParentheses(expr);
  if (!isCallExpression(expr)) return false;
  const fn = getCalleeSignature(expr);
  if (!fn) return false;
  if (fn.type) return fn.type.kind === 'VoidKeyword';
  if (!fn.body || !isBlock(fn.body) || (fn.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword')) return false;
  // (`return other()` of another void call returns nothing too)
  if (voidCallCheck.has(fn)) return true;
  voidCallCheck.add(fn);
  const isVoid = collectReturnStatements(fn.body).every((r: AstNode) => !r.expression || isVoidCall(r.expression));
  voidCallCheck.delete(fn);
  return isVoid;
}

const voidCallCheck = new Set<AstNode>();

// The declaration (or function type) of a called identifier: a declared
// function, or a variable annotated with a function type
function getCalleeSignature(call: AstNode): AstNode | undefined {
  // obj.m(…) on a class instance: the method's declaration
  if (isPropertyAccessExpression(call.expression) && isIdentifier(call.expression.name)) {
    // (super.m(…): the parent class's method)
    const receiverClass = call.expression.expression.kind === 'SuperKeyword'
      ? classParentNames.get(getEnclosingClassName(call) ?? '') ?? ''
      : classNameOfGoType(inferExpressionType(call.expression.expression) ?? '');
    const method = receiverClass ? findClassMethod(receiverClass, call.expression.name.text) : undefined;
    if (method?.body) return method;
    // a function-typed member of the receiver's declared type (or of the
    // interface / object type its Go type names)
    let receiverTypeNode = getExpressionTypeNode(call.expression.expression);
    if (!receiverTypeNode) {
      const receiverGoType = inferExpressionType(call.expression.expression) ?? '';
      const typeName = receiverGoType.startsWith('*') ? receiverGoType.slice(1).replace(/\[.*$/, '') : '';
      if (typeName && (declaredInterfaces.has(typeName) || declaredTypeAliases.has(typeName) || declaredClasses.has(typeName))) {
        receiverTypeNode = { kind: 'TypeReference', typeName: { kind: 'Identifier', text: typeName } };
      }
    }
    const member = receiverTypeNode ? resolveTypeNode(getMemberTypeNode(receiverTypeNode, call.expression.name.text)) : undefined;
    return isFunctionTypeNode(member) ? member : undefined;
  }
  if (!isIdentifier(call.expression)) return undefined;
  const declared = declaredFunctions.get(call.expression.text);
  if (declared) return declared;
  const fnType = resolveTypeNode(variableTypeNodes.get(call.expression.text));
  return isFunctionTypeNode(fnType) ? fnType : undefined;
}

function visitCallArguments(node: AstNode): string[] {
  const args: AstNode[] = node.arguments ?? [];
  const collectionTypes = getCollectionArgumentTypes(node);
  if (collectionTypes) return args.map((arg, index) => toGoValueOfType(arg, collectionTypes[index]));
  const fn = getCalleeSignature(node);
  // a function type's parameters are its Go func type's (arrays by value)
  if (fn && isFunctionTypeNode(fn)) {
    const paramTypes = goFuncParamTypes(getType(fn));
    if (!paramTypes.some((t) => t.startsWith('...'))) {
      const converted = args.map((arg, index) =>
        paramTypes[index] && !isSpreadElement(arg) ? toGoValueOfType(arg, paramTypes[index]) : visit(arg)
      );
      // omitted optional parameters are zero values (nil for pointers)
      const fnParams: AstNode[] = fn.parameters ?? [];
      for (let i = args.length; i < fnParams.length && i < paramTypes.length; i++) {
        if (!fnParams[i].questionToken) break;
        converted.push(`*new(${paramTypes[i]})`);
      }
      return converted;
    }
  }
  if (!fn) {
    // A function-valued variable or field without a declared type
    // (const f = (xs: number[]) => …): its Go func type's parameters
    const calleeType = isIdentifier(node.expression) || isPropertyAccessExpression(node.expression)
      ? inferExpressionType(node.expression)
      : undefined;
    if (calleeType?.startsWith('func(') && !calleeType.includes('...')) {
      const paramTypes = goFuncParamTypes(calleeType);
      return args.map((arg, index) =>
        paramTypes[index] && !isSpreadElement(arg) ? toGoValueOfType(arg, paramTypes[index]) : visit(arg)
      );
    }
    return args.map((a) => visit(a));
  }
  const params: AstNode[] = fn.parameters ?? [];
  // (a parameter typed by the callee's own type parameter is left to Go's inference)
  const typeParamNames: string[] = (fn.typeParameters ?? []).map((tp: AstNode) => tp.name?.text ?? '');
  const result = args.map((arg, index) => {
    const param = params[index];
    if (!param || param.dotDotDotToken) return visit(arg);
    const paramType = getParameterGoType(param);
    if (typeParamNames.some((n) => n && new RegExp(`\\b${n}\\b`).test(paramType))) return visit(arg);
    return toGoValueOfType(arg, paramType);
  });
  for (let i = args.length; i < params.length; i++) {
    const param = params[i];
    if (!param.questionToken || param.initializer || param.dotDotDotToken) break;
    result.push(`*new(${getParameterGoType(param)})`);
  }
  return result;
}

function withContextualParameters(
  fn: AstNode,
  info: FunctionParametersInfo
): FunctionParametersInfo {
  if (usesArgumentsObject(fn)) return withArgumentsObject(fn, info, true);
  const contextualFn = getContextualFunctionType(fn);
  const declaredCount = (fn.parameters ?? []).length;
  const contextualParams: AstNode[] = contextualFn?.parameters ?? [];
  if (contextualParams.length <= declaredCount || info.signature.includes('...')) return info;
  const extra = contextualParams
    .slice(declaredCount)
    .map((p) => `_ ${p.dotDotDotToken ? '...' : ''}${p.type ? (p.questionToken && !p.dotDotDotToken ? makeNullableType(getType(p.type)) : getType(p.type)) : 'interface{}'}`);
  const signature = [info.signature, ...extra].filter((part) => part).join(', ');
  return { ...info, signature };
}

// `arguments` in a function: a []interface{} of the arguments passed (a
// method's signature stays as declared: no extra arguments)
function withArgumentsObject(fn: AstNode, info: FunctionParametersInfo, allowExtra: boolean): FunctionParametersInfo {
  // the arguments passed: omitted optional parameters (nil) at the end are
  // not counted; a rest parameter's elements follow the named ones
  const params: AstNode[] = fn.parameters ?? [];
  const rest = params.length > 0 && params[params.length - 1].dotDotDotToken ? params[params.length - 1] : undefined;
  const named = (rest ? params.slice(0, -1) : params).map((p: AstNode) => getParameterName(p, params));
  const required = (rest ? params.slice(0, -1) : params).filter((p: AstNode) => !p.questionToken && !p.initializer).length;
  useHelper('dynamic');
  registerLocalVariable('arguments', '[]interface{}');
  if (rest || info.signature.includes('...') || !allowExtra) {
    const restName = rest ? getParameterName(rest, params) : '';
    const extra = rest ? `func() []interface{} { __out := []interface{}{}; for _, __v := range ${restName} { __out = append(__out, __v) }; return __out }()...` : '';
    return {
      ...info,
      prefixBlockContent: `${info.prefixBlockContent}arguments := TnArguments(${required}, []interface{}{${named.join(', ')}}${extra ? `, ${extra}` : ''})\n\t\t_ = arguments\n\t\t`
    };
  }
  return {
    signature: [info.signature, '__arguments ...interface{}'].filter((part) => part).join(', '),
    prefixBlockContent: `${info.prefixBlockContent}arguments := TnArguments(${required}, []interface{}{${named.join(', ')}}, __arguments...)\n\t\t_ = arguments\n\t\t`
  };
}

// A non-arrow function whose own body reads `arguments` (arrows see their parent's)
function usesArgumentsObject(fn: AstNode): boolean {
  if (isArrowFunction(fn) || !fn.body) return false;
  return containsNode(fn.body, (n) => {
    if (n !== fn.body && (isFunctionDeclaration(n) || isFunctionExpression(n) || isMethodDeclaration(n))) return false;
    return isIdentifier(n) && n.text === 'arguments' && !isFieldNameIdentifier(n);
  });
}

// Destructured parameters ({ a, b }: T / [x, y]: T[]) get a temporary name
function getParameterName(param: AstNode, parameters: AstNode[]): string {
  if (isIdentifier(param.name)) return getSafeName(param.name.text);
  return `__param${parameters.indexOf(param)}`;
}

// Unpacks destructured parameters at the start of the function body
function getParameterDestructuring(parameters: AstNode[]): string {
  let code = '';
  for (const param of parameters) {
    if (isIdentifier(param.name)) continue;
    const source = getParameterName(param, parameters);
    const paramType = getParameterGoType(param);
    (param.name.elements ?? []).forEach((el: AstNode, index: number) => {
      if (isOmittedExpression(el) || !isIdentifier(el.name)) return;
      let value: string;
      let valueType: string | undefined;
      let memberTypeNode: AstNode | undefined;
      if (isObjectBindingPattern(param.name)) {
        const field = (el.propertyName ?? el.name).text;
        const structName = paramType.replace(/^\*/, '');
        valueType =
          interfacePropertyTypes.get(structName)?.get(field) ??
          classPropertyTypes.get(structName)?.get(field) ??
          getStructFieldGoType(structName, field) ??
          (paramType === 'interface{}' ? 'interface{}' : undefined);
        value = paramType === 'interface{}' ? `TnGetRef(${source}, ${toGoStringLiteral(field)})` : `${source}.${goFieldName(field)}`;
        if (paramType === 'interface{}') useHelper('dynamic');
        memberTypeNode = param.type ? getMemberTypeNode(param.type, field) : undefined;
      } else {
        value = `${source}[${index}]`;
        valueType = paramType.startsWith('[]') ? paramType.slice(2) : undefined;
      }
      // { x = 5 }: a missing (undefined) property takes the default
      if (el.initializer) {
        const declared = valueType && NULLABLE_PRIMITIVE_TYPES.includes(valueType) ? valueType.slice(1) : valueType;
        const defType = declared && declared !== 'interface{}' ? declared : (inferExpressionType(el.initializer) ?? 'interface{}');
        useHelper('dynamic');
        value = `func() ${defType} { __v := interface{}(${value}); if TnIsNil(__v) { return ${toGoValueOfType(el.initializer, defType)} }; return TnAs[${defType}](__v) }()`;
        valueType = defType;
      }
      registerLocalVariable(el.name.text, valueType);
      if (memberTypeNode) variableTypeNodes.set(el.name.text, memberTypeNode);
      code += `${visit(el.name)} := ${value}\n\t\t_ = ${visit(el.name)}\n\t\t`;
    });
  }
  return code;
}

function getFunctionParametersInfo(
  parameters: AstNode[]
): FunctionParametersInfo {
  for (const param of parameters) registerParameterType(param);
  if (parameters.length === 0) {
    return { signature: '', prefixBlockContent: '' };
  }
  const destructuring = getParameterDestructuring(parameters);

  const firstDefaultIndex = parameters.findIndex((p) => !!p.initializer);
  if (firstDefaultIndex === -1) {
    return {
      signature: parameters.map((p) => `${getParameterName(p, parameters)} ${getParameterGoType(p)}`).join(', '),
      prefixBlockContent: destructuring
    };
  }

  // (optional parameters after a defaulted one are passed the same way)
  const hasRequiredAfterDefault = parameters.slice(firstDefaultIndex).some((p) => !p.initializer && !(p.questionToken && !p.dotDotDotToken));

  if (hasRequiredAfterDefault) {
    return {
      signature: parameters.map((p) => `${getParameterName(p, parameters)} ${getParameterGoType(p)}`).join(', '),
      prefixBlockContent: destructuring
    };
  }

  const requiredParams = parameters.slice(0, firstDefaultIndex);
  const defaultedParams = parameters.slice(firstDefaultIndex);

  const signatureParts = requiredParams.map((p) => `${getParameterName(p, parameters)} ${getParameterGoType(p)}`);
  signatureParts.push('__defaultArgs ...interface{}');

  const prefixBlockContent = defaultedParams
    .map((param, index) => {
      // (a destructured parameter's value is __paramN, destructured after)
      const paramName = getParameterName(param, parameters);
      const paramType = getParameterGoType(param);
      // Array-reference parameters need the default boxed to *[]T (an
      // optional parameter's default is undefined)
      const defaultValue = !param.initializer
        ? `*new(${paramType})`
        : paramType.startsWith('*[]')
          ? toGoValueOfType(param.initializer!, paramType)
          : visit(param.initializer!);

      // a missing or undefined argument takes the default; others convert
      // to the parameter's type
      useHelper('dynamic');
      const value = paramType === 'interface{}' ? `__defaultArgs[${index}]` : `TnAs[${paramType}](__defaultArgs[${index}])`;
      return `var ${paramName} ${paramType}\n\t\tif len(__defaultArgs) > ${index} && !TnIsUndefined(__defaultArgs[${index}]) {\n\t\t\t${paramName} = ${value}\n\t\t} else {\n\t\t\t${paramName} = ${defaultValue}\n\t\t}\n\t\t`;
    })
    .join('');

  return {
    signature: signatureParts.join(', '),
    prefixBlockContent: prefixBlockContent + destructuring
  };
}

// Go packages the generated code may import: a user identifier with one of
// these names would shadow the package, so it is renamed (unless the name is
// itself a `go:` package import)
const goPackageIdentifiers = new Set([
  'aes', 'atomic', 'base64', 'binary', 'bufio', 'bytes', 'cipher', 'crc32', 'errors', 'exec', 'filepath',
  'flate', 'fmt', 'fs', 'gzip', 'hash', 'hex', 'hkdf', 'hmac', 'html', 'io', 'iter', 'json', 'math', 'md5',
  'net', 'os', 'pbkdf2', 'rand', 'reflect', 'regexp', 'runtime', 'sha1', 'sha256', 'sha3', 'sha512', 'signal',
  'slices', 'sort', 'strconv', 'strings', 'subtle', 'sync', 'syscall', 'time', 'unicode', 'unsafe', 'user',
  'utf16', 'utf8', 'zlib', 'asn1', 'bits', 'context', 'ecdh', 'ecdsa', 'ed25519', 'elliptic', 'encoding', 'http',
  'log', 'mime', 'multipart', 'netip', 'pem', 'pkix', 'rsa', 'textproto', 'tls', 'x509',
  // Aliased imports (math/big, crypto, net/url, crypto/rand)
  'tnbig', 'tncrypto', 'tnurl', 'cryptorand',
  // Go builtins: a package-level `var copy` would shadow copy() in the helpers
  'append', 'cap', 'clear', 'close', 'complex', 'copy', 'imag', 'len', 'make', 'max', 'min', 'panic',
  'print', 'println', 'real', 'recover', 'any', 'byte', 'error', 'float64', 'int', 'int64', 'rune',
  'uint', 'uint8', 'uint32', 'nil', 'iota',
  // Predeclared types: a `string` parameter would shadow the type in its own signature and body
  'bool', 'string', 'float32', 'int8', 'int16', 'int32', 'uint16', 'uint64', 'uintptr', 'complex64',
  'complex128', 'comparable'
]);
// Local names of `go:` package imports (`import * as strings from 'go:strings'`)
const goPackageLocalNames = new Set<string>();

function getSafeName(name: string): string {
  if (!dangerousNames.has(name) && !(goPackageIdentifiers.has(name) && !goPackageLocalNames.has(name))) {
    return name;
  }

  if (!renamedFunctions.has(name)) {
    renamedFunctions.set(name, `${name}_${goSafeId()}`);
  }
  return renamedFunctions.get(name)!;
}

function getPromiseChannelType(node: AstNode): string {
  // An explicit new Promise<T> / async return type wins
  if (
    isNewExpression(node) &&
    isIdentifier(node.expression) &&
    node.expression.text === 'Promise' &&
    (node.typeArguments ?? []).length > 0
  ) {
    return getType(node.typeArguments[0]) || 'struct{}';
  }
  let parent: AstNode | undefined = node;
  while (parent) {
    if (
      isFunctionDeclaration(parent) ||
      isMethodDeclaration(parent) ||
      isFunctionExpression(parent) ||
      isArrowFunction(parent)
    ) {
      if (
        parent.type &&
        isTypeReferenceNode(parent.type) &&
        isIdentifier(parent.type.typeName)
      ) {
        if (
          parent.type.typeName.text === 'Promise' &&
          parent.type.typeArguments &&
          parent.type.typeArguments.length > 0
        ) {
          return getType(parent.type.typeArguments[0]) || 'struct{}';
        }
      }
      // an unannotated function value: the Promise<T> its context expects
      if (!parent.type && (isFunctionExpression(parent) || isArrowFunction(parent))) {
        const contextual = resolveTypeNode(getContextualFunctionType(parent)?.type);
        if (isTypeReferenceNode(contextual) && isIdentifier(contextual.typeName) && contextual.typeName.text === 'Promise' && (contextual.typeArguments ?? []).length > 0) {
          return getType(contextual.typeArguments[0]) || 'struct{}';
        }
      }
      break;
    }
    parent = parent.parent;
  }
  return 'interface{}';
}

// A function whose body runs in a goroutine and communicates over a channel:
// async functions (return sends) and generators (yield sends)
// `header` replaces `func name[T]` (methods: `func (self *C) name`)
function emitChannelFunction(node: AstNode, isAsync: boolean, header?: string): string {
  const name = header ? '' : getSafeName(visit(node.name!, { inline: true }));
  const typeParams = header ? '' : getTypeParameters(node.typeParameters, node);
  const declaration = header ?? `func ${name}${typeParams}`;
  const parameterInfo = withContextualParameters(node, getFunctionParametersInfo(node.parameters ?? []));
  if (node.body && isBlock(node.body)) {
    prescanVariableDeclarations(node.body);
  }
  const chanType = isAsync ? getPromiseChannelType(node) : getGeneratorYieldType(node);
  const channelVar = '__ch';
  if (isAsync) useHelper('promise');
  const rejectOnPanic = isAsync ? `\n\t\tdefer TnRejectOnPanic(${channelVar})` : '';
  const prevChannel = asyncChannelVar;
  const prevFn = asyncFunctionNode;
  const prevIsAsync = asyncChannelIsAsync;
  asyncChannelVar = channelVar;
  asyncFunctionNode = node;
  asyncChannelIsAsync = isAsync;
  const body = visit(node.body!, { prefixBlockContent: parameterInfo.prefixBlockContent });
  asyncChannelVar = prevChannel;
  asyncFunctionNode = prevFn;
  asyncChannelIsAsync = prevIsAsync;
  if (isAsync) {
    // The body runs synchronously until its first await, holding the JS baton
    useHelper('eventLoop');
    return (
      `${declaration}(${parameterInfo.signature}) chan ${chanType} {\n\t${channelVar} := make(chan ${chanType}, 1)\n\tTnStartAsync(func() {\n\t\tdefer TnAsyncClose(${channelVar})${rejectOnPanic}\n\t\t${body.trim()}\n\t})\n\treturn ${channelVar}\n}`
    );
  }
  return (
    `${declaration}(${parameterInfo.signature}) chan ${chanType} {\n\t${channelVar} := make(chan ${chanType})\n\tgo func() {\n\t\tdefer close(${channelVar})${rejectOnPanic}\n\t\t${body.trim()}\n\t}()\n\treturn ${channelVar}\n}`
  );
}

// The type a generator yields: from its first yield expression's operand
function getGeneratorYieldType(fn: AstNode): string {
  let found: string | undefined;
  containsNode(fn, (n) => {
    if (n.kind === 'YieldExpression' && found === undefined) {
      found = n.expression ? inferExpressionType(n.expression) : undefined;
      return true;
    }
    return false;
  });
  return found && found !== 'nil' ? found : 'interface{}';
}

function visitPromiseReturn(node: AstNode, options: VisitNodeOptions): string {
  const callback = node.arguments?.[0];
  if (!callback || (!isArrowFunction(callback) && !isFunctionExpression(callback))) {
    return `return ${visit(node)}` + (options.inline ? '' : ';\n\t');
  }

  useHelper('promise');
  const channelType = getPromiseChannelType(node);
  const resolveParam = callback.parameters[0];
  const resolveName = resolveParam ? visit(resolveParam.name) : '';
  const rejectParam = callback.parameters[1];

  const prevResolveName = promiseResolveName;
  const prevRejectName = promiseRejectName;
  promiseResolveName = resolveName;
  promiseRejectName = rejectParam ? visit(rejectParam.name) : '';

  const body = isBlock(callback.body) ? visit(callback.body) : `{ ${visit(callback.body)} }`;

  promiseResolveName = prevResolveName;
  promiseRejectName = prevRejectName;

  return (
    `ch := make(chan ${channelType}, 1)\n\t\tfunc() {\n\t\t\tdefer TnRejectExecutor(ch)\n\t\t\tfunc() ${body.trimEnd()}()\n\t\t}()\n\t\treturn ch` +
    (options.inline ? '' : ';\n\t')
  );
}

function visitNewPromise(node: AstNode): string {
  const callback = node.arguments?.[0];
  if (!callback || (!isArrowFunction(callback) && !isFunctionExpression(callback))) {
    return 'NewPromise()';
  }

  const channelType = getPromiseChannelType(node);
  const resolveParam = callback.parameters[0];
  const resolveName = resolveParam ? visit(resolveParam.name) : '';
  const rejectParam = callback.parameters[1];

  const prevResolveName = promiseResolveName;
  const prevRejectName = promiseRejectName;
  promiseResolveName = resolveName;
  promiseRejectName = rejectParam ? visit(rejectParam.name) : '';

  const body = isBlock(callback.body) ? visit(callback.body) : `{ ${visit(callback.body)} }`;

  promiseResolveName = prevResolveName;
  promiseRejectName = prevRejectName;

  // Buffered: resolving never blocks (a loop task may resolve a promise its own goroutine awaits)
  // The executor runs synchronously, as in JS (a throw rejects the promise)
  useHelper('promise');
  return `func() chan ${channelType} {\n\t\tch := make(chan ${channelType}, 1)\n\t\tfunc() {\n\t\t\tdefer TnRejectExecutor(ch)\n\t\t\tfunc() ${body.trimEnd()}()\n\t\t}()\n\t\treturn ch;\n\t}()`;
}

function extractMapValueType(mapType: string): string {
  const args = splitMapTypeArgs(mapType);
  if (args) return args[1];
  if (!mapType.startsWith('map[')) return 'interface{}';
  let depth = 0;
  for (let i = 4; i < mapType.length; i++) {
    if (mapType[i] === '[') depth++;
    else if (mapType[i] === ']') {
      if (depth === 0) return mapType.substring(i + 1);
      depth--;
    }
  }
  return 'interface{}';
}

// Type arguments of new Map/Set: explicit, else from the declared/contextual type
function getCollectionTypeArguments(node: AstNode): AstNode[] {
  if ((node.typeArguments ?? []).length > 0) return node.typeArguments;
  const contextual = resolveTypeNode(getContextualTypeNode(node));
  return isTypeReferenceNode(contextual) ? (contextual.typeArguments ?? []) : [];
}

function visitNewMap(node: AstNode): string {
  let keyType = 'interface{}';
  let valueType = 'interface{}';
  const typeArguments = getCollectionTypeArguments(node);
  if (typeArguments.length === 2) {
    keyType = getType(typeArguments[0]);
    valueType = getType(typeArguments[1]);
  }
  const args = node.arguments ?? [];
  const entries: string[] =
    args.length > 0 && isArrayLiteralExpression(args[0])
      ? args[0].elements
          .filter((el: AstNode) => isArrayLiteralExpression(el) && el.elements.length >= 2)
          .map((pair: AstNode) => `${visit(pair.elements[0])}, ${visit(pair.elements[1])}`)
      : [];
  return orderedMapLiteral(keyType, valueType, entries);
}

// The element type of `new Set(…)`: its type argument, else its source's
function newSetElementType(node: AstNode): string {
  const typeArguments = getCollectionTypeArguments(node);
  if (typeArguments.length === 1) return getType(typeArguments[0]);
  const source = node.arguments?.[0];
  if (!source) return 'interface{}';
  if (isArrayLiteralExpression(source)) return getArrayLiteralElementType(source);
  const sourceType = (inferExpressionType(source) ?? '').replace(/^\*\[\]/, '[]');
  if (sourceType === 'string') return 'string';
  if (sourceType.startsWith('[]')) return sourceType.slice(2);
  if (sourceType.startsWith('*TnMap[') && extractMapValueType(sourceType) === 'struct{}') return splitMapTypeArgs(sourceType)?.[0] ?? 'interface{}';
  return 'interface{}';
}

function visitNewSet(node: AstNode): string {
  const elementType = newSetElementType(node);
  const args = node.arguments ?? [];
  // new Set(otherSet/values()) / new Set([...a, ...b]) — copy at runtime
  if (args.length > 0 && (!isArrayLiteralExpression(args[0]) || (args[0].elements ?? []).some((e: AstNode) => isSpreadElement(e)))) {
    useHelper('orderedMap');
    const src = getTempName('setsrc');
    const item = getTempName('item');
    const sourceType = (inferExpressionType(args[0]) ?? '').replace(/^\*\[\]/, '[]');
    // a string's code points; another Set's values; anything else iterable
    let items = src;
    let item_ = item;
    if (sourceType === 'string') item_ = `string(${item})`;
    else if (sourceType.startsWith('*TnMap[') && extractMapValueType(sourceType) === 'struct{}') items = `${src}.Keys()`;
    else if (sourceType.startsWith('*[]')) items = `*${src}`;
    else if (!sourceType.startsWith('[]')) {
      useHelper('dynamic');
      useHelper('arraySubclass');
      items = `TnToArray(${src})`;
      if (elementType !== 'interface{}') item_ = `TnAs[${elementType}](${item})`;
    }
    return `func() *TnMap[${elementType}, struct{}] { ${src} := ${visit(args[0])}; __s := TnNewMap[${elementType}, struct{}](); for _, ${item} := range ${items} { __s.Set(${item_}, struct{}{}) }; return __s }()`;
  }
  const values: string[] =
    args.length > 0 && isArrayLiteralExpression(args[0])
      ? args[0].elements.map((el: AstNode) => `${visit(el)}, struct{}{}`)
      : [];
  return orderedMapLiteral(elementType, 'struct{}', values);
}

const GO_FILE_SUFFIXES = new Set([
  'test', 'aix', 'android', 'darwin', 'dragonfly', 'freebsd', 'hurd', 'illumos', 'ios', 'js', 'linux',
  'nacl', 'netbsd', 'openbsd', 'plan9', 'solaris', 'wasip1', 'windows', 'zos', '386', 'amd64',
  'amd64p32', 'arm', 'armbe', 'arm64', 'arm64be', 'loong64', 'mips', 'mipsle', 'mips64', 'mips64le',
  'mips64p32', 'mips64p32le', 'ppc', 'ppc64', 'ppc64le', 'riscv', 'riscv64', 's390', 's390x',
  'sparc', 'sparc64', 'wasm'
]);

// Whether a file name's last _suffix is one go build treats specially
function goFileSuffixIsSpecial(name: string): boolean {
  const parts = name.toLowerCase().split('_');
  return parts.length > 1 && GO_FILE_SUFFIXES.has(parts[parts.length - 1]);
}

function specifierToGoFileName(specifier: string): string {
  const segments = specifier.split(/[/\\]/);
  let name = segments[segments.length - 1] || segments[segments.length - 2] || 'import';
  // Strip all extensions (e.g. .spec.ts → '', .ts → '')
  name = name.replace(/(\.[^.]+)+$/, '');
  name = name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!name) name = 'import';
  // go build reads foo_test.go, foo_linux.go, foo_amd64.go as test or
  // build-constrained files: keep such names out of that pattern
  if (goFileSuffixIsSpecial(name)) name += '_m';
  // Deduplicate filename if already taken by a different import (or the
  // main file's code.go)
  let candidate = name + '.go';
  let i = 2;
  while (candidate.toLowerCase() === 'code.go' || reservedGoFileNames.has(candidate.toLowerCase())) {
    candidate = `${name}_${i}.go`;
    i++;
  }
  reservedGoFileNames.add(candidate.toLowerCase());
  return candidate;
}

function normalizeCjsToEsm(code: string): string {
  // Remove 'use strict' directive
  code = code.replace(/['"]use strict['"];?\n?/g, '');
  // module.exports.X = function(...) { } or exports.X = function(...) { }
  code = code.replace(
    /(?:module\.exports|exports)\.(\w+)\s*=\s*function\s*\w*\s*\(/g,
    'export function $1('
  );
  return code;
}

// ---- Module linking ----
// TS modules have their own top-level scopes; the generated Go is one package.
// Before transpiling, every module reachable from the entry is parsed once and
// its top-level declarations get package-unique names: the first module to
// declare a name keeps it, later ones get name_2, name_3, … Importers'
// references (named, default and namespace imports, re-exports) are renamed
// to the names the exporting module ended up with.
interface LinkedModule {
  ast: AstNode;
  // export name → package-unique name ('default' for the default export)
  exports: Map<string, string>;
  // keys of the modules `export * from` re-exports
  starExports: string[];
}
const linkedModules = new Map<string, LinkedModule>();
const linkedTopNames = new Set<string>();

// Specifiers the file resolver loads as TS modules (not node:, go:, JSON)
function isLinkableSpecifier(spec: string): boolean {
  if (/\.json$/i.test(spec) || spec.startsWith('go:') || spec.startsWith('node:')) return false;
  return spec.startsWith('.') || spec.startsWith('/') || !nodeModuleName(spec);
}

// Names a binding pattern (or plain identifier) declares
function bindingNames(name: AstNode, out: string[]): void {
  if (!name) return;
  if (isIdentifier(name)) {
    out.push(name.text);
    return;
  }
  for (const element of name.elements ?? []) {
    if (element.kind === 'BindingElement') bindingNames(element.name, out);
  }
}

// Top-level names a module declares (not imports, not ambient globals)
function moduleOwnNames(statements: AstNode[]): string[] {
  const names: string[] = [];
  for (const statement of statements) {
    if (statement.kind === 'VariableStatement') {
      if (statement.ambient) continue;
      for (const d of statement.declarationList?.declarations ?? []) bindingNames(d.name, names);
    } else if (
      ['FunctionDeclaration', 'ClassDeclaration', 'InterfaceDeclaration', 'TypeAliasDeclaration', 'EnumDeclaration'].includes(statement.kind) &&
      isIdentifier(statement.name)
    ) {
      names.push(statement.name.text);
    }
  }
  return names;
}

function hasModifier(node: AstNode, kind: string): boolean {
  return (node.modifiers ?? []).some((m: AstNode) => m.kind === kind);
}

// A module's package-unique name for an export, following `export * from`
function linkedExportName(key: string, name: string, seen: Set<string>): string | undefined {
  const mod = linkedModules.get(key);
  if (!mod || seen.has(key)) return undefined;
  seen.add(key);
  const direct = mod.exports.get(name);
  if (direct !== undefined) return direct;
  if (name === 'default') return undefined;
  for (const star of mod.starExports) {
    const found = linkedExportName(star, name, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

// Parses and links a module (and the modules it imports); returns its AST
function linkModule(key: string, code: string, dir: string | null, tsx: boolean, fileName: string): AstNode {
  const existing = linkedModules.get(key);
  if (existing) return existing.ast;
  const prevDir = currentFileDir;
  const prevTsx = currentFileIsTsx;
  const prevFileName = currentFileName;
  currentFileDir = dir;
  currentFileIsTsx = tsx;
  currentFileName = fileName;
  if (!code.includes('export ') && (code.includes('module.exports') || code.includes('exports.'))) {
    code = normalizeCjsToEsm(code);
  }
  const ast = parseAndLower(code);
  const mod: LinkedModule = { ast: ast, exports: new Map(), starExports: [] };
  linkedModules.set(key, mod);
  const statements: AstNode[] = ast.statements ?? [];

  // 1. The module's own declarations claim their names (before its imports
  // are linked, so a cycle back to this module finds them)
  const renames = new Map<string, string>();
  for (const name of moduleOwnNames(statements)) {
    if (renames.has(name)) continue;
    let goName = name;
    for (let i = 2; linkedTopNames.has(goName); i++) goName = `${name}_${i}`;
    linkedTopNames.add(goName);
    renames.set(name, goName);
  }
  for (const statement of statements) {
    const exported = statement.exported || hasModifier(statement, 'ExportKeyword');
    if (!exported) continue;
    const names: string[] = [];
    if (statement.kind === 'VariableStatement') {
      for (const d of statement.declarationList?.declarations ?? []) bindingNames(d.name, names);
    } else if (isIdentifier(statement.name)) names.push(statement.name.text);
    for (const name of names) mod.exports.set(name, renames.get(name) ?? name);
    if (hasModifier(statement, 'DefaultKeyword') && names.length === 1) {
      mod.exports.set('default', renames.get(names[0]) ?? names[0]);
    }
  }

  // 2. Imports: link the imported module, then bind the local names to its exports
  const namespaces = new Map<string, string>();
  // 'local.prop' → the package-unique name of an imported function's expando property
  const expandoReads = new Map<string, string>();
  for (const statement of statements) {
    const isImport = statement.kind === 'ImportDeclaration';
    const isTypeReexport = statement.kind === 'ExportDeclaration' && !!statement.moduleSpecifier;
    if (!isImport && !isTypeReexport) continue;
    const spec: string = statement.moduleSpecifier?.text ?? '';
    if (!isStringLiteral(statement.moduleSpecifier) || !isLinkableSpecifier(spec) || !fileResolver) continue;
    const resolved = fileResolver(spec, dir);
    if (!resolved) continue;
    const targetKey = resolved.path ?? `${resolved.dir}::${spec}`;
    linkModule(targetKey, resolved.content, resolved.dir, !!resolved.tsx, resolved.path ?? spec);
    statement.linkedKey = targetKey;
    if (isTypeReexport) {
      for (const el of statement.exportClause?.elements ?? []) {
        const remote = (el.propertyName ?? el.name).text;
        mod.exports.set(el.name.text, linkedExportName(targetKey, remote, new Set()) ?? remote);
      }
      continue;
    }
    const clause = statement.importClause;
    if (!clause) {
      if (statement.reexport) mod.starExports.push(targetKey);
      continue;
    }
    if (clause.name) {
      const target = linkedExportName(targetKey, 'default', new Set());
      if (target !== undefined) renames.set(clause.name.text, target);
    }
    const bindings = clause.namedBindings;
    if (bindings?.kind === 'NamespaceImport') {
      namespaces.set(bindings.name.text, targetKey);
    } else if (bindings?.kind === 'NamedImports') {
      for (const el of bindings.elements ?? []) {
        const remote = (el.propertyName ?? el.name).text;
        const target = linkedExportName(targetKey, remote, new Set());
        if (target === undefined) continue;
        // f.prop on an imported function with expando properties
        const expandoProps: Set<string> | undefined = linkedModules.get(targetKey)?.ast.expandos?.get(remote);
        if (expandoProps) {
          for (const prop of expandoProps) {
            const propTarget = linkedExportName(targetKey, `${remote}__${prop}`, new Set());
            if (propTarget !== undefined) expandoReads.set(`${el.name.text}.${prop}`, propTarget);
          }
        }
        renames.set(el.name.text, target);
        if (statement.reexport) mod.exports.set(el.name.text, target);
        // the local name is the exporting module's own now
        el.name = { kind: 'Identifier', text: target };
        el.propertyName = undefined;
      }
    }
  }

  // 3. export { a as b } / export default x / export = { a }
  for (const statement of statements) {
    if (statement.kind === 'ExportDeclaration' && !statement.moduleSpecifier) {
      for (const el of statement.exportClause?.elements ?? []) {
        const local = (el.propertyName ?? el.name).text;
        mod.exports.set(el.name.text, renames.get(local) ?? local);
      }
    } else if (statement.kind === 'ExportAssignment') {
      const expr = statement.expression;
      if (isIdentifier(expr)) mod.exports.set('default', renames.get(expr.text) ?? expr.text);
      if (isObjectLiteralExpression(expr)) {
        for (const prop of expr.properties ?? []) {
          const value = prop.kind === 'ShorthandPropertyAssignment' ? prop.name : prop.initializer;
          if (isIdentifier(prop.name) && isIdentifier(value)) {
            mod.exports.set(prop.name.text, renames.get(value.text) ?? value.text);
          }
        }
      }
    }
  }

  // 4. Rename the references
  for (const [name, goName] of [...renames]) {
    if (name === goName) renames.delete(name);
  }
  if (renames.size > 0 || namespaces.size > 0 || expandoReads.size > 0) {
    renameModuleBindings(ast, renames, namespaces, expandoReads);
  }
  registerSourceFile(ast);
  currentFileDir = prevDir;
  currentFileIsTsx = prevTsx;
  currentFileName = prevFileName;
  return ast;
}

// Names a scope node declares that shadow module bindings inside it
function scopeDeclaredNames(node: AstNode): string[] {
  const names: string[] = [];
  const kind = node.kind;
  for (const tp of node.typeParameters ?? []) if (isIdentifier(tp.name)) names.push(tp.name.text);
  if (kind === 'MappedType' && node.typeParameter && isIdentifier(node.typeParameter.name)) {
    names.push(node.typeParameter.name.text);
  }
  if (FUNCTION_LIKE_KINDS.has(kind)) {
    for (const p of node.parameters ?? []) bindingNames(p.name, names);
    if ((kind === 'FunctionExpression' || kind === 'ClassExpression') && isIdentifier(node.name)) names.push(node.name.text);
    // var declarations anywhere in the body are function-scoped
    if (node.body) collectVarNames(node.body, names);
  }
  if (kind === 'ClassExpression' && isIdentifier(node.name)) names.push(node.name.text);
  if (kind === 'Block' || kind === 'CaseBlock' || kind === 'ModuleBlock') {
    const statements: AstNode[] = kind === 'CaseBlock'
      ? (node.clauses ?? []).flatMap((c: AstNode) => c.statements ?? [])
      : (node.statements ?? []);
    for (const statement of statements) {
      if (statement.kind === 'VariableStatement') {
        for (const d of statement.declarationList?.declarations ?? []) bindingNames(d.name, names);
      } else if (['FunctionDeclaration', 'ClassDeclaration', 'EnumDeclaration', 'InterfaceDeclaration', 'TypeAliasDeclaration'].includes(statement.kind) && isIdentifier(statement.name)) {
        names.push(statement.name.text);
      }
    }
  }
  if ((kind === 'ForStatement' || kind === 'ForOfStatement' || kind === 'ForInStatement') && node.initializer?.kind === 'VariableDeclarationList') {
    for (const d of node.initializer.declarations ?? []) bindingNames(d.name, names);
  }
  if (kind === 'CatchClause' && node.variableDeclaration) bindingNames(node.variableDeclaration.name, names);
  if (kind === 'InferType' && node.typeParameter && isIdentifier(node.typeParameter.name)) names.push(node.typeParameter.name.text);
  return names;
}

const FUNCTION_LIKE_KINDS = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunction', 'MethodDeclaration', 'Constructor',
  'GetAccessor', 'SetAccessor', 'MethodSignature', 'FunctionType', 'ConstructorType', 'CallSignature',
  'ConstructSignature'
]);

// var declarations in a function body, not inside nested functions
function collectVarNames(node: AstNode, out: string[]): void {
  if (node.kind === 'VariableDeclarationList' && node.declarationKind === 'var') {
    for (const d of node.declarations ?? []) bindingNames(d.name, out);
  }
  for (const child of childNodes(node)) {
    if (!FUNCTION_LIKE_KINDS.has(child.kind)) collectVarNames(child, out);
  }
}

// An identifier node at another node's source position
function identifierAt(text: string, at: AstNode): AstNode {
  return { kind: 'Identifier', text: text, line: at.line, column: at.column, endLine: at.endLine, endColumn: at.endColumn };
}

// Keys whose identifier is a property or remote name, never a reference
const NON_REFERENCE_KEYS = new Set(['propertyName', 'label']);

// Renames references to module bindings, skipping scopes that shadow them;
// namespace-import accesses (N.x) become the exported name
function renameModuleBindings(
  node: AstNode,
  renames: Map<string, string>,
  namespaces: Map<string, string>,
  expandoReads: Map<string, string>,
  inObjectPattern = false
): void {
  let scopeRenames = renames;
  let scopeNamespaces = namespaces;
  let scopeExpandos = expandoReads;
  if (node.kind !== 'SourceFile') {
    const shadowed = scopeDeclaredNames(node).filter(
      (n) => renames.has(n) || namespaces.has(n) || (expandoReads.size > 0 && [...expandoReads.keys()].some((k) => k.startsWith(`${n}.`)))
    );
    if (shadowed.length > 0) {
      scopeRenames = new Map(renames);
      scopeNamespaces = new Map(namespaces);
      scopeExpandos = new Map(expandoReads);
      for (const n of shadowed) {
        scopeRenames.delete(n);
        scopeNamespaces.delete(n);
        for (const key of [...scopeExpandos.keys()]) if (key.startsWith(`${n}.`)) scopeExpandos.delete(key);
      }
      if (scopeRenames.size === 0 && scopeNamespaces.size === 0 && scopeExpandos.size === 0) return;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent' || NON_REFERENCE_KEYS.has(key)) continue;
    if (key === 'name' && (MEMBER_NAME_PARENTS.has(node.kind) || node.kind === 'ImportSpecifier' || node.kind === 'JsxAttribute')) continue;
    if (key === 'right' && node.kind === 'QualifiedName') continue;
    const value = node[key];
    const isList = Array.isArray(value);
    const children: AstNode[] = isList ? value : value && typeof value === 'object' && typeof value.kind === 'string' ? [value] : [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || typeof child.kind !== 'string') continue;
      // N.x (or the type N.T) on a namespace import → the export's name
      const left = child.kind === 'PropertyAccessExpression' ? child.expression : child.kind === 'QualifiedName' ? child.left : undefined;
      const right = child.kind === 'PropertyAccessExpression' ? child.name : child.kind === 'QualifiedName' ? child.right : undefined;
      if (isIdentifier(left) && isIdentifier(right) && scopeNamespaces.has(left.text)) {
        const target = linkedExportName(scopeNamespaces.get(left.text)!, right.text, new Set());
        if (target !== undefined) {
          const replacement = identifierAt(target, child);
          if (isList) value[i] = replacement;
          else node[key] = replacement;
          continue;
        }
      }
      const expandoTarget = isIdentifier(left) && isIdentifier(right) && child.kind === 'PropertyAccessExpression'
        ? scopeExpandos.get(`${left.text}.${right.text}`)
        : undefined;
      if (expandoTarget !== undefined) {
        const replacement = identifierAt(expandoTarget, child);
        if (isList) value[i] = replacement;
        else node[key] = replacement;
        continue;
      }
      if (isIdentifier(child)) {
        const goName = scopeRenames.get(child.text);
        if (goName === undefined) continue;
        if (node.kind === 'ShorthandPropertyAssignment') {
          // { x } keeps its key: { x: x_2 }
          node.kind = 'PropertyAssignment';
          node.initializer = identifierAt(goName, child);
          continue;
        }
        if (node.kind === 'BindingElement' && key === 'name' && !node.propertyName && inObjectPattern) {
          // const { x } = o keeps the property: const { x: x_2 } = o
          node.propertyName = identifierAt(child.text, child);
        }
        child.text = goName;
      } else {
        renameModuleBindings(child, scopeRenames, scopeNamespaces, scopeExpandos, node.kind === 'ObjectBindingPattern');
      }
    }
  }
}

function includeLocalImport(
  code: string,
  dir: string | null,
  goFileName?: string,
  tsx = false,
  fileName = '',
  linkedAst?: AstNode
): void {
  const prevDir = currentFileDir;
  const prevTsx = currentFileIsTsx;
  const prevFileName = currentFileName;
  currentFileDir = dir;
  currentFileIsTsx = tsx;
  currentFileName = fileName;

  // Normalize CommonJS modules to ES module syntax before parsing
  if (!code.includes('export ') && (code.includes('module.exports') || code.includes('exports.'))) {
    code = normalizeCjsToEsm(code);
  }

  if (!goFileName) {
    // Inline mode (npm packages): pull declarations into the current transpilation context
    const sf = parseSource(code);
    for (const stmt of sf.statements) {
      visit(stmt, { addFunctionOutside: true });
    }
    currentFileDir = prevDir;
    currentFileIsTsx = prevTsx;
    currentFileName = prevFileName;
    return;
  }

  // Separate-file mode (local TS imports): transpile to its own Go file.
  // Helper functions are NOT emitted per-file: every generated file shares
  // `package main`, so helpers are emitted once in the main output file.
  const savedOutsideNodes = outsideNodes;
  const savedPackages = [...importedPackages];
  // Helper packages registered by the including file so far must survive this
  // file's own tracking (the main file imports them for the helpers it carries)
  const savedHelperPackages = [...helperProvidedPackages];
  outsideNodes = [];
  importedPackages.clear();
  helperProvidedPackages.clear();

  const sf = linkedAst ?? parseSource(code);
  collectMockTargets(sf);
  instrumentCoverage(sf, code);
  // (`func(` without a name is an IIFE statement, not a declaration)
  const isDeclarationLine = (line: string) => /^(var|const|type|import)\b|^func\s|^\/\/go:embed /.test(line.trim());
  const declarationLines: string[] = [];
  const statementLines: string[] = [];
  const prevEmittingModuleFile = emittingModuleFile;
  const prevInitAssignments = moduleInitAssignments;
  emittingModuleFile = true;
  for (const stmt of sf.statements) {
    moduleInitAssignments = [];
    const result = visit(stmt, { addFunctionOutside: true });
    const assignments = moduleInitAssignments;
    moduleInitAssignments = null;
    if (result.trim()) {
      const line = withLineMarker(stmt, localizeGoPaths(result)) + (assignments.length > 0 ? '' : coverageAfter(stmt));
      if (isDeclarationLine(result)) declarationLines.push(line);
      else statementLines.push(line);
    }
    // top-level variables get their values in the module's code
    for (const assignment of assignments) statementLines.push(withLineMarker(stmt, localizeGoPaths(assignment)));
    if (assignments.length > 0) {
      const after = coverageAfter(stmt);
      if (after.trim()) statementLines.push(after.trim());
    }
  }
  moduleInitAssignments = prevInitAssignments;
  const loaded = coverageLoaded(sf);
  if (loaded) statementLines.unshift(loaded.trim());
  emittingModuleFile = prevEmittingModuleFile;

  const fileOutside = localizeGoPaths(
    outsideNodes.map((n) => withLineMarker(n, visit(n, { isOutside: true }))).join('\n')
  );
  // The module's code runs from main, after the modules it imports (JS
  // evaluation order), not in Go's file-ordered init()
  const initName = `tnModuleInit_${moduleInitOrder.length + 1}_${goFileName.replace(/\.go$/, '').replace(/[^A-Za-z0-9_]/g, '_')}`;
  if (statementLines.length > 0) moduleInitOrder.push(initName);
  const fileInline = [
    ...declarationLines,
    ...(statementLines.length > 0 ? [`func ${initName}() {\n\t${statementLines.join('\n\t')}\n}`] : [])
  ].join('\n');
  // Computed after all visits: function bodies (outside nodes) register
  // packages too, and imports must be captured after those visits.
  // Helper-provided packages are only imported here if the file's own code
  // references them; the main file (which carries the helper sources)
  // always imports them.
  const fileCode = `${fileInline}\n${fileOutside}`;
  const fileImports = goFileImportLines(fileCode);

  const parts: string[] = [GENERATED_HEADER, 'package main'];
  if (fileImports) parts.push(fileImports);
  if (fileInline.trim()) parts.push(fileInline.trim());
  if (fileOutside.trim()) parts.push(fileOutside.trim());
  localImportFiles.set(goFileName, applyLineDirectives(parts.join('\n\n'), goFileName));

  // Restore main-file state; helper-provided packages carry over so the main
  // file (which carries the helper sources) imports them.
  outsideNodes = savedOutsideNodes;
  importedPackages.clear();
  for (const p of savedPackages) importedPackages.add(p);
  currentFileIsTsx = prevTsx;
  for (const p of savedHelperPackages) helperProvidedPackages.add(p);
  for (const p of helperProvidedPackages) importedPackages.add(p);
  currentFileDir = prevDir;
  currentFileName = prevFileName;
}

// The literal path a Worker / fork is given ('./w.ts', new URL('./w.ts',
// import.meta.url), path.join(__dirname, 'w.ts')), or ''
function entryPointSpecifier(node: AstNode | undefined): string {
  if (!node) return '';
  if (isStringLiteral(node) || node.kind === 'NoSubstitutionTemplateLiteral') return String(node.text);
  if (isNewExpression(node) && isIdentifier(node.expression) && node.expression.text === 'URL') {
    const args: AstNode[] = node.arguments ?? [];
    const base = args[1];
    if (args[0] && isStringLiteral(args[0]) && base && isPropertyAccessExpression(base) && base.name.text === 'url') {
      return String(args[0].text);
    }
    return '';
  }
  if (isCallExpression(node) && isPropertyAccessExpression(node.expression)) {
    const method = node.expression.name.text;
    const args: AstNode[] = node.arguments ?? [];
    if ((method === 'join' || method === 'resolve') && args.length === 2 && isIdentifier(args[0]) && args[0].text === '__dirname' && isStringLiteral(args[1])) {
      const rel = String(args[1].text);
      return rel.startsWith('.') ? rel : `./${rel}`;
    }
  }
  return '';
}

// Queues the file a Worker / fork names for compilation as an entry point;
// '' when it is not a literal source path (or is the program itself)
function registerEntryPoint(node: AstNode | undefined): string {
  const spec = entryPointSpecifier(node);
  if (!spec || !fileResolver || !(spec.startsWith('.') || spec.startsWith('/'))) return '';
  if (!/\.(m?[jt]s|tsx?)$/.test(spec)) return '';
  const file = fileResolver(spec, currentFileDir);
  if (!file) return '';
  const key = file.path ?? `${file.dir}::${spec}`;
  if (key === mainSourcePath) return '';
  // has(), not get() !== undefined: natively get() returns '' for a missing key
  if (entryPointIds.has(key)) return entryPointIds.get(key)!;
  const id = `${specifierToGoFileName(spec).replace(/\.go$/, '')}_${entryPointIds.size + 1}`;
  entryPointIds.set(key, id);
  pendingEntryPoints.push({ id: id, file: file });
  useHelper('entryPoints');
  return id;
}

// An entry point file: compiled like the main file (top-level variables at
// package level), its top-level code in a function registered under its id
function compileEntryPoint(id: string, file: ResolvedSourceFile): void {
  const prevDir = currentFileDir;
  const prevTsx = currentFileIsTsx;
  const prevFileName = currentFileName;
  currentFileDir = file.dir;
  currentFileIsTsx = !!file.tsx;
  currentFileName = file.path ?? id;
  const savedOutsideNodes = outsideNodes;
  const savedPackages = [...importedPackages];
  const savedHelperPackages = [...helperProvidedPackages];
  outsideNodes = [];
  importedPackages.clear();
  helperProvidedPackages.clear();

  const varsBefore = mainPackageVariables.length;
  const sf = parseSource(file.content);
  collectMockTargets(sf);
  instrumentCoverage(sf, file.content);
  const statements: string[] = [];
  const loaded = coverageLoaded(sf);
  if (loaded) statements.push(loaded.trim());
  for (const stmt of sf.statements) {
    const result = visit(stmt, { addFunctionOutside: true });
    if (!result.trim()) continue;
    statements.push(withLineMarker(stmt, localizeGoPaths(result)) + coverageAfter(stmt));
  }
  const fileOutside = localizeGoPaths(
    outsideNodes.map((n) => withLineMarker(n, visit(n, { isOutside: true }))).join('\n')
  );
  // its top-level variables live in its own Go file
  const fileVars = mainPackageVariables.splice(varsBefore).map((v) => localizeGoPaths(v));
  const fnName = `tnEntry_${id}`;
  const fileCode = `${fileVars.join('\n')}\n\nfunc init() { tnEntryPoints[${JSON.stringify(id)}] = ${fnName} }\n\nfunc ${fnName}() {\n\t${statements.join('\n\t')}\n}\n\n${fileOutside}`;
  const fileImports = goFileImportLines(fileCode);
  const goFileName = `entry_${id}.go`;
  const parts: string[] = [GENERATED_HEADER, 'package main'];
  if (fileImports) parts.push(fileImports);
  parts.push(fileCode.trim());
  localImportFiles.set(goFileName, applyLineDirectives(parts.join('\n\n'), goFileName));

  outsideNodes = savedOutsideNodes;
  importedPackages.clear();
  for (const p of savedPackages) importedPackages.add(p);
  for (const p of savedHelperPackages) helperProvidedPackages.add(p);
  for (const p of helperProvidedPackages) importedPackages.add(p);
  currentFileDir = prevDir;
  currentFileIsTsx = prevTsx;
  currentFileName = prevFileName;
}

// JSON modules: `import data from './data.json'` (with { type: 'json' }) and
// `createRequire(import.meta.url)('./data.json')` read the file at compile
// time; JSON is an object-literal expression, so the value compiles as
// `const data = <json>` with the types an object literal would get
const requireFunctionNames = new Set<string>();

function visitJsonImport(node: AstNode, moduleSpec: string): string {
  const name = node.importClause?.name?.text;
  if (!name) return '';
  return visitJsonValueDeclaration(node, name, moduleSpec);
}

function visitJsonValueDeclaration(node: AstNode, name: string, moduleSpec: string): string {
  const file = fileResolver ? fileResolver(moduleSpec, currentFileDir) : null;
  if (!file) {
    reportError(node, `Cannot find JSON module '${moduleSpec}'`);
    return '';
  }
  try {
    JSON.parse(file.content);
  } catch (e) {
    reportError(node, `'${moduleSpec}' is not valid JSON`);
    return '';
  }
  const prevName = currentFileName;
  currentFileName = file.path ?? moduleSpec;
  const sf = parseSource(`const ${name} = ${file.content.trim()};`);
  currentFileName = prevName;
  const declaration = sf.statements[0];
  return visit(declaration);
}

// const require = createRequire(import.meta.url) / const data = require('./x.json')
function visitRequireDeclaration(node: AstNode): string | undefined {
  const init = node.initializer;
  if (!init || !isCallExpression(init) || !isIdentifier(node.name)) return undefined;
  if (resolveNodeKey(init.expression) === 'module.createRequire') {
    requireFunctionNames.add(node.name.text);
    return '';
  }
  const arg = (init.arguments ?? [])[0];
  if (isIdentifier(init.expression) && requireFunctionNames.has(init.expression.text) && arg && isStringLiteral(arg)) {
    const spec = String(arg.text);
    if (/\.json$/i.test(spec)) return visitJsonValueDeclaration(node, node.name.text, spec);
    reportError(node, `require('${spec}') is not supported: only JSON files can be required (use import for modules)`);
    return '';
  }
  return undefined;
}

// go:embed intrinsics: `const page = embed.string('./page.html')` compiles to
// a package-level `//go:embed page.html` var. Paths resolve from the calling
// file to patterns relative to the entry file's directory, where the CLI
// copies the files next to the Go sources (so embed.FS names match Go's)
const embedGoTypes: Record<string, string> = { string: 'string', bytes: '[]byte', files: 'embed.FS' };

// 'string' / 'bytes' / 'files' when callee is a go:embed intrinsic, else ''
function embedIntrinsic(callee: AstNode): string {
  let member = '';
  if (isIdentifier(callee)) {
    const split = splitGoMember(goMemberOf(callee.text));
    if (split && split.path === 'embed') member = split.member;
  } else if (isPropertyAccessExpression(callee) && isIdentifier(callee.expression) && goPathOf(callee.expression.text) === 'embed') {
    member = callee.name.text;
  }
  return Object.hasOwn(embedGoTypes, member) ? member : '';
}

function visitEmbedDeclaration(node: AstNode): string | undefined {
  const init = node.initializer;
  if (!init || !isCallExpression(init)) return undefined;
  const kind = embedIntrinsic(init.expression);
  if (!kind) return undefined;
  const isTopLevel = isVariableStatement(node.parent?.parent) && isSourceFile(node.parent?.parent?.parent);
  if (!isTopLevel || !isIdentifier(node.name)) {
    reportError(node, `embed.${kind}() must initialize a top-level variable`);
    return '';
  }
  const args: AstNode[] = init.arguments ?? [];
  if (kind === 'files' ? args.length === 0 : args.length !== 1) {
    reportError(init, kind === 'files' ? 'embed.files() needs at least one pattern' : `embed.${kind}() takes exactly one path`);
    return '';
  }
  const patterns: string[] = [];
  for (const arg of args) {
    if (!isStringLiteral(arg) && !isNoSubstitutionTemplateLiteral(arg)) {
      reportError(arg, 'embed paths must be string literals');
      return '';
    }
    const spec = String(arg.text);
    const resolved = embedResolver ? embedResolver(spec, currentFileDir) : null;
    if (resolved === null) {
      reportError(
        arg,
        embedResolver
          ? `Cannot embed '${spec}': no such file, or it is outside the entry file's directory`
          : `Cannot embed '${spec}': embedding needs the files on disk`
      );
      return '';
    }
    patterns.push(resolved);
  }
  for (const pattern of patterns) embedPatterns.add(pattern);
  const name = node.name.text;
  const goType = embedGoTypes[kind];
  variableClassNames.delete(name);
  variableTypeNodes.delete(name);
  narrowedVariables.delete(name);
  if (kind === 'files') variableTypes.delete(name);
  else variableTypes.set(name, kind === 'string' ? 'string' : 'Uint8Array');
  setVarGoType(name, goType);
  ensureGoTypePackages(goType);
  // Go reads a pattern with spaces only when quoted
  const directive = patterns.map((p) => (/\s/.test(p) ? JSON.stringify(p) : p)).join(' ');
  const declaration = `//go:embed ${directive}\nvar ${getSafeName(name)} ${goLocalType(goType)}`;
  if (emittingModuleFile) return declaration;
  mainPackageVariables.push(declaration);
  return '';
}

function hasEmbedDirective(code: string): boolean {
  return /^\/\/go:embed /m.test(code);
}

// Without the //go:embed lines: their file patterns (embed.txt) would read
// as uses of a package to the import pruning
function stripEmbedDirectives(code: string): string {
  return code.replace(/^\/\/go:embed .*$/gm, '');
}

// Import lines of a local or entry-point file: helper packages only when its
// own code names them; embed blank when only //go:embed directives need it
function goFileImportLines(fileCode: string): string {
  const code = stripEmbedDirectives(stripGoStrings(fileCode));
  const referenced = (pkg: string) => new RegExp(`(^|[^.\\w])${goPathAliases[pkg] ?? pkg.split('/').pop()!}\\.`).test(code);
  // (a standard package the code no longer references — its use was in a
  // branch emitted another way — is left out, as Go requires)
  const isStd = (pkg: string) => !pkg.split('/')[0].includes('.');
  const imports = [...importedPackages].filter((pkg) => {
    if (!helperProvidedPackages.has(pkg) && !(isStd(pkg) && pkg !== 'embed' && pkg !== 'C')) return true;
    return referenced(pkg);
  });
  // and a helper package the code uses whose helper another file registered first
  for (const pkg of allHelperPackages()) if (!imports.includes(pkg) && referenced(pkg)) imports.push(pkg);
  const blankEmbed = hasEmbedDirective(fileCode) && !referencesQualifier(code, 'embed');
  if (blankEmbed && !imports.includes('embed')) imports.push('embed');
  return imports
    .sort()
    .map((pkg) => (pkg === 'embed' && blankEmbed ? 'import _ "embed"' : goImportLine(pkg)))
    .join('\n');
}

// Every Go package some helper imports
function allHelperPackages(): Set<string> {
  const all = new Set<string>();
  for (const pkgs of Object.values(helperPackages)) for (const pkg of pkgs) all.add(pkg);
  for (const pkgs of Object.values(nodeRegistry.helperPackages)) for (const pkg of pkgs as string[]) all.add(pkg);
  return all;
}

// Whether Object.keys & co.'s argument is a Map / Record (an ordered map)
function isOrderedMapArg(node: AstNode | undefined): boolean {
  return !!node && (inferExpressionType(node) ?? '').startsWith('*TnMap[');
}

// Go source without its string literals (for detecting real package use)
function stripGoStrings(code: string): string {
  return code.replace(/"(?:[^"\\\n]|\\.)*"|`[^`]*`/g, '""');
}

// go:builtin is virtual: ref<T> → new(T), chan<T> → make(chan T),
// GoError → *TnError. No Go import; local names map to inline emitters.
function registerGoBuiltinAliases(node: AstNode): void {
  if (!node.importClause) return;
  const clause = node.importClause;
  if (clause.name) importAliases.set(clause.name.text, 'go:builtin');
  const bindings = clause.namedBindings;
  if (!bindings) return;
  if (isNamespaceImport(bindings)) {
    importAliases.set(bindings.name.text, 'go:builtin');
    return;
  }
  if (isNamedImports(bindings)) {
    for (const el of bindings.elements ?? []) {
      if (el.isTypeOnly) continue;
      const localName = el.name.text;
      const importedName = el.propertyName?.text ?? localName;
      importAliases.set(localName, `go:builtin.${importedName}`);
      registerGoBuiltin(localName, importedName);
    }
  }
}

function registerGoPackageAliases(node: AstNode, goPkg: string): void {
  // Real package name from metadata (math/rand/v2 → rand); fall back to the
  // last path segment for packages without metadata.
  const info = goPackage(goPkg);
  const pkgName = info ? info.name : goPkg.split('/').pop()!;
  // Collision alias (crypto/rand vs math/rand): the emitted qualifier.
  const qualifier = goPathAliases[goPkg] ?? pkgName;
  goPackageLocalNames.add(pkgName);
  goPackageLocalNames.add(qualifier);
  const named: GoNamedImport[] = [];
  let defaultName: string | null = null;
  let namespaceName: string | null = null;
  if (!node.importClause) {
    registerGoImport(goPkg, qualifier, null, null, []);
    return;
  }
  const clause = node.importClause;

  // Default import: `import fmt from 'go:fmt'` or `import myFmt from 'go:fmt'`
  if (clause.name) {
    defaultName = clause.name.text;
    if (clause.name.text !== pkgName && clause.name.text !== qualifier) {
      importAliases.set(clause.name.text, qualifier);
    }
  }

  if (clause.namedBindings) {
    if (isNamespaceImport(clause.namedBindings)) {
      // `import * as myFmt from 'go:fmt'`
      const localName = clause.namedBindings.name.text;
      namespaceName = localName;
      if (localName !== pkgName && localName !== qualifier) {
        importAliases.set(localName, qualifier);
      }
    } else if (isNamedImports(clause.namedBindings)) {
      // `import { Println, Sprintf as Spf } from 'go:fmt'`
      for (const el of clause.namedBindings.elements) {
        if (el.isTypeOnly) continue;
        const localName: string = el.name.text;
        const importedName: string = el.propertyName?.text ?? localName;
        importAliases.set(localName, `${qualifier}.${importedName}`);
        named.push({ imported: importedName, local: localName });
      }
    }
  }
  registerGoImport(goPkg, qualifier, defaultName, namespaceName, named);
}

function getImportLocalName(node: AstNode): string | null {
  const clause = node.importClause;
  if (!clause) return null;
  if (clause.name) return clause.name.text;
  if (clause.namedBindings) {
    if (isNamespaceImport(clause.namedBindings)) return clause.namedBindings.name.text;
  }
  return null;
}

// Per-module table: maps Node.js function name → Go expression template.
// For default/namespace imports (e.g. `import path from 'node:path'`), entries are registered
// as `callHandlers[localName.funcName]`. For named imports (e.g. `import { join } from 'node:path'`),
// the Go identifier is stored in importAliases so bare calls like `join(...)` resolve correctly.
// Each emitter registers the Go packages it needs via `needPkg` only when actually used,
// because Go rejects unused imports.
function needPkg(pkg: string): void {
  importedPackages.add(pkg);
}

// Marks a Go helper as used; also registers the packages the helper needs,
// since the import list is serialized before helpers are emitted.
const helperRequires: Record<string, string[]> = {
  objectAssign: ['orderedMap'],
  objectAssignTo: ['dynamic'],
  promiseAll: ['orderedMap', 'asyncWait', 'promise'],
  promise: ['error', 'eventLoop', 'asyncWait'],
  goMust: ['error'],
  goMaps: ['orderedMap'],
  bigint: ['error'],
  jsonStringify: ['error', 'dynamic', 'orderedMap'],
  dynamicSpread: ['dynamic', 'orderedMap'],
  weakRefs: ['eventLoop', 'dynamic'],
  builtins: ['error', 'dynamic', 'bigint'],
  date: ['error', 'dynamic'],
  goBlocking: ['error', 'eventLoop'],
  decorators: [],
  jsx: [],
  objectIntegrity: [],
  structuredClone: [],
  globalThis: ['dynamic'],
  namedGroups: ['orderedMap', 'regexMatch'],
  fancyRegex: ['orderedMap', 'regexMatch'],
  dynamic: ['error', 'strIndex'],
  regexMatch: ['strIndex'],
  classes: ['dynamic', 'error', 'orderedMap'],
  arraySubclass: ['dynamic', 'classes'],
  moduleUrl: ['pathToFileURL'],
  timerWait: ['eventLoop'],
  clock: [],
  asyncWait: ['eventLoop'],
  eventLoop: []
};

// Helpers with OS-specific variants (Windows APIs that would not compile
// elsewhere) are required as '<id>@os': the target OS's variant
// ('<id>@windows') when there is one, else '<id>@other'
function platformHelper(id: string): string {
  if (!id.endsWith('@os')) return id;
  const base = id.slice(0, id.length - 3);
  const specific = `${base}@${targetGoos}`;
  return specific in goHelpers || specific in nodeRegistry.goHelpers ? specific : `${base}@other`;
}

function useHelper(id: string): void {
  if (usedHelpers.has(id)) return;
  usedHelpers.add(id);
  // The match object type the named-groups helper returns
  if (id === 'namedGroups') {
    interfacePropertyTypes.set(
      'TnMatch',
      new Map<string, string>([['groups', '*TnMap[string, string]'], ['index', 'float64']])
    );
  }
  for (const dep of helperRequires[id] ?? nodeRegistry.helperRequires[id] ?? []) useHelper(platformHelper(dep));
  for (const pkg of helperPackages[id] ?? nodeRegistry.helperPackages[id] ?? []) {
    importedPackages.add(pkg);
    helperProvidedPackages.add(pkg);
  }
}

// Node.js standard library (src/node/*): functions, values and classes the
// transpiler resolves imports and Node globals against
// (services are bound in transpileToNative: a Go package-level initializer
// referring to visit() would be an initialization cycle)
const nodeRegistry: NodeRegistry = createNodeRegistry();

// --- node:test: call sites, mock.method targets, coverage counters ---

// The directory relative source names are resolved against (TranspileOptions.cwd)
let sourceRoot = '';

// A source file's absolute path, with forward slashes
function absoluteSourcePath(fileIndex: number): string {
  const name = fileIndex >= 0 && fileIndex < sourceFileNames.length ? sourceFileNames[fileIndex] : currentFileName;
  if (!name || !sourceRoot || name.startsWith('/') || /^[A-Za-z]:\//.test(name)) return name;
  return sourceRoot.endsWith('/') ? sourceRoot + name : `${sourceRoot}/${name}`;
}

// test('x') / it.skip() / t.test(): the called name's position, where Node's reports point
function callSitePosition(site: AstNode): SourcePosition {
  if (!site) return { file: '', line: 0, column: 0 };
  let target: AstNode = site.expression ?? site;
  if (isPropertyAccessExpression(target)) target = target.name;
  const line: number = target.line ?? site.line ?? 0;
  const column: number = target.column ?? site.column ?? 0;
  return { file: absoluteSourcePath(sourceFileIndexOf(site)), line: line, column: column };
}

// mock.method / getter / setter targets: calls through a namespace that a mock
// may replace ('console.log'), and the member names whose class methods get an
// override slot ('inc', 'get_value', 'set_value')
const mockedCallKeys = new Set<string>();
const mockedMemberNames = new Set<string>();
// Namespaces whose functions mock.method can replace (besides imported modules and classes)
const MOCKABLE_GLOBALS = new Set(['console', 'Math', 'Date', 'JSON', 'process', 'Object', 'Number', 'String', 'Array', 'Reflect', 'performance', 'crypto']);
// Marks where a class struct gets its override slots
const MOCK_SLOTS_MARK = '\t/*tn-mock-slots*/';

// 'method', 'get' or 'set': mock.getter, mock.setter, or mock.method's { getter: true } option
function mockAccessorKind(kind: string, args: AstNode[]): string {
  if (kind === 'getter') return 'get';
  if (kind === 'setter') return 'set';
  for (const arg of args.slice(2)) {
    if (!isObjectLiteralExpression(arg)) continue;
    for (const p of arg.properties ?? []) {
      if (isPropertyAssignment(p) && isIdentifier(p.name) && p.initializer?.kind === 'TrueKeyword') {
        if (p.name.text === 'getter') return 'get';
        if (p.name.text === 'setter') return 'set';
      }
    }
  }
  return 'method';
}

function mockSlotKey(accessor: string, name: string): string {
  let safe = '';
  for (const ch of name) safe += /[A-Za-z0-9_]/.test(ch) ? ch : '_';
  return accessor === 'method' ? safe : `${accessor}_${safe}`;
}

// mock.method(object, 'name') calls of a file, noted before its code compiles
function collectMockTargets(root: AstNode): void {
  const walk = (node: AstNode): void => {
    if (isCallExpression(node) && isPropertyAccessExpression(node.expression)) {
      const kind: string = node.expression.name.text;
      const tracker = node.expression.expression;
      const args: AstNode[] = node.arguments ?? [];
      const isTracker =
        (isIdentifier(tracker) && tracker.text === 'mock') || (isPropertyAccessExpression(tracker) && tracker.name.text === 'mock');
      if ((kind === 'method' || kind === 'getter' || kind === 'setter') && isTracker && args.length >= 2 && isStringLiteral(args[1])) {
        const name = String(args[1].text);
        mockedMemberNames.add(mockSlotKey(mockAccessorKind(kind, args), name));
        if (isIdentifier(args[0])) mockedCallKeys.add(`${args[0].text}.${name}`);
      }
    }
    for (const child of childNodes(node)) walk(child);
  };
  walk(root);
}

// console / Math / an imported module / a class (its statics): calls go by name
function isMockNamespace(node: AstNode): boolean {
  if (!isIdentifier(node)) return false;
  const name: string = node.text;
  if (classNames.has(name) || nodeLocalNames.has(name) || importAliases.has(name)) return true;
  return MOCKABLE_GLOBALS.has(name) && !variableGoTypes.has(name);
}

// '*Counter' / '*Box[float64]' → the class name ('' for other types)
function classNameOfGoType(goType: string): string {
  if (!goType.startsWith('*')) return '';
  let name = goType.slice(1);
  const bracket = name.indexOf('[');
  if (bracket > 0) name = name.slice(0, bracket);
  return classNames.has(name) ? name : '';
}

// The method / accessor declaration a class (or an ancestor) has for a member
function classMember(className: string, accessor: string, name: string): AstNode | undefined {
  const seen = new Set<string>();
  let current = className;
  while (current && !seen.has(current)) {
    seen.add(current);
    const decl = declaredClasses.get(current);
    for (const member of decl?.members ?? []) {
      if (!member.body || memberKey(member.name) !== name) continue;
      if (accessor === 'method' && isMethodDeclaration(member)) return member;
      if (accessor === 'get' && isGetAccessor(member)) return member;
      if (accessor === 'set' && isSetAccessor(member)) return member;
    }
    current = classParentNames.get(current) ?? '';
  }
  return undefined;
}

// mock.method / getter / setter: installs the mock where calls will find it
function emitMockMember(call: NodeCall, tracker: string, kind: string): string {
  const objectNode = call.nodes[0];
  const nameNode = call.nodes[1];
  if (!objectNode || !nameNode || !isStringLiteral(nameNode)) {
    reportError(call.site ?? objectNode, `mock.${kind}() needs the member name as a string literal`);
    return 'nil';
  }
  const name = String(nameNode.text);
  const accessor = mockAccessorKind(kind, call.nodes);
  const slotKey = mockSlotKey(accessor, name);
  const rest = call.args.slice(2).map((a) => `, ${a}`).join('');
  const object = call.args[0];
  const objectType = inferExpressionType(objectNode) ?? '';
  const className = classNameOfGoType(objectType);
  if (className && classMember(className, accessor, name)) {
    mockedMemberNames.add(slotKey);
    return `TnMockSlot(${tracker}, &${object}.tnMock_${slotKey}, ${object}.tnRaw_${slotKey}${rest})`;
  }
  if (objectType.startsWith('*struct{') && accessor !== 'set') {
    const field = parseStructFields(objectType.slice(1)).find((f) => f[0] === goFieldName(name));
    if (field && field[1].startsWith('func(')) return `TnMockMethod(${tracker}, ${JSON.stringify(name)}, &${object}.${field[0]}${rest})`;
  }
  if (isMockNamespace(objectNode) && accessor === 'method') {
    const key = `${objectNode.text}.${name}`;
    mockedCallKeys.add(key);
    return `TnMockGlobal(${tracker}, ${JSON.stringify(key)}${rest})`;
  }
  reportError(
    objectNode,
    `mock.${kind}(): '${name}' can't be mocked on this object (object-literal methods and getters, class instances' methods and accessors, and functions of namespaces such as console can)`
  );
  return 'nil';
}

// The Go type of the mock mock.method & co. return
function mockMemberType(call: NodeCall, kind: string): string {
  const fallback = 'func(...interface{}) interface{}';
  const objectNode = call.nodes[0];
  const nameNode = call.nodes[1];
  if (!objectNode || !nameNode || !isStringLiteral(nameNode)) return fallback;
  const name = String(nameNode.text);
  const accessor = mockAccessorKind(kind, call.nodes);
  const objectType = inferExpressionType(objectNode) ?? '';
  const className = classNameOfGoType(objectType);
  const member = className ? classMember(className, accessor, name) : undefined;
  if (member) return methodFuncType(member);
  if (objectType.startsWith('*struct{')) {
    const field = parseStructFields(objectType.slice(1)).find((f) => f[0] === goFieldName(name));
    if (field && field[1].startsWith('func(')) return field[1];
  }
  return fallback;
}

// The member a .mock read is on, through casts: (console.log as any).mock
function mockedMemberTarget(node: AstNode): AstNode {
  let target = node;
  while (target && (target.kind === 'ParenthesizedExpression' || isAsExpression(target) || target.kind === 'NonNullExpression')) target = target.expression;
  return target;
}

// instance.method.mock / console.log.mock: 'slot', 'global' or ''
function mockedMemberAccess(node: AstNode): string {
  const target = mockedMemberTarget(node);
  if (!isPropertyAccessExpression(target) || mockedMemberNames.size + mockedCallKeys.size === 0) return '';
  const name: string = target.name.text;
  const className = classNameOfGoType(inferExpressionType(target.expression) ?? '');
  if (className && mockedMemberNames.has(mockSlotKey('method', name)) && classMember(className, 'method', name)) return 'slot';
  if (isIdentifier(target.expression) && mockedCallKeys.has(`${target.expression.text}.${name}`) && isMockNamespace(target.expression)) return 'global';
  return '';
}

function visitMockAccess(node: AstNode): string {
  const target = mockedMemberTarget(node.expression);
  const access = mockedMemberAccess(target);
  if (access === 'slot') return `TnMockOf(${visit(target.expression)}.tnMock_${mockSlotKey('method', target.name.text)})`;
  if (access === 'global') return `TnMockedContext(${JSON.stringify(`${target.expression.text}.${target.name.text}`)})`;
  return `TnMockOf(${visit(target)})`;
}

// A call through a namespace a mock may replace: TnMockedCall runs the mock
// while one is in place (the arguments are evaluated for it), else the call
let routingMockedCall: AstNode | null = null;
function visitMockableCall(node: AstNode): string | undefined {
  if (mockedCallKeys.size === 0 || node === routingMockedCall) return undefined;
  const callee = node.expression;
  if (!isPropertyAccessExpression(callee) || !isIdentifier(callee.expression)) return undefined;
  const key = `${callee.expression.text}.${callee.name.text}`;
  if (!mockedCallKeys.has(key) || !isMockNamespace(callee.expression)) return undefined;
  const args: AstNode[] = node.arguments ?? [];
  if (args.some((a) => isSpreadElement(a))) return undefined;
  const type = inferExpressionType(node) ?? '';
  const isStatement = isExpressionStatement(node.parent);
  if (!type && !isStatement) return undefined;
  nodeRegistry.helper('nodeTest');
  const saved = routingMockedCall;
  routingMockedCall = node;
  const original = visit(node).trim();
  routingMockedCall = saved;
  const values = `func() []interface{} { return []interface{}{${args.map((a) => visit(a)).join(', ')}} }`;
  if (!type || type === 'void') return `TnMockedCallVoid(${JSON.stringify(key)}, ${values}, func() { ${original} })`;
  return `TnMockedCall[${type}](${JSON.stringify(key)}, ${values}, func() ${type} { return ${original} })`;
}

// A class method a mock may replace (see mock.method): the body moves to
// tnRaw_<key>, and the method calls the instance's tnMock_<key> while it is
// set; slots collects the struct fields. '' when the parameters can't be forwarded
function emitMockableMethod(receiver: string, goName: string, slotKey: string, signature: string, returnType: string, body: string, slots: string[]): string {
  const params = splitGoParameters(signature);
  if (params.some((p) => p.indexOf(' ') <= 0)) return '';
  const types = params.map((p) => p.slice(p.indexOf(' ') + 1).trim()).join(', ');
  const args = params.map((p) => {
    const name = p.slice(0, p.indexOf(' '));
    return p.slice(p.indexOf(' ') + 1).trim().startsWith('...') ? `${name}...` : name;
  }).join(', ');
  const field = `tnMock_${slotKey}`;
  if (!slots.some((s) => s.startsWith(`\t${field} `))) slots.push(`\t${field} func(${types})${returnType}`);
  const forward = returnType ? `return self.${field}(${args})` : `self.${field}(${args})\n\t\t\treturn`;
  const raw = `${returnType ? 'return ' : ''}self.tnRaw_${slotKey}(${args})`;
  return `func (self *${receiver}) tnRaw_${slotKey}(${signature})${returnType} ${body.trimEnd()}\n\nfunc (self *${receiver}) ${goName}(${signature})${returnType} {\n\t\tif self.${field} != nil {\n\t\t\t${forward}\n\t\t}\n\t\t${raw}\n\t}`;
}

// Coverage (node:test, --experimental-test-coverage): programs that import
// node:test count what runs. Each counted range is described like V8's
// (the script, its functions, their blocks), so the runtime can report
// lines, branches and functions as Node does (src/node/test_coverage.ts)
let coverageOn = false;
let coverageCounters = 0;
// Counters some generated code increments (the others stand for their enclosing range)
const coverageEmitted = new Set<number>();

// kind 0 the script, 1 a function, 2 a block; parent / fn index the file's ranges
interface CoverageRange {
  kind: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  counter: number;
  name: string;
  parent: number;
  fn: number;
}

interface CoverageFile {
  path: string;
  lines: number;
  lineLengths: number[];
  ignore: number[];
  loaded: number;
  ranges: CoverageRange[];
}

const coverageFiles: CoverageFile[] = [];
const COVERAGE_LOOPS = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoStatement']);
const COVERAGE_FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunction', 'MethodDeclaration', 'GetAccessor', 'SetAccessor', 'Constructor']);

// Lines a node:coverage comment excludes (ignore next [n], disable / enable), as Node reads them
function coverageIgnoredLines(lines: string[], count: number): number[] {
  const out: number[] = [];
  const nextMarker = '/* node:coverage ignore next';
  let ignoreCount = 0;
  let disabled = false;
  for (let i = 0; i < count; i++) {
    const line = lines[i];
    let ignore = false;
    if (ignoreCount > 0) {
      ignoreCount--;
      ignore = true;
    } else if (disabled) {
      ignore = true;
    }
    if (!ignore) {
      const at = line.indexOf(nextMarker);
      if (at >= 0) {
        const match = /^ (\d+ )?\*\//.exec(line.slice(at + nextMarker.length));
        if (match) ignoreCount = match[1] ? parseInt(match[1], 10) : 1;
      }
    }
    if (line.includes('/* node:coverage disable */')) {
      ignoreCount = 0;
      disabled = true;
    } else if (line.includes('/* node:coverage enable */')) {
      ignoreCount = 0;
      disabled = false;
    }
    if (ignore) out.push(i + 1);
  }
  return out;
}

// A function's name as V8 reports it: declared, or taken from what it's assigned to
function coverageFunctionName(node: AstNode): string {
  if (node.name && (isIdentifier(node.name) || isStringLiteral(node.name))) {
    const base = String(node.name.text);
    if (isGetAccessor(node)) return `get ${base}`;
    if (isSetAccessor(node)) return `set ${base}`;
    return base;
  }
  const parent = node.parent;
  if (isConstructorDeclaration(node)) return parent?.name && isIdentifier(parent.name) ? String(parent.name.text) : '';
  if (parent && isVariableDeclaration(parent) && isIdentifier(parent.name)) return String(parent.name.text);
  if (parent && (isPropertyAssignment(parent) || isPropertyDeclaration(parent)) && parent.name && isIdentifier(parent.name)) {
    return String(parent.name.text);
  }
  return '';
}

function coverageRange(file: CoverageFile, kind: number, node: AstNode, counter: number, name: string, parent: number, fn: number): number {
  let startColumn: number = node.column ?? 1;
  // `export function f`: V8's range starts at `function`
  if (kind === 1 && (node.modifiers ?? []).length > 0 && startColumn < 2) startColumn = 2;
  file.ranges.push({
    kind: kind,
    startLine: node.line ?? 1,
    startColumn: startColumn,
    endLine: node.endLine ?? node.line ?? 1,
    endColumn: node.endColumn ?? 1,
    counter: counter,
    name: name,
    parent: parent,
    fn: fn
  });
  return file.ranges.length - 1;
}

// Counts a source file's code (the AST gets counters and, for branches that
// are single statements, a block around them)
function instrumentCoverage(sf: AstNode, code: string): void {
  const first: AstNode = (sf.statements ?? [])[0];
  if (!coverageOn || !first || first.endLine === undefined) return;
  const text = code.split('\r\n').join('\n');
  const lines = text.split('\n');
  const lineCount = text.endsWith('\n') ? lines.length - 1 : lines.length;
  const file: CoverageFile = {
    path: absoluteSourcePath(sf.fileIndex),
    lines: lineCount,
    lineLengths: lines.map((l) => l.length),
    ignore: coverageIgnoredLines(lines, lineCount),
    loaded: coverageCounters++,
    ranges: []
  };
  sf.covLoaded = file.loaded;
  coverageFiles.push(file);
  file.ranges.push({ kind: 0, startLine: 1, startColumn: 1, endLine: lineCount + 1, endColumn: 1, counter: -1, name: '', parent: -1, fn: 0 });
  coverageStatements(sf.statements ?? [], file, 0, 0);
}

function coverageWalk(node: AstNode, file: CoverageFile, parent: number, fn: number): void {
  if (!node || typeof node !== 'object') return;
  if (COVERAGE_FUNCTIONS.has(node.kind) && node.body) {
    const r = coverageRange(file, 1, node, coverageCounters++, coverageFunctionName(node), parent, -1);
    file.ranges[r].fn = r;
    if (isBlock(node.body)) node.body.covEnter = file.ranges[r].counter;
    else node.covEnter = file.ranges[r].counter;
    for (const child of childNodes(node)) coverageWalk(child, file, r, r);
    return;
  }
  if ((node.kind === 'ClassDeclaration' || node.kind === 'ClassExpression') && !node.covFields) {
    // V8 runs instance field initializers as a function of their own
    const fields = (node.members ?? []).filter(
      (m: AstNode) => isPropertyDeclaration(m) && m.initializer && !(m.modifiers ?? []).some((mod: AstNode) => mod.kind === 'StaticKeyword')
    );
    if (fields.length > 0) {
      const last = fields[fields.length - 1];
      const r = coverageRange(file, 1, fields[0], coverageCounters++, '<instance_members_initializer>', parent, -1);
      file.ranges[r].fn = r;
      file.ranges[r].endLine = last.endLine ?? file.ranges[r].endLine;
      file.ranges[r].endColumn = last.endColumn ?? file.ranges[r].endColumn;
      node.covFields = file.ranges[r].counter;
      for (const m of fields) coverageWalk(m.initializer, file, r, r);
    }
    for (const child of childNodes(node)) {
      if (!fields.includes(child)) coverageWalk(child, file, parent, fn);
    }
    return;
  }
  if (isIfStatement(node)) {
    coverageWalk(node.expression, file, parent, fn);
    node.thenStatement = coverageBranch(node, node.thenStatement, file, parent, fn);
    if (node.elseStatement) node.elseStatement = coverageBranch(node, node.elseStatement, file, parent, fn);
    return;
  }
  if (COVERAGE_LOOPS.has(node.kind) && node.statement) {
    for (const child of childNodes(node)) {
      if (child !== node.statement) coverageWalk(child, file, parent, fn);
    }
    node.statement = coverageBranch(node, node.statement, file, parent, fn);
    return;
  }
  if (node.kind === 'CaseClause' || node.kind === 'DefaultClause') {
    if (node.expression) coverageWalk(node.expression, file, parent, fn);
    const r = coverageRange(file, 2, node, coverageCounters++, '', parent, fn);
    node.covEnter = file.ranges[r].counter;
    coverageStatements(node.statements ?? [], file, r, fn);
    return;
  }
  if (isTryStatement(node)) {
    coverageWalk(node.tryBlock, file, parent, fn);
    const blocks: AstNode[] = [node.catchClause?.block, node.finallyBlock];
    for (const block of blocks) {
      if (!block) continue;
      const r = coverageRange(file, 2, block, coverageCounters++, '', parent, fn);
      block.covEnter = file.ranges[r].counter;
      coverageStatements(block.statements ?? [], file, r, fn);
    }
    return;
  }
  if (isConditionalExpression(node)) {
    coverageWalk(node.condition, file, parent, fn);
    const t = coverageRange(file, 2, node.whenTrue, coverageCounters++, '', parent, fn);
    node.covThen = file.ranges[t].counter;
    coverageWalk(node.whenTrue, file, t, fn);
    const e = coverageRange(file, 2, node.whenFalse, coverageCounters++, '', parent, fn);
    node.covElse = file.ranges[e].counter;
    coverageWalk(node.whenFalse, file, e, fn);
    return;
  }
  if (isBlock(node) || node.kind === 'ModuleBlock') {
    coverageStatements(node.statements ?? [], file, parent, fn);
    return;
  }
  for (const child of childNodes(node)) coverageWalk(child, file, parent, fn);
}

// A branch's body (then / else / a loop's statement): a block range it enters
function coverageBranch(owner: AstNode, body: AstNode, file: CoverageFile, parent: number, fn: number): AstNode {
  let block = body;
  if (!isBlock(body)) {
    block = { kind: 'Block', statements: [body], parent: owner };
    body.parent = block;
  }
  const r = coverageRange(file, 2, body, coverageCounters++, '', parent, fn);
  block.covEnter = file.ranges[r].counter;
  coverageStatements(block.statements ?? [], file, r, fn);
  return block;
}

// A statement list; after a statement that can jump, the rest of the
// enclosing range is a continuation range (never reached after a return)
function coverageStatements(statements: AstNode[], file: CoverageFile, parent: number, fn: number): void {
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];
    coverageWalk(s, file, parent, fn);
    if (i === statements.length - 1 || s.endLine === undefined) continue;
    const jump = isReturnStatement(s) || isThrowStatement(s) || isBreakStatement(s) || s.kind === 'ContinueStatement';
    const compound = isIfStatement(s) || COVERAGE_LOOPS.has(s.kind) || isTryStatement(s) || isSwitchStatement(s) || s.kind === 'LabeledStatement';
    if (!jump && !compound) continue;
    const p = file.ranges[parent];
    const counter = jump ? -1 : coverageCounters++;
    file.ranges.push({ kind: 2, startLine: s.endLine, startColumn: s.endColumn, endLine: p.endLine, endColumn: p.endColumn, counter: counter, name: '', parent: parent, fn: fn });
    if (!jump) s.covAfter = counter;
  }
}

function coverageCount(counter: number): string {
  coverageEmitted.add(counter);
  return `tnCov[${counter}]++`;
}

// At a function body / branch block / case: its counter
function coverageEnter(node: AstNode): string {
  const counter = node?.covEnter;
  return typeof counter === 'number' ? `${coverageCount(counter)}\n\t\t` : '';
}

// After a statement that can jump: its continuation's counter
function coverageAfter(node: AstNode): string {
  const counter = node?.covAfter;
  return typeof counter === 'number' ? `\n\t${coverageCount(counter)}\n\t` : '';
}

// A file's top-level code ran (its report needs that)
function coverageLoaded(sf: AstNode): string {
  const counter = sf?.covLoaded;
  return typeof counter === 'number' ? `${coverageCount(counter)}\n\t` : '';
}

// An expression-bodied arrow's func code: the counter right inside its body
function withCoverageEntry(fn: AstNode, code: string, header: string): string {
  const enter = coverageEnter(fn);
  if (!enter || !code.startsWith(header)) return code;
  const brace = code.indexOf('{', header.length);
  if (brace < 0) return code;
  return `${code.slice(0, brace + 1)} ${enter}${code.slice(brace + 1)}`;
}

// The counters and the ranges they count, for the runtime
function coverageTables(): string {
  useHelper('nodeTestCoverage');
  const files: string[] = [];
  const ranges: string[] = [];
  for (let fi = 0; fi < coverageFiles.length; fi++) {
    const f = coverageFiles[fi];
    files.push(`{${JSON.stringify(f.path)}, ${f.lines}, []int{${f.ignore.join(', ')}}, ${f.loaded}}`);
    const ignored = new Set<number>(f.ignore);
    // Node's order: the script and its blocks, then each function and its blocks
    const order: number[] = [];
    for (let i = 0; i < f.ranges.length; i++) {
      if (f.ranges[i].kind > 1) continue;
      order.push(i);
      for (let j = 0; j < f.ranges.length; j++) {
        if (f.ranges[j].kind === 2 && f.ranges[j].fn === i) order.push(j);
      }
    }
    const positions: number[] = [];
    for (let j = 0; j < order.length; j++) positions[order[j]] = ranges.length + j;
    for (const index of order) {
      const r = f.ranges[index];
      // a counter no code increments stands for the range around it
      const counter = r.counter >= 0 && !coverageEmitted.has(r.counter) ? -2 : r.counter;
      const firstLine = r.startColumn <= 1 ? r.startLine : r.startLine + 1;
      let lastLine = r.endLine;
      if (r.endLine > f.lines) lastLine = f.lines;
      else if (r.endColumn <= 1 || r.endColumn - 1 < (f.lineLengths[r.endLine - 1] ?? 0)) lastLine = r.endLine - 1;
      let allIgnored = true;
      for (let l = r.startLine; l <= Math.min(r.endLine, f.lines); l++) {
        if (!ignored.has(l)) allIgnored = false;
      }
      const parent = r.parent < 0 ? -1 : positions[r.parent];
      ranges.push(`{${fi}, ${parent}, ${positions[r.fn]}, ${r.kind}, ${counter}, ${JSON.stringify(r.name)}, ${r.startLine}, ${firstLine}, ${lastLine}, ${allIgnored}}`);
    }
  }
  return `var tnCov = make([]uint32, ${Math.max(coverageCounters, 1)})\n\nvar tnCovFiles = []tnCovFile{\n\t${files.join(',\n\t')},\n}\n\nvar tnCovRanges = []tnCovRange{\n\t${ranges.join(',\n\t')},\n}`;
}

function bindNodeRegistryServices(): void {
  nodeRegistry.pkg = needPkg;
  nodeRegistry.helper = useHelper;
  nodeRegistry.temp = getTempName;
  nodeRegistry.typeOf = (node: AstNode) => inferExpressionType(node) ?? '';
  nodeRegistry.visit = (node: AstNode) => visit(node);
  nodeRegistry.categoryOf = (node: AstNode) => resolveExpressionType(node) ?? '';
  nodeRegistry.isArrayBuffer = (node: AstNode) => isArrayBufferExpression(node);
  nodeRegistry.entryPoint = (node: AstNode) => registerEntryPoint(node);
  nodeRegistry.callSite = (node: AstNode) => callSitePosition(node);
  nodeRegistry.mockMember = (call: NodeCall, tracker: string, kind: string) => emitMockMember(call, tracker, kind);
  nodeRegistry.mockMemberType = (call: NodeCall, kind: string) => mockMemberType(call, kind);
  bindConvertServices({
    pkg: needPkg,
    helper: useHelper,
    typeOf: (node: AstNode) => inferExpressionType(node) ?? '',
    localType: goLocalType,
    adapt: adaptClassToGoInterface
  });
  bindBridgeServices({
    pkg: needPkg,
    helper: useHelper,
    temp: getTempName,
    typeOf: (node: AstNode) => inferExpressionType(node) ?? '',
    visit: (node: AstNode) => visit(node),
    categoryOf: (node: AstNode) => resolveExpressionType(node) ?? '',
    goTypeOf: (node: AstNode) => getType(node),
    isIdentifier: (node: AstNode) => isIdentifier(node),
    isPropertyAccess: (node: AstNode) => isPropertyAccessExpression(node),
    isArrowFunction: (node: AstNode) => isArrowFunction(node),
    isFunctionExpression: (node: AstNode) => isFunctionExpression(node),
    isObjectLiteral: (node: AstNode) => isObjectLiteralExpression(node),
    declareLocal: (name: string, goType: string) => registerLocalVariable(name, goType)
  });
}
registerCore(nodeRegistry);
registerBuffer(nodeRegistry);
registerTypedArrays(nodeRegistry);
registerPath(nodeRegistry);
registerFs(nodeRegistry);
registerUrl(nodeRegistry);
registerOs(nodeRegistry);
registerProcess(nodeRegistry);
registerUtil(nodeRegistry);
registerUtilExtra(nodeRegistry);
registerConsole(nodeRegistry);
registerAssert(nodeRegistry);
registerPunycode(nodeRegistry);
registerQuerystring(nodeRegistry);
registerStringDecoder(nodeRegistry);
registerCrypto(nodeRegistry);
registerCryptoKeys(nodeRegistry);
registerZlib(nodeRegistry);
registerFsWatch(nodeRegistry);
registerTimers(nodeRegistry);
registerEvents(nodeRegistry);
registerStream(nodeRegistry);
registerDiagnosticsChannel(nodeRegistry);
registerConstants(nodeRegistry);
registerChildProcess(nodeRegistry);
registerReadline(nodeRegistry);
registerNet(nodeRegistry);
registerDns(nodeRegistry);
registerTls(nodeRegistry);
registerHttp(nodeRegistry);
registerDgram(nodeRegistry);
registerSqlite(nodeRegistry);
registerFetch(nodeRegistry);
registerStreamWeb(nodeRegistry);
registerAsyncHooks(nodeRegistry);
registerTest(nodeRegistry);
registerWorkerThreads(nodeRegistry);
registerCluster(nodeRegistry);
registerHttp2(nodeRegistry);
registerSystemExtra(nodeRegistry);
registerModuleV8(nodeRegistry);

// Go packages required by each helper, registered when the helper is used.
const helperPackages: Record<string, string[]> = {
  regexReplaceFirst: ['regexp'],
  dynamicSpread: ['sort'],
  entryPoints: ['os'],
  orderedMap: ['iter', 'encoding/json', 'bytes', 'fmt', 'reflect'],
  jsonStringify: ['encoding/json', 'bytes', 'io', 'strings', 'unsafe', 'reflect', 'math', 'fmt', 'sort', 'strconv', 'time', 'sync', 'unicode/utf8'],
  objectAssign: ['reflect', 'unsafe'],
  objectAssignTo: ['reflect', 'unsafe', 'sort', 'fmt', 'strings'],
  typeOf: ['reflect'],
  isArray: ['reflect'],
  iterators: [],
  weakRefs: ['weak', 'runtime', 'sync'],
  builtins: ['math', 'strconv', 'strings', 'math/big'],
  date: ['time', 'math', 'regexp', 'strings', 'strconv', 'fmt'],
  dynamic: ['math', 'strings', 'fmt', 'sort', 'reflect', 'strconv', 'regexp', 'unsafe', 'time'],
  classes: ['reflect'],
  arraySubclass: ['reflect'],
  numTruthy: ['math'],
  iterable: ['reflect'],
  regexReplaceFunc: ['regexp'],
  pathToFileURL: ['net/url', 'path/filepath', 'strings'],
  osPlatform: ['runtime'],
  error: ['runtime', 'strings', 'fmt'],
  bigint: ['math/big', 'math'],
  symbol: [],
  fancyRegex: ['regexp', 'strings', 'strconv', 'fmt', 'sort', 'unicode/utf8', 'unicode'],
  namedGroups: ['regexp', 'unicode/utf8'],
  regexMatch: ['regexp', 'strings', 'strconv', 'math', 'unicode/utf8'],
  strIndex: ['unicode/utf8', 'sync/atomic', 'unsafe', 'math', 'strings'],
  jsReplacement: ['strings'],
  moduleUrl: ['os'],
  asyncWait: [],
  timerWait: ['sort', 'sync', 'sync/atomic', 'time'],
  clock: ['time'],
  eventLoop: ['sync', 'sync/atomic', 'time'],
  uri: ['strings', 'fmt', 'net/url'],
  promiseAll: [],
  promise: ['sync', 'reflect'],
  goMust: [],
  goNums: [],
  goMaps: [],
  goStrings: [],
  goBlocking: [],
  decorators: [],
  jsx: ['strings', 'html', 'reflect', 'strconv', 'fmt'],
  objectIntegrity: ['sync', 'reflect'],
  structuredClone: ['reflect', 'unsafe'],
  globalThis: [],
  getenv: ['os'],
};

// Go helper sources emitted (once) into the main output file when used.
// Field names are intentionally lowercase: every generated file is `package main`,
// so `result.stdout` in emitted code resolves to the struct field directly.
const goHelpers: Record<string, string> = {
  iterators: `// Iterator helpers over generators (channels): lazy, one goroutine per stage
type TnIterResult[T any] struct {
	value T
	done  bool
}

// The first result of an iterator over items (map.values().next())
func TnIterFirst[T any](items []T) *TnIterResult[T] {
	if len(items) == 0 {
		return &TnIterResult[T]{done: true}
	}
	return &TnIterResult[T]{value: items[0]}
}

// it.next(): { value, done }
func TnIterNext[T any](ch chan T) *TnIterResult[T] {
	v, ok := <-ch
	return &TnIterResult[T]{value: v, done: !ok}
}

// Iterator.from(array)
func TnIterFrom[T any](values []T) chan T {
	ch := make(chan T)
	go func() {
		defer close(ch)
		for _, v := range values {
			ch <- v
		}
	}()
	return ch
}

func TnIterMap[T, U any](ch chan T, fn func(T, float64) U) chan U {
	out := make(chan U)
	go func() {
		defer close(out)
		i := 0.0
		for v := range ch {
			out <- fn(v, i)
			i++
		}
	}()
	return out
}

func TnIterFilter[T any](ch chan T, fn func(T, float64) bool) chan T {
	out := make(chan T)
	go func() {
		defer close(out)
		i := 0.0
		for v := range ch {
			if fn(v, i) {
				out <- v
			}
			i++
		}
	}()
	return out
}

func TnIterFlatMap[T, U any](ch chan T, fn func(T, float64) []U) chan U {
	out := make(chan U)
	go func() {
		defer close(out)
		i := 0.0
		for v := range ch {
			for _, u := range fn(v, i) {
				out <- u
			}
			i++
		}
	}()
	return out
}

func TnIterTake[T any](ch chan T, n float64) chan T {
	out := make(chan T)
	go func() {
		defer close(out)
		if n <= 0 {
			return
		}
		count := 0.0
		for v := range ch {
			out <- v
			count++
			if count >= n {
				return
			}
		}
	}()
	return out
}

func TnIterDrop[T any](ch chan T, n float64) chan T {
	out := make(chan T)
	go func() {
		defer close(out)
		count := 0.0
		for v := range ch {
			if count >= n {
				out <- v
			}
			count++
		}
	}()
	return out
}

func TnIterToArray[T any](ch chan T) []T {
	out := []T{}
	for v := range ch {
		out = append(out, v)
	}
	return out
}

func TnIterForEach[T any](ch chan T, fn func(T, float64)) {
	i := 0.0
	for v := range ch {
		fn(v, i)
		i++
	}
}

func TnIterSome[T any](ch chan T, fn func(T, float64) bool) bool {
	i := 0.0
	for v := range ch {
		if fn(v, i) {
			return true
		}
		i++
	}
	return false
}

func TnIterEvery[T any](ch chan T, fn func(T, float64) bool) bool {
	i := 0.0
	for v := range ch {
		if !fn(v, i) {
			return false
		}
		i++
	}
	return true
}

func TnIterFind[T any](ch chan T, fn func(T, float64) bool) T {
	i := 0.0
	for v := range ch {
		if fn(v, i) {
			return v
		}
		i++
	}
	var zero T
	return zero
}

func TnIterReduce[T, A any](ch chan T, fn func(A, T, float64) A, acc A, hasInitial bool) A {
	i := 0.0
	for v := range ch {
		if !hasInitial {
			if a, ok := interface{}(v).(A); ok {
				acc = a
			}
			hasInitial = true
		} else {
			acc = fn(acc, v, i)
		}
		i++
	}
	return acc
}`,
  weakRefs: `// WeakRef: a weak pointer to an object (Go's weak package)
type TnWeakRef[T any] struct{ p weak.Pointer[T] }

func TnNewWeakRef[T any](v *T) *TnWeakRef[T] { return &TnWeakRef[T]{p: weak.Make(v)} }

// ref.deref(): the object, or nil once it was garbage-collected
func (w *TnWeakRef[T]) deref() *T { return w.p.Value() }

// FinalizationRegistry: after a registered target is garbage-collected, the
// callback runs on the event loop with its held value (runtime.AddCleanup)
type TnFinalizationRegistry struct {
	callback func(interface{})
	mu       sync.Mutex
	tokens   map[interface{}][]runtime.Cleanup
}

func TnNewFinalizationRegistry(callback func(interface{})) *TnFinalizationRegistry {
	return &TnFinalizationRegistry{callback: callback, tokens: map[interface{}][]runtime.Cleanup{}}
}

func TnRegistryRegister[T any](r *TnFinalizationRegistry, target *T, held interface{}, token interface{}) {
	callback := r.callback
	cleanup := runtime.AddCleanup(target, func(h interface{}) { TnLoopPost(func() { callback(h) }) }, held)
	if token != nil {
		r.mu.Lock()
		r.tokens[token] = append(r.tokens[token], cleanup)
		r.mu.Unlock()
	}
}

// registry.unregister(token): stops the cleanups registered with it
func (r *TnFinalizationRegistry) unregister(token interface{}) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	cleanups, ok := r.tokens[token]
	for _, c := range cleanups {
		c.Stop()
	}
	delete(r.tokens, token)
	return ok
}`,
  builtins: `// Smaller ECMAScript built-ins (Number, Math, String, Object.is, BigInt)
// n.toExponential(digits?): JS writes the exponent without padding (1.5e+3)
func TnToExponential(x float64, digits float64, hasDigits bool) string {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return TnNumStr(x)
	}
	precision := -1
	if hasDigits {
		precision = int(digits)
	}
	s := strconv.FormatFloat(x, 'e', precision, 64)
	mantissa, exponent, _ := strings.Cut(s, "e")
	sign := exponent[:1]
	exponent = strings.TrimLeft(exponent[1:], "0")
	if exponent == "" {
		exponent = "0"
	}
	return mantissa + "e" + sign + exponent
}

// Math.sumPrecise: Neumaier-compensated sum
func TnSumPrecise(values []float64) float64 {
	sum, compensation := 0.0, 0.0
	for _, v := range values {
		t := sum + v
		if math.Abs(sum) >= math.Abs(v) {
			compensation += (sum - t) + v
		} else {
			compensation += (v - t) + sum
		}
		sum = t
	}
	if len(values) == 0 {
		return math.Copysign(0, -1)
	}
	return sum + compensation
}

// Object.is: SameValue (NaN is NaN, +0 is not -0)
func TnObjectIs(a, b interface{}) bool {
	fa, aok := a.(float64)
	fb, bok := b.(float64)
	if aok && bok {
		if math.IsNaN(fa) && math.IsNaN(fb) {
			return true
		}
		return fa == fb && math.Signbit(fa) == math.Signbit(fb)
	}
	return TnSame(a, b)
}

// BigInt(value): integers, numeric strings, booleans and bigints
func TnBigIntOf(v interface{}) *tnbig.Int {
	switch x := v.(type) {
	case *tnbig.Int:
		return x
	case bool:
		if x {
			return tnbig.NewInt(1)
		}
		return tnbig.NewInt(0)
	case float64:
		if x != math.Trunc(x) || math.IsInf(x, 0) || math.IsNaN(x) {
			panic(TnNodeError("RangeError", "", "The number "+TnNumStr(x)+" cannot be converted to a BigInt because it is not an integer"))
		}
		b, _ := new(tnbig.Float).SetFloat64(x).Int(nil)
		return b
	case string:
		t := strings.TrimSpace(x)
		if t == "" {
			return tnbig.NewInt(0)
		}
		if b, ok := new(tnbig.Int).SetString(t, 0); ok && !strings.ContainsAny(t, "_") {
			return b
		}
		panic(TnNodeError("SyntaxError", "", "Cannot convert "+x+" to a BigInt"))
	}
	panic(TnNodeError("TypeError", "", "Cannot convert "+TnJSString(v)+" to a BigInt"))
}

// BigInt.asIntN / asUintN: x modulo 2^bits (signed: two's complement)
func TnBigIntAsN(bits float64, x *tnbig.Int, signed bool) *tnbig.Int {
	n := uint(bits)
	if n == 0 {
		return tnbig.NewInt(0)
	}
	modulus := new(tnbig.Int).Lsh(tnbig.NewInt(1), n)
	r := new(tnbig.Int).Mod(x, modulus)
	if signed && r.Cmp(new(tnbig.Int).Rsh(modulus, 1)) >= 0 {
		r.Sub(r, modulus)
	}
	return r
}

// s.codePointAt(i): NaN past the end (JS: undefined)

// s.lastIndexOf(search, fromIndex)
func TnLastIndexFrom(s, search string, from float64) float64 {
	if math.IsNaN(from) {
		return float64(strings.LastIndex(s, search))
	}
	end := int(math.Max(0, from)) + len(search)
	if end > len(s) {
		end = len(s)
	}
	return float64(strings.LastIndex(s[:end], search))
}`,
  date: `// Dates: time.Time in the local zone; the zero time is an Invalid Date
func TnDateMs(t time.Time) float64 {
	if t.IsZero() {
		return math.NaN()
	}
	return float64(t.UnixMilli())
}

// new Date(ms): NaN or beyond ±8.64e15 ms is an Invalid Date
func TnDateFromMs(ms float64) time.Time {
	if math.IsNaN(ms) || math.Abs(ms) > 8.64e15 {
		return time.Time{}
	}
	return time.UnixMilli(int64(ms))
}

// new Date(value): another Date, a date string or a time value
func TnNewDate(v interface{}) time.Time {
	switch x := v.(type) {
	case time.Time:
		return x
	case *time.Time:
		if x != nil {
			return *x
		}
	case string:
		return TnParseDate(x)
	case nil:
		return TnDateFromMs(0)
	}
	return TnDateFromMs(TnNumber(v))
}

// new Date(y, m, d?, h?, min?, s?, ms?): local time; fields overflow as in JS
func TnDateFields(loc *time.Location, fields ...float64) time.Time {
	vals := []float64{0, 0, 1, 0, 0, 0, 0}
	copy(vals, fields)
	for _, f := range vals {
		if math.IsNaN(f) || math.IsInf(f, 0) {
			return time.Time{}
		}
	}
	year := int(vals[0])
	if year >= 0 && year <= 99 {
		year += 1900
	}
	t := time.Date(year, time.Month(int(vals[1])+1), int(vals[2]), int(vals[3]), int(vals[4]), int(vals[5]), 0, loc)
	return t.Add(time.Duration(vals[6]) * time.Millisecond).In(time.Local)
}

var tnISODate = regexp.MustCompile("^([+-]\\\\d{6}|\\\\d{4})(?:-(\\\\d{2})(?:-(\\\\d{2}))?)?(?:[T ](\\\\d{2}):(\\\\d{2})(?::(\\\\d{2})(?:[.,](\\\\d+))?)?)?\\\\s*(Z|z|[+-]\\\\d{2}:?\\\\d{2})?$")

var tnDateLayouts = []string{
	"Mon Jan 02 2006 15:04:05 GMT-0700",
	"Mon Jan 2 2006 15:04:05 GMT-0700",
	"Mon, 02 Jan 2006 15:04:05 GMT",
	"Mon, 2 Jan 2006 15:04:05 GMT",
	"Mon, 02 Jan 2006 15:04:05 -0700",
	"Mon Jan 02 2006",
	"Mon Jan 02 2006 15:04:05",
	"January 2, 2006 15:04:05",
	"January 2, 2006",
	"Jan 2, 2006 15:04:05",
	"Jan 2, 2006",
	"2 January 2006",
	"2 Jan 2006",
	"2006/01/02 15:04:05",
	"2006/01/02",
	"2006/1/2",
	"01/02/2006 15:04:05",
	"1/2/2006 15:04:05",
	"01/02/2006",
	"1/2/2006",
}

// Date.parse / new Date(string): the ISO format (date-only forms are UTC,
// date-times without an offset local), then the formats V8 also accepts
func TnParseDate(s string) time.Time {
	s = strings.TrimSpace(s)
	if m := tnISODate.FindStringSubmatch(s); m != nil {
		num := func(part string, def int) int {
			if part == "" {
				return def
			}
			n, _ := strconv.Atoi(part)
			return n
		}
		year := num(m[1], 0)
		month, day := num(m[2], 1), num(m[3], 1)
		hour, minute, second := num(m[4], 0), num(m[5], 0), num(m[6], 0)
		if month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 59 {
			return time.Time{}
		}
		nanos := 0
		if m[7] != "" {
			frac := (m[7] + "000000000")[:9]
			nanos, _ = strconv.Atoi(frac)
			nanos = nanos / 1000000 * 1000000
		}
		loc := time.Local
		if m[4] == "" || m[8] == "Z" || m[8] == "z" {
			loc = time.UTC
		} else if m[8] != "" {
			zone := strings.ReplaceAll(m[8], ":", "")
			hours, _ := strconv.Atoi(zone[1:3])
			mins, _ := strconv.Atoi(zone[3:5])
			offset := hours*3600 + mins*60
			if zone[0] == '-' {
				offset = -offset
			}
			loc = time.FixedZone("", offset)
		}
		return time.Date(year, time.Month(month), day, hour, minute, second, nanos, loc).In(time.Local)
	}
	// "… GMT+0100 (Central European Standard Time)": the zone name is a comment
	if i := strings.Index(s, " ("); i > 0 && strings.HasSuffix(s, ")") {
		s = s[:i]
	}
	for _, layout := range tnDateLayouts {
		loc := time.Local
		if strings.HasSuffix(layout, "GMT") {
			loc = time.UTC
		}
		if t, err := time.ParseInLocation(layout, s, loc); err == nil {
			return t.In(time.Local)
		}
	}
	return time.Time{}
}

// d.setHours(h, m?, s?, ms?) & co.: the date with those fields changed (local
// or UTC); a NaN field makes an Invalid Date
func TnDateSet(t time.Time, field string, utc bool, args ...float64) time.Time {
	if field == "time" {
		if len(args) == 0 {
			return time.Time{}
		}
		return TnDateFromMs(args[0])
	}
	loc := time.Local
	if utc {
		loc = time.UTC
	}
	if t.IsZero() {
		if field != "fullYear" {
			return t
		}
		t = time.UnixMilli(0)
	}
	lt := t.In(loc)
	f := []float64{float64(lt.Year()), float64(int(lt.Month()) - 1), float64(lt.Day()), float64(lt.Hour()), float64(lt.Minute()), float64(lt.Second()), float64(lt.Nanosecond() / 1000000)}
	start := map[string]int{"fullYear": 0, "month": 1, "date": 2, "hours": 3, "minutes": 4, "seconds": 5, "milliseconds": 6}[field]
	limit := map[string]int{"fullYear": 3, "month": 2, "date": 1, "hours": 4, "minutes": 3, "seconds": 2, "milliseconds": 1}[field]
	for i, a := range args {
		if i >= limit {
			break
		}
		f[start+i] = a
	}
	for _, v := range f {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return time.Time{}
		}
	}
	nt := time.Date(int(f[0]), time.Month(int(f[1])+1), int(f[2]), int(f[3]), int(f[4]), int(f[5]), 0, loc)
	return nt.Add(time.Duration(f[6]) * time.Millisecond).In(time.Local)
}

func TnDateFormat(t time.Time, kind string) string {
	if t.IsZero() {
		if kind == "iso" {
			panic(TnNodeError("RangeError", "", "Invalid time value"))
		}
		return "Invalid Date"
	}
	switch kind {
	case "iso":
		u := t.UTC()
		if u.Year() < 0 || u.Year() > 9999 {
			sign := "+"
			year := u.Year()
			if year < 0 {
				sign, year = "-", -year
			}
			return fmt.Sprintf("%s%06d", sign, year) + u.Format("-01-02T15:04:05.000Z")
		}
		return u.Format("2006-01-02T15:04:05.000Z")
	case "date":
		return t.Format("Mon Jan 02 2006")
	case "time":
		return t.Format("15:04:05 ") + tnZoneSuffix(t)
	case "utc":
		return t.UTC().Format("Mon, 02 Jan 2006 15:04:05 GMT")
	case "localeDate":
		return t.Format("1/2/2006")
	case "localeTime":
		return t.Format("3:04:05 PM")
	case "locale":
		return t.Format("1/2/2006, 3:04:05 PM")
	}
	return TnDateString(t)
}

func TnDateTimezoneOffset(t time.Time) float64 {
	if t.IsZero() {
		return math.NaN()
	}
	_, offset := t.Zone()
	return float64(-offset / 60)
}`,
  arrayWrite: `// arr[i] = v: past the end the array grows, as in JS (holes are zero values)
func TnSetAt[T any](s *[]T, i float64, v T) {
	n := int(i)
	if n < 0 {
		return // a[-1] = v sets a property in JS, not an element
	}
	if n >= len(*s) {
		*s = append(*s, make([]T, n-len(*s)+1)...)
	}
	(*s)[n] = v
}`,
  isArray: `// x instanceof Array: slices and the *[]T of array variables (not Buffers / Uint8Arrays)
func TnIsArray(v interface{}) bool {
	if _, ok := v.([]byte); ok {
		return false
	}
	if _, ok := v.(interface{ TnItems() *[]interface{} }); ok {
		return true
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() {
		rv = rv.Elem()
	}
	return rv.Kind() == reflect.Slice
}`,
  dynamic: `// Dynamic (any) values: JSON-like objects are map[string]interface{},
// arrays []interface{}, numbers float64
// A nullable primitive (*T) as the JS value it holds: its T, or undefined
func tnPlainValue(v interface{}) interface{} {
	switch p := v.(type) {
	case *string:
		if p == nil {
			return nil
		}
		return *p
	case *float64:
		if p == nil {
			return nil
		}
		return *p
	case *bool:
		if p == nil {
			return nil
		}
		return *p
	}
	return v
}

// obj.key read by the program: as TnGet, but an array field reads as a
// reference to it — JS arrays are shared, so a push or splice through the
// value read changes the field
func TnGetRef(obj interface{}, key string) interface{} {
	rv := reflect.ValueOf(obj)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		for _, name := range []string{key, key + "_"} {
			if f := rv.Elem().FieldByName(name); f.IsValid() && f.CanAddr() {
				if f.Kind() == reflect.Slice && f.Type().Elem().Kind() != reflect.Uint8 {
					if f.IsNil() {
						return nil
					}
					return reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Interface()
				}
				break
			}
		}
	}
	return TnGet(obj, key)
}

func TnGet(obj interface{}, key string) interface{} {
	switch o := obj.(type) {
	case map[string]interface{}:
		return o[key]
	case []interface{}:
		if key == "length" {
			return float64(len(o))
		}
	case string:
		if key == "length" {
			return float64(tnStrCount(o))
		}
	case interface{ TnProp(string) (interface{}, bool) }:
		if v, ok := o.TnProp(key); ok || key != "length" {
			return v
		}
	case *TnError:
		if key == "message" {
			return o.message
		}
		if key == "code" {
			if o.code == "" {
				return o.prop("code")
			}
			return o.code
		}
		if key == "name" {
			return o.Get_name()
		}
		if key == "stack" {
			return o.Get_stack()
		}
		return o.prop(key)
	}
	rv := reflect.ValueOf(obj)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		for _, name := range []string{key, key + "_"} {
			if f := rv.Elem().FieldByName(name); f.IsValid() {
				// Unexported field: read it through a pointer to bypass the flag
				// (a T | undefined field reads as its value, or undefined)
				return tnPlainValue(reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface())
			}
		}
		// a getter (get x() → Get_x)
		if m := rv.MethodByName("Get_" + key); m.IsValid() && m.Type().NumIn() == 0 && m.Type().NumOut() == 1 {
			return m.Call(nil)[0].Interface()
		}
	}
	if key == "length" {
		return TnLength(obj)
	}
	return nil
}

// A nullable primitive's value, or nil
func TnPtrValue[T any](p *T) interface{} {
	if p == nil {
		return nil
	}
	return *p
}

// A dynamic call's argument (undefined past the end)
func TnArg(args []interface{}, i int) interface{} {
	if i < len(args) {
		return args[i]
	}
	return nil
}

// A rest parameter's values from a dynamic call's arguments
func TnRestArgs(args []interface{}, i int) []interface{} {
	if i < len(args) {
		return args[i:]
	}
	return nil
}

func TnRestArgsAs[T any](args []interface{}, i int) []T {
	var out []T
	for ; i < len(args); i++ {
		out = append(out, TnAs[T](args[i]))
	}
	return out
}

// obj.name(…args) on a dynamic value whose class has no such method: a
// function-valued property (an object literal's method, a record's function)
func TnCallMember(obj interface{}, name string, args ...interface{}) interface{} {
	// a Map / Set's methods (Get, Set, Has … on the ordered map)
	if kind, ok := obj.(interface{ TnJSKind() uint8 }); ok {
		if v, handled := tnCallCollection(obj, kind.TnJSKind() == 2, name, args); handled {
			return v
		}
	}
	fn := TnGet(obj, name)
	if fn == nil {
		panic(TnNodeError("TypeError", "", fmt.Sprintf("%s is not a function", name)))
	}
	return TnCallValue(fn, args...)
}

func tnCallCollection(obj interface{}, isSet bool, name string, args []interface{}) (interface{}, bool) {
	rv := reflect.ValueOf(obj)
	call := func(method string, in ...interface{}) interface{} {
		m := rv.MethodByName(method)
		vals := make([]reflect.Value, m.Type().NumIn())
		for i := range vals {
			var a interface{}
			if i < len(in) {
				a = in[i]
			}
			vals[i] = tnConvertTo(a, m.Type().In(i))
		}
		out := m.Call(vals)
		if len(out) == 0 {
			return nil
		}
		return out[0].Interface()
	}
	arg := func(i int) interface{} {
		if i < len(args) {
			return args[i]
		}
		return nil
	}
	switch name {
	case "get":
		return call("Get", arg(0)), true
	case "has":
		return call("Has", arg(0)), true
	case "delete":
		return call("Delete", arg(0)), true
	case "clear":
		call("Clear")
		return nil, true
	case "set":
		call("Set", arg(0), arg(1))
		return obj, true
	case "add":
		if isSet {
			m := rv.MethodByName("Set")
			m.Call([]reflect.Value{tnConvertTo(arg(0), m.Type().In(0)), reflect.Zero(m.Type().In(1))})
			return obj, true
		}
	case "keys":
		return call("Keys"), true
	case "values":
		if isSet {
			return call("Keys"), true
		}
		return call("Values"), true
	case "entries":
		return call("Entries"), true
	}
	return nil, false
}

// Calls a function value held as any, converting the arguments to its
// parameter types; its result (or nil)
func TnCallValue(fn interface{}, args ...interface{}) interface{} {
	fv := reflect.ValueOf(fn)
	if fv.Kind() != reflect.Func {
		panic(TnNodeError("TypeError", "", "value is not a function"))
	}
	ft := fv.Type()
	in := make([]reflect.Value, 0, len(args))
	for i := 0; i < ft.NumIn(); i++ {
		if ft.IsVariadic() && i == ft.NumIn()-1 {
			elem := ft.In(i).Elem()
			for j := i; j < len(args); j++ {
				in = append(in, tnConvertTo(args[j], elem))
			}
			break
		}
		var arg interface{}
		if i < len(args) {
			arg = args[i]
		}
		in = append(in, tnConvertTo(arg, ft.In(i)))
	}
	out := fv.Call(in)
	if len(out) == 0 {
		return nil
	}
	return out[0].Interface()
}

// new Error(message, { cause })
func TnErrorWithOptions(e *TnError, options interface{}) *TnError {
	if options == nil {
		return e
	}
	if e.props == nil {
		e.props = map[string]interface{}{}
	}
	if m, ok := options.(map[string]interface{}); ok {
		if cause, present := m["cause"]; present {
			e.props["cause"] = cause
		}
		return e
	}
	rv := reflect.ValueOf(options)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct && rv.Elem().FieldByName("cause").IsValid() {
		e.props["cause"] = TnGet(options, "cause")
	}
	return e
}

func TnSet(obj interface{}, key string, value interface{}) {
	if o, ok := obj.(map[string]interface{}); ok {
		o[key] = value
		return
	}
	if tnSetMember(obj, key, value) {
		return
	}
	panic(fmt.Sprintf("TnSet: cannot set property %s of %T", key, obj))
}

// obj.key = value on a typed value held as any: a setter (Set_key), a
// record's key, or a struct field (inherited ones too)
func tnSetMember(obj interface{}, key string, value interface{}) bool {
	rv := reflect.ValueOf(obj)
	if !rv.IsValid() {
		return false
	}
	if m := rv.MethodByName("Set_" + key); m.IsValid() && m.Type().NumIn() == 1 {
		m.Call([]reflect.Value{tnConvertTo(value, m.Type().In(0))})
		return true
	}
	if strings.HasPrefix(rv.Type().String(), "*main.TnMap[") {
		if set := rv.MethodByName("Set"); set.IsValid() && set.Type().NumIn() == 2 {
			set.Call([]reflect.Value{tnConvertTo(key, set.Type().In(0)), tnConvertTo(value, set.Type().In(1))})
			return true
		}
	}
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		sv := rv.Elem()
		f := sv.FieldByName(key)
		if !f.IsValid() {
			f = sv.FieldByName(key + "_")
		}
		if f.IsValid() && f.CanAddr() {
			f = reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem()
			f.Set(tnConvertTo(value, f.Type()))
			return true
		}
	}
	return false
}

func tnConvertTo(v interface{}, t reflect.Type) reflect.Value {
	if v == nil {
		return reflect.Zero(t)
	}
	if converted, ok := TnConvertDynamic(v, t); ok {
		return converted
	}
	return reflect.Zero(t)
}

func TnSetIndex(obj interface{}, key interface{}, value interface{}) {
	switch o := obj.(type) {
	case map[string]interface{}:
		if k, ok := key.(string); ok {
			o[k] = value
			return
		}
	case []interface{}:
		if i, ok := key.(float64); ok && i >= 0 && int(i) < len(o) {
			o[int(i)] = value
			return
		}
	case interface{ TnItems() *[]interface{} }:
		if i, ok := key.(float64); ok && i >= 0 && i == float64(int(i)) {
			items := o.TnItems()
			for len(*items) <= int(i) {
				*items = append(*items, nil)
			}
			(*items)[int(i)] = value
			return
		}
	}
	// a typed array (a slice, or an array reference that can grow)
	if i, ok := key.(float64); ok && i >= 0 && i == float64(int(i)) {
		rv := reflect.ValueOf(obj)
		if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
			sv := rv.Elem()
			for sv.Len() <= int(i) {
				sv.Set(reflect.Append(sv, reflect.Zero(sv.Type().Elem())))
			}
			sv.Index(int(i)).Set(tnConvertTo(value, sv.Type().Elem()))
			return
		}
		if rv.Kind() == reflect.Slice && int(i) < rv.Len() {
			rv.Index(int(i)).Set(tnConvertTo(value, rv.Type().Elem()))
			return
		}
	}
	if k, ok := key.(string); ok && tnSetMember(obj, k, value) {
		return
	}
	panic(fmt.Sprintf("TnSetIndex: cannot set property %v", key))
}

func TnIndex(obj interface{}, key interface{}) interface{} {
	switch o := obj.(type) {
	case map[string]interface{}:
		if k, ok := key.(string); ok {
			return o[k]
		}
	case []interface{}:
		if i, ok := key.(float64); ok && i >= 0 && int(i) < len(o) {
			return o[int(i)]
		}
	case string:
		if i, ok := key.(float64); ok && i >= 0 && int(i) < tnStrCount(o) {
			return TnCharAt(o, i)
		}
	case []byte:
		if i, ok := key.(float64); ok && i >= 0 && int(i) < len(o) {
			return float64(o[int(i)])
		}
	case interface{ TnProp(string) (interface{}, bool) }:
		if k, ok := key.(string); ok {
			v, _ := o.TnProp(k)
			return v
		}
	case interface{ TnItems() *[]interface{} }:
		items := *o.TnItems()
		if i, ok := key.(float64); ok {
			if i >= 0 && int(i) < len(items) && i == float64(int(i)) {
				return items[int(i)]
			}
			return nil
		}
	}
	// typed slices held as any ([]*struct{…}, *[]T reference arrays)
	if i, ok := key.(float64); ok && obj != nil {
		rv := reflect.ValueOf(obj)
		if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
			rv = rv.Elem()
		}
		if (rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array) && i >= 0 && int(i) < rv.Len() && i == float64(int(i)) {
			return rv.Index(int(i)).Interface()
		}
		if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
			return nil
		}
	}
	// a class instance / typed object held as any: its field
	if k, ok := key.(string); ok && obj != nil {
		return TnGet(obj, k)
	}
	return nil
}

// JS ===: objects and arrays compare by identity, other values by value
func TnSame(a interface{}, b interface{}) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	va, vb := reflect.ValueOf(a), reflect.ValueOf(b)
	switch va.Kind() {
	case reflect.Map, reflect.Slice, reflect.Func, reflect.Pointer:
		return va.Kind() == vb.Kind() && va.Type() == vb.Type() && va.Pointer() == vb.Pointer() &&
			(va.Kind() != reflect.Slice || va.Len() == vb.Len())
	}
	if !va.Type().Comparable() || !vb.Type().Comparable() {
		return false
	}
	return a == b
}

// a + b on two dynamic values: numbers (and booleans, null) add; anything
// else concatenates as strings ('a' + 1, [1] + [2])
func TnDynamicAdd(a interface{}, b interface{}) interface{} {
	numeric := func(v interface{}) bool {
		switch v.(type) {
		case float64, int, bool, nil:
			return true
		}
		return false
	}
	if numeric(a) && numeric(b) {
		return TnNumber(a) + TnNumber(b)
	}
	return TnJSString(a) + TnJSString(b)
}

// a == b (JS loose equality): null == undefined; a number, string or boolean
// compares with another primitive by ToNumber; two strings compare as strings
func TnLooseEqual(a interface{}, b interface{}) bool {
	if TnSame(a, b) || TnIsNil(a) && TnIsNil(b) {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	_, aString := a.(string)
	_, bString := b.(string)
	if aString && bString {
		return false
	}
	if !tnIsPrimitive(a) || !tnIsPrimitive(b) {
		return false
	}
	return TnNumber(a) == TnNumber(b)
}

func tnIsPrimitive(v interface{}) bool {
	switch v.(type) {
	case float64, string, bool:
		return true
	}
	return false
}

// Whether a dynamic value is a plain array (a slice or a reference to one)
func TnIsSlice(v interface{}) bool {
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() {
		rv = rv.Elem()
	}
	return rv.Kind() == reflect.Slice
}

// A dynamic value a typeof test found to be a T (a T, or a non-nil *T)
func TnNarrow[T any](v interface{}) T {
	if p, ok := v.(*T); ok && p != nil {
		return *p
	}
	return v.(T)
}

// A dynamic array as a *[]T: the reference it is, else a converted copy
func TnArrayRef[T any](v interface{}) *[]T {
	if p, ok := v.(*[]T); ok {
		return p
	}
	if v == nil {
		return nil
	}
	s := TnAs[[]T](v)
	return &s
}

// *arr of an array reference that may be nil (null): a nil slice then
func TnDerefSlice[T any](p *[]T) []T {
	if p == nil {
		return nil
	}
	return *p
}

// s[i] as T | undefined (nil past the end)
func TnAtPtr[T any](s []T, i float64) *T {
	if i < 0 || int(i) >= len(s) {
		return nil
	}
	v := s[int(i)]
	return &v
}

func TnAt[T any](s []T, i float64) T {
	if i < 0 || int(i) >= len(s) {
		var zero T
		return zero
	}
	return s[int(i)]
}

func TnLength(v interface{}) float64 {
	switch t := v.(type) {
	case string:
		return float64(tnStrCount(t))
	case []interface{}:
		return float64(len(t))
	case interface{ TnItems() *[]interface{} }:
		return float64(len(*t.TnItems()))
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Map {
		return float64(rv.Len())
	}
	return 0
}

// A value as JS prints it in a template literal (nil pointers are "undefined")
// String(v) of a dynamic value, as JS renders it
// Long zone names as Node prints them in toString() (ICU's); others keep
// Go's abbreviation
var tnZoneNames = map[string]string{
	"UTC": "Coordinated Universal Time", "GMT": "Greenwich Mean Time",
	"EST": "Eastern Standard Time", "EDT": "Eastern Daylight Time",
	"CST": "Central Standard Time", "CDT": "Central Daylight Time",
	"MST": "Mountain Standard Time", "MDT": "Mountain Daylight Time",
	"PST": "Pacific Standard Time", "PDT": "Pacific Daylight Time",
	"AKST": "Alaska Standard Time", "AKDT": "Alaska Daylight Time",
	"HST": "Hawaii-Aleutian Standard Time",
	"WET": "Western European Standard Time", "WEST": "Western European Summer Time",
	"CET": "Central European Standard Time", "CEST": "Central European Summer Time",
	"EET": "Eastern European Standard Time", "EEST": "Eastern European Summer Time",
	"BST": "British Summer Time", "IST": "India Standard Time",
	"JST": "Japan Standard Time", "KST": "Korean Standard Time",
	"AEST": "Australian Eastern Standard Time", "AEDT": "Australian Eastern Daylight Time",
	"NZST": "New Zealand Standard Time", "NZDT": "New Zealand Daylight Time",
}

func tnZoneSuffix(t time.Time) string {
	name, offset := t.Zone()
	long, ok := tnZoneNames[name]
	if !ok {
		sign := '+'
		if offset < 0 {
			sign, offset = '-', -offset
		}
		long = fmt.Sprintf("GMT%c%02d:%02d", sign, offset/3600, offset%3600/60)
	}
	return t.Format("GMT-0700") + " (" + long + ")"
}

// String(date) / date.toString(): Node's format in the local zone
func TnDateString(t time.Time) string {
	if t.IsZero() {
		return "Invalid Date"
	}
	return t.Format("Mon Jan 02 2006 15:04:05 ") + tnZoneSuffix(t)
}

func TnJSString(v interface{}) string {
	if v == TnNull {
		return "null"
	}
	switch x := v.(type) {
	case interface{ TnToString() string }:
		return x.TnToString()
	case time.Time:
		return TnDateString(x)
	case *string:
		if x == nil {
			return "undefined"
		}
		return *x
	case *float64:
		if x == nil {
			return "undefined"
		}
		return TnNumStr(*x)
	case *bool:
		if x == nil {
			return "undefined"
		}
		return TnJSString(*x)
	case nil:
		return "undefined"
	case string:
		return x
	case float64:
		return TnNumStr(x)
	case bool:
		if x {
			return "true"
		}
		return "false"
	case []byte:
		return strings.ToValidUTF8(string(x), "�")
	case []interface{}:
		parts := make([]string, len(x))
		for i, e := range x {
			if e != nil {
				parts[i] = TnJSString(e)
			}
		}
		return strings.Join(parts, ",")
	case []string:
		return strings.Join(x, ",")
	case map[string]interface{}:
		return "[object Object]"
	case *TnError:
		if x == nil {
			return "null"
		}
		return x.Get_name() + ": " + x.message
	case fmt.Stringer:
		return x.String()
	case interface{ toString() string }:
		return x.toString()
	}
	// Other arrays join their elements with commas (null/undefined as "")
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Slice {
		parts := make([]string, rv.Len())
		for i := range parts {
			e := rv.Index(i)
			if (e.Kind() == reflect.Pointer || e.Kind() == reflect.Interface) && e.IsNil() {
				continue
			}
			parts[i] = TnJSString(e.Interface())
		}
		return strings.Join(parts, ",")
	}
	return fmt.Sprintf("%v", v)
}

func TnFormat(v interface{}) string {
	rv := reflect.ValueOf(v)
	if !rv.IsValid() || (rv.Kind() == reflect.Pointer && rv.IsNil()) {
		return "undefined"
	}
	if rv.Kind() == reflect.Pointer {
		return fmt.Sprintf("%v", rv.Elem().Interface())
	}
	return fmt.Sprintf("%v", v)
}

// Object spread: copies the properties of src into dst
func TnAssign(dst map[string]interface{}, src interface{}) {
	if o, ok := src.(map[string]interface{}); ok {
		for k, v := range o {
			dst[k] = v
		}
		return
	}
	for _, e := range TnEntries(src) {
		if k, isString := e[0].(string); isString {
			dst[k] = e[1]
		}
	}
}

// A number as JS prints it
func TnNumStr(f float64) string {
	// Integers (the common case) skip float formatting; -0 keeps its sign below
	if f == math.Trunc(f) && f < 9007199254740992 && f > -9007199254740992 && (f != 0 || !math.Signbit(f)) {
		return strconv.FormatInt(int64(f), 10)
	}
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	case math.Abs(f) >= 1e-6 && math.Abs(f) < 1e21:
		// Plain notation in JS's range: 1761603012345.678, 0.000001
		return strconv.FormatFloat(f, 'f', -1, 64)
	}
	// Exponent form without Go's zero padding: 1e-7, 1.5e+21
	s := strconv.FormatFloat(f, 'e', -1, 64)
	if n := len(s); s[n-2] == '0' && (s[n-3] == '+' || s[n-3] == '-') {
		s = s[:n-2] + s[n-1:]
	}
	return s
}

// Number(x) like JS: "" → 0, invalid → NaN, booleans → 0/1
func TnNumber(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case *tnNullValue:
		return 0
	case bool:
		if t {
			return 1
		}
		return 0
	case string:
		s := strings.TrimSpace(t)
		if s == "" {
			return 0
		}
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			return f
		}
	case nil:
		return 0
	case time.Time:
		return float64(t.UnixMilli())
	case *float64:
		if t == nil {
			return 0
		}
		return *t
	case *string:
		if t == nil {
			return 0
		}
		return TnNumber(*t)
	case *bool:
		if t == nil {
			return 0
		}
		return TnNumber(*t)
	}
	// Go numeric kinds (int, named numerics such as time.Duration)
	rv := reflect.ValueOf(v)
	switch {
	case rv.CanFloat():
		return rv.Float()
	case rv.CanInt():
		return float64(rv.Int())
	case rv.CanUint():
		return float64(rv.Uint())
	}
	return math.NaN()
}

var tnLeadingFloat = regexp.MustCompile("^[+-]?(Infinity|[0-9]+[.]?[0-9]*([eE][+-]?[0-9]+)?|[.][0-9]+([eE][+-]?[0-9]+)?)")

// parseFloat: the leading number of the string, NaN if none
func TnParseFloat(s string) float64 {
	m := tnLeadingFloat.FindString(strings.TrimSpace(s))
	if m == "" {
		return math.NaN()
	}
	if strings.HasSuffix(m, "Infinity") {
		if strings.HasPrefix(m, "-") {
			return math.Inf(-1)
		}
		return math.Inf(1)
	}
	f, _ := strconv.ParseFloat(m, 64)
	return f
}

// parseInt: the leading integer in the given radix, NaN if none
func TnParseInt(s string, radix float64) float64 {
	s = strings.TrimSpace(s)
	base := int(radix)
	sign := 1.0
	if strings.HasPrefix(s, "-") || strings.HasPrefix(s, "+") {
		if s[0] == '-' {
			sign = -1
		}
		s = s[1:]
	}
	if (base == 16 || base == 0) && (strings.HasPrefix(s, "0x") || strings.HasPrefix(s, "0X")) {
		s, base = s[2:], 16
	}
	if base == 0 {
		base = 10
	}
	end := 0
	for end < len(s) {
		c := s[end]
		d := 99
		switch {
		case c >= '0' && c <= '9':
			d = int(c - '0')
		case c >= 'a' && c <= 'z':
			d = int(c-'a') + 10
		case c >= 'A' && c <= 'Z':
			d = int(c-'A') + 10
		}
		if d >= base {
			break
		}
		end++
	}
	if end == 0 {
		return math.NaN()
	}
	v, _ := strconv.ParseInt(s[:end], base, 64)
	return sign * float64(v)
}

// JS ToInt32 / ToUint32 (wrapping modulo 2^32; NaN and Infinity → 0)
func TnInt32(f float64) int32 {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}
	return int32(int64(math.Trunc(math.Mod(f, 4294967296))))
}

func TnUint32(f float64) uint32 { return uint32(TnInt32(f)) }

func TnDelete(obj interface{}, key interface{}) bool {
	if record, ok := obj.(interface{ Delete(string) bool }); ok {
		if k, isString := key.(string); isString {
			record.Delete(k)
			return true
		}
	}
	o, ok := obj.(map[string]interface{})
	k, isString := key.(string)
	if !ok && isString {
		// a typed object's field: unset (undefined) again
		rv := reflect.ValueOf(obj)
		if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
			f := rv.Elem().FieldByName(k)
			if !f.IsValid() {
				f = rv.Elem().FieldByName(k + "_")
			}
			if f.IsValid() && f.CanAddr() {
				reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Set(reflect.Zero(f.Type()))
			}
		}
		return true
	}
	if !ok || !isString {
		return false
	}
	delete(o, k)
	return true
}

// Object.fromEntries: [key, value] pairs → a dynamic object
func TnFromEntries(entries interface{}) interface{} {
	result := map[string]interface{}{}
	list := reflect.ValueOf(entries)
	for i := 0; i < list.Len(); i++ {
		pair := reflect.ValueOf(list.Index(i).Interface())
		if pair.Kind() == reflect.Slice && pair.Len() >= 2 {
			result[fmt.Sprint(pair.Index(0).Interface())] = pair.Index(1).Interface()
		}
	}
	return result
}

func TnHas(obj interface{}, key interface{}) bool {
	if record, ok := obj.(interface{ TnProp(string) (interface{}, bool) }); ok {
		if k, isString := key.(string); isString {
			_, found := record.TnProp(k)
			return found
		}
	}
	if o, ok := obj.(map[string]interface{}); ok {
		if k, ok := key.(string); ok {
			_, found := o[k]
			return found
		}
	}
	// Struct objects: the in operator checks for a field
	rv := reflect.ValueOf(obj)
	if rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return false
		}
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Struct {
		if k, ok := key.(string); ok {
			f := rv.FieldByName(k)
			if !f.IsValid() {
				f = rv.FieldByName(k + "_")
			}
			if !f.IsValid() {
				return false
			}
			// an unset (undefined) field is not a property yet, as a
			// declared field before its first assignment
			switch f.Kind() {
			case reflect.Pointer, reflect.Interface, reflect.Map, reflect.Slice, reflect.Func:
				return !f.IsNil()
			}
			return true
		}
	}
	return false
}

// An object's own enumerable properties, for structs (object literals, typed
// objects, class instances): the data fields in declaration order, without
// #private fields, embedded types and unset optional primitives
func tnStructProps(obj interface{}) ([]string, []interface{}, bool) {
	rv := reflect.ValueOf(obj)
	if !rv.IsValid() || rv.Kind() != reflect.Pointer || rv.IsNil() || rv.Elem().Kind() != reflect.Struct {
		return nil, nil, false
	}
	keys := []string{}
	values := []interface{}{}
	tnCollectStructProps(rv.Elem(), &keys, &values)
	return keys, values, true
}

func tnCollectStructProps(sv reflect.Value, keys *[]string, values *[]interface{}) {
	st := sv.Type()
	for i := 0; i < st.NumField(); i++ {
		field := st.Field(i)
		// a parent class's fields come first (TypeNative's own runtime types
		// embedded by Node subclasses are not properties)
		if field.Anonymous {
			if field.Type.Kind() == reflect.Struct && !strings.HasPrefix(field.Type.Name(), "Tn") {
				tnCollectStructProps(sv.Field(i), keys, values)
			}
			continue
		}
		if strings.HasPrefix(field.Name, "__") {
			continue
		}
		f := sv.Field(i)
		value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem()
		// optional primitives (*string & co.): absent when unset, else their value
		if value.Kind() == reflect.Pointer {
			switch value.Type().Elem().Kind() {
			case reflect.String, reflect.Float64, reflect.Bool:
				if value.IsNil() {
					continue
				}
				value = value.Elem()
			}
		}
		*keys = append(*keys, strings.TrimSuffix(field.Name, "_"))
		*values = append(*values, value.Interface())
	}
}

// Object.values / Object.entries on any object
func TnValues(obj interface{}) []interface{} {
	if record, ok := obj.(interface{ Entries() [][]interface{} }); ok {
		out := []interface{}{}
		for _, e := range record.Entries() {
			out = append(out, e[1])
		}
		return out
	}
	if _, values, ok := tnStructProps(obj); ok {
		return values
	}
	out := []interface{}{}
	for _, k := range TnKeys(obj) {
		out = append(out, TnGet(obj, k))
	}
	return out
}

func TnEntries(obj interface{}) [][]interface{} {
	if record, ok := obj.(interface{ Entries() [][]interface{} }); ok {
		return record.Entries()
	}
	out := [][]interface{}{}
	if keys, values, ok := tnStructProps(obj); ok {
		for i, k := range keys {
			out = append(out, []interface{}{k, values[i]})
		}
		return out
	}
	for _, k := range TnKeys(obj) {
		out = append(out, []interface{}{k, TnGet(obj, k)})
	}
	return out
}

func TnKeys(obj interface{}) []string {
	if record, ok := obj.(interface{ Keys() []string }); ok {
		return append([]string{}, record.Keys()...)
	}
	if keys, _, ok := tnStructProps(obj); ok {
		return keys
	}
	o, _ := obj.(map[string]interface{})
	keys := make([]string, 0, len(o))
	for k := range o {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func TnIncludes(v interface{}, x interface{}) bool {
	return TnIndexOf(v, x) >= 0
}

func TnIndexOf(v interface{}, x interface{}) float64 {
	switch t := v.(type) {
	case string:
		if s, ok := x.(string); ok {
			return float64(strings.Index(t, s))
		}
	case []interface{}:
		for i, item := range t {
			if TnSame(item, x) {
				return float64(i)
			}
		}
	}
	return -1
}

func TnSlice(v interface{}, bounds ...float64) interface{} {
	length := 0
	switch t := v.(type) {
	case string:
		length = tnStrCount(t)
	case []interface{}:
		length = len(t)
	default:
		return nil
	}
	clamp := func(i float64) int {
		n := int(i)
		if n < 0 {
			n += length
		}
		return max(0, min(n, length))
	}
	start, end := 0, length
	if len(bounds) > 0 {
		start = clamp(bounds[0])
	}
	if len(bounds) > 1 {
		end = clamp(bounds[1])
	}
	if start > end {
		start = end
	}
	if s, ok := v.(string); ok {
		return s[tnStrByte(s, start):tnStrByte(s, end)]
	}
	return v.([]interface{})[start:end]
}

func TnConcat(v interface{}, others ...interface{}) interface{} {
	if s, ok := v.(string); ok {
		for _, o := range others {
			s += fmt.Sprint(o)
		}
		return s
	}
	result := append([]interface{}{}, TnAs[[]interface{}](v)...)
	for _, o := range others {
		if items, ok := o.([]interface{}); ok {
			result = append(result, items...)
		} else {
			result = append(result, o)
		}
	}
	return result
}

func TnAsPtr[T any](v interface{}) *T {
	if p, ok := v.(*T); ok {
		return p
	}
	if t, ok := v.(T); ok {
		return &t
	}
	if custom, isErr := v.(interface{ TnBaseError() *TnError }); isErr {
		if base, bok := interface{}(custom.TnBaseError()).(*T); bok {
			return base
		}
	}
	var zero T
	if converted, ok := TnConvertDynamic(v, reflect.TypeOf(&zero)); ok {
		return converted.Interface().(*T)
	}
	return nil
}

func TnAs[T any](v interface{}) T {
	if p, ok := v.(*T); ok && p != nil {
		return *p
	}
	// an Array subclass instance as a plain array: its elements
	if a, ok := v.(interface{ TnItems() *[]interface{} }); ok {
		if items, ok := interface{}(*a.TnItems()).(T); ok {
			return items
		}
	}
	t, ok := v.(T)
	if !ok && v != nil {
		if custom, isErr := v.(interface{ TnBaseError() *TnError }); isErr {
			if base, bok := interface{}(custom.TnBaseError()).(T); bok {
				return base
			}
		}
		if converted, cok := TnConvertDynamic(v, reflect.TypeOf((*T)(nil)).Elem()); cok {
			return converted.Interface().(T)
		}
	}
	return t
}

// Converts a dynamic value (decoded JSON: maps, []interface{}, float64 …) to a
// Go type: structs (and pointers to them) field by field, slices element by
// element, numbers between kinds
func TnConvertDynamic(v interface{}, t reflect.Type) (reflect.Value, bool) {
	if _, isNull := v.(interface{ TnIsNullValue() }); isNull && t.Kind() != reflect.Interface {
		v = nil
	}
	if v == nil {
		return reflect.Zero(t), true
	}
	rv := reflect.ValueOf(v)
	// an array reference where an array is expected: its elements
	if rv.Kind() == reflect.Pointer && t.Kind() == reflect.Slice && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
		v = rv.Interface()
	}
	if rv.Type().AssignableTo(t) {
		return rv, true
	}
	switch t.Kind() {
	case reflect.Interface:
		if rv.Type().Implements(t) {
			return rv, true
		}
	case reflect.Pointer:
		if rv.Kind() == reflect.Pointer && rv.IsNil() {
			return reflect.Zero(t), true
		}
		// a Map / Record type: filled entry by entry
		if t.Elem().Kind() == reflect.Struct {
			target := reflect.New(t.Elem())
			if filler, isMap := target.Interface().(interface {
				TnFill([][]interface{}, func(interface{}, reflect.Type) (reflect.Value, bool)) bool
			}); isMap {
				var entries [][]interface{}
				if src, ok := v.(interface{ Entries() [][]interface{} }); ok {
					entries = src.Entries()
				} else if src, ok := v.(map[string]interface{}); ok {
					keys := make([]string, 0, len(src))
					for k := range src {
						keys = append(keys, k)
					}
					sort.Strings(keys)
					for _, k := range keys {
						entries = append(entries, []interface{}{k, src[k]})
					}
				} else {
					return reflect.Value{}, false
				}
				if !filler.TnFill(entries, TnConvertDynamic) {
					return reflect.Value{}, false
				}
				return target, true
			}
		}
		inner, ok := TnConvertDynamic(v, t.Elem())
		if !ok {
			return reflect.Value{}, false
		}
		p := reflect.New(t.Elem())
		p.Elem().Set(inner)
		return p, true
	case reflect.Struct:
		m, ok := v.(map[string]interface{})
		// another object type (TS types are structural): field by field
		_, isEntries := v.(interface{ Entries() [][]interface{} })
		if src := reflect.Indirect(rv); !ok && !isEntries && src.Kind() == reflect.Struct && t.NumField() > 0 {
			if !src.CanAddr() {
				copied := reflect.New(src.Type()).Elem()
				copied.Set(src)
				src = copied
			}
			m, ok = map[string]interface{}{}, true
			for i := 0; i < src.NumField(); i++ {
				f := src.Field(i)
				f = reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem()
				switch f.Kind() {
				case reflect.Pointer, reflect.Interface, reflect.Func, reflect.Map, reflect.Slice, reflect.Chan:
					if f.IsNil() {
						continue
					}
				}
				m[strings.TrimSuffix(src.Type().Field(i).Name, "_")] = f.Interface()
			}
		}
		if props, isRecord := v.(interface{ Entries() [][]interface{} }); !ok && isRecord {
			// A string-keyed TnMap (a Record, a node:sqlite row)
			m, ok = map[string]interface{}{}, true
			for _, e := range props.Entries() {
				if k, isString := e[0].(string); isString {
					m[k] = e[1]
				}
			}
		}
		if !ok {
			return reflect.Value{}, false
		}
		out := reflect.New(t).Elem()
		for i := 0; i < t.NumField(); i++ {
			field := t.Field(i)
			name := strings.TrimSuffix(field.Name, "_")
			value, present := m[name]
			if !present {
				continue
			}
			converted, ok := TnConvertDynamic(value, field.Type)
			if !ok {
				continue
			}
			f := out.Field(i)
			reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Set(converted)
		}
		return out, true
	case reflect.Slice:
		if rv.Kind() != reflect.Slice {
			return reflect.Value{}, false
		}
		out := reflect.MakeSlice(t, rv.Len(), rv.Len())
		for i := 0; i < rv.Len(); i++ {
			converted, ok := TnConvertDynamic(rv.Index(i).Interface(), t.Elem())
			if !ok {
				return reflect.Value{}, false
			}
			out.Index(i).Set(converted)
		}
		return out, true
	case reflect.Float64, reflect.Float32, reflect.Int, reflect.Int64, reflect.Int32:
		if rv.CanConvert(t) && rv.Kind() >= reflect.Int && rv.Kind() <= reflect.Float64 {
			return rv.Convert(t), true
		}
	}
	return reflect.Value{}, false
}

func TnTruthy(v interface{}) bool {
	switch t := v.(type) {
	case nil, *tnNullValue:
		return false
	case bool:
		return t
	case float64:
		return t != 0 && !math.IsNaN(t)
	case string:
		return t != ""
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Pointer, reflect.Interface, reflect.Map, reflect.Slice, reflect.Func, reflect.Chan:
		return !rv.IsNil()
	}
	return true
}

// nil or a typed nil pointer inside an interface (undefined vs defined)
// A function's arguments object: its named parameters (trailing omitted
// optional ones dropped), then any extra arguments
func TnArguments(required int, named []interface{}, extra ...interface{}) []interface{} {
	if len(extra) == 0 {
		for len(named) > required && TnIsNil(named[len(named)-1]) {
			named = named[:len(named)-1]
		}
	}
	return append(named, extra...)
}

// JS null held in a dynamic (any) slot: nullish like undefined (nil), but a
// value of its own — null !== undefined, typeof null is "object", JSON null
type tnNullValue struct{}

func (*tnNullValue) TnIsNullValue()          {}
func (*tnNullValue) TnToJSON(string) interface{} { return nil }

var TnNull interface{} = &tnNullValue{}

// x === undefined: unset, not null
func TnIsUndefined(v interface{}) bool {
	return v != TnNull && TnIsNil(v)
}

func TnIsNil(v interface{}) bool {
	if v == nil || v == TnNull {
		return true
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Pointer, reflect.Interface, reflect.Map, reflect.Slice, reflect.Func, reflect.Chan:
		return rv.IsNil()
	}
	return false
}`,
  classes: `// Classes as values (passed around, new X(), x instanceof X,
// x.constructor, C.prototype): a descriptor per class, found by its Go type
type TnClass struct {
	Name    string
	Type    reflect.Type
	Parent  *TnClass
	New     func(args ...interface{}) interface{}
	statics map[string]func() interface{}
}

var tnClassesByType = map[reflect.Type]*TnClass{}

func tnRegisterClass(c *TnClass) *TnClass {
	tnClassesByType[c.Type] = c
	return c
}

// C.name, C.prototype (the class stands in for its prototype) and static
// members, own or inherited
func (c *TnClass) TnProp(key string) (interface{}, bool) {
	switch key {
	case "name":
		return c.Name, true
	case "prototype":
		return c, true
	}
	for k := c; k != nil; k = k.Parent {
		if f, ok := k.statics[key]; ok {
			return f(), true
		}
	}
	return nil, false
}

// Map and Set as class values
var TnClass_Map = &TnClass{Name: "Map", New: func(args ...interface{}) interface{} { return TnJSCollection(TnNewMap[interface{}, interface{}](), 1) }}
var TnClass_Set = &TnClass{Name: "Set", New: func(args ...interface{}) interface{} { return TnJSCollection(TnNewMap[interface{}, struct{}](), 2) }}

// x.constructor / Object.getPrototypeOf(x): the class of an instance, or nil
func TnClassOf(v interface{}) interface{} {
	if v == nil {
		return nil
	}
	if c, ok := tnClassesByType[reflect.TypeOf(v)]; ok {
		return c
	}
	return nil
}

// x instanceof C, with C a class value
// Classes passed where a constructor function is expected: the function,
// remembered as the class (so x instanceof fn still finds it)
var tnCtorClasses = map[uintptr]*TnClass{}

func TnCtorOf[F any](cls *TnClass, fn F) F {
	tnCtorClasses[reflect.ValueOf(fn).Pointer()] = cls
	return fn
}

func TnInstanceOf(v interface{}, cls interface{}) bool {
	c, ok := cls.(*TnClass)
	if fv := reflect.ValueOf(cls); !ok && fv.Kind() == reflect.Func && !fv.IsNil() {
		c, ok = tnCtorClasses[fv.Pointer()]
	}
	if !ok || v == nil {
		return false
	}
	for k := tnClassesByType[reflect.TypeOf(v)]; k != nil; k = k.Parent {
		if k == c {
			return true
		}
	}
	return false
}

// new C(…args), with C a class value
func TnNew(cls interface{}, args ...interface{}) interface{} {
	c, ok := cls.(*TnClass)
	if !ok || c.New == nil {
		panic(TnNodeError("TypeError", "", "value is not a constructor"))
	}
	return c.New(args...)
}

// x instanceof Object: anything but a primitive (or null)
func TnIsObject(v interface{}) bool {
	switch v.(type) {
	case nil, string, float64, bool:
		return false
	}
	return !TnIsNil(v)
}

// Object.create(proto, descriptors): an instance of proto's class without
// running its constructor (a plain object for any other prototype), with the
// descriptors' properties
func TnObjectCreate(proto interface{}, descriptors interface{}) interface{} {
	var obj interface{}
	if c, ok := proto.(*TnClass); ok {
		obj = reflect.New(c.Type.Elem()).Interface()
	} else {
		obj = map[string]interface{}{}
	}
	if descriptors != nil {
		TnDefineProperties(obj, descriptors)
	}
	return obj
}

func TnDefineProperties(obj interface{}, descriptors interface{}) {
	for _, key := range TnKeys(descriptors) {
		TnDefineProperty(obj, key, TnGet(descriptors, key))
	}
}

// Object.defineProperty: a data descriptor's value is set (accessor
// descriptors and attributes have no effect on Go values)
func TnDefineProperty(obj interface{}, key string, descriptor interface{}) {
	if TnHas(descriptor, "value") {
		TnSet(obj, key, TnGet(descriptor, "value"))
	}
}

// Object.getOwnPropertyDescriptors(x): { key: { value, writable,
// enumerable, configurable } } for x's own properties
func TnOwnPropertyDescriptors(obj interface{}) map[string]interface{} {
	out := map[string]interface{}{}
	keys := TnKeys(obj)
	for _, key := range keys {
		out[key] = map[string]interface{}{"value": TnGet(obj, key), "writable": true, "enumerable": true, "configurable": true}
	}
	return out
}`,
  arraySubclass: `// Subclasses of Array (class Seq extends Array): the elements live in an
// embedded TnArray; seq[i], seq.length and Array methods work on them
type TnArray struct {
	items []interface{}
}

func (a *TnArray) TnItems() *[]interface{} {
	return &a.items
}

func (a *TnArray) Get_length() float64 {
	return float64(len(a.items))
}

func (a *TnArray) Set_length(n float64) {
	size := int(n)
	if size <= len(a.items) {
		a.items = a.items[:size]
		return
	}
	a.items = append(a.items, make([]interface{}, size-len(a.items))...)
}

type tnArrayLike interface {
	TnItems() *[]interface{}
}

// super(…args): new Array(n) has n empty slots; other arguments are the elements
func TnArrayInit(args []interface{}) []interface{} {
	if len(args) == 1 {
		if n, ok := args[0].(float64); ok {
			return make([]interface{}, int(n))
		}
	}
	return append([]interface{}{}, args...)
}

// Array.from(v) on any value: arrays (and Array subclasses), strings, Sets,
// Maps (entries) and array-likes ({ length })
func TnToArray(v interface{}) []interface{} {
	switch t := v.(type) {
	case nil:
		return []interface{}{}
	case []interface{}:
		return append([]interface{}{}, t...)
	case tnArrayLike:
		return append([]interface{}{}, (*t.TnItems())...)
	case string:
		out := []interface{}{}
		for _, r := range t {
			out = append(out, string(r))
		}
		return out
	case interface{ Entries() [][]interface{} }:
		out := []interface{}{}
		kind, _ := v.(interface{ TnJSKind() uint8 })
		for _, e := range t.Entries() {
			if kind != nil && kind.TnJSKind() == 2 {
				out = append(out, e[0])
			} else {
				out = append(out, []interface{}{e[0], e[1]})
			}
		}
		return out
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
		out := make([]interface{}, rv.Len())
		for i := range out {
			out[i] = rv.Index(i).Interface()
		}
		return out
	}
	n := int(TnNumber(TnGet(v, "length")))
	out := make([]interface{}, n)
	for i := range out {
		out[i] = TnIndex(v, float64(i))
	}
	return out
}

// Array.from(v, fn) with a mapping function
func TnToArrayMapped(v interface{}, fn interface{}) []interface{} {
	items := TnToArray(v)
	if fn == nil {
		return items
	}
	for i, item := range items {
		items[i] = TnCallValue(fn, item, float64(i))
	}
	return items
}

// Seq.from(v, fn) on an Array subclass: an instance holding the elements
func TnArraySubclassFrom(cls *TnClass, v interface{}, fn ...interface{}) interface{} {
	var mapFn interface{}
	if len(fn) > 0 {
		mapFn = fn[0]
	}
	items := TnToArrayMapped(v, mapFn)
	inst := cls.New()
	if a, ok := inst.(tnArrayLike); ok {
		*a.TnItems() = items
	}
	return inst
}`,
  strIndex: `// String positions are code points (JS indices: UTF-16 units for the BMP).
// An ASCII string indexes by byte; another goes through a table of the byte
// offset of each code point, kept for the strings indexed most recently, so
// a scan over one string (s.charCodeAt(i), s.slice(a, b), re.lastIndex)
// costs O(1) per step after the first
type tnStrIdx struct {
	p     *byte
	n     int
	ascii bool
	offs  []int  // offs[i]: byte offset of code point i; offs[count] == n
	runes []rune // the code points (built on demand, for the regex engine)
}

var tnStrIdxCache [8]atomic.Pointer[tnStrIdx]
var tnStrIdxNext atomic.Uint32

func tnStrIsASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			return false
		}
	}
	return true
}

func tnStrIndexOf(s string) *tnStrIdx {
	p := unsafe.StringData(s)
	for i := range tnStrIdxCache {
		if c := tnStrIdxCache[i].Load(); c != nil && c.p == p && c.n == len(s) {
			return c
		}
	}
	c := &tnStrIdx{p: p, n: len(s), ascii: tnStrIsASCII(s)}
	if !c.ascii {
		c.offs = make([]int, 0, len(s)+1)
		for b := 0; b < len(s); {
			c.offs = append(c.offs, b)
			_, size := utf8.DecodeRuneInString(s[b:])
			b += size
		}
		c.offs = append(c.offs, len(s))
	}
	if len(s) >= 32 {
		tnStrIdxCache[tnStrIdxNext.Add(1)%uint32(len(tnStrIdxCache))].Store(c)
	}
	return c
}

// The number of code points
func tnStrCount(s string) int {
	if len(s) < 32 && tnStrIsASCII(s) {
		return len(s)
	}
	c := tnStrIndexOf(s)
	if c.ascii {
		return len(s)
	}
	return len(c.offs) - 1
}

// The byte offset of code point i (clamped to the string)
func tnStrByte(s string, i int) int {
	if i <= 0 {
		return 0
	}
	if len(s) < 32 && tnStrIsASCII(s) {
		return min(i, len(s))
	}
	c := tnStrIndexOf(s)
	if c.ascii {
		return min(i, len(s))
	}
	if i >= len(c.offs) {
		return len(s)
	}
	return c.offs[i]
}

// The code point index of byte offset b
func tnStrRune(s string, b int) int {
	if b <= 0 {
		return 0
	}
	if len(s) < 32 && tnStrIsASCII(s) {
		return b
	}
	c := tnStrIndexOf(s)
	if c.ascii {
		return b
	}
	lo, hi := 0, len(c.offs)-1
	for lo < hi {
		mid := (lo + hi) / 2
		if c.offs[mid] < b {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

// The code points of s and their byte offsets (shared: read-only)
func tnStrRunes(s string) ([]rune, []int) {
	c := tnStrIndexOf(s)
	if c.runes == nil {
		runes := make([]rune, 0, len(s))
		for b := 0; b < len(s); {
			r, size := utf8.DecodeRuneInString(s[b:])
			runes = append(runes, r)
			b += size
		}
		c.runes = runes
		if c.ascii {
			c.offs = make([]int, len(s)+1)
			for i := range c.offs {
				c.offs[i] = i
			}
		}
	}
	return c.runes, c.offs
}

// A JS index argument as an int (NaN is 0, ±Infinity clamps)
func tnStrPos(f float64) int {
	if f != f {
		return 0
	}
	if f > 1<<53 {
		return 1 << 53
	}
	if f < -(1 << 53) {
		return -(1 << 53)
	}
	return int(f)
}

func TnStrLength(s string) float64 { return float64(tnStrCount(s)) }

// s[i] / s.charAt(i): "" out of range
func TnCharAt(s string, i float64) string {
	n := tnStrPos(i)
	if i < 0 || n >= tnStrCount(s) {
		return ""
	}
	b := tnStrByte(s, n)
	if s[b] < 0x80 {
		return s[b : b+1]
	}
	_, size := utf8.DecodeRuneInString(s[b:])
	return s[b : b+size]
}

// s.charCodeAt(i): NaN out of range
func TnCharCodeAt(s string, i float64) float64 {
	n := tnStrPos(i)
	if i < 0 || n >= tnStrCount(s) {
		return math.NaN()
	}
	b := tnStrByte(s, n)
	if s[b] < 0x80 {
		return float64(s[b])
	}
	r, _ := utf8.DecodeRuneInString(s[b:])
	return float64(r)
}

// s.at(i): from the end when negative
func TnStrAt(s string, i float64) string {
	n := tnStrPos(i)
	if n < 0 {
		n += tnStrCount(s)
	}
	if n < 0 {
		return ""
	}
	return TnCharAt(s, float64(n))
}

// s.slice(start, end?)
func TnStrSlice(s string, start float64, end float64, hasEnd bool) string {
	count := tnStrCount(s)
	a, b := tnStrPos(start), count
	if hasEnd {
		b = tnStrPos(end)
	}
	if a < 0 {
		a = max(0, count+a)
	}
	if b < 0 {
		b = max(0, count+b)
	}
	a, b = min(a, count), min(b, count)
	if a >= b {
		return ""
	}
	return s[tnStrByte(s, a):tnStrByte(s, b)]
}

// s.substring(start, end?): clamped, swapped when reversed
func TnSubstring(s string, start float64, end float64, hasEnd bool) string {
	count := tnStrCount(s)
	a, b := min(max(tnStrPos(start), 0), count), count
	if hasEnd {
		b = min(max(tnStrPos(end), 0), count)
	}
	if a > b {
		a, b = b, a
	}
	return s[tnStrByte(s, a):tnStrByte(s, b)]
}

// s.substr(start, length?)
func TnSubstr(s string, start float64, length float64, hasLength bool) string {
	count := tnStrCount(s)
	a := tnStrPos(start)
	if a < 0 {
		a = max(0, count+a)
	}
	a = min(a, count)
	b := count
	if hasLength {
		b = min(count, a+max(0, tnStrPos(length)))
	}
	if b <= a {
		return ""
	}
	return s[tnStrByte(s, a):tnStrByte(s, b)]
}

// s.indexOf(search, from?)
func TnStrIndexOf(s string, search string, from float64) float64 {
	b := tnStrByte(s, max(0, tnStrPos(from)))
	i := strings.Index(s[b:], search)
	if i < 0 {
		return -1
	}
	return float64(tnStrRune(s, b+i))
}

// s.lastIndexOf(search, from?)
func TnStrLastIndexOf(s string, search string, from float64, hasFrom bool) float64 {
	end := len(s)
	if hasFrom && from == from {
		end = min(len(s), tnStrByte(s, max(0, tnStrPos(from)))+len(search))
	}
	i := strings.LastIndex(s[:end], search)
	if i < 0 {
		return -1
	}
	return float64(tnStrRune(s, i))
}

// s.codePointAt(i)
func TnCodePointAt(s string, i float64) float64 {
	return TnCharCodeAt(s, i)
}

// s.padStart / padEnd(length, pad?): lengths in code points
func TnStrPad(s string, length float64, pad string, atStart bool) string {
	missing := tnStrPos(length) - tnStrCount(s)
	if missing <= 0 || pad == "" {
		return s
	}
	unit := tnStrCount(pad)
	fill := strings.Repeat(pad, missing/unit+1)
	fill = fill[:tnStrByte(fill, missing)]
	if atStart {
		return fill + s
	}
	return s + fill
}`,
  jsReplacement: `// A JS replacement string's patterns in Go's expansion syntax: $& → \${0},
// $1 → \${1}, $$ → $$; any other $ is literal
func TnJSReplacement(s string) string {
	if strings.IndexByte(s, '$') < 0 {
		return s
	}
	var out strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c != '$' {
			out.WriteByte(c)
			continue
		}
		next := byte(0)
		if i+1 < len(s) {
			next = s[i+1]
		}
		switch {
		case next == '$':
			out.WriteString("$$")
			i++
		case next == '&':
			out.WriteString("\${0}")
			i++
		case next >= '0' && next <= '9':
			j := i + 1
			for j < len(s) && j < i+3 && s[j] >= '0' && s[j] <= '9' {
				j++
			}
			out.WriteString("\${" + s[i+1:j] + "}")
			i = j - 1
		default:
			out.WriteString("$$")
		}
	}
	return out.String()
}`,
  iterable: `// Symbol.iterator in x: arrays, strings, Maps, Sets, generators and
// classes with a [Symbol.iterator]() method
func TnIsIterable(v interface{}) bool {
	switch v.(type) {
	case nil:
		return false
	case string, []interface{}, interface{ TnItems() *[]interface{} }, interface{ Entries() [][]interface{} }:
		return true
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Slice, reflect.Array, reflect.Chan:
		return true
	case reflect.Pointer:
		if !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
			return true
		}
	}
	return rv.MethodByName("Symbol_iterator").IsValid()
}`,
  numTruthy: `// A number's truthiness: 0 and NaN are falsy
func TnNumTruthy(n float64) bool {
	return n != 0 && n == n
}

// A number | undefined as a number: undefined is NaN
func TnNumPtr(p *float64) float64 {
	if p == nil {
		return math.NaN()
	}
	return *p
}

func TnDeref[T any](p *T) T {
	if p == nil {
		return *new(T)
	}
	return *p
}`,
  typeOf: `func TnTypeOf(v interface{}) string {
	if _, isNull := v.(interface{ TnIsNullValue() }); isNull {
		return "object"
	}
	// an unset nullable primitive (*T nil) is undefined
	switch t := v.(type) {
	case nil:
		return "undefined"
	case string:
		return "string"
	case *string:
		if t == nil {
			return "undefined"
		}
		return "string"
	case float64:
		return "number"
	case *float64:
		if t == nil {
			return "undefined"
		}
		return "number"
	case bool:
		return "boolean"
	case *bool:
		if t == nil {
			return "undefined"
		}
		return "boolean"
	}
	// (an unset function or object field is undefined)
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Func:
		if rv.IsNil() {
			return "undefined"
		}
		return "function"
	case reflect.Pointer, reflect.Map, reflect.Chan:
		if rv.IsNil() {
			return "undefined"
		}
	}
	return "object"
}`,
  jsonStringify: `// JSON.stringify: JS's SerializeJSONProperty over TypeNative values
// (unexported struct fields included; Go's encoder would skip them)
type tnJSONWriter struct {
	buf      bytes.Buffer
	indent   string
	replacer func(key string, value interface{}) interface{}
	allow    map[string]bool
	stack    []uintptr
}

func TnJSONStringify(v interface{}, indent string) string {
	w := &tnJSONWriter{indent: indent}
	w.property("", v, 0)
	return w.buf.String()
}

// JSON.stringify(value, replacer, space): the replacer is a key/value
// function or a list of keys; space a number of spaces or a string (≤ 10)
func TnJSONStringifyWith(v interface{}, replacer interface{}, space interface{}) string {
	w := &tnJSONWriter{}
	switch s := space.(type) {
	case float64:
		w.indent = strings.Repeat(" ", int(math.Max(0, math.Min(10, s))))
	case string:
		w.indent = s
		if len(w.indent) > 10 {
			w.indent = w.indent[:10]
		}
	}
	switch r := replacer.(type) {
	case func(string, interface{}) interface{}:
		w.replacer = r
	case []string:
		w.allow = map[string]bool{}
		for _, k := range r {
			w.allow[k] = true
		}
	case []interface{}:
		w.allow = map[string]bool{}
		for _, k := range r {
			w.allow[TnJSString(k)] = true
		}
	case []float64:
		w.allow = map[string]bool{}
		for _, k := range r {
			w.allow[TnNumStr(k)] = true
		}
	}
	if w.replacer != nil {
		v = w.replacer("", v)
	}
	if !w.property("", v, 0) {
		return ""
	}
	return w.buf.String()
}

// Values being written, innermost last: meeting one again is a cycle
func (w *tnJSONWriter) enter(p uintptr) {
	for _, seen := range w.stack {
		if seen == p {
			panic(TnNodeError("TypeError", "", "Converting circular structure to JSON"))
		}
	}
	w.stack = append(w.stack, p)
}

func (w *tnJSONWriter) leave() {
	w.stack = w.stack[:len(w.stack)-1]
}

func (w *tnJSONWriter) newline(depth int) {
	if w.indent == "" {
		return
	}
	w.buf.WriteByte('\\n')
	for i := 0; i < depth; i++ {
		w.buf.WriteString(w.indent)
	}
}

// toJSON() methods (Dates' included): the value serialized in their place
func tnJSONToJSON(v interface{}) interface{} {
	switch t := v.(type) {
	case time.Time:
		if t.IsZero() {
			return nil
		}
		return t.UTC().Format("2006-01-02T15:04:05.000Z")
	case interface{ toJSON() string }:
		return t.toJSON()
	case interface{ toJSON() float64 }:
		return t.toJSON()
	case interface{ toJSON() bool }:
		return t.toJSON()
	case interface{ toJSON() interface{} }:
		return t.toJSON()
	case interface{ TnToJSON(string) interface{} }:
		return t.TnToJSON("")
	case interface{ TnItems() *[]interface{} }:
		return *t.TnItems()
	}
	return v
}

var tnGoKeywords = map[string]bool{"break": true, "case": true, "chan": true, "const": true, "continue": true, "default": true, "defer": true, "else": true, "fallthrough": true, "for": true, "func": true, "go": true, "goto": true, "if": true, "import": true, "interface": true, "map": true, "package": true, "range": true, "return": true, "select": true, "struct": true, "switch": true, "type": true, "var": true}

// A struct field's JS name (Go keywords carry a trailing '_')
func tnJSONFieldName(name string) string {
	if strings.HasSuffix(name, "_") && tnGoKeywords[strings.TrimSuffix(name, "_")] {
		return strings.TrimSuffix(name, "_")
	}
	return name
}

// Writes one value; false when it serializes to undefined (functions)
func (w *tnJSONWriter) property(key string, v interface{}, depth int) bool {
	v = tnJSONToJSON(v)
	switch t := v.(type) {
	case nil, interface{ TnIsNullValue() }:
		w.buf.WriteString("null")
		return true
	case bool:
		if t {
			w.buf.WriteString("true")
		} else {
			w.buf.WriteString("false")
		}
		return true
	case float64:
		if math.IsNaN(t) || math.IsInf(t, 0) {
			w.buf.WriteString("null")
		} else {
			w.buf.WriteString(TnNumStr(t))
		}
		return true
	case string:
		tnJSONQuote(&w.buf, t)
		return true
	}
	rv := reflect.ValueOf(v)
	if rv.Type().String() == "*big.Int" {
		panic(TnNodeError("TypeError", "", "Do not know how to serialize a BigInt"))
	}
	switch rv.Kind() {
	case reflect.Func:
		return false
	case reflect.Pointer, reflect.Interface:
		if rv.IsNil() {
			w.buf.WriteString("null")
			return true
		}
		if rv.Kind() == reflect.Pointer {
			// Records and Maps: insertion order; Maps and Sets serialize as {}
			if m, ok := v.(interface {
				Entries() [][]interface{}
				TnJSKind() uint8
			}); ok {
				if m.TnJSKind() != 0 {
					w.buf.WriteString("{}")
					return true
				}
				return w.object(depth, func(emit func(string, interface{})) {
					for _, e := range m.Entries() {
						emit(fmt.Sprint(e[0]), e[1])
					}
				})
			}
			if rv.Elem().Kind() == reflect.Struct && w.replacer == nil && w.allow == nil && !rv.Elem().Type().Implements(tnJSONMarshalerType) {
				return w.fastStruct(rv, depth)
			}
			if rv.Elem().Kind() == reflect.Struct || rv.Elem().Kind() == reflect.Slice || rv.Elem().Kind() == reflect.Map {
				w.enter(rv.Pointer())
				defer w.leave()
			}
		}
		elem := rv.Elem()
		if elem.CanInterface() {
			return w.property(key, elem.Interface(), depth)
		}
		return w.property(key, reflect.NewAt(elem.Type(), unsafe.Pointer(elem.UnsafeAddr())).Elem().Interface(), depth)
	case reflect.Slice, reflect.Array:
		if rv.Kind() == reflect.Slice && rv.IsNil() {
			w.buf.WriteString("[]")
			return true
		}
		if rv.Len() == 0 {
			w.buf.WriteString("[]")
			return true
		}
		if rv.Kind() == reflect.Slice {
			w.enter(rv.Pointer())
			defer w.leave()
		}
		w.buf.WriteByte('[')
		for i := 0; i < rv.Len(); i++ {
			if i > 0 {
				w.buf.WriteByte(',')
			}
			w.newline(depth + 1)
			item := rv.Index(i).Interface()
			if w.replacer != nil {
				item = w.replacer(strconv.Itoa(i), item)
			}
			if !w.property(strconv.Itoa(i), item, depth+1) {
				w.buf.WriteString("null")
			}
		}
		w.newline(depth)
		w.buf.WriteByte(']')
		return true
	case reflect.Map:
		// Dynamic objects (JSON.parse results): Go maps keep no order, keys sort
		w.enter(rv.Pointer())
		defer w.leave()
		keys := make([]string, 0, rv.Len())
		byKey := map[string]interface{}{}
		for _, k := range rv.MapKeys() {
			ks := fmt.Sprint(k.Interface())
			keys = append(keys, ks)
			byKey[ks] = rv.MapIndex(k).Interface()
		}
		sort.Strings(keys)
		return w.object(depth, func(emit func(string, interface{})) {
			for _, ks := range keys {
				emit(ks, byKey[ks])
			}
		})
	case reflect.Struct:
		if m, ok := v.(json.Marshaler); ok {
			if data, err := m.MarshalJSON(); err == nil {
				w.buf.Write(data)
				return true
			}
		}
		return w.object(depth, func(emit func(string, interface{})) { w.structFields(rv, emit) })
	}
	data, err := tnJSONMarshal(v)
	if err != nil {
		w.buf.WriteString("null")
		return true
	}
	w.buf.Write(data)
	return true
}

// Class instances and object literals: fields in declaration order, inherited
// (embedded) ones first; #private (__name), function and internal fields skipped
func (w *tnJSONWriter) structFields(rv reflect.Value, emit func(string, interface{})) {
	if !rv.CanAddr() {
		tmp := reflect.New(rv.Type()).Elem()
		tmp.Set(rv)
		rv = tmp
	}
	rt := rv.Type()
	for i := 0; i < rt.NumField(); i++ {
		f := rt.Field(i)
		value := reflect.NewAt(f.Type, unsafe.Pointer(rv.Field(i).UnsafeAddr())).Elem()
		if f.Anonymous {
			if f.Type.Kind() == reflect.Struct && f.Type.Name() != "TnError" {
				w.structFields(value, emit)
			}
			continue
		}
		if value.Kind() == reflect.Func || strings.HasPrefix(f.Name, "__") {
			continue
		}
		emit(tnJSONFieldName(f.Name), value.Interface())
	}
}

// A JSON string as JSON.stringify writes it: U+2028 / U+2029 stay raw (Go's
// encoder escapes them), invalid UTF-8 becomes \\ufffd
func tnJSONQuote(buf *bytes.Buffer, s string) {
	const hex = "0123456789abcdef"
	buf.WriteByte('"')
	start := 0
	for i := 0; i < len(s); {
		c := s[i]
		if c >= utf8.RuneSelf {
			r, size := utf8.DecodeRuneInString(s[i:])
			if r == utf8.RuneError && size == 1 {
				buf.WriteString(s[start:i])
				buf.WriteString("\\\\ufffd")
				start = i + 1
			}
			i += size
			continue
		}
		if c >= 0x20 && c != '"' && c != '\\\\' {
			i++
			continue
		}
		buf.WriteString(s[start:i])
		buf.WriteByte('\\\\')
		switch c {
		case '"', '\\\\':
			buf.WriteByte(c)
		case '\\n':
			buf.WriteByte('n')
		case '\\r':
			buf.WriteByte('r')
		case '\\t':
			buf.WriteByte('t')
		case '\\b':
			buf.WriteByte('b')
		case '\\f':
			buf.WriteByte('f')
		default:
			buf.WriteString("u00")
			buf.WriteByte(hex[c>>4])
			buf.WriteByte(hex[c&0xF])
		}
		i++
		start = i
	}
	buf.WriteString(s[start:])
	buf.WriteByte('"')
}

// A struct type's JSON fields (structFields' rules), resolved once per type:
// offset from the struct start, the quoted "key": and how to write the value
// inline (1 float64, 2 string, 3 bool, 0 through property)
type tnJSONField struct {
	offset uintptr
	typ    reflect.Type
	name   string
	key    string
	kind   uint8
}

var tnJSONPlans sync.Map
var tnJSONMarshalerType = reflect.TypeOf((*json.Marshaler)(nil)).Elem()

func tnJSONPlan(t reflect.Type) []tnJSONField {
	if plan, ok := tnJSONPlans.Load(t); ok {
		return plan.([]tnJSONField)
	}
	fields := []tnJSONField{}
	var walk func(t reflect.Type, base uintptr)
	walk = func(t reflect.Type, base uintptr) {
		for i := 0; i < t.NumField(); i++ {
			f := t.Field(i)
			if f.Anonymous {
				if f.Type.Kind() == reflect.Struct && f.Type.Name() != "TnError" {
					walk(f.Type, base+f.Offset)
				}
				continue
			}
			if f.Type.Kind() == reflect.Func || strings.HasPrefix(f.Name, "__") {
				continue
			}
			name := tnJSONFieldName(f.Name)
			var key bytes.Buffer
			tnJSONQuote(&key, name)
			key.WriteByte(':')
			kind := uint8(0)
			switch f.Type {
			case reflect.TypeOf(float64(0)):
				kind = 1
			case reflect.TypeOf(""):
				kind = 2
			case reflect.TypeOf(false):
				kind = 3
			}
			fields = append(fields, tnJSONField{offset: base + f.Offset, typ: f.Type, name: name, key: key.String(), kind: kind})
		}
	}
	walk(t, 0)
	tnJSONPlans.Store(t, fields)
	return fields
}

// A struct behind a pointer, written in place: no copy of the struct, no
// boxing of its numbers, strings and booleans
func (w *tnJSONWriter) fastStruct(rv reflect.Value, depth int) bool {
	w.enter(rv.Pointer())
	defer w.leave()
	base := rv.UnsafePointer()
	w.buf.WriteByte('{')
	wrote := false
	for _, f := range tnJSONPlan(rv.Elem().Type()) {
		mark := w.buf.Len()
		if wrote {
			w.buf.WriteByte(',')
		}
		w.newline(depth + 1)
		w.buf.WriteString(f.key)
		if w.indent != "" {
			w.buf.WriteByte(' ')
		}
		p := unsafe.Add(base, f.offset)
		switch f.kind {
		case 1:
			if x := *(*float64)(p); math.IsNaN(x) || math.IsInf(x, 0) {
				w.buf.WriteString("null")
			} else {
				w.buf.WriteString(TnNumStr(x))
			}
		case 2:
			tnJSONQuote(&w.buf, *(*string)(p))
		case 3:
			w.buf.WriteString(strconv.FormatBool(*(*bool)(p)))
		default:
			if !w.property(f.name, reflect.NewAt(f.typ, p).Elem().Interface(), depth+1) {
				w.buf.Truncate(mark) // undefined values leave the key out
				continue
			}
		}
		wrote = true
	}
	if wrote {
		w.newline(depth)
	}
	w.buf.WriteByte('}')
	return true
}

func (w *tnJSONWriter) object(depth int, each func(emit func(string, interface{}))) bool {
	w.buf.WriteByte('{')
	wrote := false
	each(func(key string, value interface{}) {
		if w.allow != nil && !w.allow[key] {
			return
		}
		if w.replacer != nil {
			value = w.replacer(key, value)
		}
		mark := w.buf.Len()
		if wrote {
			w.buf.WriteByte(',')
		}
		w.newline(depth + 1)
		tnJSONQuote(&w.buf, key)
		w.buf.WriteByte(':')
		if w.indent != "" {
			w.buf.WriteByte(' ')
		}
		if !w.property(key, value, depth+1) {
			w.buf.Truncate(mark) // undefined values leave the key out
			return
		}
		wrote = true
	})
	if wrote {
		w.newline(depth)
	}
	w.buf.WriteByte('}')
	return true
}

// JSON.parse: a SyntaxError for invalid input, as in JS
// Objects decode into ordered records, so their keys keep the text's order
func tnJSONDecodeOrdered(dec *json.Decoder) (interface{}, error) {
	tok, err := dec.Token()
	if err != nil {
		return nil, err
	}
	delim, isDelim := tok.(json.Delim)
	if !isDelim {
		return tok, nil
	}
	if delim == '[' {
		arr := []interface{}{}
		for dec.More() {
			v, err := tnJSONDecodeOrdered(dec)
			if err != nil {
				return nil, err
			}
			arr = append(arr, v)
		}
		_, err := dec.Token()
		return arr, err
	}
	m := TnNewMap[string, interface{}]()
	for dec.More() {
		keyTok, err := dec.Token()
		if err != nil {
			return nil, err
		}
		key, _ := keyTok.(string)
		v, err := tnJSONDecodeOrdered(dec)
		if err != nil {
			return nil, err
		}
		m.Set(key, v)
	}
	_, err = dec.Token()
	return m, err
}

func TnJSONParse(text string) interface{} {
	dec := json.NewDecoder(strings.NewReader(text))
	if ordered, err := tnJSONDecodeOrdered(dec); err == nil {
		if _, extra := dec.Token(); extra == io.EOF {
			return ordered
		}
	}
	// invalid JSON: the error message comes from encoding/json's offsets
	var v interface{}
	if err := json.Unmarshal([]byte(text), &v); err != nil {
		msg := "Unexpected end of JSON input"
		if se, ok := err.(*json.SyntaxError); ok && int(se.Offset) <= len(text) && se.Offset > 0 && strings.TrimSpace(text) != "" {
			at := int(se.Offset) - 1
			if at < len(text) && !strings.HasPrefix(err.Error(), "unexpected end") {
				shown := text
				if len(shown) > 32 {
					shown = shown[:32] + "..."
				}
				msg = fmt.Sprintf("Unexpected token '%c', %q is not valid JSON", text[at], shown)
			}
		}
		panic(TnNodeError("SyntaxError", "", msg))
	}
	return v
}

// JSON.parse(text, reviver): the reviver sees every value bottom-up
// (a nil result keeps the key, set to null)
func TnJSONParseWith(text string, reviver func(string, interface{}) interface{}) interface{} {
	root := TnJSONParse(text)
	var walk func(key string, v interface{}) interface{}
	walk = func(key string, v interface{}) interface{} {
		switch t := v.(type) {
		case *TnMap[string, interface{}]:
			for _, k := range t.Keys() {
				t.Set(k, walk(k, t.Get(k)))
			}
		case map[string]interface{}:
			keys := make([]string, 0, len(t))
			for k := range t {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				t[k] = walk(k, t[k])
			}
		case []interface{}:
			for i := range t {
				t[i] = walk(strconv.Itoa(i), t[i])
			}
		}
		return reviver(key, v)
	}
	return walk("", root)
}

// json.Marshal without HTML escaping of <, > and & (JSON.stringify does not escape them)
func tnJSONMarshal(v interface{}) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(buf.Bytes(), []byte("\\n")), nil
}`,
  orderedMap: `// TnMap: JS Map/Set/object semantics — keys iterate in insertion order
type TnMap[K comparable, V any] struct {
	keys   []K
	values map[K]V
	jsKind uint8 // 1: made by new Map(), 2: by new Set() (instanceof)
}

func TnJSCollection[K comparable, V any](m *TnMap[K, V], kind uint8) *TnMap[K, V] {
	m.jsKind = kind
	return m
}

func (m *TnMap[K, V]) TnJSKind() uint8 {
	if m == nil {
		return 0
	}
	return m.jsKind
}

func TnNewMap[K comparable, V any]() *TnMap[K, V] {
	return &TnMap[K, V]{values: map[K]V{}}
}

// Fills a new map from dynamic entries (a decoded record held as any),
// converting keys and values with convert
func (m *TnMap[K, V]) TnFill(entries [][]interface{}, convert func(interface{}, reflect.Type) (reflect.Value, bool)) bool {
	if m.values == nil {
		m.values = map[K]V{}
	}
	keyType := reflect.TypeOf((*K)(nil)).Elem()
	valueType := reflect.TypeOf((*V)(nil)).Elem()
	for _, e := range entries {
		k, kok := convert(e[0], keyType)
		v, vok := convert(e[1], valueType)
		if !kok || !vok {
			return false
		}
		m.Set(k.Interface().(K), v.Interface().(V))
	}
	return true
}

func (m *TnMap[K, V]) Set(k K, v V) *TnMap[K, V] {
	if _, ok := m.values[k]; !ok {
		m.keys = append(m.keys, k)
	}
	m.values[k] = v
	return m
}

func (m *TnMap[K, V]) Get(k K) V {
	if m == nil {
		var zero V
		return zero
	}
	return m.values[k]
}

// A string key's value when the map is held in a dynamic value (a Record or a
// node:sqlite row read as \`row.name\`): TnGet finds it through this method
func (m *TnMap[K, V]) TnProp(key string) (interface{}, bool) {
	k, ok := any(key).(K)
	if !ok || m == nil {
		return nil, false
	}
	v, present := m.values[k]
	return v, present
}

func (m *TnMap[K, V]) Lookup(k K) (V, bool) {
	if m == nil {
		var zero V
		return zero, false
	}
	v, ok := m.values[k]
	return v, ok
}

func (m *TnMap[K, V]) Has(k K) bool {
	if m == nil {
		return false
	}
	_, ok := m.values[k]
	return ok
}

func (m *TnMap[K, V]) Delete(k K) bool {
	if _, ok := m.values[k]; !ok {
		return false
	}
	delete(m.values, k)
	for i, key := range m.keys {
		if key == k {
			m.keys = append(m.keys[:i], m.keys[i+1:]...)
			break
		}
	}
	return true
}

// Set operations (ES2025), in the receiver's insertion order then the argument's
func (m *TnMap[K, V]) Union(o *TnMap[K, V]) *TnMap[K, V] {
	r := TnNewMap[K, V]()
	for _, k := range m.keys {
		r.Set(k, m.values[k])
	}
	for _, k := range o.keys {
		r.Set(k, o.values[k])
	}
	return r
}

func (m *TnMap[K, V]) Intersection(o *TnMap[K, V]) *TnMap[K, V] {
	r := TnNewMap[K, V]()
	for _, k := range m.keys {
		if o.Has(k) {
			r.Set(k, m.values[k])
		}
	}
	return r
}

func (m *TnMap[K, V]) Difference(o *TnMap[K, V]) *TnMap[K, V] {
	r := TnNewMap[K, V]()
	for _, k := range m.keys {
		if !o.Has(k) {
			r.Set(k, m.values[k])
		}
	}
	return r
}

func (m *TnMap[K, V]) SymmetricDifference(o *TnMap[K, V]) *TnMap[K, V] {
	return m.Difference(o).Union(o.Difference(m))
}

func (m *TnMap[K, V]) IsSubsetOf(o *TnMap[K, V]) bool {
	for _, k := range m.keys {
		if !o.Has(k) {
			return false
		}
	}
	return true
}

func (m *TnMap[K, V]) Clear() {
	m.keys = nil
	m.values = map[K]V{}
}

func (m *TnMap[K, V]) Len() int {
	if m == nil {
		return 0
	}
	return len(m.keys)
}

func (m *TnMap[K, V]) Keys() []K {
	if m == nil {
		return nil
	}
	return append([]K{}, m.keys...)
}

func (m *TnMap[K, V]) Values() []V {
	if m == nil {
		return nil
	}
	values := make([]V, 0, len(m.keys))
	for _, k := range m.keys {
		values = append(values, m.values[k])
	}
	return values
}

func (m *TnMap[K, V]) Entries() [][]interface{} {
	entries := make([][]interface{}, 0, m.Len())
	for _, k := range m.Keys() {
		entries = append(entries, []interface{}{k, m.values[k]})
	}
	return entries
}

func (m *TnMap[K, V]) All() iter.Seq2[K, V] {
	return func(yield func(K, V) bool) {
		for _, k := range m.Keys() {
			if v, ok := m.values[k]; ok && !yield(k, v) {
				return
			}
		}
	}
}

// JSON objects decode in document order (json.Unmarshal into a ref)
func (m *TnMap[K, V]) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	tok, err := dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := tok.(json.Delim); !ok || delim != '{' {
		return fmt.Errorf("json: cannot unmarshal %v into an object", tok)
	}
	m.keys = nil
	m.values = map[K]V{}
	for dec.More() {
		tok, err := dec.Token()
		if err != nil {
			return err
		}
		name, _ := tok.(string)
		var key K
		if p, ok := any(&key).(*string); ok {
			*p = name
		} else if err := json.Unmarshal([]byte(name), &key); err != nil {
			return err
		}
		var value V
		if err := dec.Decode(&value); err != nil {
			return err
		}
		m.Set(key, value)
	}
	_, err = dec.Token()
	return err
}

// JSON objects keep insertion order
func (m *TnMap[K, V]) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range m.keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		key, _ := json.Marshal(fmt.Sprint(k))
		value, err := json.Marshal(m.values[k])
		if err != nil {
			return nil, err
		}
		buf.Write(key)
		buf.WriteByte(':')
		buf.Write(value)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}`,
  regexReplaceFirst: `func TnRegexReplaceFirst(re *regexp.Regexp, s string, repl string) string {
	loc := re.FindStringSubmatchIndex(s)
	if loc == nil {
		return s
	}
	return s[:loc[0]] + string(re.ExpandString(nil, repl, s, loc)) + s[loc[1]:]
}`,
  regexMatch: `// JS match arrays are []string; the match's .index rides in a hidden slot
// past len, which reslicing up to cap reaches (an append overwrites it)
const tnMatchIndexTag = "\\x00index:"

// The groups of the match at loc, with room for the .index slot
func tnMatchGroups(s string, loc []int) []string {
	n := len(loc) / 2
	groups := make([]string, n, n+1)
	for i := 0; i < n; i++ {
		if loc[2*i] >= 0 {
			groups[i] = s[loc[2*i]:loc[2*i+1]]
		}
	}
	tnMarkUnmatched(groups, loc)
	return groups
}

// A match array's hidden tag (past its length): "\\x00index:<index>|<groups
// that did not participate>" — those are undefined in JS, "" here
func tnMarkUnmatched(groups []string, loc []int) {
	if cap(groups) <= len(groups) {
		return
	}
	var miss []string
	for i := 0; i < len(groups) && 2*i < len(loc); i++ {
		if loc[2*i] < 0 {
			miss = append(miss, strconv.Itoa(i))
		}
	}
	if len(miss) > 0 {
		groups[:len(groups)+1][len(groups)] = tnMatchIndexTag + "-1|" + strings.Join(miss, ",")
	}
}

// m[i] of a match array as string | undefined (an unmatched group, or past the end)
func TnMatchGroup(m []string, i float64) *string {
	n := int(i)
	if i < 0 || n >= len(m) {
		return nil
	}
	if cap(m) > len(m) {
		if tag := m[:len(m)+1][len(m)]; strings.HasPrefix(tag, tnMatchIndexTag) {
			if bar := strings.IndexByte(tag, '|'); bar >= 0 {
				for _, g := range strings.Split(tag[bar+1:], ",") {
					if g == strconv.Itoa(n) {
						return nil
					}
				}
			}
		}
	}
	v := m[n]
	return &v
}

// The groups of the match at loc, tagged with its character index
func tnMatchArray(s string, loc []int, index int) []string {
	groups := tnMatchGroups(s, loc)
	tnSetMatchIndex(groups, index)
	return groups
}

func tnSetMatchIndex(groups []string, index int) {
	if cap(groups) > len(groups) {
		// (keeping the unmatched groups the tag records)
		unmatched := ""
		if tag := groups[:len(groups)+1][len(groups)]; strings.HasPrefix(tag, tnMatchIndexTag) {
			if bar := strings.IndexByte(tag, '|'); bar >= 0 {
				unmatched = tag[bar:]
			}
		}
		groups[:len(groups)+1][len(groups)] = tnMatchIndexTag + strconv.Itoa(index) + unmatched
	}
}

// m.index; NaN when m is not a match array
func TnMatchIndex(m []string) float64 {
	if cap(m) > len(m) {
		if tag := m[:len(m)+1][len(m)]; strings.HasPrefix(tag, tnMatchIndexTag) {
			index := tag[len(tnMatchIndexTag):]
			if bar := strings.IndexByte(index, '|'); bar >= 0 {
				index = index[:bar]
			}
			if n, err := strconv.Atoi(index); err == nil && n >= 0 {
				return float64(n)
			}
		}
	}
	return math.NaN()
}

// The character index of a byte match location (search), -1 without a match
func TnMatchCharIndex(s string, loc []int) float64 {
	if loc == nil {
		return -1
	}
	return float64(tnStrRune(s, loc[0]))
}

func TnRegexpExec(re *regexp.Regexp, s string) []string {
	loc := re.FindStringSubmatchIndex(s)
	if loc == nil {
		return nil
	}
	return tnMatchArray(s, loc, tnStrRune(s, loc[0]))
}

func TnRegexpMatchAll(re *regexp.Regexp, s string) [][]string {
	var out [][]string
	at, index := 0, 0
	for _, loc := range re.FindAllStringSubmatchIndex(s, -1) {
		index += utf8.RuneCountInString(s[at:loc[0]])
		at = loc[0]
		out = append(out, tnMatchArray(s, loc, index))
	}
	return out
}

func TnRegexpSplit(re *regexp.Regexp, s string, limit int) []string {
	return tnRegexSplit(s, limit, func(start int) []int {
		loc := re.FindStringSubmatchIndex(s[start:])
		for i := range loc {
			if loc[i] >= 0 {
				loc[i] += start
			}
		}
		return loc
	})
}

// JS split: the pieces between matches plus each match's captures, at most
// limit items (negative: no limit); an empty match at the start of a piece
// or at the end of the string does not split. find returns the leftmost
// match at or after a byte offset.
func tnRegexSplit(s string, limit int, find func(start int) []int) []string {
	parts := []string{}
	if limit == 0 {
		return parts
	}
	if s == "" {
		if find(0) == nil {
			parts = append(parts, s)
		}
		return parts
	}
	last := 0
	for at := 0; at < len(s); {
		loc := find(at)
		if loc == nil || loc[0] >= len(s) {
			break
		}
		if loc[1] == last {
			_, size := utf8.DecodeRuneInString(s[loc[0]:])
			at = loc[0] + size
			continue
		}
		parts = append(parts, s[last:loc[0]])
		if len(parts) == limit {
			return parts
		}
		for i := 1; i < len(loc)/2; i++ {
			group := ""
			if loc[2*i] >= 0 {
				group = s[loc[2*i]:loc[2*i+1]]
			}
			parts = append(parts, group)
			if len(parts) == limit {
				return parts
			}
		}
		last = loc[1]
		at = last
	}
	return append(parts, s[last:])
}`,
  namedGroups: `// TnMatch: the result of exec on a regex with named groups
type TnMatch struct {
	groups *TnMap[string, string]
	index  float64
}

func TnRegexExecNamed(re *regexp.Regexp, s string) *TnMatch {
	loc := re.FindStringSubmatchIndex(s)
	if loc == nil {
		return nil
	}
	res := &TnMatch{groups: TnNewMap[string, string](), index: float64(tnStrRune(s, loc[0]))}
	for i, name := range re.SubexpNames() {
		if name != "" && 2*i < len(loc) {
			group := ""
			if loc[2*i] >= 0 {
				group = s[loc[2*i]:loc[2*i+1]]
			}
			res.groups.Set(name, group)
		}
	}
	return res
}`,
  fancyRegex: `// TnRegex: a regex with JS semantics the plain RE2 path cannot serve —
// /g state (lastIndex) and backreference/lookaround patterns (a small
// backtracking engine).
type TnRegex struct {
	re        *regexp.Regexp
	anchored  *regexp.Regexp
	bt        *tnBt
	lastIndex float64
	global    bool
	sticky    bool
	source    string
	flags     string
}

func TnRegexCompile(pattern string, flags string, source string) *TnRegex {
	r := &TnRegex{global: strings.Contains(flags, "g"), sticky: strings.Contains(flags, "y"), source: source, flags: flags}
	prefix := ""
	for _, f := range "ims" {
		if strings.ContainsRune(flags, f) {
			prefix += string(f)
		}
	}
	if prefix != "" {
		prefix = "(?" + prefix + ")"
	}
	if re, err := regexp.Compile(prefix + pattern); err == nil {
		r.re = re
		// /y matches only at lastIndex: anchored, so a miss costs no scan
		if r.sticky {
			r.anchored = regexp.MustCompile(prefix + "\\\\A(?:" + pattern + ")")
		}
	} else {
		r.bt = tnBtCompile(pattern)
		if r.bt != nil {
			r.bt.icase = strings.Contains(flags, "i")
			r.bt.multiline = strings.Contains(flags, "m")
			r.bt.dotAll = strings.Contains(flags, "s")
		}
	}
	return r
}

// A plain RE2 regex as a TnRegex
func TnRegexWrap(re *regexp.Regexp) *TnRegex {
	return &TnRegex{re: re, source: TnRegexpSource(re), flags: TnRegexpFlags(re)}
}

// .source / .flags of a plain RE2 regex: flags lead the pattern as (?ims)
var tnRegexpFlagPrefix = regexp.MustCompile("^\\\\(\\\\?([ims]+)\\\\)")

func TnRegexpSource(re *regexp.Regexp) string {
	return strings.ReplaceAll(tnRegexpFlagPrefix.ReplaceAllString(re.String(), ""), "(?P<", "(?<")
}

func TnRegexpFlags(re *regexp.Regexp) string {
	if m := tnRegexpFlagPrefix.FindStringSubmatch(re.String()); m != nil {
		return m[1]
	}
	return ""
}

func (r *TnRegex) Test(s string) bool {
	groups, _ := r.find(s)
	return groups != nil
}

func (r *TnRegex) Find(s string) []string {
	groups, loc := r.find(s)
	// find tags /g and /y matches with their index as it moves lastIndex
	if groups != nil && !r.global && !r.sticky {
		tnSetMatchIndex(groups, tnStrRune(s, loc[0]))
	}
	return groups
}

// string .match: with /g every whole match (nil for none), else the first
// match's groups
func (r *TnRegex) FindSub(s string) []string {
	if r.global {
		var all []string
		r.scan(s, func(groups []string, loc []int) bool {
			all = append(all, groups[0])
			return true
		})
		r.lastIndex = 0
		return all
	}
	groups, loc := r.matchAt(&tnRegexInput{s: s}, 0, false)
	if groups != nil {
		tnSetMatchIndex(groups, tnStrRune(s, loc[0]))
	}
	return groups
}

func (r *TnRegex) FindAllSub(s string) [][]string {
	var out [][]string
	at, index := 0, 0
	r.scan(s, func(groups []string, loc []int) bool {
		index += utf8.RuneCountInString(s[at:loc[0]])
		at = loc[0]
		tnSetMatchIndex(groups, index)
		out = append(out, groups)
		return true
	})
	return out
}

func (r *TnRegex) FindIndexSub(s string) []int {
	_, loc := r.matchAt(&tnRegexInput{s: s}, 0, false)
	if loc == nil {
		return nil
	}
	return loc[:2]
}

func (r *TnRegex) SplitStr(s string, limit int) []string {
	in := &tnRegexInput{s: s}
	return tnRegexSplit(s, limit, func(start int) []int {
		_, loc := r.matchAt(in, start, false)
		return loc
	})
}

func TnRegexWrapReplaceAll(r *TnRegex, s string, repl string) string {
	return r.replace(s, repl, true)
}

func TnRegexWrapReplaceFirst(r *TnRegex, s string, repl string) string {
	return r.replace(s, repl, false)
}

func TnRegexReplaceFuncW(r *TnRegex, s string, fn func([]string) string, all bool) string {
	var out strings.Builder
	last := 0
	r.scan(s, func(groups []string, loc []int) bool {
		out.WriteString(s[last:loc[0]])
		out.WriteString(fn(groups))
		last = loc[1]
		return all
	})
	out.WriteString(s[last:])
	return out.String()
}

func (r *TnRegex) replace(s string, repl string, all bool) string {
	var out strings.Builder
	last := 0
	r.scan(s, func(groups []string, loc []int) bool {
		out.WriteString(s[last:loc[0]])
		out.WriteString(tnExpandGroups(repl, groups))
		last = loc[1]
		return all
	})
	out.WriteString(s[last:])
	return out.String()
}

// Replaces the numeric group placeholders in the replacement with captures
func tnExpandGroups(repl string, groups []string) string {
	if strings.IndexByte(repl, '$') < 0 {
		return repl
	}
	var out strings.Builder
	for i := 0; i < len(repl); i++ {
		if repl[i] == '$' && i+1 < len(repl) && repl[i+1] == '{' {
			if j := strings.IndexByte(repl[i+2:], '}'); j >= 0 {
				if n, err := strconv.Atoi(repl[i+2 : i+2+j]); err == nil && n < len(groups) {
					out.WriteString(groups[n])
					i = i + 2 + j
					continue
				}
			}
		}
		out.WriteByte(repl[i])
	}
	return out.String()
}

// A subject string; the rune view the backtracking engine needs is built
// once per string, not once per match
type tnRegexInput struct {
	s    string
	runs []rune
	offs []int
}

func (in *tnRegexInput) runes() ([]rune, []int) {
	if in.offs == nil {
		// (shared with the string's index: not rebuilt per match)
		in.runs, in.offs = tnStrRunes(in.s)
	}
	return in.runs, in.offs
}

// scan: every match left to right, like a /g loop from lastIndex 0 (an empty
// match steps one rune forward), until yield returns false
func (r *TnRegex) scan(s string, yield func(groups []string, loc []int) bool) {
	in := &tnRegexInput{s: s}
	for at := 0; at <= len(s); {
		groups, loc := r.matchAt(in, at, r.sticky)
		if groups == nil || !yield(groups, loc) {
			return
		}
		at = loc[1]
		if loc[1] == loc[0] {
			if at == len(s) {
				return
			}
			_, size := utf8.DecodeRuneInString(s[at:])
			at += size
		}
	}
}

// matchAt: leftmost match at or after byte offset start (only at start when
// sticky); loc holds byte offsets
func (r *TnRegex) matchAt(in *tnRegexInput, start int, sticky bool) ([]string, []int) {
	if r.bt == nil {
		re := r.re
		if sticky && r.anchored != nil {
			re = r.anchored
		}
		loc := re.FindStringSubmatchIndex(in.s[start:])
		if loc == nil || (sticky && loc[0] != 0) {
			return nil, nil
		}
		for i := range loc {
			if loc[i] >= 0 {
				loc[i] += start
			}
		}
		return tnMatchGroups(in.s, loc), loc
	}
	runs, offs := in.runes()
	first := sort.SearchInts(offs, start)
	for pos := first; pos <= len(runs) && (!sticky || pos == first); pos++ {
		caps := make([]int, (r.bt.ngroups+1)*2)
		for i := range caps {
			caps[i] = -1
		}
		m := &tnBtMatchState{runs: runs, caps: caps, bt: r.bt}
		end := -1
		if m.match(r.bt.root, pos, func(e int) bool { end = e; return true }) {
			caps[0], caps[1] = pos, end
			// room for the hidden .index slot (tnSetMatchIndex)
			groups := make([]string, r.bt.ngroups+1, r.bt.ngroups+2)
			loc := make([]int, (r.bt.ngroups+1)*2)
			for i := 0; i <= r.bt.ngroups; i++ {
				si, ei := caps[2*i], caps[2*i+1]
				if si >= 0 && ei >= si {
					groups[i] = string(runs[si:ei])
					loc[2*i], loc[2*i+1] = offs[si], offs[ei]
				} else {
					loc[2*i], loc[2*i+1] = -1, -1
				}
			}
			tnMarkUnmatched(groups, loc)
			return groups, loc
		}
	}
	return nil, nil
}

// find: leftmost match at or after lastIndex (which /g advances in runes)
func (r *TnRegex) find(s string) ([]string, []int) {
	in := &tnRegexInput{s: s}
	if !r.global && !r.sticky {
		return r.matchAt(in, 0, false)
	}
	// (lastIndex is a code point index: its byte offset from the string's index)
	if r.lastIndex < 0 || int(r.lastIndex) > tnStrCount(s) {
		r.lastIndex = 0
		return nil, nil
	}
	start := tnStrByte(s, int(r.lastIndex))
	groups, loc := r.matchAt(in, start, r.sticky)
	if groups == nil {
		r.lastIndex = 0
		return nil, nil
	}
	index := tnStrRune(s, loc[0])
	tnSetMatchIndex(groups, index)
	next := float64(tnStrRune(s, loc[1]))
	if loc[1] == loc[0] {
		next++
	}
	r.lastIndex = next
	return groups, loc
}

func tnByteOffsets(runs []rune) []int {
	offs := make([]int, len(runs)+1)
	bo := 0
	for i, r := range runs {
		offs[i] = bo
		bo += len(string(r))
	}
	offs[len(runs)] = bo
	return offs
}

// ---- Backtracking regex engine for patterns RE2 rejects ----

type tnBtNode struct {
	op       string
	ch       rune
	cls      func(rune) bool
	negCls   bool
	seq      []*tnBtNode
	branches [][]*tnBtNode
	child    *tnBtNode
	min, max int
	greedy   bool
	anchor   byte
	group    int
	behind   bool
	negative bool
}

type tnBt struct {
	root      *tnBtNode
	ngroups   int
	icase     bool
	multiline bool
	dotAll    bool
}

type tnBtParser struct {
	src  []rune
	pos  int
	ngrp int
}

func tnBtCompile(pattern string) *tnBt {
	p := &tnBtParser{src: []rune(pattern)}
	root, err := p.parseAlt()
	if err != nil || p.pos < len(p.src) {
		return nil
	}
	return &tnBt{root: root, ngroups: p.ngrp}
}

func (p *tnBtParser) peek() (rune, bool) {
	if p.pos < len(p.src) {
		return p.src[p.pos], true
	}
	return 0, false
}

func (p *tnBtParser) parseAlt() (*tnBtNode, error) {
	var branches [][]*tnBtNode
	for {
		seq, err := p.parseSeq()
		if err != nil {
			return nil, err
		}
		branches = append(branches, seq)
		if ch, ok := p.peek(); ok && ch == '|' {
			p.pos++
			continue
		}
		break
	}
	if len(branches) == 1 {
		return &tnBtNode{op: "cat", seq: branches[0]}, nil
	}
	return &tnBtNode{op: "alt", branches: branches}, nil
}

func (p *tnBtParser) parseSeq() ([]*tnBtNode, error) {
	var seq []*tnBtNode
	for {
		ch, ok := p.peek()
		if !ok || ch == '|' || ch == ')' {
			break
		}
		atom, err := p.parseAtom()
		if err != nil {
			return nil, err
		}
		if atom == nil {
			continue
		}
		node, err := p.parseQuantifier(atom)
		if err != nil {
			return nil, err
		}
		seq = append(seq, node)
	}
	return seq, nil
}

func (p *tnBtParser) parseQuantifier(atom *tnBtNode) (*tnBtNode, error) {
	ch, ok := p.peek()
	if !ok {
		return atom, nil
	}
	lo, hi := 0, 0
	switch ch {
	case '*':
		lo, hi = 0, -1
	case '+':
		lo, hi = 1, -1
	case '?':
		lo, hi = 0, 1
	case '{':
		save := p.pos
		p.pos++
		parsedLo, parsedHi, ok2 := p.parseBraces()
		if !ok2 {
			p.pos = save
			return atom, nil
		}
		lo, hi = parsedLo, parsedHi
	default:
		return atom, nil
	}
	p.pos++
	greedy := true
	if c, ok2 := p.peek(); ok2 && c == '?' {
		greedy = false
		p.pos++
	}
	return &tnBtNode{op: "rep", child: atom, min: lo, max: hi, greedy: greedy}, nil
}

// {m}, {m,}, {m,n} — returns ok=false when the brace is a literal
func (p *tnBtParser) parseBraces() (int, int, bool) {
	lo := 0
	digits := 0
	for {
		c, ok := p.peek()
		if !ok || c < '0' || c > '9' {
			break
		}
		lo = lo*10 + int(c-'0')
		digits++
		p.pos++
	}
	if digits == 0 {
		return 0, 0, false
	}
	hi := lo
	if c, ok := p.peek(); ok && c == ',' {
		p.pos++
		hi = -1
		hv := 0
		hd := 0
		for {
			c2, ok2 := p.peek()
			if !ok2 || c2 < '0' || c2 > '9' {
				break
			}
			hv = hv*10 + int(c2-'0')
			hd++
			p.pos++
		}
		if hd > 0 {
			hi = hv
		}
	}
	if c, ok := p.peek(); !ok || c != '}' {
		return 0, 0, false
	}
	return lo, hi, true
}

func tnCharClass(escape rune) func(rune) bool {
	switch escape {
	case 'd':
		return func(r rune) bool { return r >= '0' && r <= '9' }
	case 'D':
		return func(r rune) bool { return !(r >= '0' && r <= '9') }
	case 'w':
		return func(r rune) bool {
			return r == '_' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')
		}
	case 'W':
		return func(r rune) bool {
			return !(r == '_' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z'))
		}
	case 's':
		return func(r rune) bool { return r == ' ' || r == '\\t' || r == '\\n' || r == '\\r' || r == '\\f' || r == '\\v' }
	case 'S':
		return func(r rune) bool { return !(r == ' ' || r == '\\t' || r == '\\n' || r == '\\r' || r == '\\f' || r == '\\v') }
	}
	return nil
}

func (p *tnBtParser) parseAtom() (*tnBtNode, error) {
	ch, ok := p.peek()
	if !ok {
		return nil, fmt.Errorf("unexpected end")
	}
	p.pos++
	switch ch {
	case '(':
		kind := "group"
		negative := false
		behind := false
		if c, ok2 := p.peek(); ok2 && c == '?' {
			p.pos++
			c2, _ := p.peek()
			switch c2 {
			case ':':
				p.pos++
				kind = "noncap"
			case '=':
				p.pos++
				kind = "look"
			case '!':
				p.pos++
				kind = "look"
				negative = true
			case '<':
				p.pos++
				c3, ok3 := p.peek()
				if !ok3 {
					return nil, fmt.Errorf("bad (?<")
				}
				if c3 == '=' || c3 == '!' {
					p.pos++
					kind = "look"
					behind = true
					negative = c3 == '!'
				} else {
					for {
						cn, okn := p.peek()
						if !okn {
							return nil, fmt.Errorf("unterminated group name")
						}
						p.pos++
						if cn == '>' {
							break
						}
					}
				}
			case 'P':
				p.pos++
				if c3, ok3 := p.peek(); ok3 && c3 == '<' {
					p.pos++
					for {
						cn, okn := p.peek()
						if !okn {
							return nil, fmt.Errorf("unterminated group name")
						}
						p.pos++
						if cn == '>' {
							break
						}
					}
				} else {
					return nil, fmt.Errorf("bad (?P")
				}
			default:
				return nil, fmt.Errorf("unsupported group")
			}
		}
		body, err := p.parseAlt()
		if err != nil {
			return nil, err
		}
		if c, ok2 := p.peek(); !ok2 || c != ')' {
			return nil, fmt.Errorf("missing )")
		}
		p.pos++
		switch kind {
		case "noncap":
			return body, nil
		case "look":
			return &tnBtNode{op: "look", child: body, behind: behind, negative: negative}, nil
		default:
			p.ngrp++
			return &tnBtNode{op: "group", group: p.ngrp, child: body}, nil
		}
	case '[':
		return p.parseClass()
	case '.':
		return &tnBtNode{op: "any"}, nil
	case '^':
		return &tnBtNode{op: "anchor", anchor: '^'}, nil
	case '$':
		return &tnBtNode{op: "anchor", anchor: '$'}, nil
	case '\\\\':
		return p.parseEscape()
	default:
		return &tnBtNode{op: "char", ch: ch}, nil
	}
}

func (p *tnBtParser) parseEscape() (*tnBtNode, error) {
	c, ok := p.peek()
	if !ok {
		return nil, fmt.Errorf("trailing backslash")
	}
	p.pos++
	switch c {
	case 'b':
		return &tnBtNode{op: "anchor", anchor: 'b'}, nil
	case 'B':
		return &tnBtNode{op: "anchor", anchor: 'B'}, nil
	case 'n':
		return &tnBtNode{op: "char", ch: '\\n'}, nil
	case 't':
		return &tnBtNode{op: "char", ch: '\\t'}, nil
	case 'r':
		return &tnBtNode{op: "char", ch: '\\r'}, nil
	case 'f':
		return &tnBtNode{op: "char", ch: '\\f'}, nil
	case 'v':
		return &tnBtNode{op: "char", ch: '\\v'}, nil
	case '0':
		return &tnBtNode{op: "char", ch: 0}, nil
	case '1', '2', '3', '4', '5', '6', '7', '8', '9':
		return &tnBtNode{op: "backref", group: int(c - '0')}, nil
	default:
		if cls := tnCharClass(c); cls != nil {
			return &tnBtNode{op: "class", cls: cls}, nil
		}
		return &tnBtNode{op: "char", ch: c}, nil
	}
}

func (p *tnBtParser) parseClass() (*tnBtNode, error) {
	negate := false
	if c, ok := p.peek(); ok && c == '^' {
		negate = true
		p.pos++
	}
	var items []func(rune) bool
	first := true
	for {
		c, ok := p.peek()
		if !ok {
			return nil, fmt.Errorf("unterminated class")
		}
		if c == ']' && !first {
			p.pos++
			break
		}
		first = false
		p.pos++
		var lo rune
		if c == '\\\\' {
			c2, ok2 := p.peek()
			if !ok2 {
				return nil, fmt.Errorf("trailing backslash in class")
			}
			p.pos++
			if cls := tnCharClass(c2); cls != nil {
				items = append(items, cls)
				continue
			}
			switch c2 {
			case 'n':
				lo = '\\n'
			case 't':
				lo = '\\t'
			case 'r':
				lo = '\\r'
			default:
				lo = c2
			}
		} else {
			lo = c
		}
		// range?
		if c3, ok3 := p.peek(); ok3 && c3 == '-' {
			if c4, ok4 := p.peekAt(1); ok4 && c4 != ']' {
				p.pos++ // consume '-'
				hiChar, _ := p.peek()
				p.pos++
				hi := hiChar
				if hiChar == '\\\\' {
					hc, ok5 := p.peek()
					if !ok5 {
						return nil, fmt.Errorf("trailing backslash in class")
					}
					p.pos++
					hi = hc
				}
				l, h := lo, hi
				items = append(items, func(r rune) bool { return r >= l && r <= h })
				continue
			}
		}
		l := lo
		items = append(items, func(r rune) bool { return r == l })
	}
	matchers := items
	return &tnBtNode{op: "class", cls: func(r rune) bool {
		for _, m := range matchers {
			if m(r) {
				return true
			}
		}
		return false
	}, negCls: negate}, nil
}

func (p *tnBtParser) peekAt(offset int) (rune, bool) {
	if p.pos+offset < len(p.src) {
		return p.src[p.pos+offset], true
	}
	return 0, false
}

type tnBtMatchState struct {
	runs []rune
	caps []int
	bt   *tnBt
}

// Line terminators for . and multiline ^ $ (as JS defines them)
func tnBtLineEnd(r rune) bool {
	return r == '\\n' || r == '\\r' || r == 0x2028 || r == 0x2029
}

func (m *tnBtMatchState) seq(nodes []*tnBtNode, pos int, k func(int) bool) bool {
	if len(nodes) == 0 {
		return k(pos)
	}
	return m.match(nodes[0], pos, func(p2 int) bool {
		return m.seq(nodes[1:], p2, k)
	})
}

func tnBtWord(r rune) bool {
	return r == '_' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')
}

func (m *tnBtMatchState) match(node *tnBtNode, pos int, k func(int) bool) bool {
	switch node.op {
	case "char":
		if pos < len(m.runs) && (m.runs[pos] == node.ch || m.bt.icase && unicode.ToLower(m.runs[pos]) == unicode.ToLower(node.ch)) {
			return k(pos + 1)
		}
		return false
	case "any":
		if pos < len(m.runs) && (m.bt.dotAll || !tnBtLineEnd(m.runs[pos])) {
			return k(pos + 1)
		}
		return false
	case "class":
		if pos < len(m.runs) {
			r := m.runs[pos]
			in := node.cls(r)
			if !in && m.bt.icase {
				in = node.cls(unicode.ToLower(r)) || node.cls(unicode.ToUpper(r))
			}
			if in != node.negCls {
				return k(pos + 1)
			}
		}
		return false
	case "anchor":
		switch node.anchor {
		case '^':
			if pos == 0 || m.bt.multiline && tnBtLineEnd(m.runs[pos-1]) {
				return k(pos)
			}
		case '$':
			if pos == len(m.runs) || m.bt.multiline && tnBtLineEnd(m.runs[pos]) {
				return k(pos)
			}
		case 'b':
			before := pos > 0 && tnBtWord(m.runs[pos-1])
			after := pos < len(m.runs) && tnBtWord(m.runs[pos])
			if before != after {
				return k(pos)
			}
		case 'B':
			before := pos > 0 && tnBtWord(m.runs[pos-1])
			after := pos < len(m.runs) && tnBtWord(m.runs[pos])
			if before == after {
				return k(pos)
			}
		}
		return false
	case "cat":
		return m.seq(node.seq, pos, k)
	case "alt":
		for _, br := range node.branches {
			if m.seq(br, pos, k) {
				return true
			}
		}
		return false
	case "group":
		si, ei := node.group*2, node.group*2+1
		savedS, savedE := m.caps[si], m.caps[ei]
		m.caps[si] = pos
		matched := m.match(node.child, pos, func(end int) bool {
			ps, pe := m.caps[si], m.caps[ei]
			m.caps[ei] = end
			if k(end) {
				return true
			}
			m.caps[si], m.caps[ei] = ps, pe
			return false
		})
		if !matched {
			m.caps[si], m.caps[ei] = savedS, savedE
		}
		return matched
	case "backref":
		s, e := m.caps[node.group*2], m.caps[node.group*2+1]
		if s < 0 || e < 0 {
			return k(pos)
		}
		n := e - s
		if pos+n > len(m.runs) {
			return false
		}
		for i := 0; i < n; i++ {
			if m.runs[pos+i] != m.runs[s+i] {
				return false
			}
		}
		return k(pos + n)
	case "look":
		// a positive lookaround keeps its captures (as in JS); a negative one,
		// or one the rest of the pattern backtracks out of, does not
		saved := append([]int(nil), m.caps...)
		matched := false
		if !node.behind {
			matched = m.match(node.child, pos, func(int) bool { return true })
		} else {
			for start := 0; start <= pos && !matched; start++ {
				matched = m.match(node.child, start, func(end int) bool { return end == pos })
			}
		}
		if !matched || node.negative {
			copy(m.caps, saved)
		}
		if matched != node.negative && k(pos) {
			return true
		}
		copy(m.caps, saved)
		return false
	case "rep":
		return m.rep(node, pos, 0, k)
	}
	return false
}

func (m *tnBtMatchState) rep(node *tnBtNode, pos, count int, k func(int) bool) bool {
	if count < node.min {
		return m.match(node.child, pos, func(p2 int) bool {
			return m.rep(node, p2, count+1, k)
		})
	}
	tryMore := func() bool {
		if node.max >= 0 && count >= node.max {
			return false
		}
		return m.match(node.child, pos, func(p2 int) bool {
			if p2 == pos {
				return false
			}
			return m.rep(node, p2, count+1, k)
		})
	}
	if node.greedy {
		if tryMore() {
			return true
		}
		return k(pos)
	}
	if k(pos) {
		return true
	}
	return tryMore()
}`,
  objectAssignTo: `// Object.assign(target, ...sources) on a typed target (a struct or a Map):
// each source's properties are set on the target's fields / entries, and the
// target is the result. Unset (nil) fields of a struct source count as absent;
// a dynamic object's undefined properties are copied.
func TnAssignTo[T any](target T, sources ...interface{}) T {
	for _, src := range sources {
		tnAssignProps(reflect.ValueOf(target), src)
	}
	return target
}

type tnProp struct {
	key   string
	value interface{}
}

func tnOwnProps(src interface{}) []tnProp {
	var out []tnProp
	switch s := src.(type) {
	case nil:
		return nil
	case map[string]interface{}:
		keys := make([]string, 0, len(s))
		for k := range s {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			out = append(out, tnProp{k, s[k]})
		}
		return out
	case interface{ Entries() [][]interface{} }:
		for _, e := range s.Entries() {
			out = append(out, tnProp{fmt.Sprint(e[0]), e[1]})
		}
		return out
	}
	rv := reflect.ValueOf(src)
	if rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return nil
		}
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Struct {
		return nil
	}
	var walk func(v reflect.Value)
	walk = func(v reflect.Value) {
		t := v.Type()
		for i := 0; i < t.NumField(); i++ {
			f := v.Field(i)
			if t.Field(i).Anonymous {
				if f.Kind() == reflect.Pointer && !f.IsNil() {
					f = f.Elem()
				}
				if f.Kind() == reflect.Struct {
					walk(f)
				}
				continue
			}
			if !f.CanInterface() {
				if !f.CanAddr() {
					continue
				}
				f = reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem()
			}
			switch f.Kind() {
			case reflect.Pointer, reflect.Interface, reflect.Func, reflect.Map, reflect.Slice, reflect.Chan:
				if f.IsNil() {
					continue
				}
			}
			out = append(out, tnProp{strings.TrimSuffix(t.Field(i).Name, "_"), f.Interface()})
		}
	}
	if !rv.CanAddr() {
		copied := reflect.New(rv.Type()).Elem()
		copied.Set(rv)
		rv = copied
	}
	walk(rv)
	return out
}

// The settable field of struct value v named like JS property key
func tnFieldByKey(v reflect.Value, key string) (reflect.Value, bool) {
	t := v.Type()
	for i := 0; i < t.NumField(); i++ {
		f := v.Field(i)
		if t.Field(i).Anonymous {
			if f.Kind() == reflect.Pointer && !f.IsNil() {
				f = f.Elem()
			}
			if f.Kind() == reflect.Struct {
				if inner, ok := tnFieldByKey(f, key); ok {
					return inner, true
				}
			}
			continue
		}
		if strings.TrimSuffix(t.Field(i).Name, "_") != key {
			continue
		}
		if !f.CanAddr() {
			return reflect.Value{}, false
		}
		return reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem(), true
	}
	return reflect.Value{}, false
}

func tnAssignProps(target reflect.Value, src interface{}) {
	if !target.IsValid() || (target.Kind() == reflect.Pointer && target.IsNil()) {
		return
	}
	props := tnOwnProps(src)
	if set := target.MethodByName("Set"); set.IsValid() && set.Type().NumIn() == 2 {
		for _, p := range props {
			k, kok := TnConvertDynamic(p.key, set.Type().In(0))
			v, vok := TnConvertDynamic(p.value, set.Type().In(1))
			if kok && vok {
				set.Call([]reflect.Value{k, v})
			}
		}
		return
	}
	if target.Kind() != reflect.Pointer || target.Elem().Kind() != reflect.Struct {
		return
	}
	for _, p := range props {
		field, ok := tnFieldByKey(target.Elem(), p.key)
		if !ok {
			continue
		}
		if converted, cok := TnConvertDynamic(p.value, field.Type()); cok {
			field.Set(converted)
		}
	}
}`,
  objectAssign: `// Object.assign(target, ...sources): copies every source's properties
// (struct fields, maps, dynamic objects) into a fresh ordered map
func TnObjectAssign(target interface{}, sources ...interface{}) *TnMap[string, interface{}] {
	result := TnNewMap[string, interface{}]()
	tnAssignInto(result, target)
	for _, src := range sources {
		tnAssignInto(result, src)
	}
	return result
}

func tnAssignInto(dst *TnMap[string, interface{}], src interface{}) {
	if src == nil {
		return
	}
	switch s := src.(type) {
	case map[string]interface{}:
		for k, v := range s {
			dst.Set(k, v)
		}
		return
	case *TnMap[string, interface{}]:
		for _, k := range s.Keys() {
			dst.Set(k, s.Get(k))
		}
		return
	}
	rv := reflect.ValueOf(src)
	if rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return
		}
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Struct {
		rt := rv.Type()
		for i := 0; i < rt.NumField(); i++ {
			if rv.Field(i).Kind() == reflect.Func {
				continue
			}
			if !rv.Field(i).CanInterface() {
				if !rv.Field(i).CanAddr() {
					continue
				}
				dst.Set(rt.Field(i).Name, reflect.NewAt(rv.Field(i).Type(), unsafe.Pointer(rv.Field(i).UnsafeAddr())).Elem().Interface())
				continue
			}
			dst.Set(rt.Field(i).Name, rv.Field(i).Interface())
		}
	}
}`,
  regexReplaceFunc: `func TnRegexReplaceFunc(re *regexp.Regexp, s string, fn func([]string) string, all bool) string {
	limit := 1
	if all {
		limit = -1
	}
	result := ""
	last := 0
	for _, loc := range re.FindAllStringSubmatchIndex(s, limit) {
		groups := make([]string, len(loc)/2)
		for i := range groups {
			if loc[2*i] >= 0 {
				groups[i] = s[loc[2*i]:loc[2*i+1]]
			}
		}
		result += s[last:loc[0]] + fn(groups)
		last = loc[1]
	}
	return result + s[last:]
}

func TnGroup(groups []string, i int) string {
	if i < len(groups) {
		return groups[i]
	}
	return ""
}`,
  pathToFileURL: `func TnPathToFileURL(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		panic(err)
	}
	slashed := filepath.ToSlash(abs)
	if !strings.HasPrefix(slashed, "/") {
		slashed = "/" + slashed
	}
	return "file://" + (&tnurl.URL{Path: slashed}).EscapedPath()
}`,
  moduleUrl: `// import.meta.url: the file URL of the running program
func TnModuleURL() string {
	exe, err := os.Executable()
	if err != nil {
		panic(err)
	}
	return TnPathToFileURL(exe)
}`,
  osPlatform: `func TnOsPlatform() string {
	if runtime.GOOS == "windows" {
		return "win32"
	}
	if runtime.GOOS == "darwin" {
		return "darwin"
	}
	return runtime.GOOS
}`,
  error: `// TnError: JS Error values (thrown and caught) with a message; Node
// errors also carry a code ('ENOENT', 'ERR_ASSERTION') and extra properties
type TnError struct {
	message string
	code    string
	props   map[string]interface{}
	goErr   error
	pcs     []uintptr // where the error was created (err.stack)
}

func (e *TnError) Error() string { return e.message }

// The embedded TnError of a custom error class (class E extends Error), so
// (err as Error) works on its instances
func (e *TnError) TnBaseError() *TnError { return e }

func TnNewError(message string) *TnError {
	e := &TnError{message: message}
	e.tnCapture(3)
	return e
}

// Records the call stack, skipping runtime.Callers, tnCapture and skip-2 callers
func (e *TnError) tnCapture(skip int) {
	var pcs [32]uintptr
	n := runtime.Callers(skip, pcs[:])
	e.pcs = pcs[:n]
}

// One "at …" line of err.stack: frames of TS code only (the //line
// directives give them their .ts file and line); helper frames are skipped
func tnStackLine(f runtime.Frame) string {
	if !strings.HasSuffix(f.File, ".ts") && !strings.HasSuffix(f.File, ".tsx") {
		return ""
	}
	name := strings.TrimPrefix(f.Function, "main.")
	for {
		i := strings.LastIndex(name, ".func")
		if i < 0 {
			break
		}
		name = name[:i]
	}
	name = strings.NewReplacer("(*", "", ")", "").Replace(name)
	if strings.HasPrefix(name, "New") && len(name) > 3 && !strings.Contains(name, ".") {
		name = "new " + name[3:]
	}
	location := fmt.Sprintf("%s:%d", f.File, f.Line)
	if name == "main" || name == "init" || strings.HasPrefix(name, "init.") {
		return location
	}
	return name + " (" + location + ")"
}


// x instanceof Error / TypeError / …
func TnIsErrorOf(v interface{}, name string) bool {
	if name == "Error" {
		_, ok := v.(error)
		return ok
	}
	e, ok := v.(*TnError)
	return ok && e.Get_name() == name
}

// A Node error: name ('TypeError', 'AssertionError'), code and message
// A recovered panic as the value a JS catch receives: a Go runtime failure
// (nil dereference, failed assertion …) is a TypeError
func TnCaught(r interface{}) interface{} {
	if e, ok := r.(runtime.Error); ok {
		return TnNodeError("TypeError", "", e.Error())
	}
	return r
}

func TnNodeError(name string, code string, message string) *TnError {
	e := &TnError{message: message, code: code, props: map[string]interface{}{"name": name}}
	e.tnCapture(3)
	return e
}

func (e *TnError) prop(key string) interface{} {
	if e.props == nil {
		return nil
	}
	return e.props[key]
}

func (e *TnError) Get_name() string {
	if name, ok := e.prop("name").(string); ok {
		return name
	}
	return "Error"
}

// err.stack: "Name: message" and an "at" line per TS frame, as in Node
func (e *TnError) Get_stack() string {
	head := e.Get_name()
	if e.message != "" {
		head += ": " + e.message
	}
	if len(e.pcs) == 0 {
		return head
	}
	var b strings.Builder
	b.WriteString(head)
	frames := runtime.CallersFrames(e.pcs)
	previous := ""
	for {
		f, more := frames.Next()
		// a try block's closure repeats its function's line
		if line := tnStackLine(f); line != "" && line != previous {
			b.WriteString("\\n    at " + line)
			previous = line
		}
		if !more {
			break
		}
	}
	return b.String()
}

// AggregateError: the errors it was created with
func (e *TnError) Get_errors() []interface{} {
	errs, _ := e.prop("errors").([]interface{})
	return errs
}

func (e *TnError) Get_syscall() string {
	s, _ := e.prop("syscall").(string)
	return s
}

func (e *TnError) Get_path() string {
	s, _ := e.prop("path").(string)
	return s
}

func (e *TnError) Get_errno() float64 {
	n, _ := e.prop("errno").(float64)
	return n
}

func (e *TnError) Get_cause() interface{} { return e.prop("cause") }

func (e *TnError) Get_hostname() string {
	s, _ := e.prop("hostname").(string)
	return s
}

func (e *TnError) Get_address() string {
	s, _ := e.prop("address").(string)
	return s
}

func (e *TnError) Get_port() float64 {
	n, _ := e.prop("port").(float64)
	return n
}

// AssertionError fields
func (e *TnError) Get_actual() interface{} { return e.prop("actual") }

func (e *TnError) Get_expected() interface{} { return e.prop("expected") }

func (e *TnError) Get_operator() string {
	s, _ := e.prop("operator").(string)
	return s
}

func (e *TnError) Get_generatedMessage() bool {
	b, _ := e.prop("generatedMessage").(bool)
	return b
}`,
  asyncWait: `// Pending async work (promise callbacks, detached async calls) keeps the
// event loop alive until it settles
var __tnWaitGroup tnLoopGroup`,
  bigint: `// Base from the literal's prefix (0x / 0o / 0b), decimal otherwise
// a << n for bigints (n < 0 shifts right, rounding toward -Infinity as JS does)
func TnBigShift(a, n *tnbig.Int) *tnbig.Int {
	if n.Sign() >= 0 {
		return new(tnbig.Int).Lsh(a, uint(n.Uint64()))
	}
	return new(tnbig.Int).Rsh(a, uint(new(tnbig.Int).Neg(n).Uint64()))
}

func TnBigInt(s string) *tnbig.Int {
	v, ok := new(tnbig.Int).SetString(s, 0)
	if !ok {
		v, _ = new(tnbig.Int).SetString(s, 10)
	}
	return v
}

// x === 1n where x is a dynamic (number | bigint) value
func TnBigSame(v interface{}, b *tnbig.Int) bool {
	x, ok := v.(*tnbig.Int)
	return ok && x != nil && b != nil && x.Cmp(b) == 0
}

// A dynamic value as a bigint operand: a bigint, or an integral number
func TnToBigInt(v interface{}) *tnbig.Int {
	switch x := v.(type) {
	case *tnbig.Int:
		if x != nil {
			return x
		}
	case float64:
		if x == math.Trunc(x) && !math.IsInf(x, 0) {
			b, _ := new(tnbig.Float).SetFloat64(x).Int(nil)
			return b
		}
	}
	panic(TnNodeError("TypeError", "", "Cannot mix BigInt and other types, use explicit conversions"))
}`,
  goMust: `// Go bridge: (T, error) results throw a *TnError carrying the Go error
func tnGoError(err error) *TnError {
	return &TnError{message: err.Error(), goErr: err}
}

func tnGoMust[T any](v T, err error) T {
	if err != nil {
		panic(tnGoError(err))
	}
	return v
}

func tnGoMust2[A any, B any](a A, b B, err error) (A, B) {
	if err != nil {
		panic(tnGoError(err))
	}
	return a, b
}

func tnGoCheck(err error) {
	if err != nil {
		panic(tnGoError(err))
	}
}`,
  goNums: `// Go bridge: numeric slice conversion ([]int ↔ []float64)
type tnGoNumber interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64
}

func tnGoNums[T tnGoNumber](s []float64) []T {
	out := make([]T, len(s))
	for i, v := range s {
		out[i] = T(v)
	}
	return out
}

func tnGoFromNums[T tnGoNumber](s []T) []float64 {
	out := make([]float64, len(s))
	for i, v := range s {
		out[i] = float64(v)
	}
	return out
}`,
  goMaps: `// Go bridge: TS records / Maps into Go maps (slogtest results, map params)
func tnGoMap[K comparable, V any](m *TnMap[K, V]) map[K]V {
	if m == nil {
		return nil
	}
	out := make(map[K]V, len(m.keys))
	for _, k := range m.keys {
		out[k] = m.values[k]
	}
	return out
}

func tnGoMaps[K comparable, V any](ms []*TnMap[K, V]) []map[K]V {
	out := make([]map[K]V, len(ms))
	for i, m := range ms {
		out[i] = tnGoMap(m)
	}
	return out
}`,
  goStrings: `// Go bridge: first rune of a string (unicode funcs take rune)
func tnGoRune(s string) rune {
	for _, r := range s {
		return r
	}
	return 0
}`,
  goBlocking: `// Go bridge: blocking calls run on a goroutine while the baton holder
// pumps pending loop tasks, so timers and handlers keep running
type tnGoPanic struct{ value interface{} }

func tnGoBlocking(fn func() interface{}) interface{} {
	done := make(chan interface{}, 1)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				done <- tnGoPanic{r}
			}
		}()
		done <- fn()
	}()
	for {
		select {
		case v := <-done:
			return tnGoBlockingResult(v)
		default:
		}
		TnRunMicrotasks()
		if TnLoopRunPending() {
			continue
		}
		// Nothing holds the loop open, so nothing can post to it: wait on the call
		// alone (a synctest bubble sees this wait as durable)
		if atomic.LoadInt64(&tnLoopRefs) == 0 {
			return tnGoBlockingResult(<-done)
		}
		tnRelease()
		select {
		case v := <-done:
			tnAcquire()
			return tnGoBlockingResult(v)
		case <-tnLoopSignal:
			tnAcquire()
		}
	}
}

// The call's result, or its panic raised again on the caller
func tnGoBlockingResult(v interface{}) interface{} {
	if p, ok := v.(tnGoPanic); ok {
		panic(p.value)
	}
	return v
}`,
  symbol: `// TnSymbol: JS symbol values (unique by identity)
type TnSymbol struct {
	description string
	registered  bool
}

func TnNewSymbol(description string) *TnSymbol {
	return &TnSymbol{description: description}
}

// Symbol.for(key) / Symbol.keyFor(sym): the global symbol registry
var tnSymbolRegistry = map[string]*TnSymbol{}

func TnSymbolFor(key string) *TnSymbol {
	if s, ok := tnSymbolRegistry[key]; ok {
		return s
	}
	s := &TnSymbol{description: key, registered: true}
	tnSymbolRegistry[key] = s
	return s
}

func TnSymbolKeyFor(s *TnSymbol) *string {
	if s == nil || !s.registered {
		return nil
	}
	return &s.description
}`,
  dynamicSpread: `// { ...a, k: v } with dynamic sources: a's own properties, in order
func TnAssignInto(dst *TnMap[string, interface{}], src interface{}) {
	if o, ok := src.(map[string]interface{}); ok {
		keys := make([]string, 0, len(o))
		for k := range o {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			dst.Set(k, o[k])
		}
		return
	}
	for _, e := range TnEntries(src) {
		if k, isString := e[0].(string); isString {
			dst.Set(k, e[1])
		}
	}
}`,
  entryPoints: `// Second entry points: new Worker('./w.ts') / fork('./c.ts') compile that
// file into this binary as a function; TN_ENTRY picks it in the child process
var tnEntryPoints = map[string]func(){}

var tnCurrentEntry = func() string {
	e := os.Getenv("TN_ENTRY")
	os.Unsetenv("TN_ENTRY")
	return e
}()

// The entry a spawned copy of this program runs: the one asked for, else this
// process's own (new Worker(__filename) inside a worker file)
var tnNextEntry string

func tnSpawnEntryEnv(env []string) []string {
	entry := tnNextEntry
	tnNextEntry = ""
	if entry == "" {
		entry = tnCurrentEntry
	}
	if entry == "" {
		return env
	}
	return append(env, "TN_ENTRY="+entry)
}`,
  timerWait: `// Timers: callbacks run on the event loop; pending (ref'ed) timers keep the process alive
var __tnTimers tnLoopGroup

// A setTimeout / setImmediate handle (Node's Timeout: ref / unref / hasRef / refresh / close)
type TnTimeout struct {
	timer  *time.Timer
	ms     float64
	fn     func()
	refd   bool
	active bool
	due    time.Time
	seq    int
}

// Armed timers, owned by the baton holder. An expired timer's goroutine only
// wakes the loop, which then runs every due timer in deadline order: timer
// goroutines that expire together (a starved loop, a coarse OS clock) may post
// in any order, but Node fires timers in deadline order.
var __tnPendingTimers = map[*TnTimeout]struct{}{}
var __tnTimerSeq int

func tnRunDueTimers() {
	now := time.Now()
	var due []*TnTimeout
	for t := range __tnPendingTimers {
		if !t.active {
			delete(__tnPendingTimers, t)
		} else if !t.due.After(now) {
			due = append(due, t)
		}
	}
	sort.Slice(due, func(i, j int) bool {
		if !due[i].due.Equal(due[j].due) {
			return due[i].due.Before(due[j].due)
		}
		return due[i].seq < due[j].seq
	})
	for _, t := range due {
		// An earlier callback may have cleared or refreshed it
		if !t.active || t.due.After(now) {
			continue
		}
		delete(__tnPendingTimers, t)
		t.active = false
		if t.refd {
			t.refd = false
			__tnTimers.Done()
		}
		t.fn()
		// Microtasks (promise continuations) run after each timer callback,
		// before the next one fires — as Node does
		TnRunMicrotasks()
	}
}

// node:test mock timers: when set (and the API is mocked) it takes over a timer;
// run calls the callback and reports whether the timer repeats
var tnMockTimerHook func(kind string, ms float64, run func() bool) bool

func TnSetTimeout(ms float64, fn func()) *TnTimeout { return tnSetTimeout("setTimeout", ms, fn) }

func TnSetImmediate(fn func()) *TnTimeout { return tnSetTimeout("setImmediate", 0, fn) }

func tnSetTimeout(kind string, ms float64, fn func()) *TnTimeout {
	t := &TnTimeout{ms: ms, fn: TnAsyncWrap(fn), active: true}
	if tnMockTimerHook != nil && tnMockTimerHook(kind, ms, func() bool {
		if t.active {
			t.active = false
			t.fn()
		}
		return false
	}) {
		return t
	}
	__tnTimers.Add(1)
	t.refd = true
	t.arm()
	return t
}

func (t *TnTimeout) arm() {
	__tnTimerSeq++
	t.seq = __tnTimerSeq
	d := time.Duration(t.ms * float64(time.Millisecond))
	t.due = time.Now().Add(d)
	__tnPendingTimers[t] = struct{}{}
	t.timer = time.AfterFunc(d, func() { TnLoopPost(tnRunDueTimers) })
}

func (t *TnTimeout) ref() *TnTimeout {
	if !t.refd && t.active {
		t.refd = true
		__tnTimers.Add(1)
	}
	return t
}

func (t *TnTimeout) unref() *TnTimeout {
	if t.refd {
		t.refd = false
		__tnTimers.Done()
	}
	return t
}

func (t *TnTimeout) hasRef() bool { return t.refd }

// refresh(): restarts the countdown (a fired timeout runs again)
func (t *TnTimeout) refresh() *TnTimeout {
	if t.timer == nil && t.active && !t.refd {
		// A mocked timer: node:test's clock owns it
		return t
	}
	if t.timer != nil {
		t.timer.Stop()
	}
	if !t.active {
		t.active = true
		if !t.refd {
			t.refd = true
			__tnTimers.Add(1)
		}
	}
	t.arm()
	return t
}

func (t *TnTimeout) close() *TnTimeout {
	TnClearTimeout(t)
	return t
}

// setInterval: fn every ms until cleared (the process lives until then, unless unref'ed)
type TnInterval struct {
	stop    chan struct{}
	once    sync.Once
	stopped int32
	refd    bool
	ms      float64
	fn      func()
}

func TnSetInterval(ms float64, fn func()) *TnInterval {
	t := &TnInterval{stop: make(chan struct{}), ms: ms, fn: TnAsyncWrap(fn)}
	if tnMockTimerHook != nil && tnMockTimerHook("setInterval", ms, func() bool {
		if atomic.LoadInt32(&t.stopped) != 0 {
			return false
		}
		t.fn()
		return atomic.LoadInt32(&t.stopped) == 0
	}) {
		return t
	}
	__tnTimers.Add(1)
	t.refd = true
	t.start(t.stop)
	return t
}

func (t *TnInterval) start(stop chan struct{}) {
	go func() {
		ticker := time.NewTicker(max(time.Duration(t.ms*float64(time.Millisecond)), time.Millisecond))
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				TnLoopPost(func() {
					if atomic.LoadInt32(&t.stopped) == 0 {
						t.fn()
					}
				})
			}
		}
	}()
}

func TnClearInterval(t *TnInterval) {
	if t != nil {
		t.once.Do(func() {
			atomic.StoreInt32(&t.stopped, 1)
			close(t.stop)
			if t.refd {
				t.refd = false
				__tnTimers.Done()
			}
		})
	}
}

func (t *TnInterval) ref() *TnInterval {
	if !t.refd && atomic.LoadInt32(&t.stopped) == 0 {
		t.refd = true
		__tnTimers.Add(1)
	}
	return t
}

func (t *TnInterval) unref() *TnInterval {
	if t.refd {
		t.refd = false
		__tnTimers.Done()
	}
	return t
}

func (t *TnInterval) hasRef() bool { return t.refd }

func (t *TnInterval) refresh() *TnInterval {
	if atomic.LoadInt32(&t.stopped) == 0 {
		close(t.stop)
		t.stop = make(chan struct{})
		t.start(t.stop)
	}
	return t
}

func (t *TnInterval) close() *TnInterval {
	TnClearInterval(t)
	return t
}

func TnClearTimeout(t *TnTimeout) {
	if t != nil && t.active {
		t.active = false
		delete(__tnPendingTimers, t)
		if t.timer != nil {
			t.timer.Stop()
		}
		if t.refd {
			t.refd = false
			__tnTimers.Done()
		}
	}
}`,
  clock: `// The current time; node:test mock timers can replace it (Date.now / new Date())
var tnClockHook func() time.Time

func TnTimeNow() time.Time {
	if tnClockHook != nil {
		return tnClockHook()
	}
	return time.Now()
}`,
  eventLoop: `// The event loop. JS runs one thing at a time: whoever holds the
// baton (main, a loop task, a running async function body) runs JS code; the
// others wait. An await runs pending loop tasks, then hands the baton over
// while it waits. Callbacks from timers, I/O and other goroutines are posted
// as tasks. Refs (pending timers, async work, open handles) keep it alive.
var tnLoopMu sync.Mutex
var tnLoopTasks []func()
var tnLoopSignal = make(chan struct{}, 1)
var tnLoopRefs int64

// The baton: free when it sits in the channel (main holds it at start).
// A call of an async function lends it to the body until its first await.
var tnBaton = make(chan struct{}, 1)
var tnLendStack []chan struct{}

// Async context (AsyncLocalStorage): the baton holder's current stores. Callbacks
// scheduled by JS code capture it (TnAsyncWrap) and run with it restored; an await
// resumes with the context it started with. Other loop tasks run without stores.
type TnAsyncContext map[interface{}]interface{}

var tnAsyncCtx TnAsyncContext

func TnAsyncSnapshot() TnAsyncContext { return tnAsyncCtx }

// Runs fn with ctx as the current context, restoring the previous one afterwards
func TnAsyncRun(ctx TnAsyncContext, fn func()) {
	saved := tnAsyncCtx
	tnAsyncCtx = ctx
	defer func() { tnAsyncCtx = saved }()
	fn()
}

// fn bound to the current context (no-op when there is none to keep)
func TnAsyncWrap(fn func()) func() {
	ctx := tnAsyncCtx
	if ctx == nil {
		return fn
	}
	return func() { TnAsyncRun(ctx, fn) }
}

func tnAcquire() { <-tnBaton }

func tnRelease() {
	if n := len(tnLendStack); n > 0 {
		lender := tnLendStack[n-1]
		tnLendStack = tnLendStack[:n-1]
		close(lender)
		return
	}
	tnBaton <- struct{}{}
}

// Runs an async function body: synchronously until its first await (or the
// end), then the caller continues while the body waits
func TnStartAsync(body func()) {
	yielded := make(chan struct{})
	tnLendStack = append(tnLendStack, yielded)
	ctx := tnAsyncCtx
	go func() {
		defer tnRelease()
		tnAsyncCtx = ctx
		body()
	}()
	<-yielded
	tnAsyncCtx = ctx
}

func tnLoopNotify() {
	select {
	case tnLoopSignal <- struct{}{}:
	default:
	}
}

func TnLoopRef() { atomic.AddInt64(&tnLoopRefs, 1) }

func TnLoopUnref() {
	atomic.AddInt64(&tnLoopRefs, -1)
	tnLoopNotify()
}

func TnLoopPost(fn func()) {
	tnLoopMu.Lock()
	tnLoopTasks = append(tnLoopTasks, fn)
	tnLoopMu.Unlock()
	tnLoopNotify()
}

// (a goroutine that never holds the baton: a server's request goroutine) Posts
// fn and, when no JS is running, takes the baton and runs the queue right here
// instead of waking the loop goroutine: one thread hand-off less per callback.
// A throw still ends the process (net/http would swallow a handler panic).
func tnLoopRunOrPost(fn func()) {
	select {
	case <-tnBaton:
	default:
		TnLoopPost(fn)
		return
	}
	tnLoopMu.Lock()
	tnLoopTasks = append(tnLoopTasks, fn)
	tnLoopMu.Unlock()
	defer func() {
		if r := recover(); r != nil {
			go func() { panic(r) }()
			select {}
		}
	}()
	TnRunMicrotasks()
	TnLoopRunPending()
	tnRelease()
}

// Runs a callback on the loop from a goroutine that does not hold the baton,
// and waits for it
func TnLoopCall(fn func()) {
	done := make(chan struct{})
	TnLoopPost(func() {
		defer close(done)
		fn()
	})
	<-done
}

// (baton holder) Runs the queued tasks, each followed by its microtasks
func TnLoopRunPending() bool {
	ran := false
	for {
		tnLoopMu.Lock()
		if len(tnLoopTasks) == 0 {
			tnLoopMu.Unlock()
			return ran
		}
		fn := tnLoopTasks[0]
		tnLoopTasks = tnLoopTasks[1:]
		tnLoopMu.Unlock()
		ran = true
		tnRunTask(fn)
		TnRunMicrotasks()
	}
}

// Set by process.on('uncaughtException'): handles a throw escaping a loop task
// (true when handled); 'beforeExit' runs when the loop drains (true when it emitted)
var tnUncaughtHook func(err interface{}) bool
var tnBeforeExitHook func() bool

func tnRunTask(fn func()) {
	if tnUncaughtHook != nil {
		defer func() {
			if r := recover(); r != nil {
				if !tnUncaughtHook(r) {
					panic(r)
				}
			}
		}()
	}
	TnAsyncRun(nil, fn)
}

func tnLoopIdle() bool {
	tnLoopMu.Lock()
	defer tnLoopMu.Unlock()
	tnMicrotasksMu.Lock()
	defer tnMicrotasksMu.Unlock()
	return len(tnLoopTasks) == 0 && len(tnMicrotasks) == 0 && atomic.LoadInt64(&tnLoopRefs) <= 0
}

// (loop goroutine, waiting) Tasks or microtasks are queued, or nothing keeps
// the loop alive any more (time to check for the exit)
func tnLoopWanted() bool {
	tnLoopMu.Lock()
	defer tnLoopMu.Unlock()
	tnMicrotasksMu.Lock()
	defer tnMicrotasksMu.Unlock()
	return len(tnLoopTasks) > 0 || len(tnMicrotasks) > 0 || atomic.LoadInt64(&tnLoopRefs) <= 0
}

// The end of main: run until nothing is pending
func TnRunLoop() {
	var idle *time.Timer
	for {
		TnRunMicrotasks()
		TnLoopRunPending()
		if tnLoopIdle() {
			if tnBeforeExitHook == nil || !tnBeforeExitHook() {
				return
			}
			TnRunMicrotasks()
			TnLoopRunPending()
			if tnLoopIdle() {
				return
			}
			continue
		}
		tnRelease()
		for {
			// One timer reused across waits (time.After would allocate one per wake)
			if idle == nil {
				idle = time.NewTimer(10 * time.Millisecond)
			} else {
				idle.Reset(10 * time.Millisecond)
			}
			select {
			case <-tnLoopSignal:
				idle.Stop()
			case <-idle.C:
			}
			// Work a server goroutine already ran in place (tnLoopRunOrPost) needs
			// no baton here; taking it anyway would push those goroutines back to
			// posting
			if tnLoopWanted() {
				break
			}
		}
		tnAcquire()
	}
}

// Parked awaits, keyed by promise channel. A promise resolution (TnAsyncSend /
// TnAsyncClose) delivers under tnWakeMu and queues an ordered wakeup instead of
// waking the awaiter directly: continuations must resume in the order their
// promises settled, like Node's microtasks — awaiters racing for the baton
// would resume out of order on a starved machine.
var tnWakeMu sync.Mutex
var tnAwaiting = map[any]chan struct{}{}

// (baton holder) hands the baton to a parked awaiter and waits for it to park
// again (or finish): JS keeps running one thing at a time
func tnDeliver(tok chan struct{}) {
	back := make(chan struct{})
	tnLendStack = append(tnLendStack, back)
	close(tok)
	<-back
}

// Queues the ordered wakeup of a parked awaiter (nil tok: nobody parked)
func tnWakeQueue(tok chan struct{}) {
	if tok == nil {
		return
	}
	tnMicrotasksMu.Lock()
	tnMicrotasks = append(tnMicrotasks, func() { tnDeliver(tok) })
	tnMicrotasksMu.Unlock()
	tnLoopNotify()
}

// (baton holder) Receives from a channel, running loop tasks while waiting;
// once nothing is left it parks. A promise wake resumes in settlement order
// with the baton handed over; a raw send (a generator yield) resumes the old
// way, racing for the baton
func TnLoopReceive[T any](ch chan T) (T, bool) {
	ctx := tnAsyncCtx
	defer func() { tnAsyncCtx = ctx }()
	for {
		select {
		case v, ok := <-ch:
			return v, ok
		default:
		}
		TnRunMicrotasks()
		if TnLoopRunPending() {
			continue
		}
		tok := make(chan struct{})
		tnWakeMu.Lock()
		select {
		case v, ok := <-ch:
			tnWakeMu.Unlock()
			return v, ok
		default:
			tnAwaiting[any(ch)] = tok
		}
		tnWakeMu.Unlock()
		tnRelease()
		select {
		case v, ok := <-ch:
			// The value is taken; when a promise wake was queued (the token
			// is gone) it hands the baton over, else take the baton ourselves
			tnWakeMu.Lock()
			_, raw := tnAwaiting[any(ch)]
			if raw {
				delete(tnAwaiting, any(ch))
			}
			tnWakeMu.Unlock()
			if raw {
				tnAcquire()
			} else {
				<-tok
			}
			return v, ok
		case <-tok:
		}
	}
}

// (baton holder, possibly the loop goroutine itself) Receives from a promise
// or a channel of raw sends (generator yields), running loop tasks while
// waiting. Parks like TnLoopReceive, so promise continuations resume in
// settlement order, while a stand-in goroutine drains the loop (this one may be
// the goroutine that would)
func tnRawReceive[T any](ch chan T) (T, bool) {
	ctx := tnAsyncCtx
	defer func() { tnAsyncCtx = ctx }()
	for {
		select {
		case v, ok := <-ch:
			return v, ok
		default:
		}
		TnRunMicrotasks()
		if TnLoopRunPending() {
			continue
		}
		tok := make(chan struct{})
		tnWakeMu.Lock()
		select {
		case v, ok := <-ch:
			tnWakeMu.Unlock()
			return v, ok
		default:
			tnAwaiting[any(ch)] = tok
		}
		tnWakeMu.Unlock()
		stop := make(chan struct{})
		go tnLoopStandIn(stop)
		tnRelease()
		select {
		case v, ok := <-ch:
			// A raw send leaves the token registered: take the baton ourselves;
			// a promise wake was queued: wait for its hand-over (the stand-in
			// keeps draining until then — it may be what delivers it)
			tnWakeMu.Lock()
			_, raw := tnAwaiting[any(ch)]
			if raw {
				delete(tnAwaiting, any(ch))
			}
			tnWakeMu.Unlock()
			if raw {
				close(stop)
				tnAcquire()
			} else {
				<-tok
				close(stop)
			}
			return v, ok
		case <-tok:
			close(stop)
		}
	}
}

// Drains the loop for a parked inline await until stop closes: the awaiter is
// handed the baton by a delivery like any parked await
func tnLoopStandIn(stop chan struct{}) {
	for {
		select {
		case <-stop:
			return
		case <-tnLoopSignal:
		}
		select {
		case <-stop:
			// Pass on the wake this goroutine took
			tnLoopNotify()
			return
		case <-tnBaton:
		}
		TnRunMicrotasks()
		TnLoopRunPending()
		tnRelease()
	}
}

// A wait group that keeps the loop alive (detached async calls, .then callbacks)
type tnLoopGroup struct{}

func (tnLoopGroup) Add(n int) { atomic.AddInt64(&tnLoopRefs, int64(n)) }
func (tnLoopGroup) Done()     { TnLoopUnref() }
func (tnLoopGroup) Wait()     { TnRunLoop() }

// queueMicrotask: run after the current synchronous code (end of main or of a loop task)
var tnMicrotasks []func()
var tnMicrotasksMu sync.Mutex

func TnQueueMicrotask(fn func()) {
	fn = TnAsyncWrap(fn)
	tnMicrotasksMu.Lock()
	tnMicrotasks = append(tnMicrotasks, fn)
	tnMicrotasksMu.Unlock()
}

func TnRunMicrotasks() {
	for {
		tnMicrotasksMu.Lock()
		if len(tnMicrotasks) == 0 {
			tnMicrotasksMu.Unlock()
			return
		}
		fn := tnMicrotasks[0]
		tnMicrotasks = tnMicrotasks[1:]
		tnMicrotasksMu.Unlock()
		TnAsyncRun(nil, fn)
	}
}`,
  uri: `// encodeURIComponent: escapes everything except A-Z a-z 0-9 - _ . ! ~ * ' ( )
func TnEncodeURIComponent(s string) string {
	var b strings.Builder
	for _, c := range []byte(s) {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || strings.IndexByte("-_.!~*'()", c) >= 0 {
			b.WriteByte(c)
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

func TnDecodeURIComponent(s string) string {
	decoded, err := tnurl.PathUnescape(s)
	if err != nil {
		panic(err)
	}
	return decoded
}`,
  objectIntegrity: `// Object.freeze / seal / preventExtensions levels, by object identity
var tnIntegrity sync.Map

func tnIdentity(v interface{}) (uintptr, bool) {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Pointer, reflect.Map, reflect.Slice, reflect.Func, reflect.Chan:
		return rv.Pointer(), true
	}
	return 0, false
}

func TnSetIntegrity[T any](v T, level int) T {
	if id, ok := tnIdentity(v); ok {
		if prev, had := tnIntegrity.Load(id); !had || prev.(int) < level {
			tnIntegrity.Store(id, level)
		}
	}
	return v
}

// Primitives are always frozen
func TnHasIntegrity(v interface{}, level int) bool {
	id, ok := tnIdentity(v)
	if !ok {
		return true
	}
	l, had := tnIntegrity.Load(id)
	return had && l.(int) >= level
}`,
  structuredClone: `// structuredClone: a deep copy (pointers, structs, slices, maps)
func TnStructuredClone[T any](v T) T {
	return tnCloneValue(reflect.ValueOf(&v).Elem()).Interface().(T)
}

func tnCloneValue(v reflect.Value) reflect.Value {
	switch v.Kind() {
	case reflect.Pointer:
		if v.IsNil() {
			return v
		}
		c := reflect.New(v.Elem().Type())
		c.Elem().Set(tnCloneValue(v.Elem()))
		return c
	case reflect.Struct:
		if !v.CanAddr() {
			tmp := reflect.New(v.Type()).Elem()
			tmp.Set(v)
			v = tmp
		}
		c := reflect.New(v.Type()).Elem()
		for i := 0; i < v.NumField(); i++ {
			// unexported fields are read and written through their addresses
			src := reflect.NewAt(v.Field(i).Type(), unsafe.Pointer(v.Field(i).UnsafeAddr())).Elem()
			dst := reflect.NewAt(c.Field(i).Type(), unsafe.Pointer(c.Field(i).UnsafeAddr())).Elem()
			dst.Set(tnCloneValue(src))
		}
		return c
	case reflect.Slice:
		if v.IsNil() {
			return v
		}
		c := reflect.MakeSlice(v.Type(), v.Len(), v.Len())
		for i := 0; i < v.Len(); i++ {
			c.Index(i).Set(tnCloneValue(v.Index(i)))
		}
		return c
	case reflect.Map:
		if v.IsNil() {
			return v
		}
		c := reflect.MakeMapWithSize(v.Type(), v.Len())
		iter := v.MapRange()
		for iter.Next() {
			c.SetMapIndex(iter.Key(), tnCloneValue(iter.Value()))
		}
		return c
	case reflect.Interface:
		if v.IsNil() {
			return v
		}
		c := reflect.New(v.Type()).Elem()
		c.Set(tnCloneValue(v.Elem()))
		return c
	}
	return v
}`,
  globalThis: `// (globalThis as any).x: properties set on the global object at runtime
var TnGlobalThis = map[string]interface{}{}`,
  jsx: `// JSX renders to HTML: TnJsxNode is markup, plain strings are escaped text
type TnJsxNode string

type TnJsxAttr struct {
	name  string
	value interface{}
}

var tnJsxVoidTags = map[string]bool{"area": true, "base": true, "br": true, "col": true, "embed": true, "hr": true, "img": true, "input": true, "link": true, "meta": true, "source": true, "track": true, "wbr": true}

func TnJsxElement(tag string, attrs []TnJsxAttr, children []interface{}) TnJsxNode {
	var b strings.Builder
	b.WriteString("<" + tag)
	for _, a := range attrs {
		name := a.name
		switch name {
		case "key", "ref":
			continue
		case "className":
			name = "class"
		case "htmlFor":
			name = "for"
		}
		if a.value == nil {
			continue
		}
		if v, ok := a.value.(bool); ok {
			if v {
				b.WriteString(" " + name)
			}
			continue
		}
		if reflect.ValueOf(a.value).Kind() == reflect.Func {
			continue
		}
		b.WriteString(" " + name + "=\\"" + html.EscapeString(tnJsxString(a.value)) + "\\"")
	}
	if tnJsxVoidTags[tag] {
		b.WriteString("/>")
		return TnJsxNode(b.String())
	}
	b.WriteString(">")
	b.WriteString(string(TnJsxChildren(children)))
	b.WriteString("</" + tag + ">")
	return TnJsxNode(b.String())
}

func TnJsxChildren(children []interface{}) TnJsxNode {
	var b strings.Builder
	for _, c := range children {
		tnJsxWriteChild(&b, c)
	}
	return TnJsxNode(b.String())
}

// null / booleans render nothing; arrays render each item
func tnJsxWriteChild(b *strings.Builder, c interface{}) {
	switch v := c.(type) {
	case nil, bool:
		return
	case TnJsxNode:
		b.WriteString(string(v))
		return
	case string:
		b.WriteString(html.EscapeString(v))
		return
	}
	rv := reflect.ValueOf(c)
	switch rv.Kind() {
	case reflect.Slice:
		for i := 0; i < rv.Len(); i++ {
			tnJsxWriteChild(b, rv.Index(i).Interface())
		}
		return
	case reflect.Pointer:
		if !rv.IsNil() {
			tnJsxWriteChild(b, rv.Elem().Interface())
		}
		return
	}
	b.WriteString(html.EscapeString(tnJsxString(c)))
}

func tnJsxString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case TnJsxNode:
		return string(t)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	}
	return fmt.Sprint(v)
}`,
  decorators: `// this inside plain functions: the receiver of the decorated method being called
var TnThis interface{}

// The context a decorator receives (kind is "method" or "class")
type TnDecoratorContext struct {
	kind    string
	name    string
	static  bool
	private bool
}

// A method decorator's result replaces the method; undefined keeps it
func TnDecorate(prev func(...interface{}) interface{}, result interface{}) func(...interface{}) interface{} {
	if result == nil {
		return prev
	}
	if f, ok := result.(func(...interface{}) interface{}); ok && f != nil {
		return f
	}
	return prev
}

// Class decorators may not replace a class (a Go type)
func TnDecorateClass(result interface{}) {
	if result != nil {
		panic("class decorators cannot replace the class")
	}
}`,
  promise: `// Promises are channels; a rejected promise is a closed channel with a reason
var tnRejections sync.Map

// A throw inside a Promise executor rejects the promise
func TnRejectExecutor[T any](ch chan T) {
	if r := recover(); r != nil {
		if _, rejected := tnRejections.Load(ch); !rejected && len(ch) == 0 {
			TnReject(ch, r)
		}
	}
}

// Promise resolution: the value (or rejection) is sent and the parked awaiter
// woken in settlement order — Node runs promise continuations as ordered
// microtasks; a bare channel wake would race for the baton and resume out of
// order on a starved machine
func TnAsyncSend[T any](ch chan T, v T) {
	tok := make(chan struct{})
	handoff := false
	tnWakeMu.Lock()
	select {
	case ch <- v:
	default:
	}
	if t, parked := tnAwaiting[any(ch)]; parked {
		delete(tnAwaiting, any(ch))
		tok = t
		handoff = true
	}
	tnWakeMu.Unlock()
	if handoff {
		tnWakeQueue(tok)
	}
}

func TnAsyncClose[T any](ch chan T) {
	tok := make(chan struct{})
	handoff := false
	tnWakeMu.Lock()
	close(ch)
	if t, parked := tnAwaiting[any(ch)]; parked {
		delete(tnAwaiting, any(ch))
		tok = t
		handoff = true
	}
	tnWakeMu.Unlock()
	if handoff {
		tnWakeQueue(tok)
	}
}

func TnResolveZero[T any](ch chan T) {
	var zero T
	TnAsyncSend(ch, zero)
}

// resolve / reject of a Promise executor used as values
func TnResolver[T any](ch chan T) func(...interface{}) {
	return func(args ...interface{}) {
		var v T
		if len(args) > 0 {
			if x, ok := args[0].(T); ok {
				v = x
			}
		}
		TnAsyncSend(ch, v)
	}
}

func TnRejecter[T any](ch chan T) func(...interface{}) {
	return func(args ...interface{}) {
		var reason interface{}
		if len(args) > 0 {
			reason = args[0]
		}
		if _, rejected := tnRejections.Load(ch); rejected || len(ch) > 0 {
			return
		}
		TnReject(ch, reason)
	}
}

func TnReject[T any](ch chan T, reason interface{}) {
	tnRejections.Store(ch, reason)
	TnAsyncClose(ch)
}

// A detached call (\`main();\`): the process waits for it; a rejection is fatal
// unless process.on('unhandledRejection') takes it
var tnUnhandledHook func(reason interface{}) bool

func TnDetach[T any](ch chan T) {
	go func() {
		defer __tnWaitGroup.Done()
		_, reason, rejected := tnSettle(ch)
		if rejected {
			TnLoopCall(func() {
				if tnUnhandledHook != nil && tnUnhandledHook(reason) {
					return
				}
				panic(reason)
			})
		}
	}()
}

// Deferred in async functions: a throw rejects the function's promise
func TnRejectOnPanic[T any](ch chan T) {
	if r := recover(); r != nil {
		tnRejections.Store(ch, r)
	}
}

func tnSettled[T any](ch chan T, v T, ok bool) (T, interface{}, bool) {
	if !ok {
		if reason, rejected := tnRejections.Load(ch); rejected {
			return v, reason, true
		}
	}
	return v, nil, false
}

// Waits for a promise (helper goroutines, without the baton): its value, or its rejection reason
func tnSettle[T any](ch chan T) (T, interface{}, bool) {
	v, ok := <-ch
	return tnSettled(ch, v, ok)
}

// await (baton holder): the value, or the rejection rethrown; loop tasks run meanwhile
func TnAwait[T any](ch chan T) T {
	received, ok := TnLoopReceive(ch)
	v, reason, rejected := tnSettled(ch, received, ok)
	if rejected {
		panic(reason)
	}
	return v
}

// await v on a value that may be a promise: its result, else v itself
func TnAwaitValue(v interface{}, inline bool) interface{} {
	if ch, ok := v.(chan interface{}); ok {
		if inline {
			return TnAwaitInline(ch)
		}
		return TnAwait(ch)
	}
	if rv := reflect.ValueOf(v); rv.Kind() == reflect.Chan {
		received, _ := rv.Recv()
		return received.Interface()
	}
	return v
}

// await in code running inline on the loop goroutine (an async callback — an
// arrow, an event handler): the self-draining receive — this goroutine is the
// loop, so it must keep running tasks while it waits
func TnAwaitInline[T any](ch chan T) T {
	received, ok := tnRawReceive(ch)
	v, reason, rejected := tnSettled(ch, received, ok)
	if rejected {
		panic(reason)
	}
	return v
}

func TnPromiseReject[T any](reason interface{}) chan T {
	ch := make(chan T)
	TnReject(ch, reason)
	return ch
}

func TnPromiseCatch[T any, E any](p chan T, onRejected func(E)) chan T {
	out := make(chan T, 1)
	ctx := TnAsyncSnapshot()
	go func() {
		v, reason, rejected := tnSettle(p)
		if rejected {
			e, _ := reason.(E)
			TnLoopCall(func() { TnAsyncRun(ctx, func() { onRejected(e) }) })
		}
		TnAsyncSend(out, v)
		TnAsyncClose(out)
	}()
	return out
}

func TnPromiseCatchValue[T any, E any](p chan T, onRejected func(E) T) chan T {
	out := make(chan T, 1)
	ctx := TnAsyncSnapshot()
	go func() {
		v, reason, rejected := tnSettle(p)
		if rejected {
			e, _ := reason.(E)
			TnLoopCall(func() { TnAsyncRun(ctx, func() { v = onRejected(e) }) })
		}
		TnAsyncSend(out, v)
		TnAsyncClose(out)
	}()
	return out
}

func TnPromiseFinally[T any](p chan T, onFinally func()) chan T {
	out := make(chan T, 1)
	onFinally = TnAsyncWrap(onFinally)
	go func() {
		v, reason, rejected := tnSettle(p)
		TnLoopCall(onFinally)
		if rejected {
			TnReject(out, reason)
			return
		}
		TnAsyncSend(out, v)
		TnAsyncClose(out)
	}()
	return out
}

// Promise.race: the first promise to settle, fulfilled or rejected
func TnPromiseRace[T any](chs []chan T) chan T {
	out := make(chan T, 1)
	var once sync.Once
	for _, ch := range chs {
		go func(ch chan T) {
			v, reason, rejected := tnSettle(ch)
			once.Do(func() {
				if rejected {
					TnReject(out, reason)
					return
				}
				TnAsyncSend(out, v)
				TnAsyncClose(out)
			})
		}(ch)
	}
	return out
}

type TnSettled[T any] struct {
	status string
	value  T
	reason interface{}
}

func TnPromiseAllSettled[T any](chs []chan T) chan []*TnSettled[T] {
	out := make(chan []*TnSettled[T], 1)
	go func() {
		results := make([]*TnSettled[T], len(chs))
		for i, ch := range chs {
			v, reason, rejected := tnSettle(ch)
			if rejected {
				results[i] = &TnSettled[T]{status: "rejected", reason: reason}
			} else {
				results[i] = &TnSettled[T]{status: "fulfilled", value: v}
			}
		}
		TnAsyncSend(out, results)
		TnAsyncClose(out)
	}()
	return out
}

// Promise.any: the first promise to fulfil; rejected when all of them reject
func TnPromiseAny[T any](chs []chan T) chan T {
	out := make(chan T, 1)
	go func() {
		values := make(chan T, len(chs))
		failures := make(chan interface{}, len(chs))
		for _, ch := range chs {
			go func(ch chan T) {
				v, reason, rejected := tnSettle(ch)
				if rejected {
					failures <- reason
				} else {
					values <- v
				}
			}(ch)
		}
		for range chs {
			select {
			case v := <-values:
				TnAsyncSend(out, v)
				TnAsyncClose(out)
				return
			case <-failures:
			}
		}
		TnReject(out, TnNewError("All promises were rejected"))
	}()
	return out
}`,
  promiseAll: `// Promise.all: every channel drained in order, results collected
func TnPromiseAll[T any](chs []chan T) chan []T {
	out := make(chan []T, 1)
	go func() {
		results := make([]T, len(chs))
		for i, ch := range chs {
			v, reason, rejected := tnSettle(ch)
			if rejected {
				TnReject(out, reason)
				return
			}
			results[i] = v
		}
		TnAsyncSend(out, results)
		TnAsyncClose(out)
	}()
	return out
}`,
  getenv: `func TnGetenv(name string) string {
	return os.Getenv(name)
}`,
};

// Returns the Go source for all helpers used in this transpilation, or '' if none.
// Emitted only into the main output file: every generated file shares `package main`,
// so helpers are visible across files and must not be duplicated.
function emitGoHelpers(): string {
  const sources = [...usedHelpers]
    .sort()
    .map((id) => goHelpers[id] ?? nodeRegistry.goHelpers[id])
    .filter(Boolean);
  if (usedHelpers.has('nodeUtil')) {
    const names = [...classNames].sort().map((name) => `${toGoStringLiteral(getSafeName(name))}: true`);
    sources.push(`// Classes util.inspect prints as \`Name { … }\`\nvar tnInspectClassNames = map[string]bool{${names.join(', ')}}`);
  }
  return sources.join('\n\n');
}

/// Local names bound by Node.js imports → registry keys ('join' → 'path.join',
// 'fs' → 'fs', 'fsp' → 'fs/promises', 'EventEmitter' → 'events.EventEmitter')
const nodeLocalNames = new Map<string, string>();

// The registry name of a Node module specifier ('node:fs', 'fs', 'node:sys' → 'util'),
// or '' when it is not a (supported) builtin
function nodeModuleName(spec: string): string {
  const prefixed = spec.startsWith('node:');
  let name = prefixed ? spec.slice(5) : spec;
  if (nodeRegistry.aliases[name]) name = nodeRegistry.aliases[name];
  if (nodeRegistry.modules[name]) return name;
  return '';
}

// Binds the import's local names to registry keys
function setupNodeModuleImport(node: AstNode, nodeModule: string): void {
  const clause = node.importClause;
  if (!clause) return;
  const defaultKey = nodeRegistry.namespaces[`${nodeModule}.default`] || nodeModule;
  if (clause.name) nodeLocalNames.set(clause.name.text, defaultKey);
  const bindings = clause.namedBindings;
  if (!bindings) return;
  if (isNamespaceImport(bindings)) {
    nodeLocalNames.set(bindings.name.text, nodeModule);
    return;
  }
  for (const el of bindings.elements ?? []) {
    const importedName = el.propertyName?.text ?? el.name.text;
    if (importedName === 'default') {
      nodeLocalNames.set(el.name.text, defaultKey);
      continue;
    }
    const key = `${nodeModule}.${importedName}`;
    nodeLocalNames.set(el.name.text, nodeRegistry.namespaces[key] || key);
  }
}

// A Node global (Buffer, URL, process…) not shadowed by a user declaration
function nodeGlobalKey(name: string): string {
  const key = nodeRegistry.globals[name];
  if (!key || typeof key !== 'string') return '';
  if (variableGoTypes.has(name) || classNames.has(name) || declaredFunctions.has(name) || importAliases.has(name)) return '';
  return key;
}

// Registry key of a Node binding expression (`join`, `fs.promises.readFile`,
// `Buffer.from`, `(childProcess as any).spawnSync`), or '' when it is not one
function resolveNodeKey(expr: AstNode): string {
  if (!expr) return '';
  if (isIdentifier(expr)) {
    if (nodeLocalNames.has(expr.text)) return nodeLocalNames.get(expr.text) ?? '';
    return nodeGlobalKey(expr.text);
  }
  if (isParenthesizedExpression(expr) || isAsExpression(expr) || isNonNullExpression(expr)) {
    return resolveNodeKey(expr.expression);
  }
  // util.promisify(fs.readFile) → fs/promises.readFile
  if (isCallExpression(expr) && resolveNodeKey(expr.expression) === 'util.promisify') {
    return nodePromisifiedKey((expr.arguments ?? [])[0]);
  }
  if (isPropertyAccessExpression(expr) && !expr.questionDotToken) {
    const base = resolveNodeKey(expr.expression);
    if (!base) return '';
    const key = `${base}.${expr.name.text}`;
    return nodeRegistry.namespaces[key] || key;
  }
  return '';
}

// The promise variant of a Node function, '' when it has none
function nodePromisifiedKey(fnExpr: AstNode): string {
  let key = resolveNodeKey(fnExpr);
  if (!key && isIdentifier(fnExpr) && (fnExpr.text === 'setTimeout' || fnExpr.text === 'setImmediate')) {
    key = `timers.${fnExpr.text}`;
  }
  if (!key) return '';
  if (nodeRegistry.functions[`${key}.__promisify__`]) return `${key}.__promisify__`;
  const dot = key.lastIndexOf('.');
  const mod = key.slice(0, dot);
  const name = key.slice(dot + 1);
  const promisesKey = `${mod}/promises.${name}`;
  if (nodeRegistry.functions[promisesKey]) return promisesKey;
  return '';
}

// The Node class of a Go type ('*TnEventEmitter', '[]byte'), '' when none
function nodeClassKeyOfType(goType: string | undefined): string {
  if (!goType) return '';
  return nodeRegistry.classByGoType[goType] ?? '';
}

// A user class extending a Node class (class X extends Transform): the Node
// class key, for methods the user classes in the chain do not declare
function nodeAncestorClassKey(goType: string | undefined, methodName: string): string {
  if (!goType || !goType.startsWith('*')) return '';
  let name = goType.slice(1).replace(/\[.*\]$/, '');
  for (let depth = 0; depth < 20 && classParentNames.has(name); depth++) {
    if (declaredClassHasMethod(name, methodName)) return '';
    const parent = classParentNames.get(name) ?? '';
    if (nodeParentClassKeys.has(parent)) return nodeParentClassKeys.get(parent) ?? '';
    name = parent;
  }
  return '';
}

function declaredClassHasMethod(className: string, methodName: string): boolean {
  const decl = declaredClasses.get(className);
  for (const member of decl?.members ?? []) {
    if (member.name && isIdentifier(member.name) && member.name.text === methodName) return true;
  }
  return false;
}

// The Node class key a type name refers to (imported or global), '' when none
function nodeClassKeyOfName(name: string): string {
  const key = nodeLocalNames.has(name) ? (nodeLocalNames.get(name) ?? '') : nodeGlobalKey(name);
  return key && nodeRegistry.classes[key] ? key : '';
}

// new Error(message, { cause }): the options set error.cause
function withErrorOptions(errorExpr: string, options: AstNode | undefined): string {
  if (!options) return errorExpr;
  useHelper('dynamic');
  return `TnErrorWithOptions(${errorExpr}, ${visit(options)})`;
}

// A bridged Go type named in an annotation: `dwarf.Data`, or `Data` imported from 'go:debug/dwarf'
function goAnnotationOf(typeName: AstNode): string | undefined {
  if (typeName?.kind === 'QualifiedName' && isIdentifier(typeName.left)) {
    const path = goPathOf(typeName.left.text);
    return path ? goAnnotationType(path, typeName.right.text) : undefined;
  }
  if (!isIdentifier(typeName)) return undefined;
  const member = splitGoMember(goMemberOf(typeName.text));
  return member ? goAnnotationType(member.path, member.member) : undefined;
}

// The Node class key of a (qualified) type reference: `Stats`, `fs.Stats`, `NodeJS.ErrnoException`
function nodeClassKeyOfTypeName(typeName: AstNode): string {
  if (isIdentifier(typeName)) return nodeClassKeyOfName(typeName.text);
  if (typeName?.kind === 'QualifiedName') {
    const base = nodeQualifiedTypeBase(typeName.left);
    if (!base) return '';
    const key = `${base}.${typeName.right.text}`;
    return nodeRegistry.classes[key] ? key : '';
  }
  return '';
}

function nodeQualifiedTypeBase(left: AstNode): string {
  if (isIdentifier(left)) return nodeLocalNames.has(left.text) ? (nodeLocalNames.get(left.text) ?? '') : nodeGlobalKey(left.text);
  if (left?.kind === 'QualifiedName') {
    const base = nodeQualifiedTypeBase(left.left);
    return base ? `${base}.${left.right.text}` : '';
  }
  return '';
}

// Option-object methods of Node constructors: their parameters get Node's types
function applyNodeOptionTypes(key: string, options: AstNode): void {
  const typer = nodeRegistry.optionTypers[key];
  if (!typer || !isObjectLiteralExpression(options)) return;
  const types = typer(options);
  for (const prop of options.properties ?? []) {
    if (!prop.name || !isIdentifier(prop.name)) continue;
    const name: string = prop.name.text;
    if (!(name in types)) continue;
    if (prop.kind === 'MethodDeclaration') prop.tnParamTypes = types[name];
    else if (isPropertyAssignment(prop) && (isArrowFunction(prop.initializer) || isFunctionExpression(prop.initializer))) {
      prop.initializer.tnParamTypes = types[name];
    }
  }
}

// Applies the registry's callback parameter types to the callback argument
function applyNodeParamTypes(key: string, args: AstNode[]): void {
  const typer = nodeRegistry.paramTypers[key];
  if (!typer) return;
  for (let i = args.length - 1; i >= 0; i--) {
    if (isArrowFunction(args[i]) || isFunctionExpression(args[i])) {
      args[i].tnParamTypes = typer(args);
      return;
    }
  }
}

function makeNodeCall(node: AstNode, recv: string): NodeCall {
  const nodes: AstNode[] = node.arguments ?? [];
  const hasSpread = nodes.some((a) => isSpreadElement(a));
  const args = hasSpread ? visitSpreadCallArguments(node) : nodes.map((a) => visit(a));
  const types = nodes.map((a) => inferExpressionType(a) ?? '');
  return { args: args, nodes: nodes, types: types, recv: recv, site: node };
}

// Calls of Node APIs: imported functions, statics (Buffer.from) and methods of
// Node class instances
function visitNodeCall(node: AstNode): string | undefined {
  const callee = node.expression;
  const key = resolveNodeKey(callee);
  if (key) {
    const emit = nodeRegistry.functions[key];
    if (emit) {
      applyNodeParamTypes(key, node.arguments ?? []);
      return emit(makeNodeCall(node, ''));
    }
    // node:console re-exports the global console
    if (key.startsWith('console.') && callHandlers[key]) {
      const call = makeNodeCall(node, '');
      currentCallArgTypes = call.types.map((t) => t || undefined);
      const consoleCall: string = callHandlers[key](key, call.args, '');
      return consoleCall;
    }
    return undefined;
  }
  if (!isPropertyAccessExpression(callee) || callee.questionDotToken) return undefined;
  const receiverType = inferExpressionType(callee.expression);
  const classKey = nodeClassKeyOfType(receiverType) || nodeAncestorClassKey(receiverType, callee.name.text);
  if (!classKey) return undefined;
  const cls = nodeRegistry.classes[classKey];
  const methodKey = `${cls.key}#${callee.name.text}`;
  const emit = nodeRegistry.methods[methodKey];
  if (!emit && cls.category !== 'class') return undefined;
  applyNodeParamTypes(methodKey, node.arguments ?? []);
  const call = makeNodeCall(node, visit(callee.expression));
  if (emit) return emit(call);
  return `${call.recv}.${callee.name.text}(${call.args.join(', ')})`;
}

// Whether a registry key names a module or namespace object (path, fs/promises, process.stdout)
function isNodeNamespaceKey(key: string): boolean {
  return !!nodeRegistry.modules[key] || !!nodeRegistry.objects[key];
}

// `const win = path.win32` / `const { join, sep } = path` bind local names to
// registry keys instead of declaring Go variables
function visitNodeAliasDeclaration(node: AstNode): string | undefined {
  if (!node.initializer) return undefined;
  const key = resolveNodeKey(node.initializer);
  // const readFileAsync = promisify(fs.readFile): an alias of the promise variant
  if (key && isIdentifier(node.name) && isCallExpression(unwrapParentheses(node.initializer)) && nodeRegistry.functions[key]) {
    nodeLocalNames.set(node.name.text, key);
    return '';
  }
  if (!key || !isNodeNamespaceKey(key)) return undefined;
  if (isIdentifier(node.name)) {
    nodeLocalNames.set(node.name.text, key);
    return '';
  }
  if (isObjectBindingPattern(node.name)) {
    for (const el of node.name.elements ?? []) {
      if (el.dotDotDotToken || el.initializer || !isIdentifier(el.name)) return undefined;
    }
    for (const el of node.name.elements ?? []) {
      const member = (el.propertyName ?? el.name).text;
      const memberKey = `${key}.${member}`;
      nodeLocalNames.set(el.name.text, nodeRegistry.namespaces[memberKey] || memberKey);
    }
    return '';
  }
  return undefined;
}

// Reads of Node values (`path.sep`, `os.EOL`, an imported `sep`)
function visitNodeValue(expr: AstNode): string | undefined {
  const key = resolveNodeKey(expr);
  if (!key) return undefined;
  if (key === 'process.env' && (isPropertyAccessExpression(expr.parent) || isElementAccessExpression(expr.parent)) && expr.parent.expression === expr) {
    return undefined;
  }
  const emit = nodeRegistry.values[key];
  if (!emit) return undefined;
  const value: string = emit(emptyNodeCall());
  return value;
}

function emptyNodeCall(): NodeCall {
  return { args: [], nodes: [], types: [], recv: '' };
}

// Writes of Node values (`process.exitCode = 1`): registered as 'key='
function visitNodeAssignment(node: AstNode): string | undefined {
  if (node.operatorToken.kind !== 'EqualsToken') return undefined;
  // process.env.X = v / process.env[k] = v
  if ((isPropertyAccessExpression(node.left) || isElementAccessExpression(node.left)) && isProcessEnv(node.left.expression)) {
    importedPackages.add('os');
    const name = isPropertyAccessExpression(node.left) ? toGoStringLiteral(node.left.name.text) : visit(node.left.argumentExpression);
    return `os.Setenv(${name}, ${jsStringOf(visit(node.right), inferExpressionType(node.right))})`;
  }
  const key = resolveNodeKey(node.left);
  if (!key) return undefined;
  const emit = nodeRegistry.functions[`${key}=`];
  if (!emit) return undefined;
  const call: NodeCall = { args: [visit(node.right)], nodes: [node.right], types: [inferExpressionType(node.right) ?? ''], recv: '' };
  const assignment: string = emit(call);
  return assignment;
}

// Writes of Go struct fields convert to the field type: h.Size = 5 →
// h.Size = int64(5); h.Size += 1 → h.Size = int64(float64(h.Size) + 1)
function visitGoFieldAssignment(node: AstNode, op: string): string | undefined {
  if (!isPropertyAccessExpression(node.left)) return undefined;
  const recvType = inferExpressionType(node.left.expression);
  if (!recvType) return undefined;
  const field = goFieldType(recvType, node.left.name.text);
  if (!field) return undefined;
  const target = `${visit(node.left.expression)}.${node.left.name.text}`;
  ensureGoTypePackages(field);
  if (op === '=') {
    return `${target} = ${toGoType(visit(node.right), inferExpressionType(node.right) ?? '', field)}`;
  }
  if (['+=', '-=', '*=', '/='].includes(op) && isGoNumericKind(field)) {
    const value = `${fromGoType(target, field)} ${op[0]} (${visit(node.right)})`;
    return `${target} = ${toGoType(value, 'float64', field)}`;
  }
  return undefined;
}

// new X(…) of a Node class
function visitNodeNew(node: AstNode): string | undefined {
  const key = resolveNodeKey(node.expression);
  if (!key) return undefined;
  const emit = nodeRegistry.constructors[key];
  if (!emit) return undefined;
  applyNodeParamTypes(`${key}()`, node.arguments ?? []);
  applyNodeOptionTypes(key, (node.arguments ?? [])[0]);
  return emit(makeNodeCall(node, ''));
}

// The call a typer inspects: argument nodes and their Go types
function nodeTypeCall(nodes: AstNode[]): NodeCall {
  return { args: [], nodes, types: nodes.map((a) => inferExpressionType(a) ?? ''), recv: '' };
}

// Go types of Node API expressions; undefined when the expression is not one
// Property read on a Go package or Go value: consts, vars, fields.
function visitGoProperty(node: AstNode): string | undefined {
  const base = node.expression;
  // Package member: strings.ToUpper (as a value), math.Pi, os.Stdout.
  const path = isIdentifier(base) ? goPathOf(base.text) : undefined;
  if (path) {
    const info = goPackage(path);
    if (!info) return undefined;
    const member = node.name.text;
    const qualifier = goQualifier(path);
    if (info.funcs[member]) return `${qualifier}.${member}`;
    if (info.consts[member]) {
      const kind = info.consts[member].kind;
      // Untyped consts arrive as TS numbers; typed consts (time.Second)
      // keep their Go type so arithmetic stays well-typed.
      if (kind === 'typed') return `${qualifier}.${member}`;
      if (kind === 'string') return `${qualifier}.${member}`;
      if (kind === 'bool') return `${qualifier}.${member}`;
      return `float64(${qualifier}.${member})`;
    }
    if (info.vars[member]) {
      return `${qualifier}.${member}`;
    }
    if (info.types[member]) return `${qualifier}.${member}`;
    return undefined;
  }
  // Field on a Go-typed value.
  if (isCallee(node)) return undefined;
  const recvType = inferExpressionType(base);
  if (!recvType) return undefined;
  const field = isAssignmentTarget(node) ? undefined : goFieldType(recvType, node.name.text);
  if (field) {
    const recv = visit(base);
    return fromGoType(`${recv}.${node.name.text}`, field);
  }
  // GoRef<T>.value dereferences the pointer cell, read or written (structs
  // with a real `value` field take the branch above). Only when the receiver
  // is declared as GoRef<...> or initialized by ref<T>(), or points to a
  // basic type (flag.String's *string has no fields to read).
  if (node.name.text === 'value' && isAssignmentTarget(node) && goFieldType(recvType, 'value')) return undefined;
  if (node.name.text === 'value' && recvType.startsWith('*') && isIdentifier(base)) {
    const base2 = recvType.slice(1);
    const isBasic = base2 === 'string' || base2 === 'float64' || base2 === 'bool' || isGoBasicKind(base2);
    if (isBasic || goRefVariables.has(base.text)) {
      return `(*${visit(base)})`;
    }
    const typeNode = variableTypeNodes.get(base.text);
    if (
      typeNode &&
      isTypeReferenceNode(typeNode) &&
      isIdentifier(typeNode.typeName) &&
      typeNode.typeName.text === 'GoRef'
    ) {
      return `(*${visit(base)})`;
    }
  }
  return undefined;
}

// Channel method call: ch.send(v) → ch <- v, ch.recv() → <-ch,
// ch.close() → close(ch).
function visitGoChanCall(node: AstNode, recv: string): string | undefined {
  if (!isPropertyAccessExpression(node.expression)) return undefined;
  const method = node.expression.name.text;
  const args = node.arguments ?? [];
  if (method === 'send' && args.length === 1) {
    return `${recv} <- ${visit(args[0])}`;
  }
  if (method === 'recv' && args.length === 0) {
    return `<-${recv}`;
  }
  if (method === 'close' && args.length === 0) {
    return `close(${recv})`;
  }
  return undefined;
}

// Package + type of a `new pkg.T(...)` expression, null when none.
function goNewTarget(node: AstNode): { path: string; typeName: string; qualifier: string } | null {
  const ctor = node.expression;
  if (!ctor) return null;
  if (isIdentifier(ctor)) {
    const qualified = goMemberOf(ctor.text);
    if (!qualified) return null;
    const dot = qualified.indexOf('.');
    if (dot < 0) return null;
    const qualifier = qualified.slice(0, dot);
    const typeName = qualified.slice(dot + 1);
    for (const path of Object.keys(goStdlib)) {
      if (goQualifier(path) === qualifier && goPackage(path)?.types[typeName]) {
        return { path, typeName, qualifier };
      }
    }
    return null;
  }
  if (isPropertyAccessExpression(ctor) && isIdentifier(ctor.expression)) {
    const path = goPathOf(ctor.expression.text);
    if (!path) return null;
    const typeName = ctor.name.text;
    if (!goPackage(path)?.types[typeName]) return null;
    return { path, typeName, qualifier: goQualifier(path) };
  }
  return null;
}

function inferGoExpressionType(expr: AstNode): string | undefined {
  // ref<T>().value reads as the cell's element type.
  if (
    isPropertyAccessExpression(expr) &&
    expr.name.text === 'value' &&
    isIdentifier(expr.expression) &&
    goRefVariables.has(expr.expression.text)
  ) {
    const refType = variableGoTypes.get(expr.expression.text);
    if (refType && refType.startsWith('*')) return refType.slice(1);
  }
  if (isCallExpression(expr) || isIdentifier(expr) || isPropertyAccessExpression(expr)) {
    return inferGoType(expr);
  }
  if (isNewExpression(expr)) {
    const target = goNewTarget(expr);
    if (target) {
      const info = goPackage(target.path);
      const type = info?.types[target.typeName];
      if (type) {
        for (const m of type.methods) {
          if (m.ptr) return `*${target.path}.${target.typeName}`;
        }
        return `${target.path}.${target.typeName}`;
      }
    }
    return undefined;
  }
  return undefined;
}

function inferNodeExpressionType(expr: AstNode): string | undefined {
  if (isCallExpression(expr)) {
    const callee = expr.expression;
    const key = resolveNodeKey(callee);
    const nodes: AstNode[] = expr.arguments ?? [];
    if (key) {
      const typer = nodeRegistry.typers[key];
      if (typer) return typer(nodeTypeCall(nodes));
      if (key in nodeRegistry.results) return nodeRegistry.results[key];
      return undefined;
    }
    if (isPropertyAccessExpression(callee) && !callee.questionDotToken) {
      const receiverType = inferExpressionType(callee.expression);
      const classKey = nodeClassKeyOfType(receiverType) || nodeAncestorClassKey(receiverType, callee.name.text);
      if (!classKey) return undefined;
      const methodKey = `${nodeRegistry.classes[classKey].key}#${callee.name.text}`;
      const typer = nodeRegistry.typers[methodKey];
      if (typer) return typer(nodeTypeCall(nodes));
      if (methodKey in nodeRegistry.results) return nodeRegistry.results[methodKey];
      const cls = nodeRegistry.classes[classKey];
      const methodName: string = callee.name.text;
      if (methodName in cls.methods) return cls.methods[methodName];
    }
    return undefined;
  }
  if (isNewExpression(expr)) {
    const key = resolveNodeKey(expr.expression);
    if (key && nodeRegistry.constructors[key]) {
      const typer = nodeRegistry.typers[`${key}()`];
      const nodes: AstNode[] = expr.arguments ?? [];
      if (typer) return typer(nodeTypeCall(nodes));
      return nodeRegistry.classes[key]?.goType;
    }
    return undefined;
  }
  if (isIdentifier(expr) || isPropertyAccessExpression(expr)) {
    const key = resolveNodeKey(expr);
    if (key && key in nodeRegistry.valueTypes) return nodeRegistry.valueTypes[key];
    return undefined;
  }
  if (isElementAccessExpression(expr) && inferExpressionType(expr.expression) === '[]byte') return 'float64';
  return undefined;
}

// Node classes are pseudo-classes: their methods, fields and accessors feed the
// class tables, so dispatch and inference treat them like user classes
function seedNodeClassTables(): void {
  for (const key of Object.keys(nodeRegistry.classes)) {
    const cls = nodeRegistry.classes[key];
    if (!cls.goType.startsWith('*')) continue;
    const goName = cls.goType.slice(1);
    // Classes sharing a Go type (ErrnoException / AssertionError on *TnError) merge their tables
    const methods = classMethodReturnTypes.get(goName) ?? new Map<string, string>();
    for (const name of Object.keys(cls.methods)) methods.set(name, cls.methods[name]);
    classMethodReturnTypes.set(goName, methods);
    const props = classPropertyTypes.get(goName) ?? new Map<string, string>();
    for (const name of Object.keys(cls.props)) props.set(name, cls.props[name]);
    for (const name of Object.keys(cls.getters)) {
      props.set(name, cls.getters[name]);
      classGetterMethods.add(`${goName}.${name}`);
    }
    for (const name of Object.keys(cls.setters)) classSetterMethods.add(`${goName}.${name}`);
    classPropertyTypes.set(goName, props);
  }
}

function visitImportDeclaration(node: AstNode): string {
  if (!isStringLiteral(node.moduleSpecifier)) return '';
  const moduleSpec = node.moduleSpecifier.text;
  if (/\.json$/i.test(moduleSpec) && (moduleSpec.startsWith('.') || moduleSpec.startsWith('/'))) {
    return visitJsonImport(node, moduleSpec);
  }

  // Relative imports → transpile to a separate Go file
  if (moduleSpec.startsWith('.') || moduleSpec.startsWith('/')) {
    // Key combines current dir + specifier to avoid cross-package collisions
    const key = `${currentFileDir ?? ''}::${moduleSpec}`;
    if (fileResolver && !includedLocalImports.has(key)) {
      includedLocalImports.add(key);
      const resolved = fileResolver(moduleSpec, currentFileDir);
      // The same file reached through different specifiers (./registry.js from
      // a sibling, ./node/registry.js from the parent) is included once
      const stem = (moduleSpec.split('/').pop() ?? moduleSpec).replace(/\.(js|ts|tsx|mjs)$/, '');
      const fileKey = resolved ? `file::${resolved.dir}::${stem}` : '';
      if (resolved && !includedLocalImports.has(fileKey)) {
        includedLocalImports.add(fileKey);
        const goFileName = specifierToGoFileName(moduleSpec);
        const linked = node.linkedKey ? linkedModules.get(node.linkedKey) : undefined;
        includeLocalImport(resolved.content, resolved.dir, goFileName, !!resolved.tsx, resolved.path ?? moduleSpec, linked?.ast);
      }
    }
    // Renamed bindings refer to the original declaration (one Go package)
    const bindings = node.importClause?.namedBindings;
    if (bindings && isNamespaceImport(bindings)) defaultImportNamespaces.add(bindings.name.text);
    if (bindings && isNamedImports(bindings)) {
      for (const el of bindings.elements ?? []) {
        if (!el.propertyName) continue;
        importAliases.set(el.name.text, getSafeName(el.propertyName.text));
        const fn = declaredFunctions.get(el.propertyName.text);
        if (fn) declaredFunctions.set(el.name.text, fn);
      }
    }
    return '';
  }

  // Node.js standard library (`node:path`, or a bare builtin name like `fs`):
  // local names resolve against the registry; type-only imports bind types
  const nodeModule = nodeModuleName(moduleSpec);
  if (nodeModule) {
    setupNodeModuleImport(node, nodeModule);
    return '';
  }

  // Type-only imports contribute nothing to runtime
  if (node.importClause?.isTypeOnly) return '';

  if (moduleSpec.startsWith('node:')) {
    reportError(node, `Unsupported Node.js module: ${moduleSpec} (see conformance.md#node-builtins-node)`);
    return '';
  }

  // Go standard library: `import { Println } from 'go:fmt'` → import "fmt"
  if (moduleSpec.startsWith('go:')) {
    const goPkg = moduleSpec.slice(3);
    // go:builtin is virtual (ref/chan/GoError): no Go import, just aliases.
    if (goPkg === 'builtin') {
      registerGoBuiltinAliases(node);
      return '';
    }
    // Side-effect import (`import 'go:time/tzdata'`): blank Go import
    if (!node.importClause) {
      goSideEffectImports.add(goPkg);
      return '';
    }
    importedPackages.add(goPkg);
    registerGoPackageAliases(node, goPkg);
    return '';
  }

  // npm package (bare specifier) → transpile to its own Go file
  const npmKey = `npm::${moduleSpec}`;
  if (fileResolver && !includedLocalImports.has(npmKey)) {
    includedLocalImports.add(npmKey);
    const resolved = fileResolver(moduleSpec, currentFileDir);
    if (resolved) {
      const goFileName = specifierToGoFileName(moduleSpec);
      const linked = node.linkedKey ? linkedModules.get(node.linkedKey) : undefined;
      includeLocalImport(resolved.content, resolved.dir, goFileName, !!resolved.tsx, resolved.path ?? moduleSpec, linked?.ast);
    }
  }
  // Register default/namespace import name as a "stripped" namespace
  // e.g. `import ts from 'typescript'` → ts.createSourceFile → createSourceFile
  if (node.importClause) {
    const clause = node.importClause;
    if (clause.name) {
      defaultImportNamespaces.add(clause.name.text);
    } else if (clause.namedBindings && isNamespaceImport(clause.namedBindings)) {
      defaultImportNamespaces.add(clause.namedBindings.name.text);
    }
  }
  return '';
}

// Go packages imported under a fixed alias to avoid collisions with user
// variables (a variable named `big` would shadow the package name).
// Table lives in src/go/overrides.ts (shared with the bridge qualifier).
// Go bridge types are fully qualified internally (net/http.Cookie,
// *[]io/fs.DirEntry); emitted code spells them with the import qualifier.
// Rewrites path-qualified names outside string literals and comments, and
// imports their packages.
function localizeGoPaths(code: string): string {
  if (code.indexOf('/') < 0) return code;
  // String/rune literals and line comments match first and pass through
  return code.replace(
    /"(?:[^"\\\n]|\\.)*"|`[^`]*`|'(?:[^'\\\n]|\\.)*'|\/\/[^\n]*|\b([a-z][a-z0-9_]*(?:\/[a-z0-9_]+)+)\./g,
    (match: string, path: string) => {
      if (!path || !hasGoPackage(path)) return match;
      ensureGoQualifier(path);
      importedPackages.add(path);
      return `${goQualifier(path)}.`;
    }
  );
}

// Whether Go code uses `name.` as a package qualifier (not the tail of a
// longer identifier or selector: `ratio.` does not use `io`)
function referencesQualifier(code: string, name: string): boolean {
  const needle = `${name}.`;
  let at = code.indexOf(needle);
  while (at >= 0) {
    const prev = at > 0 ? code[at - 1] : ' ';
    if (!/[A-Za-z0-9_.]/.test(prev)) return true;
    at = code.indexOf(needle, at + 1);
  }
  return false;
}

function goImportLine(pkg: string): string {
  const alias = goPathAliases[pkg];
  return alias ? `import ${alias} "${pkg}"` : `import "${pkg}"`;
}

// Records the type of a variable introduced by a loop or binding
function registerLocalVariable(name: string, goType: string | undefined): void {
  if (!name || name === '_') return;
  variableTypes.delete(name);
  variableClassNames.delete(name);
  variableTypeNodes.delete(name);
  narrowedVariables.delete(name);
  // Loop and binding variables hold plain values in our lowering
  referenceArrays.delete(name);
  if (goType) variableGoTypes.set(name, goType);
  else variableGoTypes.delete(name);
}

// for...of over arrays and strings (a string yields one-character strings)
// Whether a Go type is an iter.Seq / Seq2 (range-over-func).
function isGoIterSeq(goType: string): boolean {
  const base = goType.replace(/^\*/, '');
  return base.startsWith('iter.Seq') || base.startsWith('import(\'go:iter\').Seq');
}

// Element type of an iter.Seq[V] (Seq2 yields its key type in for…of).
function goIterElem(goType: string): string {
  const start = goType.indexOf('[');
  const end = goType.lastIndexOf(']');
  if (start < 0 || end < 0) return 'interface{}';
  const inner = goType.slice(start + 1, end);
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '[' || inner[i] === '(') depth++;
    else if (inner[i] === ']' || inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) return inner.slice(0, i).trim() || 'interface{}';
  }
  return inner.trim() || 'interface{}';
}

// Type args of an iter.Seq[V] / Seq2[K, V].
function goIterElems(goType: string): string[] {
  const start = goType.indexOf('[');
  const end = goType.lastIndexOf(']');
  if (start < 0 || end < 0) return [];
  const inner = goType.slice(start + 1, end);
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '[' || inner[i] === '(') depth++;
    else if (inner[i] === ']' || inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) {
      out.push(inner.slice(from, i).trim());
      from = i + 1;
    }
  }
  out.push(inner.slice(from).trim());
  return out;
}

function visitForOfSequence(node: AstNode, iterExpr: string, iterType: string | undefined): string {
  if (iterType === 'interface{}') iterType = '[]interface{}';
  // Go iter.Seq[V] / Seq2[K, V]: range the func directly.
  if (iterType && isGoIterSeq(iterType)) {
    const declaration = isVariableDeclarationList(node.initializer)
      ? node.initializer.declarations[0]
      : undefined;
    // Go ints arrive under a temp and re-bind as TS numbers
    let prefix = '';
    const bindIterVar = (name: AstNode | undefined, goType: string): string => {
      if (!name || isOmittedExpression(name) || !isIdentifier(name)) return '_';
      const local = visit(name);
      if (goType !== 'float64' && isGoNumericKind(goType)) {
        const raw = getTempName('it');
        prefix += `${local} := float64(${raw}); _ = ${local};\n\t\t`;
        registerLocalVariable(name.text, 'float64');
        return raw;
      }
      registerLocalVariable(name.text, goType);
      return local;
    };
    // Seq2 destructures as [key, value]
    if (declaration && isArrayBindingPattern(declaration.name) && goIterElems(iterType).length === 2) {
      const elems = goIterElems(iterType);
      const bound = declaration.name.elements.map((el: AstNode, i: number) =>
        bindIterVar(isOmittedExpression(el) ? undefined : el.name, elems[i] ?? 'interface{}')
      );
      const key = bound[0] ?? '_';
      const value = bound[1] ?? '_';
      return `for ${key}, ${value} := range ${iterExpr}${visitLoopBody(node.statement, prefix)}`;
    }
    if (declaration && isIdentifier(declaration.name)) {
      const loopVar = bindIterVar(declaration.name, goIterElem(iterType));
      return `for ${loopVar} := range ${iterExpr}${visitLoopBody(node.statement, prefix)}`;
    }
    return `for _ = range ${iterExpr}${visitLoopBody(node.statement)}`;
  }
  // An iterable class instance: range its Symbol_iterator channel
  if (iterType?.startsWith('*')) {
    const iterClass = iterType.slice(1).replace(/\[.*\]$/, '');
    const yieldType = classIteratorMethods.get(iterClass);
    if (yieldType) {
      const declaration = isVariableDeclarationList(node.initializer)
        ? node.initializer.declarations[0]
        : undefined;
      if (declaration && isIdentifier(declaration.name)) {
        registerLocalVariable(declaration.name.text, yieldType);
        return `for ${visit(declaration.name)} := range ${iterExpr}.Symbol_iterator()${visitLoopBody(node.statement)}`;
      }
      return `for _ = range ${iterExpr}.Symbol_iterator()${visitLoopBody(node.statement)}`;
    }
  }
  if (iterType?.startsWith('chan ')) {
    const elemType = iterType.slice(5) || 'interface{}';
    const declaration = isVariableDeclarationList(node.initializer)
      ? node.initializer.declarations[0]
      : undefined;
    // for await: receive through the event loop (the values may come from loop
    // tasks — stream data, events — that must run while this loop waits)
    if (node.awaitModifier) {
      useHelper('eventLoop');
      const chanVar = getTempName('chan');
      const valueVar = declaration && isIdentifier(declaration.name) ? visit(declaration.name) : getTempName('item');
      if (declaration && isIdentifier(declaration.name)) registerLocalVariable(declaration.name.text, elemType);
      // A rejected iterator (a stream error) throws out of the loop
      useHelper('promise');
      // Raw receive: iterator channels are fed by raw sends (generator yields)
      let awaitPrefix = `${valueVar}, __ok := tnRawReceive(${chanVar})\n\t\tif !__ok {\n\t\t\tif __reason, __rejected := tnRejections.Load(${chanVar}); __rejected {\n\t\t\t\tpanic(__reason)\n\t\t\t}\n\t\t\tbreak\n\t\t}\n\t\t_ = ${valueVar}\n\t\t`;
      if (declaration && isArrayBindingPattern(declaration.name)) {
        const memberType = elemType.startsWith('[]') ? elemType.slice(2) : undefined;
        useHelper('dynamic');
        (declaration.name.elements ?? []).forEach((el: AstNode, index: number) => {
          if (isOmittedExpression(el)) return;
          const name = visit(el.name);
          registerLocalVariable(name, memberType);
          awaitPrefix += `${name} := TnAt(${valueVar}, ${index})\n\t\t_ = ${name}\n\t\t`;
        });
      }
      return `${chanVar} := ${iterExpr}\n\t\tfor ${visitLoopBody(node.statement, awaitPrefix)}`;
    }
    if (declaration && isIdentifier(declaration.name)) {
      registerLocalVariable(declaration.name.text, elemType);
      return `for ${visit(declaration.name)} := range ${iterExpr}${visitLoopBody(node.statement)}`;
    }
    // for await (const [a, b] of channel) → a := item[0]; b := item[1]
    if (declaration && isArrayBindingPattern(declaration.name)) {
      const chanItem = getTempName('item');
      const memberType = elemType.startsWith('[]') ? elemType.slice(2) : undefined;
      let chanPrefix = '';
      (declaration.name.elements ?? []).forEach((el: AstNode, index: number) => {
        if (isOmittedExpression(el)) return;
        const name = visit(el.name);
        registerLocalVariable(name, memberType);
        chanPrefix += `${name} := TnAt(${chanItem}, ${index})\n\t\t_ = ${name}\n\t\t`;
      });
      useHelper('dynamic');
      return `for ${chanItem} := range ${iterExpr}${visitLoopBody(node.statement, chanPrefix)}`;
    }
    return `for _ = range ${iterExpr}${visitLoopBody(node.statement)}`;
  }
  const elementType =
    iterType === 'string' ? 'string' : iterType?.startsWith('[]') ? iterType.slice(2) : undefined;
  const declaration = isVariableDeclarationList(node.initializer)
    ? node.initializer.declarations[0]
    : undefined;
  const binding = declaration?.name;
  const item = getTempName('item');
  let prefix = '';
  let loopVar = item;
  if (binding && isArrayBindingPattern(binding)) {
    // for (const [a, b] of pairs) → a := item[0]; b := item[1]
    const memberType = elementType?.startsWith('[]') ? elementType.slice(2) : undefined;
    (binding.elements ?? []).forEach((el: AstNode, index: number) => {
      if (isOmittedExpression(el)) return;
      const name = visit(el.name);
      // (elements of unknown shape — Map entries, any arrays — read dynamically)
      if (!memberType) useHelper('dynamic');
      registerLocalVariable(name, memberType ?? 'interface{}');
      const value = memberType ? `${item}[${index}]` : `TnIndex(${item}, float64(${index}))`;
      prefix += `${name} := ${value}\n\t\t_ = ${name}\n\t\t`;
    });
  } else if (binding && isIdentifier(binding)) {
    const name = visit(binding);
    registerLocalVariable(binding.text, elementType);
    if (iterType === 'string') {
      prefix = `${name} := string(${item})\n\t\t`;
    } else {
      loopVar = name;
    }
  } else {
    loopVar = visit(node.initializer, { inline: true });
  }
  return `for _, ${loopVar} := range ${iterExpr}${visitLoopBody(node.statement, prefix)}`;
}

// try/catch with returns: the closure reports (value, done) and the caller
// returns when done
function visitReturningTryStatement(node: AstNode, fn: AstNode, options: VisitNodeOptions): string {
  // (an async function's or generator's body returns nothing: its channel carries the result)
  const returnGoType = asyncChannelVar && fn === asyncFunctionNode ? undefined : inferFunctionBodyReturnType(fn);
  const hasValue = !!returnGoType;
  const saved = tryReturn;
  const retVar = getTempName('tryret');
  const doneVar = getTempName('trydone');
  const blockCode = (block: AstNode, inCatch: boolean) => {
    tryReturn = { fn, hasValue, inCatch, retVar, doneVar };
    const code = coverageEnter(block) + (block.statements ?? []).map((s: AstNode) => visit(s)).join('\t');
    tryReturn = saved;
    return code;
  };
  const deferreds: string[] = [];
  if (node.finallyBlock) {
    const finallyBody = coverageEnter(node.finallyBlock) + (node.finallyBlock.statements ?? []).map((s: AstNode) => visit(s)).join('\t');
    deferreds.push(`defer func() {\n\t\t\t${finallyBody}\t\t\t}()`);
  }
  if (node.catchClause) {
    const varDecl = node.catchClause.variableDeclaration;
    const catchVar = varDecl ? visit(varDecl.name) : '_r';
    if (varDecl && isIdentifier(varDecl.name)) registerLocalVariable(varDecl.name.text, 'interface{}');
    const catchBody = blockCode(node.catchClause.block, true);
    useHelper('error');
    deferreds.push(
      `defer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\t${catchVar} := TnCaught(r)\n\t\t\t\t_ = ${catchVar}\n\t\t\t\t${catchBody}\t\t\t}\n\t\t\t}()`
    );
  }
  const tryBody = blockCode(node.tryBlock, false);
  const results = hasValue
    ? `(${retVar} ${returnGoType}, ${doneVar} bool)`
    : `(${doneVar} bool)`;
  const body = [...deferreds, tryBody, 'return'].join('\n\t\t\t');
  const outer = hasValue ? `${retVar}, ${doneVar}` : doneVar;
  // Leaving through an enclosing try/catch closure of the same function passes the value on
  const exit = tryAwareReturn(hasValue ? retVar : '');
  return (
    `if ${outer} := func() ${results} {\n\t\t\t${body}\n\t\t\t}(); ${doneVar} { ${exit} }` +
    (options.inline ? '' : ';\n\t')
  );
}

function getForOfVarNames(initializer: AstNode): string[] {
  if (!isVariableDeclarationList(initializer) || initializer.declarations.length === 0) {
    return ['_'];
  }
  const decl = initializer.declarations[0];
  if (isArrayBindingPattern(decl.name)) {
    return decl.name.elements.map((el) => {
      if (isOmittedExpression(el)) return '_';
      return visit((el as AstNode).name);
    });
  }
  return [visit(decl.name)];
}

// Set while emitting a try/catch whose blocks return from the enclosing function
let tryReturn:
  | { fn: AstNode; hasValue: boolean; inCatch: boolean; retVar: string; doneVar: string }
  | undefined;

// `return value` from inside a try/catch closure: report (value, done)
function tryAwareReturn(value: string): string {
  if (!tryReturn) return `return ${value}`;
  const results = tryReturn.hasValue ? `${value}, true` : 'true';
  if (tryReturn.inCatch) {
    const targets = tryReturn.hasValue
      ? `${tryReturn.retVar}, ${tryReturn.doneVar}`
      : tryReturn.doneVar;
    return `${targets} = ${results}; return`;
  }
  return `return ${results}`;
}

function visitTryStatement(node: AstNode, options: VisitNodeOptions): string {
  const fn = getEnclosingFunction(node);
  const returnsFromFunction = (block: AstNode | undefined) =>
    !!block && containsNode(block, (n) => isReturnStatement(n) && getEnclosingFunction(n) === fn);
  if (fn && (returnsFromFunction(node.tryBlock) || returnsFromFunction(node.catchClause?.block))) {
    return visitReturningTryStatement(node, fn, options);
  }
  const deferreds: string[] = [];

  // Register finally first (LIFO: runs last after catch)
  if (node.finallyBlock) {
    const finallyBody = coverageEnter(node.finallyBlock) + (node.finallyBlock.statements ?? []).map((s) => visit(s)).join('\t');
    deferreds.push(`defer func() {\n\t\t\t${finallyBody}\t\t\t}()`);
  }

  // Register catch second (LIFO: runs first, handles panic via recover)
  if (node.catchClause) {
    const varDecl = node.catchClause.variableDeclaration;
    const catchVar = varDecl ? visit(varDecl.name) : '_r';
    if (varDecl && isIdentifier(varDecl.name)) {
      registerLocalVariable(varDecl.name.text, 'interface{}');
    }
    const catchBody = coverageEnter(node.catchClause.block) + (node.catchClause.block.statements ?? []).map((s) => visit(s)).join('\t');
    useHelper('error');
    deferreds.push(
      `defer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\t${catchVar} := TnCaught(r)\n\t\t\t\t_ = ${catchVar}\n\t\t\t\t${catchBody}\t\t\t}\n\t\t\t}()`
    );
  }

  const tryBody = (node.tryBlock.statements ?? []).map((s) => visit(s)).join('\t');
  const body = [...deferreds, tryBody].join('\n\t\t\t');

  return `func() {\n\t\t\t${body}\n\t\t\t}()` + (options.inline ? '' : ';\n\t');
}
