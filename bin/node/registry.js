// Registry of the Node.js standard-library APIs TypeNative lowers to Go.
//
// Each src/node/<module>.ts registers its functions, values, classes and Go
// helper sources here; the transpiler resolves imported names (and Node
// globals such as Buffer or URL) against these tables. Entries are keyed by
// dotted paths: 'path.join' (function), 'path.sep' (value),
// 'buffer.Buffer' (class), 'buffer.Buffer.from' (static),
// 'buffer.Buffer#toString' (instance method).
//
// Kept in a plain style (records of closures, positional helpers) because this
// file is part of the self-hosted compiler and must transpile with TypeNative.
// Services start as no-ops; the transpiler binds them before each run
export function createNodeRegistry() {
    const registry = {
        modules: {},
        aliases: {},
        functions: {},
        constructors: {},
        methods: {},
        results: {},
        typers: {},
        paramTypers: {},
        values: {},
        valueTypes: {},
        classes: {},
        classByGoType: {},
        namespaces: {},
        objects: {},
        iterators: {},
        optionTypers: {},
        hookPrefixes: {},
        hookParams: {},
        globals: {},
        goHelpers: {},
        helperPackages: {},
        helperRequires: {},
        pkg: (_name) => { },
        helper: (_id) => { },
        temp: (prefix) => prefix,
        typeOf: (_node) => '',
        visit: (_node) => '',
        categoryOf: (_node) => '',
        isArrayBuffer: (_node) => false,
        entryPoint: (_node) => ''
    };
    return registry;
}
// Parses 'name=type; name=type' specs into a record
function parseSpec(spec) {
    const out = {};
    for (const entry of spec.split(';')) {
        const trimmed = entry.trim();
        if (trimmed === '')
            continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) {
            out[trimmed] = '';
        }
        else {
            out[trimmed.substring(0, eq).trim()] = trimmed.substring(eq + 1).trim();
        }
    }
    return out;
}
// Registers a Node class (methods / props / getters as 'name=GoType; …' specs;
// setters as 'a; b')
export function defineClass(r, key, goType, category, methods, props, getters, setters) {
    const setterNames = {};
    for (const name of Object.keys(parseSpec(setters)))
        setterNames[name] = true;
    const cls = {
        key: key,
        goType: goType,
        category: category,
        methods: parseSpec(methods),
        props: parseSpec(props),
        getters: parseSpec(getters),
        setters: setterNames
    };
    r.classes[key] = cls;
    r.classByGoType[goType] = key;
    return cls;
}
// Registers result types for many entries: setResults(r, 'path', 'join=string; sep=string')
export function setResults(r, prefix, spec) {
    const parsed = parseSpec(spec);
    for (const name of Object.keys(parsed))
        r.results[`${prefix}.${name}`] = parsed[name];
}
// Registers a Go helper with the packages and other helpers it needs
export function defineHelper(r, id, packages, requires, source) {
    r.goHelpers[id] = source;
    r.helperPackages[id] = packages;
    r.helperRequires[id] = requires;
}
// Registers a module (and its bare / alias names)
export function defineModule(r, name) {
    r.modules[name] = true;
}
// --- AST helpers for emitters ---
export function isStringNode(node) {
    return !!node && (node.kind === 'StringLiteral' || node.kind === 'NoSubstitutionTemplateLiteral');
}
export function isObjectLiteral(node) {
    return !!node && node.kind === 'ObjectLiteralExpression';
}
export function isFunctionNode(node) {
    return !!node && (node.kind === 'ArrowFunction' || node.kind === 'FunctionExpression');
}
// The property `name` of an object-literal argument (its value node)
export function getOption(node, name) {
    if (!isObjectLiteral(node))
        return undefined;
    for (const prop of node.properties ?? []) {
        const propName = prop.name;
        if (!propName)
            continue;
        const text = propName.kind === 'Identifier' || propName.kind === 'StringLiteral' ? propName.text : '';
        if (text !== name)
            continue;
        if (prop.kind === 'PropertyAssignment')
            return prop.initializer;
        if (prop.kind === 'ShorthandPropertyAssignment')
            return prop.name;
    }
    return undefined;
}
// Whether an object-literal option is the literal `true`
export function optionIsTrue(node, name) {
    const value = getOption(node, name);
    return !!value && value.kind === 'TrueKeyword';
}
// The encoding named by an argument: a string literal ('utf8') or an options
// object with an `encoding` string literal; '' when absent
export function encodingOf(node) {
    if (!node)
        return '';
    if (isStringNode(node))
        return String(node.text);
    const value = getOption(node, 'encoding');
    if (value && isStringNode(value))
        return String(value.text);
    return '';
}
// Index of the last function-literal argument, -1 when there is none
export function callbackIndex(nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (isFunctionNode(nodes[i]))
            return i;
    }
    return -1;
}
// Arguments except the callback (Node's optional-arguments-then-callback shape)
export function argsBeforeCallback(call) {
    const index = callbackIndex(call.nodes);
    if (index < 0)
        return call.args;
    return call.args.slice(0, index);
}
// A Go string literal
export function goString(value) {
    return JSON.stringify(value);
}
