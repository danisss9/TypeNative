/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {MissingTranslationStrategy} from '../core.ts';
import {HtmlParser} from '../ml_parser/html_parser.ts';
import {type TokenizeOptions} from '../ml_parser/lexer.ts';
import {ParseTreeResult} from '../ml_parser/parser.ts';
import {type Console} from '../util.ts';

import {digest} from './digest.ts';
import {mergeTranslations} from './extractor_merger.ts';
import {Serializer} from './serializers/serializer.ts';
import {Xliff} from './serializers/xliff.ts';
import {Xliff2} from './serializers/xliff2.ts';
import {Xmb} from './serializers/xmb.ts';
import {Xtb} from './serializers/xtb.ts';
import {TranslationBundle} from './translation_bundle.ts';

export class I18NHtmlParser implements HtmlParser {
  // @override
  getTagDefinition: any;

  private _translationBundle: TranslationBundle;

  constructor(
    private _htmlParser: HtmlParser,
    translations?: string,
    translationsFormat?: string,
    missingTranslation: MissingTranslationStrategy = MissingTranslationStrategy.Warning,
    console?: Console,
  ) {
    if (translations) {
      const serializer = createSerializer(translationsFormat);
      this._translationBundle = TranslationBundle.load(
        translations,
        'i18n',
        serializer,
        missingTranslation,
        console,
      );
    } else {
      this._translationBundle = new TranslationBundle(
        {},
        null,
        digest,
        undefined,
        missingTranslation,
        console,
      );
    }
  }

  parse(source: string, url: string, options: TokenizeOptions = {}): ParseTreeResult {
    const parseResult = this._htmlParser.parse(source, url, {...options});

    if (parseResult.errors.length) {
      return new ParseTreeResult(parseResult.rootNodes, parseResult.errors);
    }

    return mergeTranslations(parseResult.rootNodes, this._translationBundle, [], {});
  }
}

function createSerializer(format?: string): Serializer {
  format = (format || 'xlf').toLowerCase();

  switch (format) {
    case 'xmb':
      return new Xmb();
    case 'xtb':
      return new Xtb();
    case 'xliff2':
    case 'xlf2':
      return new Xliff2();
    case 'xliff':
    case 'xlf':
    default:
      return new Xliff();
  }
}
