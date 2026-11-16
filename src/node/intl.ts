// The Intl global (JS API): NumberFormat, DateTimeFormat, Collator,
// PluralRules, ListFormat, RelativeTimeFormat, Segmenter, DisplayNames and
// Locale, plus getCanonicalLocales and supportedValuesOf. The patterns,
// symbols and names come from intl_data.ts, captured from Node's own ICU, so
// the output matches Node; language tags and matching, plural rules,
// collation and locale case mapping run on the vendored golang.org/x/text.
// Registered beside registerWebAssembly in src/transpiler.ts.
import { NodeRegistry, defineClass, defineHelper, setResults } from './registry.js';
import { intlCoreData, intlNumberData, intlDateData, intlListRelData, intlDisplayData } from './intl_data.js';
import { registerTemporalZones } from './temporal_zones.js';

// Result types of a class's members: instance methods (looked up as
// 'Intl.X#name') and statics ('Intl.X.name') share one spec
function setIntlResults(r: NodeRegistry, key: string, spec: string): void {
  setResults(r, key, spec);
  const parts = spec.split(';');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part === '') continue;
    const eq = part.indexOf('=');
    const name = eq < 0 ? part : part.substring(0, eq).trim();
    const type = eq < 0 ? '' : part.substring(eq + 1).trim();
    r.results[key + '#' + name] = type;
  }
}

const intlCoreGo = `// Intl: option reading, locale resolution and shared plumbing. The locale
// data lives in the generated maps (intl_data.ts, captured from Node's ICU).

// A pattern token (see intl_data.ts): kind, width, range source and literal
// text. Date fields: 'y' year, 'M' month, 'd' day, 'w' weekday, 'h'/'1' the
// 12-hour cycles (h12/h11), 'H' 24-hour, 'm' minute, 's' second, 'p' flexible
// day period, 'P' the AM/PM marker, 'e' era, 'z' zone, 'f' fractional
// seconds. Number tokens: 'N' the number, 'M' minus sign, 'P' plus sign, 'C'
// currency symbol, 'U' unit, 'K' compact marker, 'p' percent sign, 'E'
// exponent separator, 'X' exponent minus sign, 'x' exponent digits.
type tnIntlPart struct {
	kind  byte
	width byte
	src   byte
	text  string
}

func tnIntlRangeError(msg string) { panic(TnNodeError("RangeError", "", msg)) }

func tnIntlHasString(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

// A JS object with its keys in order (parts, segments, resolvedOptions: the
// program sees Node's key order in JSON.stringify and Object.keys)
func tnIntlObj(kv ...interface{}) *TnMap[string, interface{}] {
	o := TnNewMap[string, interface{}]()
	for i := 0; i+1 < len(kv); i += 2 {
		o.Set(kv[i].(string), kv[i+1])
	}
	return o
}

// A field of such an object
func tnIntlGet(obj interface{}, key string) interface{} {
	if o, ok := obj.(*TnMap[string, interface{}]); ok {
		return o.Get(key)
	}
	return TnGetValue(obj, key)
}

func tnIntlOptStr(options interface{}, key string) (string, bool) {
	if options == nil {
		return "", false
	}
	if v, ok := TnGetValue(options, key).(string); ok {
		return v, true
	}
	return "", false
}

func tnIntlOptFloat(options interface{}, key string) (float64, bool) {
	if options == nil {
		return 0, false
	}
	v := TnGetValue(options, key)
	if v == nil {
		return 0, false
	}
	return TnNumber(v), true
}

// An option that must be one of a set of strings, with the given default
func tnIntlOptionChoice(options interface{}, key string, def string, choices ...string) string {
	if v, ok := tnIntlOptStr(options, key); ok {
		if tnIntlHasString(choices, v) {
			return v
		}
		tnIntlRangeError("Invalid " + key + ": " + v)
	}
	return def
}

// --- locale resolution

var tnIntlLocaleSet = func() map[string]bool {
	m := make(map[string]bool, len(tnIntlLocales))
	for _, l := range tnIntlLocales {
		m[l] = true
	}
	return m
}()

// The generated locales of each base language, for the fallback by language
var tnIntlByLanguage = func() map[string][]string {
	m := map[string][]string{}
	for _, l := range tnIntlLocales {
		base := l
		if i := strings.IndexByte(l, '-'); i >= 0 {
			base = l[:i]
		}
		m[base] = append(m[base], l)
	}
	return m
}()

// The base language of a canonical id
func tnIntlLanguageOf(id string) string {
	if i := strings.IndexByte(id, '-'); i >= 0 {
		return id[:i]
	}
	return id
}

// The id without its extensions (-u-…, -x-…)
func tnIntlBaseOf(id string) string {
	base := id
	for _, mark := range []string{"-u-", "-x-"} {
		if i := strings.Index(base, mark); i >= 0 {
			base = base[:i]
		}
	}
	return base
}

// The -u-…/-x-… extensions of a canonical id
func tnIntlExtensionOf(id string) string {
	for _, mark := range []string{"-u-", "-x-"} {
		if i := strings.Index(id, mark); i >= 0 {
			return id[i:]
		}
	}
	return ""
}

// Region variants whose script differs from their language's likely one
// (zh-TW / zh-HK / zh-MO are Traditional while zh's likely script is Hans)
var tnIntlScriptByRegion = map[string]string{"zh": "TW,HK,MO=Hant"}

// The script of a canonical id: the explicit one, else the likely-subtags one
func tnIntlScriptOf(id string) string {
	base := tnIntlBaseOf(id)
	parts := strings.Split(base, "-")
	if len(parts) > 1 && len(parts[1]) == 4 {
		return parts[1]
	}
	lang := parts[0]
	if rules, ok := tnIntlScriptByRegion[lang]; ok && len(parts) > 1 {
		for _, pair := range strings.Split(rules, ";") {
			kv := strings.SplitN(pair, "=", 2)
			if len(kv) == 2 && tnIntlHasString(strings.Split(kv[0], ","), parts[len(parts)-1]) {
				return kv[1]
			}
		}
	}
	if full, ok := tnIntlLikely[lang]; ok {
		fp := strings.Split(full, "-")
		if len(fp) > 1 && len(fp[1]) == 4 {
			return fp[1]
		}
	}
	return ""
}

// The region of a canonical id: the 2-letter uppercase or 3-digit part
func tnIntlRegionOf(id string) string {
	parts := strings.Split(tnIntlBaseOf(id), "-")
	for i := 1; i < len(parts); i++ {
		p := parts[i]
		if len(p) == 4 {
			continue
		}
		if (len(p) == 2 && p[0] >= 'A' && p[0] <= 'Z' && p[1] >= 'A' && p[1] <= 'Z') || (len(p) == 3 && p[0] >= '0' && p[0] <= '9' && p[1] >= '0' && p[1] <= '9' && p[2] >= '0' && p[2] <= '9') {
			return p
		}
	}
	return ""
}

// The generated locale a resolved id uses its data from: the exact locale,
// else a same-region / same-script / same-language entry, else nothing
// (unknown languages fall back to the root locale, pt-PT since CLDR 46, as
// Node resolves them)
func tnIntlMatchData(id string) string {
	if tnIntlLocaleSet[id] {
		return id
	}
	cands := tnIntlByLanguage[tnIntlLanguageOf(id)]
	if len(cands) == 0 {
		return ""
	}
	inRegion, inScript := tnIntlRegionOf(id), tnIntlScriptOf(id)
	if inRegion != "" {
		for _, c := range cands {
			if tnIntlRegionOf(c) == inRegion {
				return c
			}
		}
	}
	if inScript != "" {
		for _, c := range cands {
			if tnIntlScriptOf(c) == inScript {
				return c
			}
		}
	}
	for _, c := range cands {
		if !strings.Contains(tnIntlBaseOf(c), "-") {
			return c
		}
	}
	return cands[0]
}

// A resolved locale: the tag (its -u- extensions drive nu/hc/kn/kf/ca/co),
// the id resolvedOptions reports (the generated locale actually used, with
// the extensions kept, as Node reports the best available locale) and the
// generated locale the data comes from
type TnIntlLoc struct {
	id   string
	tag  xlanguage.Tag
	data string
}

func tnIntlTagOf(id string) xlanguage.Tag {
	tag, err := xlanguage.Parse(id)
	if err != nil {
		return xlanguage.MustParse("en-US")
	}
	return tag
}

// The canonicalized requested locales (getCanonicalLocales): a RangeError on
// a malformed tag, duplicates removed
func TnIntlCanonicalList(locales interface{}) []string {
	var in []string
	switch v := locales.(type) {
	case nil:
	case string:
		in = []string{v}
	case []string:
		in = v
	case []interface{}:
		for _, e := range v {
			in = append(in, TnJSString(e))
		}
	default:
		for _, e := range TnToArray(locales) {
			in = append(in, TnJSString(e))
		}
	}
	out := []string{}
	seen := map[string]bool{}
	for _, s := range in {
		c, ok := tnIntlCanonicalTag(s)
		if !ok {
			panic(TnNodeError("RangeError", "", "Incorrect locale information provided"))
		}
		if !seen[c] {
			seen[c] = true
			out = append(out, c)
		}
	}
	return out
}

// A well-formed BCP 47 language tag (unicode_locale_id), canonicalized:
// golang.org/x/text's form when it knows the subtags, else the subtags'
// canonical case (unknown languages such as "xx" are well-formed)
var tnIntlTagRE = regexp.MustCompile("^(?i)([a-z]{2,3}|[a-z]{5,8})(-[a-z]{4})?(-([a-z]{2}|[0-9]{3}))?(-([a-z0-9]{5,8}|[0-9][a-z0-9]{3}))*(-[0-9a-wy-z](-[a-z0-9]{2,8})+)*(-x(-[a-z0-9]{1,8})+)?$")

func tnIntlCanonicalTag(s string) (string, bool) {
	if !tnIntlTagRE.MatchString(s) {
		return "", false
	}
	if tag, err := xlanguage.Parse(s); err == nil && !tag.IsRoot() {
		return tag.String(), true
	}
	parts := strings.Split(strings.ToLower(s), "-")
	for i := 1; i < len(parts); i++ {
		if len(parts[i]) == 1 {
			break // extensions stay lowercase
		}
		switch {
		case len(parts[i]) == 4 && i == 1:
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		case len(parts[i]) == 2:
			parts[i] = strings.ToUpper(parts[i])
		}
	}
	return strings.Join(parts, "-"), true
}

// The first requested locale that resolves to generated data, else the root
// fallback (its extensions kept, as ICU keeps them)
func TnIntlResolve(locales interface{}) *TnIntlLoc {
	ids := TnIntlCanonicalList(locales)
	// (no locale with data: the default locale's, as ECMA-402's
	// ResolveLocale falls back to DefaultLocale; then en-US)
	ids = append(ids, tnIntlDefaultID(), "en-US")
	var exts []string
	for _, id := range ids {
		tag := tnIntlTagOf(id)
		if len(exts) == 0 {
			for _, e := range tag.Extensions() {
				exts = append(exts, e.String())
			}
		}
		if data := tnIntlMatchData(id); data != "" {
			// (ICU has data for nearly every region: the requested base is
			// what resolvedOptions().locale reports — de-AT, not de)
			full := tnIntlBaseOf(id)
			for _, e := range tag.Extensions() {
				full += "-" + e.String()
			}
			if t2, err := xlanguage.Parse(full); err == nil {
				full = t2.String()
			}
			return &TnIntlLoc{id: full, tag: tag, data: data}
		}
	}
	_ = exts
	return &TnIntlLoc{id: "en-US", tag: tnIntlTagOf("en-US"), data: "en-US"}
}

// Intl.getCanonicalLocales
func TnIntlGetCanonicalLocales(locales interface{}) []string { return TnIntlCanonicalList(locales) }

// supportedLocalesOf: the requested locales that resolve to generated data
func TnIntlSupportedLocalesOf(locales interface{}) []string {
	out := []string{}
	for _, id := range TnIntlCanonicalList(locales) {
		if tnIntlMatchData(id) != "" {
			out = append(out, id)
		}
	}
	return out
}

// Rendering digit runs with a numbering system's digits (0-9, one rune each)
func tnIntlMapDigits(s string, digits string) string {
	if digits == "" {
		return s
	}
	native := []rune(digits)
	if len(native) != 10 {
		return s
	}
	var b strings.Builder
	for _, c := range s {
		if c >= '0' && c <= '9' {
			b.WriteRune(native[c-'0'])
			continue
		}
		b.WriteRune(c)
	}
	return b.String()
}

// The default locale: the OS's (tnIntlSystemLocale — the env on Unix,
// GetUserDefaultLocaleName on Windows), canonicalized, else en-US
var tnIntlDefaultOnce sync.Once
var tnIntlDefaultIDValue string

func tnIntlDefaultID() string {
	tnIntlDefaultOnce.Do(func() {
		id := strings.TrimSpace(tnIntlSystemLocale())
		if c, ok := tnIntlCanonicalTag(id); ok && tnIntlMatchData(c) != "" {
			tnIntlDefaultIDValue = c
			return
		}
		tnIntlDefaultIDValue = "en-US"
	})
	return tnIntlDefaultIDValue
}

// --- plural rules (golang.org/x/text/feature/plural)

func tnIntlPluralName(f xplural.Form) string {
	switch f {
	case xplural.Zero:
		return "zero"
	case xplural.One:
		return "one"
	case xplural.Two:
		return "two"
	case xplural.Few:
		return "few"
	case xplural.Many:
		return "many"
	}
	return "other"
}

// The plural operands of a rendered number's digits ("1234.50")
func tnIntlPluralOperands(digits string) (i, v, w, f, t int) {
	intPart, frac := digits, ""
	if dot := strings.IndexByte(digits, '.'); dot >= 0 {
		intPart, frac = digits[:dot], digits[dot+1:]
	}
	intPart = strings.TrimLeft(intPart, "0")
	if intPart == "" {
		intPart = "0"
	}
	i64, _ := strconv.ParseInt(intPart, 10, 62)
	i = int(i64)
	v = len(frac)
	f64, _ := strconv.ParseInt("1"+frac, 10, 62)
	f = int(f64) - 1
	trimmed := strings.TrimRight(frac, "0")
	w = len(trimmed)
	if trimmed == "" {
		t = 0
	} else {
		t64, _ := strconv.ParseInt("1"+trimmed, 10, 62)
		t = int(t64) - 1
	}
	return i, v, w, f, t
}

// The cardinal plural category of a rendered number string
func tnIntlPluralOfDigits(tag xlanguage.Tag, digits string) string {
	i, v, w, f, t := tnIntlPluralOperands(digits)
	return tnIntlCardinal(tag, i, v, w, f, t)
}

// The cardinal category: golang.org/x/text's rules with the CLDR changes
// since its data (CLDR 38: "many" for millions in fr / es / it / pt / ca;
// CLDR 42: Hebrew without "many", fractions below 1 "one")
func tnIntlCardinal(tag xlanguage.Tag, i, v, w, f, t int) string {
	base, _ := tag.Base()
	switch base.String() {
	case "fr", "es", "it", "pt", "ca":
		if v == 0 && i != 0 && i%1000000 == 0 {
			return "many"
		}
	case "he", "iw":
		switch {
		case (i == 1 && v == 0) || (i == 0 && v != 0):
			return "one"
		case i == 2 && v == 0:
			return "two"
		}
		return "other"
	}
	return tnIntlPluralName(xplural.Cardinal.MatchPlural(tag, i, v, w, f, t))
}

// The plural category of a JS number (the digits its string form shows)
func tnIntlPluralOfNumber(tag xlanguage.Tag, x float64) string {
	if math.IsNaN(x) || math.IsInf(x, 0) || math.Abs(x) >= 1e21 {
		return "other"
	}
	s := strconv.FormatFloat(math.Abs(x), 'f', -1, 64)
	return tnIntlPluralOfDigits(tag, s)
}

// Intl.supportedValuesOf
func TnIntlSupportedValuesOf(kind string) []string {
	switch kind {
	case "calendar":
		return tnIntlCalendars
	case "currency":
		return tnIntlCurrencies
	case "numberingSystem":
		return tnIntlNumberings
	case "timeZone":
		return tnIntlTimeZones
	case "unit":
		return tnIntlUnits
	}
	panic(TnNodeError("RangeError", "", "Invalid key: "+kind))
}`;

const intlLocaleOSWindows = `// The system locale on Windows: GetUserDefaultLocaleName (Node asks ICU for
// the OS locale), then the env vars
func tnIntlSystemLocale() string {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	if proc := kernel32.NewProc("GetUserDefaultLocaleName"); proc.Find() == nil {
		buf := make([]uint16, 85)
		n, _, _ := proc.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
		if n > 1 {
			return syscall.UTF16ToString(buf[:n-1])
		}
	}
	return tnIntlEnvLocale()
}

func tnIntlEnvLocale() string {
	for _, name := range []string{"LC_ALL", "LC_MESSAGES", "LANG"} {
		if v := os.Getenv(name); v != "" {
			v = strings.SplitN(v, ".", 2)[0]
			if v != "C" && v != "POSIX" {
				return strings.ReplaceAll(v, "_", "-")
			}
		}
	}
	return ""
}`;

const intlLocaleOSOther = `// The system locale: the env vars (LC_ALL, LC_MESSAGES, LANG), "" if none
func tnIntlSystemLocale() string {
	for _, name := range []string{"LC_ALL", "LC_MESSAGES", "LANG"} {
		if v := os.Getenv(name); v != "" {
			v = strings.SplitN(v, ".", 2)[0]
			if v != "C" && v != "POSIX" {
				return strings.ReplaceAll(v, "_", "-")
			}
		}
	}
	return ""
}`;

const intlNumberSymsGo = `// Intl: the number symbol tables (keyed by generated locale; every resolved
// data locale is present, with en as the guard)
func tnIntlNumSym(data string, key string) string {
	if m := tnIntlNumberNames[data]; m != nil {
		if v, ok := m[key]; ok {
			return v
		}
	}
	if m := tnIntlNumberNames["en"]; m != nil {
		return m[key]
	}
	return ""
}

func tnIntlNumParts(data string) map[string][]tnIntlPart {
	if m := tnIntlNumberParts[data]; m != nil {
		return m
	}
	return tnIntlNumberParts["en"]
}

// The digits a locale formats with: its -u-nu- numbering system's, else the
// locale's own ("" = latin)
func tnIntlDigitsFor(loc *TnIntlLoc) string {
	if nu := loc.tag.TypeForKey("nu"); nu != "" {
		if d, ok := tnIntlNumberingDigits[nu]; ok {
			return d
		}
		return ""
	}
	return tnIntlNumSym(loc.data, "digits")
}
`;

const intlNumberGo = `// Intl.NumberFormat: digits and rounding on the exact decimal expansion of
// the double (as V8 rounds), then the locale's symbols and patterns

type TnIntlNumberFormat struct {
	loc             *TnIntlLoc
	style           string
	currency        string
	currencyDisplay string
	unit            string
	unitDisplay     string
	notation        string
	compactDisplay  string
	minInt          int
	minFD, maxFD    int
	useSD           bool
	minSD, maxSD    int
	mode            string
	increment       int
	trailing        string
	sign            string
	grouping        string
	compactAuto     bool // compact notation without digit options
}

var tnIntlRoundingModes = map[string]bool{"ceil": true, "floor": true, "expand": true, "trunc": true, "halfExpand": true, "halfCeil": true, "halfFloor": true, "halfTrunc": true, "halfEven": true}
var tnIntlIncrements = map[string]bool{"1": true, "2": true, "5": true, "10": true, "20": true, "25": true, "50": true, "100": true, "200": true, "250": true, "500": true, "1000": true, "2000": true, "2500": true, "5000": true}

// A currency's fraction digits (tnIntlCurrencyDigits lists those that aren't 2)
func tnIntlCurrencyFD(code string) int {
	if d, ok := tnIntlCurrencyDigits[code]; ok {
		n, _ := strconv.Atoi(d)
		return n
	}
	return 2
}

// new Intl.NumberFormat(locales, options)
func TnNewIntlNumberFormat(locales interface{}, options interface{}) *TnIntlNumberFormat {
	f := &TnIntlNumberFormat{
		loc:             TnIntlResolve(locales),
		style:           "decimal",
		currencyDisplay: "symbol",
		unitDisplay:     "short",
		notation:        "standard",
		compactDisplay:  "short",
		minInt:          1,
		minFD:           0,
		maxFD:           3,
		mode:            "halfExpand",
		increment:       1,
		trailing:        "auto",
		sign:            "auto",
		grouping:        "auto",
	}
	f.style = tnIntlOptionChoice(options, "style", f.style, "decimal", "percent", "currency", "unit")
	if f.style == "currency" {
		code, ok := tnIntlOptStr(options, "currency")
		if !ok || code == "" {
			panic(TnNodeError("TypeError", "", "Currency code is required"))
		}
		code = strings.ToUpper(code)
		if !tnIntlHasString(tnIntlCurrencies, code) {
			tnIntlRangeError("Invalid currency code")
		}
		f.currency = code
		f.currencyDisplay = tnIntlOptionChoice(options, "currencyDisplay", "symbol", "symbol", "narrowSymbol", "code", "name")
	}
	if f.style == "unit" {
		unit, ok := tnIntlOptStr(options, "unit")
		if !ok || unit == "" {
			panic(TnNodeError("TypeError", "", "Unit is required"))
		}
		// a sanctioned unit, or two joined by -per- (kilometer-per-hour)
		num, den, per := strings.Cut(unit, "-per-")
		if !tnIntlHasString(tnIntlUnits, num) || (per && !tnIntlHasString(tnIntlUnits, den)) {
			tnIntlRangeError("Invalid unit argument for Intl.NumberFormat() '" + unit + "'")
		}
		f.unit = unit
		f.unitDisplay = tnIntlOptionChoice(options, "unitDisplay", "short", "short", "long", "narrow")
	}
	f.notation = tnIntlOptionChoice(options, "notation", "standard", "standard", "scientific", "engineering", "compact")
	if f.notation == "compact" {
		f.compactDisplay = tnIntlOptionChoice(options, "compactDisplay", "short", "short", "long")
	}
	// significant digits override the fraction digits
	if v, ok := tnIntlOptFloat(options, "minimumSignificantDigits"); ok {
		n := int(v)
		if v != math.Trunc(v) || n < 1 || n > 21 {
			tnIntlRangeError("minimumSignificantDigits value is out of range.")
		}
		f.useSD, f.minSD = true, n
		if v, ok := tnIntlOptFloat(options, "maximumSignificantDigits"); ok {
			n := int(v)
			if v != math.Trunc(v) || n < f.minSD || n > 21 {
				tnIntlRangeError("maximumSignificantDigits value is out of range.")
			}
			f.maxSD = n
		} else {
			f.maxSD = 21
		}
	} else if v, ok := tnIntlOptFloat(options, "maximumSignificantDigits"); ok {
		n := int(v)
		if v != math.Trunc(v) || n < 1 || n > 21 {
			tnIntlRangeError("maximumSignificantDigits value is out of range.")
		}
		f.useSD, f.minSD, f.maxSD = true, 1, n
	}
	if !f.useSD {
		switch f.notation {
		case "scientific", "engineering":
			f.minFD, f.maxFD = 0, 3
		case "compact":
			f.minFD, f.maxFD = 0, 1
		}
	}
	if mode, ok := tnIntlOptStr(options, "roundingMode"); ok {
		if !tnIntlRoundingModes[mode] {
			tnIntlRangeError("Invalid roundingMode: " + mode)
		}
		f.mode = mode
	}
	if inc, ok := tnIntlOptFloat(options, "roundingIncrement"); ok {
		n := int(inc)
		if inc != math.Trunc(inc) || !tnIntlIncrements[strconv.Itoa(n)] {
			tnIntlRangeError("roundingIncrement value is out of range.")
		}
		f.increment = n
		if f.useSD {
			tnIntlRangeError("roundingIncrement with significant digits is out of range.")
		}
		// with an increment, minimum and maximum fraction digits are equal
		mn, mnok := tnIntlOptFloat(options, "minimumFractionDigits")
		mx, mxok := tnIntlOptFloat(options, "maximumFractionDigits")
		if mnok && mxok && int(mn) != int(mx) {
			tnIntlRangeError("roundingIncrement needs equal minimum and maximum fraction digits")
		}
		d := mn
		if !mnok {
			d = mx
		}
		if d != math.Trunc(d) || int(d) < 0 || int(d) > 20 {
			tnIntlRangeError("minimumFractionDigits value is out of range.")
		}
		f.minFD, f.maxFD = int(d), int(d)
	}
	if !f.useSD && f.increment == 1 {
		if v, ok := tnIntlOptFloat(options, "minimumIntegerDigits"); ok {
			n := int(v)
			if v != math.Trunc(v) || n < 1 || n > 21 {
				tnIntlRangeError("minimumIntegerDigits value is out of range.")
			}
			f.minInt = n
		}
		mn, mnok := tnIntlOptFloat(options, "minimumFractionDigits")
		if mnok {
			n := int(mn)
			if mn != math.Trunc(mn) || n < 0 || n > 20 {
				tnIntlRangeError("minimumFractionDigits value is out of range.")
			}
			f.minFD = n
		}
		mx, mxok := tnIntlOptFloat(options, "maximumFractionDigits")
		if mxok {
			n := int(mx)
			if mx != math.Trunc(mx) || n < 0 || n > 20 || n < f.minFD {
				tnIntlRangeError("maximumFractionDigits value is out of range.")
			}
			f.maxFD = n
		}
		// the defaults (SetNumberFormatDigitOptions): decimal 0-3, currency
		// its digits (2, JPY 0, KWD 3 …), percent 0-0; compact rounds to 0
		// fraction digits or 2 significant digits, whichever keeps more
		defMin, defMax := 0, 3
		switch f.style {
		case "currency":
			defMin = tnIntlCurrencyFD(f.currency)
			defMax = defMin
		case "percent":
			defMin, defMax = 0, 0
		}
		switch {
		case !mnok && !mxok:
			if f.notation == "compact" {
				defMin, defMax = 0, 0
				f.compactAuto = true
			}
			f.minFD, f.maxFD = defMin, defMax
		case mnok && !mxok:
			f.maxFD = max(defMax, f.minFD)
		case mxok && !mnok:
			f.minFD = min(defMin, f.maxFD)
		}
	}
	f.trailing = tnIntlOptionChoice(options, "trailingZeroDisplay", "auto", "auto", "stripIfInteger")
	f.sign = tnIntlOptionChoice(options, "signDisplay", "auto", "auto", "always", "never", "exceptZero", "negative")
	if f.notation == "compact" {
		f.grouping = "min2" // compact's default
	}
	if v, ok := tnIntlOptStr(options, "useGrouping"); ok {
		if v != "true" && v != "false" && v != "min2" && v != "always" && v != "auto" {
			tnIntlRangeError("useGrouping value is out of range.")
		}
		f.grouping = v
	} else if options != nil {
		if gv := TnGetValue(options, "useGrouping"); gv != nil {
			if TnTruthy(gv) {
				f.grouping = "true"
			} else {
				f.grouping = "false"
			}
		}
	}
	return f
}

// The decimal digits of the absolute value of a finite double, as ICU reads
// a double: its shortest round-trip form ("1234.5678", "0.0000001", "1e21" →
// "1000000000000000000000"), so 1.005 rounds to 1.01 as in Node
func tnFloatDigits(x float64) string {
	if x == 0 {
		return "0"
	}
	s := strconv.FormatFloat(x, 'e', -1, 64)
	mant, expStr, _ := strings.Cut(s, "e")
	exp, _ := strconv.Atoi(expStr)
	digits := strings.Replace(mant, ".", "", 1)
	// digits is d.ddd × 10^exp: the point sits after exp+1 digits
	point := exp + 1
	switch {
	case point <= 0:
		return "0." + strings.Repeat("0", -point) + digits
	case point >= len(digits):
		return digits + strings.Repeat("0", point-len(digits))
	}
	return digits[:point] + "." + digits[point:]
}

var tnIntlPow10Cache = map[int]*tnbig.Int{0: tnbig.NewInt(1)}

func tnIntlPow10(k int) *tnbig.Int {
	if k < 0 {
		k = 0
	}
	if v, ok := tnIntlPow10Cache[k]; ok {
		return v
	}
	v := new(tnbig.Int).Mul(tnIntlPow10(k-1), tnbig.NewInt(10))
	tnIntlPow10Cache[k] = v
	return v
}

// One rounding step: q + r/div rounded by the mode (a non-negative value)
func tnIntlRoundQuotient(q, r, div *tnbig.Int, mode string) *tnbig.Int {
	cmp := new(tnbig.Int).Mul(r, tnbig.NewInt(2)).Cmp(div)
	up := false
	switch mode {
	case "ceil", "expand":
		up = r.Sign() > 0
	case "floor", "trunc":
		up = false
	case "halfExpand":
		up = cmp >= 0
	case "halfCeil", "halfFloor", "halfTrunc":
		up = cmp > 0
	case "halfEven":
		if cmp > 0 {
			up = true
		} else if cmp == 0 {
			up = q.Bit(0) == 1
		}
	}
	if up {
		return new(tnbig.Int).Add(q, tnbig.NewInt(1))
	}
	return q
}

// Round |value| (the digit string with fracLen fraction digits) to maxFD
// fraction digits, with an optional increment quantum, by the mode, on the
// exact expansion. Returns the rounded digits with exactly maxFD fraction
// digits (no decimal point)
func tnIntlRound(digits string, fracLen int, maxFD int, mode string, increment int) string {
	n := new(tnbig.Int)
	if digits != "" {
		n.SetString(digits, 10)
	}
	target := n
	if maxFD > fracLen {
		target = new(tnbig.Int).Mul(n, tnIntlPow10(maxFD-fracLen))
	} else if maxFD < fracLen {
		q, r := new(tnbig.Int).QuoRem(n, tnIntlPow10(fracLen-maxFD), new(tnbig.Int))
		target = tnIntlRoundQuotient(q, r, tnIntlPow10(fracLen-maxFD), mode)
	}
	if increment > 1 {
		// the quantum is inc × 10^-maxFD: the scaled value is a multiple of inc
		q, r := new(tnbig.Int).QuoRem(target, tnbig.NewInt(int64(increment)), new(tnbig.Int))
		q = tnIntlRoundQuotient(q, r, tnbig.NewInt(int64(increment)), mode)
		target = new(tnbig.Int).Mul(q, tnbig.NewInt(int64(increment)))
	}
	s := target.String()
	if len(s) <= maxFD {
		s = strings.Repeat("0", maxFD-len(s)+1) + s
	}
	return s
}

// Whether rounding the kept digits up by the rest (digits beyond the kept
// ones) moves the last kept digit up (possibly carrying)
func tnIntlRoundRest(kept, rest, mode string) bool {
	if rest == "" {
		return false
	}
	allHalf := rest[0] == '5' && strings.Trim(rest[1:], "0") == ""
	beyond := strings.Trim(rest, "0") != ""
	switch mode {
	case "ceil", "expand":
		return beyond
	case "floor", "trunc":
		return false
	case "halfExpand":
		return rest[0] > '5' || (rest[0] == '5' && (beyond || allHalf))
	case "halfCeil", "halfFloor", "halfTrunc":
		return rest[0] > '5' || (rest[0] == '5' && beyond)
	case "halfEven":
		if rest[0] > '5' || (rest[0] == '5' && beyond) {
			return true
		}
		if allHalf {
			return kept[len(kept)-1]%2 == 1
		}
		return false
	}
	return false
}

// Round to significant digits: |x|'s digits rounded to maxSD significant
// digits by the mode, padded to minSD. Returns the digits (no point) and the
// fraction digit count shown
func tnIntlRoundSignificant(intPart, fracPart string, minSD, maxSD int, mode string) (string, int) {
	all := intPart + fracPart
	first := 0
	for first < len(all) && all[first] == '0' {
		first++
	}
	if first == len(all) {
		return strings.Repeat("0", minSD), minSD - 1
	}
	intDigits := len(intPart) - first
	if intDigits < 0 {
		intDigits = 0
	}
	sig := all[first:]
	kept := sig
	carry := false
	if len(sig) > maxSD {
		rest := sig[maxSD:]
		kept = sig[:maxSD]
		carry = tnIntlRoundRest(kept, rest, mode)
	}
	if carry {
		// "999" → "1000": the leading digit shifts
		kept = "1" + strings.Repeat("0", maxSD-1)
		intDigits++
	}
	if len(kept) < minSD {
		kept += strings.Repeat("0", minSD-len(kept))
	}
	fracShown := len(kept) - intDigits
	if fracShown < 0 {
		fracShown = 0
	}
	digits := kept
	if intDigits > len(kept) {
		digits = kept + strings.Repeat("0", intDigits-len(kept))
		fracShown = 0
	}
	return digits, fracShown
}

// The locale's grouping sizes ("3", "3;2")
func tnIntlGroupSizes(data string) []int {
	spec := tnIntlNumSym(data, "grpSizes")
	if spec == "" {
		return []int{3}
	}
	out := []int{}
	for _, s := range strings.Split(spec, ";") {
		n, _ := strconv.Atoi(s)
		if n <= 0 {
			n = 3
		}
		out = append(out, n)
	}
	return out
}

// The integer digit groups, left to right, by the locale's sizes
func tnIntlGroupDigits(intPart string, sizes []int, grouping string) []string {
	if grouping == "false" || len(intPart) == 0 || (grouping == "min2" && len(intPart) < 5) {
		return []string{intPart}
	}
	if len(sizes) == 0 {
		return []string{intPart}
	}
	groups := []string{}
	pos := len(intPart)
	size := sizes[0]
	for pos > 0 {
		start := pos - size
		if start < 0 {
			start = 0
		}
		groups = append([]string{intPart[start:pos]}, groups...)
		pos = start
		if len(sizes) > 1 {
			size = sizes[1]
		}
	}
	if grouping == "min2" && len(groups) < 2 {
		return []string{intPart}
	}
	return groups
}

// The rendered number: the sign and its parts — digit groups ('i'), the
// group separators ('g'), the decimal separator ('d') and the fraction ('f')
func tnIntlRenderNumber(f *TnIntlNumberFormat, digits string, point int, fracShown int, negative bool, negativeZero bool) (string, []tnIntlPart) {
	data := f.loc.data
	digitsMap := tnIntlDigitsFor(f.loc)
	intPart := "0"
	if point > 0 && point <= len(digits) {
		intPart = digits[:point]
	} else if point > len(digits) {
		intPart = digits + strings.Repeat("0", point-len(digits))
	}
	intPart = strings.TrimLeft(intPart, "0")
	if intPart == "" {
		intPart = "0"
	}
	for len(intPart) < f.minInt {
		intPart = "0" + intPart
	}
	frac := ""
	if point >= 0 && point < len(digits) {
		frac = digits[point:]
	}
	for len(frac) < fracShown {
		frac += "0"
	}
	if len(frac) > fracShown {
		frac = frac[:fracShown]
	}
	grouping := f.grouping
	if grouping == "auto" {
		grouping = "true"
		if tnIntlNumSym(data, "minGrp") == "2" {
			grouping = "min2"
		}
	}
	parts := []tnIntlPart{}
	for i, g := range tnIntlGroupDigits(intPart, tnIntlGroupSizes(data), grouping) {
		if i > 0 {
			parts = append(parts, tnIntlPart{kind: 'g', text: tnIntlNumSym(data, "grp")})
		}
		parts = append(parts, tnIntlPart{kind: 'i', text: tnIntlMapDigits(g, digitsMap)})
	}
	if frac != "" {
		parts = append(parts, tnIntlPart{kind: 'd', text: tnIntlNumSym(data, "dec")})
		parts = append(parts, tnIntlPart{kind: 'f', text: tnIntlMapDigits(frac, digitsMap)})
	}
	sign := ""
	switch f.sign {
	case "auto":
		if negative || negativeZero {
			sign = tnIntlNumSym(data, "minus")
		}
	case "always":
		if negative || negativeZero {
			sign = tnIntlNumSym(data, "minus")
		} else {
			sign = tnIntlNumSym(data, "plus")
		}
	case "exceptZero":
		// (zero — rounded to zero too — shows no sign)
		if strings.Trim(intPart+frac, "0") == "" {
			break
		}
		if negative {
			sign = tnIntlNumSym(data, "minus")
		} else {
			sign = tnIntlNumSym(data, "plus")
		}
	case "negative":
		if negative && strings.Trim(intPart+frac, "0") != "" {
			sign = tnIntlNumSym(data, "minus")
		}
	}
	return sign, parts
}

// A value as (the exact |digits|, their fraction length, sign, negative zero)
func tnIntlNumberDigits(f *TnIntlNumberFormat, x interface{}) (string, int, bool, bool, bool, bool) {
	switch v := x.(type) {
	case *tnbig.Int:
		neg := v.Sign() < 0
		digits := new(tnbig.Int).Abs(v).String()
		return digits, 0, neg, false, false, false
	case float64:
		if math.IsNaN(v) {
			return "", 0, false, false, true, false
		}
		if math.IsInf(v, 0) {
			return "", 0, v < 0, false, false, true
		}
		neg := math.Signbit(v)
		if v == 0 {
			return "0", 1, neg, neg, false, false
		}
		d := tnFloatDigits(math.Abs(v))
		fracLen := 0
		if dot := strings.IndexByte(d, '.'); dot >= 0 {
			d = d[:dot] + d[dot+1:]
			fracLen = len(d) - dot
		}
		if f.style == "percent" {
			// the value × 100 before rounding
			fracLen -= 2
			for fracLen < 0 {
				d += "0"
				fracLen++
			}
		}
		return d, fracLen, neg, false, false, false
	}
	return tnIntlNumberDigits(f, TnNumber(x))
}

// The digits, integer-digit count and fraction digits shown after rounding
func tnIntlRoundStandard(f *TnIntlNumberFormat, digits string, fracLen int) (string, int, int) {
	if f.useSD {
		intPart, fracPart := "", ""
		if fracLen > 0 && fracLen <= len(digits) {
			intPart, fracPart = digits[:len(digits)-fracLen], digits[len(digits)-fracLen:]
		} else {
			intPart = digits
		}
		d, frac := tnIntlRoundSignificant(intPart, fracPart, f.minSD, f.maxSD, f.mode)
		return d, len(d) - frac, frac
	}
	rounded := tnIntlRound(digits, fracLen, f.maxFD, f.mode, f.increment)
	point := len(rounded) - f.maxFD
	if point < 0 {
		point = 0
	}
	frac := f.maxFD
	fracDigits := rounded[point:]
	// trailing zeros beyond the minimum disappear
	for frac > f.minFD && strings.HasSuffix(fracDigits, "0") {
		frac--
		fracDigits = fracDigits[:len(fracDigits)-1]
	}
	if f.trailing == "stripIfInteger" && strings.Trim(fracDigits, "0") == "" {
		frac = 0
	}
	return rounded, point, frac
}

// The currency template's key prefix and the value its currency part takes
// ("" keeps the generated symbol). Currencies without generated symbols show
// their ISO code, as ICU does for codes it has no symbol for
func tnIntlCurrencyTemplate(f *TnIntlNumberFormat, cat string) (string, string) {
	all := tnIntlNumParts(f.loc.data)
	switch f.currencyDisplay {
	case "code":
		return "curCode:", f.currency
	case "name":
		name := tnIntlNumSym(f.loc.data, "curName:"+f.currency+":"+cat)
		if name == "" {
			name = tnIntlNumSym(f.loc.data, "curName:"+f.currency+":other")
		}
		if name == "" {
			name = f.currency
		}
		return "curNm", name
	case "narrowSymbol":
		if _, ok := all["curNar:"+f.currency+":P"]; ok {
			return "curNar:" + f.currency + ":", ""
		}
	default:
		if _, ok := all["cur:"+f.currency+":P"]; ok {
			return "cur:" + f.currency + ":", ""
		}
	}
	return "curCode:", f.currency
}

// The currency symbol a range shows (its templates are shared by currencies)
func tnIntlCurrencySymbol(f *TnIntlNumberFormat) string {
	prefix, value := tnIntlCurrencyTemplate(f, "other")
	if value != "" {
		return value
	}
	for _, p := range tnIntlTemplate(f.loc.data, prefix) {
		if p.kind == 'C' && p.text != "" {
			return p.text
		}
	}
	return f.currency
}

// A template by its key prefix (the P/N suffix picked by the sign)
func tnIntlTemplate(data string, prefix string) []tnIntlPart {
	all := tnIntlNumParts(data)
	if tpl, ok := all[prefix+"P"]; ok {
		return tpl
	}
	if tpl, ok := all[prefix]; ok {
		return tpl
	}
	return all["decP"]
}

// The negative variant of a template: the minus sign part in front
func tnIntlNegTemplate(tpl []tnIntlPart) []tnIntlPart {
	for _, p := range tpl {
		if p.kind == 'M' {
			return nil // already the negative template
		}
	}
	out := make([]tnIntlPart, 0, len(tpl)+1)
	out = append(out, tnIntlPart{kind: 'M'})
	return append(out, tpl...)
}

// A number's parts as JS parts (the integer/group/decimal/fraction kinds)
func tnIntlNumJSParts(num []tnIntlPart, unitTag string) []interface{} {
	out := []interface{}{}
	for _, p := range num {
		kind := "integer"
		switch p.kind {
		case 'g':
			kind = "group"
		case 'd':
			kind = "decimal"
		case 'f':
			kind = "fraction"
		}
		m := tnIntlObj("type", kind, "value", p.text)
		if unitTag != "" {
			m.Set("unit", unitTag)
		}
		out = append(out, m)
	}
	return out
}

// Expanding a number template into parts
func tnIntlNumberEmit(f *TnIntlNumberFormat, sign string, num []tnIntlPart, tpl []tnIntlPart, currencyValue string, skipSign bool) []interface{} {
	data := f.loc.data
	out := []interface{}{}
	// the sign goes first when the template doesn't carry it (signDisplay
	// always / exceptZero render "+$1.00")
	if (f.sign == "always" || f.sign == "exceptZero") && !skipSign && sign != "" && (len(tpl) == 0 || tpl[0].kind != 'M') {
		out = append(out, tnIntlObj("type", "plusSign", "value", sign))
		skipSign = true
	}
	for _, p := range tpl {
		switch p.kind {
		case 'N':
			out = append(out, tnIntlNumJSParts(num, "")...)
		case 'M':
			if !skipSign && sign != "" {
				out = append(out, tnIntlObj("type", "minusSign", "value", sign))
			}
		case 'P':
			if !skipSign && sign != "" {
				out = append(out, tnIntlObj("type", "plusSign", "value", sign))
			}
		case 'C':
			v := p.text
			if currencyValue != "" {
				v = currencyValue
			}
			out = append(out, tnIntlObj("type", "currency", "value", v))
		case 'p':
			out = append(out, tnIntlObj("type", "percentSign", "value", p.text))
		case 'U':
			out = append(out, tnIntlObj("type", "unit", "value", p.text))
		case 'K':
			out = append(out, tnIntlObj("type", "compact", "value", p.text))
		case 'E':
			out = append(out, tnIntlObj("type", "exponentSeparator", "value", p.text))
		case 'X':
			out = append(out, tnIntlObj("type", "exponentMinusSign", "value", tnIntlNumSym(data, "minus")))
		case 'x':
			out = append(out, tnIntlObj("type", "exponentInteger", "value", tnIntlMapDigits(p.text, tnIntlDigitsFor(f.loc))))
		default:
			if p.text != "" {
				out = append(out, tnIntlObj("type", "literal", "value", p.text))
			}
		}
	}
	return out
}

// The parts of a formatted number (the standard notation)
func TnIntlNumberFormatParts(f *TnIntlNumberFormat, x interface{}) []interface{} {
	value, fracLen, negative, negativeZero, isNaN, isInf := tnIntlNumberDigits(f, x)
	data := f.loc.data
	if isNaN {
		return []interface{}{tnIntlObj("type", "literal", "value", "NaN")}
	}
	if isInf {
		out := []interface{}{}
		if negative && f.sign != "never" {
			out = append(out, tnIntlObj("type", "literal", "value", tnIntlNumSym(data, "minus")))
		}
		out = append(out, tnIntlObj("type", "literal", "value", tnIntlNumSym(data, "inf")))
		return out
	}
	digits, point, fracShown := tnIntlRoundStandard(f, value, fracLen)
	sign, num := tnIntlRenderNumber(f, digits, point, fracShown, negative, negativeZero)
	cat := tnIntlPluralOfDigits(f.loc.tag, tnIntlShown(digits, point, fracShown))
	prefix := "dec"
	currencyValue := ""
	switch f.style {
	case "percent":
		prefix = "pct"
	case "currency":
		prefix, currencyValue = tnIntlCurrencyTemplate(f, cat)
	case "unit":
		prefix = "u:" + f.unit + ":" + f.unitDisplay[0:1] + ":" + cat
	}
	tpl := tnIntlTemplate(data, prefix)
	if negative || (negativeZero && (f.sign == "auto" || f.sign == "always" || f.sign == "exceptZero")) {
		// the locale's own negative pattern (nl "€ -1.234,56"), else the minus in front
		if neg, ok := tnIntlNumParts(data)[prefix+"N"]; ok {
			tpl = neg
		} else if neg := tnIntlNegTemplate(tpl); neg != nil {
			tpl = neg
		}
	}
	skipSign := f.sign == "never" || (f.sign == "negative" && !negative && !negativeZero)
	return tnIntlNumberEmit(f, sign, num, tpl, currencyValue, skipSign)
}

// The number as shown: the integer digits and the fraction digits displayed
// ("1" for 1 at three fraction digits, not "1.000": the plural operands)
func tnIntlShown(digits string, point int, fracShown int) string {
	intPart, frac := "0", ""
	switch {
	case point > len(digits):
		intPart = digits + strings.Repeat("0", point-len(digits))
	case point > 0:
		intPart, frac = digits[:point], digits[point:]
	default:
		frac = digits
	}
	for len(frac) < fracShown {
		frac += "0"
	}
	if len(frac) > fracShown {
		frac = frac[:fracShown]
	}
	if frac == "" {
		return intPart
	}
	return intPart + "." + frac
}

func tnIntlPointed(digits string, point int) string {
	if point > 0 && point <= len(digits) {
		return digits[:point] + "." + digits[point:]
	}
	return digits
}

// The exponent of a value from its digits and integer-digit count (the
// position of its first significant digit: "000012" with point 1 is 1.2E-4)
func tnIntlExponentOf(digits string, point int) int {
	for i := 0; i < len(digits); i++ {
		if digits[i] != '0' {
			return point - 1 - i
		}
	}
	return 0
}

// The parts with notation scientific / engineering
func TnIntlNumberFormatSci(f *TnIntlNumberFormat, x interface{}) []interface{} {
	value, fracLen, negative, negativeZero, isNaN, isInf := tnIntlNumberDigits(f, x)
	data := f.loc.data
	if isNaN || isInf {
		return TnIntlNumberFormatParts(f, x)
	}
	point := len(value) - fracLen
	exp := tnIntlExponentOf(value, point)
	if f.notation == "engineering" {
		exp = exp - ((exp%3)+3)%3
	}
	// the mantissa: the point moved left by the exponent (one integer digit;
	// one to three for engineering)
	mant := value
	mantPoint := point - exp
	if mantPoint > len(mant) {
		mant += strings.Repeat("0", mantPoint-len(mant))
	} else if mantPoint <= 0 {
		mant = strings.Repeat("0", 1-mantPoint) + mant
		mantPoint = 1
	}
	mantFracLen := len(mant) - mantPoint
	if mantFracLen < 0 {
		mantFracLen = 0
	}
	md, mpoint, mfrac := tnIntlRoundStandard(f, mant, mantFracLen)
	sign, num := tnIntlRenderNumber(f, md, mpoint, mfrac, negative, negativeZero)
	tpl := tnIntlTemplate(data, "sci")
	if negative || (negativeZero && (f.sign == "auto" || f.sign == "always" || f.sign == "exceptZero")) {
		if neg := tnIntlNegTemplate(tpl); neg != nil {
			tpl = neg
		}
	}
	skipSign := f.sign == "never" || (f.sign == "negative" && !negative && !negativeZero)
	expDigits := strconv.Itoa(exp)
	if exp < 0 {
		expDigits = strconv.Itoa(-exp)
	}
	out := []interface{}{}
	for _, p := range tpl {
		switch p.kind {
		case 'N':
			out = append(out, tnIntlNumJSParts(num, "")...)
		case 'M':
			if !skipSign && sign != "" {
				out = append(out, tnIntlObj("type", "minusSign", "value", sign))
			}
		case 'P':
			if !skipSign && sign != "" {
				out = append(out, tnIntlObj("type", "plusSign", "value", sign))
			}
		case 'E':
			out = append(out, tnIntlObj("type", "exponentSeparator", "value", p.text))
		case 'X':
			if exp < 0 {
				out = append(out, tnIntlObj("type", "exponentMinusSign", "value", tnIntlNumSym(data, "minus")))
			}
		case 'x':
			out = append(out, tnIntlObj("type", "exponentInteger", "value", tnIntlMapDigits(expDigits, tnIntlDigitsFor(f.loc))))
		default:
			if p.text != "" {
				out = append(out, tnIntlObj("type", "literal", "value", p.text))
			}
		}
	}
	return out
}

// The parts with notation compact
func TnIntlNumberFormatCompact(f *TnIntlNumberFormat, x interface{}) []interface{} {
	value, fracLen, negative, negativeZero, isNaN, isInf := tnIntlNumberDigits(f, x)
	if isNaN || isInf {
		return TnIntlNumberFormatParts(f, x)
	}
	point := len(value) - fracLen
	exp := tnIntlExponentOf(value, point)
	p := exp
	if p > 14 {
		p = 14 // beyond the table: the trillions' pattern ("1000T")
	}
	styleKey := map[string]string{"short": "S", "long": "L"}[f.compactDisplay]
	divisor := -1
	if p >= 3 {
		// (the locale's own table only: en's thousands don't apply to de)
		if d, ok := tnIntlNumberNames[f.loc.data]["cmpD:"+styleKey+":"+strconv.Itoa(p)]; ok {
			divisor, _ = strconv.Atoi(d)
		}
	}
	// the rounding: the options', or (compactAuto) 0 fraction digits when
	// the mantissa has two integer digits or more, else 2 significant digits
	rounder := func(intDigits int) *TnIntlNumberFormat {
		if !f.compactAuto {
			return f
		}
		g := *f
		g.useSD, g.minFD, g.maxFD = false, 0, 0
		if intDigits < 2 {
			g.maxFD = 1
		}
		return &g
	}
	if divisor < 0 {
		// no compact pattern for this magnitude (below 1000, de's 1000): plain
		g := rounder(max(point, 1))
		digits, dpoint, dfrac := tnIntlRoundStandard(g, value, fracLen)
		sign, num := tnIntlRenderNumber(g, digits, dpoint, dfrac, negative, negativeZero)
		tpl := tnIntlTemplate(f.loc.data, "dec")
		if negative || (negativeZero && (f.sign == "auto" || f.sign == "always" || f.sign == "exceptZero")) {
			if neg := tnIntlNegTemplate(tpl); neg != nil {
				tpl = neg
			}
		}
		return tnIntlNumberEmit(f, sign, num, tpl, "", f.sign == "never" || (f.sign == "negative" && !negative && !negativeZero))
	}
	// the mantissa: the digits divided by 10^divisor
	mantPoint := point - divisor
	mant := value
	if mantPoint <= 0 {
		mant = strings.Repeat("0", 1-mantPoint) + mant
		mantPoint = 1
	}
	mantFracLen := len(mant) - mantPoint
	if mantFracLen < 0 {
		mant += strings.Repeat("0", -mantFracLen)
		mantFracLen = 0
	}
	g := rounder(len(strings.TrimLeft(mant[:mantPoint], "0")))
	md, mpoint, mfrac := tnIntlRoundStandard(g, mant, mantFracLen)
	// the mantissa's grouping is min2 unless turned off (beyond the pattern
	// table ICU keeps grouping off until two groups fit: "1000T", "10,000T")
	f2 := *g
	if f2.grouping != "false" {
		f2.grouping = "min2"
	}
	sign, num := tnIntlRenderNumber(&f2, md, mpoint, mfrac, negative, negativeZero)
	cat := tnIntlPluralOfDigits(f.loc.tag, tnIntlShown(md, mpoint, mfrac))
	tpl := tnIntlNumParts(f.loc.data)["cmp:"+styleKey+":"+strconv.Itoa(p)+":"+cat]
	if tpl == nil {
		tpl = tnIntlNumParts(f.loc.data)["cmp:"+styleKey+":"+strconv.Itoa(p)+":other"]
	}
	if tpl == nil {
		tpl = tnIntlTemplate(f.loc.data, "dec")
	}
	// (the compact templates are the positive ones: a minus goes in front)
	if negative || (negativeZero && (f.sign == "auto" || f.sign == "always" || f.sign == "exceptZero")) {
		if neg := tnIntlNegTemplate(tpl); neg != nil {
			tpl = neg
		}
	}
	out := []interface{}{}
	skipSign := f.sign == "never" || (f.sign == "negative" && !negative && !negativeZero)
	if (f.sign == "always" || f.sign == "exceptZero") && !skipSign && sign != "" && (len(tpl) == 0 || tpl[0].kind != 'M') {
		out = append(out, tnIntlObj("type", "plusSign", "value", sign))
		skipSign = true
	}
	for _, p2 := range tpl {
		switch p2.kind {
		case 'N':
			out = append(out, tnIntlNumJSParts(num, "")...)
		case 'M':
			if !skipSign && sign != "" {
				out = append(out, tnIntlObj("type", "minusSign", "value", sign))
			}
		case 'P':
			if !skipSign && sign != "" {
				out = append(out, tnIntlObj("type", "plusSign", "value", sign))
			}
		case 'K':
			out = append(out, tnIntlObj("type", "compact", "value", p2.text))
		default:
			if p2.text != "" {
				out = append(out, tnIntlObj("type", "literal", "value", p2.text))
			}
		}
	}
	return out
}

// The dispatch: the notation decides the shape (ICU renders every finite
// double in full: 1e21 is 1,000,000,000,000,000,000,000)
func TnIntlNumberFormatAny(f *TnIntlNumberFormat, x interface{}) []interface{} {
	switch f.notation {
	case "scientific", "engineering":
		return TnIntlNumberFormatSci(f, x)
	case "compact":
		return TnIntlNumberFormatCompact(f, x)
	}
	return TnIntlNumberFormatParts(f, x)
}

func TnIntlNumberFormatAnyStr(f *TnIntlNumberFormat, x interface{}) string {
	var b strings.Builder
	for _, p := range TnIntlNumberFormatAny(f, x) {
		b.WriteString(TnJSString(tnIntlGet(p, "value")))
	}
	return b.String()
}

// Intl.NumberFormat#format
func TnIntlFormatNumber(f *TnIntlNumberFormat, x interface{}) string {
	return TnIntlNumberFormatAnyStr(f, x)
}

// Intl.NumberFormat#formatRange: the merged template when the two rounded
// values are of one magnitude and sign (one shared currency symbol, as de's
// "1,20–5,70 €"), else the plain concatenation
func TnIntlNumberFormatRangeParts(f *TnIntlNumberFormat, a interface{}, b interface{}) []interface{} {
	data := f.loc.data
	va, fa, na, za, iA, infA := tnIntlNumberDigits(f, a)
	vb, fb, nb, zb, iB, infB := tnIntlNumberDigits(f, b)
	if iA || iB || infA || infB {
		out := TnIntlNumberFormatAny(f, a)
		out = append(out, tnIntlObj("type", "literal", "value", " – "))
		return append(out, TnIntlNumberFormatAny(f, b)...)
	}
	da, pa, sa := tnIntlRoundStandard(f, va, fa)
	db, pb, sb := tnIntlRoundStandard(f, vb, fb)
	sameMag := na == nb && tnIntlMagnitude(da, pa) == tnIntlMagnitude(db, pb)
	key := "rngOther"
	if f.style == "currency" {
		key = "rngOtherCur"
	} else if f.style == "percent" {
		key = "rngOtherPct"
	}
	if sameMag {
		key = "rngSame"
		if f.style == "currency" {
			key = "rngSameCur"
		} else if f.style == "percent" {
			key = "rngSamePct"
		}
	}
	tpl := tnIntlNumParts(data)[key]
	if tpl == nil {
		tpl = tnIntlNumParts(data)["rngOther"]
	}
	signA, numA := tnIntlRenderNumber(f, da, pa, sa, na, za)
	signB, numB := tnIntlRenderNumber(f, db, pb, sb, nb, zb)
	cat := tnIntlPluralOfDigits(f.loc.tag, tnIntlShown(da, pa, sa))
	out := []interface{}{}
	for _, p := range tpl {
		switch p.kind {
		case 'N':
			num := numA
			if p.src == 'e' {
				num = numB
			}
			out = append(out, tnIntlNumJSParts(num, "")...)
		case 'M':
			sign := signA
			if p.src == 'e' {
				sign = signB
			}
			if sign != "" {
				out = append(out, tnIntlObj("type", "minusSign", "value", sign))
			}
		case 'P':
			sign := signA
			if p.src == 'e' {
				sign = signB
			}
			if sign != "" {
				out = append(out, tnIntlObj("type", "plusSign", "value", sign))
			}
		case 'C':
			v := tnIntlCurrencySymbol(f)
			if f.currencyDisplay == "name" {
				v = tnIntlNumSym(data, "curName:"+f.currency+":"+cat)
			}
			out = append(out, tnIntlObj("type", "currency", "value", v))
		case 'p':
			out = append(out, tnIntlObj("type", "percentSign", "value", p.text))
		default:
			if p.text != "" {
				out = append(out, tnIntlObj("type", "literal", "value", p.text))
			}
		}
	}
	return out
}

func tnIntlMagnitude(digits string, point int) int {
	if point > 0 {
		return point - 1
	}
	for i := 0; i < len(digits); i++ {
		if digits[i] != '0' {
			return -(i + 1)
		}
	}
	return 0
}

func TnIntlNumberFormatRange(f *TnIntlNumberFormat, a interface{}, b interface{}) string {
	var bld strings.Builder
	for _, p := range TnIntlNumberFormatRangeParts(f, a, b) {
		bld.WriteString(TnJSString(tnIntlGet(p, "value")))
	}
	return bld.String()
}

// resolvedOptions
// (keys in Node's order)
func (f *TnIntlNumberFormat) resolvedOptions() interface{} {
	return f.tnResolved()
}

// The format method as a value ([1, 2].map(nf.format))
func (f *TnIntlNumberFormat) Get_format() func(interface{}) string {
	return func(x interface{}) string { return TnIntlNumberFormatAnyStr(f, x) }
}

func (f *TnIntlNumberFormat) tnResolved() interface{} {
	out := tnIntlObj()
	out.Set("locale", f.loc.id)
	nu := f.loc.tag.TypeForKey("nu")
	if nu == "" {
		nu = "latn"
	}
	out.Set("numberingSystem", nu)
	out.Set("style", f.style)
	if f.style == "currency" {
		out.Set("currency", f.currency)
		out.Set("currencyDisplay", f.currencyDisplay)
		out.Set("currencySign", "standard")
	}
	if f.style == "unit" {
		out.Set("unit", f.unit)
		out.Set("unitDisplay", f.unitDisplay)
	}
	out.Set("minimumIntegerDigits", float64(f.minInt))
	if f.useSD {
		out.Set("minimumSignificantDigits", float64(f.minSD))
		out.Set("maximumSignificantDigits", float64(f.maxSD))
	} else {
		out.Set("minimumFractionDigits", float64(f.minFD))
		out.Set("maximumFractionDigits", float64(f.maxFD))
	}
	switch f.grouping {
	case "false":
		out.Set("useGrouping", false)
	case "true":
		out.Set("useGrouping", "always")
	default:
		out.Set("useGrouping", f.grouping)
	}
	out.Set("notation", f.notation)
	if f.notation == "compact" {
		out.Set("compactDisplay", f.compactDisplay)
	}
	out.Set("signDisplay", f.sign)
	out.Set("roundingIncrement", float64(f.increment))
	out.Set("roundingMode", f.mode)
	out.Set("roundingPriority", "auto")
	out.Set("trailingZeroDisplay", f.trailing)
	return out
}

// n.toLocaleString(locales, options)
func TnIntlNumLocale(x interface{}, locales interface{}, options interface{}) string {
	f := TnNewIntlNumberFormat(locales, options)
	return TnIntlNumberFormatAnyStr(f, x)
}`;

const intlDateGo = `// Intl.DateTimeFormat: the generated patterns probed by example, with every
// field substituted at run time

// The date name and pattern tables (en as the guard)
func tnIntlName(data string, key string) string {
	if m := tnIntlDateNames[data]; m != nil {
		if v, ok := m[key]; ok {
			return v
		}
	}
	if m := tnIntlDateNames["en"]; m != nil {
		return m[key]
	}
	return ""
}

func tnIntlDatePartsOf(data string) map[string][]tnIntlPart {
	if m := tnIntlDateParts[data]; m != nil {
		return m
	}
	return tnIntlDateParts["en"]
}

type TnIntlDateTimeFormat struct {
	loc       *TnIntlLoc
	zoneID    string
	zone      *time.Location
	pattern   []tnIntlPart
	id        string
	dateStyle string
	timeStyle string
	opts      map[string]string
	hc        string
	frac      int
}

// A time zone: the canonical IANA id (matched case-insensitively, spaces for
// underscores, as Node's ids are) and its location (UTC, a fixed offset or
// time.LoadLocation's, with time/tzdata embedded)
var tnIntlZoneCache sync.Map

func tnIntlZoneOf(id string) (string, *time.Location) {
	id = strings.TrimSpace(id)
	if strings.EqualFold(id, "UTC") {
		return "UTC", time.UTC
	}
	// a fixed offset: ±HH[:MM[:SS]]
	if len(id) >= 3 && (id[0] == '+' || id[0] == '-') {
		rest := strings.ReplaceAll(id[1:], ":", "")
		if len(rest) == 2 || len(rest) == 4 || len(rest) == 6 {
			digits := true
			for _, c := range rest {
				if c < '0' || c > '9' {
					digits = false
				}
			}
			if digits {
				h, _ := strconv.Atoi(rest[0:2])
				m, s := 0, 0
				if len(rest) >= 4 {
					m, _ = strconv.Atoi(rest[2:4])
				}
				if len(rest) == 6 {
					s, _ = strconv.Atoi(rest[4:6])
				}
				if h <= 23 && m <= 59 && s <= 59 {
					off := h*3600 + m*60 + s
					if id[0] == '-' {
						off = -off
					}
					return id, time.FixedZone("", off)
				}
				tnIntlRangeError("Invalid time zone")
			}
		}
	}
	// an IANA id, matched case-insensitively against the supported list
	key := strings.ToLower(strings.ReplaceAll(id, " ", "_"))
	for _, zone := range tnIntlTimeZones {
		if strings.ToLower(zone) == key {
			loc, err := time.LoadLocation(zone)
			if err != nil {
				tnIntlRangeError("Invalid time zone specified: " + id)
			}
			return zone, loc
		}
	}
	// a link or a renamed zone: the id ICU reports (Asia/Kolkata → Asia/Calcutta)
	if canonical, ok := tnIntlZoneAliases[key]; ok {
		if canonical == "UTC" {
			return "UTC", time.UTC
		}
		if loc, err := time.LoadLocation(canonical); err == nil {
			return canonical, loc
		}
	}
	tnIntlRangeError("Invalid time zone specified: " + id)
	return "", nil
}

// The system zone's IANA id, for the default timeZone option
func tnIntlLocalZoneID() string {
	if id := tnTemporalSystemZoneID(); id != "" {
		return id
	}
	return "UTC"
}

func TnNewIntlDateTimeFormat(locales interface{}, options interface{}) *TnIntlDateTimeFormat {
	loc := TnIntlResolve(locales)
	f := &TnIntlDateTimeFormat{loc: loc, opts: map[string]string{}, frac: 0}
	// the time zone: an IANA id (case-insensitive) or a fixed offset; the
	// system zone when absent, as Node's are
	zoneID := ""
	if v, ok := tnIntlOptStr(options, "timeZone"); ok {
		zoneID = v
	} else {
		zoneID = tnIntlLocalZoneID()
	}
	canonical, zone := tnIntlZoneOf(zoneID)
	if cached, ok := tnIntlZoneCache.Load(canonical); ok {
		f.zoneID, f.zone = canonical, cached.(*time.Location)
	} else {
		tnIntlZoneCache.Store(canonical, zone)
		f.zoneID, f.zone = canonical, zone
	}
	// hour cycle: the options, then the -u-hc- extension, then the locale's
	if v, ok := tnIntlOptStr(options, "hourCycle"); ok {
		f.hc = v
	} else if hc := loc.tag.TypeForKey("hc"); hc != "" {
		f.hc = hc
	}
	// (hour12 is a boolean: it overrides hourCycle; true keeps an h11 locale's h11)
	if options != nil {
		if v := TnGetValue(options, "hour12"); v != nil {
			def := tnIntlName(loc.data, "hc")
			if TnTruthy(v) {
				f.hc = "h12"
				if def == "h11" {
					f.hc = "h11"
				}
			} else {
				f.hc = "h23"
				if def == "h24" {
					f.hc = "h24"
				}
			}
		}
	}
	if v, ok := tnIntlOptFloat(options, "fractionalSecondDigits"); ok {
		n := int(v)
		if v != math.Trunc(v) || n < 1 || n > 3 {
			tnIntlRangeError("fractionalSecondDigits value is out of range.")
		}
		f.frac = n
	}
	f.dateStyle, _ = tnIntlOptStr(options, "dateStyle")
	f.timeStyle, _ = tnIntlOptStr(options, "timeStyle")
	if f.dateStyle != "" && !tnIntlHasString([]string{"full", "long", "medium", "short"}, f.dateStyle) {
		tnIntlRangeError("Invalid dateStyle: " + f.dateStyle)
	}
	if f.timeStyle != "" && !tnIntlHasString([]string{"full", "long", "medium", "short"}, f.timeStyle) {
		tnIntlRangeError("Invalid timeStyle: " + f.timeStyle)
	}
	f.opts = tnIntlDateOptFields(options)
	// styles exclude the field options; without either, the date's numeric
	// fields (ToDateTimeOptions "any", "date")
	if f.dateStyle != "" || f.timeStyle != "" {
		style := "dateStyle"
		if f.dateStyle == "" {
			style = "timeStyle"
		}
		for _, k := range []string{"weekday", "era", "year", "month", "day", "dayPeriod", "hour", "minute", "second", "timeZoneName"} {
			if _, ok := f.opts[k]; ok {
				panic(TnNodeError("TypeError", "", "Can't set option "+k+" when "+style+" is used"))
			}
		}
		if f.frac > 0 {
			panic(TnNodeError("TypeError", "", "Can't set option fractionalSecondDigits when "+style+" is used"))
		}
	} else {
		named := false
		for _, k := range []string{"weekday", "year", "month", "day", "dayPeriod", "hour", "minute", "second"} {
			if _, ok := f.opts[k]; ok {
				named = true
			}
		}
		if !named && f.frac == 0 {
			f.opts["year"], f.opts["month"], f.opts["day"] = "numeric", "numeric", "numeric"
		}
	}
	f.pattern, f.id = tnIntlDatePattern(f)
	return f
}

// The date/time fields the options name, with their widths
func tnIntlDateOptFields(options interface{}) map[string]string {
	out := map[string]string{}
	for _, key := range []string{"weekday", "era", "year", "month", "day", "hour", "minute", "second", "timeZoneName", "dayPeriod"} {
		if v, ok := tnIntlOptStr(options, key); ok {
			out[key] = v
		}
	}
	return out
}

// The pattern for the options: the styles' ids, else the skeleton nearest the
// requested fields (the same field set first, then a composition of the date
// and time halves)
func tnIntlDatePattern(f *TnIntlDateTimeFormat) ([]tnIntlPart, string) {
	data := f.loc.data
	twelve := ""
	if f.hc == "h11" || f.hc == "h12" {
		twelve = "12"
	} else if f.hc == "h23" || f.hc == "h24" {
		twelve = "24"
	}
	if f.dateStyle != "" && f.timeStyle != "" {
		if f.dateStyle == f.timeStyle {
			if twelve != "" {
				if p := tnIntlDatePartsOf(data)["ft"+f.dateStyle+twelve]; p != nil {
					return p, "ft" + f.dateStyle + twelve
				}
			}
			return tnIntlDatePartsOf(data)["ft"+f.dateStyle], "ft" + f.dateStyle
		}
		// different styles: the date style's pattern, its joiner (" at " for
		// full / long), then the time style's pattern
		tid := "t" + f.timeStyle
		timeParts := tnIntlDatePartsOf(data)[tid+twelve]
		if timeParts == nil {
			timeParts = tnIntlDatePartsOf(data)[tid]
		}
		out := append([]tnIntlPart{}, tnIntlDatePartsOf(data)["d"+f.dateStyle]...)
		out = append(out, tnIntlPart{kind: 'l', text: tnIntlStyleJoiner(f.loc, f.dateStyle)})
		return append(out, timeParts...), "ft" + f.dateStyle + "|" + f.timeStyle
	}
	if f.dateStyle != "" {
		return tnIntlDatePartsOf(data)["d"+f.dateStyle], "d" + f.dateStyle
	}
	if f.timeStyle != "" {
		id := "t" + f.timeStyle
		if twelve != "" {
			if p := tnIntlDatePartsOf(data)[id+twelve]; p != nil {
				return p, id + twelve
			}
		}
		return tnIntlDatePartsOf(data)[id], id
	}
	fields := map[string]string{}
	for k, v := range f.opts {
		fields[k] = v
	}
	ren := map[string]string{"numeric": "n", "2-digit": "2", "long": "l", "short": "s", "narrow": "r", "shortOffset": "o", "longOffset": "O", "shortGeneric": "g", "longGeneric": "G"}
	for k, v := range fields {
		if w, ok := ren[v]; ok {
			fields[k] = w
		}
	}
	if _, ok := fields["second"]; !ok && f.frac > 0 {
		fields["second"] = "numeric"
	}
	for k, v := range fields {
		if w, ok := ren[v]; ok {
			fields[k] = w
		}
	}
	for _, sk := range tnIntlSkeletons {
		if tnIntlSkeletonMatches(sk, fields, f, true) {
			if p := tnIntlDatePartsOf(data)[sk.id]; p != nil {
				return p, sk.id
			}
		}
	}
	// the same field set with other widths: the closest (equal widths count
	// most; a numeric field must not get a name, nor the reverse)
	best, bestScore := "", 0
	for _, sk := range tnIntlSkeletons {
		if !tnIntlSkeletonMatches(sk, fields, f, false) || tnIntlDatePartsOf(data)[sk.id] == nil {
			continue
		}
		score := 1
		for _, f2 := range sk.fields {
			kv := strings.SplitN(f2, ":", 2)
			w := fields[kv[0]]
			numericWant, numericHas := w == "n" || w == "2", kv[1] == "n" || kv[1] == "2"
			switch {
			case w == kv[1]:
				score += 2
			case numericWant == numericHas:
				score++
			default:
				score -= 100
			}
		}
		if score > bestScore {
			best, bestScore = sk.id, score
		}
	}
	if best != "" {
		return tnIntlAdjustWidths(tnIntlDatePartsOf(data)[best], fields), best
	}
	parts, id := tnIntlComposed(f, fields)
	return tnIntlAdjustWidths(parts, fields), id
}

// A pattern's parts with the requested widths where they differ only within
// a kind (numeric vs 2-digit, long vs short vs narrow), as ICU adjusts a
// skeleton's best pattern
func tnIntlAdjustWidths(parts []tnIntlPart, fields map[string]string) []tnIntlPart {
	keyOf := map[byte]string{'w': "weekday", 'e': "era", 'y': "year", 'M': "month", 'd': "day", 'm': "minute", 's': "second", 'h': "hour", 'H': "hour", '1': "hour", 'z': "timeZoneName"}
	numeric := func(w byte) bool { return w == 'n' || w == '2' }
	out := make([]tnIntlPart, len(parts))
	copy(out, parts)
	for i, p := range out {
		key, ok := keyOf[p.kind]
		if !ok {
			continue
		}
		want, ok := fields[key]
		if !ok || len(want) != 1 {
			continue
		}
		w := want[0]
		// (minutes and seconds stay 2-digit inside a time, as in ICU)
		if (p.kind == 'm' || p.kind == 's') && w == 'n' {
			continue
		}
		if p.kind == 'z' || numeric(w) == numeric(p.width) {
			out[i].width = w
		}
	}
	return out
}

type tnIntlSkeleton struct {
	id     string
	fields []string // "key:width"
	cycle  string   // "" default, "12", "24"
}

var tnIntlSkeletons = []tnIntlSkeleton{
	{"yMMMMd", []string{"year:n", "month:l", "day:n"}, ""},
	{"yMMMd", []string{"year:n", "month:s", "day:n"}, ""},
	{"yMMMEd", []string{"year:n", "month:s", "day:n", "weekday:s"}, ""},
	{"yMMMMEEEEd", []string{"year:n", "month:l", "day:n", "weekday:l"}, ""},
	{"yMEd", []string{"year:n", "month:n", "day:n", "weekday:s"}, ""},
	{"yMd", []string{"year:n", "month:n", "day:n"}, ""},
	{"yM", []string{"year:n", "month:n"}, ""},
	{"yMMM", []string{"year:n", "month:s"}, ""},
	{"yMMMM", []string{"year:n", "month:l"}, ""},
	{"y", []string{"year:n"}, ""},
	{"y2", []string{"year:2"}, ""},
	{"MMMMd", []string{"month:l", "day:n"}, ""},
	{"MMMEd", []string{"month:s", "day:n", "weekday:s"}, ""},
	{"Md", []string{"month:n", "day:n"}, ""},
	{"Ed", []string{"weekday:s", "day:n"}, ""},
	{"d", []string{"day:n"}, ""},
	{"M", []string{"month:n"}, ""},
	{"MMMM", []string{"month:l"}, ""},
	{"MMM", []string{"month:s"}, ""},
	{"hms", []string{"hour:n", "minute:n", "second:n"}, ""},
	{"hms12", []string{"hour:n", "minute:n", "second:n"}, "12"},
	{"hms24", []string{"hour:n", "minute:n", "second:n"}, "24"},
	{"hm", []string{"hour:n", "minute:n"}, ""},
	{"hm12", []string{"hour:n", "minute:n"}, "12"},
	{"hm24", []string{"hour:n", "minute:n"}, "24"},
	{"h", []string{"hour:n"}, ""},
	{"h12", []string{"hour:n"}, "12"},
	{"H24", []string{"hour:n"}, "24"},
	{"ms", []string{"minute:n", "second:n"}, ""},
	{"hmdpS", []string{"hour:n", "minute:n", "dayPeriod:s"}, ""},
	{"hmdpL", []string{"hour:n", "minute:n", "dayPeriod:l"}, ""},
	{"hmF", []string{"hour:n", "minute:n", "second:n"}, ""},
	{"hmF12", []string{"hour:n", "minute:n", "second:n"}, "12"},
	{"yMdHms", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n", "second:n"}, ""},
	{"yMdHms12", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n", "second:n"}, "12"},
	{"yMdHms24", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n", "second:n"}, "24"},
	{"yMMMdzS", []string{"year:n", "month:s", "day:n", "timeZoneName:s"}, ""},
	{"yMMMdzL", []string{"year:n", "month:s", "day:n", "timeZoneName:l"}, ""},
	{"hmzS", []string{"hour:n", "minute:n", "timeZoneName:s"}, ""},
	{"hmzO", []string{"hour:n", "minute:n", "timeZoneName:O"}, ""},
	{"yMdzS", []string{"year:n", "month:n", "day:n", "timeZoneName:s"}, ""},
	{"yMdzL", []string{"year:n", "month:n", "day:n", "timeZoneName:l"}, ""},
	{"yMdHmszS", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n", "second:n", "timeZoneName:s"}, ""},
	{"yMdHmszS12", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n", "second:n", "timeZoneName:s"}, "12"},
	{"yMdHmszS24", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n", "second:n", "timeZoneName:s"}, "24"},
	{"hmszS", []string{"hour:n", "minute:n", "second:n", "timeZoneName:s"}, ""},
	{"yMdHm", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n"}, ""},
	{"yMdHm12", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n"}, "12"},
	{"yMdHm24", []string{"year:n", "month:n", "day:n", "hour:n", "minute:n"}, "24"},
	{"E", []string{"weekday:s"}, ""},
	{"EEEE", []string{"weekday:l"}, ""},
	{"Eh", []string{"weekday:s", "hour:n"}, ""},
	{"Ehm", []string{"weekday:s", "hour:n", "minute:2"}, ""},
	{"EEEEhm", []string{"weekday:l", "hour:n", "minute:2"}, ""},
	{"yMMMdHm", []string{"year:n", "month:s", "day:n", "hour:n", "minute:n"}, ""},
	{"yMMMMdHm", []string{"year:n", "month:l", "day:n", "hour:n", "minute:n"}, ""},
	{"yMMMMdEraS", []string{"year:n", "month:l", "day:n", "era:s"}, ""},
	{"yMMMMdEraL", []string{"year:n", "month:l", "day:n", "era:l"}, ""},
	{"yMMMdEraS", []string{"year:n", "month:s", "day:n", "era:s"}, ""},
}

// Whether a skeleton matches the requested fields (exact also compares the
// widths; the skeleton's cycle must match the requested one)
func tnIntlSkeletonMatches(sk tnIntlSkeleton, fields map[string]string, f *TnIntlDateTimeFormat, exact bool) bool {
	want := map[string]bool{}
	for _, f2 := range sk.fields {
		kv := strings.SplitN(f2, ":", 2)
		want[kv[0]] = true
		// (the same field set: a skeleton with a field not asked for doesn't fit)
		if _, asked := fields[kv[0]]; !asked {
			return false
		}
		if exact {
			w, ok := fields[kv[0]]
			if !ok || w != kv[1] {
				return false
			}
		}
	}
	for k := range fields {
		if !want[k] {
			return false
		}
	}
	// the skeleton's hour cycle must match the requested one
	hasHour := want["hour"]
	if sk.cycle == "12" && (!hasHour || (f.hc != "h11" && f.hc != "h12")) {
		return false
	}
	if sk.cycle == "24" && (!hasHour || (f.hc != "h23" && f.hc != "h24")) {
		return false
	}
	if sk.cycle == "" && hasHour && (f.hc == "h11" || f.hc == "h12" || f.hc == "h23" || f.hc == "h24") {
		return false
	}
	// the fractionalSecondDigits option: hmF keeps the plain shapes out
	if f.frac > 0 && !want["second"] {
		return false
	}
	if f.frac == 0 && sk.id == "hmF" || f.frac == 0 && sk.id == "hmF12" {
		if _, hasSec := fields["second"]; !hasSec {
			return false
		}
	}
	return true
}

// A pattern composed of the closest date and time patterns (with the literal
// the combined styles put between the halves)
func tnIntlComposed(f *TnIntlDateTimeFormat, fields map[string]string) ([]tnIntlPart, string) {
	dateFields := map[string]string{}
	timeFields := map[string]string{}
	for k, v := range fields {
		if k == "hour" || k == "minute" || k == "second" || k == "dayPeriod" {
			timeFields[k] = v
		} else {
			dateFields[k] = v
		}
	}
	var dateParts, timeParts []tnIntlPart
	if len(dateFields) > 0 {
		best, bestScore := "", -1
		for _, sk := range tnIntlSkeletons {
			if sk.cycle != "" || tnIntlSkeletonHasTime(sk) || strings.Contains(sk.id, "z") || strings.Contains(sk.id, "Era") {
				continue
			}
			// (no field the request doesn't name: {weekday} is "Tue", not a date)
			extra := false
			for _, f2 := range sk.fields {
				if _, ok := dateFields[strings.SplitN(f2, ":", 2)[0]]; !ok {
					extra = true
				}
			}
			if extra {
				continue
			}
			if score := tnIntlSkeletonScore(sk, dateFields); score > bestScore {
				best, bestScore = sk.id, score
			}
		}
		if best != "" {
			dateParts = tnIntlDatePartsOf(f.loc.data)[best]
		}
	}
	if len(timeFields) > 0 {
		best, bestScore := "", -1
		twelve := f.hc == "h11" || f.hc == "h12"
		for _, sk := range tnIntlSkeletons {
			if !tnIntlSkeletonHasTime(sk) || strings.Contains(sk.id, "z") || sk.id == "hmF" || sk.id == "hmF12" || sk.id == "hmdpS" || sk.id == "hmdpL" {
				continue
			}
			score := tnIntlSkeletonScore(sk, timeFields)
			if sk.cycle == "12" && !twelve {
				score--
			}
			if sk.cycle == "24" && (twelve || f.hc == "") {
				score--
			}
			if sk.cycle == "" && twelve {
				score--
			}
			if score > bestScore {
				best, bestScore = sk.id, score
			}
		}
		if best != "" {
			timeParts = tnIntlDatePartsOf(f.loc.data)[best]
		}
	}
	if dateParts == nil {
		return timeParts, "composed"
	}
	if timeParts == nil {
		return dateParts, "composed"
	}
	out := append([]tnIntlPart{}, dateParts...)
	out = append(out, tnIntlPart{kind: 'l', text: tnIntlDateJoiner(f.loc)})
	out = append(out, timeParts...)
	return out, "composed"
}

func tnIntlSkeletonHasTime(sk tnIntlSkeleton) bool {
	for _, f := range sk.fields {
		kv := strings.SplitN(f, ":", 2)
		if kv[0] == "hour" || kv[0] == "minute" {
			return true
		}
	}
	return false
}

// How many of the skeleton's fields the request names, +1 per equal width
func tnIntlSkeletonScore(sk tnIntlSkeleton, fields map[string]string) int {
	score := 0
	for _, f := range sk.fields {
		kv := strings.SplitN(f, ":", 2)
		if w, ok := fields[kv[0]]; ok {
			score++
			if w == kv[1] {
				score++
			}
		}
	}
	return score
}

// The literal a locale's combined date-time patterns put between the halves
// (the dmedium parts are a prefix of ftmedium; the next literal is the joiner)
func tnIntlDateJoiner(loc *TnIntlLoc) string {
	return tnIntlStyleJoiner(loc, "medium")
}

// The literal a date style's combined pattern puts between date and time
func tnIntlStyleJoiner(loc *TnIntlLoc, style string) string {
	dp := tnIntlDatePartsOf(loc.data)["ft"+style]
	d := tnIntlDatePartsOf(loc.data)["d"+style]
	if dp == nil || d == nil {
		return ", "
	}
	for i := 0; i < len(dp); i++ {
		if i < len(d) {
			if dp[i] != d[i] {
				return ", "
			}
			continue
		}
		if dp[i].kind == 'l' {
			return dp[i].text
		}
	}
	return ", "
}

// The date's fields in its zone
type tnIntlDateFields struct {
	year, month, day, hour, minute, second, ms int
	weekday                                    int // Sunday=0
}

func tnIntlFieldsOf(t time.Time, loc *time.Location) tnIntlDateFields {
	lt := t.In(loc)
	return tnIntlDateFields{
		year: lt.Year(), month: int(lt.Month()), day: lt.Day(),
		hour: lt.Hour(), minute: lt.Minute(), second: lt.Second(),
		ms: lt.Nanosecond() / 1000000, weekday: int(lt.Weekday()),
	}
}

// The zone name a width renders: the generated tables for the named zones
// (the winter W / summer S variants by the offset), generic offsets otherwise
func tnIntlZoneName(f *TnIntlDateTimeFormat, t time.Time, width byte, fields tnIntlDateFields) string {
	table := tnIntlZoneNames[f.zoneID]
	widths := map[byte]string{'s': "short", 'l': "long", 'g': "shortG", 'G': "longG", 'o': "short", 'O': "long"}
	key := widths[width]
	if table != nil {
		_, off := t.In(f.zone).Zone()
		_, offJan := time.Date(fields.year, 1, 15, 12, 0, 0, 0, f.zone).Zone()
		suffix := "S"
		if off == offJan {
			suffix = "W"
		}
		if v, ok := table[key+suffix]; ok && v != "" {
			return v
		}
	}
	// the generic offsets: GMT+9 / GMT+5:30 / GMT-08:00
	_, off := t.In(f.zone).Zone()
	sign := "+"
	if off < 0 {
		sign, off = "-", -off
	}
	h, m := off/3600, (off%3600)/60
	switch width {
	case 's', 'g', 'o':
		if m == 0 {
			return "GMT" + sign + strconv.Itoa(h)
		}
		return "GMT" + sign + strconv.Itoa(h) + ":" + strconv.Itoa(m)
	}
	return "GMT" + sign + fmt.Sprintf("%02d:%02d", h, m)
}

// The value of one date pattern part, from the fields (of a or b, for range
// patterns' endRange parts)
func tnIntlDateValue(f *TnIntlDateTimeFormat, p tnIntlPart, fields tnIntlDateFields) string {
	data := f.loc.data
	switch p.kind {
	case 'y':
		digits := strconv.Itoa(tnIntlAbs(fields.year))
		if fields.year < 0 {
			digits = "-" + digits
		}
		if p.width == '2' {
			digits = fmt.Sprintf("%02d", tnIntlAbs(fields.year)%100)
			if fields.year < 0 {
				digits = "-" + digits
			}
		}
		return tnIntlMapDigits(digits, tnIntlDigitsFor(f.loc))
	case 'M':
		if p.width == 'n' || p.width == '2' {
			d := strconv.Itoa(fields.month)
			if p.width == '2' {
				d = fmt.Sprintf("%02d", fields.month)
			}
			return tnIntlMapDigits(d, tnIntlDigitsFor(f.loc))
		}
		// standalone names belong to month-only patterns
		form := "F"
		if !tnIntlPatternHasDateFields(f) {
			form = ""
		}
		w := "L"
		if p.width == 's' {
			w = "S"
		} else if p.width == 'r' {
			w = "N"
		}
		return tnIntlName(data, "M"+form+strconv.Itoa(fields.month)+w)
	case 'd':
		d := strconv.Itoa(fields.day)
		if p.width == '2' {
			d = fmt.Sprintf("%02d", fields.day)
		}
		return tnIntlMapDigits(d, tnIntlDigitsFor(f.loc))
	case 'w':
		w := "L"
		if p.width == 's' {
			w = "S"
		} else if p.width == 'r' {
			w = "N"
		}
		return tnIntlName(data, "W"+strconv.Itoa(fields.weekday+1)+w)
	case 'h':
		v := (fields.hour+11)%12 + 1
		return tnIntlPadNum(v, p.width, f)
	case '1':
		return tnIntlPadNum(fields.hour%12, p.width, f)
	case 'H':
		return tnIntlPadNum(fields.hour, p.width, f)
	case 'm':
		return tnIntlPadNum(fields.minute, p.width, f)
	case 's':
		return tnIntlPadNum(fields.second, p.width, f)
	case 'p':
		minute := 30
		if fields.minute == 0 {
			minute = 0
		}
		w := "S"
		if p.width == 'l' {
			w = "L"
		} else if p.width == 'r' {
			w = "N"
		}
		if v := tnIntlName(data, fmt.Sprintf("p%d|%d", fields.hour, minute)+w); v != "" {
			return v
		}
		if fields.hour < 12 {
			return tnIntlName(data, "ampmAM")
		}
		return tnIntlName(data, "ampmPM")
	case 'P':
		if fields.hour < 12 {
			return tnIntlName(data, "ampmAM")
		}
		return tnIntlName(data, "ampmPM")
	case 'e':
		w := "S"
		if p.width == 'l' {
			w = "L"
		} else if p.width == 'r' {
			w = "N"
		}
		if fields.year < 1 {
			return tnIntlName(data, "eraBC"+w)
		}
		return tnIntlName(data, "eraAD"+w)
	case 'z':
		return tnIntlZoneName(f, time.Date(fields.year, time.Month(fields.month), fields.day, fields.hour, fields.minute, fields.second, 0, f.zone), p.width, fields)
	case 'f':
		d := strconv.Itoa(fields.ms)
		for len(d) < int(p.width) {
			d = "0" + d
		}
		return d
	}
	return p.text
}

func tnIntlPadNum(v int, width byte, f *TnIntlDateTimeFormat) string {
	d := strconv.Itoa(v)
	if width == '2' {
		d = fmt.Sprintf("%02d", v)
	}
	return tnIntlMapDigits(d, tnIntlDigitsFor(f.loc))
}

func tnIntlAbs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

// Whether the pattern has other date fields besides the month (the standalone
// month names belong to month-only patterns)
func tnIntlPatternHasDateFields(f *TnIntlDateTimeFormat) bool {
	for _, q := range f.pattern {
		if q.kind == 'y' || q.kind == 'd' || q.kind == 'w' {
			return true
		}
	}
	return false
}

// The parts of a formatted date (the fractionalSecondDigits option appends
// the fraction after the seconds, as ICU renders it)
func TnIntlDateFormatParts(f *TnIntlDateTimeFormat, t time.Time) []interface{} {
	if t.IsZero() {
		panic(TnNodeError("RangeError", "", "Invalid time value"))
	}
	fields := tnIntlFieldsOf(t, f.zone)
	out := []interface{}{}
	appendedFrac := false
	for _, p := range f.pattern {
		if p.kind == 'f' {
			appendedFrac = true
			out = append(out, tnIntlObj("type", "fractionalSecond", "value", tnIntlDateValue(f, p, fields)))
			continue
		}
		if p.kind == 'z' {
			out = append(out, tnIntlObj("type", "timeZoneName", "value", tnIntlDateValue(f, p, fields)))
			continue
		}
		if p.kind == 'l' {
			if p.text != "" {
				out = append(out, tnIntlObj("type", "literal", "value", p.text))
			}
			continue
		}
		if v := tnIntlDateValue(f, p, fields); v != "" {
			out = append(out, tnIntlObj("type", tnIntlDatePartType(p.kind), "value", v))
		}
	}
	if f.frac > 0 && !appendedFrac {
		// after the last second part: the decimal separator and the digits
		idx := -1
		for i, pp := range out {
			if tnIntlGet(pp, "type") == "second" {
				idx = i
			}
		}
		ins := []interface{}{
			tnIntlObj("type", "literal", "value", tnIntlNumSym(f.loc.data, "dec")),
			tnIntlObj("type", "fractionalSecond", "value", fmt.Sprintf("%03d", fields.ms)[:f.frac]),
		}
		if idx >= 0 {
			rest := append([]interface{}{}, out[idx+1:]...)
			out = append(out[:idx+1], append(ins, rest...)...)
		} else {
			out = append(out, ins...)
		}
	}
	return out
}

func tnIntlDatePartType(kind byte) string {
	switch kind {
	case 'y':
		return "year"
	case 'M':
		return "month"
	case 'd':
		return "day"
	case 'w':
		return "weekday"
	case 'h', 'H', '1':
		return "hour"
	case 'm':
		return "minute"
	case 's':
		return "second"
	case 'p', 'P':
		return "dayPeriod"
	case 'e':
		return "era"
	}
	return "literal"
}

func TnIntlDateFormat(f *TnIntlDateTimeFormat, t time.Time) string {
	var b strings.Builder
	for _, p := range TnIntlDateFormatParts(f, t) {
		b.WriteString(TnJSString(tnIntlGet(p, "value")))
	}
	return b.String()
}

// Intl.DateTimeFormat#formatRange: the captured range pattern for the
// greatest difference between the two dates
func tnIntlDateGreatestDiff(f *TnIntlDateTimeFormat, a, b time.Time) string {
	patternFields := map[byte]bool{}
	for _, p := range f.pattern {
		patternFields[p.kind] = true
	}
	fa, fb := tnIntlFieldsOf(a, f.zone), tnIntlFieldsOf(b, f.zone)
	for _, d := range []struct {
		kind  byte
		diff  bool
		field bool
	}{{'y', fa.year != fb.year, patternFields['y']}, {'M', fa.month != fb.month, patternFields['M']}, {'d', fa.day != fb.day, patternFields['d']}, {'h', fa.hour != fb.hour, patternFields['h'] || patternFields['H'] || patternFields['1']}, {'m', fa.minute != fb.minute, patternFields['m']}, {'s', fa.second != fb.second, patternFields['s']}} {
		if d.diff {
			if d.field {
				return string(d.kind)
			}
			return "other"
		}
	}
	return ""
}

func tnIntlDateRangePattern(f *TnIntlDateTimeFormat, a, b time.Time) []tnIntlPart {
	diff := tnIntlDateGreatestDiff(f, a, b)
	if diff == "" {
		return nil
	}
	p := tnIntlDatePartsOf(f.loc.data)["R:"+f.id+":"+diff]
	if p == nil && diff != "other" {
		p = tnIntlDatePartsOf(f.loc.data)["R:"+f.id+":other"]
	}
	return p
}

func TnIntlDateFormatRangeParts(f *TnIntlDateTimeFormat, a time.Time, b time.Time) []interface{} {
	if a.IsZero() || b.IsZero() {
		panic(TnNodeError("RangeError", "", "Invalid time value"))
	}
	// nothing shown differs: one date, its parts shared
	if TnIntlDateFormat(f, a) == TnIntlDateFormat(f, b) {
		out := TnIntlDateFormatParts(f, a)
		for _, p := range out {
			p.(*TnMap[string, interface{}]).Set("source", "shared")
		}
		return out
	}
	pattern := tnIntlDateRangePattern(f, a, b)
	if pattern == nil {
		// no range data: both formatted, joined by the dash ICU uses
		out := []interface{}{}
		for _, p := range TnIntlDateFormatParts(f, a) {
			p.(*TnMap[string, interface{}]).Set("source", "startRange")
			out = append(out, p)
		}
		out = append(out, tnIntlObj("type", "literal", "value", " – ", "source", "shared"))
		for _, p := range TnIntlDateFormatParts(f, b) {
			p.(*TnMap[string, interface{}]).Set("source", "endRange")
			out = append(out, p)
		}
		return out
	}
	out := []interface{}{}
	for _, p := range pattern {
		fields := tnIntlFieldsOf(a, f.zone)
		source := "shared"
		if p.src == 'e' {
			fields = tnIntlFieldsOf(b, f.zone)
			source = "endRange"
		} else if p.src == 's' {
			source = "startRange"
		}
		if p.kind == 'l' {
			if p.text != "" {
				out = append(out, tnIntlObj("type", "literal", "value", p.text, "source", source))
			}
			continue
		}
		if v := tnIntlDateValue(f, p, fields); v != "" {
			out = append(out, tnIntlObj("type", tnIntlDatePartType(p.kind), "value", v, "source", source))
		}
	}
	return out
}

func TnIntlDateFormatRange(f *TnIntlDateTimeFormat, a time.Time, b time.Time) string {
	var bld strings.Builder
	for _, p := range TnIntlDateFormatRangeParts(f, a, b) {
		bld.WriteString(TnJSString(tnIntlGet(p, "value")))
	}
	return bld.String()
}

// resolvedOptions
// (keys in Node's order: the hour cycle only with an hour, the components
// only without dateStyle / timeStyle)
func (f *TnIntlDateTimeFormat) resolvedOptions() interface{} {
	return f.tnResolved()
}

// The format method as a value (dates.map(dtf.format); no argument: now)
func (f *TnIntlDateTimeFormat) Get_format() func(interface{}) string {
	return func(x interface{}) string { return TnIntlDateFormat(f, TnNewDate(x)) }
}

func (f *TnIntlDateTimeFormat) tnResolved() interface{} {
	out := tnIntlObj()
	out.Set("locale", f.loc.id)
	out.Set("calendar", "gregory")
	nu := f.loc.tag.TypeForKey("nu")
	if nu == "" {
		nu = "latn"
	}
	out.Set("numberingSystem", nu)
	out.Set("timeZone", f.zoneID)
	widths := map[byte]string{'n': "numeric", '2': "2-digit", 'l': "long", 's': "short", 'r': "narrow", 'o': "shortOffset", 'O': "longOffset", 'g': "shortGeneric", 'G': "longGeneric"}
	found := map[string]string{}
	hasHour := false
	for _, p := range f.pattern {
		name := ""
		switch p.kind {
		case 'w':
			name = "weekday"
		case 'e':
			name = "era"
		case 'y':
			name = "year"
		case 'M':
			name = "month"
		case 'd':
			name = "day"
		case 'p':
			name = "dayPeriod"
		case 'h', 'H', '1':
			name = "hour"
			hasHour = true
		case 'm':
			name = "minute"
		case 's':
			name = "second"
		case 'z':
			name = "timeZoneName"
		}
		if name == "" {
			continue
		}
		if _, seen := found[name]; !seen {
			w := widths[p.width]
			if name == "hour" && w != "2-digit" {
				w = "numeric"
			}
			found[name] = w
		}
	}
	if hasHour {
		hc := f.hc
		if hc == "" {
			hc = tnIntlName(f.loc.data, "hc")
		}
		if hc != "" {
			out.Set("hourCycle", hc)
			out.Set("hour12", hc == "h11" || hc == "h12")
		}
	}
	if f.dateStyle != "" || f.timeStyle != "" {
		if f.dateStyle != "" {
			out.Set("dateStyle", f.dateStyle)
		}
		if f.timeStyle != "" {
			out.Set("timeStyle", f.timeStyle)
		}
		return out
	}
	for _, name := range []string{"weekday", "era", "year", "month", "day", "dayPeriod", "hour", "minute", "second"} {
		if w, ok := found[name]; ok {
			out.Set(name, w)
		}
	}
	if f.frac > 0 {
		out.Set("fractionalSecondDigits", float64(f.frac))
	}
	if w, ok := found["timeZoneName"]; ok {
		out.Set("timeZoneName", w)
	}
	return out
}

// The wrapper the Date methods use: kind "locale" / "localeDate" /
// "localeTime" render with the Intl patterns (the default locale comes from
// the OS, as Node's do)
func TnIntlDateFmt(t time.Time, locales interface{}, options interface{}, kind string) string {
	if t.IsZero() {
		return "Invalid Date"
	}
	// the options copied, then ToDateTimeOptions' defaults: only when none of
	// the required kind's fields (or a style) were given
	opts := tnIntlObj()
	if options != nil {
		for _, k := range TnKeys(options) {
			opts.Set(k, TnGetValue(options, k))
		}
	}
	has := func(keys ...string) bool {
		for _, k := range keys {
			if opts.Get(k) != nil {
				return true
			}
		}
		return false
	}
	dateFields := []string{"weekday", "year", "month", "day"}
	timeFields := []string{"dayPeriod", "hour", "minute", "second", "fractionalSecondDigits"}
	setDate := func() { opts.Set("year", "numeric"); opts.Set("month", "numeric"); opts.Set("day", "numeric") }
	setTime := func() { opts.Set("hour", "numeric"); opts.Set("minute", "numeric"); opts.Set("second", "numeric") }
	switch kind {
	case "localeDate":
		if has("timeStyle") {
			panic(TnNodeError("TypeError", "", "Invalid option : timeStyle"))
		}
		if !has(dateFields...) && !has("dateStyle") {
			setDate()
		}
	case "localeTime":
		if has("dateStyle") {
			panic(TnNodeError("TypeError", "", "Invalid option : dateStyle"))
		}
		if !has(timeFields...) && !has("timeStyle") {
			setTime()
		}
	default:
		if !has(dateFields...) && !has(timeFields...) && !has("dateStyle", "timeStyle") {
			setDate()
			setTime()
		}
	}
	f := TnNewIntlDateTimeFormat(locales, opts)
	return TnIntlDateFormat(f, t)
}`;

const intlCollateGo = `// Intl.Collator: golang.org/x/text/collate (sensitivity via the ignore
// options, numeric collation; caseFirst "upper" swaps case-only differences
// — x/text has no caseFirst option — and ignorePunctuation strips punctuation)

type TnIntlCollator struct {
	loc         *TnIntlLoc
	col         *xcollate.Collator
	caseless    *xcollate.Collator // caseFirst "upper": the case-blind order
	base        *xcollate.Collator // sensitivity "case": the base letters' order
	usage       string
	sensitivity string
	caseFirst   string
	numeric     bool
	ignorePunct bool
}

func TnNewIntlCollator(locales interface{}, options interface{}) *TnIntlCollator {
	c := &TnIntlCollator{loc: TnIntlResolve(locales), usage: "sort", sensitivity: "variant"}
	if v, ok := tnIntlOptStr(options, "usage"); ok {
		if v != "sort" && v != "search" {
			tnIntlRangeError("Invalid usage: " + v)
		}
		c.usage = v
	}
	if v, ok := tnIntlOptStr(options, "sensitivity"); ok {
		if v != "base" && v != "accent" && v != "case" && v != "variant" {
			tnIntlRangeError("Invalid sensitivity: " + v)
		}
		c.sensitivity = v
	}
	if v, ok := tnIntlOptStr(options, "caseFirst"); ok {
		if v != "upper" && v != "lower" && v != "false" {
			tnIntlRangeError("Invalid caseFirst: " + v)
		}
		c.caseFirst = v
	} else if kn := c.loc.tag.TypeForKey("kf"); kn == "upper" || kn == "lower" {
		c.caseFirst = kn
	} else {
		c.caseFirst = "false"
	}
	if kn := c.loc.tag.TypeForKey("kn"); kn == "true" || kn == "yes" {
		c.numeric = true
	}
	if options != nil {
		if v := TnGetValue(options, "numeric"); v != nil {
			c.numeric = TnTruthy(v)
		}
		if v := TnGetValue(options, "ignorePunctuation"); v != nil {
			c.ignorePunct = TnTruthy(v)
		}
	}
	var opts []xcollate.Option
	switch c.sensitivity {
	case "base":
		opts = append(opts, xcollate.IgnoreCase, xcollate.IgnoreDiacritics)
	case "accent":
		opts = append(opts, xcollate.IgnoreCase)
	}
	if c.numeric {
		opts = append(opts, xcollate.Numeric)
	}
	c.col = xcollate.New(c.loc.tag, opts...)
	// sensitivity "case": base letters, then case alone (x/text's
	// IgnoreDiacritics still tells a from á at the tertiary level)
	if c.sensitivity == "case" {
		c.base = xcollate.New(c.loc.tag, append(opts, xcollate.IgnoreCase, xcollate.IgnoreDiacritics)...)
	}
	// caseFirst "upper" (x/text has no such option): strings that differ
	// only by case — equal to a case-blind collator — swap their order
	if c.caseFirst == "upper" && (c.sensitivity == "case" || c.sensitivity == "variant") {
		c.caseless = xcollate.New(c.loc.tag, append(opts, xcollate.IgnoreCase)...)
	}
	return c
}

func tnIntlStripPunct(s string) string {
	var b strings.Builder
	for _, r := range s {
		if unicode.IsPunct(r) || unicode.IsSymbol(r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func TnIntlCollatorCompare(c *TnIntlCollator, a string, b string) float64 {
	if c.ignorePunct {
		a, b = tnIntlStripPunct(a), tnIntlStripPunct(b)
	}
	if c.base != nil {
		if r := c.base.CompareString(a, b); r != 0 {
			return float64(r)
		}
		a, b = tnIntlStripMarks(a), tnIntlStripMarks(b)
	}
	r := c.col.CompareString(a, b)
	if r != 0 && c.caseless != nil && c.caseless.CompareString(a, b) == 0 {
		r = -r
	}
	return float64(r)
}

// A string without its combining marks (NFD, then the Mn runes dropped)
func tnIntlStripMarks(s string) string {
	var b strings.Builder
	for _, r := range tnnorm.NFD.String(s) {
		if !unicode.Is(unicode.Mn, r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// The compare method as a value (arr.sort(new Intl.Collator('de').compare))
func (c *TnIntlCollator) Get_compare() func(string, string) float64 {
	return func(a string, b string) float64 { return TnIntlCollatorCompare(c, a, b) }
}

func (c *TnIntlCollator) resolvedOptions() interface{} {
	return tnIntlObj("locale", c.loc.id, "usage", c.usage, "sensitivity", c.sensitivity, "ignorePunctuation", c.ignorePunct,
		"collation", "default", "numeric", c.numeric, "caseFirst", c.caseFirst)
}

// s.localeCompare(b, locales, options) with a locale or options: the full
// collator (the bare two-argument form keeps the light root collation)
// (collators are cached by locales and options: a sort's comparator calls
// this once per comparison)
var tnIntlCollatorCache sync.Map

func TnIntlCompare(a string, b string, locales interface{}, options interface{}) float64 {
	key := strings.Join(TnIntlCanonicalList(locales), ",")
	for _, k := range []string{"usage", "sensitivity", "caseFirst", "numeric", "ignorePunctuation", "collation"} {
		if options != nil {
			key += "|" + TnJSString(TnGetValue(options, k))
		}
	}
	if c, ok := tnIntlCollatorCache.Load(key); ok {
		return TnIntlCollatorCompare(c.(*TnIntlCollator), a, b)
	}
	c := TnNewIntlCollator(locales, options)
	tnIntlCollatorCache.Store(key, c)
	return TnIntlCollatorCompare(c, a, b)
}`;

const intlPluralGo = `// Intl.PluralRules: golang.org/x/text/feature/plural (the operands from the
// rounded value, as the spec computes them)

type TnIntlPluralRules struct {
	loc     *TnIntlLoc
	ordinal bool
	minFD   int
	useSD   bool
	minSD   int
}

func TnNewIntlPluralRules(locales interface{}, options interface{}) *TnIntlPluralRules {
	p := &TnIntlPluralRules{loc: TnIntlResolve(locales)}
	if v, ok := tnIntlOptStr(options, "type"); ok {
		if v != "cardinal" && v != "ordinal" {
			tnIntlRangeError("Invalid type: " + v)
		}
		p.ordinal = v == "ordinal"
	}
	if v, ok := tnIntlOptFloat(options, "minimumFractionDigits"); ok {
		n := int(v)
		if v != math.Trunc(v) || n < 0 || n > 100 {
			tnIntlRangeError("minimumFractionDigits value is out of range.")
		}
		p.minFD = n
	}
	if v, ok := tnIntlOptFloat(options, "minimumSignificantDigits"); ok {
		n := int(v)
		if v != math.Trunc(v) || n < 1 || n > 21 {
			tnIntlRangeError("minimumSignificantDigits value is out of range.")
		}
		p.useSD, p.minSD = true, n
	}
	return p
}

// The rendered digits the operands come from: the value's, padded by the
// options (minimumFractionDigits / minimumSignificantDigits)
func (p *TnIntlPluralRules) digitsOf(x interface{}) string {
	n, ok := x.(float64)
	if !ok {
		n = TnNumber(x)
	}
	if math.IsNaN(n) || math.IsInf(n, 0) || math.Abs(n) >= 1e21 {
		return strconv.FormatFloat(math.Abs(n), 'e', -1, 64)
	}
	digits := strconv.FormatFloat(math.Abs(n), 'f', -1, 64)
	intPart, frac := digits, ""
	if dot := strings.IndexByte(digits, '.'); dot >= 0 {
		intPart, frac = digits[:dot], digits[dot+1:]
	}
	if p.useSD {
		sig := strings.TrimLeft(intPart+frac, "0")
		if len(sig) < p.minSD {
			return intPart + frac + strings.Repeat("0", p.minSD-len(sig))
		}
		return digits
	}
	if len(frac) < p.minFD {
		return intPart + frac + strings.Repeat("0", p.minFD-len(frac))
	}
	return digits
}

func TnIntlPluralSelect(p *TnIntlPluralRules, x interface{}) string {
	digits := p.digitsOf(x)
	i, v, w, f, t := tnIntlPluralOperands(digits)
	if p.ordinal {
		return tnIntlPluralName(xplural.Ordinal.MatchPlural(p.loc.tag, i, v, w, f, t))
	}
	return tnIntlCardinal(p.loc.tag, i, v, w, f, t)
}

// selectRange: the category the range selects (x/text has no range rules; the
// end's category stands in)
func TnIntlPluralSelectRange(p *TnIntlPluralRules, start interface{}, end interface{}) string {
	return TnIntlPluralSelect(p, end)
}

// (keys in Node's order; the categories in CLDR's: zero one two few many other)
func (p *TnIntlPluralRules) resolvedOptions() interface{} {
	out := tnIntlObj()
	out.Set("locale", p.loc.id)
	if p.ordinal {
		out.Set("type", "ordinal")
	} else {
		out.Set("type", "cardinal")
	}
	out.Set("notation", "standard")
	out.Set("minimumIntegerDigits", float64(1))
	if p.useSD {
		out.Set("minimumSignificantDigits", float64(p.minSD))
		out.Set("maximumSignificantDigits", float64(21))
	} else {
		out.Set("minimumFractionDigits", float64(p.minFD))
		out.Set("maximumFractionDigits", float64(max(3, p.minFD)))
	}
	// the plural categories: what the rules select over values covering
	// every CLDR rule's operands
	seen := map[string]bool{}
	samples := []float64{0.5, 1.5, 100, 101, 102, 103, 111, 1000, 100000, 1000000, 1e7}
	for i := 0; i <= 30; i++ {
		samples = append(samples, float64(i))
	}
	for _, v := range samples {
		seen[TnIntlPluralSelect(p, v)] = true
	}
	cats := []interface{}{}
	for _, cat := range []string{"zero", "one", "two", "few", "many", "other"} {
		if seen[cat] {
			cats = append(cats, cat)
		}
	}
	out.Set("pluralCategories", cats)
	out.Set("roundingIncrement", float64(1))
	out.Set("roundingMode", "halfExpand")
	out.Set("roundingPriority", "auto")
	out.Set("trailingZeroDisplay", "auto")
	return out
}`;

const intlListRelGo = `// Intl.ListFormat and Intl.RelativeTimeFormat: the generated patterns

func tnIntlListParts(data string) map[string]string {
	if m := tnIntlList[data]; m != nil {
		return m
	}
	return tnIntlList["en"]
}

func tnIntlRelParts(data string) map[string]string {
	if m := tnIntlRel[data]; m != nil {
		return m
	}
	return tnIntlRel["en"]
}

type TnIntlListFormat struct {
	loc   *TnIntlLoc
	type_ string
	style string
}

func TnNewIntlListFormat(locales interface{}, options interface{}) *TnIntlListFormat {
	l := &TnIntlListFormat{loc: TnIntlResolve(locales), type_: "conjunction", style: "long"}
	if v, ok := tnIntlOptStr(options, "type"); ok {
		if v != "conjunction" && v != "disjunction" && v != "unit" {
			tnIntlRangeError("Invalid type: " + v)
		}
		l.type_ = v
	}
	if v, ok := tnIntlOptStr(options, "style"); ok {
		if v != "long" && v != "short" && v != "narrow" {
			tnIntlRangeError("Invalid style: " + v)
		}
		l.style = v
	}
	return l
}

// The elements as strings (any array)
func tnIntlItemList(items interface{}) []string {
	var in []interface{}
	switch v := items.(type) {
	case []interface{}:
		in = v
	case []string:
		out := make([]string, len(v))
		for i, s := range v {
			out[i] = s
		}
		return out
	default:
		in = TnToArray(items)
	}
	out := make([]string, len(in))
	for i, e := range in {
		out[i] = TnJSString(e)
	}
	return out
}

// The pair separator, or (sep "end") the last one: the contextual variant
// ("e" before i-initial words) when the next element starts with one of the
// variant's triggers. In the last separator the pair word is swapped for the
// variant's (es "a, b e inglés")
func tnIntlPairSep(l *TnIntlListFormat, second string) string {
	return tnIntlContextSep(l, second, "pair")
}

func tnIntlContextSep(l *TnIntlListFormat, second string, sep string) string {
	data := tnIntlListParts(l.loc.data)
	key := tnIntlListKey(l)
	pair := data[key+":pair"]
	base := data[key+":"+sep]
	if alt, ok := data[key+":pairAlt"]; ok {
		parts := strings.SplitN(alt, "\\u0001", 2)
		if len(parts) == 2 {
			lower := strings.ToLower(second)
			for _, trigger := range strings.Split(parts[0], ",") {
				if trigger != "" && strings.HasPrefix(lower, trigger) {
					variants := strings.Split(parts[1], "\\u0001")
					if len(variants) == 0 {
						break
					}
					if sep == "pair" {
						return variants[0]
					}
					word, variant := strings.TrimSpace(pair), strings.TrimSpace(variants[0])
					if word != "" && strings.Contains(base, word) {
						return strings.Replace(base, word, variant, 1)
					}
					return base
				}
			}
		}
	}
	return base
}

func tnIntlListKey(l *TnIntlListFormat) string {
	return map[string]string{"conjunction": "conj", "disjunction": "disj", "unit": "unit"}[l.type_] + ":" + l.style
}

func TnIntlListFormatParts(l *TnIntlListFormat, items interface{}) []interface{} {
	data := tnIntlListParts(l.loc.data)
	key := tnIntlListKey(l)
	list := tnIntlItemList(items)
	out := []interface{}{}
	if len(list) == 0 {
		return out
	}
	if len(list) == 1 {
		out = append(out, tnIntlObj("type", "element", "value", list[0]))
		return out
	}
	for i, e := range list {
		if i > 0 {
			sep := ""
			if len(list) == 2 {
				sep = tnIntlPairSep(l, e)
			} else if i == 1 {
				sep = data[key+":start"]
			} else if i == len(list)-1 {
				sep = tnIntlContextSep(l, e, "end")
			} else {
				sep = data[key+":middle"]
			}
			if sep != "" {
				out = append(out, tnIntlObj("type", "literal", "value", sep))
			}
		}
		out = append(out, tnIntlObj("type", "element", "value", e))
	}
	return out
}

func TnIntlListFormatFormat(l *TnIntlListFormat, items interface{}) string {
	var b strings.Builder
	for _, p := range TnIntlListFormatParts(l, items) {
		b.WriteString(TnJSString(tnIntlGet(p, "value")))
	}
	return b.String()
}

func (l *TnIntlListFormat) resolvedOptions() interface{} {
	return tnIntlObj("locale", l.loc.id, "type", l.type_, "style", l.style)
}

// --- Intl.RelativeTimeFormat

type TnIntlRelativeTimeFormat struct {
	loc     *TnIntlLoc
	numeric string
	style   string
}

var tnIntlRelUnits = map[string]bool{"second": true, "minute": true, "hour": true, "day": true, "week": true, "month": true, "quarter": true, "year": true}

func tnIntlRelUnit(unit string) string {
	if tnIntlRelUnits[unit] {
		return unit
	}
	if strings.HasSuffix(unit, "s") && tnIntlRelUnits[unit[:len(unit)-1]] {
		return unit[:len(unit)-1]
	}
	tnIntlRangeError("Invalid unit: " + unit)
	return ""
}

func TnNewIntlRelativeTimeFormat(locales interface{}, options interface{}) *TnIntlRelativeTimeFormat {
	r := &TnIntlRelativeTimeFormat{loc: TnIntlResolve(locales), numeric: "always", style: "long"}
	if v, ok := tnIntlOptStr(options, "numeric"); ok {
		if v != "always" && v != "auto" {
			tnIntlRangeError("Invalid numeric: " + v)
		}
		r.numeric = v
	}
	if v, ok := tnIntlOptStr(options, "style"); ok {
		if v != "long" && v != "short" && v != "narrow" {
			tnIntlRangeError("Invalid style: " + v)
		}
		r.style = v
	}
	return r
}

// The pattern for a value and unit, with the {n} placeholder
func (r *TnIntlRelativeTimeFormat) patternFor(value float64, unit string) string {
	data := tnIntlRelParts(r.loc.data)
	unit = tnIntlRelUnit(unit)
	style := map[string]string{"long": "l", "short": "s", "narrow": "n"}[r.style]
	if r.numeric == "auto" && value == math.Trunc(value) && value >= -2 && value <= 2 {
		if v, ok := data["relauto:"+unit+":"+style+":"+strconv.Itoa(int(value))]; ok {
			return v
		}
	}
	cat := tnIntlPluralOfNumber(r.loc.tag, math.Abs(value))
	sign := "f"
	if value < 0 {
		sign = "p"
	}
	nk := "N"
	if r.numeric == "auto" {
		nk = "A"
	}
	key := "rel:" + unit + ":" + style + ":" + nk + ":" + cat + ":" + sign
	if v, ok := data[key]; ok {
		return v
	}
	if v, ok := data["rel:"+unit+":"+style+":N:other:"+sign]; ok {
		return v
	}
	if v, ok := data["rel:"+unit+":l:N:other:"+sign]; ok {
		return v
	}
	return strconv.FormatFloat(math.Abs(value), 'f', -1, 64) + " " + unit
}

// The number inside the pattern: the locale's decimal formatting with three
// fraction digits at most (as ICU renders it)
func (r *TnIntlRelativeTimeFormat) numberFor(value float64) string {
	f := TnNewIntlNumberFormat(r.loc.id, map[string]interface{}{"maximumFractionDigits": float64(3)})
	return TnIntlNumberFormatAnyStr(f, math.Abs(value))
}

func TnIntlRelativeFormat(r *TnIntlRelativeTimeFormat, value interface{}, unit string) string {
	v := TnNumber(value)
	s := r.patternFor(v, tnIntlRelUnit(unit))
	return strings.ReplaceAll(s, "{n}", r.numberFor(v))
}

func TnIntlRelativeParts(r *TnIntlRelativeTimeFormat, value interface{}, unit string) []interface{} {
	v := TnNumber(value)
	unit = tnIntlRelUnit(unit)
	s := r.patternFor(v, unit)
	out := []interface{}{}
	before, after, found := strings.Cut(s, "{n}")
	if !found {
		out = append(out, tnIntlObj("type", "literal", "value", s))
		return out
	}
	if before != "" {
		out = append(out, tnIntlObj("type", "literal", "value", before))
	}
	f := TnNewIntlNumberFormat(r.loc.id, map[string]interface{}{"maximumFractionDigits": float64(3)})
	out = append(out, tnIntlNumJSParts2(TnIntlNumberFormatAny(f, math.Abs(v)), unit)...)
	if after != "" {
		out = append(out, tnIntlObj("type", "literal", "value", after))
	}
	return out
}

// A number's parts with the unit tag added (RelativeTimeFormat's parts carry it)
func tnIntlNumJSParts2(parts []interface{}, unit string) []interface{} {
	out := []interface{}{}
	for _, p := range parts {
		m := p.(*TnMap[string, interface{}])
		switch m.Get("type") {
		case "integer", "group", "decimal", "fraction", "minusSign", "plusSign":
			m.Set("unit", unit)
		}
		out = append(out, m)
	}
	return out
}

func (r *TnIntlRelativeTimeFormat) resolvedOptions() interface{} {
	nu := r.loc.tag.TypeForKey("nu")
	if nu == "" {
		nu = "latn"
	}
	return tnIntlObj("locale", r.loc.id, "style", r.style, "numeric", r.numeric, "numberingSystem", nu)
}`;

const intlSegGo = `// Intl.Segmenter: the UAX #29 rules (grapheme clusters, words with their
// isWordLike flag, sentences). CJK words break per ideograph — ICU's
// dictionary-based word breaks are not implemented.

type TnIntlSegmenter struct {
	loc         *TnIntlLoc
	granularity string
}

func TnNewIntlSegmenter(locales interface{}, options interface{}) *TnIntlSegmenter {
	s := &TnIntlSegmenter{loc: TnIntlResolve(locales), granularity: "grapheme"}
	if v, ok := tnIntlOptStr(options, "granularity"); ok {
		if v != "grapheme" && v != "word" && v != "sentence" {
			tnIntlRangeError("Invalid granularity: " + v)
		}
		s.granularity = v
	}
	return s
}

// The grapheme-break property of a rune: 1 CR, 2 LF, 3 Control, 4 Extend, 5
// ZWJ, 6 Regional_Indicator, 7 Prepend, 8 SpacingMark, 9/10/11 Hangul L/V/T,
// 12/13 LV/LVT, 14 Extended_Pictographic
func tnIntlGBProp(r rune) int {
	switch {
	case r == 0x0D:
		return 1
	case r == 0x0A:
		return 2
	case r == 0x200D:
		return 5
	case r >= 0x1F1E6 && r <= 0x1F1FF:
		return 6
	case r >= 0x1100 && r <= 0x115F, r >= 0xA960 && r <= 0xA97C:
		return 9
	case r >= 0x1160 && r <= 0x11A7, r >= 0xD7B0 && r <= 0xD7C6:
		return 10
	case r >= 0x11A8 && r <= 0x11FF, r >= 0xD7CB && r <= 0xD7FB:
		return 11
	case r >= 0x1F3FB && r <= 0x1F3FF:
		return 4 // emoji modifiers behave as Extend
	case r >= 0x0600 && r <= 0x0605, r == 0x06DD, r == 0x070F, r >= 0x0890 && r <= 0x0891, r == 0x08E2, r == 0x0D4E, r == 0x110BD, r == 0x110CD, r >= 0x111C2 && r <= 0x111C3, r == 0x11A3A, r >= 0x11A84 && r <= 0x11A89, r == 0x11D46, r == 0x11F02:
		return 7
	case r == 0x200C, r >= 0xE0020 && r <= 0xE007F:
		return 4
	case unicode.Is(unicode.Cc, r), unicode.Is(unicode.Zl, r), unicode.Is(unicode.Zp, r), unicode.Is(unicode.Cf, r):
		return 3
	case unicode.Is(unicode.Mn, r), unicode.Is(unicode.Me, r), r == 0x200C:
		return 4
	case unicode.Is(unicode.Mc, r):
		return 8
	}
	if r >= 0xAC00 && r <= 0xD7A3 {
		if (r-0xAC00)%28 == 0 {
			return 12
		}
		return 13
	}
	if tnIntlIsExtPict(r) {
		return 14
	}
	return 0
}

// Extended_Pictographic (the emoji planes' common ranges)
func tnIntlIsExtPict(r rune) bool {
	switch {
	case r == 0x00A9 || r == 0x00AE || r == 0x203C || r == 0x2049 || r == 0x2122 || r == 0x2139:
		return true
	case r >= 0x2194 && r <= 0x21AA, r >= 0x231A && r <= 0x231B, r >= 0x2328 && r <= 0x23FA:
		return true
	case r >= 0x25AA && r <= 0x25FE, r >= 0x2600 && r <= 0x27BF, r >= 0x2934 && r <= 0x2935:
		return true
	case r >= 0x2B05 && r <= 0x2B55, r >= 0x3030 && r <= 0x303D, r >= 0x3297 && r <= 0x3299:
		return true
	case r >= 0x1F000 && r <= 0x1FAFF, r >= 0x1FC00 && r <= 0x1FFFD:
		return true
	}
	return false
}

// The grapheme clusters of a string (UAX #29 GB3-GB13), as [start, end) byte
// offsets
func tnIntlGraphemes(s string, cb func(start, end int)) {
	start := 0
	prev := -1
	riCount := 0     // regional indicators in a row, before this rune
	inPict := false  // inside ExtPict Extend*
	pictZWJ := false // right after ExtPict Extend* ZWJ
	for pos := 0; pos < len(s); {
		r, size := utf8.DecodeRuneInString(s[pos:])
		p := tnIntlGBProp(r)
		if pos > 0 && tnIntlGBBreak(prev, p, riCount, pictZWJ) {
			cb(start, pos)
			start = pos
		}
		if p == 6 {
			riCount++
		} else {
			riCount = 0
		}
		switch p {
		case 14:
			inPict, pictZWJ = true, false
		case 5:
			pictZWJ, inPict = inPict, false
		case 4:
			pictZWJ = false
		default:
			inPict, pictZWJ = false, false
		}
		prev = p
		pos += size
	}
	if start < len(s) {
		cb(start, len(s))
	}
}

// Whether a grapheme cluster ends between runes of properties a and b
func tnIntlGBBreak(a, b, riCount int, pictZWJ bool) bool {
	switch {
	case a == 1 && b == 2:
		return false // GB3 CR × LF
	case a == 1 || a == 2 || a == 3, b == 1 || b == 2 || b == 3:
		return true // GB4/5 around controls
	case a == 9 && (b == 9 || b == 10 || b == 12 || b == 13):
		return false // GB6 L × (L | V | LV | LVT)
	case (a == 12 || a == 10) && (b == 10 || b == 11):
		return false // GB7 (LV | V) × (V | T)
	case (a == 13 || a == 11) && b == 11:
		return false // GB8 (LVT | T) × T
	case b == 4 || b == 5 || b == 8:
		return false // GB9/9a × (Extend | ZWJ | SpacingMark)
	case a == 7:
		return false // GB9b Prepend ×
	case a == 5 && b == 14 && pictZWJ:
		return false // GB11 ExtPict Extend* ZWJ × ExtPict
	case a == 6 && b == 6:
		return riCount%2 == 0 // GB12/13 regional-indicator pairs
	}
	return true
}

// Word break classes (UAX #29, as ICU 78 applies them)
const (
	tnWBOther = iota
	tnWBCR
	tnWBLF
	tnWBNewline
	tnWBExtend
	tnWBZWJ
	tnWBRI
	tnWBKatakana
	tnWBHiragana
	tnWBIdeo
	tnWBALetter
	tnWBSingleQuote
	tnWBMidNumLet
	tnWBMidLetter
	tnWBMidNum
	tnWBNumeric
	tnWBExtendNumLet
	tnWBSpace
)

func tnIntlWBClass(r rune) int {
	switch {
	case r == 13:
		return tnWBCR
	case r == 10:
		return tnWBLF
	case r == 11 || r == 12 || r == 0x85 || r == 0x2028 || r == 0x2029:
		return tnWBNewline
	case r == 0x200D:
		return tnWBZWJ
	case r >= 0x1F1E6 && r <= 0x1F1FF:
		return tnWBRI
	case r == 39:
		return tnWBSingleQuote
	case r == 46 || r == 0x2018 || r == 0x2019 || r == 0x2024 || r == 0xFE52 || r == 0xFF07 || r == 0xFF0E:
		return tnWBMidNumLet
	case r == 58 || r == 0xB7 || r == 0x387 || r == 0x55F || r == 0x5F4 || r == 0x2027 || r == 0xFE13 || r == 0xFE55 || r == 0xFF1A:
		return tnWBMidLetter
	case r == 44 || r == 59 || r == 0x37E || r == 0x589 || r == 0x60C || r == 0x60D || r == 0x66C || r == 0x7F8 || r == 0x2044 || r == 0xFE10 || r == 0xFE14 || r == 0xFE50 || r == 0xFE54 || r == 0xFF0C || r == 0xFF1B:
		return tnWBMidNum
	case r == 95 || r == 0x203F || r == 0x2040 || r == 0x2054 || r == 0xFE33 || r == 0xFE34 || (r >= 0xFE4D && r <= 0xFE4F) || r == 0xFF3F:
		return tnWBExtendNumLet
	case unicode.Is(unicode.Mn, r), unicode.Is(unicode.Me, r), unicode.Is(unicode.Mc, r), r == 0x200C:
		return tnWBExtend
	case r >= 0x1F3FB && r <= 0x1F3FF, r >= 0xE0020 && r <= 0xE007F:
		return tnWBExtend
	case unicode.Is(unicode.Cf, r) && r != 0x200B:
		return tnWBExtend
	case r == 32 || r == 0x1680 || (r >= 0x2000 && r <= 0x2006) || (r >= 0x2008 && r <= 0x200A) || r == 0x205F || r == 0x3000:
		return tnWBSpace
	case r == 0x30FB:
		return tnWBOther
	case (r >= 0x30A0 && r <= 0x30FF) || (r >= 0x31F0 && r <= 0x31FF) || (r >= 0x32D0 && r <= 0x32FE) || (r >= 0x3300 && r <= 0x3357) || (r >= 0xFF66 && r <= 0xFF9D) || (r >= 0x3031 && r <= 0x3035) || r == 0x309B || r == 0x309C:
		return tnWBKatakana
	case r >= 0x3040 && r <= 0x309F:
		return tnWBHiragana
	case unicode.Is(unicode.Han, r):
		return tnWBIdeo
	case unicode.IsDigit(r):
		return tnWBNumeric
	case unicode.IsLetter(r):
		return tnWBALetter
	}
	return tnWBOther
}

type tnIntlWBUnit struct {
	cls, start, end int
	zwj             bool // ends with a ZWJ
	pict            bool // starts with an Extended_Pictographic
}

// The words of a string (UAX #29 WB1-WB16) with ICU's isWordLike (letters,
// numbers, kana, ideographs, connector runs). Without ICU's dictionaries,
// hiragana runs stay together and each ideograph is its own word; Thai, Lao,
// Khmer and Myanmar runs are one word each
func tnIntlWords(s string, cb func(start, end int, wordLike bool)) {
	units := []tnIntlWBUnit{}
	for pos := 0; pos < len(s); {
		r, size := utf8.DecodeRuneInString(s[pos:])
		c := tnIntlWBClass(r)
		n := len(units)
		// WB4: Extend / Format / ZWJ belong to the unit before (not after a newline)
		if (c == tnWBExtend || c == tnWBZWJ) && n > 0 && units[n-1].cls != tnWBCR && units[n-1].cls != tnWBLF && units[n-1].cls != tnWBNewline {
			units[n-1].end = pos + size
			units[n-1].zwj = c == tnWBZWJ
			pos += size
			continue
		}
		units = append(units, tnIntlWBUnit{cls: c, start: pos, end: pos + size, zwj: c == tnWBZWJ, pict: tnIntlIsExtPict(r)})
		pos += size
	}
	if len(units) == 0 {
		return
	}
	cls := func(i int) int {
		if i < 0 || i >= len(units) {
			return -1
		}
		return units[i].cls
	}
	isAH := func(c int) bool { return c == tnWBALetter }
	isMidLetter := func(c int) bool { return c == tnWBMidLetter || c == tnWBMidNumLet || c == tnWBSingleQuote }
	isMidNum := func(c int) bool { return c == tnWBMidNum || c == tnWBMidNumLet || c == tnWBSingleQuote }
	wordish := func(c int) bool {
		return c == tnWBALetter || c == tnWBNumeric || c == tnWBKatakana || c == tnWBHiragana || c == tnWBIdeo || c == tnWBExtendNumLet
	}
	riRun := 0
	joins := func(i int) bool {
		a, b := cls(i-1), cls(i)
		switch {
		case a == tnWBCR && b == tnWBLF:
			return true // WB3
		case a == tnWBCR || a == tnWBLF || a == tnWBNewline || b == tnWBCR || b == tnWBLF || b == tnWBNewline:
			return false // WB3a/3b
		case units[i-1].zwj && units[i].pict:
			return true // WB3c ZWJ × ExtPict
		case a == tnWBSpace && b == tnWBSpace:
			return true // WB3d
		case isAH(a) && isAH(b):
			return true // WB5
		case isAH(a) && isMidLetter(b) && isAH(cls(i+1)):
			return true // WB6
		case isMidLetter(a) && isAH(cls(i-2)) && isAH(b):
			return true // WB7
		case a == tnWBNumeric && b == tnWBNumeric, isAH(a) && b == tnWBNumeric, a == tnWBNumeric && isAH(b):
			return true // WB8-10
		case isMidNum(a) && cls(i-2) == tnWBNumeric && b == tnWBNumeric:
			return true // WB11
		case a == tnWBNumeric && isMidNum(b) && cls(i+1) == tnWBNumeric:
			return true // WB12
		case a == tnWBKatakana && b == tnWBKatakana:
			return true // WB13
		case (isAH(a) || a == tnWBNumeric || a == tnWBKatakana || a == tnWBExtendNumLet) && b == tnWBExtendNumLet:
			return true // WB13a
		case a == tnWBExtendNumLet && (isAH(b) || b == tnWBNumeric || b == tnWBKatakana):
			return true // WB13b
		case a == tnWBRI && b == tnWBRI:
			return riRun%2 == 1 // WB15/16
		}
		return false
	}
	start := 0
	wordLike := wordish(units[0].cls)
	if units[0].cls == tnWBRI {
		riRun = 1
	}
	for i := 1; i < len(units); i++ {
		if !joins(i) {
			cb(units[start].start, units[i].start, wordLike)
			start = i
			wordLike = false
		}
		if wordish(units[i].cls) {
			wordLike = true
		}
		if units[i].cls == tnWBRI {
			riRun++
		} else {
			riRun = 0
		}
	}
	cb(units[start].start, len(s), wordLike)
}

// Sentence break classes (UAX #29)
const (
	tnSBOther = iota
	tnSBSep
	tnSBSp
	tnSBLower
	tnSBUpper
	tnSBOLetter
	tnSBNumeric
	tnSBATerm
	tnSBSTerm
	tnSBClose
	tnSBSContinue
	tnSBExtend
)

func tnIntlSBClass(r rune) int {
	switch {
	case r == 10 || r == 13 || r == 0x85 || r == 0x2028 || r == 0x2029:
		return tnSBSep
	case r == 46 || r == 0x2024 || r == 0xFE52 || r == 0xFF0E:
		return tnSBATerm
	case r == 33 || r == 63 || r == 0x589 || (r >= 0x61D && r <= 0x61F) || r == 0x6D4 || (r >= 0x700 && r <= 0x702) || r == 0x7F9 || r == 0x964 || r == 0x965 || r == 0x104A || r == 0x104B || r == 0x1362 || r == 0x1367 || r == 0x1368 || r == 0x166E || r == 0x1803 || r == 0x1809 || r == 0x1944 || r == 0x1945 || r == 0x203C || r == 0x203D || (r >= 0x2047 && r <= 0x2049) || r == 0x2E2E || r == 0x3002 || r == 0xFE56 || r == 0xFE57 || r == 0xFF01 || r == 0xFF1F || r == 0xFF61:
		return tnSBSTerm
	case r == 44 || r == 45 || r == 58 || r == 59 || r == 0x55D || r == 0x60C || r == 0x60D || r == 0x7F8 || r == 0x1802 || r == 0x1808 || r == 0x2013 || r == 0x2014 || r == 0x3001 || r == 0xFE10 || r == 0xFE11 || r == 0xFE13 || r == 0xFE31 || r == 0xFE32 || r == 0xFE50 || r == 0xFE51 || r == 0xFE55 || r == 0xFE58 || r == 0xFE63 || r == 0xFF0C || r == 0xFF0D || r == 0xFF1A || r == 0xFF1B || r == 0xFF64:
		return tnSBSContinue
	case unicode.Is(unicode.Mn, r), unicode.Is(unicode.Me, r), unicode.Is(unicode.Mc, r), r == 0x200C, r == 0x200D:
		return tnSBExtend
	case unicode.Is(unicode.Cf, r) && r != 0x200B:
		return tnSBExtend
	case unicode.IsSpace(r):
		return tnSBSp
	case unicode.IsLower(r):
		return tnSBLower
	case unicode.IsUpper(r) || unicode.IsTitle(r):
		return tnSBUpper
	case unicode.IsDigit(r):
		return tnSBNumeric
	case unicode.IsLetter(r):
		return tnSBOLetter
	case r == 34 || r == 39 || unicode.Is(unicode.Ps, r) || unicode.Is(unicode.Pe, r) || unicode.Is(unicode.Pi, r) || unicode.Is(unicode.Pf, r):
		return tnSBClose
	}
	return tnSBOther
}

// The sentences of a string (UAX #29 SB1-SB11, without ICU's suppressions:
// "Mr. Smith" breaks after "Mr. ", as in Node)
func tnIntlSentences(s string, cb func(start, end int)) {
	type unit struct {
		cls, start int
		r          rune
	}
	units := []unit{}
	for pos := 0; pos < len(s); {
		r, size := utf8.DecodeRuneInString(s[pos:])
		c := tnIntlSBClass(r)
		pos += size
		// SB5: Extend / Format belong to the unit before (not after a separator)
		if c == tnSBExtend && len(units) > 0 && units[len(units)-1].cls != tnSBSep {
			continue
		}
		units = append(units, unit{cls: c, start: pos - size, r: r})
	}
	n := len(units)
	cls := func(i int) int {
		if i < 0 || i >= n {
			return -1
		}
		return units[i].cls
	}
	// a separator: CR LF counts as one
	sepEnd := func(j int) int {
		if units[j].r == 13 && j+1 < n && units[j+1].r == 10 {
			return j + 2
		}
		return j + 1
	}
	start := 0
	for i := 0; i < n; {
		c := units[i].cls
		if c == tnSBSep {
			j := sepEnd(i) // SB4: break after a paragraph separator
			if j < n {
				cb(units[start].start, units[j].start)
				start = j
			}
			i = j
			continue
		}
		if c != tnSBATerm && c != tnSBSTerm {
			i++
			continue
		}
		j := i + 1
		if c == tnSBATerm && cls(j) == tnSBNumeric {
			i = j // SB6 ATerm × Numeric
			continue
		}
		if c == tnSBATerm && (cls(i-1) == tnSBUpper || cls(i-1) == tnSBLower) && cls(j) == tnSBUpper {
			i = j // SB7 (Upper | Lower) ATerm × Upper
			continue
		}
		for cls(j) == tnSBClose {
			j++
		}
		for cls(j) == tnSBSp {
			j++
		}
		if cls(j) == tnSBSContinue || cls(j) == tnSBATerm || cls(j) == tnSBSTerm {
			i = j // SB8a
			continue
		}
		if c == tnSBATerm {
			// SB8: ATerm Close* Sp* × (¬(OLetter | Upper | Lower | Sep | SATerm))* Lower
			k := j
			for k < n {
				ck := units[k].cls
				if ck == tnSBOLetter || ck == tnSBUpper || ck == tnSBLower || ck == tnSBSep || ck == tnSBATerm || ck == tnSBSTerm {
					break
				}
				k++
			}
			if cls(k) == tnSBLower {
				i = k
				continue
			}
		}
		if cls(j) == tnSBSep {
			j = sepEnd(j) // SB9-11: the separator stays with the sentence
		}
		if j >= n {
			break
		}
		cb(units[start].start, units[j].start)
		start = j
		i = j
	}
	if start < n {
		cb(units[start].start, len(s))
	}
}

// segment(): the segments of a string; index and containing() count UTF-16
// code units, as JS strings do
type TnIntlSegmentIter struct {
	seg   *TnIntlSegmenter
	input string
	segs  []tnIntlSpan
}

type tnIntlSpan struct {
	start, end     int // bytes
	index, index16 int // UTF-16 offsets of the start and the end
	wordLike       bool
}

func (s *TnIntlSegmenter) segment(input string) *TnIntlSegmentIter {
	it := &TnIntlSegmentIter{seg: s, input: input}
	// byte offset → UTF-16 offset
	u16 := make([]int, len(input)+1)
	u := 0
	for i, r := range input {
		u16[i] = u
		if r >= 0x10000 {
			u += 2
		} else {
			u++
		}
	}
	u16[len(input)] = u
	add := func(start, end int, wordLike bool) {
		it.segs = append(it.segs, tnIntlSpan{start: start, end: end, index: u16[start], index16: u16[end], wordLike: wordLike})
	}
	switch s.granularity {
	case "word":
		tnIntlWords(input, add)
	case "sentence":
		tnIntlSentences(input, func(start, end int) { add(start, end, false) })
	default:
		tnIntlGraphemes(input, func(start, end int) { add(start, end, false) })
	}
	return it
}

// for..of / spread: the segments as records ({segment, index, input, isWordLike})
func (it *TnIntlSegmentIter) tnItems() []interface{} {
	out := make([]interface{}, 0, len(it.segs))
	for _, sp := range it.segs {
		out = append(out, it.spanAt(sp))
	}
	return out
}

func (it *TnIntlSegmentIter) spanAt(sp tnIntlSpan) *TnMap[string, interface{}] {
	m := tnIntlObj("segment", it.input[sp.start:sp.end], "index", float64(sp.index), "input", it.input)
	if it.seg.granularity == "word" {
		m.Set("isWordLike", sp.wordLike)
	}
	return m
}

// containing(index): the segment covering a UTF-16 index (0 by default;
// undefined outside the string)
func (it *TnIntlSegmentIter) containing(index ...interface{}) interface{} {
	idx := 0.0
	if len(index) > 0 && index[0] != nil {
		idx = math.Trunc(TnNumber(index[0]))
		if math.IsNaN(idx) {
			idx = 0
		}
	}
	for _, sp := range it.segs {
		if idx >= float64(sp.index) && idx < float64(sp.index16) {
			return it.spanAt(sp)
		}
	}
	return nil
}

func (s *TnIntlSegmenter) resolvedOptions() interface{} {
	return tnIntlObj("locale", s.loc.id, "granularity", s.granularity)
}
`;

const intlDisplayGo = `// Intl.DisplayNames: the generated tables (the names Node renders), falling
// back to golang.org/x/text/language/display for codes they don't list

func tnIntlDisplayNames(data string) map[string]string {
	if m := tnIntlDisplay[data]; m != nil {
		return m
	}
	return tnIntlDisplay["en"]
}

type TnIntlDisplayNames struct {
	loc             *TnIntlLoc
	type_           string
	fallback        string
	style           string
	languageDisplay string
}

func TnNewIntlDisplayNames(locales interface{}, options interface{}) *TnIntlDisplayNames {
	d := &TnIntlDisplayNames{loc: TnIntlResolve(locales), fallback: "code", style: "long", languageDisplay: "dialect"}
	if v, ok := tnIntlOptStr(options, "style"); ok {
		if v != "long" && v != "short" && v != "narrow" {
			tnIntlRangeError("Value " + v + " out of range for Intl.DisplayNames options property style")
		}
		d.style = v
	}
	t, ok := tnIntlOptStr(options, "type")
	if !ok {
		panic(TnNodeError("TypeError", "", "Required option 'type' is missing"))
	}
	if !tnIntlHasString([]string{"language", "region", "script", "currency", "calendar", "dateTimeField"}, t) {
		tnIntlRangeError("Value " + t + " out of range for Intl.DisplayNames options property type")
	}
	d.type_ = t
	if v, ok := tnIntlOptStr(options, "fallback"); ok {
		if v != "code" && v != "none" {
			tnIntlRangeError("Value " + v + " out of range for Intl.DisplayNames options property fallback")
		}
		d.fallback = v
	}
	if v, ok := tnIntlOptStr(options, "languageDisplay"); ok {
		if v != "dialect" && v != "standard" {
			tnIntlRangeError("Value " + v + " out of range for Intl.DisplayNames options property languageDisplay")
		}
		d.languageDisplay = v
	}
	return d
}

func tnIntlCapitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// A language's name: the generated dialect combos ("Brazilian Portuguese"),
// else the script as a parenthetical ("Chinese (Simplified)"), else x/text
func tnIntlLanguageName(d *TnIntlDisplayNames, target xlanguage.Tag) string {
	data := tnIntlDisplayNames(d.loc.data)
	code := target.String()
	if v, ok := data["dn:language:"+d.style+":"+code]; ok {
		return v
	}
	base := strings.SplitN(tnIntlBaseOf(code), "-", 2)[0]
	_, script, _ := target.Raw()
	if script.String() != "Zzzz" {
		bName := ""
		if v, ok := data["dn:language:"+d.style+":"+base]; ok {
			bName = v
		} else {
			bName = xdisplay.Languages(d.loc.tag).Name(xlanguage.MustParse(base))
		}
		sName := ""
		if v, ok := data["dn:script:"+d.style+":"+script.String()]; ok {
			sName = v
		} else {
			sName = xdisplay.Scripts(d.loc.tag).Name(xlanguage.MustParse("und-" + script.String()))
		}
		if bName != "" && sName != "" {
			return bName + " (" + sName + ")"
		}
	}
	if n := xdisplay.Languages(d.loc.tag).Name(target); n != "" {
		return n
	}
	return ""
}

// of(code): the name, else the canonical code (fallback "code") or
// undefined (fallback "none"); a malformed code is a RangeError
func (d *TnIntlDisplayNames) of(code string) interface{} {
	data := tnIntlDisplayNames(d.loc.data)
	invalid := func() { tnIntlRangeError("invalid_argument") }
	name, canonical := "", code
	switch d.type_ {
	case "language":
		c, ok := tnIntlCanonicalTag(code)
		if !ok {
			invalid()
		}
		canonical = c
		if d.languageDisplay == "standard" {
			name = tnIntlStandardLanguageName(d, c)
		} else if v, ok := data["dn:language:"+d.style+":"+c]; ok {
			name = v
		} else if tag, err := xlanguage.Parse(c); err == nil {
			name = tnIntlLanguageName(d, tag)
		}
	case "region":
		region := strings.ToUpper(code)
		if !tnIntlTagRE.MatchString("und-" + region) || (len(region) != 2 && len(region) != 3) {
			invalid()
		}
		canonical = region
		name = tnIntlRegionName(d, region)
	case "script":
		script := tnIntlCapitalize(strings.ToLower(code))
		if len(script) != 4 || !tnIntlTagRE.MatchString("und-"+script) {
			invalid()
		}
		canonical = script
		if v, ok := data["dn:script:"+d.style+":"+script]; ok {
			name = v
		} else if v, ok := data["dn:script:long:"+script]; ok {
			name = v
		} else if t, err := xlanguage.Parse("und-" + script); err == nil {
			name = xdisplay.Scripts(d.loc.tag).Name(t)
		}
	case "currency":
		cur := strings.ToUpper(code)
		if len(cur) != 3 {
			invalid()
		}
		canonical = cur
		if v, ok := data["dn:currency:"+d.style+":"+cur]; ok {
			name = v
		} else if v, ok := data["dn:currency:long:"+cur]; ok {
			name = v
		}
	case "calendar", "dateTimeField":
		canonical = code
		if v, ok := data["dn:"+d.type_+":"+d.style+":"+code]; ok {
			name = v
		} else if v, ok := data["dn:"+d.type_+":long:"+code]; ok {
			name = v
		} else if d.type_ == "dateTimeField" && !tnIntlHasString([]string{"era", "year", "quarter", "month", "weekOfYear", "weekday", "day", "dayPeriod", "hour", "minute", "second", "timeZoneName"}, code) {
			invalid()
		}
	}
	if name != "" && name != canonical {
		return name
	}
	if d.fallback == "none" {
		return nil
	}
	return canonical
}

// A region's name: the generated tables, then golang.org/x/text
func tnIntlRegionName(d *TnIntlDisplayNames, region string) string {
	data := tnIntlDisplayNames(d.loc.data)
	if v, ok := data["dn:region:"+d.style+":"+region]; ok {
		return v
	}
	if v, ok := data["dn:region:long:"+region]; ok {
		return v
	}
	if t, err := xlanguage.Parse("und-" + region); err == nil {
		if n := xdisplay.Regions(d.loc.tag).Name(t); n != "" {
			return n
		}
	}
	return ""
}

// languageDisplay "standard": the language's name with its script and
// region names in the locale's pattern ("English (United States)")
func tnIntlStandardLanguageName(d *TnIntlDisplayNames, code string) string {
	data := tnIntlDisplayNames(d.loc.data)
	tag, err := xlanguage.Parse(code)
	if err != nil {
		return ""
	}
	base, script, region := tag.Raw()
	name := ""
	if v, ok := data["dn:language:"+d.style+":"+base.String()]; ok {
		name = v
	} else {
		name = xdisplay.Languages(d.loc.tag).Name(xlanguage.Make(base.String()))
	}
	if name == "" {
		return ""
	}
	extras := []string{}
	if s := script.String(); s != "Zzzz" && strings.Contains(code, "-"+s) {
		if v, ok := data["dn:script:long:"+s]; ok {
			extras = append(extras, v)
		} else if t, err := xlanguage.Parse("und-" + s); err == nil {
			extras = append(extras, xdisplay.Scripts(d.loc.tag).Name(t))
		}
	}
	if r := region.String(); r != "ZZ" && strings.Contains(code, "-"+r) {
		if v := tnIntlRegionName(d, r); v != "" {
			extras = append(extras, v)
		}
	}
	if len(extras) == 0 {
		return name
	}
	pattern := data["dn:pattern"]
	if pattern == "" {
		pattern = "{0} ({1})"
	}
	sep := data["dn:separator"]
	if sep == "" {
		sep = ", "
	}
	return strings.Replace(strings.Replace(pattern, "{0}", name, 1), "{1}", strings.Join(extras, sep), 1)
}

func (d *TnIntlDisplayNames) resolvedOptions() interface{} {
	out := tnIntlObj("locale", d.loc.id, "style", d.style, "type", d.type_, "fallback", d.fallback)
	if d.type_ == "language" {
		out.Set("languageDisplay", d.languageDisplay)
	}
	return out
}`;

const intlLocaleGo = `// Intl.Locale: a language tag and its parts (golang.org/x/text/language's
// parsing, the generated likely-subtags for maximize / minimize)

type TnIntlLocale struct {
	id  string
	tag xlanguage.Tag
}

func TnNewIntlLocale(tagStr string, options interface{}) *TnIntlLocale {
	if _, ok := tnIntlCanonicalTag(tagStr); !ok {
		panic(TnNodeError("RangeError", "", "Incorrect locale information provided"))
	}
	tag, err := xlanguage.Parse(tagStr)
	if err != nil {
		tag = xlanguage.Make(tagStr)
	}
	// the options replace the tag's parts
	if options != nil {
		if v, ok := tnIntlOptStr(options, "language"); ok {
			if !tnIntlValidLanguage(v) {
				panic(TnNodeError("RangeError", "", "Invalid language tag: "+tagStr))
			}
			tag = tnIntlTagReplace(tag, v, "", "")
		}
		if v, ok := tnIntlOptStr(options, "script"); ok {
			if !tnIntlValidScript(v) {
				panic(TnNodeError("RangeError", "", "Invalid language tag: "+tagStr))
			}
			tag = tnIntlTagReplace(tag, "", tnIntlCapitalize(strings.ToLower(v)), "")
		}
		if v, ok := tnIntlOptStr(options, "region"); ok {
			if !tnIntlValidRegion(v) {
				panic(TnNodeError("RangeError", "", "Invalid language tag: "+tagStr))
			}
			tag = tnIntlTagReplace(tag, "", "", strings.ToUpper(v))
		}
		for _, pair := range [][2]string{{"numberingSystem", "nu"}, {"calendar", "ca"}, {"caseFirst", "kf"}} {
			if v, ok := tnIntlOptStr(options, pair[0]); ok {
				tag, _ = tag.SetTypeForKey(pair[1], v)
			}
		}
		if v, ok := tnIntlOptStr(options, "hourCycle"); ok {
			tag, _ = tag.SetTypeForKey("hc", v)
		}
		if v, ok := tnIntlOptStr(options, "hour12"); ok {
			if TnTruthy(v) {
				tag, _ = tag.SetTypeForKey("hc", "h12")
			} else {
				tag, _ = tag.SetTypeForKey("hc", "h23")
			}
		}
		if v, ok := tnIntlOptStr(options, "numeric"); ok {
			if v != "true" && v != "false" {
				panic(TnNodeError("RangeError", "", "Invalid numeric: "+v))
			}
			tag, _ = tag.SetTypeForKey("kn", v)
		}
	}
	return &TnIntlLocale{id: tag.String(), tag: tag}
}

func tnIntlValidLanguage(s string) bool {
	if len(s) < 2 || len(s) > 8 {
		return false
	}
	for _, c := range s {
		if (c < 'a' || c > 'z') && (c < 'A' || c > 'Z') {
			return false
		}
	}
	return true
}

func tnIntlValidScript(s string) bool {
	return len(s) == 4 && tnIntlValidLanguage(s)
}

func tnIntlValidRegion(s string) bool {
	if len(s) == 2 {
		return (s[0] >= 'a' && s[0] <= 'z' || s[0] >= 'A' && s[0] <= 'Z') && (s[1] >= 'a' && s[1] <= 'z' || s[1] >= 'A' && s[1] <= 'Z')
	}
	if len(s) == 3 {
		for i := 0; i < 3; i++ {
			if s[i] < '0' || s[i] > '9' {
				return false
			}
		}
		return true
	}
	return false
}

// The tag with its language / script / region replaced
func tnIntlTagReplace(tag xlanguage.Tag, language, script, region string) xlanguage.Tag {
	id := tag.String()
	base := tnIntlBaseOf(id)
	parts := strings.Split(base, "-")
	out := []string{}
	if language != "" {
		out = append(out, strings.ToLower(language))
	} else {
		out = append(out, parts[0])
	}
	if script != "" {
		out = append(out, tnIntlCapitalize(strings.ToLower(script)))
	} else if len(parts) > 1 && len(parts[1]) == 4 {
		out = append(out, parts[1])
	}
	if region != "" {
		out = append(out, strings.ToUpper(region))
	} else if r := tnIntlRegionOf(id); r != "" {
		out = append(out, r)
	}
	t, err := xlanguage.Parse(strings.Join(out, "-") + tnIntlExtensionOf(id))
	if err != nil {
		return tag
	}
	return t
}

func (l *TnIntlLocale) Get_baseName() string { return tnIntlBaseOf(l.id) }
func (l *TnIntlLocale) Get_language() string { return tnIntlLanguageOf(l.id) }

// The optional parts: undefined when the tag has none
func tnIntlOptionalString(v string) interface{} {
	if v == "" {
		return nil
	}
	return v
}

func (l *TnIntlLocale) Get_script() interface{} { return tnIntlOptionalString(tnIntlScriptOf(l.id)) }
func (l *TnIntlLocale) Get_region() interface{} { return tnIntlOptionalString(tnIntlRegionOf(l.id)) }
func (l *TnIntlLocale) Get_numberingSystem() interface{} {
	return tnIntlOptionalString(l.tag.TypeForKey("nu"))
}
func (l *TnIntlLocale) Get_calendar() interface{} {
	return tnIntlOptionalString(l.tag.TypeForKey("ca"))
}
func (l *TnIntlLocale) Get_collation() interface{} {
	return tnIntlOptionalString(l.tag.TypeForKey("co"))
}
func (l *TnIntlLocale) Get_caseFirst() interface{} {
	return tnIntlOptionalString(l.tag.TypeForKey("kf"))
}

// numeric: -u-kn (or -u-kn-true) is true
func (l *TnIntlLocale) Get_numeric() bool {
	return strings.Contains(l.id+"-", "-kn-") && l.tag.TypeForKey("kn") != "false"
}
func (l *TnIntlLocale) Get_hourCycle() interface{} {
	return tnIntlOptionalString(l.tag.TypeForKey("hc"))
}

// maximize: the likely subtags fill the script and region in
func (l *TnIntlLocale) maximize() *TnIntlLocale {
	id := l.id
	base := tnIntlBaseOf(id)
	parts := strings.Split(base, "-")
	lang := parts[0]
	full, ok := tnIntlLikely[lang]
	if !ok {
		return &TnIntlLocale{id: id, tag: l.tag}
	}
	fp := strings.Split(full, "-") // language, script, region
	haveScript := len(parts) > 1 && len(parts[1]) == 4
	region := tnIntlRegionOf(id)
	script := ""
	if haveScript {
		script = parts[1]
	} else {
		script = fp[1]
		if rules, ok := tnIntlScriptByRegion[lang]; ok && region != "" {
			for _, pair := range strings.Split(rules, ";") {
				kv := strings.SplitN(pair, "=", 2)
				if len(kv) == 2 && tnIntlHasString(strings.Split(kv[0], ","), region) {
					script = kv[1]
				}
			}
		}
	}
	out := []string{lang, script}
	if region != "" {
		out = append(out, region)
	} else {
		out = append(out, fp[len(fp)-1])
	}
	t, err := xlanguage.Parse(strings.Join(out, "-") + tnIntlExtensionOf(id))
	if err != nil {
		return &TnIntlLocale{id: id, tag: l.tag}
	}
	return &TnIntlLocale{id: t.String(), tag: t}
}

// minimize: the shortest tag with the same maximization
func (l *TnIntlLocale) minimize() *TnIntlLocale {
	if v, ok := tnIntlMinimal[l.id]; ok {
		t, err := xlanguage.Parse(v)
		if err == nil {
			return &TnIntlLocale{id: t.String(), tag: t}
		}
	}
	max := l.maximize()
	base := tnIntlBaseOf(max.id)
	parts := strings.Split(base, "-")
	cands := []string{parts[0]}
	if len(parts) > 2 {
		cands = append(cands, parts[0]+"-"+parts[2])
	}
	cands = append(cands, base)
	for _, c := range cands {
		t, err := xlanguage.Parse(c + tnIntlExtensionOf(l.id))
		if err != nil {
			continue
		}
		m := &TnIntlLocale{id: t.String(), tag: t}
		if m.maximize().id == max.id {
			return m
		}
	}
	return &TnIntlLocale{id: max.id, tag: max.tag}
}

func (l *TnIntlLocale) toString() string { return l.id }`;

const intlCaseGo = `// s.toLocaleUpperCase(locales) / s.toLocaleLowerCase(locales): the locale's
// case mapping (golang.org/x/text/cases — Turkish's İ/i, Lithuanian's dots)

// The locale whose case rules apply: the first requested one (case mapping
// needs no formatting data: lt and az have rules but no generated tables)
func TnIntlCaseLoc(locales interface{}) *TnIntlLoc {
	ids := TnIntlCanonicalList(locales)
	if len(ids) == 0 {
		ids = []string{tnIntlDefaultID()}
	}
	return &TnIntlLoc{id: ids[0], tag: tnIntlTagOf(ids[0]), data: ids[0]}
}

func TnIntlToUpper(loc *TnIntlLoc, s string) string {
	// Lithuanian: a combining dot above after a soft-dotted letter (i, j, į)
	// goes away; the rest uppercases as the root locale (x/text's lt mapper
	// stops after the removal)
	if base, _ := loc.tag.Base(); base.String() == "lt" {
		var b strings.Builder
		prev := rune(0)
		for _, r := range s {
			if r == 0x307 && (prev == 'i' || prev == 'j' || prev == 0x12F) {
				continue
			}
			b.WriteRune(r)
			prev = r
		}
		return strings.ToUpper(b.String())
	}
	return xcases.Upper(loc.tag).String(s)
}
func TnIntlToLower(loc *TnIntlLoc, s string) string { return xcases.Lower(loc.tag).String(s) }`;

const intlElemGo = `// Array#toLocaleString's element conversion: each element's toLocaleString
// (numbers and bigints through the number formats, dates through the date
// patterns, strings as themselves, anything else as its string form)

func TnIntlElemLocaleString(elem interface{}, locales interface{}, options interface{}) string {
	switch v := elem.(type) {
	case nil:
		return ""
	case string:
		return v
	case float64:
		return TnIntlNumLocale(v, locales, options)
	case *tnbig.Int:
		return TnIntlNumLocale(v, locales, options)
	case time.Time:
		return TnIntlDateFmt(v, locales, options, "locale")
	case *time.Time:
		if v != nil {
			return TnIntlDateFmt(*v, locales, options, "locale")
		}
		return ""
	}
	return TnJSString(elem)
}`;

export function registerIntl(r: NodeRegistry): void {
  // the system zone detection (IANA ids, Windows' zone names mapped) shared
  // with Temporal: registering it twice redefines the same helpers
  registerTemporalZones(r);
  // DateTimeFormat's named time zones (time/tzdata embedded, so they work
  // without the OS's zoneinfo; the system zone id comes from the Temporal
  // local-zone helper, which shares the machinery)
  r.helperSideEffects['intlDate'] = ['time/tzdata'];
  defineHelper(r, 'intlCoreData', [], [], intlCoreData);
  defineHelper(r, 'intlNumberData', [], ['intlCoreData'], intlNumberData);
  defineHelper(r, 'intlDateData', [], ['intlCoreData'], intlDateData);
  defineHelper(r, 'intlListRelData', [], ['intlCoreData'], intlListRelData);
  defineHelper(r, 'intlDisplayData', [], ['intlCoreData'], intlDisplayData);
  defineHelper(r, 'intlLocaleOS@windows', ['os', 'strings', 'syscall', 'unsafe'], [], intlLocaleOSWindows);
  defineHelper(r, 'intlLocaleOS@other', ['os', 'strings'], [], intlLocaleOSOther);
  defineHelper(r, 'intlCore', ['math', 'regexp', 'strconv', 'strings', 'sync', 'golang.org/x/text/language', 'golang.org/x/text/feature/plural'], ['intlCoreData', 'intlLocaleOS@os', 'error', 'dynamic', 'arraySubclass', 'bigint'], intlCoreGo);
  defineHelper(r, 'intlNumberSyms', [], ['intlCore', 'intlNumberData'], intlNumberSymsGo);
  defineHelper(r, 'intlNumber', ['math', 'strconv', 'strings'], ['intlCore', 'intlNumberSyms'], intlNumberGo);
  defineHelper(r, 'intlDate', ['fmt', 'math', 'os', 'strconv', 'strings', 'sync', 'time'], ['intlCore', 'intlDateData', 'intlNumberSyms', 'nodeTemporalLocalZone@os'], intlDateGo);
  defineHelper(r, 'intlCollate', ['strings', 'sync', 'unicode', 'golang.org/x/text/collate', 'golang.org/x/text/unicode/norm'], ['intlCore'], intlCollateGo);
  defineHelper(r, 'intlPlural', ['math', 'strconv', 'strings', 'golang.org/x/text/feature/plural'], ['intlCore'], intlPluralGo);
  defineHelper(r, 'intlListRel', ['math', 'strconv', 'strings'], ['intlCore', 'intlListRelData', 'intlPlural', 'intlNumber'], intlListRelGo);
  defineHelper(r, 'intlSegmenter', ['math', 'unicode', 'unicode/utf8'], ['intlCore'], intlSegGo);
  defineHelper(r, 'intlDisplay', ['strings', 'golang.org/x/text/language/display', 'golang.org/x/text/language'], ['intlCore', 'intlDisplayData'], intlDisplayGo);
  defineHelper(r, 'intlLocale', ['strings', 'golang.org/x/text/language'], ['intlCore'], intlLocaleGo);
  defineHelper(r, 'intlCase', ['strings', 'golang.org/x/text/cases'], ['intlCore'], intlCaseGo);
  defineHelper(r, 'intlElemString', ['time'], ['intlCore', 'intlNumber', 'intlDate'], intlElemGo);

  const use = (id: string) => r.helper(id);

  r.globals['Intl'] = 'Intl';
  r.objects['Intl'] = true;

  // --- Intl.NumberFormat
  defineClass(
    r,
    'Intl.NumberFormat',
    '*TnIntlNumberFormat',
    'class',
    'resolvedOptions=interface{}',
    '',
    'format=func(interface{}) string',
    ''
  );
  r.constructors['Intl.NumberFormat'] = (c) => {
    use('intlNumber');
    return `TnNewIntlNumberFormat(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.NumberFormat#format'] = (c) => {
    use('intlNumber');
    return `TnIntlNumberFormatAnyStr(${c.recv}, ${c.args[0] ?? 'nil'})`;
  };
  r.methods['Intl.NumberFormat#formatToParts'] = (c) => {
    use('intlNumber');
    return `TnIntlNumberFormatAny(${c.recv}, ${c.args[0] ?? 'nil'})`;
  };
  r.methods['Intl.NumberFormat#formatRange'] = (c) => {
    use('intlNumber');
    return `TnIntlNumberFormatRange(${c.recv}, ${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.NumberFormat#formatRangeToParts'] = (c) => {
    use('intlNumber');
    return `TnIntlNumberFormatRangeParts(${c.recv}, ${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.functions['Intl.NumberFormat.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  setIntlResults(
    r,
    'Intl.NumberFormat',
    'formatToParts=[]interface{}; formatRangeToParts=[]interface{}; format=string; formatRange=string; supportedLocalesOf=[]string'
  );

  // --- Intl.DateTimeFormat
  defineClass(
    r,
    'Intl.DateTimeFormat',
    '*TnIntlDateTimeFormat',
    'class',
    'resolvedOptions=interface{}',
    '',
    'format=func(interface{}) string',
    ''
  );
  r.constructors['Intl.DateTimeFormat'] = (c) => {
    use('intlDate');
    return `TnNewIntlDateTimeFormat(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.DateTimeFormat#format'] = (c) => {
    use('intlDate');
    return `TnIntlDateFormat(${c.recv}, TnNewDate(${c.args[0] ?? 'nil'}))`;
  };
  r.methods['Intl.DateTimeFormat#formatToParts'] = (c) => {
    use('intlDate');
    return `TnIntlDateFormatParts(${c.recv}, TnNewDate(${c.args[0] ?? 'nil'}))`;
  };
  r.methods['Intl.DateTimeFormat#formatRange'] = (c) => {
    use('intlDate');
    return `TnIntlDateFormatRange(${c.recv}, TnNewDate(${c.args[0] ?? 'nil'}), TnNewDate(${c.args[1] ?? 'nil'}))`;
  };
  r.methods['Intl.DateTimeFormat#formatRangeToParts'] = (c) => {
    use('intlDate');
    return `TnIntlDateFormatRangeParts(${c.recv}, TnNewDate(${c.args[0] ?? 'nil'}), TnNewDate(${c.args[1] ?? 'nil'}))`;
  };
  r.functions['Intl.DateTimeFormat.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  setIntlResults(
    r,
    'Intl.DateTimeFormat',
    'formatToParts=[]interface{}; formatRangeToParts=[]interface{}; format=string; formatRange=string; supportedLocalesOf=[]string'
  );

  // --- Intl.Collator
  defineClass(r, 'Intl.Collator', '*TnIntlCollator', 'class', 'resolvedOptions=interface{}', '', 'compare=func(string, string) float64', '');
  r.constructors['Intl.Collator'] = (c) => {
    use('intlCollate');
    return `TnNewIntlCollator(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.Collator#compare'] = (c) => {
    use('intlCollate');
    return `TnIntlCollatorCompare(${c.recv}, ${c.args[0]}, ${c.args[1]})`;
  };
  r.functions['Intl.Collator.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  setIntlResults(r, 'Intl.Collator', 'compare=float64; supportedLocalesOf=[]string');

  // --- Intl.PluralRules
  defineClass(r, 'Intl.PluralRules', '*TnIntlPluralRules', 'class', 'resolvedOptions=interface{}', '', '', '');
  r.constructors['Intl.PluralRules'] = (c) => {
    use('intlPlural');
    return `TnNewIntlPluralRules(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.PluralRules#select'] = (c) => {
    use('intlPlural');
    return `TnIntlPluralSelect(${c.recv}, ${c.args[0] ?? 'nil'})`;
  };
  r.methods['Intl.PluralRules#selectRange'] = (c) => {
    use('intlPlural');
    return `TnIntlPluralSelectRange(${c.recv}, ${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.functions['Intl.PluralRules.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  setIntlResults(r, 'Intl.PluralRules', 'select=string; selectRange=string; supportedLocalesOf=[]string');

  // --- Intl.ListFormat
  defineClass(r, 'Intl.ListFormat', '*TnIntlListFormat', 'class', 'resolvedOptions=interface{}', '', '', '');
  r.constructors['Intl.ListFormat'] = (c) => {
    use('intlListRel');
    return `TnNewIntlListFormat(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.ListFormat#format'] = (c) => {
    use('intlListRel');
    return `TnIntlListFormatFormat(${c.recv}, ${c.args[0] ?? 'nil'})`;
  };
  r.methods['Intl.ListFormat#formatToParts'] = (c) => {
    use('intlListRel');
    return `TnIntlListFormatParts(${c.recv}, ${c.args[0] ?? 'nil'})`;
  };
  r.functions['Intl.ListFormat.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  setIntlResults(r, 'Intl.ListFormat', 'format=string; formatToParts=[]interface{}; supportedLocalesOf=[]string');

  // --- Intl.RelativeTimeFormat
  defineClass(r, 'Intl.RelativeTimeFormat', '*TnIntlRelativeTimeFormat', 'class', 'resolvedOptions=interface{}', '', '', '');
  r.constructors['Intl.RelativeTimeFormat'] = (c) => {
    use('intlListRel');
    return `TnNewIntlRelativeTimeFormat(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.RelativeTimeFormat#format'] = (c) => {
    use('intlListRel');
    return `TnIntlRelativeFormat(${c.recv}, ${c.args[0] ?? 'nil'}, ${c.args[1] ?? '""'})`;
  };
  r.methods['Intl.RelativeTimeFormat#formatToParts'] = (c) => {
    use('intlListRel');
    return `TnIntlRelativeParts(${c.recv}, ${c.args[0] ?? 'nil'}, ${c.args[1] ?? '""'})`;
  };
  r.functions['Intl.RelativeTimeFormat.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  setIntlResults(r, 'Intl.RelativeTimeFormat', 'format=string; formatToParts=[]interface{}; supportedLocalesOf=[]string');

  // --- Intl.Segmenter (segment() iterates; containing(i) reads one)
  defineClass(r, 'Intl.Segmenter', '*TnIntlSegmenter', 'class', 'resolvedOptions=interface{}', '', '', '');
  defineClass(r, 'Intl.Segments', '*TnIntlSegmentIter', 'class', 'tnItems=[]interface{}; containing=interface{}', '', '', '');
  r.constructors['Intl.Segmenter'] = (c) => {
    use('intlSegmenter');
    return `TnNewIntlSegmenter(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.Segmenter#segment'] = (c) => {
    use('intlSegmenter');
    return `${c.recv}.segment(${c.args[0] ?? '""'})`;
  };
  r.functions['Intl.Segmenter.supportedLocalesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedLocalesOf(${c.args[0] ?? 'nil'})`;
  };
  r.iterators['*TnIntlSegmentIter'] = 'tnItems';
  setIntlResults(r, 'Intl.Segmenter', 'segment=*TnIntlSegmentIter; supportedLocalesOf=[]string');
  setIntlResults(r, 'Intl.Segments', 'tnItems=[]interface{}; containing=interface{}');

  // --- Intl.DisplayNames
  defineClass(r, 'Intl.DisplayNames', '*TnIntlDisplayNames', 'class', 'resolvedOptions=interface{}', '', '', '');
  r.constructors['Intl.DisplayNames'] = (c) => {
    use('intlDisplay');
    return `TnNewIntlDisplayNames(${c.args[0] ?? 'nil'}, ${c.args[1] ?? 'nil'})`;
  };
  r.methods['Intl.DisplayNames#of'] = (c) => {
    use('intlDisplay');
    return `${c.recv}.of(${c.args[0] ?? '""'})`;
  };
  setIntlResults(r, 'Intl.DisplayNames', 'of=interface{}');

  // --- Intl.Locale
  defineClass(
    r,
    'Intl.Locale',
    '*TnIntlLocale',
    'class',
    'maximize=*TnIntlLocale; minimize=*TnIntlLocale; toString=string',
    '',
    'baseName=string; language=string; script=interface{}; region=interface{}; numberingSystem=interface{}; calendar=interface{}; collation=interface{}; caseFirst=interface{}; numeric=bool; hourCycle=interface{}',
    ''
  );
  r.constructors['Intl.Locale'] = (c) => {
    use('intlLocale');
    return `TnNewIntlLocale(${c.args[0] ?? '""'}, ${c.args[1] ?? 'nil'})`;
  };

  // --- Intl statics
  r.functions['Intl.getCanonicalLocales'] = (c) => {
    use('intlCore');
    return `TnIntlGetCanonicalLocales(${c.args[0] ?? 'nil'})`;
  };
  r.functions['Intl.supportedValuesOf'] = (c) => {
    use('intlCore');
    return `TnIntlSupportedValuesOf(${c.args[0] ?? '""'})`;
  };
  setResults(r, 'Intl', 'getCanonicalLocales=[]string; supportedValuesOf=[]string');
}
