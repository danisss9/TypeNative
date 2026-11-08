import type * as zod from '../../../../zod/src/v4/core/index.ts';
import type { AbstractSyntaxTree } from './types.ts';

export function parseInvalidUnionIssue(
  issue: zod.$ZodRawIssue<zod.$ZodIssueInvalidUnion>
): AbstractSyntaxTree {
  return {
    type: issue.code,
    path: issue.path,
    message: issue.message ?? 'Invalid input',
  };
}
