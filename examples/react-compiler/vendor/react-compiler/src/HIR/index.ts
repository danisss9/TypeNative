/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {assertConsistentIdentifiers} from './AssertConsistentIdentifiers.ts';
export {
  assertTerminalSuccessorsExist,
  assertTerminalPredsExist,
} from './AssertTerminalBlocksExist.ts';
export {assertValidBlockNesting} from './AssertValidBlockNesting.ts';
export {assertValidMutableRanges} from './AssertValidMutableRanges.ts';
export {lower} from './BuildHIR.ts';
export {buildReactiveScopeTerminalsHIR} from './BuildReactiveScopeTerminalsHIR.ts';
export {computeDominatorTree, computePostDominatorTree} from './Dominator.ts';
export {
  Environment,
  validateEnvironmentConfig,
  type EnvironmentConfig,
  type ExternalFunction,
  type Hook,
} from './Environment.ts';
export * from './HIR.ts';
export {
  markInstructionIds,
  markPredecessors,
  removeUnnecessaryTryCatch,
  reversePostorderBlocks,
} from './HIRBuilder.ts';
export {mergeConsecutiveBlocks} from './MergeConsecutiveBlocks.ts';
export {mergeOverlappingReactiveScopesHIR} from './MergeOverlappingReactiveScopesHIR.ts';
export {printDebugHIR} from './DebugPrintHIR.ts';
export {printDebugReactiveFunction} from './DebugPrintReactiveFunction.ts';
export {printFunction, printHIR, printFunctionWithOutlined} from './PrintHIR.ts';
export {pruneUnusedLabelsHIR} from './PruneUnusedLabelsHIR.ts';
