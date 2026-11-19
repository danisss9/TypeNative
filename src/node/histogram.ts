// node:perf_hooks HdrHistogram, statistical tests, EWMA/SLO burn rate,
// CBOR v2 export/importHistogram, and SlidingWindowHistogram (Node 26).

import { defineClass, defineHelper, NodeCall, NodeRegistry } from './registry.js';

const histogramHelper = `// HdrHistogram + statistical tests + CBOR v2 export/import + SlidingWindowHistogram
type TnPercentileCI struct {
	value float64
	lower float64
	upper float64
}

type TnMeanCI struct {
	mean  float64
	lower float64
	upper float64
}

type TnConfidenceInterval struct {
	lower float64
	upper float64
}

type TnWelchResult struct {
	tStatistic         float64
	degreesOfFreedom   float64
	pValue             float64
	confidenceInterval *TnConfidenceInterval
}

type TnMannWhitneyResult struct {
	uStatistic float64
	zScore     float64
	pValue     float64
}

type TnQrdeResult struct {
	probabilities *TnFloat64Array
	quantiles     *TnFloat64Array
	densities     *TnFloat64Array
	count         *tnbig.Int
	bucketCount   float64
	corrections   float64
	dequantize    string
}

type TnHistogram struct {
	lowest                      int64
	highest                     int64
	figures                     int
	unitMagnitude               int
	subBucketHalfCountMagnitude int
	subBucketHalfCount          int64
	subBucketCount              int64
	subBucketMask               int64
	bucketCount                 int
	countsLen                   int
	counts                      []int64
	totalCount                  int64
	minVal                      int64
	maxVal                      int64
	exceeds                     int64
	resetCount                  int64

	// EWMA / SLO tracking
	ewmaEnabled      bool
	ewmaAlpha        float64
	ewmaMean         float64
	ewmaVar          float64
	ewmaErrorRate    float64
	ewmaThreshold    float64
	ewmaHasThreshold bool
	ewmaCount        int64

	// recordDelta / monitorEventLoopDelay
	enabled  bool
	stop     chan struct{}
	interval float64
	last     time.Time
}

func tnHdrInit(lowest, highest int64, figures int) *TnHistogram {
	if lowest < 1 {
		lowest = 1
	}
	if highest < lowest*2 {
		highest = lowest * 2
	}
	if figures < 1 {
		figures = 1
	}
	if figures > 5 {
		figures = 5
	}
	unitMag := int(math.Floor(math.Log2(float64(lowest))))
	largestSingleUnit := 2.0 * math.Pow(10, float64(figures))
	subBucketCountMag := int(math.Ceil(math.Log2(largestSingleUnit)))
	subBucketHalfCountMag := subBucketCountMag - 1
	if subBucketHalfCountMag < 0 {
		subBucketHalfCountMag = 0
	}
	subBucketCount := int64(1) << uint(subBucketHalfCountMag+1)
	subBucketHalfCount := subBucketCount >> 1
	subBucketMask := (subBucketCount - 1) << uint(unitMag)

	// Buckets needed to cover highest
	bucketsNeeded := 1
	smallestUntrackable := uint64(subBucketCount) << uint(unitMag)
	for smallestUntrackable <= uint64(highest) && smallestUntrackable > 0 {
		smallestUntrackable <<= 1
		bucketsNeeded++
	}
	countsLen := (bucketsNeeded + 1) * int(subBucketHalfCount)
	return &TnHistogram{
		lowest:                      lowest,
		highest:                     highest,
		figures:                     figures,
		unitMagnitude:               unitMag,
		subBucketHalfCountMagnitude: subBucketHalfCountMag,
		subBucketHalfCount:          subBucketHalfCount,
		subBucketCount:              subBucketCount,
		subBucketMask:               subBucketMask,
		bucketCount:                 bucketsNeeded,
		countsLen:                   countsLen,
		counts:                      make([]int64, countsLen),
		minVal:                      math.MaxInt64,
		maxVal:                      0,
	}
}

func tnToInt64Val(v interface{}) (int64, bool) {
	switch x := v.(type) {
	case float64:
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return 0, false
		}
		return int64(x), true
	case int:
		return int64(x), true
	case int64:
		return x, true
	case *tnbig.Int:
		if x == nil {
			return 0, false
		}
		return x.Int64(), true
	}
	return 0, false
}

func TnCreateHistogram(options ...interface{}) *TnHistogram {
	lowest := int64(1)
	highest := int64(9007199254740991) // Number.MAX_SAFE_INTEGER
	figures := 3
	var halfLife float64
	hasHalfLife := false
	var threshold float64
	hasThreshold := false

	if len(options) > 0 && options[0] != nil {
		opt := options[0]
		if v, ok := tnToInt64Val(TnGetValue(opt, "lowest")); ok {
			if v < 1 {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.lowest\\" is out of range. It must be >= 1."))
			}
			lowest = v
		}
		if v, ok := tnToInt64Val(TnGetValue(opt, "highest")); ok {
			if v < lowest*2 {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.highest\\" is out of range."))
			}
			highest = v
		}
		if v, ok := TnGetValue(opt, "figures").(float64); ok {
			if v < 1 || v > 5 || v != math.Trunc(v) {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.figures\\" is out of range. It must be >= 1 && <= 5."))
			}
			figures = int(v)
		}
		if v, ok := TnGetValue(opt, "halfLife").(float64); ok {
			if !(v > 0) || math.IsInf(v, 0) {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.halfLife\\" is out of range. It must be > 0."))
			}
			halfLife = v
			hasHalfLife = true
		}
		if v, ok := TnGetValue(opt, "threshold").(float64); ok {
			if !(v >= 0) || math.IsInf(v, 0) {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.threshold\\" is out of range."))
			}
			threshold = v
			hasThreshold = true
		} else if bi, ok := TnGetValue(opt, "threshold").(*tnbig.Int); ok && bi != nil {
			f, _ := new(tnbig.Float).SetInt(bi).Float64()
			threshold = f
			hasThreshold = true
		}
	}

	h := tnHdrInit(lowest, highest, figures)
	if hasHalfLife {
		h.ewmaEnabled = true
		h.ewmaAlpha = 1.0 - math.Pow(0.5, 1.0/halfLife)
		if hasThreshold {
			h.ewmaHasThreshold = true
			h.ewmaThreshold = threshold
		}
	}
	return h
}

func (h *TnHistogram) getBucketIndex(v int64) int {
	if v < 0 {
		return 0
	}
	pow2Ceiling := 64 - bits.LeadingZeros64(uint64(v|h.subBucketMask))
	idx := pow2Ceiling - h.unitMagnitude - (h.subBucketHalfCountMagnitude + 1)
	if idx < 0 {
		return 0
	}
	return idx
}

func (h *TnHistogram) getSubBucketIndex(v int64, bucketIdx int) int {
	return int(uint64(v) >> uint(bucketIdx+h.unitMagnitude))
}

func (h *TnHistogram) countsIndex(v int64) int {
	bucketIdx := h.getBucketIndex(v)
	subIdx := h.getSubBucketIndex(v, bucketIdx)
	return (bucketIdx+1)*int(h.subBucketHalfCount) + subIdx - int(h.subBucketHalfCount)
}

func (h *TnHistogram) valueFromIndex(index int) int64 {
	bucketIdx := (index >> uint(h.subBucketHalfCountMagnitude)) - 1
	subIdx := int64(index&(int(h.subBucketHalfCount)-1)) + h.subBucketHalfCount
	if bucketIdx < 0 {
		subIdx -= h.subBucketHalfCount
		bucketIdx = 0
	}
	return subIdx << uint(bucketIdx+h.unitMagnitude)
}

func (h *TnHistogram) sizeOfEquivalentValueRange(v int64) int64 {
	bucketIdx := h.getBucketIndex(v)
	subIdx := h.getSubBucketIndex(v, bucketIdx)
	shift := bucketIdx + h.unitMagnitude
	if int64(subIdx) >= h.subBucketCount {
		shift++
	}
	return int64(1) << uint(shift)
}

func (h *TnHistogram) lowestEquivalentValue(v int64) int64 {
	bucketIdx := h.getBucketIndex(v)
	subIdx := h.getSubBucketIndex(v, bucketIdx)
	return int64(subIdx) << uint(bucketIdx+h.unitMagnitude)
}

func (h *TnHistogram) nextNonEquivalentValue(v int64) int64 {
	return h.lowestEquivalentValue(v) + h.sizeOfEquivalentValueRange(v)
}

func (h *TnHistogram) highestEquivalentValue(v int64) int64 {
	return h.nextNonEquivalentValue(v) - 1
}

func (h *TnHistogram) medianEquivalentValue(v int64) int64 {
	return h.lowestEquivalentValue(v) + (h.sizeOfEquivalentValueRange(v) >> 1)
}

func (h *TnHistogram) updateEwma(val float64) {
	if !h.ewmaEnabled {
		return
	}
	if h.ewmaCount == 0 {
		h.ewmaMean = val
		h.ewmaVar = 0
		if h.ewmaHasThreshold {
			if val > h.ewmaThreshold {
				h.ewmaErrorRate = 1.0
			} else {
				h.ewmaErrorRate = 0.0
			}
		}
		h.ewmaCount = 1
		return
	}
	alpha := h.ewmaAlpha
	diff := val - h.ewmaMean
	incr := alpha * diff
	h.ewmaMean += incr
	h.ewmaVar = (1.0 - alpha) * (h.ewmaVar + diff*incr)
	if h.ewmaHasThreshold {
		errVal := 0.0
		if val > h.ewmaThreshold {
			errVal = 1.0
		}
		h.ewmaErrorRate = (1.0-alpha)*h.ewmaErrorRate + alpha*errVal
	}
	h.ewmaCount++
}

func (h *TnHistogram) recordInt64(v int64, count int64) bool {
	if v < 0 || count <= 0 {
		return false
	}
	if v > h.highest {
		h.exceeds += count
		return false
	}
	idx := h.countsIndex(v)
	if idx < 0 || idx >= h.countsLen {
		h.exceeds += count
		return false
	}
	h.counts[idx] += count
	h.totalCount += count
	if v < h.minVal {
		h.minVal = v
	}
	if v > h.maxVal {
		h.maxVal = v
	}
	return true
}

func (h *TnHistogram) record(value interface{}) {
	v, ok := tnToInt64Val(value)
	if !ok {
		return
	}
	if v < 1 {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"val\\" is out of range. It must be >= 1."))
	}
	if h.recordInt64(v, 1) {
		h.updateEwma(float64(v))
	}
}

func (h *TnHistogram) recordDelta() {
	now := time.Now()
	if !h.last.IsZero() {
		delta := now.Sub(h.last).Nanoseconds()
		if delta < 1 {
			delta = 1
		}
		if h.recordInt64(delta, 1) {
			h.updateEwma(float64(delta))
		}
	}
	h.last = now
}

func (h *TnHistogram) recordCorrected(value interface{}, interval float64) {
	v, ok := tnToInt64Val(value)
	if !ok {
		return
	}
	h.record(value)
	iv := int64(interval)
	if iv <= 0 {
		return
	}
	for missing := v - iv; missing >= iv; missing -= iv {
		if h.recordInt64(missing, 1) {
			h.updateEwma(float64(missing))
		}
	}
}

func (h *TnHistogram) recomputeMinMax() {
	h.minVal = math.MaxInt64
	h.maxVal = 0
	var total int64
	for i, c := range h.counts {
		if c > 0 {
			total += c
			v := h.valueFromIndex(i)
			if v < h.minVal {
				h.minVal = v
			}
			if v > h.maxVal {
				h.maxVal = v
			}
		}
	}
	h.totalCount = total
}

func (h *TnHistogram) Get_count() float64 { return float64(h.totalCount) }
func (h *TnHistogram) Get_countBigInt() *tnbig.Int { return tnbig.NewInt(h.totalCount) }

func (h *TnHistogram) minInt64() int64 {
	if h.totalCount == 0 {
		return math.MaxInt64
	}
	return h.lowestEquivalentValue(h.minVal)
}

func (h *TnHistogram) maxInt64() int64 {
	if h.totalCount == 0 {
		return 0
	}
	return h.highestEquivalentValue(h.maxVal)
}

func (h *TnHistogram) Get_min() float64 { return float64(h.minInt64()) }
func (h *TnHistogram) Get_minBigInt() *tnbig.Int { return tnbig.NewInt(h.minInt64()) }
func (h *TnHistogram) Get_max() float64 { return float64(h.maxInt64()) }
func (h *TnHistogram) Get_maxBigInt() *tnbig.Int { return tnbig.NewInt(h.maxInt64()) }
func (h *TnHistogram) Get_exceeds() float64 { return float64(h.exceeds) }
func (h *TnHistogram) Get_exceedsBigInt() *tnbig.Int { return tnbig.NewInt(h.exceeds) }
func (h *TnHistogram) Get_resetCount() float64 { return float64(h.resetCount) }

func (h *TnHistogram) Get_ewmaMean() float64 { return h.ewmaMean }
func (h *TnHistogram) Get_ewmaStddev() float64 {
	if h.ewmaVar <= 0 {
		return 0
	}
	return math.Sqrt(h.ewmaVar)
}
func (h *TnHistogram) Get_ewmaErrorRate() float64 { return h.ewmaErrorRate }

func (h *TnHistogram) burnRate(sloTarget float64) float64 {
	if !(sloTarget > 0 && sloTarget < 1) || math.IsNaN(sloTarget) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"sloTarget\\" is out of range. It must be > 0 && < 1."))
	}
	if !h.ewmaEnabled || !h.ewmaHasThreshold || h.ewmaCount == 0 {
		return 0
	}
	return h.ewmaErrorRate / (1.0 - sloTarget)
}

func (h *TnHistogram) Get_mean() float64 {
	if h.totalCount == 0 {
		return math.NaN()
	}
	total := 0.0
	for i, c := range h.counts {
		if c > 0 {
			total += float64(c) * float64(h.medianEquivalentValue(h.valueFromIndex(i)))
		}
	}
	return total / float64(h.totalCount)
}

func (h *TnHistogram) Get_stddev() float64 {
	if h.totalCount == 0 {
		return math.NaN()
	}
	mean := h.Get_mean()
	sumSq := 0.0
	for i, c := range h.counts {
		if c > 0 {
			d := float64(h.medianEquivalentValue(h.valueFromIndex(i))) - mean
			sumSq += float64(c) * d * d
		}
	}
	return math.Sqrt(sumSq / float64(h.totalCount))
}

func (h *TnHistogram) moments() (float64, float64, float64) {
	if h.totalCount == 0 {
		return 0, 0, 0
	}
	n := float64(h.totalCount)
	mean := h.Get_mean()
	var m2, m3, m4 float64
	for i, c := range h.counts {
		if c > 0 {
			fc := float64(c)
			d := float64(h.medianEquivalentValue(h.valueFromIndex(i))) - mean
			d2 := d * d
			m2 += fc * d2
			m3 += fc * d2 * d
			m4 += fc * d2 * d2
		}
	}
	return m2 / n, m3 / n, m4 / n
}

func (h *TnHistogram) Get_skewness() float64 {
	m2, m3, _ := h.moments()
	if m2 == 0 {
		return 0
	}
	return m3 / math.Pow(m2, 1.5)
}

func (h *TnHistogram) Get_kurtosis() float64 {
	m2, _, m4 := h.moments()
	if m2 == 0 {
		return 0
	}
	return m4/(m2*m2) - 3.0
}

func (h *TnHistogram) valueAtCount(target int64) int64 {
	if h.totalCount == 0 {
		return 0
	}
	if target < 1 {
		target = 1
	}
	if target > h.totalCount {
		target = h.totalCount
	}
	var total int64
	for i, c := range h.counts {
		if c > 0 {
			total += c
			if total >= target {
				return h.highestEquivalentValue(h.valueFromIndex(i))
			}
		}
	}
	return h.maxInt64()
}

func (h *TnHistogram) percentileInt64(p float64) int64 {
	if h.totalCount == 0 {
		return 0
	}
	if p > 100 {
		p = 100
	}
	if p <= 0 {
		return h.valueAtCount(1)
	}
	target := int64(math.Ceil((p / 100.0) * float64(h.totalCount)))
	if target < 1 {
		target = 1
	}
	return h.valueAtCount(target)
}

func (h *TnHistogram) percentile(p float64) float64 {
	if !(p > 0 && p <= 100) || math.IsNaN(p) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"percentile\\" is out of range. It must be > 0 && <= 100."))
	}
	return float64(h.percentileInt64(p))
}

func (h *TnHistogram) percentileBigInt(p float64) *tnbig.Int {
	if !(p > 0 && p <= 100) || math.IsNaN(p) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"percentile\\" is out of range. It must be > 0 && <= 100."))
	}
	return tnbig.NewInt(h.percentileInt64(p))
}

func (h *TnHistogram) percentilesAt(ps []float64) *TnMap[float64, float64] {
	m := TnNewMap[float64, float64]()
	for _, p := range ps {
		m.Set(p, h.percentile(p))
	}
	return m
}

func (h *TnHistogram) Get_percentiles() *TnMap[float64, float64] {
	m := TnNewMap[float64, float64]()
	if h.totalCount == 0 {
		return m
	}
	// Standard HdrHistogram percentile ticks (halving distance to 100%)
	m.Set(0, float64(h.minInt64()))
	p := 50.0
	for {
		v := float64(h.percentileInt64(p))
		m.Set(p, v)
		if p >= 99.9999 || v >= float64(h.maxInt64()) {
			break
		}
		p = 100.0 - (100.0-p)/2.0
	}
	m.Set(100, float64(h.maxInt64()))
	return m
}

func (h *TnHistogram) Get_percentilesBigInt() *TnMap[float64, *tnbig.Int] {
	m := TnNewMap[float64, *tnbig.Int]()
	if h.totalCount == 0 {
		return m
	}
	m.Set(0, tnbig.NewInt(h.minInt64()))
	p := 50.0
	for {
		v := h.percentileInt64(p)
		m.Set(p, tnbig.NewInt(v))
		if p >= 99.9999 || v >= h.maxInt64() {
			break
		}
		p = 100.0 - (100.0-p)/2.0
	}
	m.Set(100, tnbig.NewInt(h.maxInt64()))
	return m
}

func (h *TnHistogram) countAt(v float64) float64 {
	iv := int64(v)
	if iv < 0 || iv > h.highest {
		return 0
	}
	idx := h.countsIndex(iv)
	if idx < 0 || idx >= h.countsLen {
		return 0
	}
	return float64(h.counts[idx])
}

func (h *TnHistogram) cdf(v float64) float64 {
	if h.totalCount == 0 {
		return 0
	}
	iv := int64(v)
	if iv < 0 {
		return 0
	}
	if iv >= h.highest {
		return 1
	}
	targetIdx := h.countsIndex(iv)
	if targetIdx >= h.countsLen {
		return 1
	}
	var sum int64
	for i := 0; i <= targetIdx; i++ {
		sum += h.counts[i]
	}
	return float64(sum) / float64(h.totalCount)
}

func (h *TnHistogram) ccdf(v float64) float64 {
	if h.totalCount == 0 {
		return 0
	}
	return 1.0 - h.cdf(v)
}

func (h *TnHistogram) add(other *TnHistogram) {
	if other == nil {
		return
	}
	if h.lowest == other.lowest && h.highest == other.highest && h.figures == other.figures && h.countsLen == other.countsLen {
		for i, c := range other.counts {
			if c > 0 {
				h.counts[i] += c
			}
		}
		h.totalCount += other.totalCount
		h.exceeds += other.exceeds
		if other.totalCount > 0 {
			if other.minVal < h.minVal {
				h.minVal = other.minVal
			}
			if other.maxVal > h.maxVal {
				h.maxVal = other.maxVal
			}
		}
		return
	}
	for i, c := range other.counts {
		if c > 0 {
			h.recordInt64(other.valueFromIndex(i), c)
		}
	}
	h.exceeds += other.exceeds
}

func (h *TnHistogram) subtract(other *TnHistogram) {
	if other == nil {
		return
	}
	if h.lowest == other.lowest && h.highest == other.highest && h.figures == other.figures && h.countsLen == other.countsLen {
		for i, c := range other.counts {
			if c > 0 {
				if h.counts[i] < c {
					h.counts[i] = 0
				} else {
					h.counts[i] -= c
				}
			}
		}
	} else {
		for i, c := range other.counts {
			if c > 0 {
				v := other.valueFromIndex(i)
				idx := h.countsIndex(v)
				if idx >= 0 && idx < h.countsLen {
					if h.counts[idx] < c {
						h.counts[idx] = 0
					} else {
						h.counts[idx] -= c
					}
				}
			}
		}
	}
	h.recomputeMinMax()
}

func (h *TnHistogram) clone() *TnHistogram {
	cp := &TnHistogram{
		lowest:                      h.lowest,
		highest:                     h.highest,
		figures:                     h.figures,
		unitMagnitude:               h.unitMagnitude,
		subBucketHalfCountMagnitude: h.subBucketHalfCountMagnitude,
		subBucketHalfCount:          h.subBucketHalfCount,
		subBucketCount:              h.subBucketCount,
		subBucketMask:               h.subBucketMask,
		bucketCount:                 h.bucketCount,
		countsLen:                   h.countsLen,
		counts:                      make([]int64, h.countsLen),
		totalCount:                  h.totalCount,
		minVal:                      h.minVal,
		maxVal:                      h.maxVal,
		exceeds:                     h.exceeds,
		resetCount:                  h.resetCount,
		ewmaEnabled:                 h.ewmaEnabled,
		ewmaAlpha:                   h.ewmaAlpha,
		ewmaMean:                    h.ewmaMean,
		ewmaVar:                     h.ewmaVar,
		ewmaErrorRate:               h.ewmaErrorRate,
		ewmaThreshold:               h.ewmaThreshold,
		ewmaHasThreshold:            h.ewmaHasThreshold,
		ewmaCount:                   h.ewmaCount,
	}
	copy(cp.counts, h.counts)
	return cp
}

func (h *TnHistogram) snapshot() *TnHistogram {
	return h.clone()
}

func (h *TnHistogram) diff(other *TnHistogram) *TnHistogram {
	if other == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"other\\" argument must be an instance of Histogram."))
	}
	out := h.clone()
	out.exceeds = 0
	if h.lowest == other.lowest && h.highest == other.highest && h.figures == other.figures && h.countsLen == other.countsLen {
		for i, c := range other.counts {
			if c > 0 {
				if out.counts[i] < c {
					panic(TnNewError("other contains values that are not in the histogram"))
				}
				out.counts[i] -= c
			}
		}
	} else {
		for i, c := range other.counts {
			if c > 0 {
				v := other.valueFromIndex(i)
				idx := out.countsIndex(v)
				if idx < 0 || idx >= out.countsLen || out.counts[idx] < c {
					panic(TnNewError("other contains values that are not in the histogram"))
				}
				out.counts[idx] -= c
			}
		}
	}
	out.recomputeMinMax()
	return out
}

func (h *TnHistogram) toJSON() *TnMap[string, interface{}] {
	m := TnNewMap[string, interface{}]()
	m.Set("count", h.Get_count())
	m.Set("min", h.Get_min())
	m.Set("max", h.Get_max())
	m.Set("mean", h.Get_mean())
	m.Set("exceeds", h.Get_exceeds())
	m.Set("stddev", h.Get_stddev())
	m.Set("skewness", h.Get_skewness())
	m.Set("kurtosis", h.Get_kurtosis())
	m.Set("ewmaMean", h.Get_ewmaMean())
	m.Set("ewmaStddev", h.Get_ewmaStddev())
	m.Set("ewmaErrorRate", h.Get_ewmaErrorRate())
	percentiles := TnNewMap[string, interface{}]()
	pm := h.Get_percentiles()
	for _, k := range pm.Keys() {
		percentiles.Set(TnNumStr(k), pm.Get(k))
	}
	m.Set("percentiles", percentiles)
	return m
}

func (h *TnHistogram) reset() {
	for i := range h.counts {
		h.counts[i] = 0
	}
	h.totalCount = 0
	h.minVal = math.MaxInt64
	h.maxVal = 0
	h.exceeds = 0
	h.ewmaMean = 0
	h.ewmaVar = 0
	h.ewmaErrorRate = 0
	h.ewmaCount = 0
	h.last = time.Time{}
	h.resetCount++
}

// --- Special math functions (incomplete beta, Student-t, Normal quantile) ---

func tnBetaCF(a, b, x float64) float64 {
	const maxIter = 200
	const eps = 3e-15
	const fpMin = 1e-300
	qab := a + b
	qap := a + 1.0
	qam := a - 1.0
	c := 1.0
	d := 1.0 - qab*x/qap
	if math.Abs(d) < fpMin {
		d = fpMin
	}
	d = 1.0 / d
	h := d
	for m := 1; m <= maxIter; m++ {
		mf := float64(m)
		m2 := 2.0 * mf
		aa := mf * (b - mf) * x / ((qam + m2) * (a + m2))
		d = 1.0 + aa*d
		if math.Abs(d) < fpMin {
			d = fpMin
		}
		c = 1.0 + aa/c
		if math.Abs(c) < fpMin {
			c = fpMin
		}
		d = 1.0 / d
		h *= d * c
		aa = -(a + mf) * (qab + mf) * x / ((a + m2) * (qap + m2))
		d = 1.0 + aa*d
		if math.Abs(d) < fpMin {
			d = fpMin
		}
		c = 1.0 + aa/c
		if math.Abs(c) < fpMin {
			c = fpMin
		}
		d = 1.0 / d
		del := d * c
		h *= del
		if math.Abs(del-1.0) < eps {
			break
		}
	}
	return h
}

func tnRegIncBeta(x, a, b float64) float64 {
	if x <= 0 {
		return 0
	}
	if x >= 1 {
		return 1
	}
	lgA, _ := math.Lgamma(a)
	lgB, _ := math.Lgamma(b)
	lgAB, _ := math.Lgamma(a + b)
	bt := math.Exp(lgAB - lgA - lgB + a*math.Log(x) + b*math.Log(1.0-x))
	if x < (a+1.0)/(a+b+2.0) {
		return bt * tnBetaCF(a, b, x) / a
	}
	return 1.0 - bt*tnBetaCF(b, a, 1.0-x)/b
}

func tnStudentTPValue(t, df float64) float64 {
	if df <= 0 || math.IsNaN(t) {
		return 1.0
	}
	x := df / (df + t*t)
	p := tnRegIncBeta(x, df/2.0, 0.5)
	if p < 0 {
		return 0
	}
	if p > 1 {
		return 1
	}
	return p
}

// Inverse standard normal CDF (Acklam's rational approximation)
func tnNormalQuantile(p float64) float64 {
	if p <= 0 {
		return math.Inf(-1)
	}
	if p >= 1 {
		return math.Inf(1)
	}
	const (
		a1 = -3.969683028665376e+01
		a2 = 2.209460984245205e+02
		a3 = -2.759285104469687e+02
		a4 = 1.383577518672690e+02
		a5 = -3.066479806614716e+01
		a6 = 2.506628277459239e+00

		b1 = -5.447609879822406e+01
		b2 = 1.615858368580409e+02
		b3 = -1.556989798598866e+02
		b4 = 6.680131188771972e+01
		b5 = -1.328068155288572e+01

		c1 = -7.784894002430293e-03
		c2 = -3.223964580411365e-01
		c3 = -2.400758277161838e+00
		c4 = -2.549732539343734e+00
		c5 = 4.374664141464968e+00
		c6 = 2.938163982698783e+00

		d1 = 7.784695709041462e-03
		d2 = 3.224671290700398e-01
		d3 = 2.445134137142996e+00
		d4 = 3.754408661907416e+00

		pLow  = 0.02425
		pHigh = 1.0 - pLow
	)
	if p < pLow {
		q := math.Sqrt(-2.0 * math.Log(p))
		return (((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q + c6) / ((((d1*q+d2)*q+d3)*q+d4)*q + 1.0)
	}
	if p <= pHigh {
		q := p - 0.5
		r := q * q
		return (((((a1*r+a2)*r+a3)*r+a4)*r+a5)*r + a6) * q / (((((b1*r+b2)*r+b3)*r+b4)*r+b5)*r + 1.0)
	}
	q := math.Sqrt(-2.0 * math.Log(1.0-p))
	return -(((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q + c6) / ((((d1*q+d2)*q+d3)*q+d4)*q + 1.0)
}

// Positive critical value t > 0 such that P(|T_df| >= t) = alpha (where alpha = 1 - confidence)
func tnStudentTCrit(confidence, df float64) float64 {
	alpha := 1.0 - confidence
	if df == 1.0 {
		return math.Tan(math.Pi * (0.5 - alpha/2.0))
	}
	if df > 1e7 {
		return tnNormalQuantile(1.0 - alpha/2.0)
	}
	// Bracket and bisect on tnStudentTPValue(t, df) == alpha
	lo := 0.0
	hi := tnNormalQuantile(1.0 - alpha/2.0)
	if hi < 1.0 {
		hi = 1.0
	}
	for tnStudentTPValue(hi, df) > alpha {
		hi *= 2.0
		if hi > 1e12 {
			break
		}
	}
	for i := 0; i < 80; i++ {
		mid := 0.5 * (lo + hi)
		if tnStudentTPValue(mid, df) > alpha {
			lo = mid
		} else {
			hi = mid
		}
	}
	return 0.5 * (lo + hi)
}

func tnConfidenceOpt(options []interface{}) float64 {
	conf := 0.95
	if len(options) > 0 && options[0] != nil {
		if v, ok := TnGetValue(options[0], "confidence").(float64); ok {
			if !(v > 0 && v < 1) || math.IsNaN(v) {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.confidence\\" is out of range. It must be > 0 && < 1."))
			}
			conf = v
		}
	}
	return conf
}

// --- Confidence Intervals ---

func (h *TnHistogram) percentileCI(p float64, options ...interface{}) *TnPercentileCI {
	if !(p > 0 && p <= 100) || math.IsNaN(p) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"percentile\\" is out of range. It must be > 0 && <= 100."))
	}
	conf := tnConfidenceOpt(options)
	if h.totalCount == 0 {
		return &TnPercentileCI{value: 0, lower: 0, upper: 0}
	}
	val := float64(h.percentileInt64(p))
	if h.totalCount == 1 {
		return &TnPercentileCI{value: val, lower: val, upper: val}
	}
	n := float64(h.totalCount)
	q := p / 100.0
	if q >= 1.0 {
		return &TnPercentileCI{value: val, lower: val, upper: val}
	}
	alpha := 1.0 - conf
	// Exact binomial order-statistic bounds via regularized incomplete beta:
	// P(Bin(n, q) <= k-1) = I_{1-q}(n - k + 1, k)
	// Lower rank k_lo: largest k in [1..n] with P(Bin(n,q) < k) <= alpha/2
	// Upper rank k_hi: smallest k in [1..n] with P(Bin(n,q) < k) >= 1 - alpha/2
	// Use binary search over [1..totalCount]
	z := tnNormalQuantile(1.0 - alpha/2.0)
	se := math.Sqrt(n * q * (1.0 - q))
	var loRank, hiRank int64
	if h.totalCount <= 100000 {
		lo, hi := int64(1), h.totalCount
		loRank = 1
		for lo <= hi {
			mid := lo + (hi-lo)/2
			cdf := tnRegIncBeta(1.0-q, float64(h.totalCount-mid+1), float64(mid))
			if cdf <= alpha/2.0 {
				loRank = mid
				lo = mid + 1
			} else {
				hi = mid - 1
			}
		}
		lo, hi = int64(1), h.totalCount
		hiRank = h.totalCount
		for lo <= hi {
			mid := lo + (hi-lo)/2
			cdf := tnRegIncBeta(1.0-q, float64(h.totalCount-mid+1), float64(mid))
			if cdf >= 1.0-alpha/2.0 {
				hiRank = mid
				hi = mid - 1
			} else {
				lo = mid + 1
			}
		}
	} else {
		loRank = int64(math.Floor(n*q - z*se))
		hiRank = int64(math.Ceil(n*q + z*se + 1.0))
	}
	if loRank < 1 {
		loRank = 1
	}
	if hiRank > h.totalCount {
		hiRank = h.totalCount
	}
	if loRank > hiRank {
		loRank = hiRank
	}
	return &TnPercentileCI{
		value: val,
		lower: float64(h.valueAtCount(loRank)),
		upper: float64(h.valueAtCount(hiRank)),
	}
}

func (h *TnHistogram) sampleVariance(mean float64) float64 {
	if h.totalCount < 2 {
		return math.NaN()
	}
	sumSq := 0.0
	for i, c := range h.counts {
		if c > 0 {
			d := float64(h.medianEquivalentValue(h.valueFromIndex(i))) - mean
			sumSq += float64(c) * d * d
		}
	}
	return sumSq / float64(h.totalCount-1)
}

func (h *TnHistogram) meanCI(options ...interface{}) *TnMeanCI {
	conf := tnConfidenceOpt(options)
	if h.totalCount == 0 {
		return &TnMeanCI{mean: math.NaN(), lower: math.NaN(), upper: math.NaN()}
	}
	mean := h.Get_mean()
	if h.totalCount == 1 {
		return &TnMeanCI{mean: mean, lower: math.NaN(), upper: math.NaN()}
	}
	s2 := h.sampleVariance(mean)
	se := math.Sqrt(s2 / float64(h.totalCount))
	tCrit := tnStudentTCrit(conf, float64(h.totalCount-1))
	margin := tCrit * se
	return &TnMeanCI{
		mean:  mean,
		lower: mean - margin,
		upper: mean + margin,
	}
}

// --- Two-Sample Statistical Tests & Effect Sizes ---

func (h *TnHistogram) welchTest(other *TnHistogram, options ...interface{}) *TnWelchResult {
	if other == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"other\\" argument must be an instance of Histogram."))
	}
	conf := tnConfidenceOpt(options)
	zero := &TnWelchResult{
		tStatistic:         0,
		degreesOfFreedom:   0,
		pValue:             1,
		confidenceInterval: &TnConfidenceInterval{lower: 0, upper: 0},
	}
	if h.totalCount < 2 || other.totalCount < 2 {
		return zero
	}
	n1 := float64(h.totalCount)
	n2 := float64(other.totalCount)
	m1 := h.Get_mean()
	m2 := other.Get_mean()
	s1Sq := h.sampleVariance(m1)
	s2Sq := other.sampleVariance(m2)
	v1 := s1Sq / n1
	v2 := s2Sq / n2
	vSum := v1 + v2
	if vSum == 0 {
		return zero
	}
	se := math.Sqrt(vSum)
	diff := m1 - m2
	tStat := diff / se
	df := (vSum * vSum) / ((v1*v1)/(n1-1.0) + (v2*v2)/(n2-1.0))
	pVal := tnStudentTPValue(tStat, df)
	tCrit := tnStudentTCrit(conf, df)
	margin := tCrit * se
	return &TnWelchResult{
		tStatistic:         tStat,
		degreesOfFreedom:   df,
		pValue:             pVal,
		confidenceInterval: &TnConfidenceInterval{lower: diff - margin, upper: diff + margin},
	}
}

type tnHistBucket struct {
	val   int64
	count int64
}

func (h *TnHistogram) nonZeroBuckets() []tnHistBucket {
	var out []tnHistBucket
	for i, c := range h.counts {
		if c > 0 {
			out = append(out, tnHistBucket{val: h.medianEquivalentValue(h.valueFromIndex(i)), count: c})
		}
	}
	return out
}

func (h *TnHistogram) ksTest(other *TnHistogram) float64 {
	if other == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"other\\" argument must be an instance of Histogram."))
	}
	if h.totalCount == 0 || other.totalCount == 0 {
		return 0
	}
	b1 := h.nonZeroBuckets()
	b2 := other.nonZeroBuckets()
	n1 := float64(h.totalCount)
	n2 := float64(other.totalCount)
	i, j := 0, 0
	var c1, c2 int64
	maxDiff := 0.0
	for i < len(b1) || j < len(b2) {
		var curVal int64
		if i < len(b1) && (j >= len(b2) || b1[i].val <= b2[j].val) {
			curVal = b1[i].val
		} else {
			curVal = b2[j].val
		}
		for i < len(b1) && b1[i].val == curVal {
			c1 += b1[i].count
			i++
		}
		for j < len(b2) && b2[j].val == curVal {
			c2 += b2[j].count
			j++
		}
		d := math.Abs(float64(c1)/n1 - float64(c2)/n2)
		if d > maxDiff {
			maxDiff = d
		}
	}
	return maxDiff
}

func (h *TnHistogram) mannWhitneyTest(other *TnHistogram) *TnMannWhitneyResult {
	if other == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"other\\" argument must be an instance of Histogram."))
	}
	if h.totalCount == 0 || other.totalCount == 0 {
		return &TnMannWhitneyResult{uStatistic: 0, zScore: 0, pValue: 1}
	}
	b1 := h.nonZeroBuckets()
	b2 := other.nonZeroBuckets()
	n1 := float64(h.totalCount)
	n2 := float64(other.totalCount)
	N := n1 + n2

	// Merge sorted buckets to compute U1 = sum(a_i > b_j) + 0.5*sum(a_i == b_j) and tie sum
	i, j := 0, 0
	var b2Less int64
	u1 := 0.0
	tieSum := 0.0
	for i < len(b1) || j < len(b2) {
		var curVal int64
		if i < len(b1) && (j >= len(b2) || b1[i].val <= b2[j].val) {
			curVal = b1[i].val
		} else {
			curVal = b2[j].val
		}
		var cnt1, cnt2 int64
		for i < len(b1) && b1[i].val == curVal {
			cnt1 += b1[i].count
			i++
		}
		for j < len(b2) && b2[j].val == curVal {
			cnt2 += b2[j].count
			j++
		}
		if cnt1 > 0 {
			u1 += float64(cnt1) * (float64(b2Less) + 0.5*float64(cnt2))
		}
		b2Less += cnt2
		t := float64(cnt1 + cnt2)
		if t > 1 {
			tieSum += t*t*t - t
		}
	}
	mu := n1 * n2 / 2.0
	var term float64
	if N > 1 {
		term = (N + 1.0) - tieSum/(N*(N-1.0))
	}
	variance := (n1 * n2 / 12.0) * term
	if variance <= 0 {
		return &TnMannWhitneyResult{uStatistic: u1, zScore: 0, pValue: 1}
	}
	z := (u1 - mu) / math.Sqrt(variance)
	pVal := math.Erfc(math.Abs(z) / math.Sqrt2)
	return &TnMannWhitneyResult{
		uStatistic: u1,
		zScore:     z,
		pValue:     pVal,
	}
}

func (h *TnHistogram) cohensD(other *TnHistogram) float64 {
	if other == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"other\\" argument must be an instance of Histogram."))
	}
	if h.totalCount < 2 || other.totalCount < 2 {
		return 0
	}
	n1 := float64(h.totalCount)
	n2 := float64(other.totalCount)
	m1 := h.Get_mean()
	m2 := other.Get_mean()
	s1Sq := h.sampleVariance(m1)
	s2Sq := other.sampleVariance(m2)
	pooledVar := ((n1-1.0)*s1Sq + (n2-1.0)*s2Sq) / (n1 + n2 - 2.0)
	if pooledVar <= 0 {
		return 0
	}
	return (m1 - m2) / math.Sqrt(pooledVar)
}

func (h *TnHistogram) cliffsD(other *TnHistogram) float64 {
	if other == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"other\\" argument must be an instance of Histogram."))
	}
	if h.totalCount == 0 || other.totalCount == 0 {
		return 0
	}
	b1 := h.nonZeroBuckets()
	b2 := other.nonZeroBuckets()
	i, j := 0, 0
	var b2Less int64
	greater := 0.0
	less := 0.0
	for i < len(b1) || j < len(b2) {
		var curVal int64
		if i < len(b1) && (j >= len(b2) || b1[i].val <= b2[j].val) {
			curVal = b1[i].val
		} else {
			curVal = b2[j].val
		}
		var cnt1, cnt2 int64
		for i < len(b1) && b1[i].val == curVal {
			cnt1 += b1[i].count
			i++
		}
		for j < len(b2) && b2[j].val == curVal {
			cnt2 += b2[j].count
			j++
		}
		if cnt1 > 0 {
			greater += float64(cnt1) * float64(b2Less)
			b2Greater := other.totalCount - b2Less - cnt2
			less += float64(cnt1) * float64(b2Greater)
		}
		b2Less += cnt2
	}
	return (greater - less) / (float64(h.totalCount) * float64(other.totalCount))
}

// --- Buckets & QRDE ---

func (h *TnHistogram) linearBuckets(stepSize float64) *TnMap[float64, float64] {
	if !(stepSize >= 1 && stepSize <= 9007199254740991) || math.IsNaN(stepSize) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"stepSize\\" is out of range. It must be >= 1 && <= 9007199254740991."))
	}
	m := TnNewMap[float64, float64]()
	if h.totalCount == 0 {
		return m
	}
	maxV := float64(h.maxInt64())
	// Pre-populate buckets up to ceil(maxV / stepSize) * stepSize
	numBuckets := int(math.Ceil(maxV / stepSize))
	if numBuckets < 1 {
		numBuckets = 1
	}
	counts := make([]int64, numBuckets)
	for i, c := range h.counts {
		if c > 0 {
			v := float64(h.medianEquivalentValue(h.valueFromIndex(i)))
			bi := int(math.Ceil(v/stepSize)) - 1
			if bi < 0 {
				bi = 0
			}
			if bi >= numBuckets {
				bi = numBuckets - 1
			}
			counts[bi] += c
		}
	}
	for i, c := range counts {
		m.Set(float64(i+1)*stepSize, float64(c))
	}
	return m
}

func (h *TnHistogram) logBuckets(start float64, factor float64) *TnMap[float64, float64] {
	if !(start >= 1) || math.IsNaN(start) || math.IsInf(start, 0) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"start\\" is out of range. It must be >= 1."))
	}
	if !(factor > 1) || math.IsNaN(factor) || math.IsInf(factor, 0) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"factor\\" is out of range. It must be > 1."))
	}
	m := TnNewMap[float64, float64]()
	if h.totalCount == 0 {
		return m
	}
	maxV := float64(h.maxInt64())
	var edges []float64
	edge := start
	for {
		edges = append(edges, edge)
		if edge >= maxV {
			break
		}
		edge *= factor
		if math.IsInf(edge, 0) || len(edges) > 10000 {
			break
		}
	}
	counts := make([]int64, len(edges))
	for i, c := range h.counts {
		if c > 0 {
			v := float64(h.medianEquivalentValue(h.valueFromIndex(i)))
			idx := sort.SearchFloat64s(edges, v)
			if idx >= len(edges) {
				idx = len(edges) - 1
			}
			counts[idx] += c
		}
	}
	for i, e := range edges {
		m.Set(e, float64(counts[i]))
	}
	return m
}

func (h *TnHistogram) qrde(options ...interface{}) chan *TnQrdeResult {
	bins := 100
	dequantize := "hdr"
	if len(options) > 0 && options[0] != nil {
		opt := options[0]
		if v, ok := TnGetValue(opt, "bins").(float64); ok {
			if v < 1 || v != math.Trunc(v) {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.bins\\" is out of range."))
			}
			bins = int(v)
		}
		if s, ok := TnGetValue(opt, "dequantize").(string); ok {
			if s != "hdr" && s != "none" {
				panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The value of \\"options.dequantize\\" must be 'hdr' or 'none'."))
			}
			dequantize = s
		}
	}

	probs := make([]float64, bins+1)
	for i := 0; i <= bins; i++ {
		probs[i] = float64(i) / float64(bins)
	}

	if h.totalCount == 0 {
		res := &TnQrdeResult{
			probabilities: &TnFloat64Array{data: probs, kind: "Float64Array"},
			quantiles:     &TnFloat64Array{data: []float64{}, kind: "Float64Array"},
			densities:     &TnFloat64Array{data: []float64{}, kind: "Float64Array"},
			count:         tnbig.NewInt(0),
			bucketCount:   0,
			corrections:   0,
			dequantize:    dequantize,
		}
		return TnPromiseResolve(res)
	}

	type qBucket struct {
		lo    float64
		width float64
		count int64
	}
	var buckets []qBucket
	for i, c := range h.counts {
		if c > 0 {
			v := h.valueFromIndex(i)
			lo := float64(h.lowestEquivalentValue(v))
			w := float64(h.sizeOfEquivalentValueRange(v))
			buckets = append(buckets, qBucket{lo: lo, width: w, count: c})
		}
	}

	n := float64(h.totalCount)
	quantiles := make([]float64, bins+1)
	quantiles[0] = buckets[0].lo
	quantiles[bins] = buckets[len(buckets)-1].lo

	for bi := 1; bi < bins; bi++ {
		p := probs[bi]
		a := (n + 1.0) * p
		b := (n + 1.0) * (1.0 - p)
		qVal := 0.0
		var cum int64
		prevCDF := 0.0
		for _, bk := range buckets {
			if dequantize == "hdr" && bk.width > 1.0 {
				// Spread samples uniformly across [lo, lo + width)
				for k := int64(0); k < bk.count; k++ {
					cum++
					curCDF := tnRegIncBeta(float64(cum)/n, a, b)
					w := curCDF - prevCDF
					prevCDF = curCDF
					sampleVal := bk.lo + bk.width*(float64(k)+0.5)/float64(bk.count)
					qVal += w * sampleVal
				}
			} else {
				cum += bk.count
				curCDF := tnRegIncBeta(float64(cum)/n, a, b)
				w := curCDF - prevCDF
				prevCDF = curCDF
				qVal += w * bk.lo
			}
		}
		quantiles[bi] = qVal
	}

	// Enforce monotonicity (isotonic correction)
	corrections := 0
	for i := 1; i <= bins; i++ {
		if quantiles[i] < quantiles[i-1] {
			quantiles[i] = quantiles[i-1]
			corrections++
		}
	}

	densities := make([]float64, bins)
	for i := 0; i < bins; i++ {
		dq := quantiles[i+1] - quantiles[i]
		if dq > 0 {
			densities[i] = (probs[i+1] - probs[i]) / dq
		}
	}

	res := &TnQrdeResult{
		probabilities: &TnFloat64Array{data: probs, kind: "Float64Array"},
		quantiles:     &TnFloat64Array{data: quantiles, kind: "Float64Array"},
		densities:     &TnFloat64Array{data: densities, kind: "Float64Array"},
		count:         tnbig.NewInt(h.totalCount),
		bucketCount:   float64(len(buckets)),
		corrections:   float64(corrections),
		dequantize:    dequantize,
	}
	return TnPromiseResolve(res)
}

// --- CBOR v2 Export / Import ---

func tnCborWriteHead(dst []byte, major byte, val uint64) []byte {
	m := major << 5
	switch {
	case val < 24:
		return append(dst, m|byte(val))
	case val <= 0xff:
		return append(dst, m|24, byte(val))
	case val <= 0xffff:
		var b [2]byte
		binary.BigEndian.PutUint16(b[:], uint16(val))
		return append(dst, m|25, b[0], b[1])
	case val <= 0xffffffff:
		var b [4]byte
		binary.BigEndian.PutUint32(b[:], uint32(val))
		return append(dst, m|26, b[0], b[1], b[2], b[3])
	default:
		var b [8]byte
		binary.BigEndian.PutUint64(b[:], val)
		return append(dst, m|27, b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7])
	}
}

func tnCborWriteFloat64(dst []byte, f float64) []byte {
	var b [8]byte
	binary.BigEndian.PutUint64(b[:], math.Float64bits(f))
	return append(dst, (7<<5)|27, b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7])
}

func (h *TnHistogram) export() []byte {
	var buf []byte
	mapLen := uint64(11)
	if h.ewmaEnabled {
		mapLen = 12
	}
	buf = tnCborWriteHead(buf, 5, mapLen)
	// 0: version = 2
	buf = tnCborWriteHead(buf, 0, 0)
	buf = tnCborWriteHead(buf, 0, 2)
	// 1: lowest
	buf = tnCborWriteHead(buf, 0, 1)
	buf = tnCborWriteHead(buf, 0, uint64(h.lowest))
	// 2: highest
	buf = tnCborWriteHead(buf, 0, 2)
	buf = tnCborWriteHead(buf, 0, uint64(h.highest))
	// 3: figures
	buf = tnCborWriteHead(buf, 0, 3)
	buf = tnCborWriteHead(buf, 0, uint64(h.figures))
	// 4: totalCount
	buf = tnCborWriteHead(buf, 0, 4)
	buf = tnCborWriteHead(buf, 0, uint64(h.totalCount))
	// 5: minVal
	buf = tnCborWriteHead(buf, 0, 5)
	buf = tnCborWriteHead(buf, 0, uint64(h.minInt64()))
	// 6: maxVal
	buf = tnCborWriteHead(buf, 0, 6)
	buf = tnCborWriteHead(buf, 0, uint64(h.maxInt64()))
	// 7: exceeds
	buf = tnCborWriteHead(buf, 0, 7)
	buf = tnCborWriteHead(buf, 0, uint64(h.exceeds))
	// 8: conversion_ratio = 1.0
	buf = tnCborWriteHead(buf, 0, 8)
	buf = tnCborWriteFloat64(buf, 1.0)
	// 9: counts_len
	buf = tnCborWriteHead(buf, 0, 9)
	buf = tnCborWriteHead(buf, 0, uint64(h.countsLen))
	// 10: delta-encoded [indexDelta, count, ...]
	var pairs []uint64
	prevIdx := 0
	for i, c := range h.counts {
		if c > 0 {
			pairs = append(pairs, uint64(i-prevIdx), uint64(c))
			prevIdx = i
		}
	}
	buf = tnCborWriteHead(buf, 0, 10)
	buf = tnCborWriteHead(buf, 4, uint64(len(pairs)))
	for _, v := range pairs {
		buf = tnCborWriteHead(buf, 0, v)
	}
	// 11: optional EWMA map
	if h.ewmaEnabled {
		buf = tnCborWriteHead(buf, 0, 11)
		ewmaLen := uint64(4)
		if h.ewmaHasThreshold {
			ewmaLen = 5
		}
		buf = tnCborWriteHead(buf, 5, ewmaLen)
		buf = tnCborWriteHead(buf, 0, 0)
		buf = tnCborWriteFloat64(buf, h.ewmaAlpha)
		buf = tnCborWriteHead(buf, 0, 1)
		buf = tnCborWriteFloat64(buf, h.ewmaMean)
		buf = tnCborWriteHead(buf, 0, 2)
		buf = tnCborWriteFloat64(buf, h.ewmaVar)
		buf = tnCborWriteHead(buf, 0, 3)
		buf = tnCborWriteFloat64(buf, h.ewmaErrorRate)
		if h.ewmaHasThreshold {
			buf = tnCborWriteHead(buf, 0, 4)
			if h.ewmaThreshold >= 0 && h.ewmaThreshold == math.Trunc(h.ewmaThreshold) {
				buf = tnCborWriteHead(buf, 0, uint64(h.ewmaThreshold))
			} else {
				buf = tnCborWriteFloat64(buf, h.ewmaThreshold)
			}
		}
	}
	return buf
}

type tnCborReader struct {
	data []byte
	pos  int
}

func (r *tnCborReader) readHead() (byte, uint64, bool) {
	if r.pos >= len(r.data) {
		return 0, 0, false
	}
	b := r.data[r.pos]
	r.pos++
	major := b >> 5
	ai := b & 31
	switch {
	case ai < 24:
		return major, uint64(ai), true
	case ai == 24:
		if r.pos+1 > len(r.data) {
			return 0, 0, false
		}
		v := uint64(r.data[r.pos])
		r.pos++
		return major, v, true
	case ai == 25:
		if r.pos+2 > len(r.data) {
			return 0, 0, false
		}
		v := uint64(binary.BigEndian.Uint16(r.data[r.pos:]))
		r.pos += 2
		return major, v, true
	case ai == 26:
		if r.pos+4 > len(r.data) {
			return 0, 0, false
		}
		v := uint64(binary.BigEndian.Uint32(r.data[r.pos:]))
		r.pos += 4
		return major, v, true
	case ai == 27:
		if r.pos+8 > len(r.data) {
			return 0, 0, false
		}
		v := binary.BigEndian.Uint64(r.data[r.pos:])
		r.pos += 8
		return major, v, true
	default:
		return 0, 0, false
	}
}

func (r *tnCborReader) readNum() (float64, bool) {
	major, val, ok := r.readHead()
	if !ok {
		return 0, false
	}
	switch major {
	case 0:
		return float64(val), true
	case 1:
		return -1.0 - float64(val), true
	case 7:
		return math.Float64frombits(val), true
	}
	return 0, false
}

func TnImportHistogram(data []byte) *TnHistogram {
	if len(data) == 0 {
		panic(TnNewError("Invalid histogram data"))
	}
	r := &tnCborReader{data: data}
	major, mapLen, ok := r.readHead()
	if !ok || major != 5 {
		panic(TnNewError("Invalid histogram data"))
	}
	var version, lowest, highest, figures, exceeds uint64
	var pairs []uint64
	var hasEwma, hasThreshold bool
	var ewmaAlpha, ewmaMean, ewmaVar, ewmaErr, ewmaThresh float64

	for i := uint64(0); i < mapLen; i++ {
		km, key, ok := r.readHead()
		if !ok || km != 0 {
			panic(TnNewError("Invalid histogram data"))
		}
		switch key {
		case 0:
			_, version, ok = r.readHead()
		case 1:
			_, lowest, ok = r.readHead()
		case 2:
			_, highest, ok = r.readHead()
		case 3:
			_, figures, ok = r.readHead()
		case 4, 5, 6, 9:
			_, _, ok = r.readHead()
		case 7:
			_, exceeds, ok = r.readHead()
		case 8:
			_, ok = r.readNum()
		case 10:
			am, arrLen, aok := r.readHead()
			if !aok || am != 4 || arrLen%2 != 0 {
				panic(TnNewError("Invalid histogram data"))
			}
			pairs = make([]uint64, arrLen)
			for j := uint64(0); j < arrLen; j++ {
				em, ev, eok := r.readHead()
				if !eok || em != 0 {
					panic(TnNewError("Invalid histogram data"))
				}
				pairs[j] = ev
			}
			ok = true
		case 11:
			em, eLen, eok := r.readHead()
			if !eok || em != 5 {
				panic(TnNewError("Invalid histogram data"))
			}
			hasEwma = true
			for j := uint64(0); j < eLen; j++ {
				ekm, ek, ekok := r.readHead()
				if !ekok || ekm != 0 {
					panic(TnNewError("Invalid histogram data"))
				}
				val, vok := r.readNum()
				if !vok {
					panic(TnNewError("Invalid histogram data"))
				}
				switch ek {
				case 0:
					ewmaAlpha = val
				case 1:
					ewmaMean = val
				case 2:
					ewmaVar = val
				case 3:
					ewmaErr = val
				case 4:
					ewmaThresh = val
					hasThreshold = true
				}
			}
			ok = true
		default:
			_, _, ok = r.readHead()
		}
		if !ok {
			panic(TnNewError("Invalid histogram data"))
		}
	}
	if version != 2 || lowest < 1 || figures < 1 || figures > 5 {
		panic(TnNewError("Invalid histogram data"))
	}
	h := tnHdrInit(int64(lowest), int64(highest), int(figures))
	h.exceeds = int64(exceeds)
	idx := 0
	for j := 0; j < len(pairs); j += 2 {
		idx += int(pairs[j])
		if idx < 0 || idx >= h.countsLen {
			panic(TnNewError("Invalid histogram data"))
		}
		h.counts[idx] += int64(pairs[j+1])
	}
	h.recomputeMinMax()
	if hasEwma {
		h.ewmaEnabled = true
		h.ewmaAlpha = ewmaAlpha
		h.ewmaMean = ewmaMean
		h.ewmaVar = ewmaVar
		h.ewmaErrorRate = ewmaErr
		h.ewmaHasThreshold = hasThreshold
		h.ewmaThreshold = ewmaThresh
		h.ewmaCount = h.totalCount
	}
	return h
}

// --- SlidingWindowHistogram ---

type TnSlidingWindowHistogram struct {
	chunks          []*TnHistogram
	chunkCount      int
	curIdx          int
	chunkDuration   time.Duration
	recordsPerChunk int64
	curRecords      int64
	lastRotate      time.Time
	lowest          int64
	highest         int64
	figures         int
}

func TnCreateSlidingWindowHistogram(options interface{}) *TnSlidingWindowHistogram {
	if options == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options\\" argument must be of type object."))
	}
	chunksVal, ok := TnGetValue(options, "chunks").(float64)
	if !ok {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.chunks\\" property must be of type number."))
	}
	if chunksVal < 1 || chunksVal != math.Trunc(chunksVal) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.chunks\\" is out of range."))
	}
	chunkCount := int(chunksVal)

	durVal, hasDur := TnGetValue(options, "chunkDuration").(float64)
	rpcVal, hasRPC := TnGetValue(options, "recordsPerChunk").(float64)
	if hasDur == hasRPC {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'options' must specify exactly one of \\"chunkDuration\\" or \\"recordsPerChunk\\"."))
	}
	var chunkDur time.Duration
	var rpc int64
	if hasDur {
		if !(durVal > 0) || math.IsInf(durVal, 0) {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.chunkDuration\\" is out of range."))
		}
		chunkDur = time.Duration(durVal * float64(time.Millisecond))
	}
	if hasRPC {
		if rpcVal < 1 || rpcVal != math.Trunc(rpcVal) {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.recordsPerChunk\\" is out of range."))
		}
		rpc = int64(rpcVal)
	}

	lowest := int64(1)
	highest := int64(9007199254740991)
	figures := 3
	if v, ok := tnToInt64Val(TnGetValue(options, "lowest")); ok && v >= 1 {
		lowest = v
	}
	if v, ok := tnToInt64Val(TnGetValue(options, "highest")); ok && v >= lowest*2 {
		highest = v
	}
	if v, ok := TnGetValue(options, "figures").(float64); ok && v >= 1 && v <= 5 {
		figures = int(v)
	}

	chunks := make([]*TnHistogram, chunkCount)
	for i := 0; i < chunkCount; i++ {
		chunks[i] = tnHdrInit(lowest, highest, figures)
	}
	return &TnSlidingWindowHistogram{
		chunks:          chunks,
		chunkCount:      chunkCount,
		curIdx:          0,
		chunkDuration:   chunkDur,
		recordsPerChunk: rpc,
		curRecords:      0,
		lastRotate:      time.Now(),
		lowest:          lowest,
		highest:         highest,
		figures:         figures,
	}
}

func (sw *TnSlidingWindowHistogram) rotateByTime() {
	if sw.chunkDuration <= 0 {
		return
	}
	now := time.Now()
	elapsed := int(now.Sub(sw.lastRotate) / sw.chunkDuration)
	if elapsed <= 0 {
		return
	}
	if elapsed >= sw.chunkCount {
		for _, c := range sw.chunks {
			c.reset()
		}
		sw.curIdx = 0
		sw.lastRotate = now
		return
	}
	for i := 0; i < elapsed; i++ {
		sw.curIdx = (sw.curIdx + 1) % sw.chunkCount
		sw.chunks[sw.curIdx].reset()
	}
	sw.lastRotate = sw.lastRotate.Add(time.Duration(elapsed) * sw.chunkDuration)
}

func (sw *TnSlidingWindowHistogram) record(value interface{}) {
	if sw.chunkDuration > 0 {
		sw.rotateByTime()
	} else if sw.recordsPerChunk > 0 && sw.curRecords >= sw.recordsPerChunk {
		sw.curIdx = (sw.curIdx + 1) % sw.chunkCount
		sw.chunks[sw.curIdx].reset()
		sw.curRecords = 0
	}
	sw.chunks[sw.curIdx].record(value)
	sw.curRecords++
}

func (sw *TnSlidingWindowHistogram) snapshot() *TnHistogram {
	if sw.chunkDuration > 0 {
		sw.rotateByTime()
	}
	out := tnHdrInit(sw.lowest, sw.highest, sw.figures)
	for _, c := range sw.chunks {
		out.add(c)
	}
	return out
}

func (sw *TnSlidingWindowHistogram) reset() {
	for _, c := range sw.chunks {
		c.reset()
	}
	sw.curIdx = 0
	sw.curRecords = 0
	sw.lastRotate = time.Now()
}

// monitorEventLoopDelay({ resolution }): samples how late a timer fires on the loop
func TnMonitorEventLoopDelay(options ...interface{}) *TnHistogram {
	h := tnHdrInit(1, 9007199254740991, 3)
	h.interval = 10
	if len(options) > 0 && options[0] != nil {
		if n, ok := TnGetValue(options[0], "resolution").(float64); ok && n > 0 {
			h.interval = n
		}
	}
	return h
}

func (h *TnHistogram) enable() bool {
	if h.enabled {
		return false
	}
	h.enabled = true
	h.stop = make(chan struct{})
	stop := h.stop
	period := time.Duration(h.interval * float64(time.Millisecond))
	go func() {
		ticker := time.NewTicker(period)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case expected := <-ticker.C:
				TnLoopPost(func() {
					if h.enabled {
						ns := time.Since(expected).Nanoseconds()
						if ns < 1 {
							ns = 1
						}
						h.recordInt64(ns, 1)
					}
				})
			}
		}
	}()
	return true
}

func (h *TnHistogram) disable() bool {
	if !h.enabled {
		return false
	}
	h.enabled = false
	close(h.stop)
	return true
}`;

export function registerHistogram(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeHistogram',
    ['encoding/binary', 'math', 'math/big', 'math/bits', 'sort', 'time'],
    ['typedArrays', 'promise', 'error', 'dynamic', 'orderedMap', 'eventLoop'],
    histogramHelper
  );

  defineClass(r, 'perf_hooks.PercentileCI', '*TnPercentileCI', 'class', '', 'value=float64; lower=float64; upper=float64', '', '');
  defineClass(r, 'perf_hooks.MeanCI', '*TnMeanCI', 'class', '', 'mean=float64; lower=float64; upper=float64', '', '');
  defineClass(r, 'perf_hooks.ConfidenceInterval', '*TnConfidenceInterval', 'class', '', 'lower=float64; upper=float64', '', '');
  defineClass(
    r,
    'perf_hooks.WelchResult',
    '*TnWelchResult',
    'class',
    '',
    'tStatistic=float64; degreesOfFreedom=float64; pValue=float64; confidenceInterval=*TnConfidenceInterval',
    '',
    ''
  );
  defineClass(r, 'perf_hooks.MannWhitneyResult', '*TnMannWhitneyResult', 'class', '', 'uStatistic=float64; zScore=float64; pValue=float64', '', '');
  defineClass(
    r,
    'perf_hooks.QrdeResult',
    '*TnQrdeResult',
    'class',
    '',
    'probabilities=*TnFloat64Array; quantiles=*TnFloat64Array; densities=*TnFloat64Array; count=*tnbig.Int; bucketCount=float64; corrections=float64; dequantize=string',
    '',
    ''
  );

  defineClass(
    r,
    'perf_hooks.Histogram',
    '*TnHistogram',
    'class',
    'record=; recordDelta=; recordCorrected=; percentile=float64; percentileBigInt=*tnbig.Int; percentilesAt=*TnMap[float64, float64]; percentileCI=*TnPercentileCI; meanCI=*TnMeanCI; burnRate=float64; welchTest=*TnWelchResult; ksTest=float64; mannWhitneyTest=*TnMannWhitneyResult; cohensD=float64; cliffsD=float64; linearBuckets=*TnMap[float64, float64]; logBuckets=*TnMap[float64, float64]; qrde=chan *TnQrdeResult; diff=*TnHistogram; export=[]byte; reset=; enable=bool; disable=bool; countAt=float64; cdf=float64; ccdf=float64; add=; subtract=; snapshot=*TnHistogram; toJSON=*TnMap[string, interface{}]',
    '',
    'count=float64; countBigInt=*tnbig.Int; min=float64; minBigInt=*tnbig.Int; max=float64; maxBigInt=*tnbig.Int; mean=float64; stddev=float64; exceeds=float64; exceedsBigInt=*tnbig.Int; percentiles=*TnMap[float64, float64]; percentilesBigInt=*TnMap[float64, *tnbig.Int]; skewness=float64; kurtosis=float64; resetCount=float64; ewmaMean=float64; ewmaStddev=float64; ewmaErrorRate=float64',
    ''
  );
  for (const name of ['RecordableHistogram', 'IntervalHistogram']) {
    r.classes[`perf_hooks.${name}`] = r.classes['perf_hooks.Histogram'];
  }

  defineClass(
    r,
    'perf_hooks.SlidingWindowHistogram',
    '*TnSlidingWindowHistogram',
    'class',
    'record=; snapshot=*TnHistogram; reset=',
    '',
    '',
    ''
  );

  const fn = (key: string, result: string, emit: (c: NodeCall) => string) => {
    r.functions[key] = (c: NodeCall) => {
      r.helper('nodeHistogram');
      return emit(c);
    };
    if (result) r.results[key] = result;
  };

  fn('perf_hooks.createHistogram', '*TnHistogram', (c: NodeCall) => `TnCreateHistogram(${c.args.join(', ')})`);
  fn('perf_hooks.createSlidingWindowHistogram', '*TnSlidingWindowHistogram', (c: NodeCall) => `TnCreateSlidingWindowHistogram(${c.args[0] ?? 'nil'})`);
  fn('perf_hooks.importHistogram', '*TnHistogram', (c: NodeCall) => `TnImportHistogram(${c.args[0] ?? 'nil'})`);
  fn('perf_hooks.monitorEventLoopDelay', '*TnHistogram', (c: NodeCall) => `TnMonitorEventLoopDelay(${c.args.join(', ')})`);
}
