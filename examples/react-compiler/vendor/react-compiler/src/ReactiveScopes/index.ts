/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {alignObjectMethodScopes} from './AlignObjectMethodScopes.ts';
export {assertScopeInstructionsWithinScopes} from './AssertScopeInstructionsWithinScope.ts';
export {assertWellFormedBreakTargets} from './AssertWellFormedBreakTargets.ts';
export {buildReactiveFunction} from './BuildReactiveFunction.ts';
export {codegenFunction, type CodegenFunction} from './CodegenReactiveFunction.ts';
export {extractScopeDeclarationsFromDestructuring} from './ExtractScopeDeclarationsFromDestructuring.ts';
export {inferReactiveScopeVariables} from './InferReactiveScopeVariables.ts';
export {memoizeFbtAndMacroOperandsInSameScope} from './MemoizeFbtAndMacroOperandsInSameScope.ts';
export {mergeReactiveScopesThatInvalidateTogether} from './MergeReactiveScopesThatInvalidateTogether.ts';
export {
  printReactiveFunction,
  printReactiveFunctionWithOutlined,
} from './PrintReactiveFunction.ts';
export {promoteUsedTemporaries} from './PromoteUsedTemporaries.ts';
export {propagateEarlyReturns} from './PropagateEarlyReturns.ts';
export {pruneAllReactiveScopes} from './PruneAllReactiveScopes.ts';
export {pruneHoistedContexts} from './PruneHoistedContexts.ts';
export {pruneNonEscapingScopes} from './PruneNonEscapingScopes.ts';
export {pruneNonReactiveDependencies} from './PruneNonReactiveDependencies.ts';
export {pruneUnusedLValues} from './PruneTemporaryLValues.ts';
export {pruneUnusedLabels} from './PruneUnusedLabels.ts';
export {pruneUnusedScopes} from './PruneUnusedScopes.ts';
export {renameVariables} from './RenameVariables.ts';
export {stabilizeBlockIds} from './StabilizeBlockIds.ts';
export {
  ReactiveFunctionTransform,
  eachReactiveValueOperand,
  visitReactiveFunction,
  type Transformed,
} from './visitors.ts';
