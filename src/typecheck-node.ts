// Node-side type-checking: builds a TypeScript program for the entry file with
// the `typescript` package and returns its errors. The self-hosted binary runs
// the same check with typescript-go (`tsparser --check`, tsparser/check.go).
//
// Node-only module: injected into run() by the Node CLI wrapper (src/cli.ts).

import ts from 'typescript';
import path from 'node:path';
import type { TypeCheckDiagnostic } from './index.js';

// The bundled declarations that replace the default lib (types/ in the package)
const TYPENATIVE_TYPES = ['typenative.d.ts', 'typenative-go.d.ts', 'typenative-npm.d.ts'];

// TS18003: "No inputs were found in config file" (only the entry is checked)
const NO_INPUTS_FOUND = 18003;

// Type-checks entry with the nearest tsconfig.json's options (or TypeNative's
// defaults, typed by typesDir). The program's roots are the entry plus the
// config's .d.ts files, so other entry points in the same project don't
// redeclare each other's globals.
export function typeCheckNode(entry: string, typesDir: string): TypeCheckDiagnostic[] {
  const entryPath = path.resolve(entry);
  const roots = [entryPath];
  const out: TypeCheckDiagnostic[] = [];

  let options: ts.CompilerOptions;
  const configPath = ts.findConfigFile(path.dirname(entryPath), ts.sys.fileExists);
  if (configPath) {
    const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => out.push(toDiagnostic(d))
    });
    if (!parsed) return out;
    for (const d of parsed.errors) {
      if (d.code !== NO_INPUTS_FOUND) out.push(toDiagnostic(d));
    }
    options = parsed.options;
    for (const name of parsed.fileNames) {
      if (name.endsWith('.d.ts')) roots.push(name);
    }
  } else {
    options = {
      target: ts.ScriptTarget.ES2020,
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
      skipLibCheck: true
    };
    for (const name of TYPENATIVE_TYPES) roots.push(path.join(typesDir, name));
  }

  const program = ts.createProgram(roots, { ...options, noEmit: true });
  for (const d of ts.getPreEmitDiagnostics(program)) {
    if (d.category === ts.DiagnosticCategory.Error) out.push(toDiagnostic(d));
  }
  return out;
}

function toDiagnostic(d: ts.Diagnostic): TypeCheckDiagnostic {
  const out: TypeCheckDiagnostic = {
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
