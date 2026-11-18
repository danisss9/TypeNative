// Node-side type-checking: builds a TypeScript program for the entry file with
// the `typescript` package and returns its errors. The self-hosted binary runs
// the same check with typescript-go (`tsparser --check`, tsparser/check.go).
//
// Node-only module: injected into run() by the Node CLI wrapper (src/cli.ts).
import ts from 'typescript';
import path from 'node:path';
// The bundled declarations that replace the default lib (types/ in the package)
const TYPENATIVE_TYPES = ['typenative.d.ts', 'typenative-go.d.ts', 'typenative-npm.d.ts'];
// TS18003: "No inputs were found in config file" (only the entry is checked)
const NO_INPUTS_FOUND = 18003;
const contextCache = new Map();
function getContext(entryDir, typesDir) {
    const configPath = ts.findConfigFile(entryDir, ts.sys.fileExists);
    const key = configPath ?? `default:${typesDir}`;
    const cached = contextCache.get(key);
    if (cached)
        return { ctx: cached, errors: [...cached.configErrors] };
    const configErrors = [];
    const dtsRoots = [];
    let options;
    if (configPath) {
        const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (d) => configErrors.push(toDiagnostic(d))
        });
        if (!parsed)
            return { ctx: null, errors: configErrors };
        for (const d of parsed.errors) {
            if (d.code !== NO_INPUTS_FOUND)
                configErrors.push(toDiagnostic(d));
        }
        options = { ...parsed.options, noEmit: true };
        for (const name of parsed.fileNames) {
            if (name.endsWith('.d.ts'))
                dtsRoots.push(name);
        }
    }
    else {
        options = {
            target: ts.ScriptTarget.ES2025,
            useDefineForClassFields: false,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            lib: [],
            types: [],
            strict: true,
            noImplicitAny: true,
            allowSyntheticDefaultImports: true,
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            jsx: ts.JsxEmit.Preserve,
            skipLibCheck: true,
            noEmit: true
        };
        for (const name of TYPENATIVE_TYPES)
            dtsRoots.push(path.join(typesDir, name));
    }
    // Reuse parsed .d.ts SourceFiles across checks in the same process (e.g.
    // worker pools) so types/*.d.ts (~900 KB) isn't re-parsed for every probe.
    const host = ts.createCompilerHost(options);
    const sfCache = new Map();
    const origGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (fileName, languageVersion, ...rest) => {
        if (fileName.endsWith('.d.ts')) {
            let sf = sfCache.get(fileName);
            if (!sf) {
                sf = origGetSourceFile(fileName, languageVersion, ...rest);
                if (sf)
                    sfCache.set(fileName, sf);
            }
            return sf;
        }
        return origGetSourceFile(fileName, languageVersion, ...rest);
    };
    const ctx = { options, dtsRoots, configErrors, host };
    contextCache.set(key, ctx);
    return { ctx, errors: [...configErrors] };
}
// Type-checks entry with the nearest tsconfig.json's options (or TypeNative's
// defaults, typed by typesDir). The program's roots are the entry plus the
// config's .d.ts files, so other entry points in the same project don't
// redeclare each other's globals.
export function typeCheckNode(entry, typesDir) {
    const entryPath = path.resolve(entry);
    const { ctx, errors: out } = getContext(path.dirname(entryPath), typesDir);
    if (!ctx)
        return out;
    const program = ts.createProgram([entryPath, ...ctx.dtsRoots], ctx.options, ctx.host, ctx.oldProgram);
    ctx.oldProgram = program;
    for (const d of ts.getPreEmitDiagnostics(program)) {
        if (d.category === ts.DiagnosticCategory.Error)
            out.push(toDiagnostic(d));
    }
    return out;
}
function toDiagnostic(d) {
    const out = {
        file: '',
        line: 0,
        column: 0,
        code: d.code,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n')
    };
    if (d.file && d.start !== undefined) {
        const start = d.file.getLineAndCharacterOfPosition(d.start);
        out.file = d.file.fileName;
        out.line = start.line + 1;
        out.column = start.character + 1;
    }
    return out;
}
