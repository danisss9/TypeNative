import type * as zod from '../../../../zod/src/v4/core/index.ts';
import type { AbstractSyntaxTree } from './types.ts';

export function parseCustomIssue(
  issue: zod.$ZodRawIssue<zod.$ZodIssueCustom>
): AbstractSyntaxTree {
  return {
    type: issue.code,
    path: issue.path,
    message: issue.message ?? 'Invalid input',
  };
}
