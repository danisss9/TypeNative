import type * as zod from '../../../../zod/src/v4/core/index.ts';
import type { AbstractSyntaxTree } from './types.ts';

export function parseInvalidElementIssue(
  issue: zod.$ZodRawIssue<zod.$ZodIssueInvalidElement>
): AbstractSyntaxTree {
  return {
    type: issue.code,
    path: issue.path,
    message: `unexpected element in ${issue.origin}`,
  };
}
