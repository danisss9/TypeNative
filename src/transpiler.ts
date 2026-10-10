// Normalized JSON AST node (see src/parse-node.ts and tsparser/main.go)
type AstNode = any;
// Parser injected by the caller: Node CLI uses the typescript npm package,
// the self-hosted binary spawns the tsparser Go tool.
type ParseFunction = (code: string) => AstNode;

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

function goSafeId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += GO_SAFE_ALPHABET.charAt(Math.floor(Math.random() * GO_SAFE_ALPHABET.length));
  }
  return id;
}

let parseFunction: ParseFunction;
// Declarations of every parsed file, collected before visiting (functions are
// hoisted, so call sites may precede them) for contextual typing
const declaredFunctions = new Map<string, AstNode>();
const declaredInterfaces = new Map<string, AstNode>();
const declaredTypeAliases = new Map<string, AstNode>();
// Package-level declarations of the main file's top-level variables
const mainPackageVariables: string[] = [];
// True while emitting a separate Go file, whose top-level statements sit at package scope
let emittingModuleFile = false;
const importedPackages = new Set<string>();
let outsideNodes: AstNode[] = [];
const classNames = new Set<string>();
let promiseResolveName: string = '';
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
// Variables holding JS arrays: stored as *[]T so aliasing shares the slice
// header (push/splice through any alias are visible everywhere)
const referenceArrays = new Set<string>();

// Registers a variable's Go type; array-typed variables become *[]T references
// (dynamic []interface{} arrays stay plain: they flow through runtime helpers)
function setVarGoType(name: string, goType: string | undefined): void {
  if (!name) return;
  if (goType && goType.startsWith('[]') && goType !== '[]interface{}') {
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
    isPropertyDeclaration(parent)
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
const enumBaseTypes = new Map<string, 'string' | 'float64'>();
// Maps local TS name → Go qualified name (e.g. 'Println' → 'fmt.Println', 'myFmt' → 'fmt')
const importAliases = new Map<string, string>();
// Tracks static methods per class: Set of "ClassName.methodName" strings
const classStaticMethods = new Set<string>();
// Tracks static properties per class: Set of "ClassName.propName" strings
const classStaticProps = new Set<string>();
// Callback for resolving import specifiers to source code.
// specifier: the raw import string (relative path or package name)
// fromDir: directory of the file containing the import (null = main file's dir)
// Returns the file content and its directory (for resolving that file's own imports)
let fileResolver:
  | ((specifier: string, fromDir: string | null) => { content: string; dir: string } | null)
  | null = null;
// Directory of the file currently being processed (null = main entry file)
let currentFileDir: string | null = null;
// Tracks already-included files by a stable key to prevent duplicates/cycles
const includedLocalImports = new Set<string>();
// Collects Go source files generated from local TS imports (filename → content)
let localImportFiles: Map<string, string> = new Map();
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

function defaultParseFunction(_code: string): AstNode {
    throw new Error('transpileToNative: no parse function injected (options.parse)');
}

// Parses via the injected parser and links each node to its parent: the JSON
// AST carries no parent pointers, but the transpiler walks up via node.parent.
function parseSource(code: string): AstNode {
  const sourceFile = parseFunction(code);
  linkParents(sourceFile, undefined);
  for (const stmt of sourceFile.statements ?? []) {
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

export type TranspileResult = { main: string; files: Map<string, string> };

export type TranspileOptions = {
  readFile?: (specifier: string, fromDir: string | null) => { content: string; dir: string } | null;
  parse?: ParseFunction;
};

export function transpileToNative(code: string, options?: TranspileOptions): TranspileResult {
  fileResolver = options?.readFile ?? null;
  parseFunction = options?.parse ?? defaultParseFunction;
  declaredFunctions.clear();
  declaredInterfaces.clear();
  declaredTypeAliases.clear();
  variableTypeNodes.clear();
  narrowedVariables.clear();
  nodeCallResultTypes.clear();
  asyncFunctionNames.clear();
  generatorFunctionNames.clear();
  currentFileDir = null;
  const sourceFile = parseSource(code);
  importedPackages.clear();
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
  localImportFiles = new Map();
  defaultImportNamespaces.clear();
  classStaticMethods.clear();
  classStaticProps.clear();
  classGetterMethods.clear();
  classSetterMethods.clear();
  classIteratorMethods.clear();
  declaredClasses.clear();
  classParentNames.clear();
  referenceArrays.clear();
  usedHelpers.clear();
  helperProvidedPackages.clear();
  mainPackageVariables.length = 0;
  const transpiledCode = visit(sourceFile, { addFunctionOutside: true });
  const transpiledCodeOutside = outsideNodes.map((n) => visit(n, { isOutside: true })).join('\n');

  // Keep the process alive until detached async work and timers settle
  const drains: string[] = [];
  if (usedHelpers.has('asyncWait')) drains.push('__tnWaitGroup.Wait()');
  if (usedHelpers.has('timerWait')) drains.push('__tnTimers.Wait()');
  const drainCode = drains.length > 0 ? `\n\t${drains.join('\n\t')}` : '';

  const main = `package main

${[...importedPackages].sort().map((pkg) => goImportLine(pkg)).join('\n')}

${mainPackageVariables.join('\n')}

func main() {
    ${transpiledCode.trim()}${drainCode}
}

${transpiledCodeOutside.trim()}
${emitGoHelpers()}`.trimEnd();
  return { main, files: localImportFiles };
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
  for (const member of (iface.members ?? [])) {
    if (isPropertySignature(member) && isIdentifier(member.name)) {
      into.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
    }
  }
}

function visit(node: AstNode, options: VisitNodeOptions = {}): string {
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
      .map((n) => visit(n, { addFunctionOutside: true }))
      .filter((n) => !!n)
      .join(options.inline ? '' : '\n\t');
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
    if (node.text === 'NaN' || node.text === 'Infinity') {
      importedPackages.add('math');
      return node.text === 'NaN' ? 'math.NaN()' : 'math.Inf(1)';
    }
    const goAlias = importAliases.get(node.text);
    if (goAlias) return goAlias;
    // Array references: reads go through the shared slice-header pointer
    if (referenceArrays.has(node.text)) {
      return `(*${getSafeName(node.text)})`;
    }
    if (narrowedVariables.has(node.text) && isNarrowableReference(node)) {
      return `(*${getSafeName(node.text)})`;
    }
    return getSafeName(node.text);
  } else if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
    return toGoStringLiteral(node.text);
  } else if (isAsExpression(node)) {
    return toGoValueOfType(node.expression, getAsExpressionType(node));
  } else if (isTypeAssertionExpression(node)) {
    return visit(node.expression);
  } else if (isTemplateExpression(node)) {
    return visitTemplateExpression(node);
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
      return `TnRegexCompile("${goPattern}", ${flags.includes('g') ? 'true' : 'false'})`;
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
    return `[]${type} {${(node.elements ?? []).map((e) => visit(e)).join(', ')}}`;
  } else if (isBlock(node)) {
    return `{\n\t\t${options.prefixBlockContent ?? ''}${visitBlockStatements(
      node.statements ?? []
    )}${options.extraBlockContent ?? ''}}${options.inline ? '' : '\n\t'}`;
  } else if (isElementAccessExpression(node)) {
    if (hasQuestionDot(node)) {
      return visitOptionalElementAccess(node);
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
      return `TnCharAt(${visit(node.expression)}, ${visit(node.argumentExpression)})`;
    }
    if (targetType?.startsWith('*TnMap[')) {
      return `${visit(node.expression)}.Get(${toGoValueOfType(node.argumentExpression, extractMapKeyType(targetType))})`;
    }
    if (isStringLiteral(node.argumentExpression)) {
      return `${visit(node.expression)}[${visit(node.argumentExpression)}]`;
    }
    // Reading past the end of an array gives undefined in JS: the zero value here
    if (targetType?.startsWith('[]') && !isAssignmentTarget(node)) {
      useHelper('dynamic');
      return `TnAt(${visit(node.expression)}, ${visit(node.argumentExpression)})`;
    }
    return `${visit(node.expression)}[int(${visit(node.argumentExpression)})]`;
  } else if (isPropertyAccessExpression(node)) {
    // import.meta.url — the file URL of the running program
    if (node.expression.kind === 'MetaProperty' && node.name.text === 'url') {
      useHelper('moduleUrl');
      return 'TnModuleURL()';
    }
    if (isDynamicValue(node.expression) && node.name.text === 'length' && !isCallee(node)) {
      useHelper('dynamic');
      return `TnLength(${visit(node.expression)})`;
    }
    if (isDynamicValue(node.expression) && !isCallee(node) && !isProcessEnv(node.expression)) {
      useHelper('dynamic');
      return `TnGet(${visit(node.expression)}, "${node.name.text}")`;
    }
    if (hasQuestionDot(node)) {
      return visitOptionalPropertyAccess(node);
    }
    // super.method() → the parent's implementation on the embedded struct
    if (node.expression.kind === 'SuperKeyword') {
      const ownerClass = getEnclosingClassName(node);
      const parentName = ownerClass ? classParentNames.get(ownerClass) : undefined;
      if (parentName) {
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
    // Static member access: `Counter.count` → `Counter_count`
    if (isIdentifier(node.expression)) {
      const key = `${node.expression.text}.${node.name.text}`;
      if (classStaticMethods.has(key) || classStaticProps.has(key)) {
        return `${node.expression.text}_${node.name.text}`;
      }
    }
    const leftSide = visit(node.expression);
    const rightSide = visit(node.name);
    const objectType = resolveExpressionType(node.expression);
    // Anonymous-struct function fields (object-literal methods/getters): a
    // property read invokes the closure, unless it is itself being called
    const leftGoType = inferExpressionType(node.expression);
    if (
      leftGoType?.includes('struct{') &&
      !isCallee(node) &&
      getStructFieldGoType(leftGoType.replace(/^\*/, ''), node.name.text)?.startsWith('func')
    ) {
      return `${leftSide}.${rightSide}()`;
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
      if (className && classGetterMethods.has(`${className}.${node.name.text}`)) {
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
    return getAcessString(leftSide, rightSide, objectType);
  } else if (isVariableDeclaration(node)) {
    // Object destructuring: const { x, y } = obj
    if (isObjectBindingPattern(node.name) && node.initializer) {
      const initExpr = visit(node.initializer);
      const initType = inferExpressionType(node.initializer);
      const parts: string[] = [];
      for (const el of node.name.elements ?? []) {
        const localName = visit(el.name);
        const rawProp = el.propertyName ?? el.name;
        const propName = isIdentifier(rawProp) ? rawProp.text : visit(rawProp);
        const fieldType = initType
          ? getStructFieldGoType(initType.replace(/^\*/, ''), propName)
          : undefined;
        const defaultVal = el.initializer;
        if (defaultVal) {
          // Missing property (nil) takes the default
          const defType = inferExpressionType(defaultVal) ?? fieldType ?? 'interface{}';
          const tmp = getTempName('destructure');
          useHelper('dynamic');
          parts.push(
            `${localName} := func() ${defType} { ${tmp} := interface{}((${initExpr}).${goFieldName(propName)}); if TnIsNil(${tmp}) { return ${visit(defaultVal)} }; return TnAs[${defType}](${tmp}) }()`
          );
        } else {
          parts.push(`${localName} := (${initExpr}).${goFieldName(propName)}`);
        }
        registerLocalVariable(
          localName,
          defaultVal ? (inferExpressionType(defaultVal) ?? fieldType) : fieldType
        );
      }
      return parts.join(';\n\t');
    }
    // Array destructuring: const [a, b] = arr
    if (isArrayBindingPattern(node.name) && node.initializer) {
      const initGoType = inferExpressionType(node.initializer);
      const initExpr = isDynamicValue(node.initializer)
        ? toGoValueOfType(node.initializer, '[]interface{}')
        : visit(node.initializer);
      const tmpVar = getTempName('arr');
      const elemType = initGoType?.startsWith('[]') ? initGoType.slice(2) : undefined;
      const parts = [`${tmpVar} := ${initExpr}`];
      node.name.elements.forEach((el, idx) => {
        if (isOmittedExpression(el)) return;
        const bindEl = el as AstNode;
        const localName = visit(bindEl.name);
        const defaultVal = bindEl.initializer;
        if (defaultVal) {
          // Missing element (past the end) takes the default
          const defType = inferExpressionType(defaultVal) ?? elemType ?? 'interface{}';
          parts.push(
            `${localName} := func() ${defType} { if len(${tmpVar}) > ${idx} { return ${tmpVar}[${idx}] }; return ${visit(defaultVal)} }()`
          );
        } else if (localName === '_' || localName.startsWith('_')) {
          parts.push(`_ = ${tmpVar}`);
        } else {
          // Reading past the end gives undefined in JS: the zero value here
          useHelper('dynamic');
          parts.push(`${localName} := TnAt(${tmpVar}, float64(${idx}))`);
        }
        registerLocalVariable(
          localName,
          defaultVal ? inferExpressionType(defaultVal) : elemType
        );
      });
      return parts.join(';\n\t');
    }
    // `const x: any = expr` keeps inference (x := expr); `any` elsewhere is interface{}
    const isInferredAny = isAnyTypeNode(node.type) && !!node.initializer;
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
    if (type === ':' && isPackageScope) {
      return `var ${getSafeName(node.name.text)} ${initializer}`;
    }
    const isMainTopLevel = !emittingModuleFile && isTopLevelStatement;
    const packageType = type === ':' ? variableGoTypes.get(node.name.text) : type;
    if (isMainTopLevel && packageType && packageType !== 'nil' && isIdentifier(node.name)) {
      const name = getSafeName(node.name.text);
      mainPackageVariables.push(`var ${name} ${packageType}`);
      return initializer ? `${name} ${initializer}` : '';
    }
    const declName = isIdentifier(node.name) ? getSafeName(node.name.text) : visit(node.name);
    return `${type === ':' ? '' : 'var '}${declName} ${type}${
      type === ':' ? '' : ' '
    }${initializer}`;
  } else if (isCallExpression(node)) {
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
    const dynamicCall = visitDynamicMethodCall(node);
    if (dynamicCall) return dynamicCall;
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
      // Registered on the wait group so the process lives until it fires
      return `__tnTimers.Add(1)\n\t\ttime.AfterFunc(${delay} * time.Millisecond, func() {\n\t\t\tdefer __tnTimers.Done()\n\t\t\t${callback.trim()}()\n\t\t})`;
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
        return `__tnWaitGroup.Add(1)\n\t\tgo func() {\n\t\t\tdefer __tnWaitGroup.Done()\n\t\t\t__v := <-(${recv})\n\t\t\t(${cbExpr})(__v)\n\t\t}()`;
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
      const callbackNode = (node.arguments ?? [])[1];
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
    const caller = visit(node.expression);
    const safeCaller = getSafeName(caller);
    const typeArgs = getTypeArguments((node.typeArguments ?? []));
    // Handle spread arguments: fn(...arr) → fn(arr...)
    const hasSpreadArg = (node.arguments ?? []).some((a) => isSpreadElement(a));
    const args = hasSpreadArg ? visitSpreadCallArguments(node) : visitCallArguments(node);
    // Resolve object type for type-aware method dispatch
    let objectType: string | undefined;
    if (isPropertyAccessExpression(node.expression)) {
      objectType = resolveExpressionType(node.expression.expression);
    }
    currentReceiverGoType = isPropertyAccessExpression(node.expression)
      ? inferExpressionType(node.expression.expression)
      : undefined;
    return getCallString(safeCaller, args, typeArgs, objectType);
  } else if (isPrefixUnaryExpression(node)) {
    if (node.operator === 'ExclamationToken') {
      return `!${wrapCondition(toGoCondition(node.operand))}`;
    }
    if (isIncrementOrDecrement(node)) return visitIncrementOrDecrement(node, true);
    if (node.operator === 'TildeToken') {
      useHelper('dynamic');
      return `float64(^TnInt32(${visit(node.operand)}))`;
    }
    return `${getOperatorText(node.operator)}${visit(node.operand)}`;
  } else if (isPostfixUnaryExpression(node)) {
    return visitIncrementOrDecrement(node, false);
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
    if (node.operatorToken.kind === 'InstanceOfKeyword' && isIdentifier(node.right)) {
      // x instanceof C: the runtime type is C's pointer type
      return `func() bool { _, ok := interface{}(${visit(node.left)}).(*${getSafeName(node.right.text)}); return ok }()`;
    }
    if (node.operatorToken.kind === 'InKeyword') {
      if (isDynamicValue(node.right)) {
        useHelper('dynamic');
        return `TnHas(${visit(node.right)}, ${visit(node.left)})`;
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
      const bl = visit(node.left);
      const br = visit(node.right);
      if (op === '==') return `${bl}.Cmp(${br}) == 0`;
      if (op === '!=') return `${bl}.Cmp(${br}) != 0`;
      if (op === '<') return `${bl}.Cmp(${br}) < 0`;
      if (op === '>') return `${bl}.Cmp(${br}) > 0`;
      if (op === '<=') return `${bl}.Cmp(${br}) <= 0`;
      if (op === '>=') return `${bl}.Cmp(${br}) >= 0`;
      if (op === '+') return `new(tnbig.Int).Add(${bl}, ${br})`;
      if (op === '-') return `new(tnbig.Int).Sub(${bl}, ${br})`;
      if (op === '*') return `new(tnbig.Int).Mul(${bl}, ${br})`;
      if (op === '/') return `new(tnbig.Int).Div(${bl}, ${br})`;
      if (op === '%') return `new(tnbig.Int).Rem(${bl}, ${br})`;
      if (op === '**') return `new(tnbig.Int).Exp(${bl}, ${br}, nil)`;
    }
    if (op === '**') {
      importedPackages.add('math');
      return `math.Pow(${visit(node.left)}, ${visit(node.right)})`;
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
        const same = `TnSame(${visit(node.left)}, ${visit(node.right)})`;
        return op === '==' ? same : `!${same}`;
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
    if (op === '=' && isPropertyAccessExpression(node.left) && isDynamicValue(node.left.expression)) {
      useHelper('dynamic');
      return `TnSet(${visit(node.left.expression)}, "${node.left.name.text}", ${visit(node.right)})`;
    }
    // Class setter writes are accessor calls: c.v = x → c.Set_v(x)
    if (op === '=' && isPropertyAccessExpression(node.left)) {
      const ownerGoType = inferExpressionType(node.left.expression);
      const setterClass =
        ownerGoType?.startsWith('*') && !ownerGoType.startsWith('*TnMap[') && !ownerGoType.includes('struct{')
          ? ownerGoType.slice(1).replace(/\[.*\]$/, '')
          : node.left.expression.kind === 'ThisKeyword'
            ? getEnclosingClassName(node)
            : undefined;
      if (setterClass && classSetterMethods.has(`${setterClass}.${node.left.name.text}`)) {
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
    // Assigning to a nullable primitive (*T) boxes the value
    if (op === '=' && isIdentifier(node.left)) {
      const leftType = variableGoTypes.get(node.left.text);
      if (leftType && (leftType.startsWith('*') || isDynamicValue(node.right))) {
        return `${getSafeName(node.left.text)} = ${toGoValueOfType(node.right, leftType)}`;
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
    return `<-${visit(node.expression)}`;
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
      return `__tnWaitGroup.Add(1)\n\t\tgo func() {\n\t\t\tdefer __tnWaitGroup.Done()\n\t\t\t<-${getSafeName(exprStmt.expression.text)}()\n\t\t}();\n\t`;
    }
    return visit(node.expression) + (options.inline ? '' : ';\n\t');
  } else if (isForStatement(node)) {
    return `for ${visit(node.initializer!, { inline: true })}; ${
      node.condition ? toGoCondition(node.condition) : ''
    }; ${visit(node.incrementor!, { inline: true })}${visitLoopBody(node.statement)}`;
  } else if (isForInStatement(node)) {
    const varName = isVariableDeclarationList(node.initializer)
      ? visit(node.initializer.declarations[0].name)
      : visit(node.initializer as AstNode);
    const iterated = visit(node.expression, { inline: true });
    const isOrderedMap = inferExpressionType(node.expression)?.startsWith('*TnMap[');
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
      iterNode.arguments.length > 0
    ) {
      iterNode = iterNode.arguments[0] as AstNode;
    }
    const iterExpr = isDynamicValue(iterNode)
      ? toGoValueOfType(iterNode, '[]interface{}')
      : visit(iterNode, { inline: true });
    const iterType = inferExpressionType(iterNode);
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
      const condition = { ...node.expression, left: hoisted.left };
      const prefix = `${visit(hoisted, { inline: true })};\n\t\tif !(${visit(condition, {
        inline: true
      })}) {\n\t\t\tbreak\n\t\t}\n\t\t`;
      return `for ${visitLoopBody(node.statement, prefix)}`;
    }
    return `for ${toGoCondition(node.expression)}${visitLoopBody(node.statement)}`;
  } else if (isDoStatement(node)) {
    const condition = `\tif !(${toGoCondition(node.expression)}) {\n\t\t\tbreak \n\t\t}\n\t`;
    return `for ${visit(node.statement, { inline: true, extraBlockContent: condition })}`;
  } else if (isIfStatement(node)) {
    // Go requires the branch body to be a block even for single statements
    // Go requires a block body; `} else` must stay on the same line, so the
    // terminating ';' is only added when no else branch follows
    const thenTerm = node.elseStatement ? '' : ';';
    const thenCode = withNarrowing(getNarrowedNames(node.expression, true), () =>
      isBlock(node.thenStatement)
        ? visit(node.thenStatement, { inline: !!node.elseStatement })
        : `{\n${visit(node.thenStatement)}\n}${thenTerm}`
    );
    const condition = `if ${toGoCondition(node.expression)} ${thenCode}`;
    if (node.elseStatement) {
      // else-if chains stay chained; other single statements get a block
      const elseCode = withNarrowing(getNarrowedNames(node.expression, false), () =>
        isBlock(node.elseStatement) || isIfStatement(node.elseStatement)
          ? visit(node.elseStatement)
          : `{\n${visit(node.elseStatement)}\n};\n\t`
      );
      return `${condition} else ${elseCode}`;
    }
    return condition;
  } else if (isSwitchStatement(node)) {
    return `switch ${visit(node.expression)} ${visit(node.caseBlock)}`;
  } else if (isCaseBlock(node)) {
    return `{\n\t\t${(node.clauses ?? []).map((c) => visit(c)).join('\n\t\t')}\n\t}`;
  } else if (isCaseClause(node)) {
    const isFallThrough = !(node.statements ?? []).some((c) => isBreakStatement(c));
    return `case ${visit(node.expression, { inline: true })}: \n\t\t\t${(node.statements ?? [])
      .filter((n) => !isBreakStatement(n))
      .map((s) => visit(s))
      .join('')}${isFallThrough ? 'fallthrough\n\t' : ''}`;
  } else if (isDefaultClause(node)) {
    return `default: \n\t\t\t${(node.statements ?? [])
      .filter((n) => !isBreakStatement(n))
      .map((s) => visit(s))
      .join('')}`;
  } else if (isBreakStatement(node)) {
    return node.label ? `break ${getSafeName(node.label.text)}` : 'break';
  } else if (node.kind === 'ContinueStatement') {
    return node.label ? `continue ${getSafeName(node.label.text)};\n\t` : 'continue;\n\t';
  } else if (node.kind === 'LabeledStatement') {
    const label = getSafeName(node.label.text);
    return `${label}:\n\t\t${visit(node.statement)}` + (options.inline ? '' : ';\n\t');
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
      return `${asyncChannelVar} <- ${visit(node.expression)}; return` + (options.inline ? '' : ';\n\t');
    }
    const enclosingFn = getEnclosingFunction(node);
    const isAsync = enclosingFn?.modifiers?.some((m) => m.kind === 'AsyncKeyword');
    const returnGoType =
      enclosingFn && !isAsync ? inferFunctionBodyReturnType(enclosingFn) : undefined;
    const value = node.expression ? toGoValueOfType(node.expression, returnGoType) : '';
    const terminator = options.inline ? '' : ';\n\t';
    if (tryReturn && enclosingFn === tryReturn.fn) return tryAwareReturn(value) + terminator;
    return `return ${value}` + terminator;
  } else if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      return '';
    }

    const typeParams = getTypeParameters(node.typeParameters);
    const parameterInfo = withContextualParameters(
      node,
      getFunctionParametersInfo(node.parameters ?? [])
    );

    if (node.body && isBlock(node.body)) {
      prescanVariableDeclarations(node.body);
    }
    const inferredRetType = inferFunctionBodyReturnType(node);
    const returnType = inferredRetType ? ` ${inferredRetType}` : '';

    if (options.isOutside) {
      // async functions run their body in a goroutine sending over a channel
      const isAsync = (node.modifiers ?? []).some((m: AstNode) => m.kind === 'AsyncKeyword');
      if (isAsync && node.name) {
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

    if (!node.name) {
      return `func${typeParams}(${parameterInfo.signature})${returnType} ${visit(node.body!, {
        prefixBlockContent: parameterInfo.prefixBlockContent
      }).trimEnd()}`;
    }

    const name = visit(node.name, { inline: true });
    const safeName = getSafeName(name);
    return `${safeName} := func${typeParams}(${parameterInfo.signature})${returnType} ${visit(
      node.body!,
      {
        prefixBlockContent: parameterInfo.prefixBlockContent
      }
    )}`;
  } else if (isArrowFunction(node)) {
    const parameterInfo = withContextualParameters(
      node,
      getFunctionParametersInfo(node.parameters ?? [])
    );
    const inferredRetType = inferFunctionBodyReturnType(node);
    const returnType = inferredRetType ? ` ${inferredRetType}` : '';
    if (parameterInfo.prefixBlockContent && !isBlock(node.body)) {
      return `func(${parameterInfo.signature})${returnType} {\n\t\t${parameterInfo.prefixBlockContent}return ${visit(node.body)};\n\t}`;
    }
    if (!isBlock(node.body)) {
      // void-style calls (console.*, assert) emit statements, not values
      if (isVoidStatementCall(node.body as AstNode)) {
        return `func(${parameterInfo.signature})${returnType} { ${visit(node.body as AstNode)}; }`;
      }
      return `func(${parameterInfo.signature})${returnType} { return ${visit(node.body as AstNode)}; }`;
    }
    return `func(${parameterInfo.signature})${returnType} ${visit(node.body, {
      prefixBlockContent: parameterInfo.prefixBlockContent
    }).trimEnd()}`;
  } else if (node.kind === 'ThisKeyword') {
    if (thisOverrideName && getEnclosingFunction(node) === thisOverrideFn) return thisOverrideName;
    return 'self';
  } else if (node.kind === 'PrivateIdentifier') {
    // #field → a plain (mangled) struct field
    return goFieldName(node.text.slice(1));
  } else if (isEnumDeclaration(node)) {
    const enumName = node.name.text;
    enumNames.add(enumName);
    enumBaseTypes.set(enumName, getEnumBaseType(node));

    if (options.addFunctionOutside) {
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

    if (properties.length > 0 && methods.length === 0) {
      if (extendedInterfaces.length === 0) {
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

    return `type ${name}${typeParams} interface {\n${members.join('\n')}\n}`;
  } else if (isClassDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      const className = visit(node.name!);
      classNames.add(className);
      declaredClasses.set(className, node);

      const properties = new Map<string, string>();
      const methods = new Map<string, string>();
      for (const member of (node.members ?? [])) {
        const memberModifiers = (member as AstNode).modifiers;
        const isStatic = memberModifiers?.some((m) => m.kind === 'StaticKeyword');
        const isPrivate = member.name?.kind === 'PrivateIdentifier';
        const memberName = isPrivate ? member.name.text.slice(1) : member.name?.text;
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
          }
        }
        if (isGetAccessor(member) && isIdentifier(member.name)) {
          classGetterMethods.add(`${className}.${member.name.text}`);
          properties.set(member.name.text, member.type ? getType(member.type) : 'interface{}');
        }
        if (isSetAccessor(member) && isIdentifier(member.name)) {
          classSetterMethods.add(`${className}.${member.name.text}`);
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
          parentClassName = visit(clause.types[0].expression);
        }
      }
      if (parentClassName && parentClassName !== 'Error') {
        classParentNames.set(className, parentClassName);
        const parent = declaredClasses.get(parentClassName);
        if (parent) {
          const parentMethods = classMethodReturnTypes.get(parentClassName);
          if (parentMethods) {
            for (const inheritedMethod of parentMethods.keys()) {
              if (!methods.has(inheritedMethod)) {
                methods.set(inheritedMethod, parentMethods.get(inheritedMethod)!);
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
      return '';
    }

    const name = visit(node.name!);
    const typeParams = getTypeParameters(node.typeParameters);
    const typeParamNames = getTypeParameterNames(node.typeParameters);

    let parentClass: string | null = null;
    if ((node.heritageClauses ?? [])) {
      for (const clause of (node.heritageClauses ?? [])) {
        if (clause.token === 'ExtendsKeyword') {
          parentClass = visit(clause.types[0].expression);
        }
      }
    }
    const extendsError = parentClass === 'Error';
    if (extendsError) useHelper('error');
    if (parentClass && !extendsError) classParentNames.set(name, parentClass);
    const isAbstractClass = (node.modifiers ?? []).some((m: AstNode) => m.kind === 'AbstractKeyword');

    const fields: string[] = [];
    if (parentClass) {
      fields.push(`\t${extendsError ? 'TnError' : parentClass}`);
    }
    for (const member of (node.members ?? [])) {
      if (isPropertyDeclaration(member)) {
        const fieldName =
          member.name?.kind === 'PrivateIdentifier'
            ? goFieldName(member.name.text.slice(1))
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

    let result = `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}\n\n`;

    const ctor = (node.members ?? []).find((m) => isConstructorDeclaration(m)) as
      | AstNode
      | undefined;
    const isCtorSuperCall = (s: AstNode): boolean =>
      isExpressionStatement(s) &&
      isCallExpression(s.expression) &&
      s.expression.expression.kind === 'SuperKeyword';
    const superCalledInCtor = (ctor?.body?.statements ?? []).some(isCtorSuperCall);
    if (ctor) {
      const ctorParameterInfo = getFunctionParametersInfo(ctor.parameters ?? []);

      const bodyStatements =
        (ctor.body?.statements ?? [])
          .map((s: AstNode) => {
            // super(...) initializes the embedded parent (or the Error message)
            if (isCtorSuperCall(s)) {
              const args = (s.expression.arguments ?? []).map((a: AstNode) => visit(a));
              if (extendsError) return `self.message = ${args[0] ?? '""'}\n\t\t`;
              return `self.${goFieldName(parentClass!)} = *New${parentClass}(${args.join(', ')})\n\t\t`;
            }
            return visit(s);
          })
          .join('\t') ?? '';

      const parameterAssignments = getParameterProperties(node)
        .map((p) => `self.${goFieldName(p.name.text)} = ${visit(p.name)}\n\t\t`)
        .join('');
      const parentInit =
        parentClass && !extendsError && !superCalledInCtor
          ? `self.${goFieldName(parentClass)} = *New${parentClass}()\n\t\t`
          : '';
      result += `func New${name}${typeParams}(${ctorParameterInfo.signature}) *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\t${ctorParameterInfo.prefixBlockContent}${parentInit}${fieldInitializers(node)}${parameterAssignments}${bodyStatements}return self;\n\t}\n\n`;
    } else if (extendsError) {
      // class X extends Error {} — the constructor takes the message
      result += `func New${name}${typeParams}(message string) *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\tself.message = message\n\t\t${fieldInitializers(node)}return self\n\t}\n\n`;
    } else {
      const parentInit =
        parentClass && !extendsError ? `self.${goFieldName(parentClass)} = *New${parentClass}()\n\t\t` : '';
      result += `func New${name}${typeParams}() *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\t${parentInit}${fieldInitializers(node)}return self\n\t}\n\n`;
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
          if (!isMethodDeclaration(member)) continue;
          if (!member.body || member.asteriskToken) continue; // abstract / generator
          if (member.modifiers?.some((m: AstNode) => m.kind === 'StaticKeyword')) continue;
          if (member.modifiers?.some((m: AstNode) => m.kind === 'AbstractKeyword')) continue;
          const methodName =
            member.name?.kind === 'PrivateIdentifier' ? member.name.text.slice(1) : member.name?.text;
          if (!methodName || ownMethodNames.has(methodName)) continue;
          ownMethodNames.add(methodName);
          const methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
          const returnType = member.type ? ` ${getType(member.type)}` : '';
          copiedMethods.push(
            `func (self *${name}${typeParamNames}) ${methodName}(${methodParameterInfo.signature})${returnType} ${visit(
              member.body,
              { prefixBlockContent: methodParameterInfo.prefixBlockContent }
            )}\n`
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
          genName = member.name.kind === 'PrivateIdentifier' ? member.name.text.slice(1) : member.name.text;
        }
        if (genName) {
          const yieldType = getGeneratorYieldType(member);
          const prevChannel = asyncChannelVar;
          const prevFn = asyncFunctionNode;
          asyncChannelVar = '__ch';
          asyncFunctionNode = member;
          const methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
          const genBody = visit(member.body, { prefixBlockContent: methodParameterInfo.prefixBlockContent });
          asyncChannelVar = prevChannel;
          asyncFunctionNode = prevFn;
          result += `func (self *${name}${typeParamNames}) ${genName}(${methodParameterInfo.signature}) chan ${yieldType} {\n\t__ch := make(chan ${yieldType})\n\tgo func() {\n\t\tdefer close(__ch)\n\t\t${genBody.trim()}\n\t}()\n\treturn __ch\n}\n\n`;
        }
        continue;
      }
      if (isMethodDeclaration(member)) {
        const methodName = visit(member.name);
        const methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
        const returnType = member.type ? ` ${getType(member.type)}` : '';
        const isStatic = member.modifiers?.some((m) => m.kind === 'StaticKeyword');
        if (!member.body) continue; // abstract method — implemented by subclasses
        if (isAbstractClass && !isStatic) continue; // only reachable via subclasses
        if (isStatic) {
          // Static methods become package-level functions named ClassName_methodName
          result += `func ${name}_${methodName}(${methodParameterInfo.signature})${returnType} ${visit(
            member.body!,
            { prefixBlockContent: methodParameterInfo.prefixBlockContent }
          )}\n\n`;
        } else {
          result += `func (self *${name}${typeParamNames}) ${methodName}(${methodParameterInfo.signature})${returnType} ${visit(
            member.body!,
            { prefixBlockContent: methodParameterInfo.prefixBlockContent }
          )}\n\n`;
        }
      } else if (isGetAccessor(member)) {
        // Getter: get prop() { ... } → func (self *T) Get_prop() RetType { ... }
        const getterName = visit(member.name);
        const returnType = member.type ? ` ${getType(member.type)}` : ' interface{}';
        result += `func (self *${name}${typeParamNames}) Get_${getterName}()${returnType} ${visit(member.body!)}\n\n`;
      } else if (isSetAccessor(member)) {
        // Setter: set prop(val) { ... } → func (self *T) Set_prop(val ValType) { ... }
        const setterName = visit(member.name);
        const parameterInfo = getFunctionParametersInfo(member.parameters ?? []);
        result += `func (self *${name}${typeParamNames}) Set_${setterName}(${parameterInfo.signature}) ${visit(member.body!, { prefixBlockContent: parameterInfo.prefixBlockContent })}\n\n`;
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

    return result.trim();
  } else if (isNewExpression(node)) {
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
    if (className === 'Map') {
      return visitNewMap(node);
    }
    if (className === 'Set') {
      return visitNewSet(node);
    }
    // new Error(message) → a TnError value with a .message
    if (className === 'Error') {
      useHelper('error');
      const msg = (node.arguments ?? [])[0] ? visit(node.arguments[0]) : '""';
      return `TnNewError(${msg})`;
    }
    // new Date() / new Date(ms) → Go time
    if (className === 'Date') {
      importedPackages.add('time');
      if ((node.arguments ?? []).length === 0) return 'time.Now()';
      return `time.UnixMilli(int64(${visit(node.arguments[0])})).UTC()`;
    }
    // new Array<number>(3) → make([]float64, 3)
    if (className === 'Array' && (node.typeArguments ?? []).length === 1) {
      const elementType = getType(node.typeArguments[0]);
      const length = (node.arguments ?? [])[0] ? visit(node.arguments[0]) : '0';
      return `make([]${elementType}, int(${length}))`;
    }
    const typeArgs = getTypeArguments((node.typeArguments ?? []));
    const args = node.arguments ? (node.arguments ?? []).map((a) => visit(a)) : [];
    return `New${className}${typeArgs}(${args.join(', ')})`;
  } else if (isObjectLiteralExpression(node)) {
    if (isDynamicObjectLiteral(node)) {
      // { ...a, k: v } → copy a's properties, then set k (in source order)
      if ((node.properties ?? []).some((p) => p.kind === 'SpreadAssignment')) {
        useHelper('dynamic');
        const steps = (node.properties ?? []).map((p) => {
          if (p.kind === 'SpreadAssignment') return `TnAssign(__obj, ${visit(p.expression)})`;
          if (isShorthandPropertyAssignment(p)) return `__obj[${mapKeyText(p.name)}] = ${visit(p.name)}`;
          return `__obj[${mapKeyText(p.name)}] = ${visit(p.initializer)}`;
        });
        return `func() map[string]interface{} { __obj := map[string]interface{}{}; ${steps.join('; ')}; return __obj }()`;
      }
      const entries = (node.properties ?? [])
        .map((p) => {
          if (isPropertyAssignment(p)) return `${mapKeyText(p.name)}: ${visit(p.initializer)}`;
          if (isShorthandPropertyAssignment(p)) return `${mapKeyText(p.name)}: ${visit(p.name)}`;
          return '';
        })
        .filter((e) => e);
      return `map[string]interface{}${compositeBody(entries)}`;
    }
    const contextualType = resolveTypeNode(getContextualTypeNode(node));
    if (isRecordTypeNode(contextualType)) {
      return visitMapLiteral(node, contextualType);
    }
    const typeName = contextualType ? getTypeText(contextualType) : '';
    if (!typeName || typeName === 'interface{}') {
      return visitAnonymousStructLiteral(node);
    }
    // Objects are pointers: the struct type is typeName without its *
    const structName = typeName.replace(/^\*/, '');
    // { ...base, x: 1 } → a copy of *base with fields set
    if ((node.properties ?? []).some((p) => p.kind === 'SpreadAssignment')) {
      const steps = (node.properties ?? []).map((p) => {
        if (p.kind === 'SpreadAssignment') return `__obj = *(${visit(p.expression)})`;
        if (isShorthandPropertyAssignment(p)) return `__obj.${goFieldName(p.name.text)} = ${visit(p.name)}`;
        const spreadFieldType = isIdentifier(p.name)
          ? (interfacePropertyTypes.get(structName)?.get(p.name.text) ??
            getStructFieldGoType(structName, p.name.text))
          : undefined;
        return `__obj.${visit(p.name)} = ${toGoValueOfType(p.initializer, spreadFieldType)}`;
      });
      return `func() *${structName} { var __obj ${structName}; ${steps.join('; ')}; return &__obj }()`;
    }

    const fieldTypes = interfacePropertyTypes.get(structName) ?? classPropertyTypes.get(structName);
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
  }

  const syntaxKind = node.kind;
  if (!['VariableStatement', 'EndOfFileToken'].includes(syntaxKind)) {
    const snippet = String(node.text ?? node.kind).substring(0, 60).replace(/\n/g, ' ');
    console.warn(`[TypeNative] Unsupported syntax: ${syntaxKind} — "${snippet}"`);
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
function toGoValueOfType(expr: AstNode, goType: string | undefined): string {
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
      if (isIdentifier(expr) && referenceArrays.has(expr.text)) {
        return getSafeName(expr.text);
      }
      if (isArrayLiteralExpression(expr)) {
        const code = visit(expr);
        // Spread-built arrays (append chains) are not addressable
        return code.startsWith('[')
          ? `&${code}`
          : `func() ${goType} { __v := ${code}; return &__v }()`;
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
  if (!goType || !NULLABLE_PRIMITIVE_TYPES.includes(goType) || isNilLiteral(expr)) {
    return code;
  }
  if (isConditionalExpression(expr)) return code;
  if (
    isBinaryExpression(expr) &&
    expr.operatorToken.kind === 'QuestionQuestionToken' &&
    inferExpressionType(expr.left)?.startsWith('*')
  ) {
    return code;
  }
  if (inferExpressionType(expr) !== goType.slice(1)) return code;
  return `func() ${goType} { v := ${code}; return &v }()`;
}

const NULLABLE_PRIMITIVE_TYPES = ['*string', '*float64', '*bool'];

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
  return (
    isPropertyAccessExpression(expr) &&
    isIdentifier(expr.expression) &&
    expr.expression.text === 'process' &&
    expr.name.text === 'env'
  );
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
  const isNotEqual = kind === 'ExclamationEqualsEqualsToken' || kind === 'ExclamationEqualsToken';
  const isEqual = kind === 'EqualsEqualsEqualsToken' || kind === 'EqualsEqualsToken';
  if (!isNotEqual && !isEqual) return [];
  const checked = isNilLiteral(condition.right)
    ? condition.left
    : isNilLiteral(condition.left)
      ? condition.right
      : undefined;
  if (!checked) {
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
  if (parent.name === node) return false;
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
  for (const statement of statements) {
    parts.push(visit(statement));
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

function visitDynamicArithmetic(node: AstNode, op: string): string | undefined {
  const leftDynamic = isDynamicValue(node.left);
  const rightDynamic = isDynamicValue(node.right);
  if (!leftDynamic && !rightDynamic) return undefined;
  const isConcat =
    op === '+' && [node.left, node.right].some((side) => inferExpressionType(side) === 'string');
  const operand = (side: AstNode, dynamic: boolean) => {
    if (!dynamic) return visit(side);
    if (isConcat) {
      importedPackages.add('fmt');
      return `fmt.Sprint(${visit(side)})`;
    }
    useHelper('dynamic');
    return `TnAs[float64](${visit(side)})`;
  };
  // Compound assignment with a dynamic left side reads through the interface
  if (op.endsWith('=') && leftDynamic) {
    const binOp = op.slice(0, -1);
    const converted = isConcat
      ? `${visit(node.left)} + ${visit(node.right)}`
      : `TnAs[float64](${visit(node.left)}) ${binOp} ${operand(node.right, rightDynamic)}`;
    useHelper('dynamic');
    return `${visit(node.left)} = ${converted}`;
  }
  return `${operand(node.left, leftDynamic && !op.endsWith('='))} ${op} ${operand(node.right, rightDynamic)}`;
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
  if (goType === 'float64') {
    useHelper('dynamic');
    return `TnNumStr(${code})`;
  }
  if (goType === 'bool') {
    importedPackages.add('strconv');
    return `strconv.FormatBool(${code})`;
  }
  importedPackages.add('fmt');
  return `fmt.Sprintf("%v", ${code})`;
}

// JS bitwise operators work on 32-bit integers (ToInt32 / ToUint32)
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
  useHelper('dynamic');
  const left = visit(node.left);
  const right = visit(node.right);
  let value: string;
  if (bitOp === '>>>') value = `float64(TnUint32(${left}) >> (TnUint32(${right}) & 31))`;
  else if (bitOp === '<<' || bitOp === '>>') {
    value = `float64(TnInt32(${left}) ${bitOp} (TnUint32(${right}) & 31))`;
  } else value = `float64(TnInt32(${left}) ${bitOp} TnInt32(${right}))`;
  const isAssignment = kind.endsWith('EqualsToken');
  return isAssignment ? `${left} = ${value}` : value;
}

// delete obj.key / delete obj[key] on maps (Records and dynamic objects)
function visitDelete(node: AstNode): string {
  const target = unwrapParentheses(node.expression);
  const object = target.expression;
  const key = isPropertyAccessExpression(target)
    ? toGoStringLiteral(target.name.text)
    : visit(target.argumentExpression);
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
      result.push(`${visit(arg.expression)}...`);
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
function fieldInitializers(classNode: AstNode): string {
  return (classNode.members ?? [])
    .filter(
      (m: AstNode) =>
        isPropertyDeclaration(m) &&
        m.initializer &&
        (isIdentifier(m.name) || m.name?.kind === 'PrivateIdentifier') &&
        !(m.modifiers ?? []).some((mod: AstNode) => mod.kind === 'StaticKeyword')
    )
    .map((m: AstNode) => {
      const fieldName = m.name.kind === 'PrivateIdentifier' ? m.name.text.slice(1) : m.name.text;
      return `self.${goFieldName(fieldName)} = ${toGoValueOfType(m.initializer, getPropertyDeclarationType(m))}\n\t\t`;
    })
    .join('');
}

// A class field's type: declared, else inferred from its initializer (n = 1 → float64)
function getPropertyDeclarationType(member: AstNode): string {
  if (member.type || !member.initializer) return getOptionalNodeType(member.type, !!member.questionToken);
  return toFieldGoType(inferExpressionType(member.initializer));
}

function isIncrementOrDecrement(node: AstNode): boolean {
  return node.operator === 'PlusPlusToken' || node.operator === 'MinusMinusToken';
}

// x++ / ++x: Go only has the statement form, so used as a value they become
// a closure returning the old (postfix) or new (prefix) value
function visitIncrementOrDecrement(node: AstNode, isPrefix: boolean): string {
  const target = visit(node.operand, { inline: true });
  const op = node.operator === 'PlusPlusToken' ? '++' : '--';
  const parent = node.parent;
  const isStatement =
    isExpressionStatement(parent) || (isForStatement(parent) && parent.incrementor === node);
  if (isStatement) return `${target}${op}`;
  if (isPrefix) return `func() float64 { ${target}${op}; return ${target} }()`;
  return `func() float64 { __old := ${target}; ${target}${op}; return __old }()`;
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
  return (node.properties ?? []).some(
    (p: AstNode) => p.kind === 'SpreadAssignment' && isDynamicValue(p.expression)
  );
}

function getObjectLiteralGoType(node: AstNode): string {
  if (isDynamicObjectLiteral(node)) return 'interface{}';
  const contextualType = resolveTypeNode(getContextualTypeNode(node));
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
    if (!isPropertyAssignment(p) && !isShorthandPropertyAssignment(p)) continue;
    const value = isPropertyAssignment(p) ? p.initializer : p.name;
    fields.set(goFieldName(p.name.text), toFieldGoType(inferExpressionType(value)));
  }
  return `*struct{ ${structFieldsBody(fields)} }`;
}

// Values typed `any`/`unknown` are handled at runtime (TnGet/TnSet/...),
// never by guessing their type
function isDynamicValue(expr: AstNode): boolean {
  return inferExpressionType(expr) === 'interface{}';
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

// { a: 1 } typed as Record<K, V> → map[K]V{"a": 1}
// An ordered map built from "key, value" entries (in source order)
function orderedMapLiteral(keyType: string, valueType: string, entries: string[]): string {
  useHelper('orderedMap');
  const constructor = `TnNewMap[${keyType}, ${valueType}]()`;
  if (entries.length === 0) return constructor;
  const sets = entries.map((e) => `.Set(${e})`).join('');
  return `${constructor}${sets}`;
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
    if ((isMethodDeclaration(p) || isGetAccessor(p)) && isIdentifier(p.name)) {
      const field = goFieldName(p.name.text);
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
    if (isSetAccessor(p)) continue;
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
    const alias = declaredTypeAliases.get(typeNode.typeName.text);
    if (alias && alias.kind !== 'TypeLiteral') return resolveTypeNode(alias, depth + 1);
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
      isGetAccessor(current)
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
  if (isRecordTypeNode(resolved)) return resolved.typeArguments[1];
  let members: AstNode[] = [];
  if (resolved.kind === 'TypeLiteral') {
    members = resolved.members ?? [];
  } else if (isTypeReferenceNode(resolved) && isIdentifier(resolved.typeName)) {
    const aliasLiteral = declaredTypeAliases.get(resolved.typeName.text);
    if (aliasLiteral?.kind === 'TypeLiteral') members = aliasLiteral.members ?? [];
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
  }
  return undefined;
}

// The type an expression is expected to have from where it appears
// (TypeScript's "contextual type"), derived syntactically from declarations
// Declared type nodes of variables/parameters in scope (latest declaration wins)
const variableTypeNodes = new Map<string, AstNode>();

// Declared type (as a type node) of an assignable expression, when known
function getExpressionTypeNode(expr: AstNode): AstNode | undefined {
  if (isIdentifier(expr)) return variableTypeNodes.get(expr.text);
  if (isParenthesizedExpression(expr)) return getExpressionTypeNode(expr.expression);
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
      return getContextualTypeNode(parent);
    }
    if (op === 'EqualsToken' && parent.right === node) {
      return getExpressionTypeNode(parent.left);
    }
  }
  if (isAsExpression(parent) || isTypeAssertionExpression(parent)) return parent.type;
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
    return getReturnTypeNode(parent);
  }
  if (isCallExpression(parent) && isIdentifier(parent.expression)) {
    const index = (parent.arguments ?? []).indexOf(node);
    const fn = declaredFunctions.get(parent.expression.text);
    if (index > -1 && fn) return fn.parameters?.[index]?.type;
  }
  if (
    isPropertyAssignment(parent) &&
    parent.initializer === node &&
    (isIdentifier(parent.name) || isStringLiteral(parent.name))
  ) {
    const objectType = getContextualTypeNode(parent.parent);
    return objectType ? getMemberTypeNode(objectType, parent.name.text) : undefined;
  }
  if (isArrayLiteralExpression(parent)) {
    const arrayType = resolveTypeNode(getContextualTypeNode(parent));
    if (isArrayTypeNode(arrayType)) return arrayType.elementType;
  }
  return undefined;
}

// Element type of an array literal: from its contextual type (declared
// variable/parameter/return type), else inferred from its first typed element
function getArrayLiteralElementType(node: AstNode): string {
  const contextual = resolveTypeNode(getContextualTypeNode(node));
  if (isArrayTypeNode(contextual)) {
    const elem = getType(contextual.elementType);
    // An unbound type parameter (call-site []T) resolves from the elements
    if (!isUnboundGoType(elem)) return elem;
  }
  if (contextual?.kind === 'TupleType') return getTupleElementType(contextual);
  if (
    isTypeReferenceNode(contextual) &&
    isIdentifier(contextual.typeName) &&
    contextual.typeName.text === 'Array' &&
    contextual.typeArguments?.length === 1
  ) {
    const elem = getType(contextual.typeArguments[0]);
    if (!isUnboundGoType(elem)) return elem;
  }
  for (const element of node.elements ?? []) {
    if (isSpreadElement(element)) {
      const spreadType = inferExpressionType(element.expression);
      if (spreadType?.startsWith('[]')) return spreadType.slice(2);
      if (spreadType === 'string') return 'string';
      if (spreadType?.startsWith('*TnMap[') && extractMapValueType(spreadType) === 'struct{}') {
        return extractMapKeyType(spreadType);
      }
      continue;
    }
    const elementType = inferExpressionType(element);
    if (elementType && elementType !== 'nil' && !isUnboundGoType(elementType)) return elementType;
  }
  return 'interface{}';
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
  if (!isArrowFunction(fn) && !isFunctionExpression(fn)) return undefined;
  const contextual = resolveTypeNode(getContextualTypeNode(fn));
  return isFunctionTypeNode(contextual) ? contextual : undefined;
}

function unwrapParentheses(expr: AstNode): AstNode {
  while (isParenthesizedExpression(expr)) expr = expr.expression;
  return expr;
}

function getTupleElementType(tuple: AstNode): string {
  const types = (tuple.elements ?? []).map((t: AstNode) => getType(t.kind === 'NamedTupleMember' ? t.type : t));
  return types.length > 0 && types.every((t: string) => t === types[0]) ? types[0] : 'interface{}';
}

function getTypeText(typeNode: AstNode): string {
  if (!typeNode) return ':';
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    return typeNode.typeName.text;
  }
  return getType(typeNode);
}

function toGoStringLiteral(value: string): string {
  return JSON.stringify(value);
}

// A spread source as a Go slice; Sets spread their elements (map keys) and
// strings spread into []string of runes (like JS [...str])
function visitSpreadSource(expr: AstNode): string {
  const sourceType = inferExpressionType(expr);
  if (sourceType?.startsWith('*TnMap[') && extractMapValueType(sourceType) === 'struct{}') {
    return `${visit(expr)}.Keys()`;
  }
  if (sourceType === 'string') {
    return `func() []string { __parts := []string{}; for _, __r := range ${visit(expr)} { __parts = append(__parts, string(__r)) }; return __parts }()`;
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
      result = `append(${result}, ${visitSpreadSource(chunk.items[0])}...)`;
    } else {
      result = `append(${result}, ${chunk.items.map((e) => visit(e)).join(', ')})`;
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
  if (isIdentifier(expr.expression)) return expr.expression.text === 'assert';
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
    return inferExpressionType(node.body as AstNode);
  }
  if (node.body && isBlock(node.body)) {
    for (const stmt of node.body.statements) {
      if (isReturnStatement(stmt) && stmt.expression) {
        const exprType = inferExpressionType(stmt.expression);
        if (exprType) return exprType;
      }
    }
  }
  return undefined;
}

function inferArrowFunctionGoType(node: AstNode | AstNode): string {
  // Mirrors getFunctionParametersInfo: trailing defaulted parameters become
  // a variadic `...interface{}`
  const parameters: AstNode[] = node.parameters ?? [];
  const firstDefaultIndex = parameters.findIndex((p) => !!p.initializer);
  const hasTrailingDefaults =
    firstDefaultIndex > -1 && !parameters.slice(firstDefaultIndex).some((p) => !p.initializer);
  const paramTypes = (hasTrailingDefaults ? parameters.slice(0, firstDefaultIndex) : parameters).map(
    (p) => getParameterGoType(p)
  );
  if (hasTrailingDefaults) paramTypes.push('...interface{}');
  const params = paramTypes.join(', ');
  const retType = inferFunctionBodyReturnType(node);
  return `func(${params})${retType ? ` ${retType}` : ''}`;
}

function inferExpressionType(expr: AstNode): string | undefined {
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
  if (
    isStringLiteral(expr) ||
    isNoSubstitutionTemplateLiteral(expr) ||
    isTemplateExpression(expr)
  ) {
    return 'string';
  }
  if (isNumericLiteral(expr)) return 'float64';
  if (expr.kind === 'BigIntLiteral') return '*tnbig.Int';
  if (expr.kind === 'TypeOfExpression') return 'string';
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
    let varType: string | undefined = variableGoTypes.get(expr.text);
    // Array references are read as the slice they point to
    if (varType?.startsWith('*[]')) varType = varType.slice(1);
    return narrowedVariables.has(expr.text) && varType?.startsWith('*') ? varType.slice(1) : varType;
  }
  if (isArrayLiteralExpression(expr)) {
    return `[]${getArrayLiteralElementType(expr)}`;
  }
  if (isObjectLiteralExpression(expr)) return getObjectLiteralGoType(expr);
  if (isNewExpression(expr) && isIdentifier(expr.expression)) {
    const ctorName = expr.expression.text;
    if (classNames.has(ctorName)) return `*${ctorName}`;
    if (ctorName === 'Error') return '*TnError';
    if (ctorName === 'Promise' && (expr.typeArguments ?? []).length > 0) {
      return `chan ${getType(expr.typeArguments[0]) || 'struct{}'}`;
    }
    const typeArguments = getCollectionTypeArguments(expr);
    if (ctorName === 'Array' && (expr.typeArguments ?? []).length === 1) {
      return `[]${getType(expr.typeArguments[0])}`;
    }
    if (ctorName === 'Date') {
      return 'time.Time';
    }
    if (ctorName === 'Map' && typeArguments.length === 2) {
      return mapGoType(getType(typeArguments[0]), getType(typeArguments[1]));
    }
    if (ctorName === 'Set' && typeArguments.length === 1) {
      return mapGoType(getType(typeArguments[0]), 'struct{}');
    }
    if (ctorName === 'Set' && expr.arguments?.length && isArrayLiteralExpression(expr.arguments[0])) {
      return mapGoType(getArrayLiteralElementType(expr.arguments[0]), 'struct{}');
    }
  }

  if (isElementAccessExpression(expr)) {
    const objectType = inferExpressionType(expr.expression);
    if (objectType === 'string') return 'string';
    if (objectType?.startsWith('[]')) return objectType.slice(2);
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
    (isPrefixUnaryExpression(expr) || isPostfixUnaryExpression(expr)) &&
    ['MinusToken', 'PlusToken', 'TildeToken', 'PlusPlusToken', 'MinusMinusToken'].includes(expr.operator)
  ) {
    return 'float64';
  }
  if (isCallExpression(expr)) {
    const callee = isIdentifier(expr.expression)
      ? expr.expression.text
      : isPropertyAccessExpression(expr.expression) && isIdentifier(expr.expression.expression)
        ? `${expr.expression.expression.text}.${expr.expression.name.text}`
        : undefined;
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
    const nodeResultType = callee ? nodeCallResultTypes.get(callee) : undefined;
    if (callee && BUILTIN_CALL_TYPES[callee]) return BUILTIN_CALL_TYPES[callee];
    if (callee?.startsWith('Math.')) return 'float64';
    if (nodeResultType) return nodeResultType;
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
    }
  }
  if (isCallExpression(expr) && isIdentifier(expr.expression)) {
    const builtinType = BUILTIN_FUNCTION_TYPES[expr.expression.text];
    if (builtinType && !declaredFunctions.has(expr.expression.text)) return builtinType;
  }

  if (isPropertyAccessExpression(expr) && expr.name.text === 'length' && isDynamicValue(expr.expression)) {
    return 'float64';
  }
  if ((isPropertyAccessExpression(expr) || isElementAccessExpression(expr)) && isDynamicValue(expr.expression)) {
    return 'interface{}';
  }
  if (
    isCallExpression(expr) &&
    isPropertyAccessExpression(expr.expression) &&
    isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'Array' &&
    expr.expression.name.text === 'from'
  ) {
    return '[]interface{}';
  }
  if (isCallExpression(expr) && isObjectKeysOfDynamic(expr)) return '[]string';
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
  if (isPropertyAccessExpression(expr)) {
    const narrowingKey = getNarrowingKey(expr);
    if (narrowingKey && narrowedVariables.has(narrowingKey)) {
      // Narrowed: the declared (pointer) type without its pointer
      narrowedVariables.delete(narrowingKey);
      const nullableType = inferExpressionType(expr);
      narrowedVariables.add(narrowingKey);
      if (nullableType?.startsWith('*')) return nullableType.slice(1);
    }
    if (isIdentifier(expr.expression) && enumNames.has(expr.expression.text)) {
      // Numeric enums are float64 constants; string enums keep their type
      if (enumBaseTypes.get(expr.expression.text) === 'float64') return 'float64';
      const enumType = getSafeName(expr.expression.text);
      return enumType;
    }
    const leftType = inferExpressionType(expr.expression);
    if (expr.name.text === 'length') return 'float64';

    const resolvedLeftType = leftType?.replace(/^\*/, '').replace(/\[.*\]$/, '');
    const resolvedPropertyType = resolvedLeftType
      ? (classPropertyTypes.get(resolvedLeftType)?.get(expr.name.text) ??
        interfacePropertyTypes.get(resolvedLeftType)?.get(expr.name.text))
      : undefined;

    if (hasQuestionDot(expr)) {
      if (leftType && leftType.startsWith('*')) {
        const memberType =
          resolvedPropertyType ??
          getStructFieldGoType(leftType.slice(1), expr.name.text) ??
          'interface{}';
        return makeNullableType(memberType);
      }
      return 'interface{}';
    }

    if (resolvedPropertyType) {
      return resolvedPropertyType;
    }
    const structFieldType = leftType ? getStructFieldGoType(leftType.replace(/^\*/, ''), expr.name.text) : undefined;
    if (structFieldType) return structFieldType;

    if (isIdentifier(expr.expression)) {
      const className = variableClassNames.get(expr.expression.text);
      const memberType = className
        ? classPropertyTypes.get(className)?.get(expr.name.text)
        : undefined;
      if (memberType) return memberType;
    }
  }

  if (isCallExpression(expr) && isIdentifier(expr.expression)) {
    const fn = declaredFunctions.get(expr.expression.text);
    if (fn?.type) return getType(fn.type);
    const fnValueType = variableGoTypes.get(expr.expression.text);
    if (fnValueType?.startsWith('func(')) return goFuncReturnType(fnValueType);
  }

  if (isCallExpression(expr) && isPropertyAccessExpression(expr.expression)) {
    const methodName = expr.expression.name.text;
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
          methodName === 'getFullYear') return 'float64';
      if (methodName === 'toISOString' || methodName === 'toJSON' || methodName === 'toString' ||
          methodName === 'toDateString' || methodName === 'toTimeString') return 'string';
    }

    if (ownerType && ownerType.startsWith('*TnMap[')) {
      if (methodName === 'has') return 'bool';
      if (methodName === 'get') {
        const valueType = extractMapValueType(ownerType);
        return isStructGoType(valueType) ? `*${valueType}` : valueType;
      }
    }

    if (isArrayLikeGoType(ownerType)) {
      const elementType = getArrayElementTypeFromGoType(ownerType!);
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
      if (methodName === 'flat' && elementType.startsWith('[]')) return elementType;
      if (methodName === 'flat' || methodName === 'flatMap') return `[]${elementType}`;
      if (methodName === 'entries') return '[][]interface{}';
      if (methodName === 'find') return elementType;
      if (methodName === 'join') return 'string';
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
    // BigInt operands stay bigint
    if (
      ['AsteriskToken', 'SlashToken', 'PercentToken', 'AsteriskAsteriskToken', 'PlusToken', 'MinusToken'].includes(
        kind
      ) &&
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
      const isString = [expr.left, expr.right].some((side) => inferExpressionType(side) === 'string');
      return isString ? 'string' : 'float64';
    }
    if (['LessThanToken', 'GreaterThanToken', 'LessThanEqualsToken', 'GreaterThanEqualsToken'].includes(kind)) {
      return 'bool';
    }
  }

  return undefined;
}

const BUILTIN_CALL_TYPES: Record<string, string> = {
  'Number.isNaN': 'bool',
  'Number.isFinite': 'bool',
  'Number.isInteger': 'bool',
  isNaN: 'bool',
  'Object.assign': '*TnMap[string, interface{}]',
  'Date.now': 'float64'
};

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
  String: 'string'
};

const STRING_METHOD_RETURN_TYPES: Record<string, string> = {
  trim: 'string',
  trimStart: 'string',
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
  localeCompare: 'float64'
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
  return truthinessCheck(visit(expr, { inline: true }), inferExpressionType(expr));
}

function truthinessCheck(code: string, goType: string | undefined): string {
  if (!goType || goType === 'bool' || goType === ':') return code;
  if (goType === 'interface{}') {
    useHelper('dynamic');
    return `TnTruthy(${code})`;
  }
  if (NULLABLE_PRIMITIVE_TYPES.includes(goType) && !/^[\w.()*]+$/.test(code)) {
    return `func() bool { __t := ${code}; return ${truthinessCheck('__t', goType)} }()`;
  }
  // structs (value types) are always truthy
  if (isStructGoType(goType)) return 'true';
  if (goType === 'string') return `${code} != ""`;
  if (goType === 'float64') return `${code} != 0`;
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
  return code;
}

// Parenthesizes a condition unless it is already atomic
function wrapCondition(condition: string): string {
  return /^[\w.]+$/.test(condition) || /^\(.*\)$/.test(condition) ? condition : `(${condition})`;
}

// `a || b` with non-bool operands is a value (JS returns an operand), not a bool
function isLogicalValueExpression(expr: AstNode): boolean {
  if (expr.operatorToken.kind !== 'BarBarToken') return false;
  const leftType = inferExpressionType(expr.left);
  const rightType = inferExpressionType(expr.right);
  return !!leftType && leftType !== 'bool' && !!rightType && rightType !== 'bool';
}

function getLogicalValueType(expr: AstNode): string {
  const leftType = inferExpressionType(expr.left)!;
  const rightType = inferExpressionType(expr.right);
  if (rightType === 'nil') return makeNullableType(leftType);
  if (leftType.startsWith('*') && rightType === leftType.slice(1)) return rightType;
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
  const resultType = getLogicalValueType(expr);
  const tmp = getTempName('or');
  let leftValue = tmp;
  if (leftType!.startsWith('*') && resultType === leftType!.slice(1)) leftValue = `*${tmp}`;
  else if (resultType === `*${leftType}`) leftValue = `&${tmp}`;
  return `func() ${resultType} { ${tmp} := ${visit(expr.left)}; if ${truthinessCheck(tmp, leftType)} { return ${leftValue} }; return ${toGoValueOfType(expr.right, resultType)} }()`;
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
function isObjectTypeName(name: string): boolean {
  const alias = declaredTypeAliases.get(name) ?? typeAliases.get(name);
  if (alias) return alias.kind === 'TypeLiteral';
  const iface = declaredInterfaces.get(name);
  if (iface) {
    const members: AstNode[] = iface.members ?? [];
    return members.some((m) => isPropertySignature(m)) && !members.some((m) => isMethodSignature(m));
  }
  return interfacePropertyTypes.has(name);
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

  return `func() ${resultType} { if ${toGoCondition(node.condition)} { return ${whenTrue} }; return ${whenFalse} }()`;
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
  if (!leftValueType) return rightType;
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
      steps.push(
        `if ${tmp} := ${visit(operand)}; ${tmp} != nil { return ${convertGoValue(tmp, operandType, resultType)} }`
      );
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
  // dynamic (any) values hold the concrete type at runtime
  if (fromType === 'interface{}' && toType !== 'interface{}') return `${variable}.(${toType})`;
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
  return (
    goType.startsWith('*') ||
    goType.startsWith('[]') ||
    goType.startsWith('map[') ||
    goType.startsWith('func') ||
    goType.startsWith('chan ') ||
    goType === 'interface{}'
  );
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
  const propertyAccess = `${tmp}.${visit(node.name)}`;

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
    if (isBlock(callback.body)) {
      return inferFunctionBodyReturnType(callback) ?? fallbackType;
    }
    const inferred = inferExpressionType(callback.body);
    return inferred ?? fallbackType;
  }

  if (isIdentifier(callback)) {
    const knownType = variableGoTypes.get(callback.text);
    if (knownType) return knownType;
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
    (callback.parameters ?? []).slice(0, paramTypes.length).forEach((p: AstNode, index: number) => {
      if (isIdentifier(p.name)) registerLocalVariable(p.name.text, paramTypes[index]);
    });
    const callbackReturnType =
      forcedReturnType ?? inferArrayCallbackReturnType(callback, elementType, elementType);

    const params = (callback.parameters ?? [])
      .slice(0, paramTypes.length)
      .map((p: AstNode, index: number) => `${visit(p.name)} ${paramTypes[index]}`);

    const body = isBlock(callback.body)
      ? visit(callback.body, { inline: true })
      : forcedReturnType === 'bool'
        ? `{ return ${toGoCondition(callback.body)}; }`
        : forcedReturnType === ''
          ? `{ ${visit(unwrapParentheses(callback.body))}; }`
          : `{ return ${visit(callback.body)}; }`;

    return {
      fnExpr: `func(${params.join(', ')}) ${callbackReturnType} ${body}`,
      paramCount,
      returnType: callbackReturnType
    };
  }

  return {
    fnExpr: visit(callback),
    paramCount: 1,
    returnType: forcedReturnType ?? 'interface{}'
  };
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
  if (!isPropertyAccessExpression(node.expression)) return undefined;

  const methodName = node.expression.name.text;
  if (!['map', 'filter', 'some', 'find', 'findIndex', 'findLast', 'findLastIndex', 'every', 'forEach', 'reduce', 'join', 'entries', 'flatMap'].includes(methodName)) {
    return undefined;
  }

  const arrayExprNode = node.expression.expression;
  const arrayExpr = visit(arrayExprNode);
  const ownerType = inferExpressionType(arrayExprNode);
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
    importedPackages.add('fmt');
    // join() with no argument defaults to "," in JS
    const separator = (node.arguments ?? [])[0] ? visit((node.arguments ?? [])[0]) : '","';
    const arrVar = getTempName('arrjoin');
    const partsVar = getTempName('parts');
    return `func() string { ${arrVar} := ${arrayExpr}; ${partsVar} := make([]string, len(${arrVar})); for i, v := range ${arrVar} { ${partsVar}[i] = fmt.Sprintf("%v", v) }; return strings.Join(${partsVar}, ${separator}) }()`;
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
  const aliasType = typeAliases.get(name);
  if (!aliasType) return undefined;

  if (seen.has(name)) return undefined;
  if (isTypeReferenceNode(aliasType) && isIdentifier(aliasType.typeName)) {
    const nestedName = aliasType.typeName.text;
    if (typeAliases.has(nestedName)) {
      seen.add(name);
      return getAliasType(nestedName, seen) ?? aliasType;
    }
  }

  return aliasType;
}

function getOptionalNodeType(typeNode: AstNode | undefined, isOptional: boolean): string {
  const baseType = typeNode ? getType(typeNode) : 'interface{}';
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

function getEnumBaseType(node: AstNode): 'string' | 'float64' {
  for (const member of (node.members ?? [])) {
    const initializer = member.initializer;
    if (!initializer) continue;
    if (isStringLiteral(initializer) || isNoSubstitutionTemplateLiteral(initializer)) {
      return 'string';
    }
  }
  return 'float64';
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

function visitEnumDeclaration(node: AstNode): string {
  const enumName = getSafeName(node.name.text);
  const baseType = enumBaseTypes.get(node.name.text) ?? getEnumBaseType(node);

  let nextNumericValue = 0;
  let canAutoIncrement = true;
  const members: string[] = [];

  for (const member of (node.members ?? [])) {
    const memberName = getEnumMemberName(member.name);
    const symbolName = `${enumName}_${memberName}`;

    let valueExpr: string;
    if (member.initializer) {
      if (baseType === 'float64') {
        const numericValue = readNumericEnumInitializer(member.initializer);
        if (numericValue !== undefined) {
          valueExpr = `${numericValue}`;
          nextNumericValue = numericValue + 1;
          canAutoIncrement = true;
        } else {
          valueExpr = `float64(${visit(member.initializer)})`;
          canAutoIncrement = false;
        }
      } else {
        valueExpr = visit(member.initializer);
      }
    } else if (baseType === 'float64') {
      const currentValue = canAutoIncrement ? nextNumericValue : 0;
      valueExpr = `${currentValue}`;
      nextNumericValue = currentValue + 1;
    } else {
      valueExpr = toGoStringLiteral(memberName);
    }

    members.push(`\t${symbolName} ${enumName} = ${enumName}(${valueExpr})`);
  }

  // Numeric enums are plain float64 constants so they compare against numbers;
  // string enums keep a named type
  if (baseType === 'float64') {
    return `const (\n${members
      .map((m) => {
        const name = m.slice(m.indexOf('\t') + 1, m.indexOf(' '));
        const value = m.slice(m.lastIndexOf('=') + 1).trim();
        // Strip the enum conversion wrapper: Dir(0) → 0
        const plain = value.startsWith(`${enumName}(`) && value.endsWith(')')
          ? value.slice(enumName.length + 1, -1)
          : value;
        return `\t${name} float64 = ${plain}`;
      })
      .join('\n')}\n)`;
  }

  return `type ${enumName} ${baseType}\n\nvar (\n${members.join('\n')}\n)`;
}

function getType(typeNode: AstNode, getArrayType = false): string {
  if (!typeNode) return ':';
  if (typeNode.kind === 'ParenthesizedType') return getType(typeNode.type, getArrayType);
  if (isArrayTypeNode(typeNode)) {
    const elementType = getType(typeNode.elementType);
    return getArrayType ? elementType : `[]${elementType}`;
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
    // Non-nullable union or multi-type union → interface{}
    return 'interface{}';
  }
  if (isFunctionTypeNode(typeNode)) {
    const params = (typeNode.parameters ?? [])
      .map((p) => (p.type ? getType(p.type) : 'interface{}'))
      .join(', ');
    const ret = typeNode.type ? ` ${getType(typeNode.type)}` : '';
    return `func(${params})${ret}`;
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
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    if (enumNames.has(name)) {
      // Numeric enums lowered to float64 constants have no named type
      if (enumBaseTypes.get(name) === 'float64') return 'float64';
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
    if (name === 'RegExp') {
      return '*regexp.Regexp';
    }
    if (name === 'Error') {
      return '*TnError';
    }
    if (name === 'RegExpExecArray' || name === 'RegExpMatchArray') {
      return '[]string';
    }
    if (name === 'TemplateStringsArray' || name === 'ReadonlyArray') {
      return name === 'TemplateStringsArray' ? '[]string' : getType(typeNode.typeArguments?.[0]);
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
    const typeArgs = getTypeArguments(typeNode.typeArguments);
    if (classNames.has(name) || isObjectTypeName(name)) {
      return `*${name}${typeArgs}`;
    }
    return `${name}${typeArgs}`;
  }

  // { a: T; b?: U } → struct{ a T; b *U }
  if (typeNode.kind === 'TypeLiteral') {
    const fields = (typeNode.members ?? [])
      .filter((m) => isPropertySignature(m) && isIdentifier(m.name))
      .map((m) => `${goFieldName(m.name.text)} ${getOptionalNodeType(m.type, !!m.questionToken)}`);
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
      return '';
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
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    if (name === 'Map') return 'Map';
    if (name === 'Set') return 'Set';
    if (classNames.has(name)) return 'class';
    return name;
  }
  return undefined;
}

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
    return variableTypes.get(expr.text) ?? goTypeCategory(variableGoTypes.get(expr.text));
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
  if (goType.startsWith('*[]')) goType = goType.slice(1);
  if (goType.startsWith('[]')) return 'array';
  if (goType === 'string') return 'string';
  if (goType === '*regexp.Regexp' || goType === '*TnRegex') return 'RegExp';
  if (goType === 'time.Time') return 'Date';
  return undefined;
}

function isNilLiteral(node: AstNode): boolean {
  if (node.kind === 'NullKeyword') return true;
  if (isIdentifier(node) && node.text === 'undefined') return true;
  return false;
}

function getAcessString(leftSide: string, rightSide: string, objectType?: string): string {
  if (rightSide === 'length' && objectType === 'string') {
    // JS .length counts UTF-16 code units; rune count matches for the BMP
    importedPackages.add('unicode/utf8');
    return `float64(utf8.RuneCountInString(${leftSide}))`;
  }
  if (rightSide === 'length' && objectType !== 'class') {
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

  if (leftSide === 'Number') {
    const constants: Record<string, string> = {
      MAX_SAFE_INTEGER: 'float64(9007199254740991)',
      MIN_SAFE_INTEGER: 'float64(-9007199254740991)',
      EPSILON: 'float64(2.220446049250313e-16)'
    };
    if (constants[rightSide]) return constants[rightSide];
    if (rightSide === 'MAX_VALUE' || rightSide === 'POSITIVE_INFINITY' || rightSide === 'NaN') {
      importedPackages.add('math');
      if (rightSide === 'MAX_VALUE') return 'math.MaxFloat64';
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
  'console.log': (_caller, args) => {
    importedPackages.add('fmt');
    return `fmt.Println(${args.join(', ')})`;
  },
  'console.time': (_caller, args) => {
    importedPackages.add('time');
    return `${getTimerName(args[0])} := time.Now()`;
  },
  'console.timeEnd': (_caller, args) => {
    importedPackages.add('time');
    importedPackages.add('fmt');
    return `fmt.Println("Elapsed time:", time.Since(${getTimerName(args[0])}))`;
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
    return `TnJSONStringify(${args[0]}, ${args.length >= 3 ? '"  "' : '""'})`;
  },
  'JSON.parse': (_caller, args) => {
    importedPackages.add('encoding/json');
    return `func() interface{} { var __v interface{}; json.Unmarshal([]byte(${args[0]}), &__v); return __v }()`;
  },
  'Object.keys': (_caller, args) => `${args[0]}.Keys()`,
  'Object.values': (_caller, args) => `${args[0]}.Values()`,
  // Outside for...of (which iterates the map directly): [key, value] pairs
  'Object.entries': (_caller, args) => `${args[0]}.Entries()`,
  // Object.assign copies sources into a fresh ordered map (mutating structs is
  // not observable the way it is in JS)
  'Object.assign': (_caller, args) => {
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
    return 'float64(time.Now().UnixMilli())';
  },
  'console.error': (_caller, args) => {
    importedPackages.add('fmt');
    importedPackages.add('os');
    return `fmt.Fprintln(os.Stderr, ${args.join(', ')})`;
  },
  'console.warn': (_caller, args) => {
    importedPackages.add('fmt');
    importedPackages.add('os');
    return `fmt.Fprintln(os.Stderr, ${args.join(', ')})`;
  },
  'Array.isArray': (_caller, args) => {
    importedPackages.add('reflect');
    return `(reflect.ValueOf(${args[0]}).Kind() == reflect.Slice)`;
  },
  'String': (_caller, args) => {
    importedPackages.add('fmt');
    return `fmt.Sprintf("%v", ${args[0]})`;
  },
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
    return `math.IsNaN(${args[0]})`;
  },
  isNaN: (_caller, args) => {
    importedPackages.add('math');
    return `math.IsNaN(${args[0]})`;
  },
  'Number.isFinite': (_caller, args) => {
    importedPackages.add('math');
    return `!math.IsInf(${args[0]}, 0) && !math.IsNaN(${args[0]})`;
  },
  'Number.isInteger': (_caller, args) => {
    importedPackages.add('math');
    return `(${args[0]} == math.Trunc(${args[0]}) && !math.IsInf(${args[0]}, 0))`;
  },
  'Boolean': (_caller, args) => {
    return `(${args[0]} != nil && ${args[0]} != false && ${args[0]} != 0 && ${args[0]} != "")`;
  },
};

type MethodHandler = (obj: string, args: string[]) => string;

const stringMethodHandlers: Record<string, MethodHandler> = {
  split: (obj, args) => {
    if (args[0]?.startsWith('regexp.MustCompile(')) return `${args[0]}.Split(${obj}, -1)`;
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `${args[0]}.SplitStr(${obj}, -1)`;
    }
    importedPackages.add('strings');
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
  indexOf: (obj, args) => {
    importedPackages.add('strings');
    return `float64(strings.Index(${obj}, ${args[0]}))`;
  },
  charCodeAt: (obj, args) => `float64(${obj}[int(${args[0]})])`,
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
  charAt: (obj, args) => `string(${obj}[int(${args[0]})])`,
  substring: (obj, args) => {
    if (args.length >= 2) return `${obj}[${sliceIndex(obj, args[0])}:${sliceIndex(obj, args[1])}]`;
    return `${obj}[${sliceIndex(obj, args[0])}:]`;
  },
  slice: (obj, args) => {
    if (args.length >= 2) return `${obj}[${sliceIndex(obj, args[0])}:${sliceIndex(obj, args[1])}]`;
    return `${obj}[${sliceIndex(obj, args[0])}:]`;
  },
  concat: (obj, args) => `${obj} + ${args.join(' + ')}`,
  padStart: (obj, args) => {
    importedPackages.add('strings');
    const pad = args[1] ?? '" "';
    return `func() string { __s := ${obj}; __n := int(${args[0]}) - len(__s); if __n > 0 { __s = strings.Repeat(${pad}, __n)[:__n] + __s }; return __s }()`;
  },
  padEnd: (obj, args) => {
    importedPackages.add('strings');
    const pad = args[1] ?? '" "';
    return `func() string { __s := ${obj}; __n := int(${args[0]}) - len(__s); if __n > 0 { __s = __s + strings.Repeat(${pad}, __n)[:__n] }; return __s }()`;
  },
  match: (obj, args) => {
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `${args[0]}.FindSub(${obj})`;
    }
    return `${toGoRegexp(args[0])}.FindStringSubmatch(${obj})`;
  },
  matchAll: (obj, args) => {
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `${args[0]}.FindAllSub(${obj})`;
    }
    return `${toGoRegexp(args[0])}.FindAllStringSubmatch(${obj}, -1)`;
  },
  search: (obj, args) => {
    if (isTnRegexArg(args[0])) {
      useHelper('fancyRegex');
      return `func() float64 { __loc := ${args[0]}.FindIndexSub(${obj}); if __loc == nil { return -1 }; return float64(__loc[0]) }()`;
    }
    return `func() float64 { __loc := ${toGoRegexp(args[0])}.FindStringIndex(${obj}); if __loc == nil { return -1 }; return float64(__loc[0]) }()`;
  },
  lastIndexOf: (obj, args) => {
    importedPackages.add('strings');
    return `float64(strings.LastIndex(${obj}, ${args[0]}))`;
  },
  at: (obj, args) => {
    return `func() string { __i := int(${args[0]}); if __i < 0 { __i = len(${obj}) + __i }; return string(${obj}[__i]) }()`;
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
    return `${obj}.FindStringSubmatch(${args[0]})`;
  }
};

const dateMethodHandlers: Record<string, MethodHandler> = {
  getTime: (obj) => `float64((${obj}).UnixMilli())`,
  getMilliseconds: (obj) => `float64((${obj}).Millisecond())`,
  getSeconds: (obj) => `float64((${obj}).Second())`,
  getMinutes: (obj) => `float64((${obj}).Minute())`,
  getHours: (obj) => `float64((${obj}).Hour())`,
  getDate: (obj) => `float64((${obj}).Day())`,
  getDay: (obj) => `float64(int((${obj}).Weekday()))`,
  getMonth: (obj) => `float64(int((${obj}).Month()) - 1)`,
  getFullYear: (obj) => `float64((${obj}).Year())`,
  toISOString: (obj) => `(${obj}).UTC().Format("2006-01-01T15:04:05.000Z07:00")`,
  toJSON: (obj) => `(${obj}).UTC().Format("2006-01-01T15:04:05.000Z07:00")`,
  toString: (obj) => `(${obj}).UTC().Format("Mon Jan 02 2006 15:04:05 GMT+0000 (UTC)")`,
  toDateString: (obj) => `(${obj}).UTC().Format("Mon Jan 02 2006")`,
  toTimeString: (obj) => `(${obj}).UTC().Format("15:04:05 GMT+0000 (UTC)")`,
  valueOf: (obj) => `float64((${obj}).UnixMilli())`
};

const arrayMethodHandlers: Record<string, MethodHandler> = {
  push: (obj, args) => `${obj} = append(${obj}, ${args.join(', ')})`,
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
  unshift: (obj, args) => `${obj} = append([]${receiverElementType()}{${args.join(', ')}}, ${obj}...)`,
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
    const insert = args.slice(2).join(', ');
    return `func() []${elementType} { __rm := append([]${elementType}{}, ${obj}[${start}:(int(${args[1]}))+(${start})]...); __tail := append([]${elementType}{}, ${obj}[(int(${args[1]}))+(${start}):]...); ${obj} = append(${obj}[:${start}], ${insert}); ${obj} = append(${obj}, __tail...); return __rm }()`;
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
  sort: (obj, args) => {
    importedPackages.add('sort');
    const arrayType = currentReceiverGoType?.startsWith('[]') ? currentReceiverGoType : '[]interface{}';
    let less = `(${args[0]})(__s[i], __s[j]) < 0`;
    if (!args[0]) {
      importedPackages.add('fmt');
      less = `fmt.Sprintf("%v", __s[i]) < fmt.Sprintf("%v", __s[j])`;
    }
    return `func() ${arrayType} { __s := ${obj}; sort.SliceStable(__s, func(i, j int) bool { return ${less} }); return __s }()`;
  },
  indexOf: (obj, args) =>
    `func() float64 { __x := ${args[0]}; for __i, __v := range ${obj} { if ${elementEquals('__v', '__x')} { return float64(__i) } }; return float64(-1) }()`,
  includes: (obj, args) =>
    `func() bool { __x := ${args[0]}; for _, __v := range ${obj} { if ${elementEquals('__v', '__x')} { return true } }; return false }()`,
  concat: (obj, args) => `append(${obj}, ${args.join(', ')}...)`,
  // [][]T → []T (one level, like JS's default depth)
  flat: (obj) => {
    const elementType = receiverElementType();
    if (!elementType.startsWith('[]')) return obj;
    return `func() ${elementType} { var __flat ${elementType}; for _, __inner := range ${obj} { __flat = append(__flat, __inner...) }; return __flat }()`;
  },
  toString: (obj: string) => {
    importedPackages.add('fmt');
    return `fmt.Sprintf("%v", ${obj})`;
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
function sliceIndex(obj: string, index: string): string {
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
  values: (obj) => `${obj}.Values()`
};

const setMethodHandlers: Record<string, MethodHandler> = {
  add: (obj, args) => `${obj}.Set(${args[0]}, struct{}{})`,
  has: (obj, args) => `${obj}.Has(${args[0]})`,
  delete: (obj, args) => `${obj}.Delete(${args[0]})`,
  clear: (obj) => `${obj}.Clear()`,
  values: (obj) => `${obj}.Keys()`
};

function getDynamicCallHandler(caller: string, objectType?: string): CallHandler | null {
  if (promiseResolveName && caller === promiseResolveName) {
    return (_caller, args) => `ch <- ${args[0]}`;
  }
  const dotIndex = caller.lastIndexOf('.');
  if (dotIndex !== -1) {
    const methodName = caller.substring(dotIndex + 1);

    // toString() is universal — works for any type including numbers and objects
    if (methodName === 'toString') {
      return (c, args) => {
        const obj = c.substring(0, dotIndex);
        if (args.length > 0) {
          importedPackages.add('strconv');
          return `strconv.FormatInt(int64(${obj}), int(${args[0]}))`;
        }
        return jsStringOf(obj, objectType === 'number' || objectType === 'float64' ? 'float64' : undefined);
      };
    }

    // number.toFixed(digits)
    if (methodName === 'toFixed') {
      return (c, args) => {
        importedPackages.add('strconv');
        return `strconv.FormatFloat(${c.substring(0, dotIndex)}, 'f', int(${args[0] ?? '0'}), 64)`;
      };
    }

    // Class instances use their own methods — never intercept
    if (objectType === 'class') return null;

    let handler: MethodHandler | undefined;
    if (objectType === 'string') {
      handler = stringMethodHandlers[methodName];
    } else if (objectType === 'array') {
      handler = arrayMethodHandlers[methodName];
    } else if (objectType === 'RegExp') {
      handler = regexpMethodHandlers[methodName];
    } else if (objectType === 'Date') {
      handler = dateMethodHandlers[methodName];
    } else if (objectType === 'Map') {
      handler = mapMethodHandlers[methodName];
    } else if (objectType === 'Set') {
      handler = setMethodHandlers[methodName];
    } else {
      // Unknown type: try both maps for backward compatibility
      handler =
        stringMethodHandlers[methodName] ??
        arrayMethodHandlers[methodName] ??
        regexpMethodHandlers[methodName];
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
  const handler =
    callHandlers[caller] ?? callHandlers[caller.replace(/[()]/g, '')] ??
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
function visitTypeOf(node: AstNode): string {
  const goType = inferExpressionType(node.expression);
  const known: Record<string, string> = { string: 'string', float64: 'number', bool: 'boolean', nil: 'undefined' };
  if (goType && known[goType]) return toGoStringLiteral(known[goType]);
  if (goType?.startsWith('func')) return '"function"';
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

const ARRAY_ONLY_METHODS = new Set([
  'map', 'filter', 'some', 'every', 'find', 'findIndex', 'forEach', 'reduce', 'join', 'flat', 'sort', 'reverse'
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
  const castCall = castDynamicReceiverCall(node);
  if (castCall) return visit(castCall);
  const dynamicHelpers: Record<string, string> = {
    includes: 'TnIncludes',
    indexOf: 'TnIndexOf',
    slice: 'TnSlice',
    concat: 'TnConcat'
  };
  const helper = dynamicHelpers[method];
  if (!helper) return undefined;
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
  if (!isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'sort') {
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
    return visit(replacement);
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
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\(\?<([A-Za-z_][A-Za-z0-9_]*)>/g, '(?P<$1>');
}

// Patterns the plain RE2 path cannot serve: /g state or RE2-unsupported syntax.
// Named groups (?<name> are fine (translated to (?P<name>), so strip them
// before testing for lookarounds (?= (?! (?<= (?<!
function needsStatefulRegex(pattern: string, flags: string): boolean {
  if (flags.includes('g')) return true;
  const stripped = pattern.replace(/\(\?<[A-Za-z_][A-Za-z0-9_]*>/g, '');
  // (?= (?! and any remaining (?< (lookbehind) need the backtracker
  return /\\[1-9]|\(\?[=!<]/.test(stripped);
}

// Whether a visited regex argument is the stateful wrapper type
function isTnRegexArg(arg: string): boolean {
  return arg.startsWith('TnRegexCompile(') || variableGoTypes.get(arg) === '*TnRegex';
}

function getTypeParameters(
  typeParameters: any
): string {
  if (!typeParameters || typeParameters.length === 0) return '';
  const params = typeParameters.map((tp) => {
    const name = visit(tp.name);
    const constraint = tp.constraint ? getType(tp.constraint) : 'any';
    return `${name} ${constraint}`;
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
    if (explicitType.startsWith('[]') && explicitType !== '[]interface{}' && !param.dotDotDotToken) {
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

  const contextualFn = param.parent ? getContextualFunctionType(param.parent) : undefined;
  if (contextualFn) {
    const index = (param.parent.parameters ?? []).indexOf(param);
    const contextualParamType = contextualFn.parameters?.[index]?.type;
    if (contextualParamType) return getType(contextualParamType);
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

// Constructor parameter properties: constructor(private x: T) declares field x
function getParameterProperties(classNode: AstNode): AstNode[] {
  const ctor = (classNode.members ?? []).find((m: AstNode) => isConstructorDeclaration(m));
  return (ctor?.parameters ?? []).filter(
    (p: AstNode) => isIdentifier(p.name) && (p.modifiers ?? []).length > 0
  );
}

// Argument types of map.get/has/set/delete, set.add/has/delete, array.push
function getCollectionArgumentTypes(node: AstNode): string[] | undefined {
  if (!isPropertyAccessExpression(node.expression)) return undefined;
  const method = node.expression.name.text;
  const receiverType = inferExpressionType(node.expression.expression);
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
function visitCallArguments(node: AstNode): string[] {
  const args: AstNode[] = node.arguments ?? [];
  const collectionTypes = getCollectionArgumentTypes(node);
  if (collectionTypes) return args.map((arg, index) => toGoValueOfType(arg, collectionTypes[index]));
  let fn = isIdentifier(node.expression) ? declaredFunctions.get(node.expression.text) : undefined;
  if (!fn && isIdentifier(node.expression)) {
    const fnType = resolveTypeNode(variableTypeNodes.get(node.expression.text));
    if (isFunctionTypeNode(fnType)) fn = fnType;
  }
  if (!fn) return args.map((a) => visit(a));
  const params: AstNode[] = fn.parameters ?? [];
  const result = args.map((arg, index) => {
    const param = params[index];
    return param && !param.dotDotDotToken ? toGoValueOfType(arg, getParameterGoType(param)) : visit(arg);
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
  const contextualFn = getContextualFunctionType(fn);
  const declaredCount = (fn.parameters ?? []).length;
  const contextualParams: AstNode[] = contextualFn?.parameters ?? [];
  if (contextualParams.length <= declaredCount || info.signature.includes('...')) return info;
  const extra = contextualParams
    .slice(declaredCount)
    .map((p) => `_ ${p.dotDotDotToken ? '...' : ''}${p.type ? getType(p.type) : 'interface{}'}`);
  const signature = [info.signature, ...extra].filter((part) => part).join(', ');
  return { ...info, signature };
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
      if (isObjectBindingPattern(param.name)) {
        const field = (el.propertyName ?? el.name).text;
        value = `${source}.${goFieldName(field)}`;
        valueType =
          interfacePropertyTypes.get(paramType)?.get(field) ?? getStructFieldGoType(paramType, field);
      } else {
        value = `${source}[${index}]`;
        valueType = paramType.startsWith('[]') ? paramType.slice(2) : undefined;
      }
      registerLocalVariable(el.name.text, valueType);
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

  const hasRequiredAfterDefault = parameters.slice(firstDefaultIndex).some((p) => !p.initializer);

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
      const paramName = getSafeName(param.name.text);
      const paramType = getParameterGoType(param);
      // Array-reference parameters need the default boxed to *[]T
      const defaultValue =
        paramType.startsWith('*[]')
          ? toGoValueOfType(param.initializer!, paramType)
          : visit(param.initializer!);

      if (paramType === 'interface{}') {
        return `var ${paramName} interface{}\n\t\tif len(__defaultArgs) > ${index} {\n\t\t\t${paramName} = __defaultArgs[${index}]\n\t\t} else {\n\t\t\t${paramName} = ${defaultValue}\n\t\t}\n\t\t`;
      }

      return `var ${paramName} ${paramType}\n\t\tif len(__defaultArgs) > ${index} {\n\t\t\t${paramName} = __defaultArgs[${index}].(${paramType})\n\t\t} else {\n\t\t\t${paramName} = ${defaultValue}\n\t\t}\n\t\t`;
    })
    .join('');

  return {
    signature: signatureParts.join(', '),
    prefixBlockContent: prefixBlockContent + destructuring
  };
}

function getSafeName(name: string): string {
  if (!dangerousNames.has(name)) {
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
      isFunctionExpression(parent)
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
      break;
    }
    parent = parent.parent;
  }
  return 'interface{}';
}

// A function whose body runs in a goroutine and communicates over a channel:
// async functions (return sends) and generators (yield sends)
function emitChannelFunction(node: AstNode, isAsync: boolean): string {
  const name = getSafeName(visit(node.name!, { inline: true }));
  const typeParams = getTypeParameters(node.typeParameters);
  const parameterInfo = withContextualParameters(node, getFunctionParametersInfo(node.parameters ?? []));
  if (node.body && isBlock(node.body)) {
    prescanVariableDeclarations(node.body);
  }
  const chanType = isAsync ? getPromiseChannelType(node) : getGeneratorYieldType(node);
  const channelVar = '__ch';
  const prevChannel = asyncChannelVar;
  const prevFn = asyncFunctionNode;
  asyncChannelVar = channelVar;
  asyncFunctionNode = node;
  const body = visit(node.body!, { prefixBlockContent: parameterInfo.prefixBlockContent });
  asyncChannelVar = prevChannel;
  asyncFunctionNode = prevFn;
  return (
    `func ${name}${typeParams}(${parameterInfo.signature}) chan ${chanType} {\n\t${channelVar} := make(chan ${chanType})\n\tgo func() {\n\t\tdefer close(${channelVar})\n\t\t${body.trim()}\n\t}()\n\treturn ${channelVar}\n}`
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

  const channelType = getPromiseChannelType(node);
  const resolveParam = callback.parameters[0];
  const resolveName = resolveParam ? visit(resolveParam.name) : '';

  const prevResolveName = promiseResolveName;
  promiseResolveName = resolveName;

  const body = isBlock(callback.body) ? visit(callback.body) : `{ ${visit(callback.body)} }`;

  promiseResolveName = prevResolveName;

  return (
    `ch := make(chan ${channelType})\n\t\tgo func() ${body.trimEnd()}()\n\t\treturn ch` +
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

  const prevResolveName = promiseResolveName;
  promiseResolveName = resolveName;

  const body = isBlock(callback.body) ? visit(callback.body) : `{ ${visit(callback.body)} }`;

  promiseResolveName = prevResolveName;

  return `func() chan ${channelType} {\n\t\tch := make(chan ${channelType})\n\t\tgo func() ${body.trimEnd()}()\n\t\treturn ch;\n\t}()`;
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

function visitNewSet(node: AstNode): string {
  let elementType = 'interface{}';
  const typeArguments = getCollectionTypeArguments(node);
  if (typeArguments.length === 1) {
    elementType = getType(typeArguments[0]);
  } else if (node.arguments?.length && isArrayLiteralExpression(node.arguments[0])) {
    elementType = getArrayLiteralElementType(node.arguments[0]);
  }
  const args = node.arguments ?? [];
  // new Set(otherSet/values()) — copy at runtime
  if (args.length > 0 && !isArrayLiteralExpression(args[0])) {
    useHelper('orderedMap');
    const src = getTempName('setsrc');
    const item = getTempName('item');
    return `func() *TnMap[${elementType}, struct{}] { ${src} := ${visit(args[0])}; __s := TnNewMap[${elementType}, struct{}](); for _, ${item} := range ${src} { __s.Set(${item}, struct{}{}) }; return __s }()`;
  }
  const values: string[] =
    args.length > 0 && isArrayLiteralExpression(args[0])
      ? args[0].elements.map((el: AstNode) => `${visit(el)}, struct{}{}`)
      : [];
  return orderedMapLiteral(elementType, 'struct{}', values);
}

function specifierToGoFileName(specifier: string): string {
  const segments = specifier.split(/[/\\]/);
  let name = segments[segments.length - 1] || segments[segments.length - 2] || 'import';
  // Strip all extensions (e.g. .spec.ts → '', .ts → '')
  name = name.replace(/(\.[^.]+)+$/, '');
  name = name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!name) name = 'import';
  // Deduplicate filename if already taken by a different import
  let candidate = name + '.go';
  let i = 2;
  while (localImportFiles.has(candidate)) {
    candidate = `${name}_${i}.go`;
    i++;
  }
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

function includeLocalImport(code: string, dir: string | null, goFileName?: string): void {
  const prevDir = currentFileDir;
  currentFileDir = dir;

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
    return;
  }

  // Separate-file mode (local TS imports): transpile to its own Go file.
  // Helper functions are NOT emitted per-file: every generated file shares
  // `package main`, so helpers are emitted once in the main output file.
  const savedOutsideNodes = outsideNodes;
  const savedPackages = [...importedPackages];
  outsideNodes = [];
  importedPackages.clear();
  helperProvidedPackages.clear();

  const sf = parseSource(code);
  const inlineLines: string[] = [];
  const prevEmittingModuleFile = emittingModuleFile;
  emittingModuleFile = true;
  for (const stmt of sf.statements) {
    const result = visit(stmt, { addFunctionOutside: true });
    if (result.trim()) inlineLines.push(result);
  }
  emittingModuleFile = prevEmittingModuleFile;

  const fileOutside = outsideNodes.map((n) => visit(n, { isOutside: true })).join('\n');
  const fileInline = inlineLines.join('\n');
  // Computed after all visits: function bodies (outside nodes) register
  // packages too, and imports must be captured after those visits.
  // Helper-provided packages are only imported here if the file's own code
  // references them; the main file (which carries the helper sources)
  // always imports them.
  const fileCode = `${fileInline}\n${fileOutside}`;
  const fileImports = [...importedPackages]
    .filter((pkg) => {
      if (!helperProvidedPackages.has(pkg)) return true;
      const pkgName = goImportAliases[pkg] ?? pkg.split('/').pop()!;
      return stripGoStrings(fileCode).includes(`${pkgName}.`);
    })
    .sort()
    .map((pkg) => goImportLine(pkg))
    .join('\n');

  const parts: string[] = ['package main'];
  if (fileImports) parts.push(fileImports);
  if (fileInline.trim()) parts.push(fileInline.trim());
  if (fileOutside.trim()) parts.push(fileOutside.trim());
  localImportFiles.set(goFileName, parts.join('\n\n'));

  // Restore main-file state; helper-provided packages carry over so the main
  // file (which carries the helper sources) imports them.
  outsideNodes = savedOutsideNodes;
  importedPackages.clear();
  for (const p of savedPackages) importedPackages.add(p);
  for (const p of helperProvidedPackages) importedPackages.add(p);
  currentFileDir = prevDir;
}

// Go source without its string literals (for detecting real package use)
function stripGoStrings(code: string): string {
  return code.replace(/"(?:[^"\\\n]|\\.)*"|`[^`]*`/g, '""');
}

function registerGoPackageAliases(node: AstNode, goPkg: string): void {
  const pkgName = goPkg.split('/').pop()!;
  if (!node.importClause) return;
  const clause = node.importClause;

  // Default import: `import fmt from 'go:fmt'` or `import myFmt from 'go:fmt'`
  if (clause.name && clause.name.text !== pkgName) {
    importAliases.set(clause.name.text, pkgName);
  }

  if (clause.namedBindings) {
    if (isNamespaceImport(clause.namedBindings)) {
      // `import * as myFmt from 'go:fmt'`
      const localName = clause.namedBindings.name.text;
      if (localName !== pkgName) {
        importAliases.set(localName, pkgName);
      }
    } else if (isNamedImports(clause.namedBindings)) {
      // `import { Println, Sprintf as Spf } from 'go:fmt'`
      for (const el of clause.namedBindings.elements) {
        if (el.isTypeOnly) continue;
        const localName = el.name.text;
        const importedName = el.propertyName?.text ?? localName;
        importAliases.set(localName, `${pkgName}.${importedName}`);
      }
    }
  }
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
  promiseAll: ['orderedMap', 'asyncWait'],
  namedGroups: ['orderedMap'],
  fancyRegex: ['orderedMap'],
  dynamic: ['error'],
  moduleUrl: ['pathToFileURL'],
  timerWait: [],
  asyncWait: []
};

function useHelper(id: string): void {
  if (usedHelpers.has(id)) return;
  usedHelpers.add(id);
  // The match object type the named-groups helper returns
  if (id === 'namedGroups') {
    interfacePropertyTypes.set(
      'TnMatch',
      new Map<string, string>([['groups', '*TnMap[string, string]']])
    );
  }
  for (const dep of helperRequires[id] ?? []) useHelper(dep);
  for (const pkg of helperPackages[id] ?? []) {
    importedPackages.add(pkg);
    helperProvidedPackages.add(pkg);
  }
}

const nodeModuleMappings: Record<
  string,
  { functions: Record<string, (args: string[]) => string> }
> = {
  path: {
    functions: {
      join: (args) => {
        needPkg('path/filepath');
        return `filepath.Join(${args.join(', ')})`;
      },
      dirname: (args) => {
        needPkg('path/filepath');
        return `filepath.Dir(${args[0]})`;
      },
      basename: (args) => {
        needPkg('path/filepath');
        if (args[1]) {
          needPkg('strings');
          return `strings.TrimSuffix(filepath.Base(${args[0]}), ${args[1]})`;
        }
        return `filepath.Base(${args[0]})`;
      },
      extname: (args) => {
        needPkg('path/filepath');
        return `filepath.Ext(${args[0]})`;
      },
      resolve: (args) => {
        needPkg('path/filepath');
        return `func() string { p, _ := filepath.Abs(filepath.Join(${args.join(
          ', '
        )})); return p }()`;
      }
    }
  },
  fs: {
    functions: {
      readFileSync: (args) => {
        useHelper('readFile');
        return `TnReadFile(${args[0]})`;
      },
      writeFileSync: (args) => {
        useHelper('writeFile');
        return `TnWriteFile(${args[0]}, ${args[1]})`;
      },
      appendFileSync: (args) => {
        useHelper('appendFile');
        return `TnAppendFile(${args[0]}, ${args[1]})`;
      },
      existsSync: (args) => {
        needPkg('os');
        return `func() bool { _, err := os.Stat(${args[0]}); return !os.IsNotExist(err) }()`;
      },
      mkdirSync: (args) => {
        useHelper('mkdirAll');
        return `TnMkdirAll(${args[0]})`;
      },
      readdirSync: (args) => {
        useHelper('readDir');
        return `TnReadDir(${args[0]})`;
      },
      copyFileSync: (args) => {
        useHelper('copyFile');
        return `TnCopyFile(${args[0]}, ${args[1]})`;
      },
      rmSync: (args) => {
        useHelper('removeAll');
        return `TnRemoveAll(${args[0]})`;
      },
      unlinkSync: (args) => {
        useHelper('removeAll');
        return `TnRemoveAll(${args[0]})`;
      }
    }
  },
  url: {
    functions: {
      fileURLToPath: (args) => {
        useHelper('fileURLToPath');
        return `TnFileURLToPath(${args[0]})`;
      },
      pathToFileURL: (args) => {
        useHelper('pathToFileURL');
        return `TnPathToFileURL(${args[0]})`;
      }
    }
  },
  os: {
    functions: {
      platform: () => {
        useHelper('osPlatform');
        return 'TnOsPlatform()';
      },
      homedir: () => {
        needPkg('os');
        return `func() string { h, _ := os.UserHomeDir(); return h }()`;
      },
      tmpdir: () => {
        needPkg('os');
        return 'os.TempDir()';
      }
    }
  },
  child_process: {
    functions: {
      // exec(command) — run through the shell, returns { stdout, stderr, status }
      exec: (args) => {
        useHelper('exec');
        return `TnExecShell(${args[0]})`;
      },
      // execSync(command) — run through the shell, returns stdout (panics on failure)
      execSync: (args) => {
        useHelper('exec');
        useHelper('execSync');
        return `TnExecShellSync(${args[0]})`;
      },
      // spawnSync(file, args, options) — matches Node's sync API.
      // options with `inherit` → run with the parent's stdio (returns exit code);
      // otherwise output is captured. Fields match Node: stdout/stderr/status.
      spawnSync: (args) => {
        useHelper('exec');
        useHelper('runInherit');
        // Untyped array literals visit as `[] {…}` — give them the []string
        // type the variadic helper needs (`[]string{…}...` is valid Go spread)
        const arrArg = args[1] ?? '[]string{}';
        const typedArg = arrArg.startsWith('[]') && !arrArg.startsWith('[]string')
          ? arrArg.replace(/^\[\]\S* \{/, '[]string{')
          : arrArg;
        if (args[2]?.includes('inherit')) {
          return `TnRunInherit(${args[0]}, ${typedArg}...)`;
        }
        if (args[2]?.includes('input')) {
          // {input: expr, ...} → run with expr as stdin
          useHelper('execInput');
          const m = /input:\s*([^,}]+)/.exec(args[2]);
          const inputExpr = m ? m[1] : '""';
          return `TnExecInput(${args[0]}, ${inputExpr}, ${typedArg}...)`;
        }
        return `TnExec(${args[0]}, ${typedArg}...)`;
      }
    }
  },
  readline: {
    functions: {
      // question(prompt) — print prompt and read one line from stdin (synchronous)
      question: (args) => {
        useHelper('question');
        return `TnQuestion(${args[0] ?? '""'})`;
      }
    }
  }
};

// Go packages required by each helper, registered when the helper is used.
const helperPackages: Record<string, string[]> = {
  regexReplaceFirst: ['regexp'],
  orderedMap: ['iter', 'encoding/json', 'bytes', 'fmt'],
  jsonStringify: ['encoding/json', 'bytes', 'strings', 'unsafe'],
  objectAssign: ['reflect', 'unsafe'],
  typeOf: ['reflect'],
  dynamic: ['math', 'strings', 'fmt', 'sort', 'reflect', 'strconv', 'regexp'],
  regexReplaceFunc: ['regexp'],
  readFile: ['os'],
  writeFile: ['os'],
  appendFile: ['os'],
  mkdirAll: ['os'],
  readDir: ['os'],
  copyFile: ['os', 'io', 'path/filepath'],
  removeAll: ['os'],
  fileURLToPath: ['net/url', 'path/filepath', 'strings'],
  pathToFileURL: ['net/url', 'path/filepath'],
  osPlatform: ['runtime'],
  error: [],
  bigint: ['math/big'],
  symbol: [],
  fancyRegex: ['regexp', 'strings', 'strconv', 'fmt'],
  namedGroups: ['regexp'],
  moduleUrl: ['os'],
  asyncWait: ['sync'],
  timerWait: ['sync', 'time'],
  promiseAll: [],
  exec: ['os/exec', 'bytes', 'runtime'],
  execSync: ['os/exec', 'bytes', 'runtime'],
  runInherit: ['os/exec', 'os'],
  question: ['bufio', 'fmt', 'os', 'strings'],
  getenv: ['os'],
  execInput: ['os/exec', 'bytes', 'strings']
};

// Go helper sources emitted (once) into the main output file when used.
// Field names are intentionally lowercase: every generated file is `package main`,
// so `result.stdout` in emitted code resolves to the struct field directly.
const goHelpers: Record<string, string> = {
  dynamic: `// Dynamic (any) values: JSON-like objects are map[string]interface{},
// arrays []interface{}, numbers float64
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
			return float64(len(o))
		}
	case *TnError:
		if key == "message" {
			return o.message
		}
	}
	return nil
}

func TnSet(obj interface{}, key string, value interface{}) {
	if o, ok := obj.(map[string]interface{}); ok {
		o[key] = value
		return
	}
	panic("TnSet: cannot set property " + key)
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
		if i, ok := key.(float64); ok && i >= 0 && int(i) < len(o) {
			return string(o[int(i)])
		}
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

func TnAt[T any](s []T, i float64) T {
	if i < 0 || int(i) >= len(s) {
		var zero T
		return zero
	}
	return s[int(i)]
}

func TnCharAt(s string, i float64) string {
	if i < 0 || int(i) >= len(s) {
		return ""
	}
	return string(s[int(i)])
}

func TnLength(v interface{}) float64 {
	switch t := v.(type) {
	case string:
		return float64(len(t))
	case []interface{}:
		return float64(len(t))
	}
	return 0
}

// A value as JS prints it in a template literal (nil pointers are "undefined")
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
	}
}

// A number as JS prints it
func TnNumStr(f float64) string {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	case f == math.Trunc(f) && math.Abs(f) < 1e21:
		return strconv.FormatFloat(f, 'f', -1, 64)
	}
	return strconv.FormatFloat(f, 'g', -1, 64)
}

// Number(x) like JS: "" → 0, invalid → NaN, booleans → 0/1
func TnNumber(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
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
	o, ok := obj.(map[string]interface{})
	k, isString := key.(string)
	if !ok || !isString {
		return false
	}
	delete(o, k)
	return true
}

func TnHas(obj interface{}, key interface{}) bool {
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
			return rv.FieldByName(k).IsValid()
		}
	}
	return false
}

func TnKeys(obj interface{}) []string {
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
		length = len(t)
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
		return s[start:end]
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
	return nil
}

func TnAs[T any](v interface{}) T {
	if p, ok := v.(*T); ok && p != nil {
		return *p
	}
	t, _ := v.(T)
	return t
}

func TnTruthy(v interface{}) bool {
	switch t := v.(type) {
	case nil:
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
	case reflect.Pointer, reflect.Interface, reflect.Map, reflect.Slice:
		return !rv.IsNil()
	}
	return true
}

// nil or a typed nil pointer inside an interface (undefined vs defined)
func TnIsNil(v interface{}) bool {
	if v == nil {
		return true
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Pointer, reflect.Interface, reflect.Map, reflect.Slice, reflect.Func, reflect.Chan:
		return rv.IsNil()
	}
	return false
}`,
  typeOf: `func TnTypeOf(v interface{}) string {
	switch v.(type) {
	case nil:
		return "undefined"
	case string, *string:
		return "string"
	case float64, *float64:
		return "number"
	case bool, *bool:
		return "boolean"
	}
	if reflect.ValueOf(v).Kind() == reflect.Func {
		return "function"
	}
	return "object"
}`,
  jsonStringify: `// JSON.stringify including unexported struct fields (Go's encoder skips them)
func TnJSONStringify(v interface{}, indent string) string {
	var buf bytes.Buffer
	tnJSONWrite(&buf, reflect.ValueOf(v), indent, 0)
	return buf.String()
}

func tnJSONNewline(buf *bytes.Buffer, indent string, depth int) {
	if indent == "" {
		return
	}
	buf.WriteByte('\\n')
	for i := 0; i < depth; i++ {
		buf.WriteString(indent)
	}
}

func tnJSONWrite(buf *bytes.Buffer, rv reflect.Value, indent string, depth int) {
	if !rv.IsValid() {
		buf.WriteString("null")
		return
	}
	switch rv.Kind() {
	case reflect.Pointer, reflect.Interface:
		if rv.IsNil() {
			buf.WriteString("null")
			return
		}
		tnJSONWrite(buf, rv.Elem(), indent, depth)
	case reflect.Bool:
		if rv.Bool() {
			buf.WriteString("true")
		} else {
			buf.WriteString("false")
		}
	case reflect.Float32, reflect.Float64:
		buf.WriteString(TnNumStr(rv.Float()))
	case reflect.String:
		data, _ := json.Marshal(rv.String())
		buf.Write(data)
	case reflect.Slice, reflect.Array:
		if rv.Kind() == reflect.Slice && rv.IsNil() {
			buf.WriteString("null")
			return
		}
		buf.WriteByte('[')
		for i := 0; i < rv.Len(); i++ {
			if i > 0 {
				buf.WriteByte(',')
				tnJSONNewline(buf, indent, depth+1)
			}
			tnJSONWrite(buf, rv.Index(i), indent, depth+1)
		}
		buf.WriteByte(']')
	case reflect.Map:
		buf.WriteByte('{')
		keys := make([]string, 0, rv.Len())
		byKey := map[string]reflect.Value{}
		for _, k := range rv.MapKeys() {
			ks := fmt.Sprint(k.Interface())
			keys = append(keys, ks)
			byKey[ks] = rv.MapIndex(k)
		}
		sort.Strings(keys)
		for i, ks := range keys {
			if i > 0 {
				buf.WriteByte(',')
				tnJSONNewline(buf, indent, depth+1)
			}
			kd, _ := json.Marshal(ks)
			buf.Write(kd)
			buf.WriteByte(':')
			tnJSONWrite(buf, byKey[ks], indent, depth+1)
		}
		buf.WriteByte('}')
	case reflect.Struct:
		if m, ok := rv.Interface().(json.Marshaler); ok {
			data, err := m.MarshalJSON()
			if err == nil {
				buf.Write(data)
				return
			}
		}
		buf.WriteByte('{')
		rt := rv.Type()
		first := true
		for i := 0; i < rt.NumField(); i++ {
			f := rt.Field(i)
			value := rv.Field(i)
			if value.Kind() == reflect.Func {
				continue
			}
			if !value.CanInterface() {
				// Unexported field: read it through a pointer to bypass the flag
				if !value.CanAddr() {
					continue
				}
				value = reflect.NewAt(value.Type(), unsafe.Pointer(value.UnsafeAddr())).Elem()
			}
			if !first {
				buf.WriteByte(',')
				tnJSONNewline(buf, indent, depth+1)
			}
			first = false
			kd, _ := json.Marshal(f.Name)
			buf.Write(kd)
			buf.WriteByte(':')
			tnJSONWrite(buf, value, indent, depth+1)
		}
		buf.WriteByte('}')
	default:
		data, err := json.Marshal(rv.Interface())
		if err != nil {
			buf.WriteString("null")
			return
		}
		buf.Write(data)
	}
}`,
  orderedMap: `// TnMap: JS Map/Set/object semantics — keys iterate in insertion order
type TnMap[K comparable, V any] struct {
	keys   []K
	values map[K]V
}

func TnNewMap[K comparable, V any]() *TnMap[K, V] {
	return &TnMap[K, V]{values: map[K]V{}}
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
  namedGroups: `// TnMatch: the result of exec on a regex with named groups
type TnMatch struct {
	groups *TnMap[string, string]
}

func TnRegexExecNamed(re *regexp.Regexp, s string) *TnMatch {
	m := re.FindStringSubmatch(s)
	if m == nil {
		return nil
	}
	res := &TnMatch{groups: TnNewMap[string, string]()}
	for i, name := range re.SubexpNames() {
		if name != "" && i < len(m) {
			res.groups.Set(name, m[i])
		}
	}
	return res
}`,
  fancyRegex: `// TnRegex: a regex with JS semantics the plain RE2 path cannot serve —
// /g state (lastIndex) and backreference/lookaround patterns (a small
// backtracking engine).
type TnRegex struct {
	re        *regexp.Regexp
	bt        *tnBt
	lastIndex int
	global    bool
}

func TnRegexCompile(pattern string, global bool) *TnRegex {
	if re, err := regexp.Compile(pattern); err == nil {
		return &TnRegex{re: re, global: global}
	}
	return &TnRegex{bt: tnBtCompile(pattern), global: global}
}

func (r *TnRegex) Test(s string) bool {
	groups, _ := r.find(s)
	return groups != nil
}

func (r *TnRegex) Find(s string) []string {
	groups, _ := r.find(s)
	return groups
}

// First match only, without advancing state (string .match)
func (r *TnRegex) FindSub(s string) []string {
	savedG, savedI := r.global, r.lastIndex
	r.global, r.lastIndex = false, 0
	groups, _ := r.find(s)
	r.global, r.lastIndex = savedG, savedI
	return groups
}

func (r *TnRegex) FindAllSub(s string) [][]string {
	savedG, savedI := r.global, r.lastIndex
	r.global, r.lastIndex = true, 0
	var out [][]string
	for {
		groups, _ := r.find(s)
		if groups == nil {
			break
		}
		out = append(out, groups)
	}
	r.global, r.lastIndex = savedG, savedI
	return out
}

func (r *TnRegex) FindIndexSub(s string) []int {
	savedG, savedI := r.global, r.lastIndex
	r.global, r.lastIndex = false, 0
	_, loc := r.find(s)
	r.global, r.lastIndex = savedG, savedI
	if loc == nil {
		return nil
	}
	return loc[:2]
}

func (r *TnRegex) SplitStr(s string, n int) []string {
	if r.bt == nil {
		return r.re.Split(s, n)
	}
	savedG, savedI := r.global, r.lastIndex
	r.global, r.lastIndex = true, 0
	parts := []string{}
	last := 0
	for {
		_, loc := r.find(s)
		if loc == nil || (n > 0 && len(parts) >= n-1) {
			break
		}
		parts = append(parts, s[last:loc[0]])
		last = loc[1]
		if loc[1] == loc[0] && loc[1] < len(s) {
			parts = append(parts, string(s[loc[1]]))
			last = loc[1] + 1
		}
	}
	r.global, r.lastIndex = savedG, savedI
	return append(parts, s[last:])
}

func TnRegexWrapReplaceAll(r *TnRegex, s string, repl string) string {
	return r.replace(s, repl, true)
}

func TnRegexWrapReplaceFirst(r *TnRegex, s string, repl string) string {
	return r.replace(s, repl, false)
}

func TnRegexReplaceFuncW(r *TnRegex, s string, fn func([]string) string, all bool) string {
	savedG, savedI := r.global, r.lastIndex
	r.global, r.lastIndex = true, 0
	out := ""
	last := 0
	for {
		groups, loc := r.find(s)
		if groups == nil {
			break
		}
		out += s[last:loc[0]] + fn(groups)
		last = loc[1]
		if !all {
			break
		}
	}
	r.global, r.lastIndex = savedG, savedI
	return out + s[last:]
}

func (r *TnRegex) replace(s string, repl string, all bool) string {
	savedG, savedI := r.global, r.lastIndex
	r.global, r.lastIndex = true, 0
	out := ""
	last := 0
	for {
		groups, loc := r.find(s)
		if groups == nil {
			break
		}
		out += s[last:loc[0]] + tnExpandGroups(repl, groups)
		last = loc[1]
		if !all {
			break
		}
		if loc[1] == loc[0] && loc[1] < len(s) {
			out += string(s[loc[1]])
			last = loc[1] + 1
		}
	}
	r.global, r.lastIndex = savedG, savedI
	return out + s[last:]
}

// Replaces the numeric group placeholders in the replacement with captures
func tnExpandGroups(repl string, groups []string) string {
	out := ""
	for i := 0; i < len(repl); i++ {
		if repl[i] == '$' && i+1 < len(repl) && repl[i+1] == '{' {
			if j := strings.IndexByte(repl[i+2:], '}'); j >= 0 {
				if n, err := strconv.Atoi(repl[i+2 : i+2+j]); err == nil && n < len(groups) {
					out += groups[n]
					i = i + 2 + j
					continue
				}
			}
		}
		out += string(repl[i])
	}
	return out
}

// find: leftmost match at or after lastIndex (which /g advances in runes)
func (r *TnRegex) find(s string) ([]string, []int) {
	runs := []rune(s)
	if r.bt != nil {
		start := 0
		if r.global {
			if r.lastIndex > len(runs) {
				r.lastIndex = 0
				return nil, nil
			}
			start = r.lastIndex
		}
		offs := tnByteOffsets(runs)
		for pos := start; pos <= len(runs); pos++ {
			caps := make([]int, (r.bt.ngroups+1)*2)
			for i := range caps {
				caps[i] = -1
			}
			m := &tnBtMatchState{runs: runs, caps: caps}
			end := -1
			if m.match(r.bt.root, pos, func(e int) bool { end = e; return true }) {
				caps[0], caps[1] = pos, end
				groups := make([]string, r.bt.ngroups+1)
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
				if r.global {
					next := end
					if next == pos {
						next++
					}
					r.lastIndex = next
				}
				return groups, loc
			}
		}
		if r.global {
			r.lastIndex = 0
		}
		return nil, nil
	}
	if !r.global {
		loc := r.re.FindStringSubmatchIndex(s)
		if loc == nil {
			return nil, nil
		}
		groups := make([]string, len(loc)/2)
		for i := range groups {
			if loc[2*i] >= 0 {
				groups[i] = s[loc[2*i]:loc[2*i+1]]
			}
		}
		return groups, loc
	}
	if r.lastIndex >= len(runs) {
		r.lastIndex = 0
		return nil, nil
	}
	byteStart := 0
	for i := 0; i < r.lastIndex; i++ {
		byteStart += len(string(runs[i]))
	}
	loc := r.re.FindStringSubmatchIndex(s[byteStart:])
	if loc == nil {
		r.lastIndex = 0
		return nil, nil
	}
	for i := range loc {
		if loc[i] >= 0 {
			loc[i] += byteStart
		}
	}
	groups := make([]string, len(loc)/2)
	for i := range groups {
		if loc[2*i] >= 0 {
			groups[i] = s[loc[2*i]:loc[2*i+1]]
		}
	}
	endRune := r.lastIndex
	bo := byteStart
	for ri := r.lastIndex; ri < len(runs) && bo < loc[1]; ri++ {
		bo += len(string(runs[ri]))
		endRune = ri + 1
	}
	if endRune == r.lastIndex {
		endRune++
	}
	r.lastIndex = endRune
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
	root    *tnBtNode
	ngroups int
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
		if pos < len(m.runs) && m.runs[pos] == node.ch {
			return k(pos + 1)
		}
		return false
	case "any":
		if pos < len(m.runs) && m.runs[pos] != '\\n' {
			return k(pos + 1)
		}
		return false
	case "class":
		if pos < len(m.runs) && node.cls(m.runs[pos]) != node.negCls {
			return k(pos + 1)
		}
		return false
	case "anchor":
		switch node.anchor {
		case '^':
			if pos == 0 {
				return k(pos)
			}
		case '$':
			if pos == len(m.runs) {
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
		if !node.behind {
			matched := false
			saved := append([]int(nil), m.caps...)
			if m.match(node.child, pos, func(int) bool { return true }) {
				matched = true
			}
			m.caps = saved
			if matched != node.negative {
				return k(pos)
			}
			return false
		}
		matched := false
		saved := append([]int(nil), m.caps...)
		for start := 0; start <= pos && !matched; start++ {
			if m.match(node.child, start, func(end int) bool { return end == pos }) {
				matched = true
			}
		}
		m.caps = saved
		if matched != node.negative {
			return k(pos)
		}
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
  readFile: `func TnReadFile(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}
	return string(data)
}`,
  writeFile: `func TnWriteFile(path string, content string) {
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		panic(err)
	}
}`,
  appendFile: `func TnAppendFile(path string, content string) {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	if _, err := f.WriteString(content); err != nil {
		panic(err)
	}
}`,
  mkdirAll: `func TnMkdirAll(path string) {
	if err := os.MkdirAll(path, 0o755); err != nil {
		panic(err)
	}
}`,
  readDir: `func TnReadDir(path string) []string {
	entries, err := os.ReadDir(path)
	if err != nil {
		panic(err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	return names
}`,
  copyFile: `func TnCopyFile(src string, dst string) {
	in, err := os.Open(src)
	if err != nil {
		panic(err)
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		panic(err)
	}
	out, err := os.Create(dst)
	if err != nil {
		panic(err)
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		panic(err)
	}
}`,
  removeAll: `func TnRemoveAll(path string) {
	if err := os.RemoveAll(path); err != nil {
		panic(err)
	}
}`,
  fileURLToPath: `func TnFileURLToPath(u string) string {
	trimmed := strings.TrimPrefix(u, "file://")
	if unescaped, err := tnurl.PathUnescape(trimmed); err == nil {
		trimmed = unescaped
	}
	return filepath.FromSlash(trimmed)
}`,
  pathToFileURL: `func TnPathToFileURL(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		panic(err)
	}
	return "file://" + tnurl.PathEscape(filepath.ToSlash(abs))
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
  error: `// TnError: JS Error values (thrown and caught) with a message
type TnError struct {
	message string
}

func (e *TnError) Error() string { return e.message }

func TnNewError(message string) *TnError {
	return &TnError{message: message}
}`,
  asyncWait: `// Pending async work (promise callbacks, detached async calls) is drained
// before the process exits
var __tnWaitGroup sync.WaitGroup`,
  bigint: `func TnBigInt(s string) *tnbig.Int {
	v, _ := new(tnbig.Int).SetString(s, 10)
	return v
}`,
  symbol: `// TnSymbol: JS symbol values (unique by identity)
type TnSymbol struct {
	description string
}

func TnNewSymbol(description string) *TnSymbol {
	return &TnSymbol{description: description}
}`,
  timerWait: `// Pending setTimeout timers are waited on before the process exits
var __tnTimers sync.WaitGroup`,
  promiseAll: `// Promise.all: every channel drained in order, results collected
func TnPromiseAll[T any](chs []chan T) chan []T {
	out := make(chan []T)
	go func() {
		results := make([]T, len(chs))
		for i, ch := range chs {
			results[i] = <-ch
		}
		out <- results
		close(out)
	}()
	return out
}`,
  exec: `type tnExecResult struct {
	stdout   string
	stderr   string
	status   float64
}

func TnExec(name string, args ...string) tnExecResult {
	cmd := exec.Command(name, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	status := 0.0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			status = float64(exitErr.ExitCode())
		} else {
			panic(err)
		}
	}
	return tnExecResult{stdout: stdout.String(), stderr: stderr.String(), status: status}
}

func TnExecShell(command string) tnExecResult {
	if runtime.GOOS == "windows" {
		return TnExec("cmd", "/C", command)
	}
	return TnExec("sh", "-c", command)
}`,
  execSync: `func TnExecShellSync(command string) string {
	result := TnExecShell(command)
	if result.status != 0 {
		panic(result.stderr)
	}
	return result.stdout
}`,
  getenv: `func TnGetenv(name string) string {
	return os.Getenv(name)
}`,
  execInput: `func TnExecInput(name string, input string, args ...string) tnExecResult {
	cmd := exec.Command(name, args...)
	cmd.Stdin = strings.NewReader(input)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	status := 0.0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			status = float64(exitErr.ExitCode())
		} else {
			panic(err)
		}
	}
	return tnExecResult{stdout: stdout.String(), stderr: stderr.String(), status: status}
}`,
  runInherit: `func TnRunInherit(name string, args ...string) tnExecResult {
	cmd := exec.Command(name, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return tnExecResult{status: float64(exitErr.ExitCode())}
		}
		panic(err)
	}
	return tnExecResult{}
}`,
  question: `var tnStdinReader = bufio.NewReader(os.Stdin)

func TnQuestion(prompt string) string {
	if prompt != "" {
		fmt.Print(prompt)
	}
	// Reuse one buffered reader: a fresh reader per call would discard
	// buffered stdin and hit EOF on the second question.
	line, err := tnStdinReader.ReadString('\\n')
	if err != nil && line == "" {
		panic(err)
	}
	return strings.TrimRight(line, "\\r\\n")
}`
};

// Returns the Go source for all helpers used in this transpilation, or '' if none.
// Emitted only into the main output file: every generated file shares `package main`,
// so helpers are visible across files and must not be duplicated.
function emitGoHelpers(): string {
  return [...usedHelpers]
    .sort()
    .map((id) => goHelpers[id])
    .filter(Boolean)
    .join('\n\n');
}

// Result types of the mapped Node.js stdlib functions ('' = no result)
const NODE_FUNCTION_TYPES: Record<string, Record<string, string>> = {
  path: {
    join: 'string',
    resolve: 'string',
    dirname: 'string',
    basename: 'string',
    extname: 'string',
    relative: 'string',
    normalize: 'string'
  },
  fs: {
    readFileSync: 'string',
    existsSync: 'bool',
    readdirSync: '[]string',
    writeFileSync: '',
    appendFileSync: '',
    mkdirSync: '',
    copyFileSync: '',
    rmSync: '',
    unlinkSync: ''
  },
  os: { platform: 'string', homedir: 'string', tmpdir: 'string' },
  url: { fileURLToPath: 'string', pathToFileURL: 'string' },
  child_process: { execSync: 'string' },
  readline: { question: 'string' }
};

// Result types of imported Node.js functions by their local callee text
// (`join`, `path.join`)
const nodeCallResultTypes = new Map<string, string>();

// Mapping from Node.js stdlib module names to Go setup functions.
// Each entry adds the required Go imports and registers call handlers for the local identifier.
function setupNodeModuleImport(node: AstNode, nodeModule: string): void {
  const mapping = nodeModuleMappings[nodeModule];
  if (!mapping) return;

  const clause = node.importClause;
  if (!clause) return;

  if (clause.namedBindings && isNamedImports(clause.namedBindings)) {
    // Named imports: `import { join, dirname } from 'node:path'`
    // Map each local name directly to its Go qualified function via importAliases,
    // so bare calls like `join(...)` resolve to `filepath.Join(...)`.
    for (const el of clause.namedBindings.elements) {
      if (el.isTypeOnly) continue;
      const localName = el.name.text;
      const importedName = el.propertyName?.text ?? localName;
      const resultType = NODE_FUNCTION_TYPES[nodeModule]?.[importedName];
      if (resultType !== undefined) nodeCallResultTypes.set(localName, resultType);
      const fn = mapping.functions[importedName];
      if (fn) {
        // Register a call handler keyed on the local name
        callHandlers[localName] = (_caller, args) => fn(args);
      }
    }
  } else {
    // Default import (`import path from 'node:path'`) or
    // namespace import (`import * as path from 'node:path'`)
    const localName = getImportLocalName(node) ?? nodeModule;
    for (const [funcName, resultType] of Object.entries(NODE_FUNCTION_TYPES[nodeModule] ?? {})) {
      nodeCallResultTypes.set(`${localName}.${funcName}`, resultType);
    }
    for (const [funcName, fn] of Object.entries(mapping.functions)) {
      callHandlers[`${localName}.${funcName}`] = (_caller, args) => fn(args);
    }
  }
}

function visitImportDeclaration(node: AstNode): string {
  if (!isStringLiteral(node.moduleSpecifier)) return '';
  const moduleSpec = node.moduleSpecifier.text;

  // Relative imports → transpile to a separate Go file
  if (moduleSpec.startsWith('.') || moduleSpec.startsWith('/')) {
    // Key combines current dir + specifier to avoid cross-package collisions
    const key = `${currentFileDir ?? ''}::${moduleSpec}`;
    if (fileResolver && !includedLocalImports.has(key)) {
      includedLocalImports.add(key);
      const resolved = fileResolver(moduleSpec, currentFileDir);
      if (resolved) {
        const goFileName = specifierToGoFileName(moduleSpec);
        includeLocalImport(resolved.content, resolved.dir, goFileName);
      }
    }
    return '';
  }

  // Type-only imports contribute nothing to runtime
  if (node.importClause?.isTypeOnly) return '';

  // Go standard library: `import { Println } from 'go:fmt'` → import "fmt"
  if (moduleSpec.startsWith('go:')) {
    const goPkg = moduleSpec.slice(3);
    importedPackages.add(goPkg);
    registerGoPackageAliases(node, goPkg);
    return '';
  }

  // Node.js standard library: `import path from 'node:path'` → mapped Go packages
  if (moduleSpec.startsWith('node:')) {
    const nodeModule = moduleSpec.slice(5);
    setupNodeModuleImport(node, nodeModule);
    return '';
  }

  // npm package (bare specifier) → transpile to its own Go file
  const npmKey = `npm::${moduleSpec}`;
  if (fileResolver && !includedLocalImports.has(npmKey)) {
    includedLocalImports.add(npmKey);
    const resolved = fileResolver(moduleSpec, currentFileDir);
    if (resolved) {
      const goFileName = specifierToGoFileName(moduleSpec);
      includeLocalImport(resolved.content, resolved.dir, goFileName);
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
// variables (a variable named `big` would shadow the package name)
const goImportAliases: Record<string, string> = {
  'math/big': 'tnbig',
  'net/url': 'tnurl'
};

function goImportLine(pkg: string): string {
  const alias = goImportAliases[pkg];
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
function visitForOfSequence(node: AstNode, iterExpr: string, iterType: string | undefined): string {
  if (iterType === 'interface{}') iterType = '[]interface{}';
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
    if (declaration && isIdentifier(declaration.name)) {
      registerLocalVariable(declaration.name.text, elemType);
      return `for ${visit(declaration.name)} := range ${iterExpr}${visitLoopBody(node.statement)}`;
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
      registerLocalVariable(name, memberType);
      prefix += `${name} := ${item}[${index}]\n\t\t_ = ${name}\n\t\t`;
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
  const returnGoType = inferFunctionBodyReturnType(fn);
  const hasValue = !!returnGoType;
  const saved = tryReturn;
  const retVar = getTempName('tryret');
  const doneVar = getTempName('trydone');
  const blockCode = (block: AstNode, inCatch: boolean) => {
    tryReturn = { fn, hasValue, inCatch, retVar, doneVar };
    const code = (block.statements ?? []).map((s: AstNode) => visit(s)).join('\t');
    tryReturn = saved;
    return code;
  };
  const deferreds: string[] = [];
  if (node.finallyBlock) {
    const finallyBody = (node.finallyBlock.statements ?? []).map((s: AstNode) => visit(s)).join('\t');
    deferreds.push(`defer func() {\n\t\t\t${finallyBody}\t\t\t}()`);
  }
  if (node.catchClause) {
    const varDecl = node.catchClause.variableDeclaration;
    const catchVar = varDecl ? visit(varDecl.name) : '_r';
    const catchBody = blockCode(node.catchClause.block, true);
    deferreds.push(
      `defer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\t${catchVar} := r\n\t\t\t\t_ = ${catchVar}\n\t\t\t\t${catchBody}\t\t\t}\n\t\t\t}()`
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
    const finallyBody = (node.finallyBlock.statements ?? []).map((s) => visit(s)).join('\t');
    deferreds.push(`defer func() {\n\t\t\t${finallyBody}\t\t\t}()`);
  }

  // Register catch second (LIFO: runs first, handles panic via recover)
  if (node.catchClause) {
    const varDecl = node.catchClause.variableDeclaration;
    const catchVar = varDecl ? visit(varDecl.name) : '_r';
    if (varDecl && isIdentifier(varDecl.name)) {
      registerLocalVariable(varDecl.name.text, 'interface{}');
    }
    const catchBody = (node.catchClause.block.statements ?? []).map((s) => visit(s)).join('\t');
    deferreds.push(
      `defer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\t${catchVar} := r\n\t\t\t\t_ = ${catchVar}\n\t\t\t\t${catchBody}\t\t\t}\n\t\t\t}()`
    );
  }

  const tryBody = (node.tryBlock.statements ?? []).map((s) => visit(s)).join('\t');
  const body = [...deferreds, tryBody].join('\n\t\t\t');

  return `func() {\n\t\t\t${body}\n\t\t\t}()` + (options.inline ? '' : ';\n\t');
}
