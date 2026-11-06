import type * as zod from '../../../../zod/src/v4/core/index.ts';
import type { AbstractSyntaxTree } from './types.ts';

export function parseInvalidKeyIssue(
  issue: zod.$ZodRawIssue<zod.$ZodIssueInvalidKey>
): AbstractSyntaxTree {
  return {
    type: issue.code,
    path: issue.path,
    message: `unexpected key in ${issue.origin}`,
  };
}
