/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

//////////////////////////////////////
// THIS FILE HAS GLOBAL SIDE EFFECT //
//       (see bottom of file)       //
//////////////////////////////////////

/**
 * @module
 * @description
 * Entry point for all APIs of the compiler package.
 *
 * <div class="callout is-critical">
 *   <header>Unstable APIs</header>
 *   <p>
 *     All compiler apis are currently considered experimental and private!
 *   </p>
 *   <p>
 *     We expect the APIs in this package to keep on changing. Do not rely on them.
 *   </p>
 * </div>
 */

import * as core from './core.ts';
import {publishFacade} from './jit_compiler_facade.ts';
import * as outputAst from './output/output_ast.ts';
import {global} from './util.ts';

export {CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, type SchemaMetadata} from './core.ts';
export {core};

export {CompilerConfig, preserveWhitespacesDefault} from './config.ts';
export {ConstantPool} from './constant_pool.ts';
export {
  ChangeDetectionStrategy,
  emitDistinctChangesOnlyDefaultValue,
  ViewEncapsulation,
} from './core.ts';
export * from './expression_parser/ast.ts';
export * from './expression_parser/lexer.ts';
export * from './expression_parser/parser.ts';
export * from './i18n/index.ts';
export * from './injectable_compiler_2.ts';
export * from './service_compiler.ts';
export {publishFacade} from './jit_compiler_facade.ts';
export * from './ml_parser/ast.ts';
export * from './ml_parser/html_parser.ts';
export * from './ml_parser/html_tags.ts';
export {
  ClassPropertyMapping,
  type ClassPropertyName,
  type InputOrOutput,
  type BindingPropertyName,
} from './property_mapping.ts';
export {MatchSource} from './render3/view/t2_api.ts';
export {type LexerRange} from './ml_parser/lexer.ts';
export {ParseTreeResult, TreeError} from './ml_parser/parser.ts';
export * from './ml_parser/tags.ts';
export {TokenType as LexerTokenType} from './ml_parser/tokens.ts';
export * from './ml_parser/xml_parser.ts';
export {EmitterVisitorContext, AbstractEmitterVisitor} from './output/abstract_emitter.ts';
export {
  ArrayType,
  ArrowFunctionExpr,
  BinaryOperator,
  BinaryOperatorExpr,
  BuiltinType,
  BuiltinTypeName,
  CommaExpr,
  ConditionalExpr,
  DeclareFunctionStmt,
  DeclareVarStmt,
  DYNAMIC_TYPE,
  DynamicImportExpr,
  Expression,
  ExpressionStatement,
  ExpressionType,
  type ExpressionVisitor,
  ExternalExpr,
  ExternalReference,
  FunctionExpr,
  IfStmt,
  InstantiateExpr,
  InvokeFunctionExpr,
  jsDocComment,
  JSDocComment,
  leadingComment,
  LeadingComment,
  literal,
  LiteralArrayExpr,
  LiteralExpr,
  literalMap,
  LiteralMapExpr,
  LocalizedString,
  MapType,
  NONE_TYPE,
  NotExpr,
  ParenthesizedExpr,
  ReadKeyExpr,
  ReadPropExpr,
  ReadVarExpr,
  RegularExpressionLiteralExpr,
  ReturnStatement,
  Statement,
  type StatementVisitor,
  StmtModifier,
  STRING_TYPE,
  TaggedTemplateLiteralExpr,
  TemplateLiteralElementExpr,
  TemplateLiteralExpr,
  TransplantedType,
  Type,
  TypeModifier,
  TypeofExpr,
  type TypeVisitor,
  UnaryOperator,
  UnaryOperatorExpr,
  VoidExpr,
  WrappedNodeExpr,
  LiteralMapPropertyAssignment,
  LiteralMapSpreadAssignment,
  SpreadElementExpr,
} from './output/output_ast.ts';
export {JitEvaluator} from './output/output_jit.ts';
export {type SourceMap} from './output/source_map.ts';
export * from './parse_util.ts';
export * from './render3/partial/api.ts';
export {
  compileComponentDeclareClassMetadata,
  compileDeclareClassMetadata,
} from './render3/partial/class_metadata.ts';
export {
  compileDeclareComponentFromMetadata,
  type DeclareComponentTemplateInfo,
} from './render3/partial/component.ts';
export {compileDeclareDirectiveFromMetadata} from './render3/partial/directive.ts';
export {compileDeclareFactoryFunction} from './render3/partial/factory.ts';
export {compileDeclareInjectableFromMetadata} from './render3/partial/injectable.ts';
export {compileDeclareServiceFromMetadata} from './render3/partial/service.ts';
export {compileDeclareInjectorFromMetadata} from './render3/partial/injector.ts';
export {compileDeclareNgModuleFromMetadata} from './render3/partial/ng_module.ts';
export {compileDeclarePipeFromMetadata} from './render3/partial/pipe.ts';
export {
  BlockNode as TmplAstBlockNode,
  BoundAttribute as TmplAstBoundAttribute,
  BoundDeferredTrigger as TmplAstBoundDeferredTrigger,
  BoundEvent as TmplAstBoundEvent,
  BoundText as TmplAstBoundText,
  BoundaryBlock as TmplAstBoundaryBlock,
  BoundaryErrorBlock as TmplAstBoundaryErrorBlock,
  Content as TmplAstContent,
  DeferredBlock as TmplAstDeferredBlock,
  DeferredBlockError as TmplAstDeferredBlockError,
  DeferredBlockLoading as TmplAstDeferredBlockLoading,
  DeferredBlockPlaceholder as TmplAstDeferredBlockPlaceholder,
  type DeferredBlockTriggers as TmplAstDeferredBlockTriggers,
  DeferredTrigger as TmplAstDeferredTrigger,
  Element as TmplAstElement,
  ForLoopBlock as TmplAstForLoopBlock,
  ForLoopBlockEmpty as TmplAstForLoopBlockEmpty,
  HoverDeferredTrigger as TmplAstHoverDeferredTrigger,
  Icu as TmplAstIcu,
  IdleDeferredTrigger as TmplAstIdleDeferredTrigger,
  IfBlock as TmplAstIfBlock,
  IfBlockBranch as TmplAstIfBlockBranch,
  ImmediateDeferredTrigger as TmplAstImmediateDeferredTrigger,
  InteractionDeferredTrigger as TmplAstInteractionDeferredTrigger,
  LetDeclaration as TmplAstLetDeclaration,
  NeverDeferredTrigger as TmplAstNeverDeferredTrigger,
  type Node as TmplAstNode,
  RecursiveVisitor as TmplAstRecursiveVisitor,
  Reference as TmplAstReference,
  SwitchBlock as TmplAstSwitchBlock,
  SwitchBlockCase as TmplAstSwitchBlockCase,
  SwitchBlockCaseGroup as TmplAstSwitchBlockCaseGroup,
  SwitchExhaustiveCheck as TmplAstSwitchExhaustiveCheck,
  Template as TmplAstTemplate,
  Text as TmplAstText,
  TextAttribute as TmplAstTextAttribute,
  TimerDeferredTrigger as TmplAstTimerDeferredTrigger,
  UnknownBlock as TmplAstUnknownBlock,
  Variable as TmplAstVariable,
  ViewportDeferredTrigger as TmplAstViewportDeferredTrigger,
  HostElement as TmplAstHostElement,
  Component as TmplAstComponent,
  Directive as TmplAstDirective,
  ContentBlock as TmplAstContentBlock,
  visitAll as tmplAstVisitAll,
  type Visitor as TmplAstVisitor,
} from './render3/r3_ast.ts';
export {compileClassDebugInfo, type R3ClassDebugInfo} from './render3/r3_class_debug_info_compiler.ts';
export {
  compileClassMetadata,
  type CompileClassMetadataFn,
  compileComponentClassMetadata,
  compileOpaqueAsyncClassMetadata,
  type R3ClassMetadata,
  type R3ClassMetadataCtorParameter,
} from './render3/r3_class_metadata_compiler.ts';
export {
  compileFactoryFunction,
  type R3DependencyMetadata,
  type R3FactoryMetadata,
} from './render3/r3_factory.ts';
export {
  compileHmrInitializer,
  compileHmrUpdateCallback,
  type R3HmrMetadata,
  type R3HmrNamespaceDependency,
} from './render3/r3_hmr_compiler.ts';
export {Identifiers as R3Identifiers} from './render3/r3_identifiers.ts';
export {compileInjector, type R3InjectorMetadata} from './render3/r3_injector_compiler.ts';
export {
  compileNgModule,
  type R3NgModuleMetadata,
  type R3NgModuleMetadataGlobal,
  R3NgModuleMetadataKind,
  R3SelectorScopeMode,
} from './render3/r3_module_compiler.ts';
export {compilePipeFromMetadata, type R3PipeMetadata} from './render3/r3_pipe_compiler.ts';
export {
  createMayBeForwardRefExpression,
  devOnlyGuardedExpression,
  ForwardRefHandling,
  getSafePropertyAccessString,
  type MaybeForwardRefExpression,
  type R3CompiledExpression,
  type R3Reference,
  isUnsafeObjectKey,
} from './render3/util.ts';
export * from './render3/view/api.ts';
export {
  compileComponentFromMetadata,
  compileDeferResolverFunction,
  compileDirectiveFromMetadata,
  encapsulateStyle,
  type ParsedHostBindings,
  parseHostBindings,
  verifyHostBindings,
} from './render3/view/compiler.ts';
export * from './render3/view/t2_api.ts';
export * from './render3/view/t2_binder.ts';
export {
  makeBindingParser,
  type ParsedTemplate,
  parseTemplate,
  type ParseTemplateOptions,
} from './render3/view/template.ts';
export {CombinedRecursiveAstVisitor} from './combined_visitor.ts';

// Note: BindingParser is intentionally exported as a type only, because it should
// be constructed through `makeBindingParser`, rather than its constructor.
export {type BindingParser} from './template_parser/binding_parser.ts';
export {createCssSelectorFromNode} from './render3/view/util.ts';
export * from './resource_loader.ts';
export * from './schema/dom_element_schema_registry.ts';
export * from './schema/element_schema_registry.ts';
export * from './directive_matching.ts';
export {Version, escapeRegExp} from './util.ts';
export * from './version.ts';
export {outputAst};
export {CompilerFacadeImpl} from './jit_compiler_facade.ts';
export {FactoryTarget} from './compiler_facade_interface.ts';
export {QueryFlags} from './render3/view/query_generation.ts';

export * from './typecheck/api.ts';
export * from './typecheck/host_bindings.ts';
export {CommentTriviaType, ExpressionIdentifier} from './typecheck/comments.ts';
export {type OutOfBandDiagnosticRecorder, OutOfBandDiagnosticCategory} from './typecheck/oob.ts';
export {type DomSchemaChecker} from './typecheck/schema.ts';
export {generateTypeCheckBlock} from './typecheck/type_check_block.ts';
export {TcbExpr} from './typecheck/ops/codegen.ts';
export {TcbGenericContextBehavior} from './typecheck/ops/context.ts';

export * from './indexer/api.ts';
export {type IndexerComponentInfo, IndexingContext} from './indexer/context.ts';
export {getIndexerTemplateIdentifiers, IndexerVisitor} from './indexer/template.ts';
export {generateIndexerAnalysis} from './indexer/transform.ts';
export {LEGACY_OPTIONAL_CHAINING_DEFAULT} from './legacy_optional_chaining_default.ts';

// This file only reexports content of the `src` folder. Keep it that way.

// This function call has a global side effects and publishes the compiler into global namespace for
// the late binding of the Compiler to the @angular/core for jit compilation.
publishFacade(global);
