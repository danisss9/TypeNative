// Intl.DateTimeFormat: locales, styles, option bags, time zones, parts, ranges
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

const d = new Date(Date.UTC(2024, 2, 5, 14, 7, 9, 45));
const later = new Date(Date.UTC(2024, 2, 5, 16, 30, 0));
const nextWeek = new Date(Date.UTC(2024, 2, 12, 9, 0, 0));
const dtf = (locale: string, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });

eq(dtf('en-US').format(d), '3/5/2024', 'en-US default');
eq(dtf('en-GB').format(d), '05/03/2024', 'en-GB default');
eq(dtf('de-DE').format(d), '5.3.2024', 'de-DE default');
eq(dtf('ja-JP').format(d), '2024/3/5', 'ja-JP default');
eq(dtf('zh-CN').format(d), '2024/3/5', 'zh-CN default');
eq(dtf('ko-KR').format(d), '2024. 3. 5.', 'ko-KR default');
eq(dtf('en-US', { dateStyle: 'full' }).format(d), 'Tuesday, March 5, 2024', 'en-US dateStyle full');
eq(dtf('en-US', { dateStyle: 'long' }).format(d), 'March 5, 2024', 'en-US dateStyle long');
eq(dtf('en-US', { dateStyle: 'medium' }).format(d), 'Mar 5, 2024', 'en-US dateStyle medium');
eq(dtf('en-US', { dateStyle: 'short' }).format(d), '3/5/24', 'en-US dateStyle short');
eq(dtf('de-DE', { dateStyle: 'full' }).format(d), 'Dienstag, 5. März 2024', 'de-DE dateStyle full');
eq(dtf('fr-FR', { dateStyle: 'full' }).format(d), 'mardi 5 mars 2024', 'fr-FR dateStyle full');
eq(dtf('es-ES', { dateStyle: 'long' }).format(d), '5 de marzo de 2024', 'es-ES dateStyle long');
eq(dtf('ru-RU', { dateStyle: 'long' }).format(d), '5 марта 2024 г.', 'ru-RU dateStyle long');
eq(dtf('ja-JP', { dateStyle: 'full' }).format(d), '2024年3月5日火曜日', 'ja-JP dateStyle full');
eq(dtf('en-US', { timeStyle: 'short' }).format(d), '2:07 PM', 'en-US timeStyle short');
eq(dtf('de-DE', { timeStyle: 'medium' }).format(d), '14:07:09', 'de-DE timeStyle medium');
eq(dtf('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d), 'Mar 5, 2024, 2:07 PM', 'en-US both styles');
eq(dtf('en-US', { dateStyle: 'full', timeStyle: 'long' }).format(d), 'Tuesday, March 5, 2024 at 2:07:09 PM UTC', 'en-US full with long time');
eq(dtf('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d), 'Tuesday, March 5, 2024', 'en-US long date fields');
eq(dtf('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d), 'Dienstag, 5. März 2024', 'de-DE long date fields');
eq(dtf('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }).format(d), '5 mars 2024', 'fr-FR short month');
eq(dtf('ru-RU', { month: 'long' }).format(d), 'март', 'ru-RU standalone month');
eq(dtf('ru-RU', { day: 'numeric', month: 'long' }).format(d), '5 марта', 'ru-RU format month');
eq(dtf('en-US', { year: 'numeric', month: 'long' }).format(d), 'March 2024', 'month and year');
eq(dtf('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(d), '03/05/24', '2-digit date');
eq(dtf('en-US', { hour: '2-digit', minute: '2-digit' }).format(d), '02:07 PM', 'en-US hour minute');
eq(dtf('en-GB', { hour: 'numeric', minute: 'numeric' }).format(d), '14:07', 'en-GB hour minute');
eq(dtf('en-US', { hour: 'numeric', minute: 'numeric', hour12: false }).format(d), '14:07', 'hour12 false');
eq(dtf('de-DE', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).format(d), '14:07', 'hourCycle h23 in de');
eq(dtf('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3 }).format(d), '2:07:09.045 PM', 'seconds and fraction');
eq(dtf('en-US', { timeZone: 'Asia/Tokyo', hour: 'numeric', minute: 'numeric' }).format(d), '11:07 PM', 'time zone Tokyo');
eq(dtf('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }).format(d), '3/5/2024, EST', 'time zone name short');
eq(dtf('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', timeZoneName: 'shortOffset' }).format(d), '7:37 PM GMT+5:30', 'time zone shortOffset');
eq(dtf('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(new Date(Date.UTC(2024, 6, 1))), '6/30/2024, PDT', 'time zone summer name');
eq(dtf('en-US', { timeZone: '+05:30', hour: 'numeric', minute: 'numeric' }).format(d), '7:37 PM', 'offset time zone');
eq(JSON.stringify(dtf('en-US').formatToParts(d)), '[{"type":"month","value":"3"},{"type":"literal","value":"/"},{"type":"day","value":"5"},{"type":"literal","value":"/"},{"type":"year","value":"2024"}]', 'formatToParts');
eq(JSON.stringify(dtf('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).formatToParts(d)), '[{"type":"day","value":"05"},{"type":"literal","value":"."},{"type":"month","value":"03"},{"type":"literal","value":"."},{"type":"year","value":"2024"},{"type":"literal","value":", "},{"type":"hour","value":"14"},{"type":"literal","value":":"},{"type":"minute","value":"07"}]', 'formatToParts styles');
eq(dtf('en-US', { hour: 'numeric', minute: 'numeric' }).formatRange(d, later), '2:07\u2009–\u20094:30 PM', 'formatRange same day');
eq(dtf('en-US', { dateStyle: 'medium' }).formatRange(d, nextWeek), 'Mar 5\u2009–\u200912, 2024', 'formatRange days');
eq(dtf('en-US', { dateStyle: 'medium' }).formatRange(d, d), 'Mar 5, 2024', 'formatRange equal');
eq(dtf('en-US').format(0), '1/1/1970', 'format from a number');
eq([d, later].map(dtf('en-US', { hour: 'numeric' }).format).join(' / '), '2 PM / 4 PM', 'format as a value');
eq(JSON.stringify(dtf('en-US').resolvedOptions()), '{"locale":"en-US","calendar":"gregory","numberingSystem":"latn","timeZone":"UTC","year":"numeric","month":"numeric","day":"numeric"}', 'resolvedOptions');
eq(JSON.stringify(dtf('en-GB', { dateStyle: 'full', timeStyle: 'short' }).resolvedOptions()), '{"locale":"en-GB","calendar":"gregory","numberingSystem":"latn","timeZone":"UTC","hourCycle":"h23","hour12":false,"dateStyle":"full","timeStyle":"short"}', 'resolvedOptions styles');
eq(JSON.stringify(dtf('en-US', { weekday: 'short', hour: 'numeric' }).resolvedOptions()), '{"locale":"en-US","calendar":"gregory","numberingSystem":"latn","timeZone":"UTC","hourCycle":"h12","hour12":true,"weekday":"short","hour":"numeric"}', 'resolvedOptions fields');
eq(errName(() => dtf('en-US', { dateStyle: 'full', month: 'long' })), 'TypeError', 'styles exclude fields');
eq(errName(() => new Intl.DateTimeFormat('en-US', { timeZone: 'Mars/Olympus' })), 'RangeError', 'an invalid time zone');
eq(errName(() => dtf('en-US', { dateStyle: 'huge' as any })), 'RangeError', 'an invalid dateStyle');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-date-time-format ok');
