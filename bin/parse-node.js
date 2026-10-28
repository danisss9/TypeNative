// Node-side AST adapter: converts a `typescript` npm package AST into the same
// normalized JSON shape that the `tsparser` Go tool emits
// (tsparser/main.go). The transpiler consumes this shape, so dev-CLI output and
// self-hosted (Go parser) output are field-compatible.
//
// Node-only module: imports the `typescript` package directly and is injected
// into the transpiler by the Node CLI wrapper (src/cli.ts). The self-hosted
// binary uses src/parse-native.ts instead.
import ts from 'typescript';
// Internal ts.Node bookkeeping properties that must not leak into the JSON
const SKIP_PROPS = new Set([
    'pos',
    'end',
    'flags',
    'modifierFlagsCache',
    'transformFlags',
    'parent',
    'original',
    'symbol',
    'id',
    'jsDoc',
    'flowNode',
    'contextFlags',
    'parserContextFlags',
    'excludeFlags',
    'modifierFlags',
    'flowId',
    'symbolCount',
    'identifierCount',
    'nodeArrayCache',
    'parsedByParser',
    'autoGenerateKind',
    'autoGenerateId',
    'emitNode',
    'localSymbol',
    // 'text'/'escapedText' are only emitted for token-like kinds (TEXT_KINDS);
    // SourceFile.text would otherwise leak the whole source into the AST
    'text',
    'escapedText',
    'endOfFileToken',
    'externalModuleIndicator',
    'commonJsModuleIndicator',
    'localJsxNamespace',
    'localJsxFactory',
    'localJsxFragmentFactory'
]);
const TEXT_KINDS = new Set([
    ts.SyntaxKind.Identifier,
    ts.SyntaxKind.PrivateIdentifier,
    ts.SyntaxKind.StringLiteral,
    ts.SyntaxKind.NumericLiteral,
    ts.SyntaxKind.BigIntLiteral,
    ts.SyntaxKind.NoSubstitutionTemplateLiteral,
    ts.SyntaxKind.RegularExpressionLiteral,
    ts.SyntaxKind.TemplateHead,
    ts.SyntaxKind.TemplateMiddle,
    ts.SyntaxKind.TemplateTail,
    ts.SyntaxKind.JsxText
]);
// Reverse enum map preferring canonical names over aliases
// (ts.SyntaxKind[8] is "FirstLiteralToken", the alias of NumericLiteral)
const KIND_NAMES = (() => {
    const names = {};
    for (const key of Object.keys(ts.SyntaxKind)) {
        const val = ts.SyntaxKind[key];
        if (typeof val === 'number' && names[val] === undefined)
            names[val] = key;
    }
    return names;
})();
// var / let / const / using / await using (await using sets Const | Using)
function declarationKind(flags) {
    if ((flags & 6) === 6)
        return 'await using';
    if (flags & 4)
        return 'using';
    if (flags & 2)
        return 'const';
    if (flags & 1)
        return 'let';
    return 'var';
}
function isNode(v) {
    return typeof v === 'object' && v !== null && typeof v.kind === 'number' && typeof v.pos === 'number';
}
// The file being converted, for node positions
let currentSourceFile;
function convertNode(node) {
    const obj = { kind: KIND_NAMES[node.kind] ?? String(node.kind) };
    // 1-based line and column of the node's first token (columns count UTF-16
    // units, as in the Go producer); the transpiler maps Go positions back to them
    if (node.kind !== ts.SyntaxKind.SourceFile && node.pos >= 0) {
        const start = currentSourceFile.getLineAndCharacterOfPosition(node.getStart(currentSourceFile));
        obj.line = start.line + 1;
        obj.column = start.character + 1;
        // where it ends (exclusive): node:test coverage ranges
        const end = currentSourceFile.getLineAndCharacterOfPosition(node.end);
        obj.endLine = end.line + 1;
        obj.endColumn = end.character + 1;
    }
    if (TEXT_KINDS.has(node.kind)) {
        obj.text = node.text ?? node.escapedText;
    }
    if (node.kind === ts.SyntaxKind.VariableDeclarationList)
        obj.declarationKind = declarationKind(node.flags);
    for (const key of Object.keys(node)) {
        if (SKIP_PROPS.has(key))
            continue;
        const v = node[key];
        if (typeof v === 'function')
            continue;
        if (v === null || v === undefined)
            continue;
        if (isNode(v)) {
            obj[key] = convertNode(v);
        }
        else if (Array.isArray(v)) {
            const arr = v.filter((e) => isNode(e)).map((e) => convertNode(e));
            if (arr.length > 0)
                obj[key] = arr;
        }
        else if (typeof v === 'number' && (key === 'operator' || key === 'token')) {
            // operator / heritage-clause token: emit the kind name (matches the Go producer)
            obj[key] = KIND_NAMES[v] ?? String(v);
        }
        else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            if (key !== 'kind')
                obj[key] = v;
        }
    }
    return obj;
}
// Parse TypeScript source into the normalized JSON AST shape.
export function parseAstJson(code, tsx) {
    const sourceFile = tsx
        ? ts.createSourceFile('main.tsx', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
        : ts.createSourceFile('main.ts', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
    currentSourceFile = sourceFile;
    return convertNode(sourceFile);
}
