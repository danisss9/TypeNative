// Intl.PluralRules (CLDR rules via golang.org/x/text), ListFormat, RelativeTimeFormat
// Expected values: Node 26's Intl (ICU 78)
function errName(fn: () => unknown): string {
  try {
    fn();
    return 'none';
  } catch (e) {
    return (e as Error).name;
  }
}
let failures = 0;
function eq(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    failures++;
    console.log(`FAIL ${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

const pr = (locale: string, options?: Intl.PluralRulesOptions) => new Intl.PluralRules(locale, options);
const selects = (locale: string, values: number[], options?: Intl.PluralRulesOptions) => values.map((v) => pr(locale, options).select(v)).join(' ');
const lf = (locale: string, options?: Intl.ListFormatOptions) => new Intl.ListFormat(locale, options);
const rtf = (locale: string, options?: Intl.RelativeTimeFormatOptions) => new Intl.RelativeTimeFormat(locale, options);

eq(selects('en', [0, 1, 2, 1.5]), 'other one other other', 'en cardinal');
eq(selects('en', [1, 2, 3, 4, 11, 12, 13, 21, 22, 101], { type: 'ordinal' }), 'one two few other other other other one two one', 'en ordinal');
eq(selects('ru', [1, 2, 5, 11, 21, 22, 25, 1.5]), 'one few many many one few many other', 'ru cardinal');
eq(selects('ar', [0, 1, 2, 3, 11, 100]), 'zero one two few many other', 'ar cardinal');
eq(selects('fr', [0, 1, 1.5, 2, 1000000]), 'one one one other many', 'fr cardinal');
eq(selects('pl', [1, 2, 5, 12, 22]), 'one few many many few', 'pl cardinal');
eq(selects('ja', [1, 2]), 'other other', 'ja cardinal');
eq(pr('en', { minimumFractionDigits: 1 }).select(1), 'other', 'fraction digits');
eq(JSON.stringify(pr('en').resolvedOptions().pluralCategories), '["one","other"]', 'pluralCategories en');
eq(JSON.stringify(pr('ru').resolvedOptions().pluralCategories), '["one","few","many","other"]', 'pluralCategories ru');
eq(JSON.stringify(pr('en', { type: 'ordinal' }).resolvedOptions().pluralCategories), '["one","two","few","other"]', 'pluralCategories en ordinal');
eq(pr('en').selectRange(1, 2), 'other', 'selectRange');
eq(lf('en').format(['a', 'b', 'c']), 'a, b, and c', 'list en');
eq(lf('en').format(['a', 'b']), 'a and b', 'list en pair');
eq(lf('en').format(['a']), 'a', 'list en one');
eq(lf('en').format([]), '', 'list en empty');
eq(lf('en', { style: 'short' }).format(['a', 'b', 'c']), 'a, b, & c', 'list en short');
eq(lf('en', { style: 'narrow' }).format(['a', 'b', 'c']), 'a, b, c', 'list en narrow');
eq(lf('en', { type: 'disjunction' }).format(['a', 'b', 'c']), 'a, b, or c', 'list en disjunction');
eq(lf('en', { type: 'unit' }).format(['5 lb', '3 oz']), '5 lb, 3 oz', 'list en unit');
eq(lf('de').format(['Äpfel', 'Birnen', 'Kirschen']), 'Äpfel, Birnen und Kirschen', 'list de');
eq(lf('fr').format(['pommes', 'poires', 'cerises']), 'pommes, poires et cerises', 'list fr');
eq(lf('es').format(['español', 'inglés']), 'español e inglés', 'list es y → e');
eq(lf('es').format(['a', 'b', 'inglés']), 'a, b e inglés', 'list es three');
eq(lf('es', { type: 'disjunction' }).format(['siete', 'ocho']), 'siete u ocho', 'list es o → u');
eq(lf('ja').format(['りんご', 'みかん', 'ぶどう']), 'りんご、みかん、ぶどう', 'list ja');
eq(lf('zh').format(['苹果', '橘子', '葡萄']), '苹果、橘子和葡萄', 'list zh');
eq(JSON.stringify(lf('en').formatToParts(['x', 'y'])), '[{"type":"element","value":"x"},{"type":"literal","value":" and "},{"type":"element","value":"y"}]', 'list formatToParts');
eq(rtf('en').format(-1, 'day'), '1 day ago', 'relative past');
eq(rtf('en').format(3, 'hours'), 'in 3 hours', 'relative future');
eq(rtf('en').format(2, 'quarter'), 'in 2 quarters', 'relative quarter');
eq(rtf('en', { numeric: 'auto' }).format(-1, 'day'), 'yesterday', 'relative auto yesterday');
eq(rtf('en', { numeric: 'auto' }).format(0, 'second'), 'now', 'relative auto now');
eq(rtf('en', { numeric: 'auto' }).format(1, 'year'), 'next year', 'relative auto next year');
eq(rtf('en', { numeric: 'auto' }).format(3, 'day'), 'in 3 days', 'relative auto 3 days');
eq(rtf('en', { style: 'short' }).format(-5, 'minute'), '5 min. ago', 'relative short');
eq(rtf('en', { style: 'narrow' }).format(2, 'week'), 'in 2w', 'relative narrow');
eq(rtf('en').format(1.5, 'hour'), 'in 1.5 hours', 'relative fraction');
eq(rtf('en').format(-1234, 'year'), '1,234 years ago', 'relative big');
eq(rtf('de').format(-2, 'day') + ' / ' + rtf('de', { numeric: 'auto' }).format(-1, 'day'), 'vor 2 Tagen / gestern', 'relative de');
eq(rtf('fr').format(5, 'month'), 'dans 5 mois', 'relative fr');
eq(rtf('es', { numeric: 'auto' }).format(1, 'day'), 'mañana', 'relative es');
eq(rtf('ja').format(-3, 'week'), '3 週間前', 'relative ja');
eq(rtf('ru').format(5, 'minute') + ' / ' + rtf('ru').format(2, 'minute'), 'через 5 минут / через 2 минуты', 'relative ru plural');
eq(JSON.stringify(rtf('en').formatToParts(100, 'day')), '[{"type":"literal","value":"in "},{"type":"integer","value":"100","unit":"day"},{"type":"literal","value":" days"}]', 'relative formatToParts');
eq(JSON.stringify(rtf('en').resolvedOptions()), '{"locale":"en","style":"long","numeric":"always","numberingSystem":"latn"}', 'relative resolvedOptions');
eq(errName(() => rtf('en').format(1, 'fortnight' as any)), 'RangeError', 'an invalid unit');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-plural-list-relative ok');
