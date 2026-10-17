// Go bridge: name resolution and emitters for `go:*` imports.
//
// Resolves package members (default, namespace and named imports), emits
// calls with argument/result conversion, struct construction, field access
// and method calls through the metadata method set.
//
// Kept in a plain style because this file is part of the self-hosted
// compiler and must transpile with TypeNative.
import { goPackage, goTypeInfo, allGoPaths } from './metadata.js';
import { toGo, fromGo, mustCall, checkCall, isGoNumericKind } from './convert.js';
import { isSyncCallback, isBlockingCall, goPathAliases } from './overrides.js';
let services = {
    pkg: (_name) => { },
    helper: (_id) => { },
    temp: (prefix) => prefix,
    typeOf: (_node) => '',
    visit: (_node) => '',
    categoryOf: (_node) => '',
    goTypeOf: (_node) => 'interface{}',
    isIdentifier: (_node) => false,
    isPropertyAccess: (_node) => false,
    isArrowFunction: (_node) => false,
    isFunctionExpression: (_node) => false,
    isObjectLiteral: (_node) => false
};
export function bindBridgeServices(s) {
    services = s;
}
// Local import name → Go package path ('strings' → 'strings').
const localToPath = {};
// Local name → qualified member ('Sprintf' → 'fmt.Sprintf').
const memberAliases = {};
// Package path → local qualifier used in emitted code.
const pathToLocal = {};
export function resetGoBridge() {
    for (const key of Object.keys(localToPath))
        delete localToPath[key];
    for (const key of Object.keys(memberAliases))
        delete memberAliases[key];
    for (const key of Object.keys(pathToLocal))
        delete pathToLocal[key];
}
// Register a `go:` import's local names. qualifier is the emitted package
// qualifier (real name or collision alias).
export function registerGoImport(path, qualifier, defaultName, namespaceName, named) {
    pathToLocal[path] = qualifier;
    if (defaultName) {
        localToPath[defaultName] = path;
        if (defaultName !== qualifier)
            memberAliases[defaultName] = qualifier;
    }
    if (namespaceName) {
        localToPath[namespaceName] = path;
        if (namespaceName !== qualifier)
            memberAliases[namespaceName] = qualifier;
    }
    for (const entry of named) {
        memberAliases[entry.local] = `${qualifier}.${entry.imported}`;
    }
}
// Register a go:builtin local name (ref/chan/GoError have no Go import).
export function registerGoBuiltin(local, imported) {
    memberAliases[local] = `go:builtin.${imported}`;
}
// Qualifier used in emitted code for a package path.
export function goQualifier(path) {
    if (pathToLocal[path])
        return pathToLocal[path];
    const info = goPackage(path);
    const name = info ? info.name : (path.split('/').pop() ?? path);
    return goPathAliases[path] ?? name;
}
// Register the qualifier for a package pulled in only as a type reference.
export function ensureGoQualifier(path) {
    if (!pathToLocal[path]) {
        pathToLocal[path] = goQualifier(path);
    }
}
// Package path of a local namespace name, '' when none.
export function goPathOf(local) {
    return localToPath[local] ?? '';
}
// Qualified member of a local name ('Sprintf' → 'fmt.Sprintf'), '' when none.
export function goMemberOf(local) {
    return memberAliases[local] ?? '';
}
// Ensure the packages named by a Go type are imported (cross-package
// result types like hash.Hash32 need their own import).
export function ensureGoTypePackages(goType) {
    if (!goType)
        return;
    const cleaned = goType.replace(/\[[^\]]*\]/g, ' ').replace(/[*,{}()]/g, ' ');
    for (const part of cleaned.split(/\s+/)) {
        if (!part || part === 'error' || part === 'any' || part === 'interface{}')
            continue;
        const dot = part.lastIndexOf('.');
        if (dot < 0)
            continue;
        const path = part.slice(0, dot);
        if (knownPaths[path]) {
            services.pkg(path);
            ensureGoQualifier(path);
        }
    }
}
let knownPaths = {};
export function initKnownPaths() {
    knownPaths = {};
    for (const p of allGoPaths())
        knownPaths[p] = true;
}
// Split 'qualifier.Member' into path + member using the import table.
export function splitGoMember(qualified) {
    const dot = qualified.indexOf('.');
    if (dot < 0)
        return null;
    const qualifier = qualified.slice(0, dot);
    const member = qualified.slice(dot + 1);
    for (const path of Object.keys(pathToLocal)) {
        if (pathToLocal[path] === qualifier)
            return { path, member };
    }
    return null;
}
// Rewrite a metadata Go type with the emitted qualifiers
// (*compress/gzip.Writer → *gzip.Writer, *net/url.URL → *tnurl.URL).
export function goLocalType(goType) {
    if (!goType)
        return goType;
    let out = goType;
    for (const path of Object.keys(pathToLocal)) {
        const qualifier = pathToLocal[path];
        out = out.split(path + '.').join(qualifier + '.');
    }
    return out;
}
// Whether an identifier or property access refers to a Go bridge member.
export function isGoMember(node) {
    if (services.isIdentifier(node)) {
        return !!memberAliases[node.text];
    }
    if (services.isPropertyAccess(node)) {
        const base = node.expression;
        if (services.isIdentifier(base) && localToPath[base.text])
            return true;
    }
    return false;
}
// Emitted qualifier + member for a callee expression.
function calleeTarget(callee) {
    if (services.isIdentifier(callee)) {
        const qualified = memberAliases[callee.text];
        if (!qualified)
            return null;
        const split = splitGoMember(qualified);
        if (!split)
            return null;
        return { path: split.path, member: split.member, qualifier: goQualifier(split.path) };
    }
    if (services.isPropertyAccess(callee)) {
        const base = callee.expression;
        if (!services.isIdentifier(base))
            return null;
        const path = localToPath[base.text];
        if (!path)
            return null;
        return { path, member: callee.name.text, qualifier: goQualifier(path) };
    }
    return null;
}
// Local name of a go:builtin function (ref/chan), '' when none.
function goBuiltinName(callee) {
    if (services.isIdentifier(callee)) {
        const qualified = goMemberOf(callee.text);
        if (qualified && qualified.startsWith('go:builtin.')) {
            return qualified.slice('go:builtin.'.length);
        }
    }
    return '';
}
// Whether the node is a go:builtin ref<T>(init?) call.
export function isGoRefCall(node) {
    return !!node && node.kind === 'CallExpression' && goBuiltinName(node.expression) === 'ref';
}
// go:builtin calls: ref<T>(init?) → new(T), chan<T>(size?) → make(chan T).
function visitGoBuiltinCall(node) {
    const name = goBuiltinName(node.expression);
    if (!name)
        return undefined;
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
        if (size)
            return `make(chan interface{}, int(${services.visit(size)}))`;
        return 'make(chan interface{})';
    }
    return undefined;
}
// Emit a call of a Go package function with argument/result conversion.
export function visitGoCall(node) {
    const builtin = visitGoBuiltinCall(node);
    if (builtin !== undefined)
        return builtin;
    const target = calleeTarget(node.expression);
    if (!target)
        return undefined;
    const info = goPackage(target.path);
    if (!info)
        return undefined;
    const fn = info.funcs[target.member];
    if (!fn)
        return undefined;
    services.pkg(target.path);
    const argNodes = node.arguments ?? [];
    const args = emitGoArgs(argNodes, fn.params, fn.variadic, target.path, target.member);
    let call = `${target.qualifier}.${target.member}(${args.join(', ')})`;
    const results = instantiateResults(fn, argNodes);
    for (const r of results)
        ensureGoTypePackages(r);
    if (isBlockingCall(target.path, target.member)) {
        call = emitBlocking(call, results, isStatement(node));
    }
    else {
        call = emitResults(call, results, isStatement(node));
    }
    return call;
}
// Substitute a generic function's type params from the argument types
// (slices.Clone[S ~[]E, E any](s S): S → []float64 for a []float64 arg).
function instantiateResults(fn, argNodes) {
    if (fn.tparams.length === 0)
        return fn.results;
    const subst = {};
    for (let i = 0; i < fn.params.length && i < argNodes.length; i++) {
        unifyParam(fn.params[i].goType.replace(/^\.\.\./, ''), services.typeOf(argNodes[i]) ?? '', subst);
    }
    return fn.results.map((r) => substituteType(r, subst));
}
function unifyParam(paramType, argType, subst) {
    if (!paramType || !argType)
        return;
    // Exact type param: S → []float64.
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(paramType)) {
        if (!(paramType in subst))
            subst[paramType] = argType;
        return;
    }
    // One-level composite: []E, *E, map[K]V, chan E.
    if (paramType.startsWith('[]') && argType.startsWith('[]')) {
        unifyParam(paramType.slice(2), argType.slice(2), subst);
        return;
    }
    if (paramType.startsWith('*') && argType.startsWith('*')) {
        unifyParam(paramType.slice(1), argType.slice(1), subst);
        return;
    }
}
function substituteType(goType, subst) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(goType) && goType in subst) {
        return subst[goType];
    }
    return goType;
}
// Whether the call node is used as a bare statement (its value discarded).
function isStatement(node) {
    return !!node.parent && node.parent.kind === 'ExpressionStatement';
}
// Emit converted arguments.
function emitGoArgs(nodes, params, variadic, path, funcName) {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const param = params[i] ?? params[params.length - 1];
        // Callback arguments become Go closures with the exact signature.
        if (param &&
            (services.isArrowFunction(node) || services.isFunctionExpression(node)) &&
            isFuncType(param.goType)) {
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
        }
        else if (paramType.startsWith('...')) {
            paramType = paramType.slice(3);
        }
        // A slice filling a variadic slot spreads (f([a, b]) → f(a, b)).
        const fromTypeEarly = services.typeOf(node) ?? '';
        const fromSlice = fromTypeEarly.startsWith('*[]') ? fromTypeEarly.slice(1) : fromTypeEarly;
        if (isVariadicSlot && fromSlice.startsWith('[]') && node.kind !== 'SpreadElement') {
            out.push(`${services.visit(node)}...`);
            continue;
        }
        // Empty array literal into a slice slot: emit the typed empty literal.
        if (paramType.startsWith('[]') &&
            node.kind === 'ArrayLiteralExpression' &&
            (node.elements ?? []).length === 0) {
            out.push(`${paramType}{}`);
            continue;
        }
        const visited = services.visit(node);
        const fromType = services.typeOf(node) ?? '';
        ensureGoTypePackages(paramType);
        out.push(toGo(visited, fromType, paramType));
    }
    // Trailing error params already thrown upstream (template.Must(t)):
    // pad with nil so Go's Must wrappers type-check.
    for (let i = nodes.length; i < params.length; i++) {
        const paramType = params[i].goType;
        if (paramType === 'error') {
            out.push('nil');
        }
        else {
            break;
        }
    }
    return out;
}
// Wrap results: (T, error) throws, error-only throws as a statement and
// yields the error value in value position, tuples pass through.
function emitResults(call, results, asStatement = false) {
    if (results.length === 0)
        return call;
    const last = results[results.length - 1];
    if (last === 'error') {
        const core = results.slice(0, -1);
        if (core.length === 0) {
            if (asStatement)
                return checkCall(call);
            return call;
        }
        const wrapped = mustCall(call, core.length);
        if (asStatement)
            return wrapped;
        if (core.length === 1)
            return fromGo(wrapped, core[0]);
        // (A, B, error): pack the two values into a slice.
        const temps = core.map((_, i) => `__v${i}`);
        return `func() []interface{} { ${temps.join(', ')} := ${wrapped}; return []interface{}{${packTuple(temps, core)}} }()`;
    }
    if (results.length === 1) {
        if (asStatement)
            return call;
        return fromGo(call, results[0]);
    }
    // Multiple values: pack into a slice (TS tuple). Multi-value calls can't
    // appear in a composite literal, so go through temps.
    if (asStatement)
        return call;
    const temps = results.map((_, i) => `__v${i}`);
    return `func() []interface{} { ${temps.join(', ')} := ${call}; return []interface{}{${packTuple(temps, results)}} }()`;
}
// Tuple elements read as TS-facing values (ints → float64), matching
// goTupleTypes so destructuring can assert them back.
function packTuple(temps, types) {
    return temps.map((t, i) => fromGo(t, types[i])).join(', ');
}
// TS-facing element types of a multi-value Go call ((A, B) or
// (A, B, error)); undefined for anything else.
export function goTupleTypes(node) {
    if (!node || node.kind !== 'CallExpression')
        return undefined;
    let results;
    const target = calleeTarget(node.expression);
    if (target) {
        const fn = goPackage(target.path)?.funcs[target.member];
        if (fn)
            results = instantiateResults(fn, node.arguments ?? []);
    }
    else if (services.isPropertyAccess(node.expression)) {
        const recvType = services.typeOf(node.expression.expression);
        const method = recvType ? goMethodInfo(recvType, node.expression.name.text) : null;
        if (method)
            results = method.results;
    }
    if (!results)
        return undefined;
    const core = results.length > 0 && results[results.length - 1] === 'error' ? results.slice(0, -1) : results;
    if (core.length < 2)
        return undefined;
    return core.map((t) => goResultType([t]) ?? 'interface{}');
}
// Wrap a blocking call so it runs on a goroutine while the baton holder
// pumps pending loop tasks.
function emitBlocking(call, results, asStatement = false) {
    services.helper('goBlocking');
    const wrapped = `tnGoBlocking(func() interface{} { return ${call} })`;
    return emitResults(wrapped, results, asStatement);
}
function isFuncType(goType) {
    return goType.startsWith('func(') || goTypeInfo(goType) !== null && goTypeInfo(goType)?.kind === 'func';
}
// Emit a TS closure as a Go closure with the exact Go signature.
function emitCallback(node, goType, path, funcName) {
    const sig = parseFuncSig(goType);
    if (!sig)
        return services.visit(node);
    const params = [];
    for (let i = 0; i < sig.params.length; i++) {
        const declared = (node.parameters ?? [])[i];
        const name = declared && services.isIdentifier(declared.name) ? services.visit(declared.name) : `arg${i}`;
        params.push(`${name} ${sig.params[i]}`);
    }
    const sync = isSyncCallback(path, funcName);
    // Body params convert back to TS-facing values where needed.
    const savedVisit = services.visit;
    void savedVisit;
    void sync;
    const body = services.visit(node.body);
    const results = sig.results.length > 0 ? ' ' + sig.results.join(', ') : '';
    return `func(${params.join(', ')})${results} { return ${body} }`;
}
function parseFuncSig(goType) {
    if (!goType.startsWith('func(')) {
        const info = goTypeInfo(goType);
        if (!info || info.kind !== 'func')
            return null;
        goType = info.under;
    }
    if (!goType.startsWith('func('))
        return null;
    const rest = goType.slice(4);
    let depth = 0;
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '(')
            depth++;
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
function splitTopLevel(s) {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '[' || ch === '(' || ch === '{')
            depth++;
        else if (ch === ']' || ch === ')' || ch === '}')
            depth--;
        else if (ch === ',' && depth === 0) {
            out.push(s.slice(start, i).trim());
            start = i + 1;
        }
    }
    const tail = s.slice(start).trim();
    if (tail)
        out.push(tail);
    return out;
}
function parseResultList(s) {
    s = s.trim();
    if (!s)
        return [];
    if (s.startsWith('(') && s.endsWith(')'))
        s = s.slice(1, -1);
    return splitTopLevel(s);
}
// Infer the Go type of a bridge expression.
export function inferGoType(node) {
    if (node && node.kind === 'CallExpression') {
        const builtinName = goBuiltinName(node.expression);
        if (builtinName === 'chan')
            return 'chan interface{}';
        if (builtinName === 'ref') {
            const typeArg = (node.typeArguments ?? [])[0];
            const goType = typeArg ? services.goTypeOf(typeArg) : 'interface{}';
            return `*${goType}`;
        }
        const target = calleeTarget(node.expression);
        if (target) {
            const info = goPackage(target.path);
            const fn = info?.funcs[target.member];
            if (fn)
                return goResultType(instantiateResults(fn, node.arguments ?? []));
        }
        // Method call on a Go-typed receiver.
        if (services.isPropertyAccess(node.expression)) {
            const recvType = services.typeOf(node.expression.expression);
            if (recvType) {
                const method = goMethodInfo(recvType, node.expression.name.text);
                if (method)
                    return goResultType(method.results);
            }
        }
        return undefined;
    }
    if (services.isIdentifier(node)) {
        const qualified = memberAliases[node.text];
        if (!qualified)
            return undefined;
        if (qualified.startsWith('go:builtin.'))
            return undefined;
        if (qualified === 'go:builtin')
            return undefined;
        const split = splitGoMember(qualified);
        if (!split)
            return undefined;
        const info = goPackage(split.path);
        if (!info)
            return undefined;
        // A package qualifier alone has no value type.
        if (split.member === goQualifier(split.path))
            return undefined;
        const fn = info.funcs[split.member];
        if (fn)
            return goResultType(fn.results);
        const c = info.consts[split.member];
        if (c) {
            if (c.kind === 'typed' && c.goType)
                return c.goType;
            if (c.kind === 'string')
                return 'string';
            if (c.kind === 'bool')
                return 'bool';
            return 'float64';
        }
        const v = info.vars[split.member];
        if (v)
            return v.goType;
        const t = info.types[split.member];
        if (t)
            return split.member;
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
                if (!info)
                    return undefined;
                const fn = info.funcs[member];
                if (fn)
                    return goResultType(fn.results);
                const c = info.consts[member];
                if (c)
                    return constGoType(path, member);
                const v = info.vars[member];
                if (v)
                    return v.goType;
                const t = info.types[member];
                if (t)
                    return member;
            }
        }
        // Field or method on a Go-typed receiver (any base shape).
        const recvType = services.typeOf(base);
        if (recvType) {
            const field = goFieldType(recvType, member);
            // Reads convert like results (int fields read as float64).
            if (field)
                return goResultType([field]);
            const method = goMethodInfo(recvType, member);
            if (method)
                return goResultType(method.results);
        }
        return undefined;
    }
    return undefined;
}
function goResultType(results) {
    if (results.length === 0)
        return undefined;
    const last = results[results.length - 1];
    const core = last === 'error' ? results.slice(0, -1) : results;
    if (core.length === 0)
        return 'error';
    if (core.length === 1) {
        const t = core[0];
        if (isGoNumericKind(t) && t !== 'float64')
            return 'float64';
        // Numeric slices read back as []float64 (fromGo); []byte stays.
        if (t.startsWith('[]')) {
            const elem = t.slice(2);
            if (elem !== 'byte' && elem !== 'uint8' && elem !== 'float64' && isGoNumericKind(elem))
                return '[]float64';
        }
        return t;
    }
    return '[]interface{}';
}
function constGoType(path, name) {
    const info = goPackage(path);
    const c = info?.consts[name];
    if (!c)
        return 'float64';
    if (c.kind === 'typed' && c.goType)
        return c.goType;
    if (c.kind === 'string')
        return 'string';
    if (c.kind === 'bool')
        return 'bool';
    return 'float64';
}
// Field type of a Go struct value.
export function goFieldType(recvType, field) {
    const info = goTypeInfo(recvType);
    if (!info)
        return undefined;
    for (const f of info.fields) {
        if (f.name === field)
            return f.goType;
    }
    return undefined;
}
// Method info of a Go type (value or pointer receiver).
export function goMethodInfo(recvType, method) {
    const info = goTypeInfo(recvType);
    if (!info)
        return null;
    for (const m of info.methods) {
        if (m.name === method)
            return m;
    }
    for (const m of info.ifaceMethods) {
        if (m.name === method)
            return m;
    }
    return null;
}
// Emit a method call on a Go value with conversion.
export function visitGoMethod(node, recv, recvType) {
    if (!services.isPropertyAccess(node.expression))
        return undefined;
    const method = node.expression.name.text;
    const info = goMethodInfo(recvType, method);
    if (!info)
        return undefined;
    const args = emitGoArgs(node.arguments ?? [], info.params, false, '', '');
    const call = `${recv}.${method}(${args.join(', ')})`;
    for (const r of info.results)
        ensureGoTypePackages(r);
    return emitResults(call, info.results, isStatement(node));
}
// Emit `new pkg.T({...})` as a Go composite literal.
export function visitGoNew(node, path, typeName) {
    const info = goPackage(path);
    if (!info)
        return undefined;
    const type = info.types[typeName];
    if (!type)
        return undefined;
    const qualifier = goQualifier(path);
    const first = (node.arguments ?? [])[0];
    if (first && services.isObjectLiteral(first)) {
        const entries = [];
        for (const prop of first.properties ?? []) {
            const name = prop.name ? services.visit(prop.name) : '';
            const fieldType = fieldGoTypeOf(type, prop.name?.text ?? '');
            const fromType = services.typeOf(prop.initializer) ?? '';
            let value = services.visit(prop.initializer);
            if (fieldType && fromType === `*${fieldType}`) {
                // new pkix.Name({...}) into a value field: dereference.
                value = `*${value}`;
            }
            else if (fieldType) {
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
function fieldGoTypeOf(type, field) {
    for (const f of type.fields) {
        if (f.name === field)
            return f.goType;
    }
    return undefined;
}
function hasPtrReceiver(type) {
    for (const m of type.methods) {
        if (m.ptr)
            return true;
    }
    return false;
}
