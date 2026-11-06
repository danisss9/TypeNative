// Stand-in for @babel/core. The React Compiler imports it for three things:
// the `NodePath` class (which @babel/core re-exports from @babel/traverse),
// the types of a Babel plugin (`PluginObj`, `PluginItem`, `BabelFileResult`),
// and `transformFromAstSync`, which only `runBabelPluginReactCompiler` (a
// test helper that main.ts never calls) uses to run the compiler as a Babel
// plugin. main.ts drives the compiler without @babel/core: @babel/parser
// parses, @babel/traverse hands the compiler the Program path, and
// @babel/generator prints. So this stub forwards `NodePath` and `types` and
// declares the plugin types; `transformFromAstSync` throws.

import type { File } from '../babel/types/src/index.ts';

export { NodePath } from '../babel/traverse/src/index.ts';
export * as types from '../babel/types/src/index.ts';

export type PluginItem = unknown;

export type PluginObj = {
  name?: string;
  visitor: Record<string, any>;
};

export type BabelFileResult = {
  ast?: File | null;
  code?: string | null;
  map?: unknown;
};

export function transformFromAstSync(_ast: File, _code: string, _options: unknown): BabelFileResult | null {
  throw new Error('@babel/core is not vendored: transformFromAstSync is unavailable');
}
