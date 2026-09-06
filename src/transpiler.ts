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
  return n?.kind === 'ArrayTypeNode';
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
  return n?.kind === 'ConstructorDeclaration';
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
  return n?.kind === 'FunctionTypeNode';
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
  return n?.kind === 'LiteralTypeNode';
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
  return n?.kind === 'TypeReferenceNode';
}

function isUnionTypeNode(n: AstNode): boolean {
  return n?.kind === 'UnionTypeNode';
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

function defaultParseFunction(_code) {
    throw new Error('transpileToNative: no parse function injected (options.parse)');
}

// Renders a type node's source text syntactically (no typechecker needed).
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
    if (node.kind === 'TypeReferenceNode' && node.typeName) {
        return typeNodeToText(node.typeName);
    }
    if (node.kind === 'Identifier')
        return node.text;
    if (node.kind === 'ArrayTypeNode' && node.elementType) {
        return `${'{'}${''}}typeNodeToText(node.elementType)[]`;
    }
    return 'any';
}

// Iterates the child nodes of a normalized JSON AST node (own enumerable
function childNodes(node) {
    const out: any[] = [];
    for (const key of Object.keys(node ?? {})) {
        if (key === 'kind' || key === 'text')
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

export function transpileToNative(
  code: string,
  options?: {
    readFile?: (
      specifier: string,
      fromDir: string | null
    ) => { content: string; dir: string } | null;
    parse?: ParseFunction;
  }
): TranspileResult {
  fileResolver = options?.readFile ?? null;
  parseFunction = options?.parse ?? defaultParseFunction;
  currentFileDir = null;
  const sourceFile = parseFunction(code);
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
  usedHelpers.clear();
  helperProvidedPackages.clear();
  const transpiledCode = visit(sourceFile, { addFunctionOutside: true });
  const transpiledCodeOutside = outsideNodes.map((n) => visit(n, { isOutside: true })).join('\n');

  const main = `package main

${[...importedPackages].map((pkg) => `import "${pkg}"`).join('\n')}

func main() {
    ${transpiledCode.trim()}
}

${transpiledCodeOutside.trim()}
${emitGoHelpers()}`.trimEnd();
  return { main, files: localImportFiles };
}

export function visit(node: AstNode, options: VisitNodeOptions = {}): string {
  let code: string = '';

  if (isSourceFile(node)) {
    return (node.statements ?? [])
      .map((n) => visit(n, { addFunctionOutside: true }))
      .filter((n) => !!n)
      .join(options.inline ? '' : '\n\t');
  } else if (isIdentifier(node)) {
    if (node.text === 'undefined') return 'nil';
    const goAlias = importAliases.get(node.text);
    if (goAlias) return goAlias;
    return getSafeName(node.text);
  } else if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
    return toGoStringLiteral(node.text);
  } else if (isAsExpression(node)) {
    return visit(node.expression);
  } else if (isTypeAssertionExpression(node)) {
    return visit(node.expression);
  } else if (isTemplateExpression(node)) {
    return visitTemplateExpression(node);
  } else if (isNumericLiteral(node)) {
    return `float64(${node.text})`;
  } else if (isToken(node) && node.kind === 'TrueKeyword') {
    return `true`;
  } else if (isToken(node) && node.kind === 'FalseKeyword') {
    return `false`;
  } else if (isToken(node) && node.kind === 'NullKeyword') {
    return `nil`;
  } else if (isRegularExpressionLiteral(node)) {
    importedPackages.add('regexp');
    const text = node.text; // e.g. /pattern/flags
    const lastSlash = text.lastIndexOf('/');
    const pattern = text.substring(1, lastSlash);
    const flags = text.substring(lastSlash + 1);
    const goFlags = jsRegexFlagsToGo(flags);
    const escaped = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `regexp.MustCompile("${goFlags}${escaped}")`;
  } else if (isArrayLiteralExpression(node)) {
    const type = isVariableDeclaration(node.parent) ? getType(node.parent.type!, true) : '';
    const hasSpread = (node.elements ?? []).some((e) => isSpreadElement(e));
    if (hasSpread) {
      return visitSpreadArrayLiteral(node, type);
    }
    return `[]${type} {${(node.elements ?? []).map((e) => visit(e)).join(', ')}}`;
  } else if (isBlock(node)) {
    return `{\n\t\t${options.prefixBlockContent ?? ''}${(node.statements ?? [])
      .map((n) => visit(n))
      .join('\t')}${options.extraBlockContent ?? ''}}${options.inline ? '' : '\n\t'}`;
  } else if (isElementAccessExpression(node)) {
    if (hasQuestionDot(node)) {
      return visitOptionalElementAccess(node);
    }
    return `${visit(node.expression)}[int(${visit(node.argumentExpression)})]`;
  } else if (isPropertyAccessExpression(node)) {
    if (hasQuestionDot(node)) {
      return visitOptionalPropertyAccess(node);
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
    return getAcessString(leftSide, rightSide, objectType);
  } else if (isVariableDeclaration(node)) {
    // Object destructuring: const { x, y } = obj
    if (isObjectBindingPattern(node.name) && node.initializer) {
      const initExpr = visit(node.initializer);
      const parts = node.name.elements.map((el) => {
        const localName = visit(el.name);
        const propName = el.propertyName ? visit(el.propertyName) : localName;
        const defaultVal = el.initializer ? visit(el.initializer) : undefined;
        if (defaultVal) {
          return `${localName} := func() interface{} { if ${initExpr}.${propName} == nil { return ${defaultVal} }; return ${initExpr}.${propName} }()`;
        }
        return `${localName} := ${initExpr}.${propName}`;
      });
      return parts.join(';\n\t');
    }
    // Array destructuring: const [a, b] = arr
    if (isArrayBindingPattern(node.name) && node.initializer) {
      const initExpr = visit(node.initializer);
      const tmpVar = getTempName('arr');
      const parts = [`${tmpVar} := ${initExpr}`];
      node.name.elements.forEach((el, idx) => {
        if (isOmittedExpression(el)) return;
        const bindEl = el as AstNode;
        const localName = visit(bindEl.name);
        // Variables starting with _ are intentionally unused — use blank identifier
        if (localName === '_' || localName.startsWith('_')) {
          parts.push(`_ = ${tmpVar}[${idx}]`);
        } else {
          parts.push(`${localName} := ${tmpVar}[${idx}]`);
        }
      });
      return parts.join(';\n\t');
    }
    const type = getType(node.type!);
    // Track variable type for type-aware method dispatch
    if (isIdentifier(node.name)) {
      if (node.type) {
        variableGoTypes.set(node.name.text, getType(node.type));
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
        } else if (classNames.has(node.initializer.expression.text)) {
          variableTypes.set(node.name.text, 'class');
          variableClassNames.set(node.name.text, node.initializer.expression.text);
        }
      } else if (node.initializer && isRegularExpressionLiteral(node.initializer)) {
        variableTypes.set(node.name.text, 'RegExp');
      }

      if (!variableGoTypes.has(node.name.text) && node.initializer) {
        const inferredType = inferExpressionType(node.initializer);
        if (inferredType) {
          variableGoTypes.set(node.name.text, inferredType);
        }
      }
    }
    let initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
    // Wrap non-nil values assigned to nullable primitive pointer types
    // Only wrap for primitive pointers (*string, *float64, *bool), not class pointers
    if (
      node.initializer &&
      type.startsWith('*') &&
      !isNilLiteral(node.initializer) &&
      ['*string', '*float64', '*bool'].includes(type)
    ) {
      const value = visit(node.initializer);
      initializer = `= func() ${type} { v := ${value}; return &v }()`;
    }
    return `${type === ':' ? '' : 'var '}${visit(node.name)} ${type}${
      type === ':' ? '' : ' '
    }${initializer}`;
  } else if (isCallExpression(node)) {
    if (
      hasQuestionDot(node) ||
      (isPropertyAccessExpression(node.expression) && hasQuestionDot(node.expression))
    ) {
      return visitOptionalCall(node);
    }
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
      return `func(${parameterInfo.signature})${returnType} ${visit(fn.body!, { prefixBlockContent: parameterInfo.prefixBlockContent })}(${args})`;
    }
    // Handle setTimeout specially to get raw delay value
    if (isIdentifier(node.expression) && node.expression.text === 'setTimeout') {
      importedPackages.add('time');
      const callback = visit((node.arguments ?? [])[0]);
      const delayNode = (node.arguments ?? [])[1];
      const delay = isNumericLiteral(delayNode) ? delayNode.text : visit(delayNode);
      return `time.AfterFunc(${delay} * time.Millisecond, ${callback.trimEnd()})`;
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
    const args = hasSpreadArg
      ? (node.arguments ?? []).map((a) =>
          isSpreadElement(a) ? `${visit(a.expression)}...` : visit(a)
        )
      : (node.arguments ?? []).map((a) => visit(a));
    // Resolve object type for type-aware method dispatch
    let objectType: string | undefined;
    if (isPropertyAccessExpression(node.expression)) {
      objectType = resolveExpressionType(node.expression.expression);
    }
    return getCallString(safeCaller, args, typeArgs, objectType);
  } else if (isPrefixUnaryExpression(node)) {
    return `${getOperatorText(node.operator)}${visit(node.operand)}`;
  } else if (isPostfixUnaryExpression(node)) {
    return `${visit(node.operand, { inline: true })}${getOperatorText(node.operator)}`;
  } else if (isConditionalExpression(node)) {
    return visitConditionalExpression(node);
  } else if (isBinaryExpression(node)) {
    if (node.operatorToken.kind === 'QuestionQuestionToken') {
      return visitNullishCoalescingExpression(node);
    }
    let op = operatorTokenText(node.operatorToken);
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    // Go's % is not defined on float64 (TS numbers all map to float64)
    if (op === '%') {
      importedPackages.add('math');
      return `math.Mod(${visit(node.left)}, ${visit(node.right)})`;
    }
    if (op === '%=') {
      importedPackages.add('math');
      const left = visit(node.left);
      return `${left} = math.Mod(${left}, ${visit(node.right)})`;
    }
    return `${visit(node.left)} ${op} ${visit(node.right)}`;
  } else if (isParenthesizedExpression(node)) {
    return `(${visit(node.expression)})`;
  } else if (isAwaitExpression(node)) {
    return `<-${visit(node.expression)}`;
  } else if (isVariableDeclarationList(node)) {
    return (
      (node.declarations ?? []).map((n) => visit(n)).join(options.inline ? ';' : ';\n\t') +
      (options.inline ? '' : ';\n\t')
    );
  } else if (isExpressionStatement(node)) {
    return visit(node.expression) + (options.inline ? '' : ';\n\t');
  } else if (isForStatement(node)) {
    return `for ${visit(node.initializer!, { inline: true })}; ${visit(node.condition!, {
      inline: true
    })}; ${visit(node.incrementor!, { inline: true })}${visit(node.statement)}`;
  } else if (isForInStatement(node)) {
    const varName = isVariableDeclarationList(node.initializer)
      ? visit(node.initializer.declarations[0].name)
      : visit(node.initializer as AstNode);
    return `for ${varName} := range ${visit(node.expression, { inline: true })}${visit(node.statement)}`;
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
    const iterExpr = visit(iterNode, { inline: true });
    const iterType = inferExpressionType(iterNode);
    if (iterType && iterType.startsWith('map[')) {
      const valueType = extractMapValueType(iterType);
      const isSet = valueType === 'struct{}';
      const varInfo = getForOfVarNames(node.initializer);
      if (isSet) {
        return `for ${varInfo[0]} := range ${iterExpr}${visit(node.statement)}`;
      } else if (varInfo.length >= 2) {
        return `for ${varInfo[0]}, ${varInfo[1]} := range ${iterExpr}${visit(node.statement)}`;
      } else {
        return `for ${varInfo[0]} := range ${iterExpr}${visit(node.statement)}`;
      }
    }
    return `for _,${visit(node.initializer, { inline: true })}= range ${iterExpr}${visit(node.statement)}`;
  } else if (isWhileStatement(node)) {
    return `for ${visit(node.expression, { inline: true })}${visit(node.statement)}`;
  } else if (isDoStatement(node)) {
    const condition = `\tif !(${visit(node.expression, {
      inline: true
    })}) {\n\t\t\tbreak \n\t\t}\n\t`;
    return `for ${visit(node.statement, { inline: true, extraBlockContent: condition })}`;
  } else if (isIfStatement(node)) {
    // Go requires the branch body to be a block even for single statements
    // Go requires a block body; `} else` must stay on the same line, so the
    // terminating ';' is only added when no else branch follows
    const thenTerm = node.elseStatement ? '' : ';';
    const thenCode = isBlock(node.thenStatement)
      ? visit(node.thenStatement, { inline: !!node.elseStatement })
      : `{\n${visit(node.thenStatement)}\n}${thenTerm}`;
    const condition = `if ${visit(node.expression, { inline: true })} ${thenCode}`;
    if (node.elseStatement) {
      if (isBlock(node.elseStatement)) {
        return `${condition} else ${visit(node.elseStatement)}`;
      }
      // else-if chains stay chained; other single statements get a block
      const elseCode = isIfStatement(node.elseStatement)
        ? visit(node.elseStatement)
        : `{\n${visit(node.elseStatement)}\n}`;
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
    return 'break';
  } else if (isThrowStatement(node)) {
    const expr = node.expression;
    if (
      isNewExpression(expr) &&
      isIdentifier(expr.expression) &&
      expr.expression.text === 'Error'
    ) {
      const args = expr.arguments ?? [];
      const msg = args.length > 0 ? visit(args[0]) : '""';
      return `panic(${msg})` + (options.inline ? '' : ';\n\t');
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
    return (
      `return ${node.expression ? visit(node.expression) : ''}` + (options.inline ? '' : ';\n\t')
    );
  } else if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      return '';
    }

    const typeParams = getTypeParameters(node.typeParameters);
    const parameterInfo = getFunctionParametersInfo((node.parameters ?? []));

    if (node.body && isBlock(node.body)) {
      prescanVariableDeclarations(node.body);
    }
    const inferredRetType = inferFunctionBodyReturnType(node);
    const returnType = inferredRetType ? ` ${inferredRetType}` : '';

    if (options.isOutside) {
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
      })}`;
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
    const parameterInfo = getFunctionParametersInfo((node.parameters ?? []));
    const inferredRetType = inferFunctionBodyReturnType(node);
    const returnType = inferredRetType ? ` ${inferredRetType}` : '';
    if (parameterInfo.prefixBlockContent && !isBlock(node.body)) {
      return `func(${parameterInfo.signature})${returnType} {\n\t\t${parameterInfo.prefixBlockContent}return ${visit(node.body)};\n\t}`;
    }
    if (!isBlock(node.body)) {
      return `func(${parameterInfo.signature})${returnType} { return ${visit(node.body as AstNode)}; }`;
    }
    return `func(${parameterInfo.signature})${returnType} ${visit(node.body, {
      prefixBlockContent: parameterInfo.prefixBlockContent
    })}`;
  } else if (node.kind === 'ThisKeyword') {
    return 'self';
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
    return '';
  } else if (isInterfaceDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);

      const properties = new Map<string, string>();
      for (const member of (node.members ?? [])) {
        if (isPropertySignature(member) && isIdentifier(member.name)) {
          properties.set(
            member.name.text,
            getOptionalNodeType(member.type, !!member.questionToken)
          );
        }
      }
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
        if (clause.token?.kind === 'ExtendsKeyword') {
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
          `\t${member.name.text} ${getOptionalNodeType(member.type, !!member.questionToken)}`
        );
      }
    }

    if (properties.length > 0 && methods.length === 0) {
      const fields = [...extendedInterfaces.map((e) => `\t${e}`), ...properties];
      return `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}`;
    }

    const members = [...extendedInterfaces.map((e) => `\t${e}`), ...methods];

    return `type ${name}${typeParams} interface {\n${members.join('\n')}\n}`;
  } else if (isClassDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      const className = visit(node.name!);
      classNames.add(className);

      const properties = new Map<string, string>();
      const methods = new Map<string, string>();
      for (const member of (node.members ?? [])) {
        const memberModifiers = (member as AstNode).modifiers;
        const isStatic = memberModifiers?.some((m) => m.kind === 'StaticKeyword');
        if (isPropertyDeclaration(member) && isIdentifier(member.name)) {
          if (isStatic) {
            classStaticProps.add(`${className}.${member.name.text}`);
          } else {
            properties.set(
              member.name.text,
              getOptionalNodeType(member.type, !!member.questionToken)
            );
          }
        }
        if (isMethodDeclaration(member) && isIdentifier(member.name)) {
          if (isStatic) {
            classStaticMethods.add(`${className}.${member.name.text}`);
          } else {
            methods.set(member.name.text, member.type ? getType(member.type) : 'interface{}');
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
        if (clause.token?.kind === 'ExtendsKeyword') {
          parentClass = visit(clause.types[0].expression);
        }
      }
    }

    const fields: string[] = [];
    if (parentClass) {
      fields.push(`\t${parentClass}`);
    }
    for (const member of (node.members ?? [])) {
      if (isPropertyDeclaration(member)) {
        const fieldName = visit(member.name);
        let fieldType: string;
        if (member.type && isArrayTypeNode(member.type)) {
          fieldType = `[]${getType(member.type, true)}`;
        } else {
          fieldType = getOptionalNodeType(member.type, !!member.questionToken);
        }
        fields.push(`\t${fieldName} ${fieldType}`);
      }
    }

    let result = `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}\n\n`;

    const ctor = (node.members ?? []).find((m) => isConstructorDeclaration(m)) as
      | AstNode
      | undefined;
    if (ctor) {
      const ctorParameterInfo = getFunctionParametersInfo(ctor.parameters ?? []);

      const bodyStatements =
        ctor.body?.statements
          .filter((s) => {
            if (isExpressionStatement(s) && isCallExpression(s.expression)) {
              return s.expression.expression.kind !== 'SuperKeyword';
            }
            return true;
          })
          .map((s) => visit(s))
          .join('\t') ?? '';

      result += `func New${name}${typeParams}(${ctorParameterInfo.signature}) *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\t${ctorParameterInfo.prefixBlockContent}${bodyStatements}return self;\n\t}\n\n`;
    } else {
      result += `func New${name}${typeParams}() *${name}${typeParamNames} {\n\t\treturn &${name}${typeParamNames}{}\n\t}\n\n`;
    }

    for (const member of (node.members ?? [])) {
      if (isMethodDeclaration(member)) {
        const methodName = visit(member.name);
        const methodParameterInfo = getFunctionParametersInfo(member.parameters ?? []);
        const returnType = member.type ? ` ${getType(member.type)}` : '';
        const isStatic = member.modifiers?.some((m) => m.kind === 'StaticKeyword');
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
        // Getter: get prop() { ... } → func (self *T) Prop() RetType { ... }
        const getterName = visit(member.name);
        const returnType = member.type ? ` ${getType(member.type)}` : ' interface{}';
        result += `func (self *${name}${typeParamNames}) Get_${getterName}()${returnType} ${visit(member.body!)}\n\n`;
      } else if (isSetAccessor(member)) {
        // Setter: set prop(val) { ... } → func (self *T) SetProp(val ValType) { ... }
        const setterName = visit(member.name);
        const parameterInfo = getFunctionParametersInfo(member.parameters ?? []);
        result += `func (self *${name}${typeParamNames}) Set_${setterName}(${parameterInfo.signature}) ${visit(member.body!, { prefixBlockContent: parameterInfo.prefixBlockContent })}\n\n`;
      }
    }

    // Static property declarations → package-level vars named ClassName_propName
    for (const member of (node.members ?? [])) {
      if (
        isPropertyDeclaration(member) &&
        member.modifiers?.some((m) => m.kind === 'StaticKeyword')
      ) {
        const fieldName = visit(member.name);
        const fieldType = getOptionalNodeType(member.type, !!member.questionToken);
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
    const typeArgs = getTypeArguments((node.typeArguments ?? []));
    const args = node.arguments ? (node.arguments ?? []).map((a) => visit(a)) : [];
    return `New${className}${typeArgs}(${args.join(', ')})`;
  } else if (isObjectLiteralExpression(node)) {
    let typeName = '';
    if (isVariableDeclaration(node.parent) && node.parent.type) {
      typeName = getTypeText(node.parent.type);
    }

    const properties = (node.properties ?? [])
      .map((p) => {
        if (isPropertyAssignment(p)) {
          return `${visit(p.name)}: ${visit(p.initializer)}`;
        }
        // Shorthand: { name } → name: name
        if (isShorthandPropertyAssignment(p)) {
          const name = visit(p.name);
          return `${name}: ${name}`;
        }
        // Spread: { ...obj } — not easily supported in Go structs, omit
        return '';
      })
      .filter((p) => p)
      .join(', ');

    return `${typeName}{${properties}}`;
  } else if (isPropertyAssignment(node)) {
    return `${visit(node.name)}: ${visit(node.initializer)}`;
  } else if (isNonNullExpression(node)) {
    return visit(node.expression);
  } else if (isImportDeclaration(node)) {
    return visitImportDeclaration(node);
  } else if (isExportDeclaration(node) || isExportAssignment(node)) {
    return '';
  }

  const syntaxKind = node.kind;
  if (!['FirstStatement', 'EndOfFileToken'].includes(syntaxKind)) {
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
};

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

function visitSpreadArrayLiteral(node: AstNode, elemType: string): string {
  // Build append chain for arrays with spread elements
  // [...arr1, x, y, ...arr2] → append(append(append([]T{}, arr1...), x, y), arr2...)
  type Chunk = { isSpread: boolean; items: AstNode[] };
  const chunks: Chunk[] = [];

  for (const el of (node.elements ?? [])) {
    if (isSpreadElement(el)) {
      chunks.push({ isSpread: true, items: [el.expression] });
    } else {
      const last = chunks[chunks.length - 1];
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
      result = `append(${result}, ${visit(chunk.items[0])}...)`;
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
    importedPackages.add('fmt');
    parts.push(`fmt.Sprintf("%v", ${visit(span.expression)})`);

    if (span.literal.text.length > 0) {
      parts.push(toGoStringLiteral(span.literal.text));
    }
  }

  if (parts.length === 0) {
    return '""';
  }

  return parts.join(' + ');
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
            variableGoTypes.set(decl.name.text, getType(decl.type));
          } else if (decl.initializer) {
            const inferredType = inferExpressionType(decl.initializer);
            if (inferredType) variableGoTypes.set(decl.name.text, inferredType);
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
  const params = (node.parameters ?? []).map((p) => (p.type ? getType(p.type) : 'interface{}')).join(', ');
  const retType = inferFunctionBodyReturnType(node);
  return `func(${params})${retType ? ` ${retType}` : ''}`;
}

function inferExpressionType(expr: AstNode): string | undefined {
  if (isArrowFunction(expr) || isFunctionExpression(expr)) {
    return inferArrowFunctionGoType(expr);
  }
  if (isParenthesizedExpression(expr)) return inferExpressionType(expr.expression);
  if (isNonNullExpression(expr)) return inferExpressionType(expr.expression);
  if (isAsExpression(expr)) return getType(expr.type);
  if (isTypeAssertionExpression(expr)) return getType(expr.type);
  if (
    isStringLiteral(expr) ||
    isNoSubstitutionTemplateLiteral(expr) ||
    isTemplateExpression(expr)
  ) {
    return 'string';
  }
  if (isNumericLiteral(expr)) return 'float64';
  if (expr.kind === 'TrueKeyword' || expr.kind === 'FalseKeyword')
    return 'bool';
  if (expr.kind === 'NullKeyword') return 'nil';
  if (isIdentifier(expr)) return variableGoTypes.get(expr.text);
  if (isArrayLiteralExpression(expr)) {
    const elements: AstNode[] = expr.elements ?? [];
    if (elements.length === 0) return '[]interface{}';
    const firstElementType =
      inferExpressionType(elements[0] as AstNode) ?? 'interface{}';
    return `[]${firstElementType}`;
  }
  if (isNewExpression(expr) && isIdentifier(expr.expression)) {
    const ctorName = expr.expression.text;
    if (ctorName === 'Map' && expr.typeArguments && expr.typeArguments.length === 2) {
      return `map[${getType(expr.typeArguments[0])}]${getType(expr.typeArguments[1])}`;
    }
    if (ctorName === 'Set' && expr.typeArguments && expr.typeArguments.length === 1) {
      return `map[${getType(expr.typeArguments[0])}]struct{}`;
    }
  }

  if (isPropertyAccessExpression(expr)) {
    if (isIdentifier(expr.expression) && enumNames.has(expr.expression.text)) {
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
        const memberType = resolvedPropertyType ?? 'interface{}';
        return makeNullableType(memberType);
      }
      return 'interface{}';
    }

    if (resolvedPropertyType) {
      return resolvedPropertyType;
    }

    if (isIdentifier(expr.expression)) {
      const className = variableClassNames.get(expr.expression.text);
      const memberType = className
        ? classPropertyTypes.get(className)?.get(expr.name.text)
        : undefined;
      if (memberType) return memberType;
    }
  }

  if (isCallExpression(expr) && isPropertyAccessExpression(expr.expression)) {
    const methodName = expr.expression.name.text;
    const ownerType = inferExpressionType(expr.expression.expression);

    if (ownerType && ownerType.startsWith('map[')) {
      if (methodName === 'has') return 'bool';
      if (methodName === 'get') return extractMapValueType(ownerType);
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
      if (methodName === 'filter') return `[]${elementType}`;
      if (methodName === 'some') return 'bool';
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
    if (whenTrueType && whenTrueType === whenFalseType) return whenTrueType;
    return whenTrueType ?? whenFalseType;
  }

  if (
    isBinaryExpression(expr) &&
    expr.operatorToken.kind === 'QuestionQuestionToken'
  ) {
    const leftType = inferExpressionType(expr.left);
    const rightType = inferExpressionType(expr.right);
    if (leftType && leftType.startsWith('*') && rightType === leftType.slice(1)) {
      return rightType;
    }
    return rightType ?? leftType;
  }

  return undefined;
}

function makeNullableType(typeName: string): string {
  if (!typeName || typeName === 'interface{}' || typeName.startsWith('*'))
    return typeName || 'interface{}';
  if (['string', 'float64', 'bool'].includes(typeName)) return `*${typeName}`;
  return typeName;
}

function visitConditionalExpression(node: AstNode): string {
  const whenTrue = visit(node.whenTrue);
  const whenFalse = visit(node.whenFalse);
  const resultType =
    inferExpectedTypeFromContext(node) ||
    (() => {
      const whenTrueType = inferExpressionType(node.whenTrue);
      const whenFalseType = inferExpressionType(node.whenFalse);
      if (whenTrueType && whenTrueType === whenFalseType) return whenTrueType;
      return whenTrueType ?? whenFalseType ?? 'interface{}';
    })();

  return `func() ${resultType} { if ${visit(node.condition)} { return ${whenTrue} }; return ${whenFalse} }()`;
}

function visitNullishCoalescingExpression(node: AstNode): string {
  const leftType = inferExpressionType(node.left);
  const rightType = inferExpressionType(node.right);

  if (leftType && leftType.startsWith('*')) {
    const leftValueType = leftType.slice(1);
    const expectedType = inferExpectedTypeFromContext(node);
    const resultType =
      expectedType || (rightType === leftValueType ? leftValueType : (rightType ?? leftType));
    const tmp = getTempName('nullish');
    const leftExpr = visit(node.left);
    const rightExpr = visit(node.right);
    const returnLeft = resultType === leftValueType ? `*${tmp}` : tmp;
    return `func() ${resultType} { ${tmp} := ${leftExpr}; if ${tmp} == nil { return ${rightExpr} }; return ${returnLeft} }()`;
  }

  return visit(node.left);
}

function visitOptionalPropertyAccess(node: AstNode): string {
  const baseExpr = visit(node.expression);
  const baseType = inferExpressionType(node.expression);
  if (!baseType || !baseType.startsWith('*')) {
    const objectType = resolveExpressionType(node.expression);
    return getAcessString(baseExpr, visit(node.name), objectType);
  }

  const className = baseType.replace(/^\*/, '').replace(/\[.*\]$/, '');
  const propertyType = classPropertyTypes.get(className)?.get(node.name.text) ?? 'interface{}';
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
  if (!baseType || !baseType.startsWith('*')) {
    return `${baseExpr}[int(${visit(node.argumentExpression)})]`;
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

function visitOptionalCall(node: AstNode): string {
  if (!isPropertyAccessExpression(node.expression)) {
    return `${visit(node.expression)}(${(node.arguments ?? []).map((a) => visit(a)).join(', ')})`;
  }

  const baseNode = node.expression.expression;
  const methodName = node.expression.name.text;
  const baseExpr = visit(baseNode);
  const baseType = inferExpressionType(baseNode);
  const args = (node.arguments ?? []).map((a) => visit(a)).join(', ');

  if (!baseType || !baseType.startsWith('*')) {
    return `${baseExpr}.${methodName}(${args})`;
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
      return fallbackType;
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
  forcedReturnType?: string
): ArrayCallbackInfo {
  if (isArrowFunction(callback) || isFunctionExpression(callback)) {
    const paramCount = callback.parameters.length;
    const callbackReturnType =
      forcedReturnType ?? inferArrayCallbackReturnType(callback, elementType, 'interface{}');

    const params: string[] = [];
    if (paramCount > 0) {
      params.push(`${visit(callback.parameters[0].name)} ${elementType}`);
    }
    if (paramCount > 1) {
      params.push(`${visit(callback.parameters[1].name)} float64`);
    }
    if (paramCount > 2) {
      params.push(`${visit(callback.parameters[2].name)} []${elementType}`);
    }

    const body = isBlock(callback.body)
      ? visit(callback.body, { inline: true })
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
  return `(${callbackInfo.fnExpr})(${args.join(', ')})`;
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
  if (!['map', 'filter', 'some', 'find', 'findIndex', 'every', 'forEach', 'reduce', 'join'].includes(methodName)) {
    return undefined;
  }

  const arrayExprNode = node.expression.expression;
  const arrayExpr = visit(arrayExprNode);
  const ownerType = inferExpressionType(arrayExprNode);
  const elementType = isArrayLikeGoType(ownerType)
    ? getArrayElementTypeFromGoType(ownerType!)
    : 'interface{}';

  if (methodName === 'join') {
    // Only intercept array.join — if owner type is unknown/not array, fall through to callHandlers
    if (!isArrayLikeGoType(ownerType)) return undefined;
    importedPackages.add('strings');
    importedPackages.add('fmt');
    const separator = (node.arguments ?? [])[0] ? visit((node.arguments ?? [])[0]) : '""';
    const arrVar = getTempName('arrjoin');
    const partsVar = getTempName('parts');
    return `func() string { ${arrVar} := ${arrayExpr}; ${partsVar} := make([]string, len(${arrVar})); for i, v := range ${arrVar} { ${partsVar}[i] = fmt.Sprintf("%v", v) }; return strings.Join(${partsVar}, ${separator}) }()`;
  }

  const callback = (node.arguments ?? [])[0];
  if (!callback) {
    return undefined;
  }

  const arrVar = getTempName('arrhof');
  const idxVar = getTempName('i');
  const itemVar = getTempName('item');

  if (methodName === 'map') {
    const callbackInfo = buildArrayCallbackInfo(callback, elementType, elementType);
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
    const cbInfo = buildArrayCallbackInfo(reduceCallback, elementType, accType ?? 'interface{}');
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

  return `type ${enumName} ${baseType}\n\nvar (\n${members.join('\n')}\n)`;
}

function getType(typeNode: AstNode, getArrayType = false): string {
  if (!typeNode) return ':';
  if (isArrayTypeNode(typeNode)) {
    const elementType = getType(typeNode.elementType);
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
      if (['float64', 'string', 'bool'].includes(innerType)) {
        return `*${innerType}`;
      }
      // Pointer/interface types already support nil
      return innerType;
    }
    // Non-nullable union or multi-type union → interface{}
    return 'interface{}';
  }
  if (isFunctionTypeNode(typeNode)) {
    const params = typeNode.parameters
      .map((p) => (p.type ? getType(p.type) : 'interface{}'))
      .join(', ');
    const ret = typeNode.type ? ` ${getType(typeNode.type)}` : '';
    return `func(${params})${ret}`;
  }
  if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    if (enumNames.has(name)) {
      return getSafeName(name);
    }
    const aliasType = getAliasType(name);
    if (aliasType) {
      return getType(aliasType, getArrayType);
    }
    if (name === 'Promise' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
      return `chan ${getType(typeNode.typeArguments[0])}`;
    }
    if (name === 'RegExp') {
      return '*regexp.Regexp';
    }
    if (name === 'Map' && typeNode.typeArguments && typeNode.typeArguments.length === 2) {
      const keyType = getType(typeNode.typeArguments[0]);
      const valueType = getType(typeNode.typeArguments[1]);
      return `map[${keyType}]${valueType}`;
    }
    if (name === 'Set' && typeNode.typeArguments && typeNode.typeArguments.length === 1) {
      const elementType = getType(typeNode.typeArguments[0]);
      return `map[${elementType}]struct{}`;
    }
    const typeArgs = getTypeArguments(typeNode.typeArguments);
    if (classNames.has(name)) {
      return `*${name}${typeArgs}`;
    }
    return `${name}${typeArgs}`;
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
      return ':';
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
    return variableTypes.get(expr.text);
  }
  if (expr.kind === 'ThisKeyword') {
    return 'class';
  }
  return undefined;
}

function isNilLiteral(node: AstNode): boolean {
  if (node.kind === 'NullKeyword') return true;
  if (isIdentifier(node) && node.text === 'undefined') return true;
  return false;
}

function getAcessString(leftSide: string, rightSide: string, objectType?: string): string {
  if (rightSide === 'length' && objectType !== 'class') {
    return `float64(len(${leftSide}))`;
  }
  if (rightSide === 'size' && (objectType === 'Map' || objectType === 'Set')) {
    return `float64(len(${leftSide}))`;
  }
  // process global properties
  if (leftSide === 'process') {
    if (rightSide === 'argv') {
      importedPackages.add('os');
      return 'os.Args';
    }
    if (rightSide === 'platform') {
      importedPackages.add('runtime');
      return 'runtime.GOOS';
    }
    if (rightSide === 'env') {
      // process.env.X is detected via the nested access below
      return 'process.env';
    }
  }

  // process.env.X → TnGetenv("X") (os.Environ() is a []string in Go, not a map)
  if (leftSide === 'process.env') {
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
  'Math.max': (_caller, args) => {
    importedPackages.add('math');
    return `math.Max(${args[0]}, ${args[1]})`;
  },
  'Math.min': (_caller, args) => {
    importedPackages.add('math');
    return `math.Min(${args[0]}, ${args[1]})`;
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
    importedPackages.add('strconv');
    return `func() float64 { v, _ := strconv.Atoi(${args[0]}); return float64(v) }()`;
  },
  parseFloat: (_caller, args) => {
    importedPackages.add('strconv');
    return `func() float64 { v, _ := strconv.ParseFloat(${args[0]}, 64); return v }()`;
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
    importedPackages.add('encoding/json');
    if (args.length >= 3) {
      return `func() string { __b, _ := json.MarshalIndent(${args[0]}, "", "  "); return string(__b) }()`;
    }
    return `func() string { __b, _ := json.Marshal(${args[0]}); return string(__b) }()`;
  },
  'JSON.parse': (_caller, args) => {
    importedPackages.add('encoding/json');
    return `func() interface{} { var __v interface{}; json.Unmarshal([]byte(${args[0]}), &__v); return __v }()`;
  },
  'Object.keys': (_caller, args) => {
    importedPackages.add('maps');
    return `func() []string { __k := make([]string, 0); for k := range ${args[0]} { __k = append(__k, k) }; return __k }()`;
  },
  'Object.values': (_caller, args) => {
    return `func() []interface{} { __v := make([]interface{}, 0); for _, v := range ${args[0]} { __v = append(__v, v) }; return __v }()`;
  },
  'Object.entries': (_caller, args) => {
    // When used outside for...of, produce a slice of [key, value] pairs — rarely needed
    return args[0];
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
  'console.error': (_caller, args) => {
    importedPackages.add('fmt');
    importedPackages.add('os');
    return `fmt.Fprintln(os.Stderr, ${args.join(', ')})`;
  },
  'String': (_caller, args) => {
    importedPackages.add('fmt');
    return `fmt.Sprintf("%v", ${args[0]})`;
  },
  'Number': (_caller, args) => {
    importedPackages.add('strconv');
    return `func() float64 { v, _ := strconv.ParseFloat(fmt.Sprintf("%v", ${args[0]}), 64); return v }()`;
  },
  'Boolean': (_caller, args) => {
    return `(${args[0]} != nil && ${args[0]} != false && ${args[0]} != 0 && ${args[0]} != "")`;
  },
};

type MethodHandler = (obj: string, args: string[]) => string;

const stringMethodHandlers: Record<string, MethodHandler> = {
  split: (obj, args) => {
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
    if (args.length >= 2) return `${obj}[int(${args[0]}):int(${args[1]})]`;
    return `${obj}[int(${args[0]}):]`;
  },
  slice: (obj, args) => {
    if (args.length >= 2) return `${obj}[int(${args[0]}):int(${args[1]})]`;
    return `${obj}[int(${args[0]}):]`;
  },
  concat: (obj, args) => `${obj} + ${args.join(' + ')}`,
  padStart: (obj, args) => {
    importedPackages.add('fmt');
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
    importedPackages.add('regexp');
    return `regexp.MustCompile(${args[0]}).FindStringSubmatch(${obj})`;
  },
  matchAll: (obj, args) => {
    importedPackages.add('regexp');
    return `regexp.MustCompile(${args[0]}).FindAllStringSubmatch(${obj}, -1)`;
  },
  search: (obj, args) => {
    importedPackages.add('regexp');
    return `float64(regexp.MustCompile(${args[0]}).FindStringIndex(${obj})[0])`;
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
  test: (obj, args) => `${obj}.MatchString(${args[0]})`,
  exec: (obj, args) => `${obj}.FindStringSubmatch(${args[0]})`
};

const arrayMethodHandlers: Record<string, MethodHandler> = {
  push: (obj, args) => `${obj} = append(${obj}, ${args.join(', ')})`,
  pop: (obj) => {
    return `func() interface{} { if len(${obj}) == 0 { return nil }; __last := ${obj}[len(${obj})-1]; ${obj} = ${obj}[:len(${obj})-1]; return __last }()`;
  },
  shift: (obj) => {
    return `func() interface{} { if len(${obj}) == 0 { return nil }; __first := ${obj}[0]; ${obj} = ${obj}[1:]; return __first }()`;
  },
  unshift: (obj, args) => `${obj} = append([]interface{}{${args.join(', ')}}, ${obj}...)`,
  join: (obj, args) => {
    importedPackages.add('strings');
    return `strings.Join(${obj}, ${args[0] ?? '""'})`;
  },
  slice: (obj, args) => {
    if (args.length >= 2) return `${obj}[int(${args[0]}):int(${args[1]})]`;
    return `${obj}[int(${args[0]}):]`;
  },
  reverse: (obj) => {
    importedPackages.add('slices');
    return `func() interface{} { slices.Reverse(${obj}); return nil }()`;
  },
  sort: (obj) => {
    importedPackages.add('sort');
    return `func() interface{} { sort.Slice(${obj}, func(i, j int) bool { return fmt.Sprintf("%v", ${obj}[i]) < fmt.Sprintf("%v", ${obj}[j]) }); return nil }()`;
  },
  indexOf: (obj, args) => {
    return `func() float64 { for __i, __v := range ${obj} { if fmt.Sprintf("%v", __v) == fmt.Sprintf("%v", ${args[0]}) { return float64(__i) } }; return float64(-1) }()`;
  },
  includes: (obj, args) => {
    return `func() bool { for _, __v := range ${obj} { if fmt.Sprintf("%v", __v) == fmt.Sprintf("%v", ${args[0]}) { return true } }; return false }()`;
  },
  concat: (obj, args) => `append(${obj}, ${args.join(', ')}...)`,
  flat: (obj) => obj,
  toString: (obj: string) => {
    importedPackages.add('fmt');
    return `fmt.Sprintf("%v", ${obj})`;
  },
  // padStart / padEnd for string arrays (rarely used, but added for completeness)
  at: (obj, args) => {
    return `func() interface{} { __i := int(${args[0]}); if __i < 0 { __i = len(${obj}) + __i }; if __i < 0 || __i >= len(${obj}) { return nil }; return ${obj}[__i] }()`;
  },
};

const mapMethodHandlers: Record<string, MethodHandler> = {
  set: (obj, args) => `${obj}[${args[0]}] = ${args[1]}`,
  get: (obj, args) => `${obj}[${args[0]}]`,
  has: (obj, args) => {
    const tmp = getTempName('ok');
    return `func() bool { _, ${tmp} := ${obj}[${args[0]}]; return ${tmp} }()`;
  },
  delete: (obj, args) => `delete(${obj}, ${args[0]})`,
  clear: (obj) => `clear(${obj})`
};

const setMethodHandlers: Record<string, MethodHandler> = {
  add: (obj, args) => `${obj}[${args[0]}] = struct{}{}`,
  has: (obj, args) => {
    const tmp = getTempName('ok');
    return `func() bool { _, ${tmp} := ${obj}[${args[0]}]; return ${tmp} }()`;
  },
  delete: (obj, args) => `delete(${obj}, ${args[0]})`,
  clear: (obj) => `clear(${obj})`
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
      return (c) => {
        const obj = c.substring(0, dotIndex);
        importedPackages.add('fmt');
        return `fmt.Sprintf("%v", ${obj})`;
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

function jsRegexFlagsToGo(flags: string): string {
  let goFlags = '';
  if (flags.includes('i')) goFlags += 'i';
  if (flags.includes('m')) goFlags += 'm';
  if (flags.includes('s')) goFlags += 's';
  return goFlags ? `(?${goFlags})` : '';
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
    const explicitType = getType(param.type);
    return explicitType === ':' ? 'interface{}' : explicitType;
  }

  if (param.initializer) {
    const inferredType = inferExpressionType(param.initializer);
    if (inferredType && inferredType !== 'nil' && inferredType !== ':') {
      return inferredType;
    }
  }

  return 'interface{}';
}

function getFunctionParametersInfo(
  parameters: AstNode[]
): FunctionParametersInfo {
  if (parameters.length === 0) {
    return { signature: '', prefixBlockContent: '' };
  }

  const firstDefaultIndex = parameters.findIndex((p) => !!p.initializer);
  if (firstDefaultIndex === -1) {
    return {
      signature: parameters.map((p) => `${visit(p.name)} ${getParameterGoType(p)}`).join(', '),
      prefixBlockContent: ''
    };
  }

  const hasRequiredAfterDefault = parameters.slice(firstDefaultIndex).some((p) => !p.initializer);

  if (hasRequiredAfterDefault) {
    return {
      signature: parameters.map((p) => `${visit(p.name)} ${getParameterGoType(p)}`).join(', '),
      prefixBlockContent: ''
    };
  }

  const requiredParams = parameters.slice(0, firstDefaultIndex);
  const defaultedParams = parameters.slice(firstDefaultIndex);

  const signatureParts = requiredParams.map((p) => `${visit(p.name)} ${getParameterGoType(p)}`);
  signatureParts.push('__defaultArgs ...interface{}');

  const prefixBlockContent = defaultedParams
    .map((param, index) => {
      const paramName = visit(param.name);
      const paramType = getParameterGoType(param);
      const defaultValue = visit(param.initializer!);

      if (paramType === 'interface{}') {
        return `var ${paramName} interface{}\n\t\tif len(__defaultArgs) > ${index} {\n\t\t\t${paramName} = __defaultArgs[${index}]\n\t\t} else {\n\t\t\t${paramName} = ${defaultValue}\n\t\t}\n\t\t`;
      }

      return `var ${paramName} ${paramType}\n\t\tif len(__defaultArgs) > ${index} {\n\t\t\t${paramName} = __defaultArgs[${index}].(${paramType})\n\t\t} else {\n\t\t\t${paramName} = ${defaultValue}\n\t\t}\n\t\t`;
    })
    .join('');

  return {
    signature: signatureParts.join(', '),
    prefixBlockContent
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
  let parent: AstNode | undefined = node.parent;
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
          return getType(parent.type.typeArguments[0]);
        }
      }
      break;
    }
    parent = parent.parent;
  }
  return 'interface{}';
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
  // mapType is "map[K]V" — find the closing bracket of K accounting for nesting
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

function visitNewMap(node: AstNode): string {
  let keyType = 'interface{}';
  let valueType = 'interface{}';
  if ((node.typeArguments ?? []) && (node.typeArguments ?? []).length === 2) {
    keyType = getType((node.typeArguments ?? [])[0]);
    valueType = getType((node.typeArguments ?? [])[1]);
  }
  const mapType = `map[${keyType}]${valueType}`;
  const args = (node.arguments ?? []);
  if (!args || args.length === 0 || !isArrayLiteralExpression(args[0])) {
    return `make(${mapType})`;
  }
  const initArg = args[0] as AstNode;
  const tmp = getTempName('map');
  const entries = initArg.elements
    .filter((el) => isArrayLiteralExpression(el) && el.elements.length >= 2)
    .map((el) => {
      const pair = el as AstNode;
      return `${tmp}[${visit(pair.elements[0])}] = ${visit(pair.elements[1])}`;
    })
    .join('; ');
  return `func() ${mapType} { ${tmp} := make(${mapType}); ${entries}; return ${tmp} }()`;
}

function visitNewSet(node: AstNode): string {
  let elementType = 'interface{}';
  if ((node.typeArguments ?? []) && (node.typeArguments ?? []).length === 1) {
    elementType = getType((node.typeArguments ?? [])[0]);
  }
  const setType = `map[${elementType}]struct{}`;
  const args = (node.arguments ?? []);
  if (!args || args.length === 0 || !isArrayLiteralExpression(args[0])) {
    return `make(${setType})`;
  }
  const initArg = args[0] as AstNode;
  const tmp = getTempName('set');
  const values = initArg.elements.map((el) => `${tmp}[${visit(el)}] = struct{}{}`).join('; ');
  return `func() ${setType} { ${tmp} := make(${setType}); ${values}; return ${tmp} }()`;
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
    const sf = parseFunction(code);
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

  const sf = parseFunction(code);
  const inlineLines: string[] = [];
  for (const stmt of sf.statements) {
    const result = visit(stmt, { addFunctionOutside: true });
    if (result.trim()) inlineLines.push(result);
  }

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
      const name = pkg.split('/').pop()!;
      return fileCode.includes(`${name}.`);
    })
    .map((pkg) => `import "${pkg}"`)
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
function useHelper(id: string): void {
  if (usedHelpers.has(id)) return;
  usedHelpers.add(id);
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
        if (args[2]?.includes('inherit')) {
          return `TnRunInherit(${args[0]})`;
        }
        // Untyped array literals visit as `[] {…}` — give them the []string
        // type the variadic helper needs (`[]string{…}...` is valid Go spread)
        const arrArg = args[1] ?? '[]string{}';
        const typedArg = arrArg.startsWith('[]') && !arrArg.startsWith('[]string')
          ? `[]string ${arrArg.slice(2)}`
          : arrArg;
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
	if unescaped, err := url.PathUnescape(trimmed); err == nil {
		trimmed = unescaped
	}
	return filepath.FromSlash(trimmed)
}`,
  pathToFileURL: `func TnPathToFileURL(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		panic(err)
	}
	return "file://" + url.PathEscape(filepath.ToSlash(abs))
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
  runInherit: `func TnRunInherit(name string, args ...string) float64 {
	cmd := exec.Command(name, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return float64(exitErr.ExitCode())
		}
		panic(err)
	}
	return 0
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
    .map((id) => goHelpers[id])
    .filter(Boolean)
    .join('\n\n');
}

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

function visitTryStatement(node: AstNode, options: VisitNodeOptions): string {
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
    const catchBody = (node.catchClause.block.statements ?? []).map((s) => visit(s)).join('\t');
    deferreds.push(
      `defer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\t${catchVar} := r\n\t\t\t\t_ = ${catchVar}\n\t\t\t\t${catchBody}\t\t\t}\n\t\t\t}()`
    );
  }

  const tryBody = (node.tryBlock.statements ?? []).map((s) => visit(s)).join('\t');
  const body = [...deferreds, tryBody].join('\n\t\t\t');

  return `func() {\n\t\t\t${body}\n\t\t\t}()` + (options.inline ? '' : ';\n\t');
}
