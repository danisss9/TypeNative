// Intl.Collator (golang.org/x/text/collate) and localeCompare with a locale
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

const sortWith = (words: string[], locale: string, options?: Intl.CollatorOptions) => [...words].sort(new Intl.Collator(locale, options).compare).join(' ');
const sign = (n: number) => String(Math.sign(n));

eq(sortWith(['z', 'ä', 'a', 'Z', 'b'], 'de'), 'a ä b z Z', 'de sort');
eq(sortWith(['z', 'ä', 'a', 'å', 'ö', 'o'], 'sv'), 'a o z å ä ö', 'sv sort');
eq(sortWith(['o', 'ñ', 'n'], 'es'), 'n ñ o', 'es ñ');
eq(sortWith(['item10', 'item2', 'item1'], 'en', { numeric: true }), 'item1 item2 item10', 'numeric');
eq(sortWith(['item10', 'item2', 'item1'], 'en'), 'item1 item10 item2', 'not numeric');
eq(sortWith(['b', 'B', 'a', 'A'], 'en'), 'a A b B', 'case order');
eq(sortWith(['cote', 'côté', 'coté', 'côte'], 'en'), 'cote coté côte côté', 'accents order');
eq(sign(new Intl.Collator('en', { sensitivity: 'base' }).compare('a', 'A')), '0', 'base ignores case');
eq(sign(new Intl.Collator('en', { sensitivity: 'base' }).compare('a', 'á')), '0', 'base ignores accents');
eq(sign(new Intl.Collator('en', { sensitivity: 'accent' }).compare('a', 'á')), '-1', 'accent keeps accents');
eq(sign(new Intl.Collator('en', { sensitivity: 'accent' }).compare('a', 'A')), '0', 'accent ignores case');
eq(sign(new Intl.Collator('en').compare('a', 'A')), '-1', 'variant');
eq(sign('a'.localeCompare('b', 'en')), '-1', 'localeCompare with a locale');
eq(sign('résumé'.localeCompare('resume', 'en', { sensitivity: 'base' })), '0', 'localeCompare base');
eq(sign('ä'.localeCompare('z', 'de')), '-1', 'localeCompare de');
eq(sign('ä'.localeCompare('z', 'sv')), '1', 'localeCompare sv');
eq(JSON.stringify(new Intl.Collator('de').resolvedOptions()), '{"locale":"de","usage":"sort","sensitivity":"variant","ignorePunctuation":false,"collation":"default","numeric":false,"caseFirst":"false"}', 'resolvedOptions');
eq(JSON.stringify(new Intl.Collator('en', { sensitivity: 'base', numeric: true }).resolvedOptions()), '{"locale":"en","usage":"sort","sensitivity":"base","ignorePunctuation":false,"collation":"default","numeric":true,"caseFirst":"false"}', 'resolvedOptions options');
eq(errName(() => new Intl.Collator('en', { sensitivity: 'loud' as any })), 'RangeError', 'an invalid sensitivity');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-collator ok');
