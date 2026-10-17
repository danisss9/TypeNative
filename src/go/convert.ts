// Go bridge conversions: TypeScript values ↔ Go values at the boundary.
//
// toGo(expr, fromType, toType): wraps an already-visited Go expression so it
// has the target Go type (int(x), T(x), tnGoNums[T](x), ...).
// fromGo(expr, goType): wraps a Go expression so it reads as a TS number
// (float64(x)) where needed.
//
// Kept in a plain style because this file is part of the self-hosted
// compiler and must transpile with TypeNative.

import { goTypeInfo, isGoNumeric, allGoPaths } from './metadata.js';

export interface ConvertServices {
  pkg: (name: string) => void;
  helper: (id: string) => void;
  typeOf: (node: any) => string;
  // Qualified Go type → the spelling emitted in code (crypto/x509.KeyUsage → x509.KeyUsage).
  localType: (goType: string) => string;
}

let services: ConvertServices = {
  pkg: (_name: string) => {},
  helper: (_id: string) => {},
  typeOf: (_node: any) => '',
  localType: (goType: string) => goType
};

let knownPaths: Record<string, boolean> = {};

export function initConvertPaths(): void {
  knownPaths = {};
  for (const p of allGoPaths()) knownPaths[p] = true;
}

// Import the package named by a Go type when it is emitted into code.
function ensureTypePackage(goType: string): void {
  if (!goType) return;
  const cleaned = goType.replace(/\[[^\]]*\]/g, ' ').replace(/[*,{}()]/g, ' ');
  for (const part of cleaned.split(/\s+/)) {
    if (!part || part === 'error' || part === 'any' || part === 'interface{}') continue;
    const dot = part.lastIndexOf('.');
    if (dot < 0) continue;
    const path = part.slice(0, dot);
    if (knownPaths[path]) services.pkg(path);
  }
}

export function bindConvertServices(s: ConvertServices): void {
  services = s;
}

// Base name of a Go type: strips pointers, qualifiers and generic args.
export function goBaseName(goType: string): string {
  let base = goType;
  while (base.startsWith('*')) base = base.slice(1);
  const dot = base.lastIndexOf('.');
  if (dot >= 0) base = base.slice(dot + 1);
  const bracket = base.indexOf('[');
  if (bracket >= 0) base = base.slice(0, bracket);
  return base;
}

// Whether the Go type is a plain (unnamed) integer kind.
export function isGoIntKind(goType: string): boolean {
  const base = goBaseName(goType);
  return (
    base === 'int' || base === 'int8' || base === 'int16' || base === 'int32' || base === 'int64' ||
    base === 'uint' || base === 'uint8' || base === 'uint16' || base === 'uint32' || base === 'uint64' ||
    base === 'uintptr' || base === 'byte' || base === 'rune'
  );
}

// Whether the Go type is a plain float kind.
export function isGoFloatKind(goType: string): boolean {
  const base = goBaseName(goType);
  return base === 'float32' || base === 'float64';
}

// Whether the Go type is a basic kind (never has fields).
export function isGoBasicKind(goType: string): boolean {
  let base = goType;
  while (base.startsWith('*')) base = base.slice(1);
  if (base.indexOf('.') >= 0) return false;
  const bare = base.indexOf('[') >= 0 ? base.slice(0, base.indexOf('[')) : base;
  return (
    bare === 'string' || bare === 'bool' ||
    bare === 'int' || bare === 'int8' || bare === 'int16' || bare === 'int32' || bare === 'int64' ||
    bare === 'uint' || bare === 'uint8' || bare === 'uint16' || bare === 'uint32' || bare === 'uint64' ||
    bare === 'uintptr' || bare === 'float32' || bare === 'float64' || bare === 'byte' || bare === 'rune'
  );
}

// Whether the Go type is any numeric kind (plain or named).
export function isGoNumericKind(goType: string): boolean {
  if (isGoIntKind(goType) || isGoFloatKind(goType)) return true;
  return isGoNumeric(goType);
}

// Convert an already-visited expression to the target Go type. toType is
// fully qualified (metadata lookups need the path); emitted type names are
// localized.
export function toGo(expr: string, fromType: string, toType: string): string {
  if (!toType || toType === 'interface{}' || toType === 'any' || fromType === toType) return expr;
  if (expr === 'nil') return expr;
  // Array references read as the slice they point to.
  if (fromType.startsWith('*[]')) fromType = fromType.slice(1);
  // Named numeric target: T(x).
  if (isGoNumeric(toType) && !isGoNumericKind(fromType)) {
    ensureTypePackage(toType);
    return `${services.localType(toType)}(${expr})`;
  }
  if (isGoNumeric(toType) && isGoNumericKind(fromType) && fromType !== toType) {
    ensureTypePackage(toType);
    return `${services.localType(toType)}(${expr})`;
  }
  // Plain int target from a TS number: T(x) with the exact kind.
  if (isGoIntKind(toType) && fromType === 'float64') {
    return `${goBaseName(toType)}(${expr})`;
  }
  if (isGoIntKind(toType) && isGoFloatKind(fromType)) {
    return `${services.localType(toType)}(${expr})`;
  }
  // Named numeric from a plain int kind.
  if (isGoNumeric(toType) && (isGoIntKind(fromType) || isGoFloatKind(fromType))) {
    ensureTypePackage(toType);
    return `${services.localType(toType)}(${expr})`;
  }
  // Fixed arrays [N]T → slice when the target is a slice. Call results
  // are unaddressable, so always go through a temp variable.
  if (fromType.startsWith('[') && !fromType.startsWith('[]') && toType.startsWith('[]')) {
    const close = fromType.indexOf(']');
    const fromElem = close >= 0 ? fromType.slice(close + 1) : '';
    const toElem = toType.slice(2);
    if (fromElem === toElem || ((fromElem === 'byte' || fromElem === 'uint8') && (toElem === 'byte' || toElem === 'uint8'))) {
      return `func() ${services.localType(toType)} { __v := ${expr}; return __v[:] }()`;
    }
    if (isGoNumericKind(toElem)) {
      services.helper('goNums');
      return `func() ${services.localType(toType)} { __v := ${expr}; return tnGoNums[${services.localType(toElem)}](__v[:]) }()`;
    }
    return `func() ${services.localType(toType)} { __v := ${expr}; return __v[:] }()`;
  }
  // Slices of numbers: tnGoNums[T](x) / element conversion.
  // []byte ↔ []byte passes through (Uint8Array needs no conversion).
  if (toType.startsWith('[]') && fromType.startsWith('[]')) {
    const toElem = toType.slice(2);
    const fromElem = fromType.slice(2);
    if (toElem === fromElem) return expr;
    if ((toElem === 'byte' || toElem === 'uint8') && (fromElem === 'byte' || fromElem === 'uint8')) {
      return expr;
    }
    if (isGoNumericKind(toElem)) {
      services.helper('goNums');
      return `tnGoNums[${services.localType(toElem)}](${expr})`;
    }
  }
  // Untyped constants arrive as float64: convert to the target.
  if (fromType === 'float64' && isGoNumericKind(toType)) {
    ensureTypePackage(toType);
    return `${services.localType(toType)}(${expr})`;
  }
  // String target.
  if (toType === 'string' && fromType !== 'string') {
    return `string(${expr})`;
  }
  // interface{}/any to a concrete named type: type assertion.
  if ((fromType === 'interface{}' || fromType === 'any' || fromType === '') && !isGoNumericKind(toType)) {
    const base = goBaseName(toType);
    if (base && base !== 'string' && base !== 'bool' && base !== 'float64' && !toType.startsWith('[]') && !toType.startsWith('map[') && !toType.startsWith('func(') && !toType.startsWith('chan ') && toType !== 'any' && toType !== 'interface{}') {
      ensureTypePackage(toType);
      return `${expr}.(${services.localType(toType)})`;
    }
  }
  // Struct value to pointer slot: take address. Never dereference into
  // an interface slot (pointer-receiver methods would be lost).
  if (toType.startsWith('*') && !fromType.startsWith('*') && !fromType.startsWith('[]') && fromType !== 'string' && fromType !== 'float64' && fromType !== 'bool' && fromType !== 'interface{}' && fromType !== 'any') {
    return `&(${expr})`;
  }
  // Single-char string to byte/rune (strconv.FormatFloat 'f', unicode funcs).
  if ((toType === 'byte' || toType === 'uint8') && fromType === 'string') {
    return `${expr}[0]`;
  }
  if (toType === 'rune' && fromType === 'string') {
    services.helper('goStrings');
    return `tnGoRune(${expr})`;
  }
  return expr;
}

// Convert a Go expression back to a TS-facing value.
export function fromGo(expr: string, goType: string): string {
  if (!goType) return expr;
  // Named numerics and plain non-float numbers read as TS numbers.
  if (isGoNumeric(goType) && goType !== 'float64') {
    return `float64(${expr})`;
  }
  if (isGoIntKind(goType) && goType !== 'float64') {
    return `float64(${expr})`;
  }
  if (isGoFloatKind(goType) && goType !== 'float64') {
    return `float64(${expr})`;
  }
  // Slices of numbers read back as []float64 ([]byte stays []byte).
  if (goType.startsWith('[]')) {
    const elem = goType.slice(2);
    if ((elem === 'byte' || elem === 'uint8')) return expr;
    if (isGoNumericKind(elem) && elem !== 'float64') {
      services.helper('goNums');
      return `tnGoFromNums[${elem}](${expr})`;
    }
  }
  return expr;
}

// Wrap a (T, error) or (A, B, error) call so it throws on error.
export function mustCall(expr: string, resultCount: number): string {
  if (resultCount === 1) {
    services.helper('goMust');
    return `tnGoMust(${expr})`;
  }
  if (resultCount === 2) {
    services.helper('goMust');
    return `tnGoMust2(${expr})`;
  }
  return expr;
}

// Wrap an error-only call so it throws on error.
export function checkCall(expr: string): string {
  services.helper('goMust');
  return `tnGoCheck(${expr})`;
}

// Whether the expression needs no conversion (already the target type).
export function needsConversion(fromType: string, toType: string): boolean {
  if (!toType || toType === 'interface{}' || toType === 'any') return false;
  if (fromType === toType) return false;
  if (isGoNumericKind(toType) && fromType === 'float64') return true;
  if (toType.startsWith('[]') && fromType.startsWith('[]')) {
    return toType.slice(2) !== fromType.slice(2);
  }
  return false;
}

export function goTypeInfoRef(goType: string): ReturnType<typeof goTypeInfo> {
  return goTypeInfo(goType);
}
