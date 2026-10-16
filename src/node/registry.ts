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

export type AstNode = any;

// One call of a mapped Node API
export interface NodeCall {
  // Visited Go arguments
  args: string[];
  // Argument AST nodes
  nodes: AstNode[];
  // Inferred Go types of the arguments ('' when unknown)
  types: string[];
  // Visited receiver of an instance method ('' for functions)
  recv: string;
}

export type NodeEmit = (call: NodeCall) => string;
// Result type that depends on the arguments (readFileSync: Buffer vs string);
// receives the argument nodes and types (args / recv are empty)
export type NodeTyper = (call: NodeCall) => string;
// Go parameter types of the callback argument (the last function argument)
export type NodeParamTyper = (nodes: AstNode[]) => string[];

export interface NodeClass {
  key: string;
  // Go type of instances ('*TnEventEmitter', '[]byte')
  goType: string;
  // Method-dispatch category: 'class' passes methods through as Go methods
  category: string;
  // Go return types of pass-through methods ('' for none)
  methods: Record<string, string>;
  // Plain struct fields
  props: Record<string, string>;
  // Accessor properties: reads call Get_x(), writes Set_x(v)
  getters: Record<string, string>;
  setters: Record<string, boolean>;
}

export interface NodeRegistry {
  modules: Record<string, boolean>;
  // Module name aliases (sys → util)
  aliases: Record<string, string>;
  functions: Record<string, NodeEmit>;
  constructors: Record<string, NodeEmit>;
  methods: Record<string, NodeEmit>;
  results: Record<string, string>;
  typers: Record<string, NodeTyper>;
  paramTypers: Record<string, NodeParamTyper>;
  values: Record<string, NodeEmit>;
  valueTypes: Record<string, string>;
  classes: Record<string, NodeClass>;
  classByGoType: Record<string, string>;
  // Nested namespaces: 'fs.promises' → 'fs/promises'
  namespaces: Record<string, string>;
  // Namespace objects other than modules ('process.stdout', 'perf_hooks.performance')
  objects: Record<string, boolean>;
  // for...of / for await over instances: Go type → method returning a slice or channel
  iterators: Record<string, string>;
  // Constructor option methods' parameter types: new Transform({ transform(chunk, enc, cb) {} })
  optionTypers: Record<string, (options: AstNode) => Record<string, string[]>>;
  // Classes whose subclasses may override hook methods (_transform …), by class key
  hookPrefixes: Record<string, string>;
  // Parameter types of hook methods, by name
  hookParams: Record<string, string[]>;
  // Node globals resolved like imports: 'Buffer' → 'buffer.Buffer'
  globals: Record<string, string>;
  goHelpers: Record<string, string>;
  helperPackages: Record<string, string[]>;
  helperRequires: Record<string, string[]>;
  // Services provided by the transpiler
  pkg: (name: string) => void;
  helper: (id: string) => void;
  temp: (prefix: string) => string;
  typeOf: (node: AstNode) => string;
  visit: (node: AstNode) => string;
  // Method-dispatch category of an expression ('Map', 'Record', 'class', …)
  categoryOf: (node: AstNode) => string;
}

// Services start as no-ops; the transpiler binds them before each run
export function createNodeRegistry(): NodeRegistry {
  const registry: NodeRegistry = {
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
    pkg: (_name: string) => {},
    helper: (_id: string) => {},
    temp: (prefix: string) => prefix,
    typeOf: (_node: AstNode) => '',
    visit: (_node: AstNode) => '',
    categoryOf: (_node: AstNode) => ''
  };
  return registry;
}

// Parses 'name=type; name=type' specs into a record
function parseSpec(spec: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of spec.split(';')) {
    const trimmed = entry.trim();
    if (trimmed === '') continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      out[trimmed] = '';
    } else {
      out[trimmed.substring(0, eq).trim()] = trimmed.substring(eq + 1).trim();
    }
  }
  return out;
}

// Registers a Node class (methods / props / getters as 'name=GoType; …' specs;
// setters as 'a; b')
export function defineClass(
  r: NodeRegistry,
  key: string,
  goType: string,
  category: string,
  methods: string,
  props: string,
  getters: string,
  setters: string
): NodeClass {
  const setterNames: Record<string, boolean> = {};
  for (const name of Object.keys(parseSpec(setters))) setterNames[name] = true;
  const cls: NodeClass = {
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
export function setResults(r: NodeRegistry, prefix: string, spec: string): void {
  const parsed = parseSpec(spec);
  for (const name of Object.keys(parsed)) r.results[`${prefix}.${name}`] = parsed[name];
}

// Registers a Go helper with the packages and other helpers it needs
export function defineHelper(r: NodeRegistry, id: string, packages: string[], requires: string[], source: string): void {
  r.goHelpers[id] = source;
  r.helperPackages[id] = packages;
  r.helperRequires[id] = requires;
}

// Registers a module (and its bare / alias names)
export function defineModule(r: NodeRegistry, name: string): void {
  r.modules[name] = true;
}

// --- AST helpers for emitters ---

export function isStringNode(node: AstNode): boolean {
  return !!node && (node.kind === 'StringLiteral' || node.kind === 'NoSubstitutionTemplateLiteral');
}

export function isObjectLiteral(node: AstNode): boolean {
  return !!node && node.kind === 'ObjectLiteralExpression';
}

export function isFunctionNode(node: AstNode): boolean {
  return !!node && (node.kind === 'ArrowFunction' || node.kind === 'FunctionExpression');
}

// The property `name` of an object-literal argument (its value node)
export function getOption(node: AstNode, name: string): AstNode {
  if (!isObjectLiteral(node)) return undefined;
  for (const prop of node.properties ?? []) {
    const propName = prop.name;
    if (!propName) continue;
    const text = propName.kind === 'Identifier' || propName.kind === 'StringLiteral' ? propName.text : '';
    if (text !== name) continue;
    if (prop.kind === 'PropertyAssignment') return prop.initializer;
    if (prop.kind === 'ShorthandPropertyAssignment') return prop.name;
  }
  return undefined;
}

// Whether an object-literal option is the literal `true`
export function optionIsTrue(node: AstNode, name: string): boolean {
  const value = getOption(node, name);
  return !!value && value.kind === 'TrueKeyword';
}

// The encoding named by an argument: a string literal ('utf8') or an options
// object with an `encoding` string literal; '' when absent
export function encodingOf(node: AstNode): string {
  if (!node) return '';
  if (isStringNode(node)) return String(node.text);
  const value = getOption(node, 'encoding');
  if (value && isStringNode(value)) return String(value.text);
  return '';
}

// Index of the last function-literal argument, -1 when there is none
export function callbackIndex(nodes: AstNode[]): number {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (isFunctionNode(nodes[i])) return i;
  }
  return -1;
}

// Arguments except the callback (Node's optional-arguments-then-callback shape)
export function argsBeforeCallback(call: NodeCall): string[] {
  const index = callbackIndex(call.nodes);
  if (index < 0) return call.args;
  return call.args.slice(0, index);
}

// A Go string literal
export function goString(value: string): string {
  return JSON.stringify(value);
}
