import type * as zod from '../../../../zod/src/v4/core/index.ts';
import type { AbstractSyntaxTree } from './types.ts';

export function parseNotMultipleOfIssue(
  issue: zod.$ZodRawIssue<zod.$ZodIssueNotMultipleOf>
): AbstractSyntaxTree {
  return {
    type: issue.code,
    path: issue.path,
    message: `expected multiple of ${issue.divisor}`,
  };
}
