/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {AST} from '../../expression_parser/ast.ts';
import {TcbOp} from './base.ts';
import {TcbExpr} from './codegen.ts';
import {Context} from './context.ts';
import type {Scope} from './scope.ts';
import {tcbExpression} from './expression.ts';

/**
 * A `TcbOp` which can be used to type check the options of an `IntersectionObserver`.
 */
export class TcbIntersectionObserverOp extends TcbOp {
  constructor(
    private tcb: Context,
    private scope: Scope,
    private options: AST,
  ) {
    super();
  }

  override readonly optional = false;

  override execute(): null {
    const options = tcbExpression(this.options, this.tcb, this.scope);
    this.scope.addStatement(new TcbExpr(`new IntersectionObserver(null!, ${options.print()})`));
    return null;
  }
}
