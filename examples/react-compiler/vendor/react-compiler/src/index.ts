/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {runBabelPluginReactCompiler} from './Babel/RunReactCompilerBabelPlugin.ts';
export {
  CompilerError,
  CompilerErrorDetail,
  CompilerDiagnostic,
  CompilerSuggestionOperation,
  type CompilerSuggestion,
  ErrorSeverity,
  ErrorCategory,
  LintRules,
  LintRulePreset,
  type CompilerErrorDetailOptions,
  type CompilerDiagnosticOptions,
  type CompilerDiagnosticDetail,
  type LintRule,
} from './CompilerError.ts';
export {
  compileFn as compile,
  compileProgram,
  parsePluginOptions,
  OPT_OUT_DIRECTIVES,
  OPT_IN_DIRECTIVES,
  ProgramContext,
  tryFindDirectiveEnablingMemoization as findDirectiveEnablingMemoization,
  findDirectiveDisablingMemoization,
  defaultOptions,
  type CompilerPipelineValue,
  type Logger,
  type LoggerEvent,
  type PluginOptions,
  type CompileSuccessEvent,
} from './Entrypoint/index.ts';
export {
  Effect,
  ValueKind,
  ValueReason,
  printHIR,
  printFunctionWithOutlined,
  validateEnvironmentConfig,
  type EnvironmentConfig,
  type ExternalFunction,
  type Hook,
  type SourceLocation,
} from './HIR/index.ts';
export {
  printReactiveFunction,
  printReactiveFunctionWithOutlined,
} from './ReactiveScopes/index.ts';
export {parseConfigPragmaForTests} from './Utils/TestUtils.ts';
declare global {
  // @internal
  let __DEV__: boolean | null | undefined;
}

import BabelPluginReactCompiler from './Babel/BabelPlugin.ts';
export default BabelPluginReactCompiler;
