// Generates src/node/intl_data.ts: the locale data TypeNative's Intl runs on,
// captured from Node's own ICU by asking Intl for it (run under Node 26 with
// full ICU; re-run when Node's ICU changes, like gen:go — `npm run gen:intl`).
//
// The output is Go source — map literals the runtime helpers (src/node/intl.ts)
// read — split into the chunks a program links by the Intl services it uses:
// intlCore (locale tables), intlNumber (number symbols, currency, compact and
// unit patterns, range patterns), intlDate (date/time patterns and names,
// time-zone names), intlListRel (list and relative-time patterns) and
// intlDisplay (display names). Collation, plural rules, language matching and
// locale case mapping come from the vendored golang.org/x/text, not from here.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The locales whose data is generated. Region variants missing here fall back
// by language (de-AT formats like de); unknown languages fall back like ICU's
// root locale does (pt-PT since CLDR 46 — as Node resolves them).
const LOCALES = [
  'en', 'en-US', 'en-GB', 'en-IN', 'de', 'fr', 'es', 'es-MX', 'it', 'pt-BR', 'pt-PT', 'nl',
  'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'ru', 'uk', 'tr', 'el', 'ja', 'zh', 'zh-Hant', 'ko',
  'ar', 'he', 'hi', 'id', 'th', 'vi'
];
const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'CAD', 'AUD', 'CHF', 'KRW', 'RUB', 'MXN', 'BRL',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'TRY', 'ILS', 'AED', 'SAR', 'SGD', 'HKD', 'NZD', 'THB',
  'IDR', 'VND', 'PHP', 'MYR', 'ZAR', 'EGP', 'NGN', 'ARS', 'CLP', 'COP', 'PEN', 'TWD'
];
const UNITS = [
  'bit', 'byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte',
  'meter', 'kilometer', 'centimeter', 'gram', 'kilogram', 'liter',
  'second', 'minute', 'hour', 'day', 'week', 'month', 'year',
  'celsius', 'kilometer-per-hour', 'mile-per-hour',
  'millisecond', 'microsecond', 'nanosecond', 'percent', 'degree', 'fahrenheit',
  'millimeter', 'inch', 'foot', 'yard', 'mile', 'pound', 'ounce', 'stone',
  'milliliter', 'gallon', 'fluid-ounce', 'acre', 'hectare', 'meter-per-second',
  'kilobit', 'megabit', 'gigabit'
];
const ZONES = [
  'UTC', 'GMT', 'Etc/UTC', 'Etc/GMT', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'America/Toronto',
  'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Bogota',
  'America/Lima', 'America/Santiago', 'America/Caracas', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Athens', 'Europe/Moscow',
  'Europe/Istanbul', 'Europe/Warsaw', 'Europe/Stockholm', 'Europe/Amsterdam', 'Europe/Vienna',
  'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Lagos', 'Asia/Dubai', 'Asia/Jerusalem',
  'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
  'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo', 'Australia/Sydney', 'Australia/Melbourne',
  'Pacific/Auckland', 'Pacific/Honolulu'
];
// The common numbering systems' digits (-u-nu-arab & co.); latin is the default
const NUMBERING_SYSTEMS = [
  'latn', 'arab', 'arabext', 'beng', 'deva', 'gujr', 'guru', 'knda', 'mlym', 'orya', 'sinh',
  'tamldec', 'telu', 'thai', 'tibt', 'hanidec', 'hans', 'hansfin', 'hant', 'hantfin', 'jpan',
  'jpanfin', 'fullwide', 'mong', 'mymr', 'laoo', 'khmr', 'java', 'cham', 'kali', 'nkoo',
  'olck', 'osma', 'vaii'
];

// The probe instant: 2009-03-02T14:05:06.789Z — a Monday in March (month 3) on
// day 2, at 14:05:06, so every date field renders differently per width
// (month "3" vs "03", day "2" vs "02", "2" vs "14" separates the hour cycles)
const DATE_PROBE = new Date('2009-03-02T14:05:06.789Z');
// The same instant at 05:05:06: hour widths ("5" vs "05") the 14h probe can't
// separate (h23 renders "14" either way)
const DATE_PROBE_AM = new Date('2009-03-02T05:05:06.789Z');
const DATE_PROBE_MIDNIGHT = new Date('2009-03-02T00:05:06.789Z');
const BC_PROBE = new Date('-000044-03-02T14:05:06.789Z');

const WEEKDAY_DATES = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2009, 2, 1 + i))); // 2009-03-01 is a Sunday
const MINSEC_WIDTHS = { '5': 'n', '35': 'n', '6': 'n', '36': 'n', '05': '2', '06': '2' };

const dateFmt = (loc, opts) => new Intl.DateTimeFormat(loc, { timeZone: 'UTC', ...opts });
const numFmt = (loc, opts) => new Intl.NumberFormat(loc, opts);
const plural = (loc) => new Intl.PluralRules(loc);

// --- Go emission -----------------------------------------------------------

// A pattern part: kind, width, range source (dates: 0 shared / 's'tart / 'e'nd)
// and the literal text (literals, exponent separators, inline percent signs).
// Encoded as a 3-byte ASCII header ('-' for 0) + literal text inside a compact
// JSON string constant, decoded lazily at run time (see tnIntlPartsTable in
// intl.ts) so Go doesn't compile tens of thousands of map-literal init ops.
function encodeByte(c) {
  if (c === 0 || c === undefined || c === null) return '-';
  if (typeof c !== 'string' || c.length !== 1 || c === '-') {
    throw new Error(`Invalid part byte: ${JSON.stringify(c)}`);
  }
  return c;
}
function encodePart(kind, width, src, text) {
  return `${encodeByte(kind)}${encodeByte(width)}${encodeByte(src)}${text ?? ''}`;
}

const goComment = (comment) => comment.split('\n').map((l) => (l.startsWith('//') ? l : `// ${l}`)).join('\n') + '\n';

function goStringMap(name, rows, comment) {
  const obj = Object.create(null);
  for (const [loc, key, value] of rows) {
    if (!obj[loc]) obj[loc] = Object.create(null);
    obj[loc][key] = value;
  }
  return `${goComment(comment)}var ${name} = tnIntlStringTable{raw: ${JSON.stringify(JSON.stringify(obj))}}\n`;
}

// A flat map (one [key, value] per row)
function goFlatMap(name, rows, comment) {
  const entries = rows.map(([key, value]) => `\t${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  return `${goComment(comment)}var ${name} = map[string]string{\n${entries.join(',\n')},\n}\n`;
}

function goPartsMap(name, rows, comment) {
  // rows: [locale, key, [[kind,width,src,text]...]]
  const obj = Object.create(null);
  for (const [loc, key, plist] of rows) {
    if (!obj[loc]) obj[loc] = Object.create(null);
    obj[loc][key] = plist.map((p) => encodePart(...p));
  }
  return `${goComment(comment)}var ${name} = tnIntlPartsTable{raw: ${JSON.stringify(JSON.stringify(obj))}}\n`;
}

const goSlice = (name, values, comment) =>
  `${goComment(comment)}var ${name} = []string{\n${values.map((v) => `\t${JSON.stringify(v)}`).join(',\n')},\n}\n`;

// --- Number data -----------------------------------------------------------

// Part tokens of a number template, from a probe's formatToParts. The whole
// number becomes one N token (its digits are re-rendered at run time)
function numberTemplate(probeParts, currencyWidth) {
  const out = [];
  let i = 0;
  while (i < probeParts.length) {
    const p = probeParts[i];
    switch (p.type) {
      case 'integer': case 'decimal': case 'fraction': case 'group':
        while (i < probeParts.length && ['integer', 'decimal', 'fraction', 'group'].includes(probeParts[i].type)) i++;
        out.push(['N', 0, 0, '']);
        continue;
      case 'minusSign': out.push(['M', 0, 0, '']); break;
      case 'plusSign': out.push(['P', 0, 0, '']); break;
      // (the symbol itself: the template is per currency; '' for code and name
      // templates, whose value the run time supplies)
      case 'currency': out.push(['C', currencyWidth ?? 's', 0, currencyWidth === 'c' || currencyWidth === undefined ? '' : p.value]); break;
      case 'percentSign': out.push(['p', 0, 0, p.value]); break;
      case 'compact': out.push(['K', 0, 0, p.value]); break;
      case 'unit': out.push(['U', 0, 0, p.value]); break;
      case 'exponentSeparator': out.push(['E', 0, 0, p.value]); break;
      case 'exponentMinusSign': out.push(['X', 0, 0, '']); break;
      case 'exponentInteger':
        while (i + 1 < probeParts.length && probeParts[i + 1].type === 'exponentInteger') i++;
        out.push(['x', 0, 0, '']);
        break;
      default: out.push(['l', 0, 0, p.value]); break;
    }
    i++;
  }
  return out;
}

function rangeNumberTemplate(probeParts, currencyWidth) {
  const out = [];
  let i = 0;
  while (i < probeParts.length) {
    const p = probeParts[i];
    const src = p.source === 'startRange' ? 's' : p.source === 'endRange' ? 'e' : 0;
    switch (p.type) {
      case 'integer': case 'decimal': case 'fraction': case 'group':
        while (i < probeParts.length && ['integer', 'decimal', 'fraction', 'group'].includes(probeParts[i].type)) i++;
        out.push(['N', 0, src, '']);
        continue;
      case 'minusSign': out.push(['M', 0, src, '']); break;
      case 'plusSign': out.push(['P', 0, src, '']); break;
      case 'currency': out.push(['C', currencyWidth ?? 's', src, '']); break;
      case 'percentSign': out.push(['p', 0, src, p.value]); break;
      default: out.push(['l', 0, src, p.value]); break;
    }
    i++;
  }
  return out;
}

function collectNumberData(loc) {
  const names = [];
  const templates = [];
  const put = (key, value) => names.push([loc, key, value]);
  const tpl = (key, plist) => templates.push([loc, key, plist]);

  const standard = numFmt(loc, {});
  const decParts = standard.formatToParts(1234567.891);
  put('dec', decParts.find((p) => p.type === 'decimal')?.value ?? '.');
  put('grp', decParts.find((p) => p.type === 'group')?.value ?? ',');
  put('minus', standard.formatToParts(-5).find((p) => p.type === 'minusSign')?.value ?? '-');
  put('plus', numFmt(loc, { signDisplay: 'always' }).formatToParts(5).find((p) => p.type === 'plusSign')?.value ?? '+');
  put('pctSign', numFmt(loc, { style: 'percent' }).formatToParts(0.25).find((p) => p.type === 'percentSign')?.value ?? '%');

  // native digits of the locale's default numbering system ('' = latin)
  const digitsStr = digitsOf(numFmt(loc, { useGrouping: false }));
  put('digits', digitsStr === '0123456789' ? '' : digitsStr);
  put('inf', standard.format(Infinity));

  // grouping sizes, from the right ("3" uniform, "3;2" en-IN): a 15-digit
  // probe so every group is fully populated
  const grouped = standard.formatToParts(987654321098765);
  const sizes = [];
  let run = '';
  for (const p of grouped) {
    if (p.type === 'group') { sizes.unshift(run.length); run = ''; }
    else run += p.value;
  }
  sizes.unshift(run.length);
  const rest = sizes.slice(1);
  put('grpSizes', rest.length > 0 && rest.every((s) => s === rest[0]) ? `${sizes[0]};${rest[0]}` : sizes.join(';'));
  // minimum grouping digits (es, pl, pt-PT: "1234" but "12.345")
  put('minGrp', standard.formatToParts(1234).some((p) => p.type === 'group') ? '1' : '2');

  // scientific notation's exponent separator
  const sci = numFmt(loc, { notation: 'scientific' });
  put('exSep', sci.formatToParts(12345).find((p) => p.type === 'exponentSeparator')?.value ?? 'E');

  // decimal / percent / scientific templates (positive and negative; the
  // scientific ones probed at a negative exponent so the pattern carries the
  // exponent's minus sign)
  tpl('decP', numberTemplate(standard.formatToParts(1234567.891)));
  tpl('decN', numberTemplate(standard.formatToParts(-1234567.891)));
  const pct = numFmt(loc, { style: 'percent' });
  tpl('pctP', numberTemplate(pct.formatToParts(0.25)));
  tpl('pctN', numberTemplate(pct.formatToParts(-0.25)));
  tpl('sciP', numberTemplate(sci.formatToParts(0.00012345)));
  tpl('sciN', numberTemplate(sci.formatToParts(-0.00012345)));

  // currency templates (symbol and narrow symbol placements), per currency
  for (const code of CURRENCIES) {
    const f = numFmt(loc, { style: 'currency', currency: code });
    tpl(`cur:${code}:P`, numberTemplate(f.formatToParts(1234.56), 's'));
    tpl(`cur:${code}:N`, numberTemplate(f.formatToParts(-1234.56), 's'));
    const narrow = numFmt(loc, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' });
    tpl(`curNar:${code}:P`, numberTemplate(narrow.formatToParts(1234.56), 'r'));
    tpl(`curNar:${code}:N`, numberTemplate(narrow.formatToParts(-1234.56), 'r'));
  }
  // the ISO code placement (currencyDisplay: 'code', and currencies without
  // generated symbols): it doesn't vary by currency
  const codeFmt = numFmt(loc, { style: 'currency', currency: 'USD', currencyDisplay: 'code' });
  tpl('curCode:P', numberTemplate(codeFmt.formatToParts(1234.56), 'c'));
  tpl('curCode:N', numberTemplate(codeFmt.formatToParts(-1234.56), 'c'));

  // currency names per plural category (currencyDisplay: 'name') and the
  // name templates (they don't vary by currency). The probes render exactly
  // (no forced fraction digits), so each one's category is its value's
  const rules = plural(loc);
  for (const code of CURRENCIES) {
    const f = numFmt(loc, { style: 'currency', currency: code, currencyDisplay: 'name', minimumFractionDigits: 0, maximumFractionDigits: 1 });
    const seen = new Set();
    for (const v of [1, 2, 5, 11, 21, 101, 111, 0.5, 1.5, 1000000]) {
      const cat = rules.select(v);
      if (seen.has(cat)) continue;
      const namePart = f.formatToParts(v).find((p) => p.type === 'currency');
      if (namePart) { seen.add(cat); put(`curName:${code}:${cat}`, namePart.value); }
    }
  }
  const nameFmt = numFmt(loc, { style: 'currency', currency: 'USD', currencyDisplay: 'name' });
  tpl('curNmP', numberTemplate(nameFmt.formatToParts(1234.56)));
  tpl('curNmN', numberTemplate(nameFmt.formatToParts(-1234.56)));

  // compact notation: a template per power of ten and plural category, probed
  // with mantissas covering every category the locale has (CLDR's patterns
  // for 1e15 and beyond re-use the trillions' divisor: the run time formats
  // those with grouping, see intlNumber in src/node/intl.ts)
  // The divisor's exponent (cmpD) is read from 10^pow's mantissa ("10M" for
  // 1e7: 10^6); a power without a compact pattern (de 1000) has none. The
  // plural category is the displayed mantissa's, so the probes are scaled
  // by the divisor, not by 10^pow
  const mantissas = [1, 2, 3, 5, 11, 21, 101, 111, 1.5, 2.5];
  for (const display of ['short', 'long']) {
    const f = numFmt(loc, { notation: 'compact', compactDisplay: display });
    const exact = numFmt(loc, { notation: 'compact', compactDisplay: display, maximumFractionDigits: 3, useGrouping: false });
    const key = display === 'short' ? 'S' : 'L';
    for (let pow = 3; pow <= 14; pow++) {
      const head = exact.formatToParts(10 ** pow);
      if (!head.some((p) => p.type === 'compact')) continue;
      const intDigits = head.filter((p) => p.type === 'integer').map((p) => p.value).join('').length;
      const divisor = pow - (intDigits - 1);
      put(`cmpD:${key}:${pow}`, String(divisor));
      // the displayed mantissas of this power: 10^(pow - divisor) × m
      const lead = 10 ** (pow - divisor);
      const seen = new Set();
      for (const m of mantissas) {
        if (m * lead >= 10 ** (pow - divisor + 1)) continue;
        const shown = m * lead;
        const cat = rules.select(shown);
        if (seen.has(cat)) continue;
        const probed = f.formatToParts(shown * 10 ** divisor);
        const compact = probed.find((p) => p.type === 'compact');
        if (!compact) continue;
        seen.add(cat);
        tpl(`cmp:${key}:${pow}:${cat}`, numberTemplate(probed));
        put(`cmpV:${key}:${pow}:${cat}`, compact.value);
      }
    }
  }

  // unit patterns per style and plural category
  for (const unit of UNITS) {
    for (const style of ['short', 'long', 'narrow']) {
      const f = numFmt(loc, { style: 'unit', unit, unitDisplay: style });
      const seen = new Set();
      for (const v of [1, 2, 5, 11, 21, 101, 111, 0.5, 1.5, 1000000]) {
        const cat = rules.select(v);
        if (seen.has(cat)) continue;
        const probed = f.formatToParts(v);
        if (!probed.some((p) => p.type === 'unit')) continue;
        seen.add(cat);
        tpl(`u:${unit}:${style[0]}:${cat}`, numberTemplate(probed));
      }
    }
  }

  // number range patterns: the merged template when both numbers have the
  // same magnitude (shared currency symbols, one percent sign), and the plain
  // concatenation when they don't
  const plain = numFmt(loc, {});
  tpl('rngSame', rangeNumberTemplate(plain.formatRangeToParts(1.15, 4.75)));
  tpl('rngOther', rangeNumberTemplate(plain.formatRangeToParts(1.5, 4000.5)));
  const cur = numFmt(loc, { style: 'currency', currency: 'USD' });
  tpl('rngSameCur', rangeNumberTemplate(cur.formatRangeToParts(1.15, 4.75), 's'));
  tpl('rngOtherCur', rangeNumberTemplate(cur.formatRangeToParts(1.5, 4000.5), 's'));
  const pctR = numFmt(loc, { style: 'percent' });
  tpl('rngSamePct', rangeNumberTemplate(pctR.formatRangeToParts(0.15, 0.47)));
  tpl('rngOtherPct', rangeNumberTemplate(pctR.formatRangeToParts(0.15, 47)));

  return { names, templates };
}

// --- Date data -------------------------------------------------------------

// The date fields' tokens, detected from the probe values (or copied from the
// base pattern for range patterns, where the probe can't separate widths)
// The width of a numeric field from its probe value (native digits too):
// two digits for a one-digit value is 2-digit
const isDigits = (v) => /^\p{Nd}+$/u.test(v);
const numericWidth = (v, oneDigit) => ([...v].length === 2 && oneDigit ? '2' : 'n');

// The width of a month / weekday name: the locale's own names of the probe's
// March / Monday (format and standalone forms) — ambiguous names (de "März"
// is long and short) take the options' width, else the style's (full/long:
// long, medium/short: short)
const textWidthCache = new Map();
function textWidths(loc, field) {
  const key = loc + '|' + field;
  if (textWidthCache.has(key)) return textWidthCache.get(key);
  const byValue = new Map();
  for (const w of ['long', 'short', 'narrow']) {
    const shapes = field === 'month'
      ? [{ month: w }, { year: 'numeric', month: w, day: 'numeric' }, { month: w, day: 'numeric' }]
      : [{ weekday: w }, { weekday: w, year: 'numeric', month: 'long', day: 'numeric' }];
    for (const shape of shapes) {
      const v = dateFmt(loc, shape).formatToParts(DATE_PROBE).find((p) => p.type === field)?.value;
      if (v === undefined) continue;
      if (!byValue.has(v)) byValue.set(v, []);
      const list = byValue.get(v);
      if (!list.includes(w[0] === 'n' ? 'r' : w[0])) list.push(w[0] === 'n' ? 'r' : w[0]);
    }
  }
  textWidthCache.set(key, byValue);
  return byValue;
}
function textWidth(loc, field, value, opts) {
  if (!loc) return 'l'; // (range probes: the base pattern's width stands)
  const options = (textWidths(loc, field).get(value) ?? []);
  const asked = { long: 'l', short: 's', narrow: 'r' }[opts?.[field]];
  if (asked && options.includes(asked)) return asked;
  const style = opts?.dateStyle;
  const preferred = style === 'medium' || style === 'short' ? ['s', 'l', 'r'] : ['l', 's', 'r'];
  return preferred.find((w) => options.includes(w)) ?? 'l';
}

function datePartToken(p, zoneWidth, periodWidth, eraWidth, loc, opts) {
  switch (p.type) {
    case 'year': return ['y', isDigits(p.value) && [...p.value].length === 2 ? '2' : 'n'];
    case 'month':
      if (isDigits(p.value)) return ['M', numericWidth(p.value, true)];
      return ['M', textWidth(loc, 'month', p.value, opts)];
    case 'day': return ['d', numericWidth(p.value, true)];
    case 'weekday': return ['w', textWidth(loc, 'weekday', p.value, opts)];
    // (the probe's minute and second are 5 and 6: "05" is 2-digit; the range
    // probes' 35 and 36 can't tell, the base pattern's width stands)
    case 'minute': return ['m', MINSEC_WIDTHS[p.value] ?? numericWidth(p.value, true)];
    case 'second': return ['s', MINSEC_WIDTHS[p.value] ?? 'n'];
    case 'dayPeriod': return ['p', periodWidth];
    case 'era': return ['e', eraWidth];
    case 'timeZoneName': return ['z', zoneWidth];
    case 'fractionalSecond': return ['f', String(p.value.length)];
    default: return null;
  }
}

function collectDateData(loc) {
  const names = [];
  const patterns = [];
  const put = (key, value) => names.push([loc, key, value]);

  // the locale's default hour cycle (resolvedOptions().hourCycle)
  put('hc', dateFmt(loc, { hour: 'numeric' }).resolvedOptions().hourCycle);

  // standalone month names (a month-only format renders the standalone form)
  for (const w of ['long', 'short', 'narrow']) {
    const f = dateFmt(loc, { month: w });
    for (let m = 0; m < 12; m++) put(`M${m + 1}${w[0].toUpperCase()}`, f.format(new Date(Date.UTC(2009, m, 2))));
  }
  // format-form month names (in a date with other fields, e.g. Russian's
  // genitive: "2 марта")
  for (const w of ['long', 'short', 'narrow']) {
    const f = dateFmt(loc, { year: 'numeric', month: w, day: 'numeric' });
    for (let m = 0; m < 12; m++) {
      put(`MF${m + 1}${w[0].toUpperCase()}`, f.formatToParts(new Date(Date.UTC(2009, m, 2))).find((p) => p.type === 'month')?.value ?? '');
    }
  }
  // weekdays (Sunday=1 … Saturday=7)
  for (const w of ['long', 'short', 'narrow']) {
    const f = dateFmt(loc, { weekday: w });
    for (let d = 0; d < 7; d++) put(`W${d + 1}${w[0].toUpperCase()}`, f.format(WEEKDAY_DATES[d]));
  }
  // day periods per hour and minute bucket (noon vs 12:30, midnight vs 00:30):
  // just the dayPeriod part's value, not the whole format
  const periodValues = {};
  for (const w of ['short', 'long', 'narrow']) {
    const f = dateFmt(loc, { hour: 'numeric', minute: 'numeric', dayPeriod: w });
    for (let h = 0; h < 24; h++) {
      for (const min of [0, 30]) {
        const value = f.formatToParts(new Date(Date.UTC(2009, 2, 2, h, min))).find((p) => p.type === 'dayPeriod')?.value ?? '';
        put(`p${h}|${min}${w[0].toUpperCase()}`, value);
        (periodValues[w] ??= []).push(value);
      }
    }
  }
  // eras
  const eraValues = {};
  for (const w of ['short', 'long', 'narrow']) {
    const f = dateFmt(loc, { year: 'numeric', era: w });
    const ad = f.formatToParts(DATE_PROBE).find((p) => p.type === 'era')?.value ?? '';
    const bc = f.formatToParts(BC_PROBE).find((p) => p.type === 'era')?.value ?? '';
    put(`eraAD${w[0].toUpperCase()}`, ad);
    put(`eraBC${w[0].toUpperCase()}`, bc);
    eraValues[w] = ad;
  }
  // the AM/PM markers the time styles render (distinct from the flexible day
  // periods the dayPeriod option asks for)
  const ampm = dateFmt(loc, { hour: 'numeric', minute: '2-digit', hour12: true });
  put('ampmPM', ampm.formatToParts(DATE_PROBE).find((p) => p.type === 'dayPeriod')?.value ?? '');
  put('ampmAM', ampm.formatToParts(DATE_PROBE_AM).find((p) => p.type === 'dayPeriod')?.value ?? '');

  // Which day-period width renders a probed value (the patterns' dayPeriod
  // tokens): the value appears in that width's table; undefined for the AM/PM
  // markers, which no flexible-period table renders
  const periodWidthOf = (value) => {
    for (const w of ['short', 'long', 'narrow']) {
      if ((periodValues[w] ?? []).includes(value)) return { short: 's', long: 'l', narrow: 'r' }[w];
    }
    return undefined;
  };
  const eraWidthOf = (value) => {
    for (const w of ['short', 'long', 'narrow']) {
      if (eraValues[w] === value) return w[0];
    }
    return 's';
  };

  // the date/time style patterns and the common option-bag skeletons
  const captured = [];
  const add = (id, opts) => captured.push({ id, opts, capture: captureDatePattern(loc, opts, id, periodWidthOf, eraWidthOf) });
  for (const style of ['full', 'long', 'medium', 'short']) {
    add(`d${style}`, { dateStyle: style });
    add(`t${style}`, { timeStyle: style });
    add(`ft${style}`, { dateStyle: style, timeStyle: style });
    // hour12/hourCycle overrides of the time styles
    add(`t${style}12`, { timeStyle: style, hour12: true });
    add(`t${style}24`, { timeStyle: style, hour12: false });
    add(`ft${style}12`, { dateStyle: style, timeStyle: style, hour12: true });
    add(`ft${style}24`, { dateStyle: style, timeStyle: style, hour12: false });
  }
  add('yMMMMd', { year: 'numeric', month: 'long', day: 'numeric' });
  add('yMMMMdEraS', { year: 'numeric', month: 'long', day: 'numeric', era: 'short' });
  add('yMMMMdEraL', { year: 'numeric', month: 'long', day: 'numeric', era: 'long' });
  add('yMMMd', { year: 'numeric', month: 'short', day: 'numeric' });
  add('yMMMdEraS', { year: 'numeric', month: 'short', day: 'numeric', era: 'short' });
  add('yMMMEd', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
  add('yMMMMEEEEd', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  add('yMEd', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });
  add('yMd', { year: 'numeric', month: 'numeric', day: 'numeric' });
  add('yM', { year: 'numeric', month: 'numeric' });
  add('yMMM', { year: 'numeric', month: 'short' });
  add('yMMMM', { year: 'numeric', month: 'long' });
  add('MMMMd', { month: 'long', day: 'numeric' });
  add('MMMEd', { month: 'short', day: 'numeric', weekday: 'short' });
  add('Md', { month: 'numeric', day: 'numeric' });
  add('Ed', { weekday: 'short', day: 'numeric' });
  add('d', { day: 'numeric' });
  add('M', { month: 'numeric' });
  add('MMMM', { month: 'long' });
  add('MMM', { month: 'short' });
  add('y', { year: 'numeric' });
  add('y2', { year: '2-digit' });
  // time skeletons (default cycle, forced 12/24)
  add('hms', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  add('hms12', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  add('hms24', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false });
  add('hm', { hour: 'numeric', minute: '2-digit' });
  add('hm12', { hour: 'numeric', minute: '2-digit', hour12: true });
  add('hm24', { hour: 'numeric', minute: '2-digit', hour12: false });
  add('h', { hour: 'numeric' });
  add('h12', { hour: 'numeric', hour12: true });
  add('H24', { hour: 'numeric', hour12: false });
  add('ms', { minute: '2-digit', second: '2-digit' });
  add('hmdpS', { hour: 'numeric', minute: 'numeric', dayPeriod: 'short' });
  add('hmdpL', { hour: 'numeric', minute: 'numeric', dayPeriod: 'long' });
  add('hmF', { hour: 'numeric', minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3 });
  add('hmF12', { hour: 'numeric', minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3, hour12: true });
  // the default Date#toLocaleString shapes (yMd / hms and the combination)
  add('yMdHms', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  add('yMdHms12', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
  add('yMdHms24', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
  // time zones with option bags
  add('yMMMdzS', { year: 'numeric', month: 'short', day: 'numeric', timeZoneName: 'short' });
  add('yMMMdzL', { year: 'numeric', month: 'short', day: 'numeric', timeZoneName: 'long' });
  add('hmzS', { hour: 'numeric', minute: 'numeric', timeZoneName: 'short' });
  add('hmzO', { hour: 'numeric', minute: 'numeric', timeZoneName: 'longOffset' });
  add('yMdzS', { year: 'numeric', month: 'numeric', day: 'numeric', timeZoneName: 'short' });
  add('yMdzL', { year: 'numeric', month: 'numeric', day: 'numeric', timeZoneName: 'long' });
  add('yMdHmszS', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' });
  add('yMdHmszS12', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short', hour12: true });
  add('yMdHmszS24', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short', hour12: false });
  add('hmszS', { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' });
  // dates with hours and minutes (no seconds)
  add('yMdHm', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  add('yMdHm12', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  add('yMdHm24', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
  // weekdays alone and with a time (CLDR's E / Eh / Ehm shapes)
  add('E', { weekday: 'short' });
  add('EEEE', { weekday: 'long' });
  add('Eh', { weekday: 'short', hour: 'numeric' });
  add('Ehm', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  add('EEEEhm', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  add('yMMMdHm', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  add('yMMMMdHm', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

  for (const { capture } of captured) patterns.push([loc, capture.id, capture.parts]);

  // range patterns: one per base pattern and greatest difference between the
  // two dates ('other': the differing field isn't in the pattern — for a
  // time-only pattern ICU renders full dates on both sides)
  const diffs = {
    y: [DATE_PROBE, new Date('2012-03-02T14:05:06.789Z')],
    M: [DATE_PROBE, new Date('2009-06-02T14:05:06.789Z')],
    d: [DATE_PROBE, new Date('2009-03-04T14:05:06.789Z')],
    h: [DATE_PROBE, new Date('2009-03-02T16:05:06.789Z')],
    m: [DATE_PROBE, new Date('2009-03-02T14:35:06.789Z')],
    s: [DATE_PROBE, new Date('2009-03-02T14:05:36.789Z')]
  };
  for (const { id, opts, capture } of captured) {
    const hasDate = capture.parts.some((p) => ['y', 'M', 'd', 'w'].includes(p[0]));
    const hasTime = capture.parts.some((p) => ['h', 'H', '1', 'm', 's', 'p', 'P'].includes(p[0]));
    if (!hasDate && !hasTime) continue;
    const f = dateFmt(loc, opts);
    const applicable = [];
    if (hasDate) applicable.push('y', 'M', 'd');
    if (hasTime) applicable.push('h', 'm', 's');
    for (const diff of applicable) {
      const [a, b] = diffs[diff];
      const probed = f.formatRangeToParts(a, b);
      if (probed.some((p) => p.source !== 'shared' && p.source !== undefined)) {
        patterns.push([loc, `R:${id}:${diff}`, rangeDateParts(probed, capture.parts)]);
      }
    }
    // 'other': the difference is a field the pattern doesn't show (a time-only
    // pattern ranging over different days, a date-only one over the same day —
    // the latter renders both sides identically, which the run time reduces to
    // the plain format, so it isn't captured)
    if (hasTime !== hasDate) {
      const [oa, ob] = hasTime ? diffs.d : diffs.h;
      const probed = f.formatRangeToParts(oa, ob);
      if (probed.some((p) => p.source === 'startRange' || p.source === 'endRange')) {
        patterns.push([loc, `R:${id}:other`, rangeDateParts(probed, capture.parts)]);
      }
    }
  }

  return { names, patterns };
}

// One date pattern probed by example: formatToParts at the probe instant(s) →
// tokens. hourCycle/hour12 of the options (or the locale's default) is known
// by the caller; the 5 AM probe separates hour widths where 14h can't
function captureDatePattern(loc, opts, id, periodWidthOf, eraWidthOf) {
  const f = dateFmt(loc, opts);
  // (the time styles' zone: full the long name, long the short one)
  const zoneWidth = { short: 's', long: 'l', shortOffset: 'o', longOffset: 'O', shortGeneric: 'g', longGeneric: 'G' }[opts.timeZoneName] ??
    ({ full: 'l', long: 's' }[opts.timeStyle] ?? 0);
  // cycle: what the options ask for, else what the locale renders at 14h
  let cycle = opts.hourCycle ?? (opts.hour12 === true ? 'h12' : opts.hour12 === false ? 'h23' : null);
  const p14 = f.formatToParts(DATE_PROBE);
  const hour14 = p14.find((p) => p.type === 'hour');
  if (!cycle && hour14) cycle = hour14.value === '14' ? 'h23' : 'h12';
  // h12 vs h11: at midnight the 12-based cycle renders 12, the 0-based one 0
  let midnightRendersZero = false;
  if (cycle && cycle !== 'h23' && cycle !== 'h24') {
    midnightRendersZero = f.formatToParts(DATE_PROBE_MIDNIGHT).find((p) => p.type === 'hour')?.value === '0';
  }
  const p5 = f.formatToParts(DATE_PROBE_AM);
  const hour5 = p5.find((p) => p.type === 'hour');
  const hourWidth = hour5 ? (hour5.value === '5' ? 'n' : '2') : 'n';
  const parts = [];
  for (const p of p14) {
    if (p.type === 'hour') {
      const kind = cycle === 'h23' || cycle === 'h24' ? 'H' : midnightRendersZero ? '1' : 'h';
      parts.push([kind, hourWidth, 0, '']);
      continue;
    }
    const token = datePartToken(p, zoneWidth, 0, 0, loc, opts);
    if (!token) { parts.push(['l', 0, 0, p.value]); continue; }
    let [kind, width] = token;
    if (p.type === 'dayPeriod') {
      // a value the flexible-period tables render is a dayPeriod token; the
      // AM/PM markers the styles render are their own kind
      const w = periodWidthOf(p.value);
      if (w) { kind = 'p'; width = w; } else { kind = 'P'; width = 0; }
    }
    if (p.type === 'era') width = eraWidthOf(p.value);
    parts.push([kind, width, 0, '']);
  }
  return { id, parts };
}

// Range parts: field tokens keep the base pattern's kinds and widths (the
// range probes can't separate them — "14" is both widths of an h23 hour)
function rangeDateParts(probeParts, baseParts) {
  const widths = {};
  for (const [kind, width] of baseParts) if (!widths[kind]) widths[kind] = width;
  const baseHour = baseParts.find((b) => ['H', 'h', '1'].includes(b[0]));
  const out = [];
  let i = 0;
  while (i < probeParts.length) {
    const p = probeParts[i];
    const src = p.source === 'startRange' ? 's' : p.source === 'endRange' ? 'e' : 0;
    if (p.type === 'hour') {
      out.push([baseHour ? baseHour[0] : 'h', baseHour ? baseHour[1] : 'n', src, '']);
      i++;
      continue;
    }
    if (p.type === 'dayPeriod') {
      const basePeriod = baseParts.find((b) => b[0] === 'p' || b[0] === 'P');
      out.push([basePeriod ? basePeriod[0] : 'P', basePeriod ? basePeriod[1] : 0, src, '']);
      i++;
      continue;
    }
    const token = datePartToken(p, 0, 0, 0);
    if (!token) { out.push(['l', 0, src, p.value]); i++; continue; }
    let [kind, width] = token;
    if (widths[kind] !== undefined) width = widths[kind];
    out.push([kind, width, src, '']);
    i++;
  }
  return out;
}

// --- List / relative-time / display / zones --------------------------------

function collectListData(loc) {
  const rows = [];
  const put = (key, value) => rows.push([loc, key, value]);
  for (const type of ['conjunction', 'disjunction', 'unit']) {
    const t = { conjunction: 'conj', disjunction: 'disj', unit: 'unit' }[type];
    for (const style of ['long', 'short', 'narrow']) {
      const f = new Intl.ListFormat(loc, { type, style });
      const lits = f.formatToParts(['a', 'b', 'c', 'd']).filter((p) => p.type === 'literal').map((p) => p.value);
      put(`${t}:${style}:start`, lits[0] ?? '');
      put(`${t}:${style}:middle`, lits[1] ?? '');
      put(`${t}:${style}:end`, lits[2] ?? '');
      const pair = pairLiteral(f, 'b');
      put(`${t}:${style}:pair`, pair);
      // contextual pairs (Spanish "e"/"u" before i-/o-initial elements): the
      // pair separator that applies before words starting with those letters,
      // encoded "triggers<US>variant" after a \u0001 separator
      if (type !== 'unit') {
        const triggers = [];
        const variants = [];
        const seen = new Map();
        for (const [trigger, word] of [['i', 'isabel'], ['hi', 'hijos'], ['o', 'orlando'], ['ho', 'hombres'], ['y', 'yogur'], ['11', 'once']]) {
          const lit = pairLiteral(f, word);
          if (lit !== pair && !seen.has(lit)) { seen.set(lit, trigger); triggers.push(trigger); variants.push(lit); }
          else if (lit !== pair && seen.has(lit)) triggers.push(trigger);
        }
        if (triggers.length > 0) put(`${t}:${style}:pairAlt`, `${triggers.join(',')}\u0001${variants.join('\u0001')}`);
      }
    }
  }
  return rows;
}

// A numbering system's digits, 0 to 9 in order (one formatted digit each)
function digitsOf(f) {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => f.format(d)).join('');
}

function pairLiteral(f, word) {
  return f.formatToParts(['a', word]).find((p) => p.type === 'literal')?.value ?? '';
}

function collectRelativeData(loc) {
  const rows = [];
  const put = (key, value) => rows.push([loc, key, value]);
  const rules = plural(loc);
  const units = ['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'];
  // representative values per plural category (the string's number is
  // replaced with a {n} placeholder; the run time formats its own value)
  const candidates = [1, 2, 3, 5, 11, 21, 101, 111, 0.5, 1.5, 1000000, 21.5];
  const reps = [];
  const seen = new Set();
  for (const v of candidates) {
    const cat = rules.select(v);
    if (!seen.has(cat)) { seen.add(cat); reps.push([v, cat]); }
  }
  for (const unit of units) {
    for (const style of ['long', 'short', 'narrow']) {
      for (const numeric of ['always', 'auto']) {
        const f = new Intl.RelativeTimeFormat(loc, { style, numeric });
        const nk = numeric === 'always' ? 'N' : 'A';
        for (const [v, cat] of reps) {
          for (const sign of [1, -1]) {
            const s = f.format(sign * v, unit);
            put(`rel:${unit}:${style[0]}:${nk}:${cat}:${sign > 0 ? 'f' : 'p'}`, s.replace(formattedNumber(loc, v), '{n}'));
          }
        }
        // numeric:'auto' phrases (yesterday, tomorrow, last month …)
        if (numeric === 'auto') {
          for (const v of [-2, -1, 0, 1, 2]) {
            put(`relauto:${unit}:${style[0]}:${v}`, f.format(v, unit));
          }
        }
      }
    }
  }
  return rows;
}

// The form the probe value takes in a relative-time string (grouped digits)
function formattedNumber(loc, v) {
  return new Intl.NumberFormat(loc, { maximumFractionDigits: 20 }).format(v);
}

function collectDisplayData(loc) {
  const rows = [];
  const put = (key, value) => rows.push([loc, key, value]);
  const dn = (type, code, style) => {
    try {
      const v = new Intl.DisplayNames([loc], { type, style }).of(code);
      if (v && v !== code) put(`dn:${type}:${style ?? 'long'}:${code}`, v);
    } catch { /* not a code of this type */ }
  };
  const languages = [
    ...new Set(LOCALES.map((l) => l.split('-')[0])),
    'sr', 'az', 'ug', 'kk', 'et', 'lt', 'lv', 'sl', 'hr', 'ha', 'yo', 'ig', 'am', 'fa', 'bn',
    'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa', 'ms', 'fil', 'sw', 'ca', 'gl', 'eu', 'cy', 'ga',
    'is', 'mk', 'sq', 'hy', 'ka', 'ne', 'si', 'km', 'lo', 'my', 'bg', 'ro', 'hu', 'und'
  ];
  for (const lang of languages) dn('language', lang, 'long');
  for (const lang of ['en-GB', 'en-US', 'pt-BR', 'pt-PT', 'zh-Hans', 'zh-Hant', 'de-AT', 'de-CH', 'es-MX', 'fr-CA', 'nb-NO', 'nn-NO', 'sr-Latn-RS', 'az-Latn-AZ']) dn('language', lang, 'long');
  for (const style of ['short', 'narrow']) for (const lang of ['de', 'fr', 'en', 'es']) dn('language', lang, style);
  const regions = ['US', 'GB', 'DE', 'FR', 'ES', 'MX', 'IT', 'BR', 'PT', 'NL', 'SE', 'DK', 'NO', 'FI', 'PL', 'CZ', 'RU', 'UA', 'TR', 'GR', 'JP', 'CN', 'TW', 'KR', 'IN', 'EG', 'SA', 'IL', 'ID', 'TH', 'VN', 'SG', 'HK', 'MY', 'PH', 'AU', 'NZ', 'CA', 'CH', 'AT', 'BE', 'ZA', 'NG', 'KE', 'AR', 'CL', 'CO', 'PE', '419', '001', '150', 'EU', 'ZZ'];
  for (const region of regions) dn('region', region, 'long');
  for (const script of ['Latn', 'Cyrl', 'Grek', 'Arab', 'Hebr', 'Deva', 'Thai', 'Hans', 'Hant', 'Jpan', 'Kore', 'Beng', 'Hang', 'Zzzz']) dn('script', script, 'long');
  for (const code of CURRENCIES) dn('currency', code, 'long');
  for (const code of ['USD', 'EUR', 'GBP', 'JPY']) dn('currency', code, 'narrow');
  for (const code of ['gregory', 'buddhist', 'chinese', 'coptic', 'dangi', 'ethioaa', 'ethiopic', 'hebrew', 'indian', 'islamic', 'islamic-civil', 'islamic-umalqura', 'iso8601', 'japanese', 'persian', 'roc']) dn('calendar', code, 'long');
  for (const style of ['long', 'short', 'narrow']) {
    for (const field of ['era', 'year', 'quarter', 'month', 'weekOfYear', 'weekday', 'day', 'dayPeriod', 'hour', 'minute', 'second', 'timeZoneName']) dn('dateTimeField', field, style);
  }
  // languageDisplay "standard": the locale's "{0} ({1})" pattern and the
  // separator between the parenthesized names ("Latin, Serbia")
  try {
    const std = new Intl.DisplayNames([loc], { type: 'language', languageDisplay: 'standard' });
    const lang = new Intl.DisplayNames([loc], { type: 'language' }).of('en');
    const region = new Intl.DisplayNames([loc], { type: 'region' }).of('US');
    const both = std.of('en-US');
    if (both.includes(lang) && both.includes(region)) put('dn:pattern', both.replace(lang, '{0}').replace(region, '{1}'));
    const sr = std.of('sr-Latn-RS');
    const script = new Intl.DisplayNames([loc], { type: 'script' }).of('Latn');
    const rs = new Intl.DisplayNames([loc], { type: 'region' }).of('RS');
    const i = sr.indexOf(script), j = sr.indexOf(rs);
    if (i >= 0 && j > i) put('dn:separator', sr.slice(i + script.length, j));
  } catch { /* no standard display */ }
  return rows;
}

function collectZoneData() {
  const rows = [];
  const winter = new Date(Date.UTC(2009, 0, 15, 12));
  const summer = new Date(Date.UTC(2009, 6, 15, 12));
  for (const zone of ZONES) {
    const put = (key, value) => rows.push([zone, key, value]);
    for (const [suffix, date] of [['W', winter], ['S', summer]]) {
      for (const width of ['short', 'long', 'shortGeneric', 'longGeneric']) {
        try {
          const f = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: width });
          const name = f.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? '';
          const key = width.includes('Generic') ? width.replace('Generic', 'G') : width;
          put(`${key}${suffix}`, name);
        } catch { /* unknown zone */ }
      }
    }
  }
  return rows;
}

// --- Main ------------------------------------------------------------------

const numberRows = LOCALES.map((loc) => collectNumberData(loc));
const dateRows = LOCALES.map((loc) => collectDateData(loc));

const numberNames = numberRows.flatMap((r) => r.names);
const numberTemplates = numberRows.flatMap((r) => r.templates);
const dateNames = dateRows.flatMap((r) => r.names);
const datePatterns = dateRows.flatMap((r) => r.patterns);
const listRows = LOCALES.flatMap((loc) => collectListData(loc));
const relRows = LOCALES.flatMap((loc) => collectRelativeData(loc));
const displayRows = LOCALES.flatMap((loc) => collectDisplayData(loc));
const zoneRows = collectZoneData();

// Time-zone aliases: every IANA name Go's tzdata knows (GOROOT's
// zoneinfo.zip) that ICU canonicalizes to another id or doesn't list (Etc/UTC
// → UTC, US/Eastern → America/New_York, Asia/Kolkata → Asia/Calcutta). Keys
// are lowercase: ids match case-insensitively
function goZoneNames() {
  const goroot = execFileSync('go', ['env', 'GOROOT'], { encoding: 'utf-8' }).trim();
  const zip = readFileSync(path.join(goroot, 'lib', 'time', 'zoneinfo.zip'));
  // the end of central directory record, then the central file headers
  let eocd = zip.length - 22;
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const count = zip.readUInt16LE(eocd + 10);
  let pos = zip.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i++) {
    const nameLen = zip.readUInt16LE(pos + 28);
    const extraLen = zip.readUInt16LE(pos + 30);
    const commentLen = zip.readUInt16LE(pos + 32);
    const name = zip.toString('utf-8', pos + 46, pos + 46 + nameLen);
    if (!name.endsWith('/')) names.push(name);
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}
const zoneAliasRows = [];
{
  const supported = new Set(Intl.supportedValuesOf('timeZone'));
  for (const name of goZoneNames()) {
    try {
      const canonical = new Intl.DateTimeFormat('en', { timeZone: name }).resolvedOptions().timeZone;
      if (canonical !== name || !supported.has(name)) zoneAliasRows.push([name.toLowerCase(), canonical]);
    } catch { /* ICU doesn't know it */ }
  }
}

// likely subtags (Locale.maximize / minimize) and canonical minimization
const likelyRows = [];
const minimalRows = [];
for (const base of [...new Set([...LOCALES.map((l) => l.split('-')[0]), 'sr', 'az', 'ug', 'kk', 'et', 'lt', 'lv', 'sl', 'hr', 'nn', 'he', 'zh', 'sq', 'hy', 'ka', 'ne', 'si', 'km', 'lo', 'my', 'bg', 'ro', 'hu', 'sw', 'ms', 'fil', 'am', 'fa', 'bn', 'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa'])]) {
  try {
    const max = new Intl.Locale(base).maximize();
    likelyRows.push([base, max.toString()]);
    const min = max.minimize().toString();
    if (min !== max.toString()) minimalRows.push([max.toString(), min]);
  } catch { /* not a language */ }
}
const seenMin = new Set(minimalRows.map((r) => r[0]));
for (const loc of ['en-US', 'de-DE', 'fr-FR', 'pt-BR', 'zh-Hans-CN', 'zh-Hant-TW', 'nb-NO', 'es-419', 'en-GB', 'ja-JP', 'ru-RU', 'ar-EG', 'hi-IN', 'sr-Latn-RS', 'az-Latn-AZ']) {
  if (seenMin.has(loc)) continue;
  try {
    const min = new Intl.Locale(loc).minimize().toString();
    if (min !== loc) minimalRows.push([loc, min]);
  } catch { /* not a language */ }
}

// numbering system digits (for -u-nu-…)
const digitRows = [];
for (const ns of NUMBERING_SYSTEMS) {
  try {
    const digits = digitsOf(new Intl.NumberFormat(`en-u-nu-${ns}`, { useGrouping: false }));
    digitRows.push(['ns', ns, digits]);
  } catch { /* unknown system */ }
}

// currency fraction digits (ISO 4217 as ICU has them), where they aren't 2
const currencyDigitRows = [];
for (const code of Intl.supportedValuesOf('currency')) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
  if (digits !== 2) currencyDigitRows.push([code, String(digits)]);
}

// the full lists Intl.supportedValuesOf returns (and NumberFormat's unit and
// currency validation use)
const supportedLists = {
  tnIntlCalendars: Intl.supportedValuesOf('calendar'),
  tnIntlCurrencies: Intl.supportedValuesOf('currency'),
  tnIntlNumberings: Intl.supportedValuesOf('numberingSystem'),
  tnIntlTimeZones: Intl.supportedValuesOf('timeZone'),
  tnIntlUnits: Intl.supportedValuesOf('unit')
};

const chunks = {
  intlCore: [
    '// Intl core tables: the generated locale set, likely-subtags and the',
    '// digits of the common numbering systems. Generated by',
    '// scripts/gen-intl-data.mjs from Node ' + process.versions.node + ' (ICU ' + process.versions.icu + ') — do not edit.',
    goSlice('tnIntlLocales', LOCALES, 'The locales whose data follows (Intl.supportedLocalesOf filters with it)'),
    goFlatMap('tnIntlLikely', likelyRows, 'Base language → maximal tag (Intl.Locale.prototype.maximize)'),
    goFlatMap('tnIntlMinimal', minimalRows, 'Full tag → minimal tag (Intl.Locale.prototype.minimize)'),
    goFlatMap('tnIntlNumberingDigits', digitRows.map(([, k, v]) => [k, v]), 'Numbering system → its digits, 0-9'),
    goSlice('tnIntlCalendars', supportedLists.tnIntlCalendars, 'Intl.supportedValuesOf("calendar")'),
    goSlice('tnIntlCurrencies', supportedLists.tnIntlCurrencies, 'Intl.supportedValuesOf("currency")'),
    goSlice('tnIntlNumberings', supportedLists.tnIntlNumberings, 'Intl.supportedValuesOf("numberingSystem")'),
    goSlice('tnIntlTimeZones', supportedLists.tnIntlTimeZones, 'Intl.supportedValuesOf("timeZone")'),
    goSlice('tnIntlUnits', supportedLists.tnIntlUnits, 'Intl.supportedValuesOf("unit")')
  ].join('\n'),
  intlNumber: [
    '// NumberFormat data: symbols, currency/compact/unit patterns and number',
    '// range patterns. Generated by scripts/gen-intl-data.mjs — do not edit.',
    goStringMap('tnIntlNumberNames', numberNames, 'Locale → symbol key → value (dec, grp, minus, plus, pctSign, digits, grpSizes, exSep, curName:<code>:<cat>, cmpV:<style>:<pow>:<cat>)'),
    goPartsMap('tnIntlNumberParts', numberTemplates, 'Locale → template key → parts (decP/N, pctP/N, sciP/N, cur:<c>:P/N, curNar:<c>:P/N, curCode:P/N, curNmP/N, cmp:<style>:<pow>:<cat>, u:<unit>:<style>:<cat>, rng*)'),
    goFlatMap('tnIntlCurrencyDigits', currencyDigitRows, 'Currency → its fraction digits, where not 2 (JPY 0, KWD 3 …)')
  ].join('\n'),
  intlDate: [
    '// DateTimeFormat data: month/weekday/day-period/era names, date and time',
    '// patterns (probed by example), date range patterns and time-zone names.',
    '// Generated by scripts/gen-intl-data.mjs — do not edit.',
    goStringMap('tnIntlDateNames', dateNames, 'Locale → name key → value (M<1-12><L|S|N> standalone, MF<1-12><L|S|N> format form, W<1-7><L|S|N>, p<h>|<min><L|S|N> day periods, eraAD*/eraBC*)'),
    goPartsMap('tnIntlDateParts', datePatterns, 'Locale → pattern id → parts (d*/t*/ft* styles, skeletons, R:<id>:<diff> ranges)'),
    goStringMap('tnIntlZoneNames', zoneRows, 'IANA zone → name key → value (short/long/shortG/longG × winter W / summer S)'),
    goFlatMap('tnIntlZoneAliases', zoneAliasRows, 'Lowercase IANA id → the id ICU reports (Etc/UTC → UTC, Asia/Kolkata → Asia/Calcutta)')
  ].join('\n'),
  intlListRel: [
    '// ListFormat and RelativeTimeFormat patterns. Generated by',
    '// scripts/gen-intl-data.mjs — do not edit.',
    goStringMap('tnIntlList', listRows, 'Locale → key → separator (conj|disj|unit : long|short|narrow : start|middle|end|pair, pairAlt)'),
    goStringMap('tnIntlRel', relRows, 'Locale → key → pattern with {n} placeholder (rel:<unit>:<style>:<N|A>:<cat>:<p|f>, relauto:<unit>:<style>:<-2..2>)')
  ].join('\n'),
  intlDisplay: [
    '// DisplayNames tables (the names Node itself renders; the run time falls',
    '// back to golang.org/x/text for codes not listed). Generated by',
    '// scripts/gen-intl-data.mjs — do not edit.',
    goStringMap('tnIntlDisplay', displayRows, 'Locale → dn:<type>:<style>:<code> → name')
  ].join('\n')
};

// The TypeScript file: Go source strings the self-hosted compiler embeds as
// constants (each helper includes the chunk it needs — see intl.ts).
const header = `// Generated by scripts/gen-intl-data.mjs from Node ${process.versions.node} (ICU ${process.versions.icu}) — do not edit.
// The locale data TypeNative's Intl formats with: the patterns, symbols and
// names Node's own Intl renders, as Go map literals (see src/node/intl.ts).
`;

const body = Object.entries(chunks)
  .map(([name, go]) => {
    // A TS template literal: escape backslashes, backticks and ${
    const escaped = go.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    return `export const ${name}Data = \`${escaped}\`;\n`;
  })
  .join('\n');

writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'node', 'intl_data.ts'), header + '\n' + body);
console.log(`Generated src/node/intl_data.ts: ${LOCALES.length} locales, ${(header + body).length} bytes`);
