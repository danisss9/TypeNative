/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {createInjectableType, delegateToFactory} from './injectable_compiler_2.ts';
import * as o from './output/output_ast.ts';
import {Identifiers} from './render3/r3_identifiers.ts';
import {type R3CompiledExpression, type R3Reference} from './render3/util.ts';
import {DefinitionMap} from './render3/view/util.ts';

export interface R3ServiceMetadata {
  name: string;
  type: R3Reference;
  typeArgumentCount: number;
  autoProvided?: boolean;
  factory?: o.Expression;
}

export function compileService(
  meta: R3ServiceMetadata,
  resolveForwardRefs: boolean,
): R3CompiledExpression {
  const def = new DefinitionMap<{
    token: o.Expression;
    factory: o.Expression;
    autoProvided: o.Expression;
  }>();
  def.set('token', meta.type.value);
  def.set(
    'factory',
    meta.factory === undefined
      ? delegateToFactory(
          meta.type.value as o.WrappedNodeExpr<any>,
          meta.type.value as o.WrappedNodeExpr<any>,
          resolveForwardRefs,
        )
      : o.arrowFn([], meta.factory.callFn([]), o.DYNAMIC_TYPE),
  );

  // Only generate providedIn property if it's different from the default.
  if (meta.autoProvided === false) {
    def.set('autoProvided', o.literal(false));
  }

  const expression = o
    .importExpr(Identifiers.defineService)
    .callFn([def.toLiteralMap()], undefined, true);

  return {
    expression,
    type: createInjectableType(meta.type.type, meta.typeArgumentCount),
    statements: [],
  };
}
