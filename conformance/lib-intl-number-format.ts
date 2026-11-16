// Intl.NumberFormat: locales, styles, notations, rounding, parts, ranges
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

const nf = (locale: string, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options);

eq(nf('en-US').format(1234567.891), '1,234,567.891', 'en-US decimal');
eq(nf('de-DE').format(1234567.891), '1.234.567,891', 'de-DE decimal');
eq(nf('fr-FR').format(1234567.891), '1\u202f234\u202f567,891', 'fr-FR decimal');
eq(nf('en-IN').format(1234567.891), '12,34,567.891', 'en-IN grouping');
eq(nf('hi-IN').format(1234567.891), '12,34,567.891', 'hi-IN grouping');
eq(nf('es').format(1234) + ' ' + nf('es').format(12345), '1234 12.345', 'es minimum grouping');
eq(nf('pt-BR').format(-0.5), '-0,5', 'pt-BR decimal');
eq(nf('en-AU').format(1234.5) + ' ' + nf('en-AU').resolvedOptions().locale, '1,234.5 en-AU', 'region fallback en-AU');
eq(nf('en-US', { maximumFractionDigits: 2 }).format(1.005), '1.01', '1.005 rounds up');
eq(nf('en-US', { maximumFractionDigits: 20 }).format(0.1), '0.1', '0.1 shortest digits');
eq(nf('en-US').format(1e21), '1,000,000,000,000,000,000,000', 'big values');
eq(nf('en-US', { maximumFractionDigits: 10 }).format(0.0000001), '0.0000001', 'tiny values');
eq(nf('en-US', { minimumFractionDigits: 2 }).format(5), '5.00', 'minimumFractionDigits');
eq(nf('en-US', { minimumIntegerDigits: 3 }).format(7), '007', 'minimumIntegerDigits');
eq(nf('en-US', { maximumSignificantDigits: 3 }).format(123456.789), '123,000', 'maximumSignificantDigits');
eq(nf('en-US', { minimumSignificantDigits: 5 }).format(1.5), '1.5000', 'minimumSignificantDigits');
eq(nf('en-US', { maximumFractionDigits: 1, roundingMode: 'floor' }).format(1.29), '1.2', 'roundingMode floor');
eq(nf('en-US', { maximumFractionDigits: 0, roundingMode: 'halfEven' }).format(2.5), '2', 'roundingMode halfEven');
eq(nf('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2, roundingIncrement: 5 }).format(1.234), '1.25', 'roundingIncrement');
eq(nf('en-US', { minimumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger' }).format(5), '5', 'trailingZeroDisplay');
eq(nf('en-US', { useGrouping: false }).format(1234567), '1234567', 'useGrouping false');
eq(nf('en-US', { signDisplay: 'always' }).format(5), '+5', 'signDisplay always');
eq(nf('en-US', { signDisplay: 'exceptZero' }).format(0) + ' ' + nf('en-US', { signDisplay: 'exceptZero' }).format(-2), '0 -2', 'signDisplay exceptZero');
eq(nf('en-US', { signDisplay: 'never' }).format(-3), '3', 'signDisplay never');
eq(nf('en-US').format(NaN) + ' ' + nf('en-US').format(-Infinity), 'NaN -∞', 'NaN and Infinity');
eq(nf('en-US', { style: 'percent' }).format(0.256), '26%', 'percent en-US');
eq(nf('de-DE', { style: 'percent' }).format(0.256), '26\u00a0%', 'percent de-DE');
eq(nf('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(0.1234), '12,3\u00a0%', 'percent fr-FR');
eq(nf('en-US', { style: 'currency', currency: 'USD' }).format(-1234.5), '-$1,234.50', 'currency USD');
eq(nf('de-DE', { style: 'currency', currency: 'EUR' }).format(1234567.891), '1.234.567,89\u00a0€', 'currency EUR de-DE');
eq(nf('nl-NL', { style: 'currency', currency: 'EUR' }).format(-1234.5), '€\u00a0-1.234,50', 'currency EUR nl-NL negative');
eq(nf('ja-JP', { style: 'currency', currency: 'JPY' }).format(1234.5), '￥1,235', 'currency JPY ja-JP');
eq(nf('en-US', { style: 'currency', currency: 'KWD' }).format(1.5), 'KWD\u00a01.500', 'currency KWD digits');
eq(nf('en-US', { style: 'currency', currency: 'EUR', currencyDisplay: 'code' }).format(12), 'EUR\u00a012.00', 'currency code');
eq(nf('en-US', { style: 'currency', currency: 'EUR', currencyDisplay: 'name' }).format(12), '12.00 euros', 'currency name');
eq(nf('en-US', { style: 'currency', currency: 'EUR', currencyDisplay: 'name', maximumFractionDigits: 0 }).format(1), '1 euro', 'currency name one');
eq(nf('en-CA', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' }).format(3), '$3.00', 'currency narrowSymbol');
eq(nf('fr-FR', { style: 'currency', currency: 'USD' }).format(1234.5), '1\u202f234,50\u00a0$US', 'currency fr-FR USD');
eq(nf('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 3 }).format(1.23456), '$1.235', 'currency maximumFractionDigits');
eq(nf('en-US', { style: 'unit', unit: 'kilometer-per-hour' }).format(50), '50 km/h', 'unit short');
eq(nf('en-US', { style: 'unit', unit: 'liter', unitDisplay: 'long' }).format(1) + ' / ' + nf('en-US', { style: 'unit', unit: 'liter', unitDisplay: 'long' }).format(2), '1 liter / 2 liters', 'unit long');
eq(nf('en-US', { style: 'unit', unit: 'celsius', unitDisplay: 'narrow' }).format(21), '21°C', 'unit narrow');
eq(nf('de-DE', { style: 'unit', unit: 'kilobyte', unitDisplay: 'long' }).format(2.5), '2,5 Kilobyte', 'unit de-DE');
eq(nf('en-US', { notation: 'compact' }).format(999), '999', 'compact 999');
eq(nf('en-US', { notation: 'compact' }).format(1234), '1.2K', 'compact thousands');
eq(nf('en-US', { notation: 'compact' }).format(1234567), '1.2M', 'compact millions');
eq(nf('en-US', { notation: 'compact' }).format(12345678), '12M', 'compact tens of millions');
eq(nf('en-US', { notation: 'compact', compactDisplay: 'long' }).format(1500), '1.5 thousand', 'compact long');
eq(nf('de-DE', { notation: 'compact' }).format(1234) + ' ' + nf('de-DE', { notation: 'compact' }).format(1234567), '1234 1,2\u00a0Mio.', 'compact de-DE');
eq(nf('ja-JP', { notation: 'compact' }).format(12345678), '1235万', 'compact ja-JP');
eq(nf('en-US', { notation: 'compact' }).format(-4321), '-4.3K', 'compact negative');
eq(nf('en-US', { notation: 'scientific' }).format(123456), '1.235E5', 'scientific');
eq(nf('en-US', { notation: 'engineering' }).format(123456), '123.456E3', 'engineering');
eq(nf('en-US', { notation: 'scientific' }).format(0.00012), '1.2E-4', 'scientific small');
eq(nf('en-US').format(12345678901234567890n), '12,345,678,901,234,567,890', 'bigint');
eq(nf('en-US').format('1234.5' as any), '1,234.5', 'numeric string');
eq(JSON.stringify(nf('de-DE', { style: 'currency', currency: 'EUR' }).formatToParts(-1234.5)), '[{"type":"minusSign","value":"-"},{"type":"integer","value":"1"},{"type":"group","value":"."},{"type":"integer","value":"234"},{"type":"decimal","value":","},{"type":"fraction","value":"50"},{"type":"literal","value":"\u00a0"},{"type":"currency","value":"€"}]', 'formatToParts de-DE currency');
eq(JSON.stringify(nf('en-US', { notation: 'compact' }).formatToParts(1234567)), '[{"type":"integer","value":"1"},{"type":"decimal","value":"."},{"type":"fraction","value":"2"},{"type":"compact","value":"M"}]', 'formatToParts compact');
eq(nf('en-US').formatRange(3, 5), '3–5', 'formatRange');
eq(nf('en-US', { style: 'currency', currency: 'USD' }).formatRange(3, 5), '$3.00 – $5.00', 'formatRange currency');
eq([1, 22, 333].map(nf('en-US', { minimumFractionDigits: 1 }).format).join(' '), '1.0 22.0 333.0', 'format as a value');
eq(JSON.stringify(nf('en-US').resolvedOptions()), '{"locale":"en-US","numberingSystem":"latn","style":"decimal","minimumIntegerDigits":1,"minimumFractionDigits":0,"maximumFractionDigits":3,"useGrouping":"auto","notation":"standard","signDisplay":"auto","roundingIncrement":1,"roundingMode":"halfExpand","roundingPriority":"auto","trailingZeroDisplay":"auto"}', 'resolvedOptions');
eq(JSON.stringify(nf('de-DE', { style: 'currency', currency: 'EUR' }).resolvedOptions()), '{"locale":"de-DE","numberingSystem":"latn","style":"currency","currency":"EUR","currencyDisplay":"symbol","currencySign":"standard","minimumIntegerDigits":1,"minimumFractionDigits":2,"maximumFractionDigits":2,"useGrouping":"auto","notation":"standard","signDisplay":"auto","roundingIncrement":1,"roundingMode":"halfExpand","roundingPriority":"auto","trailingZeroDisplay":"auto"}', 'resolvedOptions currency');
eq(JSON.stringify(Intl.NumberFormat.supportedLocalesOf(['de-AT', 'en-US'])), '["de-AT","en-US"]', 'supportedLocalesOf');
eq(errName(() => nf('en-US', { style: 'currency' })), 'TypeError', 'currency style needs a currency');
eq(errName(() => nf('en-US', { style: 'currency', currency: 'US' })), 'RangeError', 'an invalid currency code');
eq(errName(() => nf('en-US', { maximumFractionDigits: 101 })), 'RangeError', 'digits out of range');
eq(errName(() => nf('not_a_locale')), 'RangeError', 'an invalid locale tag');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-number-format ok');
