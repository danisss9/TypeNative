// Go bridge metadata: parses one package string from stdlib.generated.ts
// into GoPackageInfo. Parsed only for imported packages and cached per run.
//
// Kept in a plain style (records of closures, positional helpers) because
// this file is part of the self-hosted compiler and must transpile with
// TypeNative.

import { goStdlib } from './stdlib.generated.js';

export type AstNode = any;

export interface GoParam {
  name: string;
  goType: string;
}

export interface GoFunc {
  name: string;
  tparams: string[];
  params: GoParam[];
  results: string[];
  variadic: boolean;
}

export interface GoField {
  name: string;
  goType: string;
}

export interface GoMethod {
  name: string;
  ptr: boolean;
  params: GoParam[];
  results: string[];
}

export interface GoType {
  name: string;
  kind: string;
  under: string;
  tparams: string[];
  numeric: boolean;
  fields: GoField[];
  methods: GoMethod[];
  ifaceMethods: GoMethod[];
}

export interface GoConst {
  name: string;
  kind: string;
  goType: string;
}

export interface GoVar {
  name: string;
  goType: string;
}

export interface GoPackageInfo {
  path: string;
  name: string;
  funcs: Record<string, GoFunc>;
  types: Record<string, GoType>;
  consts: Record<string, GoConst>;
  vars: Record<string, GoVar>;
}

const packageCache: Record<string, GoPackageInfo | null> = {};

function unesc(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === 'n') {
        out += '\n';
        i++;
      } else if (next === 'p') {
        out += '|';
        i++;
      } else if (next === '\\') {
        out += '\\';
        i++;
      } else {
        out += s[i];
      }
    } else {
      out += s[i];
    }
  }
  return out;
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

function parseParams(s: string): GoParam[] {
  const out: GoParam[] = [];
  if (!s) return out;
  for (const part of splitTop(s)) {
    const space = part.indexOf(' ');
    if (space < 0) continue;
    out.push({ name: unesc(part.slice(0, space)), goType: unesc(part.slice(space + 1)) });
  }
  return out;
}

function parseResults(s: string): string[] {
  if (!s) return [];
  return splitTop(s).map((r) => unesc(r));
}

// The metadata of one Go package, parsed on demand and cached.
export function goPackage(path: string): GoPackageInfo | null {
  if (path in packageCache) return packageCache[path];
  const raw = goStdlib[path];
  if (raw === undefined) {
    packageCache[path] = null;
    return null;
  }
  const info: GoPackageInfo = { path, name: path, funcs: {}, types: {}, consts: {}, vars: {} };
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const kind = line[0];
    const body = line.slice(1);
    if (kind === 'P') {
      info.name = unesc(body);
    } else if (kind === 'F') {
      const parts = body.split('|');
      const name = unesc(parts[0] ?? '');
      info.funcs[name] = {
        name,
        tparams: parts[1] ? unesc(parts[1]).split(',') : [],
        params: parseParams(parts[2] ?? ''),
        results: parseResults(parts[3] ?? ''),
        variadic: (parts[4] ?? '') === 'true'
      };
    } else if (kind === 'T') {
      const parts = body.split('|');
      const name = unesc(parts[0] ?? '');
      info.types[name] = {
        name,
        kind: unesc(parts[1] ?? ''),
        under: unesc(parts[2] ?? ''),
        tparams: parts[3] ? unesc(parts[3]).split(',') : [],
        numeric: (parts[4] ?? '') === 'true',
        fields: [],
        methods: [],
        ifaceMethods: []
      };
    } else if (kind === 'f') {
      const parts = body.split('|');
      const typeName = unesc(parts[0] ?? '');
      const type = info.types[typeName];
      if (type) type.fields.push({ name: unesc(parts[1] ?? ''), goType: unesc(parts[2] ?? '') });
    } else if (kind === 'M') {
      const parts = body.split('|');
      const typeName = unesc(parts[0] ?? '');
      const type = info.types[typeName];
      if (type) {
        type.methods.push({
          name: unesc(parts[1] ?? ''),
          ptr: (parts[2] ?? '') === 'true',
          params: parseParams(parts[3] ?? ''),
          results: parseResults(parts[4] ?? '')
        });
      }
    } else if (kind === 'I') {
      const parts = body.split('|');
      const typeName = unesc(parts[0] ?? '');
      const type = info.types[typeName];
      if (type) {
        type.ifaceMethods.push({
          name: unesc(parts[1] ?? ''),
          ptr: false,
          params: parseParams(parts[2] ?? ''),
          results: parseResults(parts[3] ?? '')
        });
      }
    } else if (kind === 'C') {
      const parts = body.split('|');
      const name = unesc(parts[0] ?? '');
      info.consts[name] = { name, kind: unesc(parts[1] ?? ''), goType: unesc(parts[2] ?? '') };
    } else if (kind === 'V') {
      const parts = body.split('|');
      const name = unesc(parts[0] ?? '');
      info.vars[name] = { name, goType: unesc(parts[1] ?? '') };
    }
  }
  packageCache[path] = info;
  return info;
}

// Whether a package path has bridge metadata.
export function hasGoPackage(path: string): boolean {
  return goStdlib[path] !== undefined;
}

// All known package paths (for resolving cross-package type references).
export function allGoPaths(): string[] {
  return Object.keys(goStdlib);
}

// Resolve a qualified Go type to its type info.
export function goTypeInfo(goType: string): GoType | null {
  let base = goType;
  while (base.startsWith('*')) base = base.slice(1);
  const dot = base.lastIndexOf('.');
  if (dot < 0) return null;
  const path = base.slice(0, dot);
  let name = base.slice(dot + 1);
  const bracket = name.indexOf('[');
  if (bracket >= 0) name = name.slice(0, bracket);
  const info = goPackage(path);
  if (!info) return null;
  return info.types[name] ?? null;
}

// Whether the Go type is a named numeric (time.Duration, fs.FileMode).
export function isGoNumeric(goType: string): boolean {
  const info = goTypeInfo(goType);
  return !!info && info.kind === 'basic' && info.numeric;
}

// Canonical form of a struct type: pointer when it has any pointer-receiver
// method, value otherwise.
export function goCanonical(typeName: string, info: GoPackageInfo): string {
  const type = info.types[typeName];
  if (!type) return typeName;
  for (const m of type.methods) {
    if (m.ptr) return '*' + typeName;
  }
  return typeName;
}
