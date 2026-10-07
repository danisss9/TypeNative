// Shim over the removed `typescript` import: predicates and kind names operate
// on the normalized JSON AST ({kind: 'Xxx', ...} plain objects) produced by
// src/parse-node.ts (Node) or the tsparser Go tool (self-hosted).
// Kept as a `ts` object so the transpiler code keeps its shape.
function isArrayBindingPattern(n) {
    return n?.kind === 'ArrayBindingPattern';
}
function isArrayLiteralExpression(n) {
    return n?.kind === 'ArrayLiteralExpression';
}
function isArrayTypeNode(n) {
    return n?.kind === 'ArrayType';
}
function isArrowFunction(n) {
    return n?.kind === 'ArrowFunction';
}
function isAsExpression(n) {
    return n?.kind === 'AsExpression';
}
function isAwaitExpression(n) {
    return n?.kind === 'AwaitExpression';
}
function isBinaryExpression(n) {
    return n?.kind === 'BinaryExpression';
}
function isBlock(n) {
    return n?.kind === 'Block';
}
function isBreakStatement(n) {
    return n?.kind === 'BreakStatement';
}
function isCallExpression(n) {
    return n?.kind === 'CallExpression';
}
function isCaseBlock(n) {
    return n?.kind === 'CaseBlock';
}
function isCaseClause(n) {
    return n?.kind === 'CaseClause';
}
function isClassDeclaration(n) {
    return n?.kind === 'ClassDeclaration';
}
function isConditionalExpression(n) {
    return n?.kind === 'ConditionalExpression';
}
function isConstructorDeclaration(n) {
    return n?.kind === 'Constructor';
}
function isDefaultClause(n) {
    return n?.kind === 'DefaultClause';
}
function isDoStatement(n) {
    return n?.kind === 'DoStatement';
}
function isElementAccessExpression(n) {
    return n?.kind === 'ElementAccessExpression';
}
function isEnumDeclaration(n) {
    return n?.kind === 'EnumDeclaration';
}
function isExportAssignment(n) {
    return n?.kind === 'ExportAssignment';
}
function isExportDeclaration(n) {
    return n?.kind === 'ExportDeclaration';
}
function isExpressionStatement(n) {
    return n?.kind === 'ExpressionStatement';
}
function isForInStatement(n) {
    return n?.kind === 'ForInStatement';
}
function isForOfStatement(n) {
    return n?.kind === 'ForOfStatement';
}
function isForStatement(n) {
    return n?.kind === 'ForStatement';
}
function isFunctionDeclaration(n) {
    return n?.kind === 'FunctionDeclaration';
}
function isFunctionExpression(n) {
    return n?.kind === 'FunctionExpression';
}
function isFunctionTypeNode(n) {
    return n?.kind === 'FunctionType';
}
function isGetAccessor(n) {
    return n?.kind === 'GetAccessor';
}
function isIdentifier(n) {
    return n?.kind === 'Identifier';
}
function isIfStatement(n) {
    return n?.kind === 'IfStatement';
}
function isImportDeclaration(n) {
    return n?.kind === 'ImportDeclaration';
}
function isInterfaceDeclaration(n) {
    return n?.kind === 'InterfaceDeclaration';
}
function isLiteralTypeNode(n) {
    return n?.kind === 'LiteralType';
}
function isMethodDeclaration(n) {
    return n?.kind === 'MethodDeclaration';
}
function isMethodSignature(n) {
    return n?.kind === 'MethodSignature';
}
function isNamedImports(n) {
    return n?.kind === 'NamedImports';
}
function isNamespaceImport(n) {
    return n?.kind === 'NamespaceImport';
}
function isNewExpression(n) {
    return n?.kind === 'NewExpression';
}
function isNoSubstitutionTemplateLiteral(n) {
    return n?.kind === 'NoSubstitutionTemplateLiteral';
}
function isNonNullExpression(n) {
    return n?.kind === 'NonNullExpression';
}
function isNumericLiteral(n) {
    return n?.kind === 'NumericLiteral';
}
function isObjectBindingPattern(n) {
    return n?.kind === 'ObjectBindingPattern';
}
function isObjectLiteralExpression(n) {
    return n?.kind === 'ObjectLiteralExpression';
}
function isOmittedExpression(n) {
    return n?.kind === 'OmittedExpression';
}
function isParenthesizedExpression(n) {
    return n?.kind === 'ParenthesizedExpression';
}
function isPostfixUnaryExpression(n) {
    return n?.kind === 'PostfixUnaryExpression';
}
function isPrefixUnaryExpression(n) {
    return n?.kind === 'PrefixUnaryExpression';
}
function isPropertyAccessExpression(n) {
    return n?.kind === 'PropertyAccessExpression';
}
function isPropertyAssignment(n) {
    return n?.kind === 'PropertyAssignment';
}
function isPropertyDeclaration(n) {
    return n?.kind === 'PropertyDeclaration';
}
function isPropertySignature(n) {
    return n?.kind === 'PropertySignature';
}
function isRegularExpressionLiteral(n) {
    return n?.kind === 'RegularExpressionLiteral';
}
function isReturnStatement(n) {
    return n?.kind === 'ReturnStatement';
}
function isSetAccessor(n) {
    return n?.kind === 'SetAccessor';
}
function isShorthandPropertyAssignment(n) {
    return n?.kind === 'ShorthandPropertyAssignment';
}
function isSourceFile(n) {
    return n?.kind === 'SourceFile';
}
function isSpreadElement(n) {
    return n?.kind === 'SpreadElement';
}
function isStringLiteral(n) {
    return n?.kind === 'StringLiteral';
}
function isSwitchStatement(n) {
    return n?.kind === 'SwitchStatement';
}
function isTemplateExpression(n) {
    return n?.kind === 'TemplateExpression';
}
function isThrowStatement(n) {
    return n?.kind === 'ThrowStatement';
}
function isTryStatement(n) {
    return n?.kind === 'TryStatement';
}
function isTypeAliasDeclaration(n) {
    return n?.kind === 'TypeAliasDeclaration';
}
function isTypeAssertionExpression(n) {
    return n?.kind === 'TypeAssertionExpression';
}
function isTypeReferenceNode(n) {
    return n?.kind === 'TypeReference';
}
function isUnionTypeNode(n) {
    return n?.kind === 'UnionType';
}
function isVariableDeclaration(n) {
    return n?.kind === 'VariableDeclaration';
}
function isVariableDeclarationList(n) {
    return n?.kind === 'VariableDeclarationList';
}
function isVariableStatement(n) {
    return n?.kind === 'VariableStatement';
}
function isWhileStatement(n) {
    return n?.kind === 'WhileStatement';
}
function isToken(_n) {
    return true;
}
const SyntaxKind = {
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
function goSafeId() {
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += GO_SAFE_ALPHABET.charAt(Math.floor(Math.random() * GO_SAFE_ALPHABET.length));
    }
    return id;
}
let parseFunction;
// Declarations of every parsed file, collected before visiting (functions are
// hoisted, so call sites may precede them) for contextual typing
const declaredFunctions = new Map();
const declaredInterfaces = new Map();
const declaredTypeAliases = new Map();
// Package-level declarations of the main file's top-level variables
const mainPackageVariables = [];
// True while emitting a separate Go file, whose top-level statements sit at package scope
let emittingModuleFile = false;
const importedPackages = new Set();
let outsideNodes = [];
const classNames = new Set();
let promiseResolveName = '';
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
const renamedFunctions = new Map();
// Go type of the receiver of the method call being emitted (for method handlers)
let currentReceiverGoType;
// Struct field / member names: Go keywords get a trailing underscore
function goFieldName(name) {
    return name !== 'main' && dangerousNames.has(name) ? `${name}_` : name;
}
function isFieldNameIdentifier(node) {
    const parent = node.parent;
    if (!parent || parent.name !== node)
        return false;
    return (isPropertyAccessExpression(parent) ||
        isPropertyAssignment(parent) ||
        isPropertySignature(parent) ||
        isPropertyDeclaration(parent));
}
const variableTypes = new Map();
const variableGoTypes = new Map();
const variableClassNames = new Map();
const classPropertyTypes = new Map();
const classMethodReturnTypes = new Map();
const interfacePropertyTypes = new Map();
const typeAliases = new Map();
const enumNames = new Set();
const enumBaseTypes = new Map();
// Maps local TS name → Go qualified name (e.g. 'Println' → 'fmt.Println', 'myFmt' → 'fmt')
const importAliases = new Map();
// Tracks static methods per class: Set of "ClassName.methodName" strings
const classStaticMethods = new Set();
// Tracks static properties per class: Set of "ClassName.propName" strings
const classStaticProps = new Set();
// Callback for resolving import specifiers to source code.
// specifier: the raw import string (relative path or package name)
// fromDir: directory of the file containing the import (null = main file's dir)
// Returns the file content and its directory (for resolving that file's own imports)
let fileResolver = null;
// Directory of the file currently being processed (null = main entry file)
let currentFileDir = null;
// Tracks already-included files by a stable key to prevent duplicates/cycles
const includedLocalImports = new Set();
// Collects Go source files generated from local TS imports (filename → content)
let localImportFiles = new Map();
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
};
function operatorTokenText(token) {
    return OPERATOR_TEXT[token?.kind] ?? token?.kind ?? '';
}
function defaultParseFunction(_code) {
    throw new Error('transpileToNative: no parse function injected (options.parse)');
}
// Parses via the injected parser and links each node to its parent: the JSON
// AST carries no parent pointers, but the transpiler walks up via node.parent.
function parseSource(code) {
    const sourceFile = parseFunction(code);
    linkParents(sourceFile, undefined);
    for (const stmt of sourceFile.statements ?? []) {
        if (!stmt.name || !isIdentifier(stmt.name))
            continue;
        if (isFunctionDeclaration(stmt))
            declaredFunctions.set(stmt.name.text, stmt);
        else if (isInterfaceDeclaration(stmt))
            declaredInterfaces.set(stmt.name.text, stmt);
        else if (isTypeAliasDeclaration(stmt))
            declaredTypeAliases.set(stmt.name.text, stmt.type);
    }
    return sourceFile;
}
function linkParents(node, parent) {
    node.parent = parent;
    for (const key of Object.keys(node)) {
        if (key === 'parent')
            continue;
        const value = node[key];
        if (Array.isArray(value)) {
            for (const child of value) {
                if (child && typeof child === 'object' && child.kind)
                    linkParents(child, node);
            }
        }
        else if (value && typeof value === 'object' && value.kind) {
            linkParents(value, node);
        }
    }
}
// Renders a type node's source text syntactically (no typechecker needed).
function isAnyTypeNode(n) {
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
    const out = [];
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
const defaultImportNamespaces = new Set();
// Go helper functions required by the current transpilation (e.g. 'exec', 'readFile').
// Helper sources are appended to every generated Go file that references them.
const usedHelpers = new Set();
// Packages that were imported only because a helper needs them. Tracked so
// per-file import lists can exclude them (helpers are emitted once, in the
// main file, which carries these imports instead).
const helperProvidedPackages = new Set();
export function transpileToNative(code, options) {
    fileResolver = options?.readFile ?? null;
    parseFunction = options?.parse ?? defaultParseFunction;
    declaredFunctions.clear();
    declaredInterfaces.clear();
    declaredTypeAliases.clear();
    variableTypeNodes.clear();
    narrowedVariables.clear();
    nodeCallResultTypes.clear();
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
    usedHelpers.clear();
    helperProvidedPackages.clear();
    mainPackageVariables.length = 0;
    const transpiledCode = visit(sourceFile, { addFunctionOutside: true });
    const transpiledCodeOutside = outsideNodes.map((n) => visit(n, { isOutside: true })).join('\n');
    const main = `package main

${[...importedPackages].map((pkg) => `import "${pkg}"`).join('\n')}

${mainPackageVariables.join('\n')}

func main() {
    ${transpiledCode.trim()}
}

${transpiledCodeOutside.trim()}
${emitGoHelpers()}`.trimEnd();
    return { main, files: localImportFiles };
}
export function visit(node, options = {}) {
    let code = '';
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
    }
    else if (isIdentifier(node)) {
        if (isFieldNameIdentifier(node))
            return goFieldName(node.text);
        if (node.text === 'Boolean' && isCallExpression(node.parent) && node.parent.arguments?.[0] === node) {
            const receiver = isPropertyAccessExpression(node.parent.expression)
                ? inferExpressionType(node.parent.expression.expression)
                : undefined;
            const elementType = receiver?.startsWith('[]') ? receiver.slice(2) : 'interface{}';
            return `func(__v ${elementType}) bool { return ${truthinessCheck('__v', elementType)} }`;
        }
        if (node.text === 'undefined')
            return 'nil';
        const goAlias = importAliases.get(node.text);
        if (goAlias)
            return goAlias;
        if (narrowedVariables.has(node.text) && isNarrowableReference(node)) {
            return `(*${getSafeName(node.text)})`;
        }
        return getSafeName(node.text);
    }
    else if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
        return toGoStringLiteral(node.text);
    }
    else if (isAsExpression(node)) {
        return visit(node.expression);
    }
    else if (isTypeAssertionExpression(node)) {
        return visit(node.expression);
    }
    else if (isTemplateExpression(node)) {
        return visitTemplateExpression(node);
    }
    else if (isNumericLiteral(node)) {
        return `float64(${node.text})`;
    }
    else if (isToken(node) && node.kind === 'TrueKeyword') {
        return `true`;
    }
    else if (isToken(node) && node.kind === 'FalseKeyword') {
        return `false`;
    }
    else if (isToken(node) && node.kind === 'NullKeyword') {
        return `nil`;
    }
    else if (isRegularExpressionLiteral(node)) {
        importedPackages.add('regexp');
        const text = node.text; // e.g. /pattern/flags
        const lastSlash = text.lastIndexOf('/');
        const pattern = text.substring(1, lastSlash);
        const flags = text.substring(lastSlash + 1);
        const goFlags = jsRegexFlagsToGo(flags);
        const escaped = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `regexp.MustCompile("${goFlags}${escaped}")`;
    }
    else if (isArrayLiteralExpression(node)) {
        const type = getArrayLiteralElementType(node);
        const hasSpread = (node.elements ?? []).some((e) => isSpreadElement(e));
        if (hasSpread) {
            return visitSpreadArrayLiteral(node, type);
        }
        return `[]${type} {${(node.elements ?? []).map((e) => visit(e)).join(', ')}}`;
    }
    else if (isBlock(node)) {
        return `{\n\t\t${options.prefixBlockContent ?? ''}${visitBlockStatements(node.statements ?? [])}${options.extraBlockContent ?? ''}}${options.inline ? '' : '\n\t'}`;
    }
    else if (isElementAccessExpression(node)) {
        if (hasQuestionDot(node)) {
            return visitOptionalElementAccess(node);
        }
        // Maps (Record/Map) and string keys index directly; arrays/strings need an int index
        const targetType = inferExpressionType(node.expression);
        if (targetType === 'string') {
            // s[i] in JS is a one-character string; in Go it is a byte
            return `string(${visit(node.expression)}[int(${visit(node.argumentExpression)})])`;
        }
        if (targetType?.startsWith('map[') || isStringLiteral(node.argumentExpression)) {
            return `${visit(node.expression)}[${visit(node.argumentExpression)}]`;
        }
        return `${visit(node.expression)}[int(${visit(node.argumentExpression)})]`;
    }
    else if (isPropertyAccessExpression(node)) {
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
    }
    else if (isVariableDeclaration(node)) {
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
                if (isOmittedExpression(el))
                    return;
                const bindEl = el;
                const localName = visit(bindEl.name);
                // Variables starting with _ are intentionally unused — use blank identifier
                if (localName === '_' || localName.startsWith('_')) {
                    parts.push(`_ = ${tmpVar}[${idx}]`);
                }
                else {
                    parts.push(`${localName} := ${tmpVar}[${idx}]`);
                }
            });
            return parts.join(';\n\t');
        }
        // `const x: any = expr` keeps inference (x := expr); `any` elsewhere is interface{}
        const isInferredAny = isAnyTypeNode(node.type) && !!node.initializer;
        const type = isInferredAny ? ':' : getType(node.type);
        // Track variable type for type-aware method dispatch
        if (isIdentifier(node.name)) {
            // A declaration replaces whatever an earlier variable of the same name recorded
            const inferredType = node.initializer && (!node.type || isInferredAny)
                ? inferExpressionType(node.initializer)
                : undefined;
            variableTypes.delete(node.name.text);
            variableClassNames.delete(node.name.text);
            narrowedVariables.delete(node.name.text);
            if (node.type && !isInferredAny)
                variableTypeNodes.set(node.name.text, node.type);
            else
                variableTypeNodes.delete(node.name.text);
            if (node.type && !isInferredAny) {
                variableGoTypes.set(node.name.text, getType(node.type));
            }
            else if (inferredType) {
                variableGoTypes.set(node.name.text, inferredType);
            }
            else {
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
            }
            else if (node.initializer &&
                isNewExpression(node.initializer) &&
                isIdentifier(node.initializer.expression)) {
                if (node.initializer.expression.text === 'RegExp') {
                    variableTypes.set(node.name.text, 'RegExp');
                }
                else if (classNames.has(node.initializer.expression.text)) {
                    variableTypes.set(node.name.text, 'class');
                    variableClassNames.set(node.name.text, node.initializer.expression.text);
                }
            }
            else if (node.initializer && isRegularExpressionLiteral(node.initializer)) {
                variableTypes.set(node.name.text, 'RegExp');
            }
        }
        let initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
        // Wrap non-nil values assigned to nullable primitive pointer types
        // Only wrap for primitive pointers (*string, *float64, *bool), not class pointers
        if (node.initializer && type.startsWith('*')) {
            initializer = `= ${toGoValueOfType(node.initializer, type)}`;
        }
        // Package scope has no `:=`: module-level declarations need `var x = expr`
        const isPackageScope = emittingModuleFile && isSourceFile(node.parent?.parent?.parent);
        if (type === ':' && isPackageScope) {
            return `var ${visit(node.name)} ${initializer}`;
        }
        const isMainTopLevel = !emittingModuleFile && isSourceFile(node.parent?.parent?.parent);
        const packageType = type === ':' ? variableGoTypes.get(node.name.text) : type;
        if (isMainTopLevel && packageType && packageType !== 'nil' && isIdentifier(node.name)) {
            const name = visit(node.name);
            mainPackageVariables.push(`var ${name} ${packageType}`);
            return initializer ? `${name} ${initializer}` : '';
        }
        return `${type === ':' ? '' : 'var '}${visit(node.name)} ${type}${type === ':' ? '' : ' '}${initializer}`;
    }
    else if (isCallExpression(node)) {
        if (hasQuestionDot(node) ||
            (isPropertyAccessExpression(node.expression) && hasQuestionDot(node.expression))) {
            return visitOptionalCall(node);
        }
        if (isPropertyAccessExpression(node.expression) && isOptionalChain(node.expression.expression)) {
            const receiverType = inferExpressionType(node.expression.expression);
            if (receiverType && NULLABLE_PRIMITIVE_TYPES.includes(receiverType)) {
                return visitNullablePrimitiveOptionalCall(node, visit(node.expression.expression), receiverType);
            }
        }
        const regexReplace = visitRegexReplace(node);
        if (regexReplace)
            return regexReplace;
        // IIFE with named function expression: (function name() { ... })()
        if (isParenthesizedExpression(node.expression) &&
            isFunctionExpression(node.expression.expression)) {
            const fn = node.expression.expression;
            const parameterInfo = getFunctionParametersInfo(fn.parameters ?? []);
            if (fn.body && isBlock(fn.body)) {
                prescanVariableDeclarations(fn.body);
            }
            const inferredRetType = inferFunctionBodyReturnType(fn);
            const returnType = inferredRetType ? ` ${inferredRetType}` : '';
            const args = (node.arguments ?? []).map((a) => visit(a)).join(', ');
            return `func(${parameterInfo.signature})${returnType} ${visit(fn.body, { prefixBlockContent: parameterInfo.prefixBlockContent }).trimEnd()}(${args})`;
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
            ? (node.arguments ?? []).map((a) => isSpreadElement(a) ? `${visit(a.expression)}...` : visit(a))
            : visitCallArguments(node);
        // Resolve object type for type-aware method dispatch
        let objectType;
        if (isPropertyAccessExpression(node.expression)) {
            objectType = resolveExpressionType(node.expression.expression);
        }
        currentReceiverGoType = isPropertyAccessExpression(node.expression)
            ? inferExpressionType(node.expression.expression)
            : undefined;
        return getCallString(safeCaller, args, typeArgs, objectType);
    }
    else if (isPrefixUnaryExpression(node)) {
        if (node.operator === 'ExclamationToken') {
            return `!${wrapCondition(toGoCondition(node.operand))}`;
        }
        return `${getOperatorText(node.operator)}${visit(node.operand)}`;
    }
    else if (isPostfixUnaryExpression(node)) {
        return `${visit(node.operand, { inline: true })}${getOperatorText(node.operator)}`;
    }
    else if (isConditionalExpression(node)) {
        return visitConditionalExpression(node);
    }
    else if (isBinaryExpression(node)) {
        if (node.operatorToken.kind === 'QuestionQuestionToken') {
            return visitNullishCoalescingExpression(node);
        }
        if (node.operatorToken.kind === 'InKeyword') {
            return `func() bool { _, ok := ${visit(node.right)}[${visit(node.left)}]; return ok }()`;
        }
        if (isLogicalOperator(node.operatorToken)) {
            const logical = visitLogicalExpression(node);
            if (logical)
                return logical;
        }
        let op = operatorTokenText(node.operatorToken);
        if (op === '===')
            op = '==';
        if (op === '!==')
            op = '!=';
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
        if (op === '==' || op === '!=') {
            const nullableComparison = visitNullableComparison(node, op);
            if (nullableComparison)
                return nullableComparison;
            // A value type (string, number, struct…) is never null/undefined
            const otherSide = isNilLiteral(node.right) ? node.left : isNilLiteral(node.left) ? node.right : undefined;
            const otherType = otherSide ? inferExpressionType(otherSide) : undefined;
            if (otherType && otherType !== 'nil' && !isNilableGoType(otherType)) {
                return op === '!=' ? 'true' : 'false';
            }
        }
        // arr.length = n truncates the slice
        if (op === '=' &&
            isPropertyAccessExpression(node.left) &&
            node.left.name.text === 'length' &&
            inferExpressionType(node.left.expression)?.startsWith('[]')) {
            const array = visit(node.left.expression);
            return `${array} = ${array}[:int(${visit(node.right)})]`;
        }
        // Assigning to a nullable primitive (*T) boxes the value
        if (op === '=' && isIdentifier(node.left)) {
            const leftType = variableGoTypes.get(node.left.text);
            if (leftType && NULLABLE_PRIMITIVE_TYPES.includes(leftType)) {
                return `${getSafeName(node.left.text)} = ${toGoValueOfType(node.right, leftType)}`;
            }
        }
        if (op === '&&' || op === '||') {
            const right = withNarrowing(getNarrowedNames(node.left, op === '&&'), () => visit(node.right));
            return `${visit(node.left)} ${op} ${right}`;
        }
        return `${visit(node.left)} ${op} ${visit(node.right)}`;
    }
    else if (isParenthesizedExpression(node)) {
        return `(${visit(node.expression)})`;
    }
    else if (isAwaitExpression(node)) {
        return `<-${visit(node.expression)}`;
    }
    else if (isVariableDeclarationList(node)) {
        return ((node.declarations ?? []).map((n) => visit(n)).join(options.inline ? ';' : ';\n\t') +
            (options.inline ? '' : ';\n\t'));
    }
    else if (isExpressionStatement(node)) {
        return visit(node.expression) + (options.inline ? '' : ';\n\t');
    }
    else if (isForStatement(node)) {
        return `for ${visit(node.initializer, { inline: true })}; ${node.condition ? toGoCondition(node.condition) : ''}; ${visit(node.incrementor, { inline: true })}${visitLoopBody(node.statement)}`;
    }
    else if (isForInStatement(node)) {
        const varName = isVariableDeclarationList(node.initializer)
            ? visit(node.initializer.declarations[0].name)
            : visit(node.initializer);
        return `for ${varName} := range ${visit(node.expression, { inline: true })}${visitLoopBody(node.statement)}`;
    }
    else if (isForOfStatement(node)) {
        // Unwrap Object.entries(x) → treat x as the iterable
        let iterNode = node.expression;
        if (isCallExpression(iterNode) &&
            isPropertyAccessExpression(iterNode.expression) &&
            isIdentifier(iterNode.expression.expression) &&
            iterNode.expression.expression.text === 'Object' &&
            iterNode.expression.name.text === 'entries' &&
            iterNode.arguments.length > 0) {
            iterNode = iterNode.arguments[0];
        }
        const iterExpr = visit(iterNode, { inline: true });
        const iterType = inferExpressionType(iterNode);
        if (iterType && iterType.startsWith('map[')) {
            const valueType = extractMapValueType(iterType);
            const isSet = valueType === 'struct{}';
            const varInfo = getForOfVarNames(node.initializer);
            registerLocalVariable(varInfo[0], extractMapKeyType(iterType));
            if (varInfo.length >= 2 && !isSet)
                registerLocalVariable(varInfo[1], valueType);
            if (isSet) {
                return `for ${varInfo[0]} := range ${iterExpr}${visitLoopBody(node.statement)}`;
            }
            else if (varInfo.length >= 2) {
                return `for ${varInfo[0]}, ${varInfo[1]} := range ${iterExpr}${visitLoopBody(node.statement)}`;
            }
            else {
                return `for ${varInfo[0]} := range ${iterExpr}${visitLoopBody(node.statement)}`;
            }
        }
        return visitForOfSequence(node, iterExpr, iterType);
    }
    else if (isWhileStatement(node)) {
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
    }
    else if (isDoStatement(node)) {
        const condition = `\tif !(${toGoCondition(node.expression)}) {\n\t\t\tbreak \n\t\t}\n\t`;
        return `for ${visit(node.statement, { inline: true, extraBlockContent: condition })}`;
    }
    else if (isIfStatement(node)) {
        // Go requires the branch body to be a block even for single statements
        // Go requires a block body; `} else` must stay on the same line, so the
        // terminating ';' is only added when no else branch follows
        const thenTerm = node.elseStatement ? '' : ';';
        const thenCode = withNarrowing(getNarrowedNames(node.expression, true), () => isBlock(node.thenStatement)
            ? visit(node.thenStatement, { inline: !!node.elseStatement })
            : `{\n${visit(node.thenStatement)}\n}${thenTerm}`);
        const condition = `if ${toGoCondition(node.expression)} ${thenCode}`;
        if (node.elseStatement) {
            // else-if chains stay chained; other single statements get a block
            const elseCode = withNarrowing(getNarrowedNames(node.expression, false), () => isBlock(node.elseStatement) || isIfStatement(node.elseStatement)
                ? visit(node.elseStatement)
                : `{\n${visit(node.elseStatement)}\n};\n\t`);
            return `${condition} else ${elseCode}`;
        }
        return condition;
    }
    else if (isSwitchStatement(node)) {
        return `switch ${visit(node.expression)} ${visit(node.caseBlock)}`;
    }
    else if (isCaseBlock(node)) {
        return `{\n\t\t${(node.clauses ?? []).map((c) => visit(c)).join('\n\t\t')}\n\t}`;
    }
    else if (isCaseClause(node)) {
        const isFallThrough = !(node.statements ?? []).some((c) => isBreakStatement(c));
        return `case ${visit(node.expression, { inline: true })}: \n\t\t\t${(node.statements ?? [])
            .filter((n) => !isBreakStatement(n))
            .map((s) => visit(s))
            .join('')}${isFallThrough ? 'fallthrough\n\t' : ''}`;
    }
    else if (isDefaultClause(node)) {
        return `default: \n\t\t\t${(node.statements ?? [])
            .filter((n) => !isBreakStatement(n))
            .map((s) => visit(s))
            .join('')}`;
    }
    else if (isBreakStatement(node)) {
        return 'break';
    }
    else if (isThrowStatement(node)) {
        const expr = node.expression;
        if (isNewExpression(expr) &&
            isIdentifier(expr.expression) &&
            expr.expression.text === 'Error') {
            const args = expr.arguments ?? [];
            const msg = args.length > 0 ? visit(args[0]) : '""';
            return `panic(${msg})` + (options.inline ? '' : ';\n\t');
        }
        return `panic(${visit(expr)})` + (options.inline ? '' : ';\n\t');
    }
    else if (isTryStatement(node)) {
        return visitTryStatement(node, options);
    }
    else if (isReturnStatement(node)) {
        // Handle return new Promise(...)
        if (node.expression &&
            isNewExpression(node.expression) &&
            isIdentifier(node.expression.expression) &&
            node.expression.expression.text === 'Promise') {
            return visitPromiseReturn(node.expression, options);
        }
        const enclosingFn = getEnclosingFunction(node);
        const isAsync = enclosingFn?.modifiers?.some((m) => m.kind === 'AsyncKeyword');
        const returnType = enclosingFn && !isAsync ? getReturnTypeNode(enclosingFn) : undefined;
        const value = node.expression
            ? toGoValueOfType(node.expression, returnType ? getType(returnType) : undefined)
            : '';
        return `return ${value}` + (options.inline ? '' : ';\n\t');
    }
    else if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            return '';
        }
        const typeParams = getTypeParameters(node.typeParameters);
        const parameterInfo = withContextualParameters(node, getFunctionParametersInfo(node.parameters ?? []));
        if (node.body && isBlock(node.body)) {
            prescanVariableDeclarations(node.body);
        }
        const inferredRetType = inferFunctionBodyReturnType(node);
        const returnType = inferredRetType ? ` ${inferredRetType}` : '';
        if (options.isOutside) {
            const name = node.name ? visit(node.name, { inline: true }) : '';
            const safeName = getSafeName(name);
            return `func ${safeName}${typeParams}(${parameterInfo.signature})${returnType} ${visit(node.body, {
                prefixBlockContent: parameterInfo.prefixBlockContent
            })}`;
        }
        if (!node.name) {
            return `func${typeParams}(${parameterInfo.signature})${returnType} ${visit(node.body, {
                prefixBlockContent: parameterInfo.prefixBlockContent
            }).trimEnd()}`;
        }
        const name = visit(node.name, { inline: true });
        const safeName = getSafeName(name);
        return `${safeName} := func${typeParams}(${parameterInfo.signature})${returnType} ${visit(node.body, {
            prefixBlockContent: parameterInfo.prefixBlockContent
        })}`;
    }
    else if (isArrowFunction(node)) {
        const parameterInfo = withContextualParameters(node, getFunctionParametersInfo(node.parameters ?? []));
        const inferredRetType = inferFunctionBodyReturnType(node);
        const returnType = inferredRetType ? ` ${inferredRetType}` : '';
        if (parameterInfo.prefixBlockContent && !isBlock(node.body)) {
            return `func(${parameterInfo.signature})${returnType} {\n\t\t${parameterInfo.prefixBlockContent}return ${visit(node.body)};\n\t}`;
        }
        if (!isBlock(node.body)) {
            return `func(${parameterInfo.signature})${returnType} { return ${visit(node.body)}; }`;
        }
        return `func(${parameterInfo.signature})${returnType} ${visit(node.body, {
            prefixBlockContent: parameterInfo.prefixBlockContent
        }).trimEnd()}`;
    }
    else if (node.kind === 'ThisKeyword') {
        return 'self';
    }
    else if (isEnumDeclaration(node)) {
        const enumName = node.name.text;
        enumNames.add(enumName);
        enumBaseTypes.set(enumName, getEnumBaseType(node));
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            return '';
        }
        return visitEnumDeclaration(node);
    }
    else if (isTypeAliasDeclaration(node)) {
        typeAliases.set(node.name.text, node.type);
        if (node.type?.kind !== 'TypeLiteral')
            return '';
        // type X = { a: T } → type X struct { a T }
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            const properties = new Map();
            for (const member of node.type.members ?? []) {
                if (isPropertySignature(member) && isIdentifier(member.name)) {
                    properties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
                }
            }
            if (properties.size > 0)
                interfacePropertyTypes.set(visit(node.name), properties);
            return '';
        }
        const localProperties = new Map();
        for (const member of node.type.members ?? []) {
            if (isPropertySignature(member) && isIdentifier(member.name)) {
                localProperties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
            }
        }
        if (localProperties.size > 0)
            interfacePropertyTypes.set(visit(node.name), localProperties);
        const fields = (node.type.members ?? [])
            .filter((m) => isPropertySignature(m) && isIdentifier(m.name))
            .map((m) => `\t${goFieldName(m.name.text)} ${getOptionalNodeType(m.type, !!m.questionToken)}`);
        const terminator = options.isOutside ? '' : ';\n\t';
        return `type ${visit(node.name)}${getTypeParameters(node.typeParameters)} struct {\n${fields.join('\n')}\n}${terminator}`;
    }
    else if (isInterfaceDeclaration(node)) {
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            const properties = new Map();
            for (const member of (node.members ?? [])) {
                if (isPropertySignature(member) && isIdentifier(member.name)) {
                    properties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
                }
            }
            if (properties.size > 0) {
                interfacePropertyTypes.set(visit(node.name), properties);
            }
            return '';
        }
        const name = visit(node.name);
        const typeParams = getTypeParameters(node.typeParameters);
        const extendedInterfaces = [];
        if ((node.heritageClauses ?? [])) {
            for (const clause of (node.heritageClauses ?? [])) {
                if (clause.token === 'ExtendsKeyword') {
                    for (const type of (clause.types ?? [])) {
                        extendedInterfaces.push(visit(type.expression));
                    }
                }
            }
        }
        const methods = [];
        const properties = [];
        for (const member of (node.members ?? [])) {
            if (isMethodSignature(member)) {
                const methodName = visit(member.name);
                const params = (member.parameters ?? [])
                    .map((p) => `${visit(p.name)} ${getType(p.type)}`)
                    .join(', ');
                const returnType = member.type ? ` ${getType(member.type)}` : '';
                methods.push(`\t${methodName}(${params})${returnType}`);
            }
            else if (isPropertySignature(member) && isIdentifier(member.name)) {
                properties.push(`\t${goFieldName(member.name.text)} ${getOptionalNodeType(member.type, !!member.questionToken)}`);
            }
        }
        if (properties.length > 0 && methods.length === 0) {
            const fields = [...extendedInterfaces.map((e) => `\t${e}`), ...properties];
            return `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}`;
        }
        const members = [...extendedInterfaces.map((e) => `\t${e}`), ...methods];
        return `type ${name}${typeParams} interface {\n${members.join('\n')}\n}`;
    }
    else if (isClassDeclaration(node)) {
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            const className = visit(node.name);
            classNames.add(className);
            const properties = new Map();
            const methods = new Map();
            for (const member of (node.members ?? [])) {
                const memberModifiers = member.modifiers;
                const isStatic = memberModifiers?.some((m) => m.kind === 'StaticKeyword');
                if (isPropertyDeclaration(member) && isIdentifier(member.name)) {
                    if (isStatic) {
                        classStaticProps.add(`${className}.${member.name.text}`);
                    }
                    else {
                        properties.set(member.name.text, getOptionalNodeType(member.type, !!member.questionToken));
                    }
                }
                if (isMethodDeclaration(member) && isIdentifier(member.name)) {
                    if (isStatic) {
                        classStaticMethods.add(`${className}.${member.name.text}`);
                    }
                    else {
                        methods.set(member.name.text, member.type ? getType(member.type) : 'interface{}');
                    }
                }
            }
            classPropertyTypes.set(className, properties);
            classMethodReturnTypes.set(className, methods);
            return '';
        }
        const name = visit(node.name);
        const typeParams = getTypeParameters(node.typeParameters);
        const typeParamNames = getTypeParameterNames(node.typeParameters);
        let parentClass = null;
        if ((node.heritageClauses ?? [])) {
            for (const clause of (node.heritageClauses ?? [])) {
                if (clause.token === 'ExtendsKeyword') {
                    parentClass = visit(clause.types[0].expression);
                }
            }
        }
        const fields = [];
        if (parentClass) {
            fields.push(`\t${parentClass}`);
        }
        for (const member of (node.members ?? [])) {
            if (isPropertyDeclaration(member)) {
                const fieldName = visit(member.name);
                let fieldType;
                if (member.type && isArrayTypeNode(member.type)) {
                    fieldType = `[]${getType(member.type, true)}`;
                }
                else {
                    fieldType = getOptionalNodeType(member.type, !!member.questionToken);
                }
                fields.push(`\t${fieldName} ${fieldType}`);
            }
        }
        let result = `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}\n\n`;
        const ctor = (node.members ?? []).find((m) => isConstructorDeclaration(m));
        if (ctor) {
            const ctorParameterInfo = getFunctionParametersInfo(ctor.parameters ?? []);
            const bodyStatements = ctor.body?.statements
                .filter((s) => {
                if (isExpressionStatement(s) && isCallExpression(s.expression)) {
                    return s.expression.expression.kind !== 'SuperKeyword';
                }
                return true;
            })
                .map((s) => visit(s))
                .join('\t') ?? '';
            result += `func New${name}${typeParams}(${ctorParameterInfo.signature}) *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\t${ctorParameterInfo.prefixBlockContent}${bodyStatements}return self;\n\t}\n\n`;
        }
        else {
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
                    result += `func ${name}_${methodName}(${methodParameterInfo.signature})${returnType} ${visit(member.body, { prefixBlockContent: methodParameterInfo.prefixBlockContent })}\n\n`;
                }
                else {
                    result += `func (self *${name}${typeParamNames}) ${methodName}(${methodParameterInfo.signature})${returnType} ${visit(member.body, { prefixBlockContent: methodParameterInfo.prefixBlockContent })}\n\n`;
                }
            }
            else if (isGetAccessor(member)) {
                // Getter: get prop() { ... } → func (self *T) Prop() RetType { ... }
                const getterName = visit(member.name);
                const returnType = member.type ? ` ${getType(member.type)}` : ' interface{}';
                result += `func (self *${name}${typeParamNames}) Get_${getterName}()${returnType} ${visit(member.body)}\n\n`;
            }
            else if (isSetAccessor(member)) {
                // Setter: set prop(val) { ... } → func (self *T) SetProp(val ValType) { ... }
                const setterName = visit(member.name);
                const parameterInfo = getFunctionParametersInfo(member.parameters ?? []);
                result += `func (self *${name}${typeParamNames}) Set_${setterName}(${parameterInfo.signature}) ${visit(member.body, { prefixBlockContent: parameterInfo.prefixBlockContent })}\n\n`;
            }
        }
        // Static property declarations → package-level vars named ClassName_propName
        for (const member of (node.members ?? [])) {
            if (isPropertyDeclaration(member) &&
                member.modifiers?.some((m) => m.kind === 'StaticKeyword')) {
                const fieldName = visit(member.name);
                const fieldType = getOptionalNodeType(member.type, !!member.questionToken);
                const initializer = member.initializer ? ` = ${visit(member.initializer)}` : '';
                result += `var ${name}_${fieldName} ${fieldType}${initializer}\n\n`;
            }
        }
        return result.trim();
    }
    else if (isNewExpression(node)) {
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
    }
    else if (isObjectLiteralExpression(node)) {
        const contextualType = resolveTypeNode(getContextualTypeNode(node));
        if (isRecordTypeNode(contextualType)) {
            return visitMapLiteral(node, contextualType);
        }
        const typeName = contextualType ? getTypeText(contextualType) : '';
        if (!typeName || typeName === 'interface{}') {
            return visitAnonymousStructLiteral(node);
        }
        const fieldTypes = interfacePropertyTypes.get(typeName) ?? classPropertyTypes.get(typeName.replace(/^&|\*/, ''));
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
                return `${goFieldName(p.name.text)}: ${toGoValueOfType(p.name, fieldTypes?.get(p.name.text) ?? getStructFieldGoType(typeName, p.name.text))}`;
            }
            // Spread: { ...obj } — not easily supported in Go structs, omit
            return '';
        })
            .filter((p) => p);
        return `${typeName}${compositeBody(properties)}`;
    }
    else if (isPropertyAssignment(node)) {
        return `${visit(node.name)}: ${visit(node.initializer)}`;
    }
    else if (isNonNullExpression(node)) {
        const innerType = inferExpressionType(node.expression);
        if (innerType && NULLABLE_PRIMITIVE_TYPES.includes(innerType))
            return `(*${visit(node.expression)})`;
        return visit(node.expression);
    }
    else if (isImportDeclaration(node)) {
        return visitImportDeclaration(node);
    }
    else if (isExportDeclaration(node) || isExportAssignment(node)) {
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
// Renders composite literal entries; multi-line entries need trailing commas
// (Go inserts a semicolon after a newline that ends in `}`)
// Visits a value going into a slot of Go type `goType`; non-nil values for
// nullable primitives (*string/*float64/*bool) are boxed into pointers
function toGoValueOfType(expr, goType) {
    if (goType &&
        ((isObjectLiteralExpression(expr) && (expr.properties ?? []).length === 0 && goType.startsWith('map[')) ||
            (isArrayLiteralExpression(expr) && (expr.elements ?? []).length === 0 && goType.startsWith('[]')))) {
        return `${goType}{}`;
    }
    const code = visit(expr);
    // *Struct slot: take the address (shares the value, like a JS object reference)
    if (goType?.startsWith('*') && isStructGoType(goType.slice(1)) && !isNilLiteral(expr)) {
        if (isObjectLiteralExpression(expr))
            return `&${code}`;
        if (inferExpressionType(expr) !== goType.slice(1))
            return code;
        if (isIdentifier(expr) || isElementAccessExpression(expr) || isPropertyAccessExpression(expr)) {
            return `&${code}`;
        }
        return `func() ${goType} { v := ${code}; return &v }()`;
    }
    if (!goType || !NULLABLE_PRIMITIVE_TYPES.includes(goType) || isNilLiteral(expr)) {
        return code;
    }
    if (isConditionalExpression(expr))
        return code;
    if (isBinaryExpression(expr) &&
        expr.operatorToken.kind === 'QuestionQuestionToken' &&
        inferExpressionType(expr.left)?.startsWith('*')) {
        return code;
    }
    if (inferExpressionType(expr) !== goType.slice(1))
        return code;
    return `func() ${goType} { v := ${code}; return &v }()`;
}
const NULLABLE_PRIMITIVE_TYPES = ['*string', '*float64', '*bool'];
// Nullable primitives (T | null → *T) that a guard has narrowed to T in the
// code being emitted; reads of them dereference the pointer
const narrowedVariables = new Set();
function isNullablePrimitiveVariable(name) {
    return NULLABLE_PRIMITIVE_TYPES.includes(variableGoTypes.get(name) ?? '');
}
// Narrowing key of a variable or property path (`opts.source`), if it has one
function getNarrowingKey(expr) {
    if (isIdentifier(expr))
        return expr.text;
    if (expr.kind === 'ThisKeyword')
        return 'this';
    if (isPropertyAccessExpression(expr) && !hasQuestionDot(expr)) {
        const objectKey = getNarrowingKey(expr.expression);
        return objectKey ? `${objectKey}.${expr.name.text}` : undefined;
    }
    return undefined;
}
// Emits `emit()` with `names` narrowed
function withNarrowing(names, emit) {
    const added = names.filter((n) => !narrowedVariables.has(n));
    for (const name of added)
        narrowedVariables.add(name);
    const code = emit();
    for (const name of added)
        narrowedVariables.delete(name);
    return code;
}
function isProcessEnv(expr) {
    while (isParenthesizedExpression(expr) || isAsExpression(expr) || isNonNullExpression(expr)) {
        expr = expr.expression;
    }
    return (isPropertyAccessExpression(expr) &&
        isIdentifier(expr.expression) &&
        expr.expression.text === 'process' &&
        expr.name.text === 'env');
}
// Whether an expression is (part of) an optional chain: a?.b, a?.b(), a?.b().c
function isOptionalChain(expr) {
    if (isCallExpression(expr)) {
        return hasQuestionDot(expr) || isOptionalChain(expr.expression);
    }
    if (isPropertyAccessExpression(expr) || isElementAccessExpression(expr)) {
        return hasQuestionDot(expr) || isOptionalChain(expr.expression);
    }
    return false;
}
// x in `x?.m(...)` / `x?.p`
function getOptionalChainBase(expr) {
    const access = isCallExpression(expr) ? expr.expression : expr;
    if (isPropertyAccessExpression(access) && hasQuestionDot(access))
        return access.expression;
    return undefined;
}
// Variables known non-null when `condition` evaluates to `whenTrue`
function getNarrowedNames(condition, whenTrue) {
    if (isParenthesizedExpression(condition))
        return getNarrowedNames(condition.expression, whenTrue);
    if (whenTrue) {
        const chainBase = getOptionalChainBase(condition);
        if (chainBase)
            return nullableKeys([chainBase]);
    }
    if (isIdentifier(condition) || isPropertyAccessExpression(condition)) {
        return whenTrue ? nullableKeys([condition]) : [];
    }
    if (isPrefixUnaryExpression(condition) && condition.operator === 'ExclamationToken') {
        return getNarrowedNames(condition.operand, !whenTrue);
    }
    if (!isBinaryExpression(condition))
        return [];
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
    if (!isNotEqual && !isEqual)
        return [];
    const checked = isNilLiteral(condition.right)
        ? condition.left
        : isNilLiteral(condition.left)
            ? condition.right
            : undefined;
    if (!checked) {
        // x === <non-null value>
        if (!isEqual || !whenTrue)
            return [];
        const leftType = inferExpressionType(condition.left);
        const rightType = inferExpressionType(condition.right);
        if (rightType && !NULLABLE_PRIMITIVE_TYPES.includes(rightType))
            return nullableKeys([condition.left]);
        if (leftType && !NULLABLE_PRIMITIVE_TYPES.includes(leftType))
            return nullableKeys([condition.right]);
        return [];
    }
    return isNotEqual === whenTrue ? nullableKeys([checked]) : [];
}
// Narrowing keys of the given expressions that are nullable primitives (*T)
function nullableKeys(exprs) {
    const keys = [];
    for (const expr of exprs) {
        const key = getNarrowingKey(expr);
        if (!key || narrowedVariables.has(key))
            continue;
        if (NULLABLE_PRIMITIVE_TYPES.includes(inferExpressionType(expr) ?? ''))
            keys.push(key);
    }
    return keys;
}
// Identifier occurrences that read the variable (not declarations, member
// names, or assignment targets)
function isNarrowableReference(node) {
    const parent = node.parent;
    if (!parent)
        return false;
    if (isPropertyAccessExpression(parent) && parent.name === node)
        return false;
    if (parent.name === node)
        return false;
    if (isBinaryExpression(parent) && parent.left === node) {
        const op = parent.operatorToken.kind;
        if (op === 'EqualsToken' || op === 'QuestionQuestionEqualsToken')
            return false;
    }
    return true;
}
function alwaysExits(statement) {
    if (isReturnStatement(statement) ||
        isThrowStatement(statement) ||
        isBreakStatement(statement) ||
        statement.kind === 'ContinueStatement') {
        return true;
    }
    if (isBlock(statement)) {
        const statements = statement.statements ?? [];
        return statements.length > 0 && alwaysExits(statements[statements.length - 1]);
    }
    return false;
}
// Statements of a block; after `if (!x) return;`, x stays narrowed for the rest
function visitBlockStatements(statements) {
    const added = [];
    const parts = [];
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
    for (const name of added)
        narrowedVariables.delete(name);
    return parts.join('\t');
}
// `x === v` where x is *T and v is T: equal only when x is non-nil and *x == v
function visitNullableComparison(node, op) {
    const leftType = inferExpressionType(node.left);
    const rightType = inferExpressionType(node.right);
    let pointerSide;
    let valueSide;
    if (leftType && NULLABLE_PRIMITIVE_TYPES.includes(leftType) && rightType === leftType.slice(1)) {
        pointerSide = node.left;
        valueSide = node.right;
    }
    else if (rightType &&
        NULLABLE_PRIMITIVE_TYPES.includes(rightType) &&
        leftType === rightType.slice(1)) {
        pointerSide = node.right;
        valueSide = node.left;
    }
    else {
        return undefined;
    }
    const tmp = getTempName('cmp');
    const equal = `${tmp} != nil && *${tmp} == ${visit(valueSide)}`;
    return `func() bool { ${tmp} := ${visit(pointerSide)}; return ${op === '==' ? equal : `!(${equal})`} }()`;
}
// Key type of a Go map type string: map[K]V → K
function extractMapKeyType(mapType) {
    let depth = 0;
    for (let i = 4; i < mapType.length; i++) {
        if (mapType[i] === '[')
            depth++;
        else if (mapType[i] === ']') {
            if (depth === 0)
                return mapType.slice(4, i);
            depth--;
        }
    }
    return 'interface{}';
}
// Field type of an anonymous struct type string: struct{ a T; b U } → field b → U
function getStructFieldGoType(structType, field) {
    if (!structType.startsWith('struct{'))
        return undefined;
    const body = structType.slice(7, structType.lastIndexOf('}'));
    let depth = 0;
    let start = 0;
    const fields = [];
    for (let i = 0; i <= body.length; i++) {
        const ch = i < body.length ? body[i] : ';';
        if (ch === '{' || ch === '(' || ch === '[')
            depth++;
        else if (ch === '}' || ch === ')' || ch === ']')
            depth--;
        else if (ch === ';' && depth === 0) {
            fields.push(body.slice(start, i).trim());
            start = i + 1;
        }
    }
    for (const entry of fields) {
        const space = entry.indexOf(' ');
        if (space > 0 && entry.slice(0, space) === goFieldName(field))
            return entry.slice(space + 1).trim();
    }
    return undefined;
}
function compositeBody(rawEntries) {
    const entries = rawEntries.map((e) => e.trimEnd());
    if (!entries.some((e) => e.includes('\n')))
        return `{${entries.join(', ')}}`;
    return `{\n\t${entries.join(',\n\t')},\n}`;
}
// Struct field type for an inferred value type (null/unknown → interface{})
function toFieldGoType(goType) {
    return !goType || goType === 'nil' ? 'interface{}' : goType;
}
function isDictionaryLiteral(node) {
    const declaration = node.parent;
    if (!isVariableDeclaration(declaration) || !isIdentifier(declaration.name))
        return false;
    let scope = declaration.parent;
    while (scope && !isBlock(scope) && !isSourceFile(scope))
        scope = scope.parent;
    if (!scope)
        return false;
    const name = declaration.name.text;
    return containsNode(scope, (n) => isElementAccessExpression(n) &&
        isIdentifier(n.expression) &&
        n.expression.text === name &&
        !isStringLiteral(n.argumentExpression));
}
function containsNode(root, predicate) {
    for (const child of childNodes(root)) {
        if (predicate(child) || containsNode(child, predicate))
            return true;
    }
    return false;
}
function getDictionaryValueType(node) {
    let valueType;
    for (const p of node.properties ?? []) {
        if (!isPropertyAssignment(p))
            continue;
        const t = inferExpressionType(p.initializer);
        if (!t || (valueType && t !== valueType))
            return 'interface{}';
        valueType = t;
    }
    return valueType ?? 'interface{}';
}
// Go type of an object literal, matching what the visitor emits
function getObjectLiteralGoType(node) {
    const contextualType = resolveTypeNode(getContextualTypeNode(node));
    if (isRecordTypeNode(contextualType))
        return getType(contextualType);
    const typeName = contextualType ? getTypeText(contextualType) : '';
    if (typeName && typeName !== 'interface{}')
        return typeName;
    if (isDictionaryLiteral(node))
        return `map[string]${getDictionaryValueType(node)}`;
    const fields = (node.properties ?? [])
        .filter((p) => (isPropertyAssignment(p) || isShorthandPropertyAssignment(p)) && isIdentifier(p.name))
        .map((p) => {
        const value = isPropertyAssignment(p) ? p.initializer : p.name;
        return `${goFieldName(p.name.text)} ${toFieldGoType(inferExpressionType(value))}`;
    });
    return `struct{ ${fields.join('; ')} }`;
}
function isRecordTypeNode(typeNode) {
    return (isTypeReferenceNode(typeNode) &&
        isIdentifier(typeNode.typeName) &&
        typeNode.typeName.text === 'Record' &&
        (typeNode.typeArguments ?? []).length === 2);
}
// Object literal keys as Go map keys: identifiers become string literals
function mapKeyText(name) {
    if (isIdentifier(name))
        return toGoStringLiteral(name.text);
    if (name.kind === 'ComputedPropertyName')
        return visit(name.expression);
    return visit(name);
}
// { a: 1 } typed as Record<K, V> → map[K]V{"a": 1}
function visitMapLiteral(node, recordType) {
    const keyType = getType(recordType.typeArguments[0]);
    const valueType = getType(recordType.typeArguments[1]);
    const entries = (node.properties ?? [])
        .map((p) => {
        if (isPropertyAssignment(p))
            return `${mapKeyText(p.name)}: ${visit(p.initializer)}`;
        if (isShorthandPropertyAssignment(p))
            return `${mapKeyText(p.name)}: ${visit(p.name)}`;
        return '';
    })
        .filter((e) => e);
    return `map[${keyType}]${valueType}${compositeBody(entries)}`;
}
// Object literal with no contextual type → anonymous struct with inferred fields,
// or a map when the variable holding it is indexed dynamically (obj[key])
function visitAnonymousStructLiteral(node) {
    if (isDictionaryLiteral(node)) {
        const valueType = getDictionaryValueType(node);
        const entries = (node.properties ?? [])
            .filter((p) => isPropertyAssignment(p))
            .map((p) => `${mapKeyText(p.name)}: ${visit(p.initializer)}`);
        return `map[string]${valueType}${compositeBody(entries)}`;
    }
    const fields = [];
    const values = [];
    for (const p of node.properties ?? []) {
        if (isPropertyAssignment(p) && isIdentifier(p.name)) {
            const field = goFieldName(p.name.text);
            fields.push(`${field} ${toFieldGoType(inferExpressionType(p.initializer))}`);
            values.push(`${field}: ${visit(p.initializer)}`);
        }
        else if (isShorthandPropertyAssignment(p)) {
            const field = goFieldName(p.name.text);
            fields.push(`${field} ${toFieldGoType(inferExpressionType(p.name))}`);
            values.push(`${field}: ${visit(p.name)}`);
        }
    }
    return `struct{ ${fields.join('; ')} }${compositeBody(values)}`;
}
// Follows type aliases and strips null/undefined from unions
function resolveTypeNode(typeNode, depth = 0) {
    if (!typeNode || depth > 10)
        return typeNode;
    if (isAnyTypeNode(typeNode))
        return undefined;
    if (typeNode.kind === 'ParenthesizedType')
        return resolveTypeNode(typeNode.type, depth + 1);
    if (isUnionTypeNode(typeNode)) {
        const nonNull = (typeNode.types ?? []).filter((t) => t.kind !== 'NullKeyword' &&
            t.kind !== 'UndefinedKeyword' &&
            !(isLiteralTypeNode(t) && t.literal?.kind === 'NullKeyword'));
        return nonNull.length === 1 ? resolveTypeNode(nonNull[0], depth + 1) : typeNode;
    }
    if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
        const alias = declaredTypeAliases.get(typeNode.typeName.text);
        if (alias && alias.kind !== 'TypeLiteral')
            return resolveTypeNode(alias, depth + 1);
    }
    return typeNode;
}
function getEnclosingFunction(node) {
    let current = node.parent;
    while (current) {
        if (isFunctionDeclaration(current) ||
            isFunctionExpression(current) ||
            isArrowFunction(current) ||
            isMethodDeclaration(current) ||
            isGetAccessor(current)) {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}
// Declared return type of a function, unwrapping Promise<T> for async functions
function getReturnTypeNode(fn) {
    const typeNode = fn?.type ?? (fn ? getContextualFunctionType(fn)?.type : undefined);
    if (isTypeReferenceNode(typeNode) &&
        isIdentifier(typeNode.typeName) &&
        typeNode.typeName.text === 'Promise') {
        return typeNode.typeArguments?.[0];
    }
    return typeNode;
}
// Type of member `name` within an object type (interface, type literal, Record)
function getMemberTypeNode(typeNode, name) {
    const resolved = resolveTypeNode(typeNode);
    if (!resolved)
        return undefined;
    if (isRecordTypeNode(resolved))
        return resolved.typeArguments[1];
    let members = [];
    if (resolved.kind === 'TypeLiteral') {
        members = resolved.members ?? [];
    }
    else if (isTypeReferenceNode(resolved) && isIdentifier(resolved.typeName)) {
        const aliasLiteral = declaredTypeAliases.get(resolved.typeName.text);
        if (aliasLiteral?.kind === 'TypeLiteral')
            members = aliasLiteral.members ?? [];
        const iface = declaredInterfaces.get(resolved.typeName.text);
        if (iface) {
            members = iface.members ?? [];
            for (const clause of iface.heritageClauses ?? []) {
                for (const base of clause.types ?? []) {
                    const baseType = { kind: 'TypeReference', typeName: base.expression };
                    const inherited = getMemberTypeNode(baseType, name);
                    if (inherited)
                        return inherited;
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
const variableTypeNodes = new Map();
// Declared type (as a type node) of an assignable expression, when known
function getExpressionTypeNode(expr) {
    if (isIdentifier(expr))
        return variableTypeNodes.get(expr.text);
    if (isParenthesizedExpression(expr))
        return getExpressionTypeNode(expr.expression);
    if (isPropertyAccessExpression(expr)) {
        if (expr.expression.kind === 'ThisKeyword') {
            let current = expr.parent;
            while (current && !isClassDeclaration(current))
                current = current.parent;
            const member = (current?.members ?? []).find((m) => isPropertyDeclaration(m) && isIdentifier(m.name) && m.name.text === expr.name.text);
            return member?.type;
        }
        const objectType = getExpressionTypeNode(expr.expression);
        return objectType ? getMemberTypeNode(objectType, expr.name.text) : undefined;
    }
    if (isElementAccessExpression(expr)) {
        const objectType = resolveTypeNode(getExpressionTypeNode(expr.expression));
        if (isArrayTypeNode(objectType))
            return objectType.elementType;
        if (isTypeReferenceNode(objectType) &&
            isIdentifier(objectType.typeName) &&
            ['Record', 'Map'].includes(objectType.typeName.text)) {
            return objectType.typeArguments?.[1];
        }
    }
    return undefined;
}
function getContextualTypeNode(node) {
    const parent = node.parent;
    if (!parent)
        return undefined;
    if (isParenthesizedExpression(parent))
        return getContextualTypeNode(parent);
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
    if (isAsExpression(parent) || isTypeAssertionExpression(parent))
        return parent.type;
    if ((isVariableDeclaration(parent) || isPropertyDeclaration(parent) || parent.kind === 'Parameter') &&
        parent.initializer === node) {
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
        if (index > -1 && fn)
            return fn.parameters?.[index]?.type;
    }
    if (isPropertyAssignment(parent) &&
        parent.initializer === node &&
        (isIdentifier(parent.name) || isStringLiteral(parent.name))) {
        const objectType = getContextualTypeNode(parent.parent);
        return objectType ? getMemberTypeNode(objectType, parent.name.text) : undefined;
    }
    if (isArrayLiteralExpression(parent)) {
        const arrayType = resolveTypeNode(getContextualTypeNode(parent));
        if (isArrayTypeNode(arrayType))
            return arrayType.elementType;
    }
    return undefined;
}
// Element type of an array literal: from its contextual type (declared
// variable/parameter/return type), else inferred from its first typed element
function getArrayLiteralElementType(node) {
    const contextual = resolveTypeNode(getContextualTypeNode(node));
    if (isArrayTypeNode(contextual))
        return getType(contextual.elementType);
    if (isTypeReferenceNode(contextual) &&
        isIdentifier(contextual.typeName) &&
        contextual.typeName.text === 'Array' &&
        contextual.typeArguments?.length === 1) {
        return getType(contextual.typeArguments[0]);
    }
    for (const element of node.elements ?? []) {
        if (isSpreadElement(element)) {
            const spreadType = inferExpressionType(element.expression);
            if (spreadType?.startsWith('[]'))
                return spreadType.slice(2);
            if (spreadType?.startsWith('map[') && spreadType.endsWith(']struct{}')) {
                return extractMapKeyType(spreadType);
            }
            continue;
        }
        const elementType = inferExpressionType(element);
        if (elementType && elementType !== 'nil')
            return elementType;
    }
    return 'interface{}';
}
// Loop bodies must be blocks in Go; `prefix` is emitted before the body's statements
function visitLoopBody(statement, prefix = '') {
    if (isBlock(statement))
        return visit(statement, { prefixBlockContent: prefix });
    return `{\n\t\t${prefix}${visit(statement)}}\n\t`;
}
// `(x = expr) op rhs` as a loop condition: returns the assignment to hoist
function getHoistedConditionAssignment(condition) {
    if (!isBinaryExpression(condition))
        return undefined;
    let left = condition.left;
    while (isParenthesizedExpression(left))
        left = left.expression;
    if (isBinaryExpression(left) && left.operatorToken.kind === 'EqualsToken')
        return left;
    return undefined;
}
// Function type a function literal is expected to have (e.g. from a declared
// variable, parameter, or Record value type)
function getContextualFunctionType(fn) {
    if (!isArrowFunction(fn) && !isFunctionExpression(fn))
        return undefined;
    const contextual = resolveTypeNode(getContextualTypeNode(fn));
    return isFunctionTypeNode(contextual) ? contextual : undefined;
}
function getTypeText(typeNode) {
    if (!typeNode)
        return ':';
    if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
        return typeNode.typeName.text;
    }
    return getType(typeNode);
}
function toGoStringLiteral(value) {
    return JSON.stringify(value);
}
// A spread source as a Go slice; Sets spread their elements (map keys)
function visitSpreadSource(expr) {
    const sourceType = inferExpressionType(expr);
    if (sourceType?.startsWith('map[') && sourceType.endsWith(']struct{}')) {
        importedPackages.add('slices');
        importedPackages.add('maps');
        return `slices.Sorted(maps.Keys(${visit(expr)}))`;
    }
    return visit(expr);
}
function visitSpreadArrayLiteral(node, elemType) {
    const chunks = [];
    for (const el of (node.elements ?? [])) {
        if (isSpreadElement(el)) {
            chunks.push({ isSpread: true, items: [el.expression] });
        }
        else {
            const last = chunks.length > 0 ? chunks[chunks.length - 1] : undefined;
            if (last && !last.isSpread) {
                last.items.push(el);
            }
            else {
                chunks.push({ isSpread: false, items: [el] });
            }
        }
    }
    const baseType = elemType || 'interface{}';
    let result = `[]${baseType}{}`;
    for (const chunk of chunks) {
        if (chunk.isSpread) {
            result = `append(${result}, ${visitSpreadSource(chunk.items[0])}...)`;
        }
        else {
            result = `append(${result}, ${chunk.items.map((e) => visit(e)).join(', ')})`;
        }
    }
    return result;
}
function visitTemplateExpression(node) {
    const parts = [];
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
function hasQuestionDot(node) {
    return ('questionDotToken' in node &&
        !!node.questionDotToken);
}
function getTempName(prefix) {
    return `__${prefix}_${goSafeId()}__`;
}
function inferExpectedTypeFromContext(node) {
    const parent = node.parent;
    if (isVariableDeclaration(parent) && parent.initializer === node && parent.type) {
        return getType(parent.type);
    }
    if (isReturnStatement(parent)) {
        let scope = parent.parent;
        while (scope) {
            if (isFunctionDeclaration(scope) ||
                isMethodDeclaration(scope) ||
                isFunctionExpression(scope) ||
                isArrowFunction(scope)) {
                if (scope.type)
                    return getType(scope.type);
                break;
            }
            scope = scope.parent;
        }
    }
    return undefined;
}
function prescanVariableDeclarations(block) {
    for (const stmt of block.statements) {
        if (isVariableStatement(stmt)) {
            for (const decl of stmt.declarationList.declarations) {
                if (isIdentifier(decl.name) && !variableGoTypes.has(decl.name.text)) {
                    if (decl.type) {
                        variableGoTypes.set(decl.name.text, getType(decl.type));
                    }
                    else if (decl.initializer) {
                        const inferredType = inferExpressionType(decl.initializer);
                        if (inferredType)
                            variableGoTypes.set(decl.name.text, inferredType);
                    }
                }
            }
        }
    }
}
function inferFunctionBodyReturnType(node) {
    if (node.type)
        return getType(node.type);
    const contextualFn = getContextualFunctionType(node);
    if (contextualFn?.type)
        return getType(contextualFn.type);
    if (isArrowFunction(node) && !isBlock(node.body)) {
        return inferExpressionType(node.body);
    }
    if (node.body && isBlock(node.body)) {
        for (const stmt of node.body.statements) {
            if (isReturnStatement(stmt) && stmt.expression) {
                const exprType = inferExpressionType(stmt.expression);
                if (exprType)
                    return exprType;
            }
        }
    }
    return undefined;
}
function inferArrowFunctionGoType(node) {
    // Mirrors getFunctionParametersInfo: trailing defaulted parameters become
    // a variadic `...interface{}`
    const parameters = node.parameters ?? [];
    const firstDefaultIndex = parameters.findIndex((p) => !!p.initializer);
    const hasTrailingDefaults = firstDefaultIndex > -1 && !parameters.slice(firstDefaultIndex).some((p) => !p.initializer);
    const paramTypes = (hasTrailingDefaults ? parameters.slice(0, firstDefaultIndex) : parameters).map((p) => getParameterGoType(p));
    if (hasTrailingDefaults)
        paramTypes.push('...interface{}');
    const params = paramTypes.join(', ');
    const retType = inferFunctionBodyReturnType(node);
    return `func(${params})${retType ? ` ${retType}` : ''}`;
}
function inferExpressionType(expr) {
    if (isArrowFunction(expr) || isFunctionExpression(expr)) {
        return inferArrowFunctionGoType(expr);
    }
    if (isParenthesizedExpression(expr))
        return inferExpressionType(expr.expression);
    if (isNonNullExpression(expr)) {
        const innerType = inferExpressionType(expr.expression);
        return innerType && NULLABLE_PRIMITIVE_TYPES.includes(innerType) ? innerType.slice(1) : innerType;
    }
    if (isAsExpression(expr))
        return getType(expr.type);
    if (isTypeAssertionExpression(expr))
        return getType(expr.type);
    if (isStringLiteral(expr) ||
        isNoSubstitutionTemplateLiteral(expr) ||
        isTemplateExpression(expr)) {
        return 'string';
    }
    if (isNumericLiteral(expr))
        return 'float64';
    if (isRegularExpressionLiteral(expr))
        return '*regexp.Regexp';
    if (isNewExpression(expr) && isIdentifier(expr.expression) && expr.expression.text === 'RegExp') {
        return '*regexp.Regexp';
    }
    if (expr.kind === 'TrueKeyword' || expr.kind === 'FalseKeyword')
        return 'bool';
    if (expr.kind === 'NullKeyword')
        return 'nil';
    if (isIdentifier(expr) && expr.text === 'undefined')
        return 'nil';
    if (isIdentifier(expr)) {
        const varType = variableGoTypes.get(expr.text);
        return narrowedVariables.has(expr.text) && varType?.startsWith('*') ? varType.slice(1) : varType;
    }
    if (isArrayLiteralExpression(expr)) {
        return `[]${getArrayLiteralElementType(expr)}`;
    }
    if (isObjectLiteralExpression(expr))
        return getObjectLiteralGoType(expr);
    if (isNewExpression(expr) && isIdentifier(expr.expression)) {
        const ctorName = expr.expression.text;
        const typeArguments = getCollectionTypeArguments(expr);
        if (ctorName === 'Map' && typeArguments.length === 2) {
            return `map[${getType(typeArguments[0])}]${getType(typeArguments[1])}`;
        }
        if (ctorName === 'Set' && typeArguments.length === 1) {
            return `map[${getType(typeArguments[0])}]struct{}`;
        }
        if (ctorName === 'Set' && expr.arguments?.length && isArrayLiteralExpression(expr.arguments[0])) {
            return `map[${getArrayLiteralElementType(expr.arguments[0])}]struct{}`;
        }
    }
    if (isElementAccessExpression(expr)) {
        const objectType = inferExpressionType(expr.expression);
        if (objectType === 'string')
            return 'string';
        if (objectType?.startsWith('[]'))
            return objectType.slice(2);
        if (objectType?.startsWith('map['))
            return extractMapValueType(objectType);
        const declared = getExpressionTypeNode(expr);
        if (declared)
            return getType(declared);
    }
    if (isPropertyAccessExpression(expr) &&
        isIdentifier(expr.expression) &&
        expr.expression.text === 'process' &&
        expr.name.text === 'argv') {
        return '[]string';
    }
    // process.env.X (also through casts: (process.env as any).X)
    if (isPropertyAccessExpression(expr) && isProcessEnv(expr.expression))
        return 'string';
    if (isPrefixUnaryExpression(expr) && ['MinusToken', 'PlusToken'].includes(expr.operator)) {
        return 'float64';
    }
    if (isCallExpression(expr)) {
        const callee = isIdentifier(expr.expression)
            ? expr.expression.text
            : isPropertyAccessExpression(expr.expression) && isIdentifier(expr.expression.expression)
                ? `${expr.expression.expression.text}.${expr.expression.name.text}`
                : undefined;
        const nodeResultType = callee ? nodeCallResultTypes.get(callee) : undefined;
        if (nodeResultType)
            return nodeResultType;
    }
    if (isCallExpression(expr) && isIdentifier(expr.expression)) {
        const builtinType = BUILTIN_FUNCTION_TYPES[expr.expression.text];
        if (builtinType && !declaredFunctions.has(expr.expression.text))
            return builtinType;
    }
    if (isPropertyAccessExpression(expr)) {
        const narrowingKey = getNarrowingKey(expr);
        if (narrowingKey && narrowedVariables.has(narrowingKey)) {
            // Narrowed: the declared (pointer) type without its pointer
            narrowedVariables.delete(narrowingKey);
            const nullableType = inferExpressionType(expr);
            narrowedVariables.add(narrowingKey);
            if (nullableType?.startsWith('*'))
                return nullableType.slice(1);
        }
        if (isIdentifier(expr.expression) && enumNames.has(expr.expression.text)) {
            const enumType = getSafeName(expr.expression.text);
            return enumType;
        }
        const leftType = inferExpressionType(expr.expression);
        if (expr.name.text === 'length')
            return 'float64';
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
        const structFieldType = leftType ? getStructFieldGoType(leftType.replace(/^\*/, ''), expr.name.text) : undefined;
        if (structFieldType)
            return structFieldType;
        if (isIdentifier(expr.expression)) {
            const className = variableClassNames.get(expr.expression.text);
            const memberType = className
                ? classPropertyTypes.get(className)?.get(expr.name.text)
                : undefined;
            if (memberType)
                return memberType;
        }
    }
    if (isCallExpression(expr) && isIdentifier(expr.expression)) {
        const fn = declaredFunctions.get(expr.expression.text);
        if (fn?.type)
            return getType(fn.type);
        const fnValueType = variableGoTypes.get(expr.expression.text);
        if (fnValueType?.startsWith('func('))
            return goFuncReturnType(fnValueType);
    }
    if (isCallExpression(expr) && isPropertyAccessExpression(expr.expression)) {
        const methodName = expr.expression.name.text;
        const ownerType = inferExpressionType(expr.expression.expression);
        if (ownerType &&
            NULLABLE_PRIMITIVE_TYPES.includes(ownerType) &&
            (hasQuestionDot(expr) ||
                hasQuestionDot(expr.expression) ||
                isOptionalChain(expr.expression.expression))) {
            const tmp = getTempName('optt');
            const call = makeNarrowedReceiverCall(expr, tmp, ownerType);
            const resultType = withNarrowingType([tmp], () => inferExpressionType(call));
            variableGoTypes.delete(tmp);
            return resultType ? makeNullableType(resultType) : undefined;
        }
        if (ownerType === 'string') {
            const stringMethodType = STRING_METHOD_RETURN_TYPES[methodName];
            if (stringMethodType)
                return stringMethodType;
        }
        if (ownerType === '*regexp.Regexp') {
            if (methodName === 'exec')
                return '[]string';
            if (methodName === 'test')
                return 'bool';
        }
        if (ownerType && ownerType.startsWith('map[')) {
            if (methodName === 'has')
                return 'bool';
            if (methodName === 'get') {
                const valueType = extractMapValueType(ownerType);
                return isStructGoType(valueType) ? `*${valueType}` : valueType;
            }
        }
        if (isArrayLikeGoType(ownerType)) {
            const elementType = getArrayElementTypeFromGoType(ownerType);
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
            if (['some', 'every', 'includes'].includes(methodName))
                return 'bool';
            if (['indexOf', 'lastIndexOf', 'findIndex'].includes(methodName))
                return 'float64';
            if (['pop', 'shift', 'at'].includes(methodName))
                return elementType;
            if (methodName === 'find')
                return elementType;
            if (methodName === 'join')
                return 'string';
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
        if (whenTrueType === 'nil' && whenFalseType)
            return makeNullableType(whenFalseType);
        if (whenFalseType === 'nil' && whenTrueType)
            return makeNullableType(whenTrueType);
        if (whenTrueType && whenTrueType === whenFalseType)
            return whenTrueType;
        if (whenTrueType && whenFalseType === `*${whenTrueType}`)
            return whenFalseType;
        if (whenFalseType && whenTrueType === `*${whenFalseType}`)
            return whenTrueType;
        const branchType = whenTrueType ?? whenFalseType;
        return branchType === 'nil' ? 'interface{}' : branchType;
    }
    if (isBinaryExpression(expr) &&
        expr.operatorToken.kind === 'QuestionQuestionToken') {
        return getNullishResultType(expr);
    }
    if (isPrefixUnaryExpression(expr) && expr.operator === 'ExclamationToken')
        return 'bool';
    if (isBinaryExpression(expr)) {
        const kind = expr.operatorToken.kind;
        if (COMPARISON_OPERATORS.has(kind) || kind === 'InKeyword' || kind === 'InstanceOfKeyword') {
            return 'bool';
        }
        if (isLogicalOperator(expr.operatorToken)) {
            return isLogicalValueExpression(expr) ? getLogicalValueType(expr) : 'bool';
        }
    }
    return undefined;
}
const BUILTIN_FUNCTION_TYPES = {
    parseFloat: 'float64',
    parseInt: 'float64',
    Number: 'float64',
    String: 'string'
};
const STRING_METHOD_RETURN_TYPES = {
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
    charCodeAt: 'float64'
};
// Return type of a Go func type string: `func(a T) R` → `R`
function goFuncReturnType(funcType) {
    let depth = 0;
    for (let i = 4; i < funcType.length; i++) {
        const ch = funcType[i];
        if (ch === '(')
            depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0)
                return funcType.slice(i + 1).trim() || undefined;
        }
    }
    return undefined;
}
const COMPARISON_OPERATORS = new Set([
    'EqualsEqualsEqualsToken',
    'ExclamationEqualsEqualsToken',
    'EqualsEqualsToken',
    'ExclamationEqualsToken',
    'LessThanToken',
    'LessThanEqualsToken',
    'GreaterThanToken',
    'GreaterThanEqualsToken'
]);
function isLogicalOperator(token) {
    return token?.kind === 'AmpersandAmpersandToken' || token?.kind === 'BarBarToken';
}
// JS truthiness of an expression as a Go bool, by its Go type
function toGoCondition(expr) {
    if (isParenthesizedExpression(expr))
        return `(${toGoCondition(expr.expression)})`;
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
function truthinessCheck(code, goType) {
    if (!goType || goType === 'bool' || goType === ':')
        return code;
    if (NULLABLE_PRIMITIVE_TYPES.includes(goType) && !/^[\w.()*]+$/.test(code)) {
        return `func() bool { __t := ${code}; return ${truthinessCheck('__t', goType)} }()`;
    }
    // structs (value types) are always truthy
    if (isStructGoType(goType))
        return 'true';
    if (goType === 'string')
        return `${code} != ""`;
    if (goType === 'float64')
        return `${code} != 0`;
    if (goType === '*bool')
        return `(${code} != nil && *${code})`;
    if (goType === '*string')
        return `(${code} != nil && *${code} != "")`;
    if (goType === '*float64')
        return `(${code} != nil && *${code} != 0)`;
    if (goType.startsWith('*') ||
        goType.startsWith('[]') ||
        goType.startsWith('map[') ||
        goType.startsWith('func') ||
        goType.startsWith('chan ') ||
        goType === 'interface{}') {
        return `${code} != nil`;
    }
    return code;
}
// Parenthesizes a condition unless it is already atomic
function wrapCondition(condition) {
    return /^[\w.]+$/.test(condition) || /^\(.*\)$/.test(condition) ? condition : `(${condition})`;
}
// `a || b` with non-bool operands is a value (JS returns an operand), not a bool
function isLogicalValueExpression(expr) {
    if (expr.operatorToken.kind !== 'BarBarToken')
        return false;
    const leftType = inferExpressionType(expr.left);
    const rightType = inferExpressionType(expr.right);
    return !!leftType && leftType !== 'bool' && !!rightType && rightType !== 'bool';
}
function getLogicalValueType(expr) {
    const leftType = inferExpressionType(expr.left);
    const rightType = inferExpressionType(expr.right);
    if (rightType === 'nil')
        return makeNullableType(leftType);
    if (leftType.startsWith('*') && rightType === leftType.slice(1))
        return rightType;
    return leftType;
}
// && / || : boolean form when any operand is non-bool (truthiness), value form for
// `a || fallback`; undefined keeps the plain Go operator (both operands bool/unknown)
function visitLogicalExpression(expr) {
    const leftType = inferExpressionType(expr.left);
    const rightType = inferExpressionType(expr.right);
    const isBoolOrUnknown = (t) => !t || t === 'bool' || t === ':';
    if (isBoolOrUnknown(leftType) && isBoolOrUnknown(rightType))
        return undefined;
    if (!isLogicalValueExpression(expr))
        return toGoCondition(expr);
    // a || b → func() T { if truthy(a) { return a }; return b }()
    const resultType = getLogicalValueType(expr);
    const tmp = getTempName('or');
    let leftValue = tmp;
    if (leftType.startsWith('*') && resultType === leftType.slice(1))
        leftValue = `*${tmp}`;
    else if (resultType === `*${leftType}`)
        leftValue = `&${tmp}`;
    return `func() ${resultType} { ${tmp} := ${visit(expr.left)}; if ${truthinessCheck(tmp, leftType)} { return ${leftValue} }; return ${toGoValueOfType(expr.right, resultType)} }()`;
}
function makeNullableType(typeName) {
    if (!typeName || typeName === 'interface{}' || typeName.startsWith('*'))
        return typeName || 'interface{}';
    if (['string', 'float64', 'bool'].includes(typeName))
        return `*${typeName}`;
    if (isStructGoType(typeName))
        return `*${typeName}`;
    return typeName;
}
// Go struct types (value types that cannot be nil): anonymous structs and
// property-only interfaces / object type aliases
function isStructGoType(goType) {
    return goType.startsWith('struct{') || interfacePropertyTypes.has(goType);
}
function visitConditionalExpression(node) {
    const resultType = inferExpectedTypeFromContext(node) || inferExpressionType(node) || 'interface{}';
    const whenTrue = withNarrowing(getNarrowedNames(node.condition, true), () => toGoValueOfType(node.whenTrue, resultType));
    const whenFalse = withNarrowing(getNarrowedNames(node.condition, false), () => toGoValueOfType(node.whenFalse, resultType));
    return `func() ${resultType} { if ${toGoCondition(node.condition)} { return ${whenTrue} }; return ${whenFalse} }()`;
}
// Type of `a ?? b`: NonNullable<A> | B — nullable only when b can be null too
function getNullishResultType(expr) {
    const leftType = inferExpressionType(expr.left);
    const rightType = inferExpressionType(expr.right);
    const leftValueType = leftType && NULLABLE_PRIMITIVE_TYPES.includes(leftType) ? leftType.slice(1) : leftType;
    if (!rightType || rightType === 'nil')
        return leftType;
    if (rightType === leftValueType)
        return rightType;
    if (leftValueType && rightType === `*${leftValueType}`)
        return rightType;
    if (leftValueType === 'interface{}' || !leftValueType)
        return rightType;
    return leftValueType;
}
// Inside a ?? chain an operand keeps its own type; otherwise the context decides
function getNullishEmitType(node) {
    const parent = node.parent;
    const inChain = isBinaryExpression(parent) && parent.operatorToken.kind === 'QuestionQuestionToken';
    return (inChain ? undefined : inferExpectedTypeFromContext(node)) || getNullishResultType(node);
}
// a ?? b ?? c: operands are tried in order; map lookups (comma-ok) and nil-able
// values may be missing, anything else is always defined and ends the chain
function visitNullishCoalescingExpression(node) {
    const operands = flattenNullishChain(node);
    const resultType = getNullishEmitType(node) || 'interface{}';
    const steps = [];
    for (let i = 0; i < operands.length; i++) {
        const operand = operands[i];
        const isLast = i === operands.length - 1;
        const tmp = getTempName('nullish');
        const lookup = isLast ? undefined : getMapLookup(operand);
        const operandType = inferExpressionType(operand);
        if (lookup) {
            const valueType = extractMapValueType(inferExpressionType(lookup.mapNode) ?? '');
            steps.push(`if ${tmp}, ok := ${lookup.map}[${lookup.key}]; ok { return ${convertGoValue(tmp, valueType, resultType)} }`);
        }
        else if (!isLast && operandType && isNilableGoType(operandType)) {
            steps.push(`if ${tmp} := ${visit(operand)}; ${tmp} != nil { return ${convertGoValue(tmp, operandType, resultType)} }`);
        }
        else {
            steps.push(`return ${toGoValueOfType(operand, resultType)}`);
            break;
        }
    }
    return `func() ${resultType} { ${steps.join('; ')} }()`;
}
function flattenNullishChain(node) {
    if (isBinaryExpression(node) && node.operatorToken.kind === 'QuestionQuestionToken') {
        return [...flattenNullishChain(node.left), node.right];
    }
    if (isParenthesizedExpression(node))
        return flattenNullishChain(node.expression);
    return [node];
}
// Converts a Go variable between T and *T as the target type requires
function convertGoValue(variable, fromType, toType) {
    if (toType === `*${fromType}`)
        return `&${variable}`;
    if (fromType === `*${toType}`)
        return `*${variable}`;
    // dynamic (any) values hold the concrete type at runtime
    if (fromType === 'interface{}' && toType !== 'interface{}')
        return `${variable}.(${toType})`;
    return variable;
}
// Map lookups (m.get(k) on a Map, m[k] on a Record): Go code of the map and key
function getMapLookup(expr) {
    if (isCallExpression(expr) &&
        isPropertyAccessExpression(expr.expression) &&
        expr.expression.name.text === 'get' &&
        inferExpressionType(expr.expression.expression)?.startsWith('map[')) {
        return {
            map: visit(expr.expression.expression),
            key: visit(expr.arguments[0]),
            mapNode: expr.expression.expression
        };
    }
    if (isElementAccessExpression(expr) && inferExpressionType(expr.expression)?.startsWith('map[')) {
        return { map: visit(expr.expression), key: visit(expr.argumentExpression), mapNode: expr.expression };
    }
    return undefined;
}
function isNilableGoType(goType) {
    return (goType.startsWith('*') ||
        goType.startsWith('[]') ||
        goType.startsWith('map[') ||
        goType.startsWith('func') ||
        goType.startsWith('chan ') ||
        goType === 'interface{}');
}
function visitOptionalPropertyAccess(node) {
    const baseExpr = visit(node.expression);
    const baseType = inferExpressionType(node.expression);
    if (!baseType || !baseType.startsWith('*')) {
        const objectType = resolveExpressionType(node.expression);
        return getAcessString(baseExpr, visit(node.name), objectType);
    }
    const className = baseType.replace(/^\*/, '').replace(/\[.*\]$/, '');
    const propertyType = classPropertyTypes.get(className)?.get(node.name.text) ??
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
function visitOptionalElementAccess(node) {
    const baseExpr = visit(node.expression);
    const baseType = inferExpressionType(node.expression);
    if (!baseType || !baseType.startsWith('*')) {
        const plainAccess = { ...node, questionDotToken: undefined };
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
function makeNarrowedReceiverCall(node, tmp, baseType) {
    variableGoTypes.set(tmp, baseType);
    const receiver = { kind: 'Identifier', text: tmp };
    const access = { ...node.expression, questionDotToken: undefined, expression: receiver };
    const call = { ...node, questionDotToken: undefined, expression: access, parent: node.parent };
    receiver.parent = access;
    access.parent = call;
    return call;
}
function visitNullablePrimitiveOptionalCall(node, baseExpr, baseType) {
    const tmp = getTempName('optc');
    const call = makeNarrowedReceiverCall(node, tmp, baseType);
    const resultType = makeNullableType(withNarrowingType([tmp], () => inferExpressionType(call)) ?? 'interface{}');
    const callCode = withNarrowing([tmp], () => visit(call));
    const value = resultType.startsWith('*') ? `func() ${resultType} { v := ${callCode}; return &v }()` : callCode;
    return `func() ${resultType} { ${tmp} := ${baseExpr}; if ${tmp} == nil { return nil }; return ${value} }()`;
}
function withNarrowingType(names, infer) {
    const added = names.filter((n) => !narrowedVariables.has(n));
    for (const name of added)
        narrowedVariables.add(name);
    const type = infer();
    for (const name of added)
        narrowedVariables.delete(name);
    return type;
}
function visitOptionalCall(node) {
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
    if (!baseType || !baseType.startsWith('*')) {
        const plainAccess = { ...node.expression, questionDotToken: undefined };
        const plainCall = { ...node, questionDotToken: undefined, expression: plainAccess };
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
function isArrayLikeGoType(goType) {
    return !!goType && goType.startsWith('[]');
}
function getArrayElementTypeFromGoType(goType) {
    if (!goType.startsWith('[]'))
        return 'interface{}';
    const elementType = goType.slice(2);
    return elementType || 'interface{}';
}
function inferArrayCallbackReturnType(callback, elementType, fallbackType) {
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
        if (knownType)
            return knownType;
    }
    return fallbackType;
}
function buildArrayCallbackInfo(callback, elementType, forcedReturnType) {
    if (isArrowFunction(callback) || isFunctionExpression(callback)) {
        const paramCount = callback.parameters.length;
        const paramTypes = [elementType, 'float64', `[]${elementType}`];
        callback.parameters.slice(0, 3).forEach((p, index) => {
            if (isIdentifier(p.name))
                registerLocalVariable(p.name.text, paramTypes[index]);
        });
        const callbackReturnType = forcedReturnType ?? inferArrayCallbackReturnType(callback, elementType, 'interface{}');
        const params = [];
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
            : forcedReturnType === 'bool'
                ? `{ return ${toGoCondition(callback.body)}; }`
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
function buildArrayCallbackInvocation(callbackInfo, itemVar, indexVar, arrayVar) {
    const args = [];
    if (callbackInfo.paramCount > 0)
        args.push(itemVar);
    if (callbackInfo.paramCount > 1)
        args.push(`float64(${indexVar})`);
    if (callbackInfo.paramCount > 2)
        args.push(arrayVar);
    return `(${callbackInfo.fnExpr})(${args.join(', ')})`;
}
// Like buildArrayCallbackInvocation but for reduce: (acc, item, idx, arr)
function buildArrayCallbackInvocationReduce(callbackInfo, accVar, itemVar, indexVar, arrayVar) {
    const args = [];
    if (callbackInfo.paramCount > 0)
        args.push(accVar);
    if (callbackInfo.paramCount > 1)
        args.push(itemVar);
    if (callbackInfo.paramCount > 2)
        args.push(`float64(${indexVar})`);
    if (callbackInfo.paramCount > 3)
        args.push(arrayVar);
    return `(${callbackInfo.fnExpr})(${args.join(', ')})`;
}
function visitArrayHigherOrderCall(node) {
    if (!isPropertyAccessExpression(node.expression))
        return undefined;
    const methodName = node.expression.name.text;
    if (!['map', 'filter', 'some', 'find', 'findIndex', 'every', 'forEach', 'reduce', 'join'].includes(methodName)) {
        return undefined;
    }
    const arrayExprNode = node.expression.expression;
    const arrayExpr = visit(arrayExprNode);
    const ownerType = inferExpressionType(arrayExprNode);
    const elementType = isArrayLikeGoType(ownerType)
        ? getArrayElementTypeFromGoType(ownerType)
        : 'interface{}';
    if (methodName === 'join') {
        // Only intercept array.join — if owner type is unknown/not array, fall through to callHandlers
        if (!isArrayLikeGoType(ownerType))
            return undefined;
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
        if (!reduceCallback)
            return undefined;
        const initialValue = (node.arguments ?? [])[1] ? visit((node.arguments ?? [])[1]) : undefined;
        const accType = initialValue
            ? (inferExpressionType((node.arguments ?? [])[1]) ?? elementType)
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
function getAliasType(name, seen = new Set()) {
    const aliasType = typeAliases.get(name);
    if (!aliasType)
        return undefined;
    if (seen.has(name))
        return undefined;
    if (isTypeReferenceNode(aliasType) && isIdentifier(aliasType.typeName)) {
        const nestedName = aliasType.typeName.text;
        if (typeAliases.has(nestedName)) {
            seen.add(name);
            return getAliasType(nestedName, seen) ?? aliasType;
        }
    }
    return aliasType;
}
function getOptionalNodeType(typeNode, isOptional) {
    const baseType = typeNode ? getType(typeNode) : 'interface{}';
    if (!isOptional)
        return baseType;
    if (baseType === 'interface{}' || baseType.startsWith('*'))
        return baseType;
    if (['string', 'float64', 'bool'].includes(baseType))
        return `*${baseType}`;
    return baseType;
}
function getEnumMemberName(name) {
    if (isIdentifier(name)) {
        return getSafeName(name.text);
    }
    if (isStringLiteral(name) || isNumericLiteral(name)) {
        const sanitized = name.text.replace(/[^a-zA-Z0-9_]/g, '_');
        return sanitized.length > 0 ? sanitized : 'Member';
    }
    return 'Member';
}
function getEnumBaseType(node) {
    for (const member of (node.members ?? [])) {
        const initializer = member.initializer;
        if (!initializer)
            continue;
        if (isStringLiteral(initializer) || isNoSubstitutionTemplateLiteral(initializer)) {
            return 'string';
        }
    }
    return 'float64';
}
function readNumericEnumInitializer(initializer) {
    if (isNumericLiteral(initializer)) {
        return Number(initializer.text);
    }
    if (isPrefixUnaryExpression(initializer) &&
        initializer.operator === 'MinusToken' &&
        isNumericLiteral(initializer.operand)) {
        return -Number(initializer.operand.text);
    }
    return undefined;
}
function visitEnumDeclaration(node) {
    const enumName = getSafeName(node.name.text);
    const baseType = enumBaseTypes.get(node.name.text) ?? getEnumBaseType(node);
    let nextNumericValue = 0;
    let canAutoIncrement = true;
    const members = [];
    for (const member of (node.members ?? [])) {
        const memberName = getEnumMemberName(member.name);
        const symbolName = `${enumName}_${memberName}`;
        let valueExpr;
        if (member.initializer) {
            if (baseType === 'float64') {
                const numericValue = readNumericEnumInitializer(member.initializer);
                if (numericValue !== undefined) {
                    valueExpr = `${numericValue}`;
                    nextNumericValue = numericValue + 1;
                    canAutoIncrement = true;
                }
                else {
                    valueExpr = `float64(${visit(member.initializer)})`;
                    canAutoIncrement = false;
                }
            }
            else {
                valueExpr = visit(member.initializer);
            }
        }
        else if (baseType === 'float64') {
            const currentValue = canAutoIncrement ? nextNumericValue : 0;
            valueExpr = `${currentValue}`;
            nextNumericValue = currentValue + 1;
        }
        else {
            valueExpr = toGoStringLiteral(memberName);
        }
        members.push(`\t${symbolName} ${enumName} = ${enumName}(${valueExpr})`);
    }
    return `type ${enumName} ${baseType}\n\nvar (\n${members.join('\n')}\n)`;
}
function getType(typeNode, getArrayType = false) {
    if (!typeNode)
        return ':';
    if (typeNode.kind === 'ParenthesizedType')
        return getType(typeNode.type, getArrayType);
    if (isArrayTypeNode(typeNode)) {
        const elementType = getType(typeNode.elementType);
        return getArrayType ? elementType : `[]${elementType}`;
    }
    // Handle union types (e.g. string | null, number | undefined)
    if (isUnionTypeNode(typeNode)) {
        const nonNullTypes = typeNode.types.filter((t) => t.kind !== 'NullKeyword' &&
            t.kind !== 'UndefinedKeyword' &&
            !(isLiteralTypeNode(t) && t.literal.kind === 'NullKeyword'));
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
    if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
        const name = typeNode.typeName.text;
        if (enumNames.has(name)) {
            return getSafeName(name);
        }
        const aliasType = getAliasType(name);
        if (aliasType && aliasType.kind !== 'TypeLiteral') {
            return getType(aliasType, getArrayType);
        }
        if (name === 'Promise' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
            return `chan ${getType(typeNode.typeArguments[0])}`;
        }
        if (name === 'RegExp') {
            return '*regexp.Regexp';
        }
        if (name === 'RegExpExecArray' || name === 'RegExpMatchArray') {
            return '[]string';
        }
        if ((name === 'Map' || name === 'Record') &&
            typeNode.typeArguments &&
            typeNode.typeArguments.length === 2) {
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
    // { a: T; b?: U } → struct{ a T; b *U }
    if (typeNode.kind === 'TypeLiteral') {
        const fields = (typeNode.members ?? [])
            .filter((m) => isPropertySignature(m) && isIdentifier(m.name))
            .map((m) => `${goFieldName(m.name.text)} ${getOptionalNodeType(m.type, !!m.questionToken)}`);
        return fields.length > 0 ? `struct{ ${fields.join('; ')} }` : 'interface{}';
    }
    // Syntactic replacement for the ts typechecker: render the type node's text
    let typeName = typeNodeToText(typeNode);
    const isArray = typeName.includes('[]');
    if (isArray) {
        if (getArrayType) {
            typeName = typeName.replace('[]', '');
        }
        else {
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
function getTypeCategory(typeNode) {
    if (!typeNode)
        return undefined;
    if (isArrayTypeNode(typeNode))
        return 'array';
    if (typeNode.kind === 'StringKeyword')
        return 'string';
    if (typeNode.kind === 'NumberKeyword')
        return 'number';
    if (typeNode.kind === 'BooleanKeyword')
        return 'boolean';
    if (isUnionTypeNode(typeNode)) {
        const nonNullTypes = typeNode.types.filter((t) => t.kind !== 'NullKeyword' &&
            t.kind !== 'UndefinedKeyword' &&
            !(isLiteralTypeNode(t) && t.literal.kind === 'NullKeyword'));
        if (nonNullTypes.length === 1)
            return getTypeCategory(nonNullTypes[0]);
    }
    if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
        const name = typeNode.typeName.text;
        if (name === 'Map')
            return 'Map';
        if (name === 'Set')
            return 'Set';
        if (classNames.has(name))
            return 'class';
        return name;
    }
    return undefined;
}
function getClassNameFromTypeNode(typeNode) {
    if (isTypeReferenceNode(typeNode) && isIdentifier(typeNode.typeName)) {
        return classNames.has(typeNode.typeName.text) ? typeNode.typeName.text : undefined;
    }
    if (isUnionTypeNode(typeNode)) {
        const nonNullTypes = typeNode.types.filter((t) => t.kind !== 'NullKeyword' &&
            t.kind !== 'UndefinedKeyword' &&
            !(isLiteralTypeNode(t) && t.literal.kind === 'NullKeyword'));
        if (nonNullTypes.length === 1) {
            return getClassNameFromTypeNode(nonNullTypes[0]);
        }
    }
    return undefined;
}
function resolveExpressionType(expr) {
    if (isIdentifier(expr)) {
        return variableTypes.get(expr.text) ?? goTypeCategory(variableGoTypes.get(expr.text));
    }
    if (expr.kind === 'ThisKeyword') {
        return 'class';
    }
    return goTypeCategory(inferExpressionType(expr));
}
// Method-dispatch category of an inferred Go type (e.g. `const s = new Set<T>()`)
function goTypeCategory(goType) {
    if (!goType)
        return undefined;
    if (goType.startsWith('map['))
        return goType.endsWith(']struct{}') ? 'Set' : 'Map';
    if (goType.startsWith('[]'))
        return 'array';
    if (goType === 'string')
        return 'string';
    if (goType === '*regexp.Regexp')
        return 'RegExp';
    return undefined;
}
function isNilLiteral(node) {
    if (node.kind === 'NullKeyword')
        return true;
    if (isIdentifier(node) && node.text === 'undefined')
        return true;
    return false;
}
function getAcessString(leftSide, rightSide, objectType) {
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
    if (leftSide === 'process.env' || leftSide === '(process.env)') {
        useHelper('getenv');
        return `TnGetenv("${rightSide}")`;
    }
    return `${leftSide}.${rightSide}`;
}
const callHandlers = {
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
    'Number': (_caller, args) => {
        importedPackages.add('strconv');
        return `func() float64 { v, _ := strconv.ParseFloat(fmt.Sprintf("%v", ${args[0]}), 64); return v }()`;
    },
    'Boolean': (_caller, args) => {
        return `(${args[0]} != nil && ${args[0]} != false && ${args[0]} != 0 && ${args[0]} != "")`;
    },
};
const stringMethodHandlers = {
    split: (obj, args) => {
        if (args[0]?.startsWith('regexp.MustCompile('))
            return `${args[0]}.Split(${obj}, -1)`;
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
        if (args.length >= 2)
            return `${obj}[int(${args[0]}):int(${args[1]})]`;
        return `${obj}[int(${args[0]}):]`;
    },
    slice: (obj, args) => {
        if (args.length >= 2)
            return `${obj}[int(${args[0]}):int(${args[1]})]`;
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
    match: (obj, args) => `${toGoRegexp(args[0])}.FindStringSubmatch(${obj})`,
    matchAll: (obj, args) => `${toGoRegexp(args[0])}.FindAllStringSubmatch(${obj}, -1)`,
    search: (obj, args) => `func() float64 { __loc := ${toGoRegexp(args[0])}.FindStringIndex(${obj}); if __loc == nil { return -1 }; return float64(__loc[0]) }()`,
    lastIndexOf: (obj, args) => {
        importedPackages.add('strings');
        return `float64(strings.LastIndex(${obj}, ${args[0]}))`;
    },
    at: (obj, args) => {
        return `func() string { __i := int(${args[0]}); if __i < 0 { __i = len(${obj}) + __i }; return string(${obj}[__i]) }()`;
    },
    toString: (obj) => {
        importedPackages.add('fmt');
        return `fmt.Sprintf("%v", ${obj})`;
    }
};
const regexpMethodHandlers = {
    test: (obj, args) => `${obj}.MatchString(${args[0]})`,
    exec: (obj, args) => `${obj}.FindStringSubmatch(${args[0]})`
};
const arrayMethodHandlers = {
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
        return `strings.Join(${obj}, ${args[0] ?? '""'})`;
    },
    slice: (obj, args) => {
        if (args.length >= 2)
            return `${obj}[int(${args[0]}):int(${args[1]})]`;
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
    toString: (obj) => {
        importedPackages.add('fmt');
        return `fmt.Sprintf("%v", ${obj})`;
    },
    // padStart / padEnd for string arrays (rarely used, but added for completeness)
    at: (obj, args) => {
        return `func() interface{} { __i := int(${args[0]}); if __i < 0 { __i = len(${obj}) + __i }; if __i < 0 || __i >= len(${obj}) { return nil }; return ${obj}[__i] }()`;
    },
};
function receiverElementType() {
    return currentReceiverGoType?.startsWith('[]') ? currentReceiverGoType.slice(2) : 'interface{}';
}
// Go expressions that can be assigned to (variables, fields, index expressions)
function isAddressable(code) {
    return /^[\w.]+(\[[^\]]*\])*$/.test(code);
}
// A regex argument as a *regexp.Regexp: compiled literals pass through, pattern
// strings are compiled
function toGoRegexp(arg) {
    importedPackages.add('regexp');
    return arg.startsWith('regexp.MustCompile(') ? arg : `regexp.MustCompile(${arg})`;
}
const mapMethodHandlers = {
    set: (obj, args) => `${obj}[${args[0]}] = ${args[1]}`,
    get: (obj, args) => {
        const valueType = currentReceiverGoType ? extractMapValueType(currentReceiverGoType) : '';
        if (isStructGoType(valueType)) {
            const tmp = getTempName('get');
            return `func() *${valueType} { ${tmp}, ok := ${obj}[${args[0]}]; if !ok { return nil }; return &${tmp} }()`;
        }
        return `${obj}[${args[0]}]`;
    },
    has: (obj, args) => {
        const tmp = getTempName('ok');
        return `func() bool { _, ${tmp} := ${obj}[${args[0]}]; return ${tmp} }()`;
    },
    delete: (obj, args) => `delete(${obj}, ${args[0]})`,
    clear: (obj) => `clear(${obj})`
};
const setMethodHandlers = {
    add: (obj, args) => `${obj}[${args[0]}] = struct{}{}`,
    has: (obj, args) => {
        const tmp = getTempName('ok');
        return `func() bool { _, ${tmp} := ${obj}[${args[0]}]; return ${tmp} }()`;
    },
    delete: (obj, args) => `delete(${obj}, ${args[0]})`,
    clear: (obj) => `clear(${obj})`
};
function getDynamicCallHandler(caller, objectType) {
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
        // number.toFixed(digits)
        if (methodName === 'toFixed') {
            return (c, args) => {
                importedPackages.add('strconv');
                return `strconv.FormatFloat(${c.substring(0, dotIndex)}, 'f', int(${args[0] ?? '0'}), 64)`;
            };
        }
        // Class instances use their own methods — never intercept
        if (objectType === 'class')
            return null;
        let handler;
        if (objectType === 'string') {
            handler = stringMethodHandlers[methodName];
        }
        else if (objectType === 'array') {
            handler = arrayMethodHandlers[methodName];
        }
        else if (objectType === 'RegExp') {
            handler = regexpMethodHandlers[methodName];
        }
        else if (objectType === 'Map') {
            handler = mapMethodHandlers[methodName];
        }
        else if (objectType === 'Set') {
            handler = setMethodHandlers[methodName];
        }
        else {
            // Unknown type: try both maps for backward compatibility
            handler =
                stringMethodHandlers[methodName] ??
                    arrayMethodHandlers[methodName] ??
                    regexpMethodHandlers[methodName];
        }
        if (handler) {
            return (c, args) => {
                const obj = c.substring(0, dotIndex);
                return handler(obj, args);
            };
        }
    }
    return null;
}
function getCallString(caller, args, typeArgs = '', objectType) {
    // Parentheses from casts like `(mod as any).fn(...)` are stripped for lookup
    const handler = callHandlers[caller] ?? callHandlers[caller.replace(/[()]/g, '')] ??
        getDynamicCallHandler(caller, objectType);
    if (handler) {
        return handler(caller, args, typeArgs);
    }
    return `${caller}${typeArgs}(${args.join(', ')})`;
}
function getOperatorText(operator) {
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
function getTimerName(name) {
    return `__timer_${name.replaceAll(' ', '_').replaceAll('"', '')}__`;
}
function isRegexReplaceCall(node) {
    if (!isCallExpression(node) || !isPropertyAccessExpression(node.expression))
        return false;
    const method = node.expression.name.text;
    if (method !== 'replace' && method !== 'replaceAll')
        return false;
    const pattern = (node.arguments ?? [])[0];
    if (!pattern || (node.arguments ?? []).length < 2)
        return false;
    return (isRegularExpressionLiteral(pattern) ||
        inferExpressionType(pattern) === '*regexp.Regexp' ||
        resolveExpressionType(pattern) === 'RegExp');
}
function isRegexReplacerCallback(fn) {
    if (!isArrowFunction(fn) && !isFunctionExpression(fn))
        return false;
    const call = fn.parent;
    return !!call && isRegexReplaceCall(call) && call.arguments[1] === fn;
}
// JS replacement patterns → Go: $& (whole match) → ${0}, $1 → ${1}
function jsReplacementToGo(replacement) {
    if (!isStringLiteral(replacement) && !isNoSubstitutionTemplateLiteral(replacement)) {
        return visit(replacement);
    }
    const goPattern = replacement.text.replace(/\$&/g, '${0}').replace(/\$(\d+)/g, '${$1}');
    return toGoStringLiteral(goPattern);
}
// str.replace(/re/g, x) → re.ReplaceAllString; without g only the first match is
// replaced; a function replacer receives (match, ...groups)
function visitRegexReplace(node) {
    if (!isRegexReplaceCall(node))
        return undefined;
    const [pattern, replacement] = node.arguments;
    const isGlobal = node.expression.name.text === 'replaceAll' ||
        (isRegularExpressionLiteral(pattern) &&
            pattern.text.substring(pattern.text.lastIndexOf('/') + 1).includes('g'));
    const target = visit(node.expression.expression);
    const re = visit(pattern);
    importedPackages.add('regexp');
    if (isArrowFunction(replacement) || isFunctionExpression(replacement)) {
        useHelper('regexReplaceFunc');
        const callback = visit(replacement);
        const groupArgs = (replacement.parameters ?? [])
            .map((_p, index) => `TnGroup(__m, ${index})`)
            .join(', ');
        return `TnRegexReplaceFunc(${re}, ${target}, func(__m []string) string { return (${callback})(${groupArgs}) }, ${isGlobal})`;
    }
    const goReplacement = jsReplacementToGo(replacement);
    if (isGlobal)
        return `${re}.ReplaceAllString(${target}, ${goReplacement})`;
    useHelper('regexReplaceFirst');
    return `TnRegexReplaceFirst(${re}, ${target}, ${goReplacement})`;
}
function jsRegexFlagsToGo(flags) {
    let goFlags = '';
    if (flags.includes('i'))
        goFlags += 'i';
    if (flags.includes('m'))
        goFlags += 'm';
    if (flags.includes('s'))
        goFlags += 's';
    return goFlags ? `(?${goFlags})` : '';
}
function getTypeParameters(typeParameters) {
    if (!typeParameters || typeParameters.length === 0)
        return '';
    const params = typeParameters.map((tp) => {
        const name = visit(tp.name);
        const constraint = tp.constraint ? getType(tp.constraint) : 'any';
        return `${name} ${constraint}`;
    });
    return `[${params.join(', ')}]`;
}
function getTypeParameterNames(typeParameters) {
    if (!typeParameters || typeParameters.length === 0)
        return '';
    const names = typeParameters.map((tp) => visit(tp.name));
    return `[${names.join(', ')}]`;
}
function getTypeArguments(typeArguments) {
    if (!typeArguments || typeArguments.length === 0)
        return '';
    const args = typeArguments.map((ta) => getType(ta));
    return `[${args.join(', ')}]`;
}
function getParameterGoType(param) {
    // Rest parameter: ...args — use variadic syntax
    if (param.dotDotDotToken) {
        if (param.type) {
            let baseType = getType(param.type);
            // If annotated as T[], the variadic type is T
            if (baseType.startsWith('[]'))
                baseType = baseType.slice(2);
            return `...${baseType}`;
        }
        return '...interface{}';
    }
    if (param.type) {
        const explicitType = getType(param.type);
        if (explicitType === ':')
            return 'interface{}';
        return param.questionToken ? makeNullableType(explicitType) : explicitType;
    }
    if (param.initializer) {
        const inferredType = inferExpressionType(param.initializer);
        if (inferredType && inferredType !== 'nil' && inferredType !== ':') {
            return inferredType;
        }
    }
    if (param.parent && isRegexReplacerCallback(param.parent))
        return 'string';
    const contextualFn = param.parent ? getContextualFunctionType(param.parent) : undefined;
    if (contextualFn) {
        const index = (param.parent.parameters ?? []).indexOf(param);
        const contextualParamType = contextualFn.parameters?.[index]?.type;
        if (contextualParamType)
            return getType(contextualParamType);
    }
    return 'interface{}';
}
// Parameters are variables of the function body: record their types (replacing
// whatever an earlier variable of the same name had)
function registerParameterType(param) {
    if (!isIdentifier(param.name))
        return;
    const name = param.name.text;
    const goType = getParameterGoType(param);
    variableGoTypes.set(name, goType.startsWith('...') ? `[]${goType.slice(3)}` : goType);
    const category = param.type ? getTypeCategory(param.type) : undefined;
    if (category)
        variableTypes.set(name, category);
    else
        variableTypes.delete(name);
    const className = param.type ? getClassNameFromTypeNode(param.type) : undefined;
    if (className)
        variableClassNames.set(name, className);
    else
        variableClassNames.delete(name);
    narrowedVariables.delete(name);
    if (param.type)
        variableTypeNodes.set(name, param.type);
    else
        variableTypeNodes.delete(name);
}
// TS lets a function literal omit trailing parameters of its contextual type;
// Go func types must match exactly, so the omitted ones are added as unused `_`
// Arguments of a call; for calls to declared functions, values are converted to
// the parameter types (nullable primitives boxed) and omitted optional
// parameters are passed as zero values (nil for pointers)
function visitCallArguments(node) {
    const args = node.arguments ?? [];
    const fn = isIdentifier(node.expression) ? declaredFunctions.get(node.expression.text) : undefined;
    if (!fn)
        return args.map((a) => visit(a));
    const params = fn.parameters ?? [];
    const result = args.map((arg, index) => {
        const param = params[index];
        return param && !param.dotDotDotToken ? toGoValueOfType(arg, getParameterGoType(param)) : visit(arg);
    });
    for (let i = args.length; i < params.length; i++) {
        const param = params[i];
        if (!param.questionToken || param.initializer || param.dotDotDotToken)
            break;
        result.push(`*new(${getParameterGoType(param)})`);
    }
    return result;
}
function withContextualParameters(fn, info) {
    const contextualFn = getContextualFunctionType(fn);
    const declaredCount = (fn.parameters ?? []).length;
    const contextualParams = contextualFn?.parameters ?? [];
    if (contextualParams.length <= declaredCount || info.signature.includes('...'))
        return info;
    const extra = contextualParams
        .slice(declaredCount)
        .map((p) => `_ ${p.dotDotDotToken ? '...' : ''}${p.type ? getType(p.type) : 'interface{}'}`);
    const signature = [info.signature, ...extra].filter((part) => part).join(', ');
    return { ...info, signature };
}
function getFunctionParametersInfo(parameters) {
    for (const param of parameters)
        registerParameterType(param);
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
        const defaultValue = visit(param.initializer);
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
function getSafeName(name) {
    if (!dangerousNames.has(name)) {
        return name;
    }
    if (!renamedFunctions.has(name)) {
        renamedFunctions.set(name, `${name}_${goSafeId()}`);
    }
    return renamedFunctions.get(name);
}
function getPromiseChannelType(node) {
    let parent = node.parent;
    while (parent) {
        if (isFunctionDeclaration(parent) ||
            isMethodDeclaration(parent) ||
            isFunctionExpression(parent)) {
            if (parent.type &&
                isTypeReferenceNode(parent.type) &&
                isIdentifier(parent.type.typeName)) {
                if (parent.type.typeName.text === 'Promise' &&
                    parent.type.typeArguments &&
                    parent.type.typeArguments.length > 0) {
                    return getType(parent.type.typeArguments[0]);
                }
            }
            break;
        }
        parent = parent.parent;
    }
    return 'interface{}';
}
function visitPromiseReturn(node, options) {
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
    return (`ch := make(chan ${channelType})\n\t\tgo func() ${body.trimEnd()}()\n\t\treturn ch` +
        (options.inline ? '' : ';\n\t'));
}
function visitNewPromise(node) {
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
function extractMapValueType(mapType) {
    // mapType is "map[K]V" — find the closing bracket of K accounting for nesting
    if (!mapType.startsWith('map['))
        return 'interface{}';
    let depth = 0;
    for (let i = 4; i < mapType.length; i++) {
        if (mapType[i] === '[')
            depth++;
        else if (mapType[i] === ']') {
            if (depth === 0)
                return mapType.substring(i + 1);
            depth--;
        }
    }
    return 'interface{}';
}
// Type arguments of new Map/Set: explicit, else from the declared/contextual type
function getCollectionTypeArguments(node) {
    if ((node.typeArguments ?? []).length > 0)
        return node.typeArguments;
    const contextual = resolveTypeNode(getContextualTypeNode(node));
    return isTypeReferenceNode(contextual) ? (contextual.typeArguments ?? []) : [];
}
function visitNewMap(node) {
    let keyType = 'interface{}';
    let valueType = 'interface{}';
    const typeArguments = getCollectionTypeArguments(node);
    if (typeArguments.length === 2) {
        keyType = getType(typeArguments[0]);
        valueType = getType(typeArguments[1]);
    }
    const mapType = `map[${keyType}]${valueType}`;
    const args = (node.arguments ?? []);
    if (!args || args.length === 0 || !isArrayLiteralExpression(args[0])) {
        return `make(${mapType})`;
    }
    const initArg = args[0];
    const tmp = getTempName('map');
    const entries = initArg.elements
        .filter((el) => isArrayLiteralExpression(el) && el.elements.length >= 2)
        .map((el) => {
        const pair = el;
        return `${tmp}[${visit(pair.elements[0])}] = ${visit(pair.elements[1])}`;
    })
        .join('; ');
    return `func() ${mapType} { ${tmp} := make(${mapType}); ${entries}; return ${tmp} }()`;
}
function visitNewSet(node) {
    let elementType = 'interface{}';
    const typeArguments = getCollectionTypeArguments(node);
    if (typeArguments.length === 1) {
        elementType = getType(typeArguments[0]);
    }
    else if (node.arguments?.length && isArrayLiteralExpression(node.arguments[0])) {
        elementType = getArrayLiteralElementType(node.arguments[0]);
    }
    const setType = `map[${elementType}]struct{}`;
    const args = (node.arguments ?? []);
    if (!args || args.length === 0 || !isArrayLiteralExpression(args[0])) {
        return `make(${setType})`;
    }
    const initArg = args[0];
    const tmp = getTempName('set');
    const values = initArg.elements.map((el) => `${tmp}[${visit(el)}] = struct{}{}`).join('; ');
    return `func() ${setType} { ${tmp} := make(${setType}); ${values}; return ${tmp} }()`;
}
function specifierToGoFileName(specifier) {
    const segments = specifier.split(/[/\\]/);
    let name = segments[segments.length - 1] || segments[segments.length - 2] || 'import';
    // Strip all extensions (e.g. .spec.ts → '', .ts → '')
    name = name.replace(/(\.[^.]+)+$/, '');
    name = name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!name)
        name = 'import';
    // Deduplicate filename if already taken by a different import
    let candidate = name + '.go';
    let i = 2;
    while (localImportFiles.has(candidate)) {
        candidate = `${name}_${i}.go`;
        i++;
    }
    return candidate;
}
function normalizeCjsToEsm(code) {
    // Remove 'use strict' directive
    code = code.replace(/['"]use strict['"];?\n?/g, '');
    // module.exports.X = function(...) { } or exports.X = function(...) { }
    code = code.replace(/(?:module\.exports|exports)\.(\w+)\s*=\s*function\s*\w*\s*\(/g, 'export function $1(');
    return code;
}
function includeLocalImport(code, dir, goFileName) {
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
    const inlineLines = [];
    const prevEmittingModuleFile = emittingModuleFile;
    emittingModuleFile = true;
    for (const stmt of sf.statements) {
        const result = visit(stmt, { addFunctionOutside: true });
        if (result.trim())
            inlineLines.push(result);
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
        if (!helperProvidedPackages.has(pkg))
            return true;
        const name = pkg.split('/').pop();
        return fileCode.includes(`${name}.`);
    })
        .map((pkg) => `import "${pkg}"`)
        .join('\n');
    const parts = ['package main'];
    if (fileImports)
        parts.push(fileImports);
    if (fileInline.trim())
        parts.push(fileInline.trim());
    if (fileOutside.trim())
        parts.push(fileOutside.trim());
    localImportFiles.set(goFileName, parts.join('\n\n'));
    // Restore main-file state; helper-provided packages carry over so the main
    // file (which carries the helper sources) imports them.
    outsideNodes = savedOutsideNodes;
    importedPackages.clear();
    for (const p of savedPackages)
        importedPackages.add(p);
    for (const p of helperProvidedPackages)
        importedPackages.add(p);
    currentFileDir = prevDir;
}
function registerGoPackageAliases(node, goPkg) {
    const pkgName = goPkg.split('/').pop();
    if (!node.importClause)
        return;
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
        }
        else if (isNamedImports(clause.namedBindings)) {
            // `import { Println, Sprintf as Spf } from 'go:fmt'`
            for (const el of clause.namedBindings.elements) {
                if (el.isTypeOnly)
                    continue;
                const localName = el.name.text;
                const importedName = el.propertyName?.text ?? localName;
                importAliases.set(localName, `${pkgName}.${importedName}`);
            }
        }
    }
}
function getImportLocalName(node) {
    const clause = node.importClause;
    if (!clause)
        return null;
    if (clause.name)
        return clause.name.text;
    if (clause.namedBindings) {
        if (isNamespaceImport(clause.namedBindings))
            return clause.namedBindings.name.text;
    }
    return null;
}
// Per-module table: maps Node.js function name → Go expression template.
// For default/namespace imports (e.g. `import path from 'node:path'`), entries are registered
// as `callHandlers[localName.funcName]`. For named imports (e.g. `import { join } from 'node:path'`),
// the Go identifier is stored in importAliases so bare calls like `join(...)` resolve correctly.
// Each emitter registers the Go packages it needs via `needPkg` only when actually used,
// because Go rejects unused imports.
function needPkg(pkg) {
    importedPackages.add(pkg);
}
// Marks a Go helper as used; also registers the packages the helper needs,
// since the import list is serialized before helpers are emitted.
function useHelper(id) {
    if (usedHelpers.has(id))
        return;
    usedHelpers.add(id);
    for (const pkg of helperPackages[id] ?? []) {
        importedPackages.add(pkg);
        helperProvidedPackages.add(pkg);
    }
}
const nodeModuleMappings = {
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
                return `func() string { p, _ := filepath.Abs(filepath.Join(${args.join(', ')})); return p }()`;
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
const helperPackages = {
    regexReplaceFirst: ['regexp'],
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
const goHelpers = {
    regexReplaceFirst: `func TnRegexReplaceFirst(re *regexp.Regexp, s string, repl string) string {
	loc := re.FindStringSubmatchIndex(s)
	if loc == nil {
		return s
	}
	return s[:loc[0]] + string(re.ExpandString(nil, repl, s, loc)) + s[loc[1]:]
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
function emitGoHelpers() {
    return [...usedHelpers]
        .map((id) => goHelpers[id])
        .filter(Boolean)
        .join('\n\n');
}
// Result types of the mapped Node.js stdlib functions ('' = no result)
const NODE_FUNCTION_TYPES = {
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
const nodeCallResultTypes = new Map();
// Mapping from Node.js stdlib module names to Go setup functions.
// Each entry adds the required Go imports and registers call handlers for the local identifier.
function setupNodeModuleImport(node, nodeModule) {
    const mapping = nodeModuleMappings[nodeModule];
    if (!mapping)
        return;
    const clause = node.importClause;
    if (!clause)
        return;
    if (clause.namedBindings && isNamedImports(clause.namedBindings)) {
        // Named imports: `import { join, dirname } from 'node:path'`
        // Map each local name directly to its Go qualified function via importAliases,
        // so bare calls like `join(...)` resolve to `filepath.Join(...)`.
        for (const el of clause.namedBindings.elements) {
            if (el.isTypeOnly)
                continue;
            const localName = el.name.text;
            const importedName = el.propertyName?.text ?? localName;
            const resultType = NODE_FUNCTION_TYPES[nodeModule]?.[importedName];
            if (resultType !== undefined)
                nodeCallResultTypes.set(localName, resultType);
            const fn = mapping.functions[importedName];
            if (fn) {
                // Register a call handler keyed on the local name
                callHandlers[localName] = (_caller, args) => fn(args);
            }
        }
    }
    else {
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
function visitImportDeclaration(node) {
    if (!isStringLiteral(node.moduleSpecifier))
        return '';
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
    if (node.importClause?.isTypeOnly)
        return '';
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
        }
        else if (clause.namedBindings && isNamespaceImport(clause.namedBindings)) {
            defaultImportNamespaces.add(clause.namedBindings.name.text);
        }
    }
    return '';
}
// Records the type of a variable introduced by a loop or binding
function registerLocalVariable(name, goType) {
    if (!name || name === '_')
        return;
    variableTypes.delete(name);
    variableClassNames.delete(name);
    variableTypeNodes.delete(name);
    narrowedVariables.delete(name);
    if (goType)
        variableGoTypes.set(name, goType);
    else
        variableGoTypes.delete(name);
}
// for...of over arrays and strings (a string yields one-character strings)
function visitForOfSequence(node, iterExpr, iterType) {
    const elementType = iterType === 'string' ? 'string' : iterType?.startsWith('[]') ? iterType.slice(2) : undefined;
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
        (binding.elements ?? []).forEach((el, index) => {
            if (isOmittedExpression(el))
                return;
            const name = visit(el.name);
            registerLocalVariable(name, memberType);
            prefix += `${name} := ${item}[${index}]\n\t\t_ = ${name}\n\t\t`;
        });
    }
    else if (binding && isIdentifier(binding)) {
        const name = visit(binding);
        registerLocalVariable(binding.text, elementType);
        if (iterType === 'string') {
            prefix = `${name} := string(${item})\n\t\t`;
        }
        else {
            loopVar = name;
        }
    }
    else {
        loopVar = visit(node.initializer, { inline: true });
    }
    return `for _, ${loopVar} := range ${iterExpr}${visitLoopBody(node.statement, prefix)}`;
}
function getForOfVarNames(initializer) {
    if (!isVariableDeclarationList(initializer) || initializer.declarations.length === 0) {
        return ['_'];
    }
    const decl = initializer.declarations[0];
    if (isArrayBindingPattern(decl.name)) {
        return decl.name.elements.map((el) => {
            if (isOmittedExpression(el))
                return '_';
            return visit(el.name);
        });
    }
    return [visit(decl.name)];
}
function visitTryStatement(node, options) {
    const deferreds = [];
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
        deferreds.push(`defer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\t${catchVar} := r\n\t\t\t\t_ = ${catchVar}\n\t\t\t\t${catchBody}\t\t\t}\n\t\t\t}()`);
    }
    const tryBody = (node.tryBlock.statements ?? []).map((s) => visit(s)).join('\t');
    const body = [...deferreds, tryBody].join('\n\t\t\t');
    return `func() {\n\t\t\t${body}\n\t\t\t}()` + (options.inline ? '' : ';\n\t');
}
