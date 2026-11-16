// Intl.DisplayNames, Intl.Locale, getCanonicalLocales and supportedValuesOf
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

const dn = (locale: string, type: Intl.DisplayNamesOptions['type'], code: string, fallback: 'code' | 'none' = 'code', languageDisplay: 'dialect' | 'standard' = 'dialect') =>
  String(new Intl.DisplayNames(locale, { type, fallback, languageDisplay }).of(code));

eq(dn('en', 'region', 'BR') + ' / ' + dn('en', 'region', 'US'), 'Brazil / United States', 'region en');
eq(dn('de', 'region', 'US'), 'Vereinigte Staaten', 'region de');
eq(dn('ja', 'region', 'FR'), 'フランス', 'region ja');
eq(dn('en', 'language', 'fr') + ' / ' + dn('en', 'language', 'en-US'), 'French / American English', 'language en');
eq(dn('en', 'language', 'en-US', 'code', 'standard'), 'English (United States)', 'language standard');
eq(dn('es', 'language', 'de'), 'alemán', 'language es');
eq(dn('en', 'script', 'Latn'), 'Latin', 'script');
eq(dn('en', 'currency', 'EUR'), 'Euro', 'currency en');
eq(dn('de', 'currency', 'JPY'), 'Japanischer Yen', 'currency de');
eq(dn('en', 'region', 'QM'), 'QM', 'unknown region with fallback code');
eq(dn('en', 'region', 'QM', 'none'), 'undefined', 'unknown region without fallback');
eq(dn('en', 'dateTimeField', 'month') + ' / ' + dn('fr', 'dateTimeField', 'day'), 'month / jour', 'dateTimeField');
eq(JSON.stringify(new Intl.DisplayNames('en', { type: 'region' }).resolvedOptions()), '{"locale":"en","style":"long","type":"region","fallback":"code"}', 'resolvedOptions');
eq([new Intl.Locale('zh-Hant-TW').language, new Intl.Locale('zh-Hant-TW').script, new Intl.Locale('zh-Hant-TW').region, new Intl.Locale('zh-Hant-TW').baseName].join(' '), 'zh Hant TW zh-Hant-TW', 'Locale parts');
eq(new Intl.Locale('en-us').toString(), 'en-US', 'Locale toString');
eq(new Intl.Locale('en', { region: 'GB', hourCycle: 'h23' }).toString(), 'en-GB-u-hc-h23', 'Locale options');
eq([new Intl.Locale('de-u-co-phonebk-hc-h12').hourCycle, new Intl.Locale('de-u-co-phonebk-hc-h12').collation].join(' '), 'h12 phonebk', 'Locale extensions');
eq(new Intl.Locale('en').maximize().toString() + ' ' + new Intl.Locale('zh-TW').maximize().toString(), 'en-Latn-US zh-Hant-TW', 'Locale maximize');
eq(new Intl.Locale('en-Latn-US').minimize().toString(), 'en', 'Locale minimize');
eq(String(new Intl.Locale('en-u-kn').numeric), 'true', 'Locale numeric');
eq(JSON.stringify(Intl.getCanonicalLocales(['EN-us', 'zh-hant-tw', 'en-US'])), '["en-US","zh-Hant-TW"]', 'getCanonicalLocales');
eq(String(Intl.supportedValuesOf('calendar').includes('gregory')), 'true', 'supportedValuesOf calendar');
eq(String(Intl.supportedValuesOf('currency').includes('EUR')), 'true', 'supportedValuesOf currency');
eq(String(Intl.supportedValuesOf('unit').includes('kilometer-per-hour')), 'false', 'supportedValuesOf unit');
eq(errName(() => new Intl.Locale('a_b')), 'RangeError', 'an invalid tag');
eq(errName(() => Intl.getCanonicalLocales('en-')), 'RangeError', 'an invalid canonical tag');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-display-names-locale ok');
