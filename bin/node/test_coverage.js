// node:test coverage (--experimental-test-coverage). Programs that import
// node:test are compiled with counters (see instrumentCoverage in the
// transpiler): one per function body, per block a branch enters (if / else,
// loop bodies, cases, catch, finally, ternary arms) and per continuation
// after a statement that can jump. Each counter belongs to a range
// described like V8's: the script, its functions, their blocks. At the end
// of the run the ranges become Node's summary the way Node turns V8
// coverage into lines, branches and functions: a line counts as many times
// as the innermost range that covers it entirely; a block is a branch only
// when its count differs from the range around it; functions that never ran
// report no branches.
import { defineHelper } from './registry.js';
const coverageHelper = `// node:test coverage
type tnCovFile struct {
	path   string
	lines  int
	ignore []int
	loaded int
}

// kind: 0 the script, 1 a function, 2 a block; counter -1: never counted
// (code after a return), -2: counted as its parent; lines first..last are
// the ones it covers entirely
type tnCovRange struct {
	file    int
	parent  int
	fn      int
	kind    uint8
	counter int
	name    string
	line    int
	first   int
	last    int
	ignored bool
}

func init() {
	tnTestCoverage = tnCoverageCollect
}

// Node's default exclusion: test files
const tnCoverageTestFiles = "**/{test,test/**/*,test-*,*[._-]test}.{js,mjs,cjs,ts,mts,cts,tsx}"

func tnCoverageIncluded(cfg *tnTestConfig, cwd string, path string) bool {
	if strings.Contains(filepath.ToSlash(path), "/node_modules/") {
		return false
	}
	rel, err := filepath.Rel(cwd, path)
	if err != nil {
		rel = path
	}
	matches := func(patterns []string) bool {
		for _, p := range patterns {
			if TnPathNative.matchesGlob(rel, p) || TnPathNative.matchesGlob(path, p) {
				return true
			}
		}
		return false
	}
	if len(cfg.coverageInclude) > 0 && !matches(cfg.coverageInclude) {
		return false
	}
	exclude := cfg.coverageExclude
	if len(exclude) == 0 {
		exclude = []string{tnCoverageTestFiles}
	}
	return !matches(exclude)
}

func tnCoverageCollect(cfg *tnTestConfig) *TnCoverageSummary {
	cwd, _ := os.Getwd()
	s := &TnCoverageSummary{workingDirectory: cwd, totals: &TnCoverageTotals{}}
	// (counter -2: no generated code counts the range; it has its parent's count)
	var count func(i int) float64
	count = func(i int) float64 {
		r := tnCovRanges[i]
		switch {
		case r.kind == 0:
			return 1
		case r.counter == -2:
			return count(r.parent)
		case r.counter < 0:
			return 0
		}
		return float64(tnCov[r.counter])
	}
	reported := make([]bool, len(tnCovRanges))
	functions := map[int]*TnCoverageFunction{}
	byFile := map[int][]int{}
	for i, r := range tnCovRanges {
		byFile[r.file] = append(byFile[r.file], i)
	}
	t := s.totals
	for fi, f := range tnCovFiles {
		if tnCov[f.loaded] == 0 {
			continue
		}
		path := filepath.FromSlash(f.path)
		if !tnCoverageIncluded(cfg, cwd, path) {
			continue
		}
		lines := make([]float64, f.lines+1)
		for i := range lines {
			lines[i] = 1
		}
		ignored := make([]bool, f.lines+1)
		for _, l := range f.ignore {
			if l > 0 && l <= f.lines {
				ignored[l] = true
			}
		}
		file := &TnCoverageFile{path: path, totalLineCount: float64(f.lines)}
		for _, i := range byFile[fi] {
			r := tnCovRanges[i]
			c := count(i)
			switch r.kind {
			case 0:
				reported[i] = true
			case 1:
				// a function shows up once the function around it has run
				outer := tnCovRanges[r.parent].fn
				reported[i] = tnCovRanges[outer].kind == 0 || (reported[outer] && count(outer) > 0)
			case 2:
				reported[i] = reported[r.fn] && count(r.fn) > 0 && count(r.parent) != c
			}
			if !reported[i] {
				continue
			}
			for l := r.first; l <= r.last && l <= f.lines; l++ {
				lines[l] = c
			}
			if r.kind == 1 {
				fn := &TnCoverageFunction{name: r.name, line: float64(r.line), count: c}
				functions[i] = fn
				file.functions = append(file.functions, fn)
				file.totalFunctionCount++
				if c > 0 || r.ignored {
					file.coveredFunctionCount++
				}
			} else if fn := functions[r.fn]; fn != nil && c > fn.count {
				fn.count = c
			}
			// block coverage only for functions that ran
			if r.kind == 1 && c == 0 {
				continue
			}
			file.branches = append(file.branches, &TnCoverageCount{line: float64(r.line), count: c})
			file.totalBranchCount++
			if c != 0 || r.ignored {
				file.coveredBranchCount++
			}
		}
		for l := 1; l <= f.lines; l++ {
			if !ignored[l] {
				file.lines = append(file.lines, &TnCoverageCount{line: float64(l), count: lines[l]})
			}
			if lines[l] > 0 || ignored[l] {
				file.coveredLineCount++
			}
		}
		file.coveredLinePercent = tnCoveragePct(file.coveredLineCount, file.totalLineCount)
		file.coveredBranchPercent = tnCoveragePct(file.coveredBranchCount, file.totalBranchCount)
		file.coveredFunctionPercent = tnCoveragePct(file.coveredFunctionCount, file.totalFunctionCount)
		t.totalLineCount += file.totalLineCount
		t.totalBranchCount += file.totalBranchCount
		t.totalFunctionCount += file.totalFunctionCount
		t.coveredLineCount += file.coveredLineCount
		t.coveredBranchCount += file.coveredBranchCount
		t.coveredFunctionCount += file.coveredFunctionCount
		s.files = append(s.files, file)
	}
	sort.SliceStable(s.files, func(i, j int) bool { return s.files[i].path < s.files[j].path })
	t.coveredLinePercent = tnCoveragePct(t.coveredLineCount, t.totalLineCount)
	t.coveredBranchPercent = tnCoveragePct(t.coveredBranchCount, t.totalBranchCount)
	t.coveredFunctionPercent = tnCoveragePct(t.coveredFunctionCount, t.totalFunctionCount)
	return s
}

func tnCoveragePct(covered float64, total float64) float64 {
	if total == 0 {
		return 100
	}
	return covered / total * 100
}`;
export function registerTestCoverage(r) {
    defineHelper(r, 'nodeTestCoverage', ['os', 'path/filepath', 'sort', 'strings'], ['nodeTest', 'nodePath'], coverageHelper);
}
