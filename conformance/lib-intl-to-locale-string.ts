// Number / BigInt / Date / Array toLocale*String and String toLocale*Case through Intl
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

const d = new Date(Date.UTC(2024, 2, 5, 14, 7, 9));
const utc = { timeZone: 'UTC' };

eq((1234567.891).toLocaleString('de-DE'), '1.234.567,891', 'number de-DE');
eq((1234567.891).toLocaleString('fr-FR'), '1\u202f234\u202f567,891', 'number fr-FR');
eq((1234567.891).toLocaleString('en-IN'), '12,34,567.891', 'number en-IN');
eq((0.256).toLocaleString('en-US', { style: 'percent', minimumFractionDigits: 1 }), '25.6%', 'number with options');
eq((1234).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' }), '￥1,234', 'number currency ja');
eq((1234.5).toLocaleString(['xx', 'de-DE']), '1.234,5', 'number locales array');
eq((123456789n).toLocaleString('de-DE'), '123.456.789', 'bigint');
eq(d.toLocaleString('en-US', utc), '3/5/2024, 2:07:09 PM', 'date toLocaleString');
eq(d.toLocaleString('de-DE', utc), '5.3.2024, 14:07:09', 'date toLocaleString de');
eq(d.toLocaleDateString('en-GB', utc), '05/03/2024', 'date toLocaleDateString');
eq(d.toLocaleTimeString('en-US', utc), '2:07:09 PM', 'date toLocaleTimeString');
eq(d.toLocaleTimeString('ja-JP', utc), '14:07:09', 'date toLocaleTimeString ja');
eq(d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' }), 'March 5', 'date with fields');
eq(d.toLocaleString('fr-FR', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }), '5 mars 2024 à 14:07', 'date with styles');
eq(d.toLocaleTimeString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }), '2:07:09 PM UTC', 'date time with zone');
eq(new Date(NaN).toLocaleString('en-US'), 'Invalid Date', 'invalid date');
eq(errName(() => d.toLocaleDateString('en-US', { timeStyle: 'short' })), 'TypeError', 'date time style on a date method');
eq([1234.5, 6789].toLocaleString('de-DE'), '1.234,5,6.789', 'array of numbers');
eq([0.5, 0.25].toLocaleString('en-US', { style: 'percent' }), '50%,25%', 'array with options');
eq('istanbul'.toLocaleUpperCase('tr'), 'İSTANBUL', 'upper tr');
eq('DİYARBAKIR'.toLocaleLowerCase('tr'), 'diyarbakır', 'lower tr');
eq('i̇x'.toLocaleUpperCase('lt'), 'IX', 'upper lt');
eq('istanbul'.toLocaleUpperCase('en-US'), 'ISTANBUL', 'upper en');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-to-locale-string ok');
