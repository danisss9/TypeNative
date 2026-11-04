/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {getHtmlTagDefinition} from './html_tags.ts';
import {type TokenizeOptions} from './lexer.ts';
import {Parser, ParseTreeResult} from './parser.ts';

export class HtmlParser extends Parser {
  constructor() {
    super(getHtmlTagDefinition);
  }

  override parse(source: string, url: string, options?: TokenizeOptions): ParseTreeResult {
    return super.parse(source, url, options);
  }
}
