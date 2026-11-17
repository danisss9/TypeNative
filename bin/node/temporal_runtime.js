// Temporal (Node 26's flagless global): the ISO 8601 calendar types ported
// from the reference polyfill's algorithms. Dates run on epoch days, times on
// exact nanoseconds, instants on second + nanosecond halves (the spec's
// ±1e8-day range overflows int64 nanoseconds), durations on ten float64
// fields with exact time arithmetic. All values are immutable struct
// pointers; options bags and string inputs arrive as interface{}.
import { defineHelper } from './registry.js';
export function registerTemporalRuntime(r) {
    defineHelper(r, 'nodeTemporal', ['fmt', 'math', 'math/big', 'strconv', 'strings', 'time'], ['nodeTemporalZones', 'nodeFs', 'dynamic', 'error', 'bigint'], runtimeHelper);
}
const runtimeHelper = `// Temporal: ISO 8601 calendar math, RFC 9557 parsing, rounding and
// formatting, and the eight Temporal types. Ported from the reference
// polyfill (tc39/proposal-temporal), whose behavior Node 26 matches.

const (
	tnTYear = "year"
	tnTMonth = "month"
	tnTWeek = "week"
	tnTDay = "day"
	tnTHour = "hour"
	tnTMinute = "minute"
	tnTSecond = "second"
	tnTMillisecond = "millisecond"
	tnTMicrosecond = "microsecond"
	tnTNanosecond = "nanosecond"
)

// Units in descending order of magnitude
var tnTUnitsDescending = []string{tnTYear, tnTMonth, tnTWeek, tnTDay, tnTHour, tnTMinute, tnTSecond, tnTMillisecond, tnTMicrosecond, tnTNanosecond}

func tnTUnitIndex(unit string) int {
	for i, u := range tnTUnitsDescending {
		if u == unit {
			return i
		}
	}
	return -1
}

func tnTLargerOfTwoUnits(a string, b string) string {
	if tnTUnitIndex(a) < tnTUnitIndex(b) {
		return a
	}
	return b
}

func tnTIsCalendarUnit(unit string) bool {
	return unit == tnTYear || unit == tnTMonth || unit == tnTWeek || unit == tnTDay
}

func tnTIsTimeUnit(unit string) bool {
	return !tnTIsCalendarUnit(unit)
}

// Nanoseconds of one unit
func tnTUnitNs(unit string) int64 {
	switch unit {
	case tnTDay:
		return 86400000000000
	case tnTHour:
		return 3600000000000
	case tnTMinute:
		return 60000000000
	case tnTSecond:
		return 1000000000
	case tnTMillisecond:
		return 1000000
	case tnTMicrosecond:
		return 1000
	}
	return 1
}

// --- Calendar math on epoch days (Hinnant's civil-from-days, exact over the
// whole ±275760 year range)

func tnTLeapYear(y int64) bool {
	return y%4 == 0 && (y%100 != 0 || y%400 == 0)
}

func tnTDaysInMonth(y int64, m int) int {
	switch m {
	case 4, 6, 9, 11:
		return 30
	case 2:
		if tnTLeapYear(y) {
			return 29
		}
		return 28
	}
	return 31
}

func tnTDaysInYear(y int64) int {
	if tnTLeapYear(y) {
		return 366
	}
	return 365
}

// Days from 1970-01-01, as in the polyfill's ISODateToEpochDays
func tnTDateToEpochDays(year int64, month, day int) int64 {
	y := year + floorDiv64(int64(month-1), 12)
	m := int(modEuclid64(int64(month-1), 12)) + 1
	shiftedYear := y
	shiftedMonth := m - 3
	if shiftedMonth < 0 {
		shiftedYear--
		shiftedMonth += 12
	}
	cycle := floorDiv64(shiftedYear, 400)
	yearOfCycle := shiftedYear - cycle*400
	dayOfYear := int64((153*shiftedMonth + 2) / 5) + int64(day) - 1
	return cycle*146097 + yearOfCycle*365 + yearOfCycle/4 - yearOfCycle/100 + dayOfYear - 719468
}

func tnTEpochDaysToYearDay(z int64) (int64, int, int) {
	z += 719468
	era := floorDiv64(z, 146097)
	doe := z - era*146097
	yoe := (doe - doe/1460 + doe/36524 - doe/146096) / 365
	y := yoe + era*400
	doy := doe - (365*yoe + yoe/4 - yoe/100)
	mp := (5*doy + 2) / 153
	d := int(doy - (153*mp+2)/5 + 1)
	m := int(mp + 3)
	if mp >= 10 {
		m = int(mp - 9)
	}
	if m <= 2 {
		y++
	}
	return y, m, d
}

func floorDiv64(a, b int64) int64 {
	q := a / b
	if (a%b != 0) && ((a < 0) != (b < 0)) {
		q--
	}
	return q
}

func modEuclid64(a, b int64) int64 {
	m := a % b
	if m < 0 {
		m += absI64(b)
	}
	return m
}

func absI64(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}

// ISO day of week, 1 = Monday .. 7 = Sunday
func tnTDayOfWeek(days int64) int {
	return int(modEuclid64(days+3, 7)) + 1
}

func tnTDayOfYear(y int64, m, d int) int {
	doy := d
	for i := 1; i < m; i++ {
		doy += tnTDaysInMonth(y, i)
	}
	return doy
}

// ISO 8601 week date: week 1 contains the first Thursday
func tnTWeekOfYear(y int64, m, d int) (int, int) {
	dow := tnTDayOfWeek(tnTDateToEpochDays(y, m, d))
	doy := tnTDayOfYear(y, m, d)
	relDow := dow - 1
	relDowJan1 := modEuclid64(int64(dow-doy+7000), 7)
	woy := int((int64(doy) - 1 + relDowJan1) / 7)
	if 7-relDowJan1 >= 4 {
		woy++
	}
	yow := y
	if woy < 1 {
		// The last week of the previous year
		yow--
		prevDoy := int64(doy) + int64(tnTDaysInYear(yow))
		prevDow := tnTDayOfWeek(tnTDateToEpochDays(yow, 1, 1))
		prevRelDowJan1 := modEuclid64(int64(prevDow)-prevDoy+7000, 7)
		woy = int((prevDoy - 1 + prevRelDowJan1) / 7)
		if 7-prevRelDowJan1 >= 4 {
			woy++
		}
	} else if woy > 52 {
		// Weeks at the year end can belong to the next year's week 1
		lastDoy := tnTDaysInYear(y)
		if doy >= lastDoy-5 {
			lastRelDow := modEuclid64(int64(relDow+lastDoy-doy), 7)
			if 6-lastRelDow >= 4 && int64(doy)+7-int64(relDow) > int64(lastDoy) {
				woy = 1
				yow++
			}
		} else if tnTWeeksInYear(y) < woy {
			woy = 1
			yow++
		}
	}
	return woy, int(yow)
}

func tnTWeeksInYear(y int64) int {
	jan1 := tnTDayOfWeek(tnTDateToEpochDays(y, 1, 1))
	dec31 := tnTDayOfWeek(tnTDateToEpochDays(y, 12, 31))
	if jan1 == 4 || dec31 == 4 {
		return 53
	}
	return 52
}

// The instant range: ±1e8 days (inclusive); datetimes extend that by one day
const tnTMaxDays = int64(100000000)

func tnTValidateDayRange(days int64) {
	if absI64(days) > tnTMaxDays {
		panic(TnNodeError("RangeError", "", "Date is not within ISO date time limits."))
	}
}

func tnTRejectDate(d *tnTDate) {
	tnTValidateDayRange(tnTDateToEpochDays(d.y, d.m, d.d))
}

// --- Times of day

type tnTTime struct {
	h, mi, s, ms, us, ns int
}

func tnTMidnight() tnTTime { return tnTTime{} }

// BalanceTime: normalize with carries, returning the day delta
func tnTBalanceTime(h, mi, s, ms, us, ns int) (tnTTime, int) {
	div := floorDiv64(int64(ns), 1000)
	us += int(div)
	ns = int(modEuclid64(int64(ns), 1000))
	div = floorDiv64(int64(us), 1000)
	ms += int(div)
	us = int(modEuclid64(int64(us), 1000))
	div = floorDiv64(int64(ms), 1000)
	s += int(div)
	ms = int(modEuclid64(int64(ms), 1000))
	mi += int(floorDiv64(int64(s), 60))
	s = int(modEuclid64(int64(s), 60))
	h += int(floorDiv64(int64(mi), 60))
	mi = int(modEuclid64(int64(mi), 60))
	deltaDays := int(floorDiv64(int64(h), 24))
	h = int(modEuclid64(int64(h), 24))
	return tnTTime{h: h, mi: mi, s: s, ms: ms, us: us, ns: ns}, deltaDays
}

// --- Time durations: exact nanoseconds held as second + subsecond halves

type tnTTimeDur struct {
	sec int64
	sub int32 // same sign as sec, |sub| < 1e9
}

func tnTNormalizeTdur(d tnTTimeDur) tnTTimeDur {
	if d.sub >= 1000000000 || d.sub <= -1000000000 {
		carry := int64(d.sub / 1000000000)
		d.sec += carry
		d.sub -= int32(carry * 1000000000)
	}
	if d.sec > 0 && d.sub < 0 {
		d.sec--
		d.sub += 1000000000
	}
	if d.sec < 0 && d.sub > 0 {
		d.sec++
		d.sub -= 1000000000
	}
	return d
}

func tnTMakeTdur(sec int64, sub int32) tnTTimeDur {
	return tnTNormalizeTdur(tnTTimeDur{sec: sec, sub: sub})
}

// A time duration as an exact nanosecond count
func tnTTdurNs(d tnTTimeDur) *tnbig.Int {
	n := new(tnbig.Int).Mul(tnbig.NewInt(d.sec), tnbig.NewInt(1000000000))
	if d.sub != 0 {
		n.Add(n, tnbig.NewInt(int64(d.sub)))
	}
	return n
}

func tnTTdurOfNs(ns *tnbig.Int) tnTTimeDur {
	// (a duration keeps the sign in both halves: -8s + 991990990ns is
	// {-7, -8009010}, so its printed absolute value is 7.00800901)
	q, r := new(tnbig.Int).QuoRem(ns, tnbig.NewInt(1000000000), new(tnbig.Int))
	return tnTTimeDur{sec: q.Int64(), sub: int32(r.Int64())}
}

// Exact nanoseconds as seconds and a non-negative nanosecond remainder
func tnTDivModNs(ns *tnbig.Int) (int64, int32) {
	q, r := new(tnbig.Int).QuoRem(ns, tnbig.NewInt(1000000000), new(tnbig.Int))
	if r.Sign() < 0 {
		q.Sub(q, tnbig.NewInt(1))
		r.Add(r, tnbig.NewInt(1000000000))
	}
	return q.Int64(), int32(r.Int64())
}

func tnTTdurSign(d tnTTimeDur) int {
	if d.sec != 0 {
		if d.sec < 0 {
			return -1
		}
		return 1
	}
	if d.sub < 0 {
		return -1
	}
	if d.sub > 0 {
		return 1
	}
	return 0
}

func tnTTdurNeg(d tnTTimeDur) tnTTimeDur { return tnTTimeDur{sec: -d.sec, sub: -d.sub} }

func tnTTdurAdd(a, b tnTTimeDur) tnTTimeDur {
	return tnTNormalizeTdur(tnTTimeDur{sec: a.sec + b.sec, sub: a.sub + b.sub})
}

func tnTTdurSub(a, b tnTTimeDur) tnTTimeDur {
	return tnTNormalizeTdur(tnTTimeDur{sec: a.sec - b.sec, sub: a.sub - b.sub})
}

func tnTTdurAddDays(d tnTTimeDur, days int64) tnTTimeDur {
	return tnTNormalizeTdur(tnTTimeDur{sec: d.sec + days*86400, sub: d.sub})
}

// FromComponents (time fields only; date fields go through tnTTdurAddDays)
func tnTTdurFromComponents(h, mi, s, ms, us, ns float64) tnTTimeDur {
	b := new(tnbig.Int)
	tnTAddComponent(b, ns, 1)
	tnTAddComponent(b, us, 1000)
	tnTAddComponent(b, ms, 1000000)
	tnTAddComponent(b, s, 1000000000)
	tnTAddComponent(b, mi, 60000000000)
	tnTAddComponent(b, h, 3600000000000)
	d := tnTTdurOfNs(b)
	if absBigCmpMaxTime(b) > 0 {
		panic(TnNodeError("RangeError", "", "total of duration time units cannot exceed 9007199254740991.999999999 s"))
	}
	return d
}

func tnTAddComponent(b *tnbig.Int, v float64, scale int64) {
	// A possibly fractional field: its integer part carries the value
	n := int64(math.Trunc(v))
	b.Add(b, new(tnbig.Int).Mul(tnbig.NewInt(n), tnbig.NewInt(scale)))
}

func absBigCmpMaxTime(v *tnbig.Int) int {
	max := new(tnbig.Int).Mul(tnbig.NewInt(9007199254740991), tnbig.NewInt(1000000000))
	max.Add(max, tnbig.NewInt(999999999))
	return new(tnbig.Int).Abs(v).Cmp(max)
}

// A duration's 24-hour-day time field count (days fold in as 24h)
func tnTTdurFromDurationFields(d *TnTemporalDuration) tnTTimeDur {
	t := tnTTdurFromComponents(d.h, d.mi, d.s, d.ms, d.us, d.ns)
	return tnTTdurAddDays(t, int64(math.Trunc(d.d)))
}

// Round a time duration to an increment of a unit
func tnTRoundTimeDuration(d tnTTimeDur, increment int64, unit string, mode string) tnTTimeDur {
	divisor := tnTUnitNs(unit)
	if divisor == 1 && increment == 1 {
		return d
	}
	inc := divisor * increment
	return tnTTdurOfNs(tnTRoundNsAsIfPositive(tnTTdurNs(d), inc, mode))
}

// RoundNumberToIncrementAsIfPositive on exact nanoseconds: the magnitude is
// rounded with the named mode, then the sign is restored (so a negative
// duration rounds like its positive counterpart)
func tnTRoundNsAsIfPositive(q *tnbig.Int, inc int64, mode string) *tnbig.Int {
	neg := q.Sign() < 0
	a := new(tnbig.Int).Abs(q)
	incBig := tnbig.NewInt(inc)
	quot, rem := new(tnbig.Int).QuoRem(a, incBig, new(tnbig.Int))
	if rem.Sign() == 0 {
		if neg {
			return a.Neg(a)
		}
		return a
	}
	// (same as the float path: 2*remainder against the increment decides)
	cmp := new(tnbig.Int).Mul(rem, tnbig.NewInt(2)).Cmp(incBig)
	even := quot.Bit(0) == 0
	rounded := tnTApplyUnsignedRoundingMode(quot, new(tnbig.Int).Add(quot, tnbig.NewInt(1)), cmp, even, tnTGetUnsignedRoundingMode(mode, neg))
	rounded.Mul(rounded, incBig)
	if neg {
		rounded.Neg(rounded)
	}
	return rounded
}

// GetUnsignedRoundingMode
func tnTGetUnsignedRoundingMode(mode string, negative bool) string {
	index := 0
	if negative {
		index = 1
	}
	ceil := []string{"infinity", "zero"}
	floor := []string{"zero", "infinity"}
	halfCeil := []string{"half-infinity", "half-zero"}
	halfFloor := []string{"half-zero", "half-infinity"}
	switch mode {
	case "ceil":
		return ceil[index]
	case "floor":
		return floor[index]
	case "expand":
		return "infinity"
	case "trunc":
		return "zero"
	case "halfCeil":
		return halfCeil[index]
	case "halfFloor":
		return halfFloor[index]
	case "halfExpand":
		return "half-infinity"
	case "halfTrunc":
		return "half-zero"
	case "halfEven":
		return "half-even"
	}
	panic(TnNodeError("RangeError", "", "invalid rounding mode"))
}

// ApplyUnsignedRoundingMode
func tnTApplyUnsignedRoundingMode(r1, r2 *tnbig.Int, cmp int, even bool, mode string) *tnbig.Int {
	if mode == "zero" {
		return r1
	}
	if mode == "infinity" {
		return r2
	}
	if cmp < 0 {
		return r1
	}
	if cmp > 0 {
		return r2
	}
	if mode == "half-zero" {
		return r1
	}
	if mode == "half-infinity" {
		return r2
	}
	if even {
		return r1
	}
	return r2
}

// RoundNumberToIncrement on float64 duration fields
// Instant rounding: the timeline's quantity floored into the increment, so
// the fraction is always positive — as Node rounds an instant (a negative
// instant's expand/trunc pick the upper/lower boundary, not away/toward zero)
func tnTRoundInstantNs(ns *tnbig.Int, inc int64, mode string) *tnbig.Int {
	incBig := tnbig.NewInt(inc)
	q, r := new(tnbig.Int).QuoRem(ns, incBig, new(tnbig.Int))
	if r.Sign() < 0 {
		q.Sub(q, tnbig.NewInt(1))
		r.Add(r, incBig)
	}
	if r.Sign() == 0 {
		return new(tnbig.Int).Mul(q, incBig)
	}
	cmp := new(tnbig.Int).Mul(r, tnbig.NewInt(2)).Cmp(incBig)
	even := q.Bit(0) == 0
	upper := new(tnbig.Int).Add(q, tnbig.NewInt(1))
	rounded := tnTApplyUnsignedRoundingMode(q, upper, cmp, even, tnTGetUnsignedRoundingMode(mode, false))
	return new(tnbig.Int).Mul(rounded, incBig)
}

func tnTRoundNumberToIncrement(quantity float64, increment int64, mode string) float64 {
	// (the magnitude is rounded, then the sign restored: the unsigned mode
	// accounts for the negative side, as ceil and floor differ there)
	neg := quantity < 0
	abs := math.Abs(quantity)
	q := math.Trunc(abs / float64(increment))
	rem := abs - q*float64(increment)
	if rem == 0 {
		if neg {
			return -q * float64(increment)
		}
		return q * float64(increment)
	}
	r1 := q
	r2 := q + 1
	cmp := rem*2 - float64(increment)
	even := math.Mod(r1, 2) == 0
	rounded := r1
	if !tnTApplyUnsignedFloat(r1, r2, cmp, even, tnTGetUnsignedRoundingMode(mode, neg)) {
		rounded = r2
	}
	if neg {
		return -rounded * float64(increment)
	}
	return rounded * float64(increment)
}

// Returns whether r1 wins
func tnTApplyUnsignedFloat(r1, r2, cmp float64, even bool, mode string) bool {
	if mode == "zero" {
		return true
	}
	if mode == "infinity" {
		return false
	}
	if cmp < 0 {
		return true
	}
	if cmp > 0 {
		return false
	}
	if mode == "half-zero" {
		return true
	}
	if mode == "half-infinity" {
		return false
	}
	return even
}

// TotalTimeDuration: the duration as a float count of unit
func tnTTotalTimeDuration(d tnTTimeDur, unit string) float64 {
	divisor := tnTUnitNs(unit)
	total := float64(d.sec)*1e9 + float64(d.sub)
	return total / float64(divisor)
}

// --- Dates

type tnTDate struct {
	y int64
	m int
	d int
}

func tnTIsValidISODate(y int64, m, d int) bool {
	if m < 1 || m > 12 {
		return false
	}
	return d >= 1 && d <= tnTDaysInMonth(y, m)
}

func tnTConstrainISODate(y int64, m, d int) tnTDate {
	if m < 1 {
		m = 1
	}
	if m > 12 {
		m = 12
	}
	if d < 1 {
		d = 1
	}
	if max := tnTDaysInMonth(y, m); d > max {
		d = max
	}
	return tnTDate{y: y, m: m, d: d}
}

// BalanceISOYearMonth
func tnTBalanceYearMonth(y int64, m int) (int64, int) {
	m--
	y += int64(floorDiv64(int64(m), 12))
	m = int(modEuclid64(int64(m), 12))
	return y, m + 1
}

// AddDaysToISODate
func tnTAddDays(d tnTDate, days int64) tnTDate {
	epoch := tnTDateToEpochDays(d.y, d.m, d.d) + days
	y, _, _ := tnTEpochDaysToYearDay(epoch)
	// Walk to the exact day: the year is known, then the month/day
	rest := epoch - tnTDateToEpochDays(y, 1, 1)
	for rest < 0 {
		y--
		rest += int64(tnTDaysInYear(y))
	}
	for rest >= int64(tnTDaysInYear(y)) {
		rest -= int64(tnTDaysInYear(y))
		y++
	}
	m := 1
	for {
		dim := tnTDaysInMonth(y, m)
		if rest < int64(dim) {
			return tnTDate{y: y, m: m, d: int(rest) + 1}
		}
		rest -= int64(dim)
		m++
	}
}

// RegulateISODate (constrain / reject)
func tnTRegulateISODate(y int64, m, d int, overflow string) tnTDate {
	if tnTIsValidISODate(y, m, d) {
		return tnTDate{y: y, m: m, d: d}
	}
	if overflow == "constrain" {
		return tnTConstrainISODate(y, m, d)
	}
	panic(TnNodeError("RangeError", "", "not a valid ISO date."))
}

// CalendarDateAdd for ISO: years/months (with day clamping), then weeks×7 + days
func tnTCalendarDateAdd(iso tnTDate, dur tnTDateDur, overflow string) tnTDate {
	y := iso.y + int64(math.Trunc(dur.y))
	m := iso.m + int(math.Trunc(dur.mo))
	y, m = tnTBalanceYearMonth(y, m)
	intermediate := tnTRegulateISODate(y, m, iso.d, overflow)
	days := int64(math.Trunc(dur.d)) + int64(math.Trunc(dur.w))*7
	return tnTAddDays(intermediate, days)
}

// Whether adding years/months to base passes beyond target (moving in sign's
// direction)
func tnTDateSurpasses(sign int, base tnTDate, years int64, months int64, target tnTDate) bool {
	y0 := base.y + years
	if tnTCompareSurpasses(sign, y0, base.m, base.d, target) {
		return true
	}
	if months == 0 {
		return false
	}
	y1, m1 := tnTBalanceYearMonth(y0, base.m+int(months))
	return tnTCompareSurpasses(sign, y1, m1, base.d, target)
}

func tnTCompareSurpasses(sign int, y int64, m, d int, target tnTDate) bool {
	if y != target.y {
		return sign*int(y-target.y) > 0
	}
	if m != target.m {
		return sign*(m-target.m) > 0
	}
	if d != target.d {
		return sign*(d-target.d) > 0
	}
	return false
}

// CalendarDateUntil (ISO): full years/months counted, remainder in days
func tnTCalendarDateUntil(one, two tnTDate, largestUnit string) tnTDateDur {
	var years, months, weeks, days float64
	if (one.y != two.y || one.m != two.m || one.d != two.d) && (largestUnit == tnTYear || largestUnit == tnTMonth) {
		sign := 1
		if tnTDateToEpochDays(two.y, two.m, two.d) < tnTDateToEpochDays(one.y, one.m, one.d) {
			sign = -1
		}
		var candidateYears int64
		candidateYears = two.y - one.y
		if candidateYears != 0 {
			candidateYears -= int64(sign)
		}
		var yYears int64
		for !tnTDateSurpasses(sign, one, candidateYears, 0, two) {
			yYears = candidateYears
			candidateYears += int64(sign)
		}
		years = float64(yYears)
		var yMonths int64
		candidateMonths := int64(sign)
		for !tnTDateSurpasses(sign, one, yYears, candidateMonths, two) {
			yMonths = candidateMonths
			candidateMonths += int64(sign)
		}
		months = float64(yMonths)
		if largestUnit == tnTMonth {
			months += years * 12
			years = 0
		}
	}
	intermediateY, intermediateM := tnTBalanceYearMonth(one.y+int64(years), one.m+int(months))
	day := one.d
	if max := tnTDaysInMonth(intermediateY, intermediateM); day > max {
		day = max
	}
	constrained := tnTDate{y: intermediateY, m: intermediateM, d: day}
	epochDays := tnTDateToEpochDays(two.y, two.m, two.d) - tnTDateToEpochDays(constrained.y, constrained.m, constrained.d)
	if largestUnit == tnTWeek {
		// (truncation: a negative remainder keeps the difference's sign —
		// -31 days is -4 weeks -3 days, not -5 weeks +4 days)
		weeks = float64(epochDays / 7)
		epochDays -= int64(weeks) * 7
	}
	days = float64(epochDays)
	return tnTDateDur{y: years, mo: months, w: weeks, d: days}
}

// DifferenceISODate via CalendarDateUntil's caller conventions (sign handled)
func tnTCalendarDateUntilSigned(one, two tnTDate, largestUnit string) tnTDateDur {
	if one.y == two.y && one.m == two.m && one.d == two.d {
		return tnTDateDur{}
	}
	return tnTCalendarDateUntil(one, two, largestUnit)
}

// --- Internal durations

type tnTDateDur struct {
	y, mo, w, d float64
}

func tnTDateDurSign(d tnTDateDur) int {
	for _, v := range []float64{d.y, d.mo, d.w, d.d} {
		if v != 0 {
			if v < 0 {
				return -1
			}
			return 1
		}
	}
	return 0
}

type tnTInternalDur struct {
	date tnTDateDur
	time tnTTimeDur
}

func tnTInternalSign(d tnTInternalDur) int {
	if s := tnTDateDurSign(d.date); s != 0 {
		return s
	}
	return tnTTdurSign(d.time)
}

func tnTZeroDateDur() tnTDateDur { return tnTDateDur{} }

// AdjustDateDurationRecord
func tnTAdjustDateDur(d tnTDateDur, days float64, weeks *float64, months *float64) tnTDateDur {
	out := d
	out.d = days
	if weeks != nil {
		out.w = *weeks
	}
	if months != nil {
		out.mo = *months
	}
	return out
}

// The 10-field duration
type TnTemporalDuration struct {
	y, mo, w, d, h, mi, s, ms, us, ns float64
}

func (d *TnTemporalDuration) Get_years() float64        { return d.y }
func (d *TnTemporalDuration) Get_months() float64       { return d.mo }
func (d *TnTemporalDuration) Get_weeks() float64        { return d.w }
func (d *TnTemporalDuration) Get_days() float64         { return d.d }
func (d *TnTemporalDuration) Get_hours() float64        { return d.h }
func (d *TnTemporalDuration) Get_minutes() float64      { return d.mi }
func (d *TnTemporalDuration) Get_seconds() float64      { return d.s }
func (d *TnTemporalDuration) Get_milliseconds() float64 { return d.ms }
func (d *TnTemporalDuration) Get_microseconds() float64 { return d.us }
func (d *TnTemporalDuration) Get_nanoseconds() float64  { return d.ns }

func (d *TnTemporalDuration) Get_sign() float64 {
	fields := []float64{d.y, d.mo, d.w, d.d, d.h, d.mi, d.s, d.ms, d.us, d.ns}
	for _, v := range fields {
		if v != 0 {
			if v < 0 {
				return -1
			}
			return 1
		}
	}
	return 0
}

func (d *TnTemporalDuration) Get_blank() bool { return d.Get_sign() == 0 }

func tnTDurationSign(d *TnTemporalDuration) int { return int(d.Get_sign()) }

// RejectDuration: sign consistency and the representable limits
func tnTRejectDuration(y, mo, w, dd, h, mi, s, ms, us, ns float64) {
	fields := []float64{y, mo, w, dd, h, mi, s, ms, us, ns}
	sign := 0
	for _, v := range fields {
		if math.IsInf(v, 0) || math.IsNaN(v) {
			panic(TnNodeError("RangeError", "", "Duration was not valid."))
		}
		vs := 0
		if v != 0 {
			if v < 0 {
				vs = -1
			} else {
				vs = 1
			}
		}
		if vs != 0 {
			if sign != 0 && vs != sign {
				panic(TnNodeError("RangeError", "", "Duration was not valid."))
			}
			sign = vs
		}
	}
	if math.Abs(y) >= 4294967296 || math.Abs(mo) >= 4294967296 || math.Abs(w) >= 4294967296 {
		panic(TnNodeError("RangeError", "", "Duration was not valid."))
	}
	msDiv := math.Trunc(ms / 1000)
	usDiv := math.Trunc(us / 1000000)
	nsDiv := math.Trunc(ns / 1000000000)
	msMod := ms - msDiv*1000
	usMod := us - usDiv*1000000
	nsMod := ns - nsDiv*1000000000
	remainderSec := math.Trunc((msMod*1000000 + usMod*1000 + nsMod) / 1000000000)
	totalSec := dd*86400 + h*3600 + mi*60 + s + msDiv + usDiv + nsDiv + remainderSec
	if math.IsInf(totalSec, 0) || math.Abs(totalSec) >= 9007199254740991 {
		panic(TnNodeError("RangeError", "", "Duration was not valid."))
	}
}

// A duration from the ten fields, validated
func tnTMakeDuration(y, mo, w, dd, h, mi, s, ms, us, ns float64) *TnTemporalDuration {
	tnTRejectDuration(y, mo, w, dd, h, mi, s, ms, us, ns)
	return &TnTemporalDuration{y: y, mo: mo, w: w, d: dd, h: h, mi: mi, s: s, ms: ms, us: us, ns: ns}
}

// ToInternalDurationRecord (days stay days)
func tnTToInternalDurationRecord(d *TnTemporalDuration) tnTInternalDur {
	return tnTInternalDur{
		date: tnTDateDur{y: d.y, mo: d.mo, w: d.w, d: d.d},
		time: tnTTdurFromComponents(d.h, d.mi, d.s, d.ms, d.us, d.ns),
	}
}

// ToInternalDurationRecordWith24HourDays (days fold into the time)
func tnTToInternalDurationRecordWith24HourDays(d *TnTemporalDuration) tnTInternalDur {
	return tnTInternalDur{
		date: tnTDateDur{y: d.y, mo: d.mo, w: d.w, d: 0},
		time: tnTTdurFromDurationFields(d),
	}
}

// ToDateDurationRecordWithoutTime: time truncated into whole days
func tnTToDateDurationRecordWithoutTime(d *TnTemporalDuration) tnTDateDur {
	internal := tnTToInternalDurationRecordWith24HourDays(d)
	days := math.Trunc(float64(internal.time.sec) / 86400)
	tnTRejectDuration(internal.date.y, internal.date.mo, internal.date.w, days, 0, 0, 0, 0, 0, 0)
	return tnTDateDur{y: internal.date.y, mo: internal.date.mo, w: internal.date.w, d: days}
}

// TemporalDurationFromInternal
func tnTTemporalDurationFromInternal(internal tnTInternalDur, largestUnit string) *TnTemporalDuration {
	sign := tnTTdurSign(internal.time)
	abs := internal.time
	if sign < 0 {
		abs = tnTTdurNeg(internal.time)
	}
	// Balance the time into the unit ladder, down to days
	ns := int64(abs.sub)
	us := ns / 1000
	ns -= us * 1000
	ms := us / 1000
	us -= ms * 1000
	seconds := abs.sec
	minutes := seconds / 60
	seconds -= minutes * 60
	hours := minutes / 60
	minutes -= hours * 60
	days := hours / 24
	hours -= days * 24
	if sign < 0 {
		days, hours, minutes, seconds = -days, -hours, -minutes, -seconds
		ms, us, ns = -ms, -us, -ns
	}
	// Time-unit largest units fold the days back into their ladder
	switch largestUnit {
	case tnTHour:
		hours += days * 24
		days = 0
	case tnTMinute:
		minutes += days*1440 + hours*60
		hours, days = 0, 0
	case tnTSecond:
		seconds += days*86400 + hours*3600 + minutes*60
		minutes, hours, days = 0, 0, 0
	case tnTMillisecond:
		ms += days*86400000 + hours*3600000 + minutes*60000 + seconds*1000
		seconds, minutes, hours, days = 0, 0, 0, 0
	case tnTMicrosecond:
		us += days*86400000000 + hours*3600000000 + minutes*60000000 + seconds*1000000 + ms*1000
		ms, seconds, minutes, hours, days = 0, 0, 0, 0, 0
	case tnTNanosecond:
		ns += days*86400000000000 + hours*3600000000000 + minutes*60000000000 + seconds*1000000000 + ms*1000000 + us*1000
		us, ms, seconds, minutes, hours, days = 0, 0, 0, 0, 0, 0
	}
	return &TnTemporalDuration{
		y: internal.date.y, mo: internal.date.mo, w: internal.date.w,
		d: internal.date.d + float64(days),
		h: float64(hours), mi: float64(minutes), s: float64(seconds),
		ms: float64(ms), us: float64(us), ns: float64(ns),
	}
}

// CombineDateAndTimeDuration
func tnTCombineDateAndTime(date tnTDateDur, time tnTTimeDur) tnTInternalDur {
	ds := tnTDateDurSign(date)
	ts := tnTTdurSign(time)
	if ds != 0 && ts != 0 && ds != ts {
		panic(TnNodeError("RangeError", "", "mixed-sign duration"))
	}
	return tnTInternalDur{date: date, time: time}
}

// DateDurationDays: the date duration's day count relative to a start date
func tnTDateDurationDays(dur tnTDateDur, iso tnTDate) float64 {
	ymw := tnTAdjustDateDur(dur, 0, nil, nil)
	if tnTDateDurSign(ymw) == 0 {
		return dur.d
	}
	later := tnTCalendarDateAdd(iso, ymw, "constrain")
	days := tnTDateToEpochDays(later.y, later.m, later.d) - tnTDateToEpochDays(iso.y, iso.m, iso.d)
	return dur.d + float64(days)
}

// --- Instants

type TnTemporalInstant struct {
	sec  int64
	nsec int32 // [0, 1e9)
}

func (i *TnTemporalInstant) Get_epochMilliseconds() float64 {
	// (the spec's floor: whole milliseconds, as Node reports them)
	return float64(i.sec*1000 + int64(i.nsec)/1000000)
}

func (i *TnTemporalInstant) Get_epochNanoseconds() *tnbig.Int { return tnTInstantNs(i) }

func tnTInstantNs(i *TnTemporalInstant) *tnbig.Int {
	n := new(tnbig.Int).Mul(tnbig.NewInt(i.sec), tnbig.NewInt(1000000000))
	if i.nsec != 0 {
		n.Add(n, tnbig.NewInt(int64(i.nsec)))
	}
	return n
}

func tnTInstantOfNs(ns *tnbig.Int) *TnTemporalInstant {
	sec, nsec := tnTDivModNs(ns)
	return &TnTemporalInstant{sec: sec, nsec: nsec}
}

func tnTValidateInstantNs(ns *tnbig.Int) {
	limit := new(tnbig.Int).Mul(tnbig.NewInt(86400), tnbig.NewInt(100000000))
	limit.Mul(limit, tnbig.NewInt(1000000000))
	if new(tnbig.Int).Abs(ns).Cmp(limit) > 0 {
		panic(TnNodeError("RangeError", "", "Instant nanoseconds are not within a valid epoch range."))
	}
}

func tnTInstantIsValid(i *TnTemporalInstant) bool {
	if absI64(i.sec) > 8640000000000 {
		return false
	}
	if absI64(i.sec) == 8640000000000 && i.nsec != 0 {
		return false
	}
	return true
}

func tnTInstantReject(i *TnTemporalInstant) {
	if !tnTInstantIsValid(i) {
		panic(TnNodeError("RangeError", "", "Instant nanoseconds are not within a valid epoch range."))
	}
}

// GetUTCEpochNanoseconds
func tnTUTCNs(date tnTDate, time tnTTime) *tnbig.Int {
	days := tnTDateToEpochDays(date.y, date.m, date.d)
	tnTValidateDayRange(days)
	ns := new(tnbig.Int).Mul(tnbig.NewInt(days), tnbig.NewInt(86400000000000))
	timeNs := int64(time.h)*3600000000000 + int64(time.mi)*60000000000 + int64(time.s)*1000000000 +
		int64(time.ms)*1000000 + int64(time.us)*1000 + int64(time.ns)
	ns.Add(ns, tnbig.NewInt(timeNs))
	return ns
}

func tnTUTCNsOfDateTime(dt tnTDateTime) *tnbig.Int { return tnTUTCNs(dt.date, dt.time) }

type tnTDateTime struct {
	date tnTDate
	time tnTTime
}

// BalanceISODateTime
func tnTBalanceDateTime(y int64, mo, d, h, mi, s, ms, us, ns int) tnTDateTime {
	time, deltaDays := tnTBalanceTime(h, mi, s, ms, us, ns)
	date := tnTAddDays(tnTDate{y: y, m: mo, d: d}, int64(deltaDays))
	return tnTDateTime{date: date, time: time}
}

// GetISODateTimeFor: a zone's local datetime at an instant
func tnTGetISODateTimeFor(tz *tnTemporalTZ, ns *tnbig.Int) tnTDateTime {
	inst := tnTInstantOfNs(ns)
	local := inst.sec + tz.offsetSecAt(inst.sec, inst.nsec)
	days := floorDiv64(local, 86400)
	rest := local - days*86400
	y, m, d := tnTEpochDaysToYearDay(days)
	time, _ := tnTBalanceTime(int(rest/3600), int((rest/60)%60), int(rest%60), 0, 0, int(inst.nsec))
	return tnTDateTime{date: tnTDate{y: y, m: m, d: d}, time: time}
}

// --- RFC 9557 / ISO 8601 parsing

type tnTParsedISO struct {
	y       int64
	mo, d   int
	hasTime bool
	time    tnTTime
	utc     bool
	offset  string
	tzID    string
	cal     string
}

type tnTStrCursor struct {
	s string
	i int
}

func (c *tnTStrCursor) eof() bool { return c.i >= len(c.s) }
func (c *tnTStrCursor) peek() byte {
	if c.eof() {
		return 0
	}
	return c.s[c.i]
}
func (c *tnTStrCursor) next() byte {
	ch := c.s[c.i]
	c.i++
	return ch
}
func (c *tnTStrCursor) digits(minCount, maxCount int) (string, bool) {
	start := c.i
	for len(c.s) > c.i && c.s[c.i] >= '0' && c.s[c.i] <= '9' && c.i-start < maxCount {
		c.i++
	}
	n := c.i - start
	if n < minCount {
		c.i = start
		return "", false
	}
	return c.s[start:c.i], true
}
func (c *tnTStrCursor) eat(ch byte) bool {
	if !c.eof() && c.s[c.i] == ch {
		c.i++
		return true
	}
	return false
}
func (c *tnTStrCursor) eatAny(chars string) bool {
	if !c.eof() && strings.IndexByte(chars, c.s[c.i]) >= 0 {
		c.i++
		return true
	}
	return false
}
func (c *tnTStrCursor) rest() string { return c.s[c.i:] }

func tnTCursorInt(s string) int64 {
	v := int64(0)
	for _, ch := range s {
		v = v*10 + int64(ch-'0')
	}
	return v
}

// ParseDateTimeUTCOffset: ±HH[:MM][:SS[.frac]] or ±HHMM or ±HH
func tnTParseUTCOffset(s string) int64 {
	if len(s) < 3 || (s[0] != '+' && s[0] != '-') {
		panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
	}
	sign := int64(1)
	if s[0] == '-' {
		sign = -1
	}
	c := &tnTStrCursor{s: s, i: 1}
	hStr, ok := c.digits(2, 2)
	if !ok {
		panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
	}
	h := tnTCursorInt(hStr)
	mi := int64(0)
	sec := int64(0)
	if c.eat(':') {
		mStr, ok := c.digits(2, 2)
		if !ok {
			panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
		}
		mi = tnTCursorInt(mStr)
		if c.eat(':') {
			sStr, ok := c.digits(2, 2)
			if !ok {
				panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
			}
			sec = tnTCursorInt(sStr)
			if c.eat('.') {
				if _, ok := c.digits(1, 9); !ok {
					panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
				}
			}
		}
	} else if !c.eof() {
		// basic form HHMM
		mStr, ok := c.digits(2, 2)
		if ok {
			mi = tnTCursorInt(mStr)
			if sStr, ok := c.digits(2, 2); ok {
				sec = tnTCursorInt(sStr)
			}
		} else if !c.eof() {
			panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
		}
	}
	if h > 23 || mi > 59 || sec > 59 {
		panic(TnNodeError("RangeError", "", "invalid time zone offset: "+s+"; must match +/-HH:MM"))
	}
	return sign * ((h*60+mi)*60 + sec) * 1000000000
}

func tnTParseISODateTime(s string) *tnTParsedISO {
	c := &tnTStrCursor{s: s}
	// Year: [±]YYYY or ±YYYYYY...
	neg := false
	signed := false
	if c.peek() == '+' || c.peek() == '-' {
		signed = true
		neg = c.peek() == '-'
		c.next()
		if c.peek() == '0' {
			// -000000 is rejected
			start := c.i
			digits, _ := c.digits(1, 9)
			if digits == "000000" {
				panic(TnNodeError("RangeError", "", "invalid RFC 9557 string: "+s))
			}
			c.i = start
		}
	}
	var yearStr string
	var ok bool
	if signed {
		yearStr, ok = c.digits(4, 9)
	} else {
		yearStr, ok = c.digits(4, 4)
	}
	if !ok {
		panic(TnNodeError("RangeError", "", "Invalid character while parsing year value."))
	}
	if signed && len(yearStr) != 6 {
		panic(TnNodeError("RangeError", "", "Invalid character while parsing year value."))
	}
	if !signed && len(yearStr) != 4 {
		panic(TnNodeError("RangeError", "", "Invalid character while parsing year value."))
	}
	year := tnTCursorInt(yearStr)
	if neg {
		year = -year
	}
	out := &tnTParsedISO{y: year, mo: 1, d: 1}
	// Month/day: -MM-DD or MMDD (or -MM for year-month strings, handled by callers)
	if c.eat('-') {
		mStr, ok := c.digits(2, 2)
		if !ok {
			panic(TnNodeError("RangeError", "", "Invalid character while parsing month value."))
		}
		out.mo = int(tnTCursorInt(mStr))
		if c.eat('-') {
			dStr, ok2 := c.digits(2, 2)
			if !ok2 {
				panic(TnNodeError("RangeError", "", "Invalid character while parsing day value."))
			}
			out.d = int(tnTCursorInt(dStr))
		}
	} else {
		mStr, ok := c.digits(2, 2)
		if !ok {
			panic(TnNodeError("RangeError", "", "Invalid character while parsing month value."))
		}
		out.mo = int(tnTCursorInt(mStr))
		if dStr, ok2 := c.digits(2, 2); ok2 {
			out.d = int(tnTCursorInt(dStr))
		} else {
			out.d = 1
		}
	}
	if !tnTIsValidISODate(out.y, out.mo, out.d) {
		panic(TnNodeError("RangeError", "", s+" is not a valid date"))
	}
	// Time: [Tt ]HH[:MM[:SS[.frac]]] or basic HH[MM[SS[.frac]]]
	if c.eatAny("Tt ") {
		out.hasTime = true
		out.time = tnTParseTimeAfterSeparator(c, s)
	}
	// Offset / Z
	if c.eat('Z') {
		out.utc = true
	} else if c.eat('z') {
		out.utc = true
	} else if !c.eof() && (c.peek() == '+' || c.peek() == '-') {
		out.offset = tnTParseOffsetString(c, s)
	}
	// [!key=value] annotations and [Zone] annotation
	out.cal = tnTParseAnnotations(c, s, &out.tzID)
	if out.cal != "" && !strings.EqualFold(out.cal, "iso8601") {
		// (non-ISO calendars need ICU: out of scope, as for an unknown one)
		panic(TnNodeError("RangeError", "", "unsupported calendar: "+out.cal))
	}
	if !c.eof() {
		panic(TnNodeError("RangeError", "", "Unrecognized text after ISO string: "+s))
	}
	return out
}

// Parses ±HH[:MM[:SS[.frac]]] starting at the sign
func tnTParseOffsetString(c *tnTStrCursor, s string) string {
	start := c.i
	c.next()
	if _, ok := c.digits(2, 2); !ok {
		panic(TnNodeError("RangeError", "", "Invalid character while parsing time zone offset."))
	}
	if c.eat(':') {
		if _, ok := c.digits(2, 2); !ok {
			panic(TnNodeError("RangeError", "", "Invalid character while parsing time zone offset."))
		}
		if c.eat(':') {
			if _, ok := c.digits(2, 2); !ok {
				panic(TnNodeError("RangeError", "", "Invalid character while parsing time zone offset."))
			}
			if c.eat('.') {
				if _, ok := c.digits(1, 9); !ok {
					panic(TnNodeError("RangeError", "", "Invalid character while parsing time zone offset."))
				}
			}
		}
	} else if _, ok := c.digits(2, 2); ok {
		if c.eat(':') {
			if _, ok := c.digits(2, 2); !ok {
				panic(TnNodeError("RangeError", "", "Invalid character while parsing time zone offset."))
			}
		}
	} else {
		panic(TnNodeError("RangeError", "", "Invalid character while parsing time zone offset."))
	}
	return s[start:c.i]
}

// [!key=value] annotations after an optional [Zone] one
func tnTParseAnnotations(c *tnTStrCursor, s string, tzID *string) string {
	cal := ""
	calWasCritical := false
	for c.eat('[') {
		critical := c.eat('!')
		key := ""
		for !c.eof() && c.peek() != '=' && c.peek() != ']' {
			key += string(c.next())
		}
		if c.eat(']') {
			// [Zone] without '=': a time zone annotation
			if critical {
				panic(TnNodeError("RangeError", "", "Unrecognized annotation: !"+key))
			}
			if *tzID != "" {
				panic(TnNodeError("RangeError", "", "invalid RFC 9557 string: "+s))
			}
			*tzID = key
			continue
		}
		if !c.eat('=') {
			panic(TnNodeError("RangeError", "", "invalid RFC 9557 string: "+s))
		}
		value := ""
		for !c.eof() && c.peek() != ']' {
			value += string(c.next())
		}
		if !c.eat(']') {
			panic(TnNodeError("RangeError", "", "invalid RFC 9557 string: "+s))
		}
		if key == "u-ca" {
			if cal == "" {
				cal = value
				calWasCritical = critical
			} else if critical || calWasCritical {
				panic(TnNodeError("RangeError", "", "Invalid annotations in "+s+": more than one u-ca present with critical flag"))
			}
		} else if critical {
			panic(TnNodeError("RangeError", "", "Unrecognized annotation: !"+key+"="+value))
		}
	}
	return cal
}

// HH[:MM[:SS[.frac]]] or basic HH[MM[SS[.frac]]]
func tnTParseTimeAfterSeparator(c *tnTStrCursor, s string) tnTTime {
	hStr, ok := c.digits(2, 2)
	if !ok {
		panic(TnNodeError("RangeError", "", "Invalid character while parsing time value."))
	}
	h := int(tnTCursorInt(hStr))
	mi, sec, ms, us, ns := 0, 0, 0, 0, 0
	if c.eat(':') {
		mStr, ok := c.digits(2, 2)
		if !ok {
			panic(TnNodeError("RangeError", "", "Invalid character while parsing minute value."))
		}
		mi = int(tnTCursorInt(mStr))
		if c.eat(':') {
			sStr, ok := c.digits(2, 2)
			if !ok {
				panic(TnNodeError("RangeError", "", "Invalid character while parsing second value."))
			}
			sec = int(tnTCursorInt(sStr))
			if c.eat('.') {
				fStr, ok := c.digits(1, 9)
				if !ok {
					panic(TnNodeError("RangeError", "", "Invalid character while parsing fractional second value."))
				}
				frac := (fStr + "000000000")[:9]
				ms = int(tnTCursorInt(frac[:3]))
				us = int(tnTCursorInt(frac[3:6]))
				ns = int(tnTCursorInt(frac[6:9]))
			}
		}
	} else if mStr, ok := c.digits(2, 2); ok {
		mi = int(tnTCursorInt(mStr))
		if sStr, ok := c.digits(2, 2); ok {
			sec = int(tnTCursorInt(sStr))
			if c.eat('.') {
				fStr, ok := c.digits(1, 9)
				if !ok {
					panic(TnNodeError("RangeError", "", "Invalid character while parsing fractional second value."))
				}
				frac := (fStr + "000000000")[:9]
				ms = int(tnTCursorInt(frac[:3]))
				us = int(tnTCursorInt(frac[3:6]))
				ns = int(tnTCursorInt(frac[6:9]))
			}
		}
	}
	if h > 23 || mi > 59 || sec > 60 || ms > 999 || us > 999 || ns > 999 {
		panic(TnNodeError("RangeError", "", "invalid RFC 9557 string: "+s+", time components invalid"))
	}
	if sec == 60 {
		sec = 59
	}
	return tnTTime{h: h, mi: mi, s: sec, ms: ms, us: us, ns: ns}
}

// Duration strings: PnYnMnWnDTnHnMnS with one fractional smallest unit
func tnTParseDurationString(s string) *TnTemporalDuration {
	c := &tnTStrCursor{s: s}
	neg := false
	if c.eat('-') {
		neg = true
	} else {
		c.eat('+')
	}
	if !c.eat('P') && !c.eat('p') {
		panic(TnNodeError("RangeError", "", "Invalid duration designator."))
	}
	if c.eof() {
		panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
	}
	sign := float64(1)
	if neg {
		sign = -1
	}
	var fields [10]float64 // y mo w d h mi s ms us ns
	unitIndex := map[string]int{"y": 0, "mo": 1, "w": 2, "d": 3, "h": 4, "mi": 5, "s": 6, "ms": 7, "us": 8, "ns": 9}
	timePart := false
	sawAny := false
	fractionUnit := ""
	fractionDigits := ""
	fractionScale := int64(0)
	for !c.eof() {
		ch := c.peek()
		if ch == 'T' || ch == 't' {
			if timePart {
				panic(TnNodeError("RangeError", "", "Invalid time duration designator."))
			}
			timePart = true
			c.next()
			if c.eof() {
				panic(TnNodeError("RangeError", "", "Invalid time duration designator."))
			}
			continue
		}
		if c.peek() == '.' {
			panic(TnNodeError("RangeError", "", "Unexpected character found after parsing was completed."))
		}
		numStr, ok := c.digits(1, 20)
		if !ok {
			panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
		}
		fracStr := ""
		if c.eat('.') {
			f, ok := c.digits(1, 20)
			if !ok {
				panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
			}
			fracStr = f
		}
		if c.eof() {
			panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
		}
		unitCh := c.next()
		var unit string
		var fracScale int64
		switch unitCh {
		case 'Y':
			if timePart {
				panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
			}
			unit, fracScale = "y", 0
		case 'M':
			if timePart {
				unit, fracScale = "mi", 60000000000
			} else {
				unit, fracScale = "mo", 0
			}
		case 'W':
			if timePart {
				panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
			}
			unit, fracScale = "w", 0
		case 'D':
			if timePart {
				panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
			}
			unit, fracScale = "d", 0
		case 'H':
			if !timePart {
				panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
			}
			unit, fracScale = "h", 3600000000000
		case 'S':
			if !timePart {
				panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
			}
			unit, fracScale = "s", 1000000000
		default:
			panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
		}
		if fields[unitIndex[unit]] != 0 || fracStr != "" && fields[unitIndex[unit]] != 0 {
			panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
		}
		if fracStr != "" {
			if fractionUnit != "" {
				panic(TnNodeError("RangeError", "", "Unexpected character found after parsing was completed."))
			}
			if len(fracStr) > 9 {
				panic(TnNodeError("RangeError", "", "Fractional time exceeds nine digits."))
			}
			fractionUnit = unit
			fractionDigits = (fracStr + "000000000")[:9]
			fractionScale = fracScale
		}
		fields[unitIndex[unit]] = math.Trunc(tnTCursorFloat(numStr))
		sawAny = true
	}
	if !sawAny {
		panic(TnNodeError("RangeError", "", "Parsing ended abruptly."))
	}
	// The fractional smallest unit folds into the smaller units' nanoseconds
	if fractionUnit != "" {
		// only the smallest component may be fractional: nothing smaller follows
		fractionIndex := unitIndex[fractionUnit]
		for _, u := range []string{"h", "mi", "s"} {
			if unitIndex[u] > fractionIndex && fields[unitIndex[u]] != 0 {
				panic(TnNodeError("RangeError", "", "only the smallest unit can be fractional"))
			}
		}
		if fractionScale == 0 {
			panic(TnNodeError("RangeError", "", "fractional years, months, weeks or days are not supported"))
		}
		excessNs := tnTCursorInt(fractionDigits) * (fractionScale / 1000000000)
		fields[6] += math.Trunc(float64(excessNs) / 1e9)
		excessNs -= int64(math.Trunc(float64(excessNs)/1e9)) * 1000000000
		fields[7] += math.Trunc(float64(excessNs) / 1e6)
		excessNs -= int64(math.Trunc(float64(excessNs)/1e6)) * 1000000
		fields[8] += math.Trunc(float64(excessNs) / 1e3)
		excessNs -= int64(math.Trunc(float64(excessNs)/1e3)) * 1000
		fields[9] += float64(excessNs)
	}
	for i := 0; i < 10; i++ {
		fields[i] *= sign
	}
	if fractionUnit != "" {
		// The fractional part balances into the smaller time units: PT0.5H
		// is PT30M, PT1.5H is PT1H30M (the parsed units do not rebalance
		// otherwise: PT90M stays PT90M)
		largestTimeUnit := tnTSecond
		if fractionUnit == "h" || fields[4] != 0 {
			largestTimeUnit = tnTHour
		} else if fractionUnit == "mi" || fields[5] != 0 {
			largestTimeUnit = tnTMinute
		}
		timeDur := tnTTdurFromComponents(fields[4], fields[5], fields[6], fields[7], fields[8], fields[9])
		internal := tnTInternalDur{date: tnTDateDur{y: fields[0], mo: fields[1], w: fields[2], d: fields[3]}, time: timeDur}
		return tnTTemporalDurationFromInternal(internal, largestTimeUnit)
	}
	return tnTMakeDuration(fields[0], fields[1], fields[2], fields[3], fields[4], fields[5], fields[6], fields[7], fields[8], fields[9])
}

func tnTCursorFloat(num string) float64 {
	v, err := strconv.ParseFloat(num, 64)
	if err != nil {
		return 0
	}
	return v
}

// --- Options

func tnTOptGet(options interface{}, key string) interface{} {
	if TnIsNil(options) {
		return nil
	}
	return TnGet(options, key)
}

func tnTOptString(options interface{}, key string) string {
	v := tnTOptGet(options, key)
	if v == nil {
		return ""
	}
	return TnJSString(v)
}

func tnTOptOverflow(options interface{}) string {
	v := tnTOptString(options, "overflow")
	switch v {
	case "":
		return "constrain"
	case "constrain", "reject":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid overflow option"))
}

func tnTOptDisambiguation(options interface{}) string {
	v := tnTOptString(options, "disambiguation")
	switch v {
	case "":
		return "compatible"
	case "compatible", "earlier", "later", "reject":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid disambiguation option"))
}

func tnTOptOffsetOpt(options interface{}, fallback string) string {
	v := tnTOptString(options, "offset")
	switch v {
	case "":
		return fallback
	case "use", "ignore", "prefer", "reject":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid offset option"))
}

func tnTOptRoundingMode(options interface{}, fallback string) string {
	v := tnTOptString(options, "roundingMode")
	switch v {
	case "":
		return fallback
	case "ceil", "floor", "expand", "trunc", "halfCeil", "halfFloor", "halfExpand", "halfTrunc", "halfEven":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid roundingMode option"))
}

// NegateRoundingMode
func tnTNegateRoundingMode(mode string) string {
	switch mode {
	case "ceil":
		return "floor"
	case "floor":
		return "ceil"
	case "halfCeil":
		return "halfFloor"
	case "halfFloor":
		return "halfCeil"
	}
	return mode
}

func tnTOptRoundingIncrement(options interface{}) int64 {
	v := tnTOptGet(options, "roundingIncrement")
	if v == nil {
		return 1
	}
	n := math.Trunc(TnNumber(v))
	if math.IsInf(n, 0) || math.IsNaN(n) {
		panic(TnNodeError("RangeError", "", "Expected finite integer."))
	}
	if n < 1 || n > 1000000000000 {
		panic(TnNodeError("RangeError", "", "roundingIncrement must be at least 1"))
	}
	return int64(n)
}

// ValidateTemporalRoundingIncrement (inclusive: the dividend itself is allowed)
func tnTValidateRoundingIncrement(inc int64, dividend int64, inclusive bool) {
	maximum := dividend
	if !inclusive {
		maximum = dividend - 1
	}
	if inc > maximum {
		panic(TnNodeError("RangeError", "", "roundingIncrement exceeds maximum"))
	}
	if dividend%inc != 0 {
		panic(TnNodeError("RangeError", "", "roundingIncrement does not divide evenly into the unit"))
	}
}

// MaximumTemporalDurationRoundingIncrement (0 = unbounded)
func tnTMaxDurationRoundingIncrement(unit string) int64 {
	switch unit {
	case tnTHour:
		return 24
	case tnTMinute, tnTSecond:
		return 60
	case tnTMillisecond, tnTMicrosecond, tnTNanosecond:
		return 1000
	}
	return 0
}

// GetTemporalFractionalSecondDigitsOption: 'auto' or '0'..'9'
func tnTOptFractionalDigits(options interface{}) string {
	v := tnTOptGet(options, "fractionalSecondDigits")
	if v == nil {
		return "auto"
	}
	if s, ok := v.(string); ok {
		if s == "auto" {
			return "auto"
		}
		panic(TnNodeError("RangeError", "", "fractionalSecondDigits must be 'auto' or 0 through 9"))
	}
	d := math.Floor(TnNumber(v))
	if math.IsInf(d, 0) || d < 0 || d > 9 {
		panic(TnNodeError("RangeError", "", "fractionalSecondDigits must be 'auto' or 0 through 9"))
	}
	return strconv.Itoa(int(d))
}

// ToSecondsStringPrecisionRecord: the rounding unit/increment/precision for
// string output, from smallestUnit and the fractional digits
func tnTStringPrecision(smallestUnit string, precision string) (prec string, unit string, inc int64) {
	switch smallestUnit {
	case tnTMinute:
		return "minute", tnTMinute, 1
	case tnTSecond:
		return "0", tnTSecond, 1
	case tnTMillisecond:
		return "3", tnTMillisecond, 1
	case tnTMicrosecond:
		return "6", tnTMicrosecond, 1
	case tnTNanosecond:
		return "9", tnTNanosecond, 1
	}
	switch precision {
	case "auto":
		return "auto", tnTNanosecond, 1
	case "0":
		return "0", tnTSecond, 1
	case "1", "2", "3":
		return precision, tnTMillisecond, tnTPow10(3 - tnTInt(precision))
	case "4", "5", "6":
		return precision, tnTMicrosecond, tnTPow10(6 - tnTInt(precision))
	}
	return precision, tnTNanosecond, tnTPow10(9 - tnTInt(precision))
}

func tnTInt(s string) int {
	v := 0
	for _, ch := range s {
		if ch >= '0' && ch <= '9' {
			v = v*10 + int(ch-'0')
		}
	}
	return v
}

func tnTPow10(n int) int64 {
	v := int64(1)
	for i := 0; i < n; i++ {
		v *= 10
	}
	return v
}

// A unit option: '' when unset; 'auto' allowed for largestUnit
func tnTOptUnit(options interface{}, key string, group string, allowAuto bool, disallowed []string) string {
	v := tnTOptGet(options, key)
	if v == nil {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		panic(TnNodeError("RangeError", "", "Value "+TnJSString(v)+" cannot be a "+key+" unit"))
	}
	if s == "auto" {
		if allowAuto {
			return "auto"
		}
		panic(TnNodeError("RangeError", "", "Value auto out of range for a "+key+" unit"))
	}
	unit := tnTUnitFromOption(s)
	tnTValidateUnitValue(unit, group)
	for _, d := range disallowed {
		if d == unit {
			panic(TnNodeError("RangeError", "", "Value "+unit+" out of range for a "+key+" unit"))
		}
	}
	return unit
}

// A bare unit value (the round({smallestUnit: 'hour'}) string form and the
// group validation)
func tnTParseUnitOption(value interface{}, group string) string {
	s, ok := value.(string)
	if !ok {
		panic(TnNodeError("RangeError", "", "invalid unit"))
	}
	unit := tnTUnitFromOption(s)
	tnTValidateUnitValue(unit, group)
	return unit
}

func tnTUnitFromOption(s string) string {
	switch s {
	case "year", "years":
		return tnTYear
	case "month", "months":
		return tnTMonth
	case "week", "weeks":
		return tnTWeek
	case "day", "days":
		return tnTDay
	case "hour", "hours":
		return tnTHour
	case "minute", "minutes":
		return tnTMinute
	case "second", "seconds":
		return tnTSecond
	case "millisecond", "milliseconds":
		return tnTMillisecond
	case "microsecond", "microseconds":
		return tnTMicrosecond
	case "nanosecond", "nanoseconds":
		return tnTNanosecond
	}
	panic(TnNodeError("RangeError", "", "Value "+s+" out of range for a unit"))
}

func tnTValidateUnitValue(unit string, group string) {
	switch group {
	case "date":
		if !tnTIsCalendarUnit(unit) {
			panic(TnNodeError("RangeError", "", unit+" not allowed as a date unit"))
		}
	case "time":
		if !tnTIsTimeUnit(unit) {
			panic(TnNodeError("RangeError", "", unit+" not allowed as a time unit"))
		}
	}
}

// DefaultTemporalLargestUnit
func tnTDefaultLargestUnit(d *TnTemporalDuration) string {
	fields := []string{tnTYear, tnTMonth, tnTWeek, tnTDay, tnTHour, tnTMinute, tnTSecond, tnTMillisecond, tnTMicrosecond, tnTNanosecond}
	values := []float64{d.y, d.mo, d.w, d.d, d.h, d.mi, d.s, d.ms, d.us, d.ns}
	for i, v := range values {
		if v != 0 {
			return fields[i]
		}
	}
	return tnTNanosecond
}

// GetTemporalRelativeToOption: a relativeTo option as a plain date or a
// zoned datetime
func tnTOptRelativeTo(options interface{}) (*tnTDate, *TnTemporalZonedDateTime) {
	v := tnTOptGet(options, "relativeTo")
	if v == nil {
		return nil, nil
	}
	switch item := v.(type) {
	case *TnTemporalZonedDateTime:
		return nil, item
	case *TnTemporalPlainDate:
		d := item.date
		return &d, nil
	case *TnTemporalPlainDateTime:
		d := item.date
		return &d, nil
	}
	s, ok := v.(string)
	if !ok {
		panic(TnNodeError("TypeError", "", "invalid relativeTo option"))
	}
	parsed := tnTParseISODateTime(s)
	if parsed.tzID != "" {
		tz := TnTemporalTimeZoneOf(parsed.tzID)
		if parsed.utc {
			ns := tnTUTCNs(tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}, parsed.time)
			tnTValidateInstantNsOfBig(ns)
			return nil, tnTNewZoned(ns, tz)
		}
		var offsetNs int64
		if parsed.offset != "" {
			offsetNs = tnTParseUTCOffset(parsed.offset)
		}
		date := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
		ns := tnTInterpretISODateTimeOffset(date, parsed.time, parsed.offset != "", offsetNs, tz, "compatible", "reject", true)
		return nil, tnTNewZoned(ns, tz)
	}
	if parsed.utc {
		panic(TnNodeError("RangeError", "", "Z designator not supported for a plain relativeTo; either remove the Z or add a bracketed time zone"))
	}
	d := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
	tnTRejectDate(&d)
	return &d, nil
}

func tnTValidateInstantNsOfBig(ns *tnbig.Int) { tnTValidateInstantNs(ns) }

// InterpretISODateTimeOffset
func tnTInterpretISODateTimeOffset(date tnTDate, time tnTTime, hasOffset bool, offsetNs int64, tz *tnTemporalTZ, disambiguation string, offsetOpt string, matchMinute bool) *tnbig.Int {
	if !hasOffset || offsetOpt == "ignore" {
		return tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: date, time: time}, disambiguation)
	}
	if offsetOpt == "use" {
		balanced := tnTBalanceDateTime(date.y, date.m, date.d, time.h, time.mi, time.s, time.ms, time.us, int(time.ns-int(offsetNs)/1))
		ns := tnTUTCNs(balanced.date, balanced.time)
		tnTValidateInstantNs(ns)
		return ns
	}
	// 'prefer' or 'reject': the offset wins when it matches the zone
	utcEpochNs := tnTUTCNs(date, time)
	possible := tnTGetPossibleEpochNanoseconds(tz, tnTDateTime{date: date, time: time})
	for _, candidate := range possible {
		diff := new(tnbig.Int).Sub(utcEpochNs, candidate)
		if diff.Int64() == offsetNs || (matchMinute && tnTRoundNumberToIncrement(float64(diff.Int64()), 60000000000, "halfExpand") == float64(offsetNs)) {
			return candidate
		}
	}
	if offsetOpt == "reject" {
		panic(TnNodeError("RangeError", "", "Offset "+tnTFormatOffsetNs(offsetNs)+" is invalid for this date time in "+tz.String()))
	}
	return tnTDisambiguatePossible(possible, tz, tnTDateTime{date: date, time: time}, disambiguation)
}
// GetEpochNanosecondsFor
func tnTGetEpochNanosecondsFor(tz *tnTemporalTZ, dt tnTDateTime, disambiguation string) *tnbig.Int {
	if tz == nil {
		// (a plain datetime: its UTC wall-clock reading is the epoch value)
		ns := tnTUTCNs(dt.date, dt.time)
		tnTValidateInstantNs(ns)
		return ns
	}
	possible := tnTGetPossibleEpochNanoseconds(tz, dt)
	return tnTDisambiguatePossible(possible, tz, dt, disambiguation)
}

// GetPossibleEpochNanoseconds
func tnTGetPossibleEpochNanoseconds(tz *tnTemporalTZ, dt tnTDateTime) []*tnbig.Int {
	if tz.fixed {
		days := tnTDateToEpochDays(dt.date.y, dt.date.m, dt.date.d)
		tnTValidateDayRange(days)
		ns := tnTUTCNs(dt.date, dt.time)
		ns.Sub(ns, tnbig.NewInt(tz.offsetNs))
		tnTValidateInstantNs(ns)
		return []*tnbig.Int{ns}
	}
	// The offsets one day on either side bracket any transition
	timeNs := int64(dt.time.h)*3600000000000 + int64(dt.time.mi)*60000000000 + int64(dt.time.s)*1000000000 +
		int64(dt.time.ms)*1000000 + int64(dt.time.us)*1000 + int64(dt.time.ns)
	localSec := tnTDateToEpochDays(dt.date.y, dt.date.m, dt.date.d)*86400 + timeNs/1000000000
	localNsec := int32(timeNs % 1000000000)
	insts := tz.possibleInstants(localSec, localNsec)
	out := []*tnbig.Int{}
	for _, inst := range insts {
		tnTInstantReject(inst)
		out = append(out, tnTInstantNs(inst))
	}
	return out
}

// DisambiguatePossibleEpochNanoseconds
func tnTDisambiguatePossible(possible []*tnbig.Int, tz *tnTemporalTZ, dt tnTDateTime, disambiguation string) *tnbig.Int {
	if len(possible) == 1 {
		return possible[0]
	}
	if len(possible) > 1 {
		switch disambiguation {
		case "compatible", "earlier":
			return possible[0]
		case "later":
			return possible[len(possible)-1]
		}
		panic(TnNodeError("RangeError", "", "multiple instants found"))
	}
	if disambiguation == "reject" {
		panic(TnNodeError("RangeError", "", "multiple instants found"))
	}
	// A gap: shift the local time by the offset change and re-read the zone
	utc := tnTUTCNs(dt.date, dt.time)
	utcSec := utc.Int64() / 1000000000
	offsetBefore := tz.offsetSecAt(utcSec-86400, 0)
	offsetAfter := tz.offsetSecAt(utcSec+86400, 0)
	shiftNs := (offsetAfter - offsetBefore) * 1000000000
	if disambiguation == "earlier" {
		shiftNs = -shiftNs
	}
	timeNs := int64(dt.time.h)*3600000000000 + int64(dt.time.mi)*60000000000 + int64(dt.time.s)*1000000000 +
		int64(dt.time.ms)*1000000 + int64(dt.time.us)*1000 + int64(dt.time.ns)
	totalNs := timeNs + shiftNs
	shifted, deltaDays := tnTBalanceTime(
		int(floorDiv64(totalNs, 3600000000000)),
		int(modEuclid64(floorDiv64(totalNs, 60000000000), 60)),
		int(modEuclid64(floorDiv64(totalNs, 1000000000), 60)),
		int(modEuclid64(floorDiv64(totalNs, 1000000), 1000)),
		int(modEuclid64(floorDiv64(totalNs, 1000), 1000)),
		int(modEuclid64(totalNs, 1000000000)))
	shiftedDate := tnTAddDays(dt.date, int64(deltaDays))
	possible = tnTGetPossibleEpochNanoseconds(tz, tnTDateTime{date: shiftedDate, time: shifted})
	if disambiguation == "earlier" {
		return possible[0]
	}
	return possible[len(possible)-1]
}

// GetStartOfDay: midnight's instant, or the transition when it is skipped
func tnTStartOfDay(tz *tnTemporalTZ, date tnTDate) *tnbig.Int {
	possible := tnTGetPossibleEpochNanoseconds(tz, tnTDateTime{date: date, time: tnTMidnight()})
	if len(possible) > 0 {
		return possible[0]
	}
	inst := &TnTemporalInstant{sec: tnTDateToEpochDays(date.y, date.m, date.d)*86400 - 86400, nsec: 0}
	next := tz.zoneTransition(inst, true)
	return tnTInstantNs(next)
}

// DifferenceTime: time2 - time1 as a time duration
func tnTDifferenceTime(t1, t2 tnTTime) tnTTimeDur {
	ns := int64(t2.h-t1.h)*3600000000000 + int64(t2.mi-t1.mi)*60000000000 + int64(t2.s-t1.s)*1000000000 +
		int64(t2.ms-t1.ms)*1000000 + int64(t2.us-t1.us)*1000 + int64(t2.ns-t1.ns)
	return tnTNormalizeTdur(tnTTimeDur{sec: ns / 1000000000, sub: int32(ns % 1000000000)})
}

// DifferenceISODateTime
func tnTDifferenceISODateTime(dt1, dt2 tnTDateTime, largestUnit string) tnTInternalDur {
	timeDuration := tnTDifferenceTime(dt1.time, dt2.time)
	timeSign := tnTTdurSign(timeDuration)
	dateSign := tnTCompareDate(dt1.date, dt2.date)
	adjustedDate := dt2.date
	if timeSign != 0 && timeSign == dateSign {
		adjustedDate = tnTAddDays(adjustedDate, int64(timeSign))
		timeDuration = tnTTdurAddDays(timeDuration, -int64(timeSign))
	}
	dateLargestUnit := tnTLargerOfTwoUnits(tnTDay, largestUnit)
	dateDifference := tnTCalendarDateUntilSigned(dt1.date, adjustedDate, dateLargestUnit)
	if largestUnit != dateLargestUnit {
		timeDuration = tnTTdurAddDays(timeDuration, int64(dateDifference.d))
		dateDifference.d = 0
	}
	return tnTCombineDateAndTime(dateDifference, timeDuration)
}

// DifferenceZonedDateTime (non-rounding): the local calendar difference plus
// the remaining epoch time. The calendar part starts from the local dates'
// difference and steps one day back while its instant overshoots the end (a
// DST shift, or an end time-of-day earlier than the start's).
func tnTDifferenceZonedDateTime(ns1, ns2 *tnbig.Int, tz *tnTemporalTZ, largestUnit string) tnTInternalDur {
	nsDiff := new(tnbig.Int).Sub(ns2, ns1)
	if nsDiff.Sign() == 0 {
		return tnTInternalDur{date: tnTZeroDateDur(), time: tnTTimeDur{}}
	}
	sign := 1
	if nsDiff.Sign() < 0 {
		sign = -1
	}
	dtStart := tnTGetISODateTimeFor(tz, ns1)
	dtEnd := tnTGetISODateTimeFor(tz, ns2)
	if dtStart.date.y == dtEnd.date.y && dtStart.date.m == dtEnd.date.m && dtStart.date.d == dtEnd.date.d {
		return tnTInternalDur{date: tnTZeroDateDur(), time: tnTTdurOfNs(nsDiff)}
	}
	dateLargestUnit := tnTLargerOfTwoUnits(tnTDay, largestUnit)
	dateDifference := tnTCalendarDateUntilSigned(dtStart.date, dtEnd.date, dateLargestUnit)
	var remainder tnTTimeDur
	for i := 0; i < 3; i++ {
		intermediateDate := tnTCalendarDateAdd(dtStart.date, dateDifference, "constrain")
		intermediateNs := tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: intermediateDate, time: dtStart.time}, "compatible")
		remainder = tnTTdurOfNs(new(tnbig.Int).Sub(ns2, intermediateNs))
		if tnTTdurSign(remainder) != -sign {
			break
		}
		dateDifference.d -= float64(sign)
	}
	return tnTCombineDateAndTime(dateDifference, remainder)
}

// DifferenceEpochNanoseconds: an instant difference, rounded
func tnTDifferenceEpochNs(ns1, ns2 *tnbig.Int, inc int64, smallestUnit string, mode string) tnTInternalDur {
	diff := tnTTdurOfNs(new(tnbig.Int).Sub(ns2, ns1))
	rounded := tnTRoundTimeDuration(diff, inc, smallestUnit, mode)
	return tnTInternalDur{date: tnTZeroDateDur(), time: rounded}
}

func tnTZeroF() *float64 {
	z := 0.0
	return &z
}

// ComputeNudgeWindow
func tnTComputeNudgeWindow(sign int, dur tnTInternalDur, originEpochNs, destEpochNs *tnbig.Int, isoDateTime tnTDateTime, tz *tnTemporalTZ, inc int64, unit string, additionalShift bool) (r1, r2 float64, startEpochNs, endEpochNs *tnbig.Int, startDuration, endDuration tnTDateDur) {
	switch unit {
	case tnTYear:
		years := math.Trunc(tnTRoundNumberToIncrement(dur.date.y, inc, "trunc"))
		r1 = years
		if additionalShift {
			r1 = years + float64(inc)*float64(sign)
		}
		r2 = r1 + float64(inc)*float64(sign)
		startDuration = tnTDateDur{y: r1}
		endDuration = tnTDateDur{y: r2}
	case tnTMonth:
		months := math.Trunc(tnTRoundNumberToIncrement(dur.date.mo, inc, "trunc"))
		r1 = months
		if additionalShift {
			r1 = months + float64(inc)*float64(sign)
		}
		r2 = r1 + float64(inc)*float64(sign)
		startDuration = tnTAdjustDateDur(dur.date, 0, tnTZeroF(), &r1)
		endDuration = tnTAdjustDateDur(dur.date, 0, tnTZeroF(), &r2)
	case tnTWeek:
		yearsMonths := tnTAdjustDateDur(dur.date, 0, tnTZeroF(), nil)
		weeksStart := tnTCalendarDateAdd(isoDateTime.date, yearsMonths, "constrain")
		weeksEnd := tnTAddDays(weeksStart, int64(math.Trunc(dur.date.d)))
		untilResult := tnTCalendarDateUntilSigned(weeksStart, weeksEnd, tnTWeek)
		weeks := math.Trunc(tnTRoundNumberToIncrement(dur.date.w+untilResult.w, inc, "trunc"))
		r1 = weeks
		r2 = weeks + float64(inc)*float64(sign)
		startDuration = tnTAdjustDateDur(dur.date, 0, &r1, nil)
		endDuration = tnTAdjustDateDur(dur.date, 0, &r2, nil)
	default: // day
		days := math.Trunc(tnTRoundNumberToIncrement(dur.date.d, inc, "trunc"))
		r1 = days
		r2 = days + float64(inc)*float64(sign)
		startDuration = tnTAdjustDateDur(dur.date, r1, nil, nil)
		endDuration = tnTAdjustDateDur(dur.date, r2, nil, nil)
	}
	if tnTDateDurSign(startDuration) == 0 {
		startEpochNs = originEpochNs
	} else {
		start := tnTCalendarDateAdd(isoDateTime.date, startDuration, "constrain")
		startEpochNs = tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: start, time: isoDateTime.time}, "compatible")
	}
	end := tnTCalendarDateAdd(isoDateTime.date, endDuration, "constrain")
	endEpochNs = tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: end, time: isoDateTime.time}, "compatible")
	return r1, r2, startEpochNs, endEpochNs, startDuration, endDuration
}

// NudgeToCalendarUnit
func tnTNudgeToCalendarUnit(sign int, dur tnTInternalDur, originEpochNs, destEpochNs *tnbig.Int, isoDateTime tnTDateTime, tz *tnTemporalTZ, inc int64, unit string, mode string) (result tnTInternalDur, nudgedEpochNs *tnbig.Int, didExpand bool, total float64) {
	r1, r2, startEpochNs, endEpochNs, startDuration, endDuration := tnTComputeNudgeWindow(sign, dur, originEpochNs, destEpochNs, isoDateTime, tz, inc, unit, false)
	inBounds := false
	if sign == 1 {
		inBounds = startEpochNs.Cmp(destEpochNs) <= 0 && destEpochNs.Cmp(endEpochNs) <= 0
	} else {
		inBounds = endEpochNs.Cmp(destEpochNs) <= 0 && destEpochNs.Cmp(startEpochNs) <= 0
	}
	if !inBounds {
		r1, r2, startEpochNs, endEpochNs, startDuration, endDuration = tnTComputeNudgeWindow(sign, dur, originEpochNs, destEpochNs, isoDateTime, tz, inc, unit, true)
		didExpand = true
	}
	numerator := tnTTdurOfNs(new(tnbig.Int).Sub(destEpochNs, startEpochNs))
	denominator := tnTTdurOfNs(new(tnbig.Int).Sub(endEpochNs, startEpochNs))
	unsignedMode := tnTGetUnsignedRoundingMode(mode, sign < 0)
	var roundedUnit *tnbig.Int
	r1Big := tnbig.NewInt(int64(r1))
	r2Big := tnbig.NewInt(int64(r2))
	if tnTTdurSign(numerator) == 0 {
		roundedUnit = new(tnbig.Int).Abs(r1Big)
	} else if numerator.sec == denominator.sec && numerator.sub == denominator.sub {
		roundedUnit = new(tnbig.Int).Abs(r2Big)
		didExpand = true
	} else {
		// cmp = sign of 2|dest-start| - |end-start|, exact
		twice := new(tnbig.Int).Abs(new(tnbig.Int).Mul(tnTTdurNs(numerator), tnbig.NewInt(2)))
		cmp := twice.Cmp(new(tnbig.Int).Abs(tnTTdurNs(denominator)))
		even := new(tnbig.Int).Abs(r1Big).Bit(0) == 0
		roundedUnit = tnTApplyUnsignedRoundingMode(new(tnbig.Int).Abs(r1Big), new(tnbig.Int).Abs(r2Big), cmp, even, unsignedMode)
	}
	if roundedUnit.Cmp(new(tnbig.Int).Abs(r2Big)) == 0 {
		didExpand = true
		result = tnTInternalDur{date: endDuration, time: tnTTimeDur{}}
		nudgedEpochNs = endEpochNs
	} else {
		result = tnTInternalDur{date: startDuration, time: tnTTimeDur{}}
		nudgedEpochNs = startEpochNs
	}
	if inc == 1 {
		// The total in unit fractions (total() only): long division, exact
		fakeNumerator := new(tnbig.Int).Mul(tnTTdurNs(denominator), r1Big)
		fakeNumerator.Add(fakeNumerator, new(tnbig.Int).Mul(tnTTdurNs(numerator), tnbig.NewInt(int64(sign))))
		total = tnTFloatDiv(fakeNumerator, tnTTdurNs(denominator))
	}
	return result, nudgedEpochNs, didExpand, total
}

// Long division to the float the polyfill's fdiv produces
func tnTFloatDiv(num, den *tnbig.Int) float64 {
	q, r := new(tnbig.Int).QuoRem(num, den, new(tnbig.Int))
	s := q.String()
	if r.Sign() != 0 && len(s) < 300 {
		fr := new(tnbig.Int).Abs(r)
		digits := ""
		for i := 0; i < 20 && fr.Sign() != 0; i++ {
			fr.Mul(fr, tnbig.NewInt(10))
			d, m := new(tnbig.Int).QuoRem(fr, new(tnbig.Int).Abs(den), new(tnbig.Int))
			digits += strconv.Itoa(int(d.Int64()))
			fr = m
		}
		if digits != "" {
			f, _ := strconv.ParseFloat(s+"."+digits, 64)
			if num.Sign() < 0 {
				return -f
			}
			return f
		}
	}
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// NudgeToDayOrTime
func tnTNudgeToDayOrTime(dur tnTInternalDur, destEpochNs *tnbig.Int, largestUnit string, inc int64, smallestUnit string, mode string) (result tnTInternalDur, nudgedEpochNs *tnbig.Int, didExpand bool) {
	timeDuration := tnTTdurAddDays(dur.time, int64(math.Trunc(dur.date.d)))
	unitNs := tnTUnitNs(smallestUnit)
	roundedNs := tnTRoundNsAsIfPositive(tnTTdurNs(timeDuration), unitNs*inc, mode)
	diffNs := new(tnbig.Int).Sub(roundedNs, tnTTdurNs(timeDuration))
	nudgedEpochNs = new(tnbig.Int).Add(destEpochNs, diffNs)
	wholeDays := new(tnbig.Int).Quo(tnTTdurNs(timeDuration), tnbig.NewInt(86400000000000))
	roundedWholeDays := new(tnbig.Int).Quo(roundedNs, tnbig.NewInt(86400000000000))
	dayDelta := new(tnbig.Int).Sub(roundedWholeDays, wholeDays)
	didExpand = dayDelta.Sign() != 0 && int64(dayDelta.Sign()) == int64(tnTTdurSign(timeDuration))
	days := 0.0
	remainder := tnTTdurOfNs(roundedNs)
	if tnTIsCalendarUnit(largestUnit) {
		days = float64(roundedWholeDays.Int64())
		remainder = tnTTdurOfNs(new(tnbig.Int).Sub(roundedNs, new(tnbig.Int).Mul(roundedWholeDays, tnbig.NewInt(86400000000000))))
	}
	result = tnTInternalDur{date: tnTAdjustDateDur(dur.date, days, nil, nil), time: remainder}
	return result, nudgedEpochNs, didExpand
}

// NudgeToZonedTime: rounds time units within the zone's day length
func tnTNudgeToZonedTime(sign int, dur tnTInternalDur, isoDateTime tnTDateTime, tz *tnTemporalTZ, inc int64, unit string, mode string) (result tnTInternalDur, nudgedEpochNs *tnbig.Int, didExpand bool) {
	start := tnTCalendarDateAdd(isoDateTime.date, dur.date, "constrain")
	startEpochNs := tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: start, time: isoDateTime.time}, "compatible")
	endDate := tnTAddDays(start, int64(sign))
	endEpochNs := tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: endDate, time: isoDateTime.time}, "compatible")
	daySpan := tnTTdurOfNs(new(tnbig.Int).Sub(endEpochNs, startEpochNs))
	if tnTTdurSign(daySpan) != sign {
		panic(TnNodeError("RangeError", "", "time zone returned inconsistent instants"))
	}
	unitIncrement := tnTUnitNs(unit) * inc
	roundedTime := tnTRoundNsAsIfPositive(tnTTdurNs(dur.time), unitIncrement, mode)
	beyondDaySpan := new(tnbig.Int).Sub(roundedTime, tnTTdurNs(daySpan))
	didRoundBeyondDay := beyondDaySpan.Sign() != -sign
	var dayDelta int64
	if didRoundBeyondDay {
		dayDelta = int64(sign)
		roundedTime = tnTRoundNsAsIfPositive(beyondDaySpan, unitIncrement, mode)
		nudgedEpochNs = new(tnbig.Int).Add(endEpochNs, roundedTime)
	} else {
		nudgedEpochNs = new(tnbig.Int).Add(startEpochNs, roundedTime)
	}
	dateDuration := tnTAdjustDateDur(dur.date, dur.date.d+float64(dayDelta), nil, nil)
	result = tnTInternalDur{date: dateDuration, time: tnTTdurOfNs(roundedTime)}
	return result, nudgedEpochNs, didRoundBeyondDay
}

// BubbleRelativeDuration
func tnTBubbleRelativeDuration(sign int, dur tnTInternalDur, nudgedEpochNs *tnbig.Int, isoDateTime tnTDateTime, tz *tnTemporalTZ, largestUnit string, smallestUnit string) tnTInternalDur {
	if smallestUnit == largestUnit {
		return dur
	}
	largestIndex := tnTUnitIndex(largestUnit)
	smallestIndex := tnTUnitIndex(smallestUnit)
	for unitIndex := smallestIndex - 1; unitIndex >= largestIndex; unitIndex-- {
		unit := tnTUnitsDescending[unitIndex]
		if unit == tnTWeek && largestUnit != tnTWeek {
			continue
		}
		var endDuration tnTDateDur
		switch unit {
		case tnTYear:
			endDuration = tnTDateDur{y: dur.date.y + float64(sign)}
		case tnTMonth:
			months := dur.date.mo + float64(sign)
			endDuration = tnTAdjustDateDur(dur.date, 0, tnTZeroF(), &months)
		default:
			weeks := dur.date.w + float64(sign)
			endDuration = tnTAdjustDateDur(dur.date, 0, &weeks, nil)
		}
		end := tnTCalendarDateAdd(isoDateTime.date, endDuration, "constrain")
		endEpochNs := tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: end, time: isoDateTime.time}, "compatible")
		if nudgedEpochNs.Cmp(endEpochNs) != -sign {
			dur = tnTInternalDur{date: endDuration, time: tnTTimeDur{}}
		} else {
			break
		}
	}
	return dur
}

// RoundRelativeDuration
func tnTRoundRelativeDuration(dur tnTInternalDur, originEpochNs, destEpochNs *tnbig.Int, isoDateTime tnTDateTime, tz *tnTemporalTZ, largestUnit string, inc int64, smallestUnit string, mode string) tnTInternalDur {
	irregularLengthUnit := tnTIsCalendarUnit(smallestUnit) || (tz != nil && smallestUnit == tnTDay)
	sign := 1
	if tnTInternalSign(dur) < 0 {
		sign = -1
	}
	var nudgeResult tnTInternalDur
	var nudgedEpochNs *tnbig.Int
	var didExpand bool
	if irregularLengthUnit {
		nudgeResult, nudgedEpochNs, didExpand, _ = tnTNudgeToCalendarUnit(sign, dur, originEpochNs, destEpochNs, isoDateTime, tz, inc, smallestUnit, mode)
	} else if tz != nil {
		nudgeResult, nudgedEpochNs, didExpand = tnTNudgeToZonedTime(sign, dur, isoDateTime, tz, inc, smallestUnit, mode)
	} else {
		nudgeResult, nudgedEpochNs, didExpand = tnTNudgeToDayOrTime(dur, destEpochNs, largestUnit, inc, smallestUnit, mode)
	}
	dur = nudgeResult
	if didExpand && smallestUnit != tnTWeek {
		dur = tnTBubbleRelativeDuration(sign, dur, nudgedEpochNs, isoDateTime, tz, largestUnit, tnTLargerOfTwoUnits(smallestUnit, tnTDay))
	}
	return dur
}

// TotalRelativeDuration
func tnTTotalRelativeDuration(dur tnTInternalDur, originEpochNs, destEpochNs *tnbig.Int, isoDateTime tnTDateTime, tz *tnTemporalTZ, unit string) float64 {
	if tnTIsCalendarUnit(unit) || (tz != nil && unit == tnTDay) {
		sign := 1
		if tnTInternalSign(dur) < 0 {
			sign = -1
		}
		_, _, _, total := tnTNudgeToCalendarUnit(sign, dur, originEpochNs, destEpochNs, isoDateTime, tz, 1, unit, "trunc")
		return total
	}
	timeDuration := tnTTdurAddDays(dur.time, int64(math.Trunc(dur.date.d)))
	return tnTTotalTimeDuration(timeDuration, unit)
}

// DifferencePlainDateTimeWithRounding
func tnTDifferencePlainDateTimeWithRounding(dt1, dt2 tnTDateTime, largestUnit string, inc int64, smallestUnit string, mode string) tnTInternalDur {
	if tnTCompareDateTime(dt1, dt2) == 0 {
		return tnTInternalDur{date: tnTZeroDateDur(), time: tnTTimeDur{}}
	}
	dur := tnTDifferenceISODateTime(dt1, dt2, largestUnit)
	if smallestUnit == tnTNanosecond && inc == 1 {
		return dur
	}
	originEpochNs := tnTUTCNsOfDateTime(dt1)
	destEpochNs := tnTUTCNsOfDateTime(dt2)
	return tnTRoundRelativeDuration(dur, originEpochNs, destEpochNs, dt1, nil, largestUnit, inc, smallestUnit, mode)
}

// DifferenceZonedDateTimeWithRounding
func tnTDifferenceZonedDateTimeWithRounding(ns1, ns2 *tnbig.Int, tz *tnTemporalTZ, largestUnit string, inc int64, smallestUnit string, mode string) tnTInternalDur {
	if tnTIsTimeUnit(largestUnit) {
		return tnTDifferenceEpochNs(ns1, ns2, inc, smallestUnit, mode)
	}
	dur := tnTDifferenceZonedDateTime(ns1, ns2, tz, largestUnit)
	if smallestUnit == tnTNanosecond && inc == 1 {
		return dur
	}
	dt := tnTGetISODateTimeFor(tz, ns1)
	return tnTRoundRelativeDuration(dur, ns1, ns2, dt, tz, largestUnit, inc, smallestUnit, mode)
}

func tnTCompareDate(a, b tnTDate) int {
	if a.y != b.y {
		return tnTCmpI64(a.y, b.y)
	}
	if a.m != b.m {
		return tnTCmpInt(a.m, b.m)
	}
	return tnTCmpInt(a.d, b.d)
}

func tnTCompareTime(a, b tnTTime) int {
	if a.h != b.h {
		return tnTCmpInt(a.h, b.h)
	}
	if a.mi != b.mi {
		return tnTCmpInt(a.mi, b.mi)
	}
	if a.s != b.s {
		return tnTCmpInt(a.s, b.s)
	}
	if a.ms != b.ms {
		return tnTCmpInt(a.ms, b.ms)
	}
	if a.us != b.us {
		return tnTCmpInt(a.us, b.us)
	}
	return tnTCmpInt(a.ns, b.ns)
}

func tnTCompareDateTime(a, b tnTDateTime) int {
	if c := tnTCompareDate(a.date, b.date); c != 0 {
		return c
	}
	return tnTCompareTime(a.time, b.time)
}

func tnTCmpInt(a, b int) int {
	if a < b {
		return -1
	}
	if a > b {
		return 1
	}
	return 0
}

func tnTCmpI64(a, b int64) int {
	if a < b {
		return -1
	}
	if a > b {
		return 1
	}
	return 0
}

// --- Formatting

// ±HH:MM, seconds and subseconds rounded to the minute like the polyfill's
// FormatDateTimeUTCOffsetRounded
func tnTFormatOffsetNs(offsetNs int64) string {
	if offsetNs < 0 && offsetNs > -60000000000 {
		offsetNs = -offsetNs
		sign := "-"
		minutes := int((offsetNs + 30000000000) / 60000000000)
		if minutes >= 60 {
			_ = minutes
		}
		return sign + "00:" + tnTPad2(modEuclid64(int64(minutes), 60))
	}
	sign := "+"
	if offsetNs < 0 {
		sign = "-"
		offsetNs = -offsetNs
	}
	minutes := (offsetNs + 30000000000) / 60000000000
	hours := minutes / 60
	minutes -= hours * 60
	return sign + tnTPad2(hours) + ":" + tnTPad2(minutes)
}

func tnTPad2(v int64) string {
	if v < 0 {
		v = -v
	}
	if v < 10 {
		return "0" + strconv.Itoa(int(v))
	}
	return strconv.Itoa(int(v))
}

// ±HH:MM[:SS] for ZonedDateTime output (whole-second offsets only)
func tnTFormatOffsetFull(offsetNs int64) string {
	sign := "+"
	if offsetNs < 0 {
		sign = "-"
		offsetNs = -offsetNs
	}
	seconds := offsetNs / 1000000000
	hours := seconds / 3600
	minutes := (seconds / 60) % 60
	secs := seconds % 60
	out := sign + tnTPad2(hours) + ":" + tnTPad2(minutes)
	if secs != 0 {
		out += ":" + tnTPad2(secs)
	}
	return out
}

func tnTISOYearString(y int64) string {
	if y < 0 || y > 9999 {
		sign := "+"
		if y < 0 {
			sign = "-"
			y = -y
		}
		s := strconv.FormatInt(y, 10)
		for len(s) < 6 {
			s = "0" + s
		}
		return sign + s
	}
	s := strconv.FormatInt(y, 10)
	for len(s) < 4 {
		s = "0" + s
	}
	return s
}

func tnTPart(v int) string {
	if v < 10 {
		return "0" + strconv.Itoa(v)
	}
	return strconv.Itoa(v)
}

// A fractional-seconds string: '' when precision is auto and the value is 0
func tnTFractionalSeconds(subNs int64, precision string) string {
	if precision == "auto" {
		if subNs == 0 {
			return ""
		}
		s := fmt.Sprintf("%09d", subNs)
		s = strings.TrimRight(s, "0")
		return "." + s
	}
	n := tnTInt(precision)
	if n == 0 {
		return ""
	}
	s := fmt.Sprintf("%09d", subNs)[:n]
	return "." + s
}

func tnTTimeString(t tnTTime, precision string) string {
	subNs := int64(t.ms)*1000000 + int64(t.us)*1000 + int64(t.ns)
	out := tnTPart(t.h) + ":" + tnTPart(t.mi)
	if precision == "minute" {
		return out
	}
	out += ":" + tnTPart(t.s)
	out += tnTFractionalSeconds(subNs, precision)
	return out
}

func tnTDateToString(d tnTDate) string {
	return tnTISOYearString(d.y) + "-" + tnTPart(d.m) + "-" + tnTPart(d.d)
}

func tnTDateTimeString(dt tnTDateTime, precision string) string {
	return tnTDateToString(dt.date) + "T" + tnTTimeString(dt.time, precision)
}

// A [u-ca=...] annotation when the options ask for one
func tnTCalendarAnnotation(show string) string {
	switch show {
	case "always":
		return "[u-ca=iso8601]"
	case "critical":
		return "[!u-ca=iso8601]"
	}
	return ""
}

func tnTOptShowCalendar(options interface{}) string {
	v := tnTOptString(options, "calendarName")
	switch v {
	case "":
		return "auto"
	case "auto", "always", "never", "critical":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid calendarName option"))
}

func tnTOptShowTimeZone(options interface{}) string {
	v := tnTOptString(options, "timeZoneName")
	switch v {
	case "":
		return "auto"
	case "auto", "never", "critical":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid timeZoneName option"))
}

func tnTOptShowOffset(options interface{}) string {
	v := tnTOptString(options, "offset")
	switch v {
	case "":
		return "auto"
	case "auto", "never":
		return v
	}
	panic(TnNodeError("RangeError", "", "invalid offset option"))
}

// TemporalDurationToString
func (d *TnTemporalDuration) toString(options ...interface{}) string {
	// When a smallestUnit is given, round through that unit first
	var precision string = "auto"
	var smallestUnit string
	var mode string
	if len(options) > 0 && !TnIsNil(options[0]) {
		precision = tnTOptFractionalDigits(options[0])
		smallestUnit = tnTOptUnit(options[0], "smallestUnit", "time", false, []string{tnTHour, tnTMinute})
		mode = tnTOptRoundingMode(options[0], "trunc")
	}
	fields := []float64{d.y, d.mo, d.w, d.d, d.h, d.mi, d.s, d.ms, d.us, d.ns}
	if smallestUnit != "" || precision != "auto" {
		roundUnit, roundInc := tnTNanosecond, int64(1)
		if smallestUnit != "" {
			roundUnit = smallestUnit
			roundInc = 1
		} else {
			roundUnit, roundInc = tnTStringPrecisionUnit(precision)
		}
		balanced := tnTToInternalDurationRecordWith24HourDays(d)
		rounded := tnTRoundTimeDuration(balanced.time, roundInc, roundUnit, mode)
		out := tnTTemporalDurationFromInternal(tnTInternalDur{date: balanced.date, time: rounded}, tnTDefaultLargestUnit(d))
		fields = []float64{out.y, out.mo, out.w, out.d, out.h, out.mi, out.s, out.ms, out.us, out.ns}
	}
	sign := 0
	for _, v := range fields {
		if v != 0 {
			if v < 0 {
				sign = -1
			} else {
				sign = 1
			}
			break
		}
	}
	var datePart, timePart string
	if fields[0] != 0 {
		datePart += strconv.FormatFloat(math.Abs(fields[0]), 'f', -1, 64) + "Y"
	}
	if fields[1] != 0 {
		datePart += strconv.FormatFloat(math.Abs(fields[1]), 'f', -1, 64) + "M"
	}
	if fields[2] != 0 {
		datePart += strconv.FormatFloat(math.Abs(fields[2]), 'f', -1, 64) + "W"
	}
	if fields[3] != 0 {
		datePart += strconv.FormatFloat(math.Abs(fields[3]), 'f', -1, 64) + "D"
	}
	if fields[4] != 0 {
		timePart += strconv.FormatFloat(math.Abs(fields[4]), 'f', -1, 64) + "H"
	}
	if fields[5] != 0 {
		timePart += strconv.FormatFloat(math.Abs(fields[5]), 'f', -1, 64) + "M"
	}
	secondsDur := tnTTdurFromComponents(0, 0, fields[6], fields[7], fields[8], fields[9])
	largestUnit := tnTDefaultLargestUnit(d)
	if !tnTIsZeroTdur(secondsDur) || largestUnit == tnTSecond || largestUnit == tnTMillisecond || largestUnit == tnTMicrosecond || largestUnit == tnTNanosecond || precision != "auto" {
		secStr := strconv.FormatInt(absI64(secondsDur.sec), 10)
		subStr := tnTFractionalSeconds(absI64(int64(secondsDur.sub)), precision)
		timePart += secStr + subStr + "S"
	}
	result := ""
	if sign < 0 {
		result = "-"
	}
	result += "P" + datePart
	if timePart != "" {
		result += "T" + timePart
	}
	return result
}

func tnTIsZeroTdur(d tnTTimeDur) bool { return d.sec == 0 && d.sub == 0 }

func (d *TnTemporalDuration) TnToString() string { return d.toString() }
func (d *TnTemporalDuration) String() string     { return d.toString() }
func (d *TnTemporalDuration) toJSON() string     { return d.toString() }
func (d *TnTemporalDuration) TnToJSON(string) interface{} {
	return d.toString()
}
func (d *TnTemporalDuration) toLocaleString(...interface{}) string { return d.toString() }
func (d *TnTemporalDuration) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.Duration {}"
}
func (d *TnTemporalDuration) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.Duration.prototype.valueOf; use Temporal.Duration.prototype.compare for comparison."))
}

// ToSecondsStringPrecisionRecord's unit/increment for a digits precision
func tnTStringPrecisionUnit(precision string) (string, int64) {
	switch precision {
	case "0":
		return tnTSecond, 1
	case "1", "2", "3":
		return tnTMillisecond, tnTPow10(3 - tnTInt(precision))
	case "4", "5", "6":
		return tnTMicrosecond, tnTPow10(6 - tnTInt(precision))
	}
	return tnTNanosecond, tnTPow10(9 - tnTInt(precision))
}

// ToTemporalDuration: a duration, string or bag
func tnTToDuration(item interface{}) *TnTemporalDuration {
	switch v := item.(type) {
	case *TnTemporalDuration:
		return v
	case string:
		return tnTParseDurationString(v)
	}
	if TnIsNil(item) {
		panic(TnNodeError("TypeError", "", "invalid duration"))
	}
	read := func(key string) float64 {
		v := TnGet(item, key)
		if TnIsNil(v) {
			return 0
		}
		n := math.Trunc(TnNumber(v))
		if math.IsInf(n, 0) || math.IsNaN(n) || n != TnNumber(v) {
			panic(TnNodeError("RangeError", "", "Expected finite integer."))
		}
		return n
	}
	y, mo, w, dd := read("years"), read("months"), read("weeks"), read("days")
	h, mi, s := read("hours"), read("minutes"), read("seconds")
	ms, us, ns := read("milliseconds"), read("microseconds"), read("nanoseconds")
	if y == 0 && mo == 0 && w == 0 && dd == 0 && h == 0 && mi == 0 && s == 0 && ms == 0 && us == 0 && ns == 0 {
		// no valid fields provided at all is a TypeError
		panic(TnNodeError("TypeError", "", "Did not provide any valid Duration fields."))
	}
	return tnTMakeDuration(y, mo, w, dd, h, mi, s, ms, us, ns)
}

// new Temporal.Duration(...)
func TnNewTemporalDuration(fields ...interface{}) *TnTemporalDuration {
	read := func(i int) float64 {
		if i >= len(fields) || TnIsNil(fields[i]) {
			return 0
		}
		n := math.Trunc(TnNumber(fields[i]))
		if math.IsInf(n, 0) || math.IsNaN(n) || n != TnNumber(fields[i]) {
			panic(TnNodeError("RangeError", "", "Expected finite integer."))
		}
		return n
	}
	return tnTMakeDuration(read(0), read(1), read(2), read(3), read(4), read(5), read(6), read(7), read(8), read(9))
}

// Temporal.Duration.from
func TnTemporalDurationFrom(item interface{}) *TnTemporalDuration {
	return tnTToDuration(item)
}

func (d *TnTemporalDuration) negated() *TnTemporalDuration {
	return &TnTemporalDuration{y: -d.y, mo: -d.mo, w: -d.w, d: -d.d, h: -d.h, mi: -d.mi, s: -d.s, ms: -d.ms, us: -d.us, ns: -d.ns}
}

func (d *TnTemporalDuration) abs() *TnTemporalDuration {
	return &TnTemporalDuration{y: math.Abs(d.y), mo: math.Abs(d.mo), w: math.Abs(d.w), d: math.Abs(d.d), h: math.Abs(d.h), mi: math.Abs(d.mi), s: math.Abs(d.s), ms: math.Abs(d.ms), us: math.Abs(d.us), ns: math.Abs(d.ns)}
}

// AddDurations (add / subtract)
func tnTAddDurations(operation string, duration *TnTemporalDuration, other interface{}) *TnTemporalDuration {
	otherDur := tnTToDuration(other)
	if operation == "subtract" {
		otherDur = otherDur.negated()
	}
	largestUnit := tnTLargerOfTwoUnits(tnTDefaultLargestUnit(duration), tnTDefaultLargestUnit(otherDur))
	if largestUnit == tnTYear || largestUnit == tnTMonth || largestUnit == tnTWeek {
		panic(TnNodeError("RangeError", "", "Largest unit cannot be a calendar unit when adding two durations."))
	}
	d1 := tnTToInternalDurationRecordWith24HourDays(duration)
	d2 := tnTToInternalDurationRecordWith24HourDays(otherDur)
	result := tnTInternalDur{date: tnTZeroDateDur(), time: tnTTdurAdd(d1.time, d2.time)}
	return tnTTemporalDurationFromInternal(result, largestUnit)
}

func (d *TnTemporalDuration) add(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTAddDurations("add", d, other)
}

func (d *TnTemporalDuration) subtract(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTAddDurations("subtract", d, other)
}

func (d *TnTemporalDuration) with(durationLike interface{}) *TnTemporalDuration {
	if TnIsNil(durationLike) {
		panic(TnNodeError("TypeError", "", "Did not provide any valid Duration fields."))
	}
	read := func(key string, current float64, present *bool) float64 {
		v := TnGet(durationLike, key)
		if TnIsNil(v) {
			return current
		}
		*present = true
		n := math.Trunc(TnNumber(v))
		if math.IsInf(n, 0) || math.IsNaN(n) || n != TnNumber(v) {
			panic(TnNodeError("RangeError", "", "Expected finite integer."))
		}
		return n
	}
	var present bool
	y := read("years", d.y, &present)
	mo := read("months", d.mo, &present)
	w := read("weeks", d.w, &present)
	dd := read("days", d.d, &present)
	h := read("hours", d.h, &present)
	mi := read("minutes", d.mi, &present)
	s := read("seconds", d.s, &present)
	ms := read("milliseconds", d.ms, &present)
	us := read("microseconds", d.us, &present)
	ns := read("nanoseconds", d.ns, &present)
	if !present {
		panic(TnNodeError("TypeError", "", "Did not provide any valid Duration fields."))
	}
	return tnTMakeDuration(y, mo, w, dd, h, mi, s, ms, us, ns)
}

// Temporal.Duration.compare
func TnTemporalDurationCompare(one interface{}, two interface{}, options ...interface{}) float64 {
	d1 := tnTToDuration(one)
	d2 := tnTToDuration(two)
	plain, zoned := tnTOptRelativeTo(tnTOptionsArg(options))
	if d1.y == 0 && d1.mo == 0 && d1.w == 0 && d2.y == 0 && d2.mo == 0 && d2.w == 0 {
		t1 := tnTTdurFromDurationFields(d1)
		t2 := tnTTdurFromDurationFields(d2)
		if tnTTdurSign(tnTTdurSub(t1, t2)) < 0 {
			return -1
		}
		if tnTTdurSign(tnTTdurSub(t1, t2)) > 0 {
			return 1
		}
		return 0
	}
	if zoned != nil {
		rel := zoned
		end1 := tnTAddZonedDateTime(tnTInstantNs(rel.instant), rel.tz, tnTToInternalDurationRecord(d1), "constrain")
		end2 := tnTAddZonedDateTime(tnTInstantNs(rel.instant), rel.tz, tnTToInternalDurationRecord(d2), "constrain")
		return float64(end1.Cmp(end2))
	}
	if plain == nil {
		panic(TnNodeError("RangeError", "", "A starting point is required for years, months, or weeks comparison."))
	}
	end1 := tnTCalendarDateAdd(*plain, tnTToDateDurationRecordWithoutTime(d1), "constrain")
	end2 := tnTCalendarDateAdd(*plain, tnTToDateDurationRecordWithoutTime(d2), "constrain")
	return float64(tnTCompareDate(end1, end2))
}

func tnTOptionsArg(options []interface{}) interface{} {
	if len(options) > 0 {
		return options[0]
	}
	return nil
}

// Duration.prototype.round: a difference from relativeTo, rounded
func (d *TnTemporalDuration) round(roundTo interface{}) *TnTemporalDuration {
	if TnIsNil(roundTo) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	if s, ok := roundTo.(string); ok {
		roundTo = map[string]interface{}{"smallestUnit": s}
	}
	plain, zoned := tnTOptRelativeTo(roundTo)
	largestUnitOpt := tnTOptUnit(roundTo, "largestUnit", "datetime", true, nil)
	inc := tnTOptRoundingIncrement(roundTo)
	mode := tnTOptRoundingMode(roundTo, "halfExpand")
	smallestUnit := tnTOptUnit(roundTo, "smallestUnit", "datetime", false, nil)
	smallestUnitPresent := smallestUnit != ""
	if !smallestUnitPresent {
		smallestUnit = tnTNanosecond
	}
	existingLargestUnit := tnTDefaultLargestUnit(d)
	defaultLargestUnit := tnTLargerOfTwoUnits(existingLargestUnit, smallestUnit)
	largestUnit := defaultLargestUnit
	if largestUnitOpt != "" && largestUnitOpt != "auto" {
		largestUnit = largestUnitOpt
	} else if largestUnitOpt == "auto" {
		largestUnit = defaultLargestUnit
	}
	if !smallestUnitPresent && largestUnitOpt == "" {
		panic(TnNodeError("RangeError", "", "smallestUnit or largestUnit is required"))
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "largestUnit when rounding Duration was not the largest provided unit"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if inc > 1 && largestUnit != smallestUnit && tnTIsCalendarUnit(smallestUnit) {
		panic(TnNodeError("RangeError", "", "roundingIncrement with calendar units requires a matching largestUnit"))
	}
	if zoned != nil {
		internal := tnTToInternalDurationRecord(d)
		rel := zoned
		relNs := tnTInstantNs(rel.instant)
		targetNs := tnTAddZonedDateTime(relNs, rel.tz, internal, "constrain")
		result := tnTDifferenceZonedDateTimeWithRounding(relNs, targetNs, rel.tz, largestUnit, inc, smallestUnit, mode)
		out := tnTTemporalDurationFromInternal(result, tnTHour)
		return tnTMakeDuration(out.y, out.mo, out.w, out.d, out.h, out.mi, out.s, out.ms, out.us, out.ns)
	}
	if plain != nil {
		target := tnTCalendarDateAdd(*plain, tnTToDateDurationRecordWithoutTime(d), "constrain")
		dt1 := tnTDateTime{date: *plain, time: tnTMidnight()}
		dt2 := tnTDateTime{date: target, time: tnTMidnight()}
		result := tnTDifferencePlainDateTimeWithRounding(dt1, dt2, largestUnit, inc, smallestUnit, mode)
		return tnTTemporalDurationFromInternal(result, largestUnit)
	}
	if tnTIsCalendarUnit(existingLargestUnit) || tnTIsCalendarUnit(largestUnit) {
		panic(TnNodeError("RangeError", "", "largestUnit when rounding Duration was not the largest provided unit"))
	}
	if smallestUnit == tnTDay {
		internal := tnTToInternalDurationRecordWith24HourDays(d)
		fractionalDays := tnTTotalTimeDuration(internal.time, tnTDay)
		days := tnTRoundNumberToIncrement(fractionalDays, inc, mode)
		result := tnTInternalDur{date: tnTDateDur{d: days}, time: tnTTimeDur{}}
		return tnTTemporalDurationFromInternal(result, largestUnit)
	}
	internal := tnTToInternalDurationRecordWith24HourDays(d)
	rounded := tnTRoundTimeDuration(internal.time, inc, smallestUnit, mode)
	result := tnTInternalDur{date: tnTZeroDateDur(), time: rounded}
	return tnTTemporalDurationFromInternal(result, largestUnit)
}

// Duration.prototype.total
func (d *TnTemporalDuration) total(totalOf interface{}) float64 {
	if TnIsNil(totalOf) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	unit := ""
	if s, ok := totalOf.(string); ok {
		unit = tnTParseUnitOption(s, "datetime")
	} else {
		unit = tnTOptUnit(totalOf, "unit", "datetime", false, nil)
		if unit == "" {
			panic(TnNodeError("TypeError", "", "unit is required"))
		}
	}
	plain, zoned := tnTOptRelativeTo(tnTOptionsArg([]interface{}{totalOf}))
	if zoned != nil {
		rel := zoned
		relNs := tnTInstantNs(rel.instant)
		targetNs := tnTAddZonedDateTime(relNs, rel.tz, tnTToInternalDurationRecord(d), "constrain")
		if tnTIsTimeUnit(unit) {
			// (an exact epoch difference: the local calendar's days can hold
			// 23 or 25 hours across a transition)
			return tnTTotalTimeDuration(tnTTdurOfNs(new(tnbig.Int).Sub(targetNs, relNs)), unit)
		}
		return tnTTotalRelativeDuration(tnTDifferenceZonedDateTime(relNs, targetNs, rel.tz, unit), relNs, targetNs, tnTGetISODateTimeFor(rel.tz, relNs), rel.tz, unit)
	}
	if plain != nil {
		dateDuration := tnTDateDur{y: d.y, mo: d.mo, w: d.w, d: d.d}
		// The time of day the duration ends at, and the days it completes
		timeDuration := tnTTdurFromComponents(d.h, d.mi, d.s, d.ms, d.us, d.ns)
		dayNs := tnbig.NewInt(86400000000000)
		daysBig, remBig := new(tnbig.Int).QuoRem(tnTTdurNs(timeDuration), dayNs, new(tnbig.Int))
		extraDays := daysBig.Int64()
		rem := remBig.Int64()
		if rem < 0 {
			rem += 86400000000000
			extraDays--
		}
		timeOfDay := tnTTime{
			h: int(rem / 3600000000000), mi: int(rem / 60000000000) % 60, s: int(rem / 1000000000) % 60,
			ms: int(rem / 1000000) % 1000, us: int(rem / 1000) % 1000, ns: int(rem % 1000),
		}
		target := tnTAddDays(tnTCalendarDateAdd(*plain, dateDuration, "constrain"), extraDays)
		dt1 := tnTDateTime{date: *plain, time: tnTMidnight()}
		dt2 := tnTDateTime{date: target, time: timeOfDay}
		diff := tnTDifferenceISODateTime(dt1, dt2, unit)
		origin := tnTUTCNsOfDateTime(dt1)
		dest := tnTUTCNsOfDateTime(dt2)
		return tnTTotalRelativeDuration(diff, origin, dest, dt1, nil, unit)
	}
	if tnTIsCalendarUnit(unit) {
		panic(TnNodeError("RangeError", "", "A starting point is required for years, months, or weeks total."))
	}
	internal := tnTToInternalDurationRecordWith24HourDays(d)
	return tnTTotalTimeDuration(internal.time, unit)
}

// --- AddZonedDateTime and friends

// AddZonedDateTime: date units on the local calendar, time units on the epoch
func tnTAddZonedDateTime(epochNs *tnbig.Int, tz *tnTemporalTZ, dur tnTInternalDur, overflow string) *tnbig.Int {
	if tnTDateDurSign(dur.date) == 0 {
		ns := new(tnbig.Int).Add(epochNs, tnTTdurNs(dur.time))
		inst := tnTInstantOfNs(ns)
		tnTInstantReject(inst)
		return ns
	}
	dt := tnTGetISODateTimeFor(tz, epochNs)
	addedDate := tnTCalendarDateAdd(dt.date, dur.date, overflow)
	intermediate := tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: addedDate, time: dt.time}, "compatible")
	ns := new(tnbig.Int).Add(intermediate, tnTTdurNs(dur.time))
	inst := tnTInstantOfNs(ns)
	tnTInstantReject(inst)
	return ns
}

// AddDurationToDate
func tnTAddDurationToDate(operation string, d *TnTemporalPlainDate, durationLike interface{}, options interface{}) *TnTemporalPlainDate {
	duration := tnTToDuration(durationLike)
	if operation == "subtract" {
		duration = duration.negated()
	}
	dateDuration := tnTToDateDurationRecordWithoutTime(duration)
	overflow := tnTOptOverflow(options)
	added := tnTCalendarDateAdd(d.date, dateDuration, overflow)
	return tnTNewPlainDate(added.y, added.m, added.d)
}

// AddDurationToDateTime
func tnTAddDurationToDateTime(operation string, dt *TnTemporalPlainDateTime, durationLike interface{}, options interface{}) *TnTemporalPlainDateTime {
	duration := tnTToDuration(durationLike)
	if operation == "subtract" {
		duration = duration.negated()
	}
	overflow := tnTOptOverflow(options)
	internal := tnTToInternalDurationRecordWith24HourDays(duration)
	minutes := internal.time.sec / 60
	seconds := internal.time.sec - minutes*60
	timeResult, deltaDays := tnTBalanceTime(dt.time.h, dt.time.mi+int(minutes), dt.time.s+int(seconds), dt.time.ms, dt.time.us, dt.time.ns+int(internal.time.sub))
	dateDuration := tnTAdjustDateDur(internal.date, internal.date.d+float64(deltaDays), nil, nil)
	tnTRejectDuration(dateDuration.y, dateDuration.mo, dateDuration.w, dateDuration.d, 0, 0, 0, 0, 0, 0)
	added := tnTCalendarDateAdd(dt.date, dateDuration, overflow)
	return tnTNewPlainDateTime(added.y, added.m, added.d, timeResult.h, timeResult.mi, timeResult.s, timeResult.ms, timeResult.us, timeResult.ns)
}

// AddDurationToTime
func tnTAddDurationToTime(operation string, t *TnTemporalPlainTime, durationLike interface{}) *TnTemporalPlainTime {
	duration := tnTToDuration(durationLike)
	if operation == "subtract" {
		duration = duration.negated()
	}
	internal := tnTToInternalDurationRecordWith24HourDays(duration)
	totalNs := int64(t.time.h)*3600000000000 + int64(t.time.mi)*60000000000 + int64(t.time.s)*1000000000 + int64(t.time.ms)*1000000 + int64(t.time.us)*1000 + int64(t.time.ns) + tnTTdurNs(internal.time).Int64()
	resultNs := modEuclid64(totalNs, 86400000000000)
	result, _ := tnTBalanceTime(int(resultNs/3600000000000), int((resultNs/60000000000)%60), int((resultNs/1000000000)%60), 0, 0, int(resultNs%1000000000))
	return tnTNewPlainTime(result.h, result.mi, result.s, result.ms, result.us, result.ns)
}

// AddDurationToYearMonth
func tnTAddDurationToYearMonth(operation string, ym *TnTemporalPlainYearMonth, durationLike interface{}, options interface{}) *TnTemporalPlainYearMonth {
	duration := tnTToDuration(durationLike)
	if operation == "subtract" {
		duration = duration.negated()
	}
	internal := tnTToInternalDurationRecord(duration)
	if internal.date.w != 0 || internal.date.d != 0 || internal.time.sec != 0 || internal.time.sub != 0 {
		panic(TnNodeError("RangeError", "", "Can only add years or months to PlainYearMonth."))
	}
	overflow := tnTOptOverflow(options)
	date := tnTDate{y: ym.date.y, m: ym.date.m, d: 1}
	added := tnTCalendarDateAdd(date, internal.date, overflow)
	return tnTNewYearMonth(added.y, added.m, 1)
}

// --- PlainDate

type TnTemporalPlainDate struct {
	date tnTDate
}

func tnTNewPlainDate(y int64, m, d int) *TnTemporalPlainDate {
	date := tnTDate{y: y, m: m, d: d}
	tnTRejectDate(&date)
	return &TnTemporalPlainDate{date: date}
}

// new Temporal.PlainDate(year, month, day)
func TnNewTemporalPlainDate(y float64, m float64, d float64) *TnTemporalPlainDate {
	return tnTNewPlainDate(int64(math.Trunc(y)), int(math.Trunc(m)), int(math.Trunc(d)))
}

func (pd *TnTemporalPlainDate) Get_calendarId() string { return "iso8601" }
func (pd *TnTemporalPlainDate) Get_era() interface{}   { return nil }
func (pd *TnTemporalPlainDate) Get_eraYear() interface{} {
	return nil
}
func (pd *TnTemporalPlainDate) Get_year() float64        { return float64(pd.date.y) }
func (pd *TnTemporalPlainDate) Get_month() float64       { return float64(pd.date.m) }
func (pd *TnTemporalPlainDate) Get_day() float64         { return float64(pd.date.d) }
func (pd *TnTemporalPlainDate) Get_monthCode() string    { return "M" + tnTPart(pd.date.m) }
func (pd *TnTemporalPlainDate) Get_daysInWeek() float64  { return 7 }
func (pd *TnTemporalPlainDate) Get_daysInMonth() float64 { return float64(tnTDaysInMonth(pd.date.y, pd.date.m)) }
func (pd *TnTemporalPlainDate) Get_daysInYear() float64  { return float64(tnTDaysInYear(pd.date.y)) }
func (pd *TnTemporalPlainDate) Get_monthsInYear() float64 {
	return 12
}
func (pd *TnTemporalPlainDate) Get_inLeapYear() bool { return tnTLeapYear(pd.date.y) }
func (pd *TnTemporalPlainDate) Get_dayOfWeek() float64 {
	return float64(tnTDayOfWeek(tnTDateToEpochDays(pd.date.y, pd.date.m, pd.date.d)))
}
func (pd *TnTemporalPlainDate) Get_dayOfYear() float64 {
	return float64(tnTDayOfYear(pd.date.y, pd.date.m, pd.date.d))
}
func (pd *TnTemporalPlainDate) Get_weekOfYear() interface{} {
	week, _ := tnTWeekOfYear(pd.date.y, pd.date.m, pd.date.d)
	return float64(week)
}
func (pd *TnTemporalPlainDate) Get_yearOfWeek() interface{} {
	_, year := tnTWeekOfYear(pd.date.y, pd.date.m, pd.date.d)
	return float64(year)
}

// ToTemporalDate: a PlainDate, PlainDateTime or ZonedDateTime, a string or a bag
func tnTToPlainDate(item interface{}, options interface{}) *TnTemporalPlainDate {
	overflow := tnTOptOverflow(options)
	switch v := item.(type) {
	case *TnTemporalPlainDate:
		return v
	case *TnTemporalPlainDateTime:
		return &TnTemporalPlainDate{date: v.date}
	case *TnTemporalZonedDateTime:
		dt := tnTGetISODateTimeFor(v.tz, tnTInstantNs(v.instant))
		return &TnTemporalPlainDate{date: dt.date}
	}
	if s, ok := item.(string); ok {
		parsed := tnTParseISODateTime(s)
		if parsed.utc || parsed.offset != "" {
			panic(TnNodeError("RangeError", "", "Z designator or UTC offset is not valid for date parsing"))
		}
		date := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
		tnTRejectDate(&date)
		return &TnTemporalPlainDate{date: date}
	}
	if TnIsNil(item) {
		panic(TnNodeError("TypeError", "", "invalid date"))
	}
	yearV := TnGet(item, "year")
	dayV := TnGet(item, "day")
	if TnIsNil(yearV) || TnIsNil(dayV) {
		panic(TnNodeError("TypeError", "", "Invalid PlainDate fields provided."))
	}
	year := math.Trunc(TnNumber(yearV))
	day := math.Trunc(TnNumber(dayV))
	month := float64(1)
	monthV := TnGet(item, "month")
	if !TnIsNil(monthV) {
		month = math.Trunc(TnNumber(monthV))
	} else if code := TnGet(item, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	date := tnTRegulateISODate(int64(year), int(month), int(day), overflow)
	return &TnTemporalPlainDate{date: date}
}

func tnTMonthFromCode(code string) float64 {
	if len(code) == 3 && code[0] == 'M' {
		if code[1] == '0' && code[2] >= '1' && code[2] <= '9' {
			return float64(code[2] - '0')
		}
		if code[1] == '1' && code[2] >= '0' && code[2] <= '2' {
			return float64(10 + int(code[2]-'0'))
		}
	}
	panic(TnNodeError("RangeError", "", "invalid monthCode: "+code))
}

// Temporal.PlainDate.from
func TnTemporalPlainDateFrom(item interface{}, options ...interface{}) *TnTemporalPlainDate {
	return tnTToPlainDate(item, tnTOptionsArg(options))
}

// Temporal.PlainDate.compare
func TnTemporalPlainDateCompare(one interface{}, two interface{}) float64 {
	a := tnTToPlainDate(one, nil)
	b := tnTToPlainDate(two, nil)
	return float64(tnTCompareDate(a.date, b.date))
}

func (pd *TnTemporalPlainDate) equals(other interface{}) bool {
	o := tnTToPlainDate(other, nil)
	return pd.date.y == o.date.y && pd.date.m == o.date.m && pd.date.d == o.date.d
}

func (pd *TnTemporalPlainDate) add(duration interface{}, options ...interface{}) *TnTemporalPlainDate {
	return tnTAddDurationToDate("add", pd, duration, tnTOptionsArg(options))
}

func (pd *TnTemporalPlainDate) subtract(duration interface{}, options ...interface{}) *TnTemporalPlainDate {
	return tnTAddDurationToDate("subtract", pd, duration, tnTOptionsArg(options))
}

func (pd *TnTemporalPlainDate) with(dateLike interface{}, options ...interface{}) *TnTemporalPlainDate {
	if TnIsNil(dateLike) {
		panic(TnNodeError("TypeError", "", "Must specify at least one calendar field."))
	}
	overflow := tnTOptOverflow(tnTOptionsArg(options))
	yearV := TnGet(dateLike, "year")
	monthV := TnGet(dateLike, "month")
	dayV := TnGet(dateLike, "day")
	monthCode := TnGet(dateLike, "monthCode")
	if TnIsNil(yearV) && TnIsNil(monthV) && TnIsNil(dayV) && TnIsNil(monthCode) {
		panic(TnNodeError("TypeError", "", "Must specify at least one calendar field."))
	}
	year := pd.date.y
	if !TnIsNil(yearV) {
		year = int64(math.Trunc(TnNumber(yearV)))
	}
	month := float64(pd.date.m)
	if !TnIsNil(monthV) {
		month = math.Trunc(TnNumber(monthV))
	} else if !TnIsNil(monthCode) {
		month = tnTMonthFromCode(TnJSString(monthCode))
	}
	day := float64(pd.date.d)
	if !TnIsNil(dayV) {
		day = math.Trunc(TnNumber(dayV))
	}
	date := tnTRegulateISODate(year, int(month), int(day), overflow)
	return &TnTemporalPlainDate{date: date}
}

func (pd *TnTemporalPlainDate) withCalendar(calendar interface{}) *TnTemporalPlainDate {
	id := tnTToCalendarId(calendar)
	if id != "iso8601" {
		panic(TnNodeError("RangeError", "", "unsupported calendar: "+id))
	}
	return pd
}

func tnTToCalendarId(calendar interface{}) string {
	if TnIsNil(calendar) {
		return "iso8601"
	}
	return strings.ToLower(TnJSString(calendar))
}

// until / since: the settings the difference options allow (date units only)
func tnTDateDifferenceSettings(operation string, options interface{}) (largestUnit string, inc int64, mode string, smallestUnit string) {
	largestUnitOpt := tnTOptUnit(options, "largestUnit", "date", true, nil)
	inc = tnTOptRoundingIncrement(options)
	mode = tnTOptRoundingMode(options, "trunc")
	smallestUnit = tnTOptUnit(options, "smallestUnit", "date", false, nil)
	if smallestUnit == "" {
		smallestUnit = tnTDay
	}
	largestUnit = largestUnitOpt
	if largestUnit == "" || largestUnit == "auto" {
		largestUnit = tnTLargerOfTwoUnits(tnTDay, smallestUnit)
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "smallestUnit was larger than largestunit in DifferenceeSettings"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if operation == "since" {
		mode = tnTNegateRoundingMode(mode)
	}
	return largestUnit, inc, mode, smallestUnit
}

func (pd *TnTemporalPlainDate) until(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTDateDifference("until", pd, other, tnTOptionsArg(options))
}

func (pd *TnTemporalPlainDate) since(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTDateDifference("since", pd, other, tnTOptionsArg(options))
}

func tnTDateDifference(operation string, pd *TnTemporalPlainDate, other interface{}, options interface{}) *TnTemporalDuration {
	o := tnTToPlainDate(other, nil)
	largestUnit, inc, mode, smallestUnit := tnTDateDifferenceSettings(operation, options)
	if tnTCompareDate(pd.date, o.date) == 0 {
		return &TnTemporalDuration{}
	}
	if smallestUnit == tnTDay && inc == 1 {
		diff := tnTCalendarDateUntilSigned(pd.date, o.date, largestUnit)
		result := tnTTemporalDurationFromInternal(tnTInternalDur{date: diff, time: tnTTimeDur{}}, tnTDay)
		if operation == "since" {
			result = result.negated()
		}
		return result
	}
	dt1 := tnTDateTime{date: pd.date, time: tnTMidnight()}
	dt2 := tnTDateTime{date: o.date, time: tnTMidnight()}
	originEpochNs := tnTUTCNsOfDateTime(dt1)
	destEpochNs := tnTUTCNsOfDateTime(dt2)
	diff := tnTDifferenceISODateTime(dt1, dt2, largestUnit)
	rounded := tnTRoundRelativeDuration(diff, originEpochNs, destEpochNs, dt1, nil, largestUnit, inc, smallestUnit, mode)
	result := tnTTemporalDurationFromInternal(rounded, tnTDay)
	if operation == "since" {
		result = result.negated()
	}
	return result
}

func (pd *TnTemporalPlainDate) toPlainYearMonth() *TnTemporalPlainYearMonth {
	return tnTNewYearMonth(pd.date.y, pd.date.m, pd.date.d)
}

func (pd *TnTemporalPlainDate) toPlainMonthDay() *TnTemporalPlainMonthDay {
	return tnTNewMonthDay(pd.date.m, pd.date.d, 1972)
}

func (pd *TnTemporalPlainDate) toPlainDateTime(time ...interface{}) *TnTemporalPlainDateTime {
	t := tnTMidnight()
	if len(time) > 0 && !TnIsNil(time[0]) {
		t = tnTToPlainTime(time[0]).time
	}
	return &TnTemporalPlainDateTime{date: pd.date, time: t}
}

func (pd *TnTemporalPlainDate) toZonedDateTime(arg interface{}) *TnTemporalZonedDateTime {
	tz := (*tnTemporalTZ)(nil)
	time := tnTMidnight()
	if TnIsNil(arg) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	if s, ok := arg.(string); ok {
		tz = TnTemporalTimeZoneOf(s)
	} else {
		tzV := TnGet(arg, "timeZone")
		if TnIsNil(tzV) {
			panic(TnNodeError("TypeError", "", "Must specify time zone."))
		}
		tz = tnTToTimeZone(tzV)
		if plainTime := TnGet(arg, "plainTime"); !TnIsNil(plainTime) {
			time = tnTToPlainTime(plainTime).time
		}
	}
	ns := tnTGetEpochNanosecondsFor(tz, tnTDateTime{date: pd.date, time: time}, "compatible")
	return tnTNewZoned(ns, tz)
}

func tnTToTimeZone(v interface{}) *tnTemporalTZ {
	if TnIsNil(v) {
		panic(TnNodeError("RangeError", "", "Invalid time zone"))
	}
	return TnTemporalTimeZoneOf(TnJSString(v))
}

func (pd *TnTemporalPlainDate) toString(options ...interface{}) string {
	show := "auto"
	if len(options) > 0 && !TnIsNil(options[0]) {
		show = tnTOptShowCalendar(options[0])
	}
	return tnTDateToString(pd.date) + tnTCalendarAnnotation(show)
}

func (pd *TnTemporalPlainDate) TnToString() string { return pd.toString() }
func (pd *TnTemporalPlainDate) String() string     { return pd.toString() }
func (pd *TnTemporalPlainDate) toJSON() string     { return pd.toString() }
func (pd *TnTemporalPlainDate) TnToJSON(string) interface{} {
	return pd.toString()
}
func (pd *TnTemporalPlainDate) toLocaleString(...interface{}) string { return pd.toString() }
func (pd *TnTemporalPlainDate) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.PlainDate {}"
}
func (pd *TnTemporalPlainDate) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.PlainDate.prototype.valueOf; use Temporal.PlainDate.prototype.compare for comparison."))
}

// --- PlainTime

type TnTemporalPlainTime struct {
	time tnTTime
}

func tnTNewPlainTime(h, mi, s, ms, us, ns int) *TnTemporalPlainTime {
	return &TnTemporalPlainTime{time: tnTTime{h: h, mi: mi, s: s, ms: ms, us: us, ns: ns}}
}

// new Temporal.PlainTime(hour?, minute?, second?, millisecond?, microsecond?, nanosecond?)
func TnNewTemporalPlainTime(fields ...interface{}) *TnTemporalPlainTime {
	read := func(i int) int {
		if i >= len(fields) || TnIsNil(fields[i]) {
			return 0
		}
		return int(math.Trunc(TnNumber(fields[i])))
	}
	t := read(0)
	mi := read(1)
	s := read(2)
	ms := read(3)
	us := read(4)
	ns := read(5)
	if t < 0 || t > 23 || mi < 0 || mi > 59 || s < 0 || s > 59 || ms < 0 || ms > 999 || us < 0 || us > 999 || ns < 0 || ns > 999 {
		panic(TnNodeError("RangeError", "", "Invalid time value."))
	}
	return tnTNewPlainTime(t, mi, s, ms, us, ns)
}

func (pt *TnTemporalPlainTime) Get_hour() float64        { return float64(pt.time.h) }
func (pt *TnTemporalPlainTime) Get_minute() float64      { return float64(pt.time.mi) }
func (pt *TnTemporalPlainTime) Get_second() float64      { return float64(pt.time.s) }
func (pt *TnTemporalPlainTime) Get_millisecond() float64 { return float64(pt.time.ms) }
func (pt *TnTemporalPlainTime) Get_microsecond() float64 { return float64(pt.time.us) }
func (pt *TnTemporalPlainTime) Get_nanosecond() float64  { return float64(pt.time.ns) }

// ToTemporalTime: a PlainTime, PlainDateTime or ZonedDateTime, a string or a bag
func tnTToPlainTime(item interface{}, options ...interface{}) *TnTemporalPlainTime {
	overflow := tnTOptOverflow(options)
	switch v := item.(type) {
	case *TnTemporalPlainTime:
		return v
	case *TnTemporalPlainDateTime:
		return &TnTemporalPlainTime{time: v.time}
	case *TnTemporalZonedDateTime:
		dt := tnTGetISODateTimeFor(v.tz, tnTInstantNs(v.instant))
		return &TnTemporalPlainTime{time: dt.time}
	}
	if s, ok := item.(string); ok {
		return tnTParseTimeString(s)
	}
	if TnIsNil(item) {
		panic(TnNodeError("TypeError", "", "invalid time"))
	}
	read := func(key string) (float64, bool) {
		v := TnGet(item, key)
		if TnIsNil(v) {
			return 0, false
		}
		return math.Trunc(TnNumber(v)), true
	}
	hour, ok := read("hour")
	if !ok {
		panic(TnNodeError("TypeError", "", "Invalid PlainTime fields provided."))
	}
	minute, _ := read("minute")
	second, _ := read("second")
	millisecond, _ := read("millisecond")
	microsecond, _ := read("microsecond")
	nanosecond, _ := read("nanosecond")
	t, _ := tnTBalanceTime(int(hour), int(minute), int(second), int(millisecond), int(microsecond), int(nanosecond))
	if overflow == "reject" && (t.h != int(hour) || t.mi != int(minute) || t.s != int(second) || t.ms != int(millisecond) || t.us != int(microsecond) || t.ns != int(nanosecond)) {
		panic(TnNodeError("RangeError", "", "Invalid time value."))
	}
	return &TnTemporalPlainTime{time: t}
}

// A time-only string: the T-prefixed form, a date-time string's time part,
// or a bare HH[:MM[:SS[.frac]]]
func tnTLooksLikeTimeOnly(s string) bool {
	if len(s) >= 3 && s[2] == ':' {
		return true
	}
	if strings.IndexByte(s, ':') >= 0 && strings.IndexByte(s, '-') < 0 {
		return true
	}
	if len(s) == 4 || len(s) == 6 {
		all := true
		for i := 0; i < len(s); i++ {
			if s[i] < '0' || s[i] > '9' {
				all = false
				break
			}
		}
		if all {
			return true
		}
	}
	return false
}

func tnTParseTimeString(s string) *TnTemporalPlainTime {
	c := &tnTStrCursor{s: s}
	hasDate := false
	if c.eatAny("Tt ") {
		// The rest is a time
	} else if tnTLooksLikeTimeOnly(s) {
		// HH[:MM[:SS[.frac]]] or basic HHMM / HHMMSS
		time := tnTParseTimeAfterSeparator(c, s)
		if !c.eof() {
			panic(TnNodeError("RangeError", "", "Unrecognized text after ISO string: "+s))
		}
		return &TnTemporalPlainTime{time: time}
	} else {
		// Possibly a date-time string
		parsed := tnTParseISODateTime(s)
		if parsed.hasTime {
			return &TnTemporalPlainTime{time: parsed.time}
		}
		hasDate = true
	}
	if hasDate {
		panic(TnNodeError("RangeError", "", "time is missing in string: "+s))
	}
	time := tnTParseTimeAfterSeparator(c, s)
	if !c.eof() {
		panic(TnNodeError("RangeError", "", "Unrecognized text after ISO string: "+s))
	}
	return &TnTemporalPlainTime{time: time}
}

func TnTemporalPlainTimeFrom(item interface{}, options ...interface{}) *TnTemporalPlainTime {
	return tnTToPlainTime(item, tnTOptionsArg(options))
}

func TnTemporalPlainTimeCompare(one interface{}, two interface{}) float64 {
	a := tnTToPlainTime(one, nil)
	b := tnTToPlainTime(two, nil)
	return float64(tnTCompareTime(a.time, b.time))
}

func (pt *TnTemporalPlainTime) equals(other interface{}) bool {
	o := tnTToPlainTime(other, nil)
	return pt.time.h == o.time.h && pt.time.mi == o.time.mi && pt.time.s == o.time.s && pt.time.ms == o.time.ms && pt.time.us == o.time.us && pt.time.ns == o.time.ns
}

func (pt *TnTemporalPlainTime) add(duration interface{}, options ...interface{}) *TnTemporalPlainTime {
	return tnTAddDurationToTime("add", pt, duration)
}

func (pt *TnTemporalPlainTime) subtract(duration interface{}, options ...interface{}) *TnTemporalPlainTime {
	return tnTAddDurationToTime("subtract", pt, duration)
}

func (pt *TnTemporalPlainTime) with(timeLike interface{}, options ...interface{}) *TnTemporalPlainTime {
	if TnIsNil(timeLike) {
		panic(TnNodeError("TypeError", "", "Must specify at least one time field."))
	}
	overflow := tnTOptOverflow(tnTOptionsArg(options))
	read := func(key string, current int, present *bool) int {
		v := TnGet(timeLike, key)
		if TnIsNil(v) {
			return current
		}
		*present = true
		return int(math.Trunc(TnNumber(v)))
	}
	var present bool
	h := read("hour", pt.time.h, &present)
	mi := read("minute", pt.time.mi, &present)
	s := read("second", pt.time.s, &present)
	ms := read("millisecond", pt.time.ms, &present)
	us := read("microsecond", pt.time.us, &present)
	ns := read("nanosecond", pt.time.ns, &present)
	if !present {
		panic(TnNodeError("TypeError", "", "Must specify at least one time field."))
	}
	if h < 0 || h > 23 || mi < 0 || mi > 59 || s < 0 || s > 59 || ms < 0 || ms > 999 || us < 0 || us > 999 || ns < 0 || ns > 999 {
		if overflow == "constrain" {
			if h < 0 {
				h = 0
			}
			if h > 23 {
				h = 23
			}
			if mi < 0 {
				mi = 0
			}
			if mi > 59 {
				mi = 59
			}
			if s < 0 {
				s = 0
			}
			if s > 59 {
				s = 59
			}
			if ms < 0 {
				ms = 0
			}
			if ms > 999 {
				ms = 999
			}
			if us < 0 {
				us = 0
			}
			if us > 999 {
				us = 999
			}
			if ns < 0 {
				ns = 0
			}
			if ns > 999 {
				ns = 999
			}
		} else {
			panic(TnNodeError("RangeError", "", "Invalid time value."))
		}
	}
	return tnTNewPlainTime(h, mi, s, ms, us, ns)
}

// until / since: time units only
func tnTTimeDifferenceSettings(operation string, options interface{}) (largestUnit string, inc int64, mode string, smallestUnit string) {
	largestUnitOpt := tnTOptUnit(options, "largestUnit", "time", true, nil)
	inc = tnTOptRoundingIncrement(options)
	mode = tnTOptRoundingMode(options, "trunc")
	smallestUnit = tnTOptUnit(options, "smallestUnit", "time", false, nil)
	if smallestUnit == "" {
		smallestUnit = tnTNanosecond
	}
	largestUnit = largestUnitOpt
	if largestUnit == "" || largestUnit == "auto" {
		largestUnit = tnTLargerOfTwoUnits(tnTHour, smallestUnit)
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "smallestUnit was larger than largestunit in DifferenceeSettings"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if operation == "since" {
		mode = tnTNegateRoundingMode(mode)
	}
	return largestUnit, inc, mode, smallestUnit
}

func (pt *TnTemporalPlainTime) until(other interface{}, options ...interface{}) *TnTemporalDuration {
	o := tnTToPlainTime(other, nil)
	largestUnit, inc, mode, smallestUnit := tnTTimeDifferenceSettings("until", tnTOptionsArg(options))
	diff := tnTDifferenceTime(pt.time, o.time)
	if !(smallestUnit == tnTNanosecond && inc == 1) {
		rounded := tnTRoundTimeDuration(diff, inc, smallestUnit, mode)
		diff = rounded
	}
	result := tnTTemporalDurationFromInternal(tnTInternalDur{date: tnTZeroDateDur(), time: diff}, largestUnit)
	return result
}

func (pt *TnTemporalPlainTime) since(other interface{}, options ...interface{}) *TnTemporalDuration {
	o := tnTToPlainTime(other, nil)
	largestUnit, inc, mode, smallestUnit := tnTTimeDifferenceSettings("since", tnTOptionsArg(options))
	diff := tnTDifferenceTime(pt.time, o.time)
	if !(smallestUnit == tnTNanosecond && inc == 1) {
		rounded := tnTRoundTimeDuration(diff, inc, smallestUnit, mode)
		diff = rounded
	}
	result := tnTTemporalDurationFromInternal(tnTInternalDur{date: tnTZeroDateDur(), time: diff}, largestUnit)
	return result.negated()
}

// round({smallestUnit, roundingIncrement, roundingMode})
func (pt *TnTemporalPlainTime) round(roundTo interface{}) *TnTemporalPlainTime {
	if TnIsNil(roundTo) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	if s, ok := roundTo.(string); ok {
		roundTo = map[string]interface{}{"smallestUnit": s}
	}
	inc := tnTOptRoundingIncrement(roundTo)
	mode := tnTOptRoundingMode(roundTo, "halfExpand")
	smallestUnit := tnTOptUnit(roundTo, "smallestUnit", "time", false, []string{tnTDay})
	tnTValidateTimeRoundUnit(smallestUnit, inc)
	quantity := int64(pt.time.h)*3600000000000 + int64(pt.time.mi)*60000000000 + int64(pt.time.s)*1000000000 +
		int64(pt.time.ms)*1000000 + int64(pt.time.us)*1000 + int64(pt.time.ns)
	unitNs := tnTUnitNs(smallestUnit)
	roundedNs := int64(tnTRoundNumberToIncrement(float64(quantity), unitNs*inc, mode))
	result, _ := tnTBalanceTime(int(roundedNs/3600000000000), int(roundedNs/60000000000)%60, int(roundedNs/1000000000)%60, 0, 0, int(roundedNs%1000000000))
	return &TnTemporalPlainTime{time: result}
}

// Time-unit rounding increment validation ({24, 60, 60, 1000}, exclusive)
func tnTValidateTimeRoundUnit(unit string, inc int64) {
	if unit == tnTDay {
		panic(TnNodeError("RangeError", "", "day is not allowed as a time unit here"))
	}
	if max := tnTMaxDurationRoundingIncrement(unit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
}

func (pt *TnTemporalPlainTime) toString(options ...interface{}) string {
	precision := "auto"
	smallestUnit := ""
	mode := ""
	if len(options) > 0 && !TnIsNil(options[0]) {
		precision = tnTOptFractionalDigits(options[0])
		smallestUnit = tnTOptUnit(options[0], "smallestUnit", "time", false, []string{tnTHour, tnTDay})
		mode = tnTOptRoundingMode(options[0], "trunc")
	}
	prec, roundUnit, roundInc := tnTStringPrecision(smallestUnit, precision)
	t := pt.time
	if roundUnit != tnTNanosecond || roundInc != 1 {
		quantity := int64(t.h)*3600000000000 + int64(t.mi)*60000000000 + int64(t.s)*1000000000 +
			int64(t.ms)*1000000 + int64(t.us)*1000 + int64(t.ns)
		rounded := int64(tnTRoundNumberToIncrement(float64(quantity), tnTUnitNs(roundUnit)*roundInc, mode))
		t, _ = tnTBalanceTime(int(rounded/3600000000000), int(rounded/60000000000)%60, int(rounded/1000000000)%60, 0, 0, int(rounded%1000000000))
	}
	return tnTTimeString(t, prec)
}

func (pt *TnTemporalPlainTime) TnToString() string { return pt.toString() }
func (pt *TnTemporalPlainTime) String() string     { return pt.toString() }
func (pt *TnTemporalPlainTime) toJSON() string     { return pt.toString() }
func (pt *TnTemporalPlainTime) TnToJSON(string) interface{} {
	return pt.toString()
}
func (pt *TnTemporalPlainTime) toLocaleString(...interface{}) string { return pt.toString() }
func (pt *TnTemporalPlainTime) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.PlainTime {}"
}
func (pt *TnTemporalPlainTime) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.PlainTime.prototype.valueOf; use Temporal.PlainTime.prototype.compare for comparison."))
}

// --- PlainDateTime

type TnTemporalPlainDateTime struct {
	date tnTDate
	time tnTTime
}

func tnTNewPlainDateTime(y int64, mo, d, h, mi, s, ms, us, ns int) *TnTemporalPlainDateTime {
	date := tnTDate{y: y, m: mo, d: d}
	tnTRejectDate(&date)
	return &TnTemporalPlainDateTime{date: date, time: tnTTime{h: h, mi: mi, s: s, ms: ms, us: us, ns: ns}}
}

// new Temporal.PlainDateTime(year, month, day, hour?, minute?, second?, millisecond?, microsecond?, nanosecond?)
func TnNewTemporalPlainDateTime(fields ...interface{}) *TnTemporalPlainDateTime {
	read := func(i int) int {
		if i >= len(fields) || TnIsNil(fields[i]) {
			return 0
		}
		return int(math.Trunc(TnNumber(fields[i])))
	}
	y := int64(read(0))
	mo := read(1)
	d := read(2)
	if mo < 1 || mo > 12 {
		panic(TnNodeError("RangeError", "", "Month out of range."))
	}
	date := tnTDate{y: y, m: mo, d: d}
	if d < 1 || d > tnTDaysInMonth(y, mo) {
		panic(TnNodeError("RangeError", "", "day value is not in a valid range."))
	}
	tnTRejectDate(&date)
	return &TnTemporalPlainDateTime{date: date, time: tnTTime{h: read(3), mi: read(4), s: read(5), ms: read(6), us: read(7), ns: read(8)}}
}

func (dt *TnTemporalPlainDateTime) Get_calendarId() string { return "iso8601" }
func (dt *TnTemporalPlainDateTime) Get_era() interface{}   { return nil }
func (dt *TnTemporalPlainDateTime) Get_eraYear() interface{} {
	return nil
}
func (dt *TnTemporalPlainDateTime) Get_year() float64        { return float64(dt.date.y) }
func (dt *TnTemporalPlainDateTime) Get_month() float64       { return float64(dt.date.m) }
func (dt *TnTemporalPlainDateTime) Get_day() float64         { return float64(dt.date.d) }
func (dt *TnTemporalPlainDateTime) Get_monthCode() string    { return "M" + tnTPart(dt.date.m) }
func (dt *TnTemporalPlainDateTime) Get_daysInWeek() float64  { return 7 }
func (dt *TnTemporalPlainDateTime) Get_daysInMonth() float64 { return float64(tnTDaysInMonth(dt.date.y, dt.date.m)) }
func (dt *TnTemporalPlainDateTime) Get_daysInYear() float64  { return float64(tnTDaysInYear(dt.date.y)) }
func (dt *TnTemporalPlainDateTime) Get_monthsInYear() float64 {
	return 12
}
func (dt *TnTemporalPlainDateTime) Get_inLeapYear() bool { return tnTLeapYear(dt.date.y) }
func (dt *TnTemporalPlainDateTime) Get_hour() float64    { return float64(dt.time.h) }
func (dt *TnTemporalPlainDateTime) Get_minute() float64  { return float64(dt.time.mi) }
func (dt *TnTemporalPlainDateTime) Get_second() float64  { return float64(dt.time.s) }
func (dt *TnTemporalPlainDateTime) Get_millisecond() float64 {
	return float64(dt.time.ms)
}
func (dt *TnTemporalPlainDateTime) Get_microsecond() float64 { return float64(dt.time.us) }
func (dt *TnTemporalPlainDateTime) Get_nanosecond() float64  { return float64(dt.time.ns) }
func (dt *TnTemporalPlainDateTime) Get_dayOfWeek() float64 {
	return float64(tnTDayOfWeek(tnTDateToEpochDays(dt.date.y, dt.date.m, dt.date.d)))
}
func (dt *TnTemporalPlainDateTime) Get_dayOfYear() float64 {
	return float64(tnTDayOfYear(dt.date.y, dt.date.m, dt.date.d))
}
func (dt *TnTemporalPlainDateTime) Get_weekOfYear() interface{} {
	week, _ := tnTWeekOfYear(dt.date.y, dt.date.m, dt.date.d)
	return float64(week)
}
func (dt *TnTemporalPlainDateTime) Get_yearOfWeek() interface{} {
	_, year := tnTWeekOfYear(dt.date.y, dt.date.m, dt.date.d)
	return float64(year)
}

// ToTemporalDateTime
func tnTToPlainDateTime(item interface{}, options interface{}) *TnTemporalPlainDateTime {
	overflow := tnTOptOverflow(options)
	switch v := item.(type) {
	case *TnTemporalPlainDateTime:
		return v
	case *TnTemporalPlainDate:
		return &TnTemporalPlainDateTime{date: v.date, time: tnTMidnight()}
	case *TnTemporalZonedDateTime:
		z := tnTGetISODateTimeFor(v.tz, tnTInstantNs(v.instant))
		return &TnTemporalPlainDateTime{date: z.date, time: z.time}
	}
	if s, ok := item.(string); ok {
		parsed := tnTParseISODateTime(s)
		if parsed.utc {
			panic(TnNodeError("RangeError", "", "UTC designator is not valid for DateTime parsing."))
		}
		date := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
		tnTRejectDate(&date)
		time := tnTMidnight()
		if parsed.hasTime {
			time = parsed.time
		}
		return &TnTemporalPlainDateTime{date: date, time: time}
	}
	if TnIsNil(item) {
		panic(TnNodeError("TypeError", "", "invalid date time"))
	}
	yearV := TnGet(item, "year")
	dayV := TnGet(item, "day")
	if TnIsNil(yearV) || TnIsNil(dayV) {
		panic(TnNodeError("TypeError", "", "Invalid DateTime fields provided."))
	}
	year := math.Trunc(TnNumber(yearV))
	day := math.Trunc(TnNumber(dayV))
	month := float64(1)
	monthV := TnGet(item, "month")
	if !TnIsNil(monthV) {
		month = math.Trunc(TnNumber(monthV))
	} else if code := TnGet(item, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	readTime := func(key string) float64 {
		v := TnGet(item, key)
		if TnIsNil(v) {
			return 0
		}
		return math.Trunc(TnNumber(v))
	}
	hour := readTime("hour")
	minute := readTime("minute")
	second := readTime("second")
	millisecond := readTime("millisecond")
	microsecond := readTime("microsecond")
	nanosecond := readTime("nanosecond")
	date := tnTRegulateISODate(int64(year), int(month), int(day), overflow)
	if overflow == "reject" {
		if hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59 ||
			millisecond < 0 || millisecond > 999 || microsecond < 0 || microsecond > 999 || nanosecond < 0 || nanosecond > 999 {
			panic(TnNodeError("RangeError", "", "Invalid time value."))
		}
	}
	t, _ := tnTBalanceTime(int(hour), int(minute), int(second), int(millisecond), int(microsecond), int(nanosecond))
	return &TnTemporalPlainDateTime{date: date, time: t}
}

func TnTemporalPlainDateTimeFrom(item interface{}, options ...interface{}) *TnTemporalPlainDateTime {
	return tnTToPlainDateTime(item, tnTOptionsArg(options))
}

func TnTemporalPlainDateTimeCompare(one interface{}, two interface{}) float64 {
	a := tnTToPlainDateTime(one, nil)
	b := tnTToPlainDateTime(two, nil)
	return float64(tnTCompareDateTime(a.iso(), b.iso()))
}

func (dt *TnTemporalPlainDateTime) iso() tnTDateTime {
	return tnTDateTime{date: dt.date, time: dt.time}
}

func (dt *TnTemporalPlainDateTime) equals(other interface{}) bool {
	o := tnTToPlainDateTime(other, nil)
	return tnTCompareDateTime(dt.iso(), o.iso()) == 0
}

func (dt *TnTemporalPlainDateTime) add(duration interface{}, options ...interface{}) *TnTemporalPlainDateTime {
	return tnTAddDurationToDateTime("add", dt, duration, tnTOptionsArg(options))
}

func (dt *TnTemporalPlainDateTime) subtract(duration interface{}, options ...interface{}) *TnTemporalPlainDateTime {
	return tnTAddDurationToDateTime("subtract", dt, duration, tnTOptionsArg(options))
}

func (dt *TnTemporalPlainDateTime) with(dateTimeLike interface{}, options ...interface{}) *TnTemporalPlainDateTime {
	if TnIsNil(dateTimeLike) {
		panic(TnNodeError("TypeError", "", "Must specify at least one field."))
	}
	overflow := tnTOptOverflow(tnTOptionsArg(options))
	year := dt.date.y
	if v := TnGet(dateTimeLike, "year"); !TnIsNil(v) {
		year = int64(math.Trunc(TnNumber(v)))
	}
	month := float64(dt.date.m)
	if v := TnGet(dateTimeLike, "month"); !TnIsNil(v) {
		month = math.Trunc(TnNumber(v))
	} else if code := TnGet(dateTimeLike, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	day := float64(dt.date.d)
	if v := TnGet(dateTimeLike, "day"); !TnIsNil(v) {
		day = math.Trunc(TnNumber(v))
	}
	readTime := func(key string, current int) int {
		v := TnGet(dateTimeLike, key)
		if TnIsNil(v) {
			return current
		}
		return int(math.Trunc(TnNumber(v)))
	}
	hour := readTime("hour", dt.time.h)
	minute := readTime("minute", dt.time.mi)
	second := readTime("second", dt.time.s)
	millisecond := readTime("millisecond", dt.time.ms)
	microsecond := readTime("microsecond", dt.time.us)
	nanosecond := readTime("nanosecond", dt.time.ns)
	date := tnTRegulateISODate(year, int(month), int(day), overflow)
	t, _ := tnTBalanceTime(hour, minute, second, millisecond, microsecond, nanosecond)
	if overflow == "reject" && (t.h != hour || t.mi != minute || t.s != second || t.ms != millisecond || t.us != microsecond || t.ns != nanosecond) {
		panic(TnNodeError("RangeError", "", "Invalid time value."))
	}
	return &TnTemporalPlainDateTime{date: date, time: t}
}

func (dt *TnTemporalPlainDateTime) withCalendar(calendar interface{}) *TnTemporalPlainDateTime {
	if id := tnTToCalendarId(calendar); id != "iso8601" {
		panic(TnNodeError("RangeError", "", "unsupported calendar: "+id))
	}
	return dt
}

func (dt *TnTemporalPlainDateTime) withPlainTime(time ...interface{}) *TnTemporalPlainDateTime {
	t := tnTMidnight()
	if len(time) > 0 && !TnIsNil(time[0]) {
		t = tnTToPlainTime(time[0]).time
	}
	return &TnTemporalPlainDateTime{date: dt.date, time: t}
}

// datetime difference settings: date and time units
func tnTDatetimeDifferenceSettings(operation string, options interface{}) (largestUnit string, inc int64, mode string, smallestUnit string) {
	largestUnitOpt := tnTOptUnit(options, "largestUnit", "datetime", true, nil)
	inc = tnTOptRoundingIncrement(options)
	mode = tnTOptRoundingMode(options, "trunc")
	smallestUnit = tnTOptUnit(options, "smallestUnit", "datetime", false, nil)
	if smallestUnit == "" {
		smallestUnit = tnTNanosecond
	}
	largestUnit = largestUnitOpt
	if largestUnit == "" || largestUnit == "auto" {
		largestUnit = tnTLargerOfTwoUnits(tnTDay, smallestUnit)
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "smallestUnit was larger than largestunit in DifferenceeSettings"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if operation == "since" {
		mode = tnTNegateRoundingMode(mode)
	}
	return largestUnit, inc, mode, smallestUnit
}

func (dt *TnTemporalPlainDateTime) until(other interface{}, options ...interface{}) *TnTemporalDuration {
	o := tnTToPlainDateTime(other, nil)
	largestUnit, inc, mode, smallestUnit := tnTDatetimeDifferenceSettings("until", tnTOptionsArg(options))
	result := tnTTemporalDurationFromInternal(tnTDifferencePlainDateTimeWithRounding(dt.iso(), o.iso(), largestUnit, inc, smallestUnit, mode), largestUnit)
	return result
}

func (dt *TnTemporalPlainDateTime) since(other interface{}, options ...interface{}) *TnTemporalDuration {
	o := tnTToPlainDateTime(other, nil)
	largestUnit, inc, mode, smallestUnit := tnTDatetimeDifferenceSettings("since", tnTOptionsArg(options))
	result := tnTTemporalDurationFromInternal(tnTDifferencePlainDateTimeWithRounding(dt.iso(), o.iso(), largestUnit, inc, smallestUnit, mode), largestUnit)
	return result.negated()
}

// round: day or time units (day increments must be 1)
func (dt *TnTemporalPlainDateTime) round(roundTo interface{}) *TnTemporalPlainDateTime {
	if TnIsNil(roundTo) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	if s, ok := roundTo.(string); ok {
		roundTo = map[string]interface{}{"smallestUnit": s}
	}
	inc := tnTOptRoundingIncrement(roundTo)
	mode := tnTOptRoundingMode(roundTo, "halfExpand")
	smallestUnit := tnTOptUnit(roundTo, "smallestUnit", "datetime", false, []string{tnTYear, tnTMonth, tnTWeek})
	if smallestUnit == tnTDay && inc != 1 {
		panic(TnNodeError("RangeError", "", "roundingIncrement exceeds maximum"))
	}
	if tnTIsTimeUnit(smallestUnit) {
		tnTValidateTimeRoundUnit(smallestUnit, inc)
	}
	// Round the time of day; day units round to midnight
	quantity := int64(dt.time.h)*3600000000000 + int64(dt.time.mi)*60000000000 + int64(dt.time.s)*1000000000 +
		int64(dt.time.ms)*1000000 + int64(dt.time.us)*1000 + int64(dt.time.ns)
	unitNs := tnTUnitNs(smallestUnit)
	roundedNs := int64(tnTRoundNumberToIncrement(float64(quantity), unitNs*inc, mode))
	result, deltaDays := tnTBalanceTime(int(roundedNs/3600000000000), int(roundedNs/60000000000)%60, int(roundedNs/1000000000)%60, 0, 0, int(roundedNs%1000000000))
	date := tnTAddDays(dt.date, int64(deltaDays))
	return &TnTemporalPlainDateTime{date: date, time: result}
}

func (dt *TnTemporalPlainDateTime) toPlainDate() *TnTemporalPlainDate {
	return &TnTemporalPlainDate{date: dt.date}
}

func (dt *TnTemporalPlainDateTime) toPlainTime() *TnTemporalPlainTime {
	return &TnTemporalPlainTime{time: dt.time}
}

func (dt *TnTemporalPlainDateTime) toZonedDateTime(tzArg interface{}, options ...interface{}) *TnTemporalZonedDateTime {
	disambiguation := tnTOptDisambiguation(tnTOptionsArg(options))
	var tz *tnTemporalTZ
	if s, ok := tzArg.(string); ok {
		tz = TnTemporalTimeZoneOf(s)
	} else {
		tz = tnTToTimeZone(tzArg)
	}
	ns := tnTGetEpochNanosecondsFor(tz, dt.iso(), disambiguation)
	return tnTNewZoned(ns, tz)
}

func (dt *TnTemporalPlainDateTime) toString(options ...interface{}) string {
	precision := "auto"
	smallestUnit := ""
	mode := ""
	show := "auto"
	if len(options) > 0 && !TnIsNil(options[0]) {
		precision = tnTOptFractionalDigits(options[0])
		smallestUnit = tnTOptUnit(options[0], "smallestUnit", "datetime", false, []string{tnTHour, tnTYear, tnTMonth, tnTWeek})
		mode = tnTOptRoundingMode(options[0], "trunc")
		show = tnTOptShowCalendar(options[0])
	}
	value := *dt
	if smallestUnit != "" || precision != "auto" {
		rounded := value.round(map[string]interface{}{"smallestUnit": smallestOrPrecisionUnit(smallestUnit, precision), "roundingMode": mode})
		value = *rounded
		if smallestUnit == tnTDay {
			precision = "minute"
		}
	}
	out := tnTDateTimeString(value.iso(), precision)
	if smallestUnit == tnTMinute {
		out = tnTDateToString(value.date) + "T" + tnTPart(value.time.h) + ":" + tnTPart(value.time.mi)
	}
	return out + tnTCalendarAnnotation(show)
}

func smallestOrPrecisionUnit(smallestUnit string, precision string) interface{} {
	if smallestUnit != "" {
		return smallestUnit
	}
	switch precision {
	case "0":
		return tnTSecond
	case "1", "2", "3":
		return tnTMillisecond
	case "4", "5", "6":
		return tnTMicrosecond
	}
	return tnTNanosecond
}

func (dt *TnTemporalPlainDateTime) TnToString() string { return dt.toString() }
func (dt *TnTemporalPlainDateTime) String() string     { return dt.toString() }
func (dt *TnTemporalPlainDateTime) toJSON() string     { return dt.toString() }
func (dt *TnTemporalPlainDateTime) TnToJSON(string) interface{} {
	return dt.toString()
}
func (dt *TnTemporalPlainDateTime) toLocaleString(...interface{}) string { return dt.toString() }
func (dt *TnTemporalPlainDateTime) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.PlainDateTime {}"
}
func (dt *TnTemporalPlainDateTime) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.PlainDateTime.prototype.valueOf; use Temporal.PlainDateTime.prototype.compare for comparison."))
}

// --- PlainYearMonth

type TnTemporalPlainYearMonth struct {
	date tnTDate // the ISO reference date: the year and month, with a reference day
}

func tnTNewYearMonth(y int64, m, refDay int) *TnTemporalPlainYearMonth {
	date := tnTDate{y: y, m: m, d: refDay}
	tnTRejectDate(&date)
	return &TnTemporalPlainYearMonth{date: date}
}

// new Temporal.PlainYearMonth(year, month, calendar?, referenceISODay?)
func TnNewTemporalPlainYearMonth(y float64, m float64, calendar ...interface{}) *TnTemporalPlainYearMonth {
	refDay := 1
	if len(calendar) > 1 && !TnIsNil(calendar[1]) {
		refDay = int(math.Trunc(TnNumber(calendar[1])))
	}
	return tnTNewYearMonth(int64(math.Trunc(y)), int(math.Trunc(m)), refDay)
}

func (ym *TnTemporalPlainYearMonth) Get_calendarId() string { return "iso8601" }
func (ym *TnTemporalPlainYearMonth) Get_era() interface{}   { return nil }
func (ym *TnTemporalPlainYearMonth) Get_eraYear() interface{} {
	return nil
}
func (ym *TnTemporalPlainYearMonth) Get_year() float64     { return float64(ym.date.y) }
func (ym *TnTemporalPlainYearMonth) Get_month() float64    { return float64(ym.date.m) }
func (ym *TnTemporalPlainYearMonth) Get_monthCode() string { return "M" + tnTPart(ym.date.m) }
func (ym *TnTemporalPlainYearMonth) Get_daysInMonth() float64 {
	return float64(tnTDaysInMonth(ym.date.y, ym.date.m))
}
func (ym *TnTemporalPlainYearMonth) Get_daysInYear() float64 { return float64(tnTDaysInYear(ym.date.y)) }
func (ym *TnTemporalPlainYearMonth) Get_monthsInYear() float64 {
	return 12
}
func (ym *TnTemporalPlainYearMonth) Get_inLeapYear() bool { return tnTLeapYear(ym.date.y) }

// ToTemporalYearMonth: a string or a bag (year and month required)
func tnTToYearMonth(item interface{}, options interface{}) *TnTemporalPlainYearMonth {
	switch v := item.(type) {
	case *TnTemporalPlainYearMonth:
		return v
	}
	if s, ok := item.(string); ok {
		parsed := tnTParseISODateTime(s)
		date := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
		tnTRejectDate(&date)
		return &TnTemporalPlainYearMonth{date: date}
	}
	if TnIsNil(item) {
		panic(TnNodeError("TypeError", "", "invalid year month"))
	}
	yearV := TnGet(item, "year")
	monthV := TnGet(item, "month")
	if TnIsNil(monthV) {
		if codeV := TnGet(item, "monthCode"); !TnIsNil(codeV) {
			monthV = tnTMonthFromCode(TnJSString(codeV))
		}
	}
	if TnIsNil(yearV) || TnIsNil(monthV) {
		panic(TnNodeError("TypeError", "", "Invalid YearMonth fields provided."))
	}
	year := math.Trunc(TnNumber(yearV))
	month := math.Trunc(TnNumber(monthV))
	refDay := float64(1)
	if dayV := TnGet(item, "day"); !TnIsNil(dayV) {
		refDay = math.Trunc(TnNumber(dayV))
	}
	date := tnTConstrainISODate(int64(year), int(month), int(refDay))
	tnTRejectDate(&date)
	return &TnTemporalPlainYearMonth{date: date}
}

func TnTemporalPlainYearMonthFrom(item interface{}, options ...interface{}) *TnTemporalPlainYearMonth {
	return tnTToYearMonth(item, tnTOptionsArg(options))
}

func TnTemporalPlainYearMonthCompare(one interface{}, two interface{}) float64 {
	a := tnTToYearMonth(one, nil)
	b := tnTToYearMonth(two, nil)
	if a.date.y != b.date.y {
		return float64(tnTCmpI64(a.date.y, b.date.y))
	}
	return float64(tnTCmpInt(a.date.m, b.date.m))
}

func (ym *TnTemporalPlainYearMonth) equals(other interface{}) bool {
	o := tnTToYearMonth(other, nil)
	return ym.date.y == o.date.y && ym.date.m == o.date.m
}

func (ym *TnTemporalPlainYearMonth) add(duration interface{}, options ...interface{}) *TnTemporalPlainYearMonth {
	return tnTAddDurationToYearMonth("add", ym, duration, tnTOptionsArg(options))
}

func (ym *TnTemporalPlainYearMonth) subtract(duration interface{}, options ...interface{}) *TnTemporalPlainYearMonth {
	return tnTAddDurationToYearMonth("subtract", ym, duration, tnTOptionsArg(options))
}

func (ym *TnTemporalPlainYearMonth) with(ymLike interface{}, options ...interface{}) *TnTemporalPlainYearMonth {
	if TnIsNil(ymLike) {
		panic(TnNodeError("TypeError", "", "Must specify at least one field."))
	}
	overflow := tnTOptOverflow(tnTOptionsArg(options))
	year := ym.date.y
	if v := TnGet(ymLike, "year"); !TnIsNil(v) {
		year = int64(math.Trunc(TnNumber(v)))
	}
	month := float64(ym.date.m)
	if v := TnGet(ymLike, "month"); !TnIsNil(v) {
		month = math.Trunc(TnNumber(v))
	} else if code := TnGet(ymLike, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	refDay := float64(ym.date.d)
	if v := TnGet(ymLike, "day"); !TnIsNil(v) {
		refDay = math.Trunc(TnNumber(v))
	}
	date := tnTConstrainISODate(year, int(month), int(refDay))
	if overflow == "reject" && (date.y != year || date.m != int(month) || date.d != int(refDay)) {
		panic(TnNodeError("RangeError", "", "not a valid ISO date."))
	}
	return &TnTemporalPlainYearMonth{date: date}
}

// until / since: year and month units only
func tnTYMDifference(operation string, ym *TnTemporalPlainYearMonth, other interface{}, options interface{}) *TnTemporalDuration {
	o := tnTToYearMonth(other, nil)
	largestUnitOpt := tnTOptUnit(options, "largestUnit", "date", true, []string{tnTWeek, tnTDay})
	inc := tnTOptRoundingIncrement(options)
	mode := tnTOptRoundingMode(options, "trunc")
	smallestUnit := tnTOptUnit(options, "smallestUnit", "date", false, []string{tnTWeek, tnTDay})
	if smallestUnit == "" {
		smallestUnit = tnTMonth
	}
	largestUnit := largestUnitOpt
	if largestUnit == "" || largestUnit == "auto" {
		largestUnit = tnTLargerOfTwoUnits(tnTYear, smallestUnit)
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "smallestUnit was larger than largestunit in DifferenceeSettings"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if operation == "since" {
		mode = tnTNegateRoundingMode(mode)
	}
	thisDate := tnTDate{y: ym.date.y, m: ym.date.m, d: 1}
	otherDate := tnTDate{y: o.date.y, m: o.date.m, d: 1}
	if tnTCompareDate(thisDate, otherDate) == 0 {
		return &TnTemporalDuration{}
	}
	diff := tnTCalendarDateUntilSigned(thisDate, otherDate, largestUnit)
	internal := tnTInternalDur{date: diff, time: tnTTimeDur{}}
	if !(smallestUnit == tnTMonth && inc == 1) {
		origin := tnTUTCNs(thisDate, tnTMidnight())
		dest := tnTUTCNs(otherDate, tnTMidnight())
		internal = tnTRoundRelativeDuration(internal, origin, dest, tnTDateTime{date: thisDate, time: tnTMidnight()}, nil, largestUnit, inc, smallestUnit, mode)
	}
	result := tnTTemporalDurationFromInternal(internal, tnTDay)
	if operation == "since" {
		result = result.negated()
	}
	return result
}

func (ym *TnTemporalPlainYearMonth) until(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTYMDifference("until", ym, other, tnTOptionsArg(options))
}

func (ym *TnTemporalPlainYearMonth) since(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTYMDifference("since", ym, other, tnTOptionsArg(options))
}

func (ym *TnTemporalPlainYearMonth) toPlainDate(arg interface{}) *TnTemporalPlainDate {
	if TnIsNil(arg) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	dayV := TnGet(arg, "day")
	if TnIsNil(dayV) {
		panic(TnNodeError("TypeError", "", "day is required"))
	}
	day := int(math.Trunc(TnNumber(dayV)))
	date := tnTRegulateISODate(ym.date.y, ym.date.m, day, "constrain")
	return &TnTemporalPlainDate{date: date}
}

func (ym *TnTemporalPlainYearMonth) toString(options ...interface{}) string {
	show := "auto"
	if len(options) > 0 && !TnIsNil(options[0]) {
		show = tnTOptShowCalendar(options[0])
	}
	out := tnTISOYearString(ym.date.y) + "-" + tnTPart(ym.date.m)
	if show == "always" || show == "critical" {
		out += "-" + tnTPart(ym.date.d)
	}
	return out + tnTCalendarAnnotation(show)
}

func (ym *TnTemporalPlainYearMonth) TnToString() string { return ym.toString() }
func (ym *TnTemporalPlainYearMonth) String() string     { return ym.toString() }
func (ym *TnTemporalPlainYearMonth) toJSON() string     { return ym.toString() }
func (ym *TnTemporalPlainYearMonth) TnToJSON(string) interface{} {
	return ym.toString()
}
func (ym *TnTemporalPlainYearMonth) toLocaleString(...interface{}) string { return ym.toString() }
func (ym *TnTemporalPlainYearMonth) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.PlainYearMonth {}"
}
func (ym *TnTemporalPlainYearMonth) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.PlainYearMonth.prototype.valueOf; use Temporal.PlainYearMonth.prototype.compare for comparison."))
}

// --- PlainMonthDay

type TnTemporalPlainMonthDay struct {
	date tnTDate // the month and day, with the reference year 1972
}

func tnTNewMonthDay(m, d, refYear int) *TnTemporalPlainMonthDay {
	date := tnTDate{y: int64(refYear), m: m, d: d}
	tnTRejectDate(&date)
	return &TnTemporalPlainMonthDay{date: date}
}

// new Temporal.PlainMonthDay(month, day, calendar?, referenceISOYear?)
func TnNewTemporalPlainMonthDay(m float64, d float64, calendar ...interface{}) *TnTemporalPlainMonthDay {
	refYear := 1972
	if len(calendar) > 1 && !TnIsNil(calendar[1]) {
		refYear = int(math.Trunc(TnNumber(calendar[1])))
	}
	return tnTNewMonthDay(int(math.Trunc(m)), int(math.Trunc(d)), refYear)
}

func (md *TnTemporalPlainMonthDay) Get_calendarId() string { return "iso8601" }
func (md *TnTemporalPlainMonthDay) Get_monthCode() string  { return "M" + tnTPart(md.date.m) }
func (md *TnTemporalPlainMonthDay) Get_day() float64       { return float64(md.date.d) }

// ToTemporalMonthDay: a string (MM-DD or a full date) or a bag (day required,
// month or monthCode)
func tnTToMonthDay(item interface{}, options interface{}) *TnTemporalPlainMonthDay {
	switch v := item.(type) {
	case *TnTemporalPlainMonthDay:
		return v
	}
	if s, ok := item.(string); ok {
		ref := s
		if strings.HasPrefix(ref, "--") {
			ref = ref[2:]
		}
		if idx := strings.IndexByte(ref, '['); idx >= 0 {
			// (annotations are validated by the full parser below)
			if !strings.Contains(ref[idx:], "u-ca=iso8601") && !strings.Contains(ref[idx:], "u-ca=ISO8601") {
				panic(TnNodeError("RangeError", "", "unsupported calendar in "+s))
			}
			ref = ref[:idx]
		}
		var date tnTDate
		if len(ref) == 8 || (len(ref) >= 10 && ref[4] == '-') {
			parsed := tnTParseISODateTime(ref)
			date = tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
		} else if len(ref) == 5 && ref[2] == '-' {
			date = tnTDate{y: 1972, m: int(tnTCursorInt(ref[:2])), d: int(tnTCursorInt(ref[3:]))}
		} else if len(ref) == 4 {
			date = tnTDate{y: 1972, m: int(tnTCursorInt(ref[:2])), d: int(tnTCursorInt(ref[2:]))}
		} else {
			panic(TnNodeError("RangeError", "", s+" invalid for MM-DD format"))
		}
		if !tnTIsValidISODate(1972, date.m, date.d) {
			panic(TnNodeError("RangeError", "", s+" invalid for MM-DD format"))
		}
		return &TnTemporalPlainMonthDay{date: tnTDate{y: 1972, m: date.m, d: date.d}}
	}
	if TnIsNil(item) {
		panic(TnNodeError("TypeError", "", "invalid month day"))
	}
	overflow := tnTOptOverflow(options)
	dayV := TnGet(item, "day")
	if TnIsNil(dayV) {
		panic(TnNodeError("TypeError", "", "Invalid MonthDay fields provided."))
	}
	day := math.Trunc(TnNumber(dayV))
	month := float64(0)
	monthV := TnGet(item, "month")
	if !TnIsNil(monthV) {
		month = math.Trunc(TnNumber(monthV))
	} else if code := TnGet(item, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	if month == 0 {
		panic(TnNodeError("TypeError", "", "Invalid MonthDay fields provided."))
	}
	refYear := float64(1972)
	if yearV := TnGet(item, "year"); !TnIsNil(yearV) {
		refYear = math.Trunc(TnNumber(yearV))
	}
	date := tnTRegulateISODate(int64(refYear), int(month), int(day), overflow)
	return &TnTemporalPlainMonthDay{date: tnTDate{y: int64(refYear), m: date.m, d: date.d}}
}

func TnTemporalPlainMonthDayFrom(item interface{}, options ...interface{}) *TnTemporalPlainMonthDay {
	return tnTToMonthDay(item, tnTOptionsArg(options))
}

func (md *TnTemporalPlainMonthDay) equals(other interface{}) bool {
	o := tnTToMonthDay(other, nil)
	return md.date.m == o.date.m && md.date.d == o.date.d
}

func (md *TnTemporalPlainMonthDay) with(mdLike interface{}, options ...interface{}) *TnTemporalPlainMonthDay {
	if TnIsNil(mdLike) {
		panic(TnNodeError("TypeError", "", "Must specify at least one field."))
	}
	overflow := tnTOptOverflow(tnTOptionsArg(options))
	month := float64(md.date.m)
	if v := TnGet(mdLike, "month"); !TnIsNil(v) {
		month = math.Trunc(TnNumber(v))
	} else if code := TnGet(mdLike, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	day := float64(md.date.d)
	if v := TnGet(mdLike, "day"); !TnIsNil(v) {
		day = math.Trunc(TnNumber(v))
	}
	if month == 0 {
		panic(TnNodeError("TypeError", "", "Invalid MonthDay fields provided."))
	}
	date := tnTRegulateISODate(md.date.y, int(month), int(day), overflow)
	return &TnTemporalPlainMonthDay{date: date}
}

func (md *TnTemporalPlainMonthDay) toPlainDate(arg interface{}) *TnTemporalPlainDate {
	if TnIsNil(arg) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	yearV := TnGet(arg, "year")
	if TnIsNil(yearV) {
		panic(TnNodeError("TypeError", "", "year is required"))
	}
	year := int64(math.Trunc(TnNumber(yearV)))
	date := tnTRegulateISODate(year, md.date.m, md.date.d, "constrain")
	return &TnTemporalPlainDate{date: date}
}

func (md *TnTemporalPlainMonthDay) toString(options ...interface{}) string {
	show := "auto"
	if len(options) > 0 && !TnIsNil(options[0]) {
		show = tnTOptShowCalendar(options[0])
	}
	out := tnTPart(md.date.m) + "-" + tnTPart(md.date.d)
	if show == "always" || show == "critical" {
		out = tnTISOYearString(md.date.y) + "-" + out
	}
	return out + tnTCalendarAnnotation(show)
}

func (md *TnTemporalPlainMonthDay) TnToString() string { return md.toString() }
func (md *TnTemporalPlainMonthDay) String() string     { return md.toString() }
func (md *TnTemporalPlainMonthDay) toJSON() string     { return md.toString() }
func (md *TnTemporalPlainMonthDay) TnToJSON(string) interface{} {
	return md.toString()
}
func (md *TnTemporalPlainMonthDay) toLocaleString(...interface{}) string { return md.toString() }
func (md *TnTemporalPlainMonthDay) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.PlainMonthDay {}"
}
func (md *TnTemporalPlainMonthDay) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.PlainMonthDay.prototype.valueOf; use Temporal.PlainMonthDay.prototype.equals for comparison."))
}

// --- Instant

// new Temporal.Instant(epochNanoseconds)
func TnNewTemporalInstant(ns interface{}) *TnTemporalInstant {
	big, ok := ns.(*tnbig.Int)
	if !ok {
		panic(TnNodeError("TypeError", "", "Argument 0 must be a BigInt"))
	}
	tnTValidateInstantNs(big)
	return tnTInstantOfNs(big)
}

// ToTemporalInstant: an Instant or a string
func tnTToInstant(item interface{}) *TnTemporalInstant {
	switch v := item.(type) {
	case *TnTemporalInstant:
		return v
	case string:
		parsed := tnTParseISODateTime(v)
		if !parsed.utc && parsed.offset == "" {
			panic(TnNodeError("RangeError", "", "Temporal.Instant requires a time zone offset"))
		}
		date := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
		if parsed.utc {
			ns := tnTUTCNs(date, parsed.time)
			tnTValidateInstantNs(ns)
			return tnTInstantOfNs(ns)
		}
		offsetNs := tnTParseUTCOffset(parsed.offset)
		balanced := tnTBalanceDateTime(date.y, date.m, date.d, parsed.time.h, parsed.time.mi, parsed.time.s, parsed.time.ms, parsed.time.us, parsed.time.ns-int(offsetNs))
		ns := tnTUTCNs(balanced.date, balanced.time)
		tnTValidateInstantNs(ns)
		return tnTInstantOfNs(ns)
	}
	panic(TnNodeError("RangeError", "", "Invalid time zone or date time: not a string or Instant"))
}

func TnTemporalInstantFrom(item interface{}) *TnTemporalInstant {
	return tnTToInstant(item)
}

func TnTemporalInstantFromEpochMilliseconds(ms interface{}) *TnTemporalInstant {
	n := math.Trunc(TnNumber(ms))
	if math.IsInf(n, 0) || math.IsNaN(n) || n != TnNumber(ms) {
		panic(TnNodeError("RangeError", "", "Expected finite integer."))
	}
	ns := tnbig.NewInt(int64(n))
	ns.Mul(ns, tnbig.NewInt(1000000))
	tnTValidateInstantNs(ns)
	return tnTInstantOfNs(ns)
}

func TnTemporalInstantFromEpochNanoseconds(ns interface{}) *TnTemporalInstant {
	return TnNewTemporalInstant(ns)
}

func TnTemporalInstantCompare(one interface{}, two interface{}) float64 {
	a := tnTToInstant(one)
	b := tnTToInstant(two)
	return float64(tnTInstantNs(a).Cmp(tnTInstantNs(b)))
}

func (i *TnTemporalInstant) equals(other interface{}) bool {
	o := tnTToInstant(other)
	return tnTInstantNs(i).Cmp(tnTInstantNs(o)) == 0
}

func tnTInstantAdd(operation string, i *TnTemporalInstant, durationLike interface{}) *TnTemporalInstant {
	duration := tnTToDuration(durationLike)
	if operation == "subtract" {
		duration = duration.negated()
	}
	largestUnit := tnTDefaultLargestUnit(duration)
	if tnTIsCalendarUnit(largestUnit) {
		panic(TnNodeError("RangeError", "", "Largest unit cannot be a date unit"))
	}
	internal := tnTToInternalDurationRecordWith24HourDays(duration)
	ns := new(tnbig.Int).Add(tnTInstantNs(i), tnTTdurNs(internal.time))
	tnTValidateInstantNs(ns)
	return tnTInstantOfNs(ns)
}

func (i *TnTemporalInstant) add(duration interface{}) *TnTemporalInstant {
	return tnTInstantAdd("add", i, duration)
}

func (i *TnTemporalInstant) subtract(duration interface{}) *TnTemporalInstant {
	return tnTInstantAdd("subtract", i, duration)
}

func (i *TnTemporalInstant) until(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTInstantDifference("until", i, other, tnTOptionsArg(options))
}

func (i *TnTemporalInstant) since(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTInstantDifference("since", i, other, tnTOptionsArg(options))
}

func tnTInstantDifference(operation string, i *TnTemporalInstant, other interface{}, options interface{}) *TnTemporalDuration {
	o := tnTToInstant(other)
	largestUnitOpt := tnTOptUnit(options, "largestUnit", "time", true, nil)
	inc := tnTOptRoundingIncrement(options)
	mode := tnTOptRoundingMode(options, "trunc")
	smallestUnit := tnTOptUnit(options, "smallestUnit", "time", false, []string{tnTDay})
	if smallestUnit == "" {
		smallestUnit = tnTNanosecond
	}
	largestUnit := largestUnitOpt
	if largestUnit == "" || largestUnit == "auto" {
		largestUnit = tnTLargerOfTwoUnits(tnTSecond, smallestUnit)
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "smallestUnit was larger than largestunit in DifferenceeSettings"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if operation == "since" {
		mode = tnTNegateRoundingMode(mode)
	}
	diff := tnTDifferenceEpochNs(tnTInstantNs(i), tnTInstantNs(o), inc, smallestUnit, mode)
	result := tnTTemporalDurationFromInternal(diff, largestUnit)
	if operation == "since" {
		result = result.negated()
	}
	return result
}

// Instant.round: time units, increments dividing the day
func (i *TnTemporalInstant) round(roundTo interface{}) *TnTemporalInstant {
	if TnIsNil(roundTo) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	if s, ok := roundTo.(string); ok {
		roundTo = map[string]interface{}{"smallestUnit": s}
	}
	inc := tnTOptRoundingIncrement(roundTo)
	mode := tnTOptRoundingMode(roundTo, "halfExpand")
	smallestUnit := tnTOptUnit(roundTo, "smallestUnit", "time", false, []string{tnTDay})
	maximums := map[string]int64{tnTHour: 24, tnTMinute: 1440, tnTSecond: 86400, tnTMillisecond: 86400000, tnTMicrosecond: 86400000000, tnTNanosecond: 86400000000000}
	tnTValidateRoundingIncrement(inc, maximums[smallestUnit], true)
	ns := tnTRoundInstantNs(tnTInstantNs(i), tnTUnitNs(smallestUnit)*inc, mode)
	return tnTInstantOfNs(ns)
}

func (i *TnTemporalInstant) toZonedDateTimeISO(tzArg interface{}) *TnTemporalZonedDateTime {
	tz := tnTToTimeZone(tzArg)
	return tnTNewZoned(tnTInstantNs(i), tz)
}

func (i *TnTemporalInstant) toString(options ...interface{}) string {
	precision := "auto"
	smallestUnit := ""
	mode := ""
	tz := (*tnTemporalTZ)(nil)
	if len(options) > 0 && !TnIsNil(options[0]) {
		precision = tnTOptFractionalDigits(options[0])
		smallestUnit = tnTOptUnit(options[0], "smallestUnit", "time", false, []string{tnTHour, tnTDay})
		mode = tnTOptRoundingMode(options[0], "trunc")
		if tzV := tnTOptGet(options[0], "timeZone"); !TnIsNil(tzV) {
			tz = tnTToTimeZone(tzV)
		}
	}
	ns := tnTInstantNs(i)
	if smallestUnit != "" || precision != "auto" {
		roundUnit, roundInc := tnTNanosecond, int64(1)
		if smallestUnit != "" {
			roundUnit, roundInc = smallestUnit, 1
		} else {
			roundUnit, roundInc = tnTStringPrecisionUnit(precision)
		}
		ns = tnTRoundInstantNs(ns, tnTUnitNs(roundUnit)*roundInc, mode)
	}
	value := tnTInstantOfNs(ns)
	var dt tnTDateTime
	suffix := "Z"
	if tz != nil {
		dt = tnTGetISODateTimeFor(tz, ns)
		off := tz.offsetSecAt(value.sec, value.nsec)
		suffix = tnTFormatOffsetFull(off * 1000000000)
	} else {
		local := value.sec
		days := floorDiv64(local, 86400)
		rest := local - days*86400
		y, m, d := tnTEpochDaysToYearDay(days)
		t, _ := tnTBalanceTime(int(rest/3600), int((rest/60)%60), int(rest%60), 0, 0, int(value.nsec))
		dt = tnTDateTime{date: tnTDate{y: y, m: m, d: d}, time: t}
	}
	return tnTDateTimeString(dt, precision) + suffix
}

func (i *TnTemporalInstant) TnToString() string { return i.toString() }
func (i *TnTemporalInstant) String() string     { return i.toString() }
func (i *TnTemporalInstant) toJSON() string     { return i.toString() }
func (i *TnTemporalInstant) TnToJSON(string) interface{} {
	return i.toString()
}
func (i *TnTemporalInstant) toLocaleString(...interface{}) string { return i.toString() }
func (i *TnTemporalInstant) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.Instant {}"
}
func (i *TnTemporalInstant) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.Instant.prototype.valueOf; use Temporal.Instant.prototype.compare for comparison."))
}

// --- ZonedDateTime

type TnTemporalZonedDateTime struct {
	instant *TnTemporalInstant
	tz      *tnTemporalTZ
}

func tnTNewZoned(ns *tnbig.Int, tz *tnTemporalTZ) *TnTemporalZonedDateTime {
	return &TnTemporalZonedDateTime{instant: tnTInstantOfNs(ns), tz: tz}
}

// new Temporal.ZonedDateTime(epochNanoseconds, timeZone)
func TnNewTemporalZonedDateTime(ns interface{}, tzArg interface{}) *TnTemporalZonedDateTime {
	big, ok := ns.(*tnbig.Int)
	if !ok {
		panic(TnNodeError("TypeError", "", "Argument 0 must be a BigInt"))
	}
	tnTValidateInstantNs(big)
	return tnTNewZoned(big, TnTemporalTimeZoneOf(TnJSString(tzArg)))
}

// ToTemporalZonedDateTime: a ZonedDateTime or an RFC 9557 string with a
// bracketed zone
func tnTToZonedDateTime(item interface{}, options interface{}) *TnTemporalZonedDateTime {
	disambiguation := tnTOptDisambiguation(options)
	offsetOpt := tnTOptOffsetOpt(options, "reject")
	switch v := item.(type) {
	case *TnTemporalZonedDateTime:
		return v
	}
	s, ok := item.(string)
	if !ok {
		if TnIsNil(item) {
			panic(TnNodeError("TypeError", "", "invalid zoned date time"))
		}
		// A property bag: date-time fields plus a timeZone
		tzV := TnGet(item, "timeZone")
		if TnIsNil(tzV) {
			panic(TnNodeError("TypeError", "", "Must specify time zone."))
		}
		tz := tnTToTimeZone(tzV)
		dt := tnTToPlainDateTime(item, options).iso()
		ns := tnTGetEpochNanosecondsFor(tz, dt, disambiguation)
		return tnTNewZoned(ns, tz)
	}
	parsed := tnTParseISODateTime(s)
	if parsed.tzID == "" {
		panic(TnNodeError("RangeError", "", "Time zone annotation is required for parsing a zoned date time."))
	}
	tz := TnTemporalTimeZoneOf(parsed.tzID)
	date := tnTDate{y: parsed.y, m: parsed.mo, d: parsed.d}
	time := parsed.time
	matchMinute := true
	var offsetNs int64
	if parsed.utc {
		// Z: the offset is exact
		ns := tnTUTCNs(date, time)
		tnTValidateInstantNs(ns)
		return tnTNewZoned(ns, tz)
	}
	if parsed.offset != "" {
		offsetNs = tnTParseUTCOffset(parsed.offset)
	} else {
		offsetNs = 0
		matchMinute = false
	}
	ns := tnTInterpretISODateTimeOffset(date, time, parsed.offset != "", offsetNs, tz, disambiguation, offsetOpt, matchMinute)
	return tnTNewZoned(ns, tz)
}

func TnTemporalZonedDateTimeFrom(item interface{}, options ...interface{}) *TnTemporalZonedDateTime {
	return tnTToZonedDateTime(item, tnTOptionsArg(options))
}

func TnTemporalZonedDateTimeCompare(one interface{}, two interface{}) float64 {
	a := tnTToZonedDateTime(one, nil)
	b := tnTToZonedDateTime(two, nil)
	return float64(tnTInstantNs(a.instant).Cmp(tnTInstantNs(b.instant)))
}

func (z *TnTemporalZonedDateTime) iso() tnTDateTime { return tnTGetISODateTimeFor(z.tz, tnTInstantNs(z.instant)) }

func (z *TnTemporalZonedDateTime) Get_calendarId() string { return "iso8601" }
func (z *TnTemporalZonedDateTime) Get_timeZoneId() string { return z.tz.String() }
func (z *TnTemporalZonedDateTime) Get_era() interface{}   { return nil }
func (z *TnTemporalZonedDateTime) Get_eraYear() interface{} {
	return nil
}
func (z *TnTemporalZonedDateTime) Get_epochMilliseconds() float64 {
	return z.instant.Get_epochMilliseconds()
}
func (z *TnTemporalZonedDateTime) Get_epochNanoseconds() *tnbig.Int {
	return tnTInstantNs(z.instant)
}
func (z *TnTemporalZonedDateTime) Get_offset() string {
	off := z.tz.offsetSecAt(z.instant.sec, z.instant.nsec)
	return tnTFormatOffsetFull(off * 1000000000)
}
func (z *TnTemporalZonedDateTime) Get_offsetNanoseconds() float64 {
	return float64(z.tz.offsetSecAt(z.instant.sec, z.instant.nsec)) * 1e9
}

func (z *TnTemporalZonedDateTime) dateFields() tnTDate    { return z.iso().date }
func (z *TnTemporalZonedDateTime) timeFields() tnTTime    { return z.iso().time }
func (z *TnTemporalZonedDateTime) Get_year() float64      { return float64(z.dateFields().y) }
func (z *TnTemporalZonedDateTime) Get_month() float64     { return float64(z.dateFields().m) }
func (z *TnTemporalZonedDateTime) Get_day() float64       { return float64(z.dateFields().d) }
func (z *TnTemporalZonedDateTime) Get_monthCode() string  { return "M" + tnTPart(z.dateFields().m) }
func (z *TnTemporalZonedDateTime) Get_hour() float64      { return float64(z.timeFields().h) }
func (z *TnTemporalZonedDateTime) Get_minute() float64    { return float64(z.timeFields().mi) }
func (z *TnTemporalZonedDateTime) Get_second() float64    { return float64(z.timeFields().s) }
func (z *TnTemporalZonedDateTime) Get_millisecond() float64 {
	return float64(z.timeFields().ms)
}
func (z *TnTemporalZonedDateTime) Get_microsecond() float64 { return float64(z.timeFields().us) }
func (z *TnTemporalZonedDateTime) Get_nanosecond() float64  { return float64(z.timeFields().ns) }
func (z *TnTemporalZonedDateTime) Get_dayOfWeek() float64 {
	d := z.dateFields()
	return float64(tnTDayOfWeek(tnTDateToEpochDays(d.y, d.m, d.d)))
}
func (z *TnTemporalZonedDateTime) Get_dayOfYear() float64 {
	d := z.dateFields()
	return float64(tnTDayOfYear(d.y, d.m, d.d))
}
func (z *TnTemporalZonedDateTime) Get_weekOfYear() interface{} {
	d := z.dateFields()
	week, _ := tnTWeekOfYear(d.y, d.m, d.d)
	return float64(week)
}
func (z *TnTemporalZonedDateTime) Get_yearOfWeek() interface{} {
	d := z.dateFields()
	_, year := tnTWeekOfYear(d.y, d.m, d.d)
	return float64(year)
}
func (z *TnTemporalZonedDateTime) Get_daysInWeek() float64  { return 7 }
func (z *TnTemporalZonedDateTime) Get_daysInMonth() float64 { return float64(tnTDaysInMonth(z.dateFields().y, z.dateFields().m)) }
func (z *TnTemporalZonedDateTime) Get_daysInYear() float64  { return float64(tnTDaysInYear(z.dateFields().y)) }
func (z *TnTemporalZonedDateTime) Get_monthsInYear() float64 {
	return 12
}
func (z *TnTemporalZonedDateTime) Get_inLeapYear() bool { return tnTLeapYear(z.dateFields().y) }

// hoursInDay: the local day's length, across DST shifts
func (z *TnTemporalZonedDateTime) Get_hoursInDay() float64 {
	d := z.dateFields()
	start := tnTStartOfDay(z.tz, d)
	next := tnTStartOfDay(z.tz, tnTAddDays(d, 1))
	return tnTTotalTimeDuration(tnTTdurOfNs(new(tnbig.Int).Sub(next, start)), tnTHour)
}

func (z *TnTemporalZonedDateTime) getTimeZoneTransition(direction interface{}) interface{} {
	dir := ""
	if s, ok := direction.(string); ok {
		dir = s
	} else {
		dir = tnTOptString(direction, "direction")
	}
	var next bool
	switch dir {
	case "next":
		next = true
	case "previous":
		next = false
	default:
		panic(TnNodeError("RangeError", "", "Value "+dir+" out of range for Temporal.ZonedDateTime.prototype.getTimeZoneTransition options property direction"))
	}
	transition := z.tz.zoneTransition(z.instant, next)
	if transition == nil {
		return nil
	}
	return tnTNewZoned(tnTInstantNs(transition), z.tz)
}

func (z *TnTemporalZonedDateTime) startOfDay() *TnTemporalZonedDateTime {
	return tnTNewZoned(tnTStartOfDay(z.tz, z.dateFields()), z.tz)
}

func (z *TnTemporalZonedDateTime) toInstant() *TnTemporalInstant {
	return &TnTemporalInstant{sec: z.instant.sec, nsec: z.instant.nsec}
}

func (z *TnTemporalZonedDateTime) toPlainDate() *TnTemporalPlainDate {
	return &TnTemporalPlainDate{date: z.dateFields()}
}

func (z *TnTemporalZonedDateTime) toPlainTime() *TnTemporalPlainTime {
	return &TnTemporalPlainTime{time: z.timeFields()}
}

func (z *TnTemporalZonedDateTime) toPlainDateTime() *TnTemporalPlainDateTime {
	return &TnTemporalPlainDateTime{date: z.dateFields(), time: z.timeFields()}
}

func (z *TnTemporalZonedDateTime) withTimeZone(tzArg interface{}) *TnTemporalZonedDateTime {
	tz := tnTToTimeZone(tzArg)
	return tnTNewZoned(tnTInstantNs(z.instant), tz)
}

func (z *TnTemporalZonedDateTime) withCalendar(calendar interface{}) *TnTemporalZonedDateTime {
	if id := tnTToCalendarId(calendar); id != "iso8601" {
		panic(TnNodeError("RangeError", "", "unsupported calendar: "+id))
	}
	return z
}

func (z *TnTemporalZonedDateTime) add(duration interface{}, options ...interface{}) *TnTemporalZonedDateTime {
	return tnTAddDurationToZoned("add", z, duration, tnTOptionsArg(options))
}

func (z *TnTemporalZonedDateTime) subtract(duration interface{}, options ...interface{}) *TnTemporalZonedDateTime {
	return tnTAddDurationToZoned("subtract", z, duration, tnTOptionsArg(options))
}

func tnTAddDurationToZoned(operation string, z *TnTemporalZonedDateTime, durationLike interface{}, options interface{}) *TnTemporalZonedDateTime {
	duration := tnTToDuration(durationLike)
	if operation == "subtract" {
		duration = duration.negated()
	}
	overflow := tnTOptOverflow(options)
	internal := tnTToInternalDurationRecord(duration)
	ns := tnTAddZonedDateTime(tnTInstantNs(z.instant), z.tz, internal, overflow)
	return tnTNewZoned(ns, z.tz)
}

func (z *TnTemporalZonedDateTime) with(zonedLike interface{}, options ...interface{}) *TnTemporalZonedDateTime {
	if TnIsNil(zonedLike) {
		panic(TnNodeError("TypeError", "", "Must specify at least one field."))
	}
	disambiguation := tnTOptDisambiguation(tnTOptionsArg(options))
	overflow := tnTOptOverflow(tnTOptionsArg(options))
	offsetOpt := tnTOptOffsetOpt(tnTOptionsArg(options), "prefer")
	dt := z.iso()
	year := dt.date.y
	if v := TnGet(zonedLike, "year"); !TnIsNil(v) {
		year = int64(math.Trunc(TnNumber(v)))
	}
	month := float64(dt.date.m)
	if v := TnGet(zonedLike, "month"); !TnIsNil(v) {
		month = math.Trunc(TnNumber(v))
	} else if code := TnGet(zonedLike, "monthCode"); !TnIsNil(code) {
		month = tnTMonthFromCode(TnJSString(code))
	}
	day := float64(dt.date.d)
	if v := TnGet(zonedLike, "day"); !TnIsNil(v) {
		day = math.Trunc(TnNumber(v))
	}
	readTime := func(key string, current int) int {
		v := TnGet(zonedLike, key)
		if TnIsNil(v) {
			return current
		}
		return int(math.Trunc(TnNumber(v)))
	}
	hour := readTime("hour", dt.time.h)
	minute := readTime("minute", dt.time.mi)
	second := readTime("second", dt.time.s)
	millisecond := readTime("millisecond", dt.time.ms)
	microsecond := readTime("microsecond", dt.time.us)
	nanosecond := readTime("nanosecond", dt.time.ns)
	date := tnTRegulateISODate(year, int(month), int(day), overflow)
	time, _ := tnTBalanceTime(hour, minute, second, millisecond, microsecond, nanosecond)
	var ns *tnbig.Int
	if v := TnGet(zonedLike, "offset"); !TnIsNil(v) {
		ns = tnTInterpretISODateTimeOffset(date, time, true, tnTParseUTCOffset(TnJSString(v)), z.tz, disambiguation, offsetOpt, true)
	} else {
		ns = tnTGetEpochNanosecondsFor(z.tz, tnTDateTime{date: date, time: time}, disambiguation)
	}
	return tnTNewZoned(ns, z.tz)
}

func (z *TnTemporalZonedDateTime) withPlainTime(time ...interface{}) *TnTemporalZonedDateTime {
	t := tnTMidnight()
	if len(time) > 0 && !TnIsNil(time[0]) {
		t = tnTToPlainTime(time[0]).time
	}
	ns := tnTGetEpochNanosecondsFor(z.tz, tnTDateTime{date: z.dateFields(), time: t}, "compatible")
	return tnTNewZoned(ns, z.tz)
}

// zoned difference settings: date and time units; same-zone check is the
// caller's
func (z *TnTemporalZonedDateTime) until(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTZonedDifference("until", z, other, tnTOptionsArg(options))
}

func (z *TnTemporalZonedDateTime) since(other interface{}, options ...interface{}) *TnTemporalDuration {
	return tnTZonedDifference("since", z, other, tnTOptionsArg(options))
}

func tnTZonedDifference(operation string, z *TnTemporalZonedDateTime, other interface{}, options interface{}) *TnTemporalDuration {
	o := tnTToZonedDateTime(other, nil)
	if o.tz.String() != z.tz.String() {
		panic(TnNodeError("RangeError", "", "When calculating difference between time zones, largestUnit must be 'hours' or smaller because day lengths can vary between time zones due to DST or time zone offset changes."))
	}
	largestUnitOpt := tnTOptUnit(options, "largestUnit", "datetime", true, nil)
	inc := tnTOptRoundingIncrement(options)
	mode := tnTOptRoundingMode(options, "trunc")
	smallestUnit := tnTOptUnit(options, "smallestUnit", "datetime", false, nil)
	if smallestUnit == "" {
		smallestUnit = tnTNanosecond
	}
	largestUnit := largestUnitOpt
	if largestUnit == "" || largestUnit == "auto" {
		largestUnit = tnTLargerOfTwoUnits(tnTHour, smallestUnit)
	}
	if tnTLargerOfTwoUnits(largestUnit, smallestUnit) != largestUnit {
		panic(TnNodeError("RangeError", "", "smallestUnit was larger than largestunit in DifferenceeSettings"))
	}
	if max := tnTMaxDurationRoundingIncrement(smallestUnit); max != 0 {
		tnTValidateRoundingIncrement(inc, max, false)
	}
	if operation == "since" {
		mode = tnTNegateRoundingMode(mode)
	}
	ns1 := tnTInstantNs(z.instant)
	ns2 := tnTInstantNs(o.instant)
	var result *TnTemporalDuration
	if tnTIsTimeUnit(largestUnit) {
		diff := tnTDifferenceEpochNs(ns1, ns2, inc, smallestUnit, mode)
		result = tnTTemporalDurationFromInternal(diff, largestUnit)
	} else {
		if tnTCompareBig(ns1, ns2) == 0 {
			return &TnTemporalDuration{}
		}
		diff := tnTDifferenceZonedDateTimeWithRounding(ns1, ns2, z.tz, largestUnit, inc, smallestUnit, mode)
		result = tnTTemporalDurationFromInternal(diff, tnTHour)
	}
	if operation == "since" {
		result = result.negated()
	}
	return result
}

func tnTCompareBig(a, b *tnbig.Int) int { return a.Cmp(b) }

// round: day or time units (day increments 1); day rounding works on the
// local day, time units on the local time of day
func (z *TnTemporalZonedDateTime) round(roundTo interface{}) *TnTemporalZonedDateTime {
	if TnIsNil(roundTo) {
		panic(TnNodeError("TypeError", "", "options parameter is required"))
	}
	if s, ok := roundTo.(string); ok {
		roundTo = map[string]interface{}{"smallestUnit": s}
	}
	inc := tnTOptRoundingIncrement(roundTo)
	mode := tnTOptRoundingMode(roundTo, "halfExpand")
	smallestUnit := tnTOptUnit(roundTo, "smallestUnit", "datetime", false, []string{tnTYear, tnTMonth, tnTWeek})
	if smallestUnit == tnTDay && inc != 1 {
		panic(TnNodeError("RangeError", "", "roundingIncrement exceeds maximum"))
	}
	if tnTIsTimeUnit(smallestUnit) {
		tnTValidateTimeRoundUnit(smallestUnit, inc)
	}
	dt := z.iso()
	if smallestUnit == tnTDay {
		// Round the local time of day to midnight, then re-disambiguate
		quantity := int64(dt.time.h)*3600000000000 + int64(dt.time.mi)*60000000000 + int64(dt.time.s)*1000000000 +
			int64(dt.time.ms)*1000000 + int64(dt.time.us)*1000 + int64(dt.time.ns)
		roundedNs := int64(tnTRoundNumberToIncrement(float64(quantity), 86400000000000, mode))
		result, deltaDays := tnTBalanceTime(int(roundedNs/3600000000000), int(roundedNs/60000000000)%60, int(roundedNs/1000000000)%60, 0, 0, int(roundedNs%1000000000))
		date := tnTAddDays(dt.date, int64(deltaDays))
		ns := tnTGetEpochNanosecondsFor(z.tz, tnTDateTime{date: date, time: result}, "compatible")
		return tnTNewZoned(ns, z.tz)
	}
	quantity := int64(dt.time.h)*3600000000000 + int64(dt.time.mi)*60000000000 + int64(dt.time.s)*1000000000 +
		int64(dt.time.ms)*1000000 + int64(dt.time.us)*1000 + int64(dt.time.ns)
	roundedNs := int64(tnTRoundNumberToIncrement(float64(quantity), tnTUnitNs(smallestUnit)*inc, mode))
	result, deltaDays := tnTBalanceTime(int(roundedNs/3600000000000), int(roundedNs/60000000000)%60, int(roundedNs/1000000000)%60, 0, 0, int(roundedNs%1000000000))
	date := tnTAddDays(dt.date, int64(deltaDays))
	ns := tnTGetEpochNanosecondsFor(z.tz, tnTDateTime{date: date, time: result}, "compatible")
	return tnTNewZoned(ns, z.tz)
}

func (z *TnTemporalZonedDateTime) equals(other interface{}) bool {
	o := tnTToZonedDateTime(other, nil)
	return tnTInstantNs(z.instant).Cmp(tnTInstantNs(o.instant)) == 0 && z.tz.String() == o.tz.String()
}

func (z *TnTemporalZonedDateTime) toString(options ...interface{}) string {
	precision := "auto"
	smallestUnit := ""
	mode := ""
	show := "auto"
	showTimeZone := "auto"
	showOffset := "auto"
	if len(options) > 0 && !TnIsNil(options[0]) {
		precision = tnTOptFractionalDigits(options[0])
		smallestUnit = tnTOptUnit(options[0], "smallestUnit", "datetime", false, []string{tnTHour, tnTYear, tnTMonth, tnTWeek})
		mode = tnTOptRoundingMode(options[0], "trunc")
		show = tnTOptShowCalendar(options[0])
		showTimeZone = tnTOptShowTimeZone(options[0])
		showOffset = tnTOptShowOffset(options[0])
	}
	ns := tnTInstantNs(z.instant)
	if smallestUnit != "" || precision != "auto" {
		roundUnit, roundInc := tnTNanosecond, int64(1)
		if smallestUnit != "" {
			if smallestUnit == tnTDay {
				precision = "minute"
			} else {
				roundUnit, roundInc = smallestUnit, 1
			}
		} else {
			roundUnit, roundInc = tnTStringPrecisionUnit(precision)
		}
		ns = tnTRoundInstantNs(ns, tnTUnitNs(roundUnit)*roundInc, mode)
	}
	value := tnTInstantOfNs(ns)
	dt := tnTGetISODateTimeFor(z.tz, ns)
	out := tnTDateTimeString(dt, precision)
	if smallestUnit == tnTMinute {
		out = tnTDateToString(dt.date) + "T" + tnTPart(dt.time.h) + ":" + tnTPart(dt.time.mi)
	}
	if showOffset != "never" {
		off := z.tz.offsetSecAt(value.sec, value.nsec)
		out += tnTFormatOffsetFull(off * 1000000000)
	}
	if showTimeZone != "never" {
		flag := ""
		if showTimeZone == "critical" {
			flag = "!"
		}
		out += "[" + flag + z.tz.String() + "]"
	}
	return out + tnTCalendarAnnotation(show)
}

func (z *TnTemporalZonedDateTime) TnToString() string { return z.toString() }
func (z *TnTemporalZonedDateTime) String() string     { return z.toString() }
func (z *TnTemporalZonedDateTime) toJSON() string     { return z.toString() }
func (z *TnTemporalZonedDateTime) TnToJSON(string) interface{} {
	return z.toString()
}
func (z *TnTemporalZonedDateTime) toLocaleString(...interface{}) string { return z.toString() }
func (z *TnTemporalZonedDateTime) TnInspectCustom(float64, interface{}) interface{} {
	return "Temporal.ZonedDateTime {}"
}
func (z *TnTemporalZonedDateTime) valueOf() {
	panic(TnNodeError("TypeError", "", "Do not use Temporal.ZonedDateTime.prototype.valueOf; use Temporal.ZonedDateTime.prototype.compare for comparison."))
}

// --- Temporal.Now

func TnTemporalNowInstant() *TnTemporalInstant {
	now := time.Now()
	sec := now.Unix()
	nsec := now.Nanosecond()
	return &TnTemporalInstant{sec: sec, nsec: int32(nsec)}
}

func TnTemporalNowTimeZoneId() string {
	return TnTemporalLocalZone().String()
}

func TnTemporalNowPlainDateISO(args ...interface{}) *TnTemporalPlainDate {
	tz := TnTemporalLocalZone()
	if len(args) > 0 && !TnIsNil(args[0]) {
		tz = tnTToTimeZone(args[0])
	}
	dt := tnTGetISODateTimeFor(tz, tnTInstantNs(TnTemporalNowInstant()))
	return &TnTemporalPlainDate{date: dt.date}
}

func TnTemporalNowPlainTimeISO(args ...interface{}) *TnTemporalPlainTime {
	tz := TnTemporalLocalZone()
	if len(args) > 0 && !TnIsNil(args[0]) {
		tz = tnTToTimeZone(args[0])
	}
	dt := tnTGetISODateTimeFor(tz, tnTInstantNs(TnTemporalNowInstant()))
	return &TnTemporalPlainTime{time: dt.time}
}

func TnTemporalNowPlainDateTimeISO(args ...interface{}) *TnTemporalPlainDateTime {
	tz := TnTemporalLocalZone()
	if len(args) > 0 && !TnIsNil(args[0]) {
		tz = tnTToTimeZone(args[0])
	}
	dt := tnTGetISODateTimeFor(tz, tnTInstantNs(TnTemporalNowInstant()))
	return &TnTemporalPlainDateTime{date: dt.date, time: dt.time}
}

func TnTemporalNowZonedDateTimeISO(args ...interface{}) *TnTemporalZonedDateTime {
	tz := TnTemporalLocalZone()
	if len(args) > 0 && !TnIsNil(args[0]) {
		tz = tnTToTimeZone(args[0])
	}
	return tnTNewZoned(tnTInstantNs(TnTemporalNowInstant()), tz)
}

// --- fs.Stats's Temporal.Instant getters (built here so fs alone does not
// pull the Temporal helper in)

func (s *TnStats) Get_atimeInstant() *TnTemporalInstant {
	return &TnTemporalInstant{sec: s.atime.Unix(), nsec: int32(s.atime.Nanosecond())}
}

func (s *TnStats) Get_mtimeInstant() *TnTemporalInstant {
	return &TnTemporalInstant{sec: s.mtime.Unix(), nsec: int32(s.mtime.Nanosecond())}
}

func (s *TnStats) Get_ctimeInstant() *TnTemporalInstant {
	return &TnTemporalInstant{sec: s.ctime.Unix(), nsec: int32(s.ctime.Nanosecond())}
}

func (s *TnStats) Get_birthtimeInstant() *TnTemporalInstant {
	return &TnTemporalInstant{sec: s.birthtime.Unix(), nsec: int32(s.birthtime.Nanosecond())}
}

// Date.prototype.toTemporalInstant
func TnDateToTemporalInstant(t time.Time) *TnTemporalInstant {
	return &TnTemporalInstant{sec: t.Unix(), nsec: int32(t.Nanosecond())}
}
`;
