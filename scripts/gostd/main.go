package main

import (
	"bytes"
	"fmt"
	"go/build"
	"go/importer"
	"go/token"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "gostd:", err)
		os.Exit(1)
	}
}

func run() error {
	root, err := repoRoot()
	if err != nil {
		return err
	}
	pkgs, err := stdPackages()
	if err != nil {
		return err
	}
	// Pin GOOS/GOARCH so the output is deterministic across machines, and
	// disable cgo so packages like net/os/user resolve to their pure-Go
	// stubs instead of failing on machines without a C toolchain.
	build.Default.GOOS = "linux"
	build.Default.GOARCH = "amd64"
	build.Default.CgoEnabled = false
	fset := token.NewFileSet()
	imp := importer.ForCompiler(fset, "source", nil)

	var models []pkgModel
	for _, p := range pkgs {
		tpkg, err := imp.Import(p)
		if err != nil {
			fmt.Fprintf(os.Stderr, "gostd: skip %s: %v\n", p, err)
			continue
		}
		if isExcluded(tpkg.Path()) {
			continue
		}
		models = append(models, extractPackage(tpkg, p))
	}
	sort.Slice(models, func(i, j int) bool { return models[i].path < models[j].path })

	dts := renderDTS(models)
	genTS := renderGenTS(models)

	if err := os.WriteFile(filepath.Join(root, "types", "typenative-go.d.ts"), []byte(dts), 0644); err != nil {
		return err
	}
	goDir := filepath.Join(root, "src", "go")
	if err := os.MkdirAll(goDir, 0755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(goDir, "stdlib.generated.ts"), []byte(genTS), 0644); err != nil {
		return err
	}
	if err := updateConformance(root, models); err != nil {
		return err
	}
	return nil
}

func repoRoot() (string, error) {
	exe, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for dir := exe; ; dir = filepath.Dir(dir) {
		if _, err := os.Stat(filepath.Join(dir, "package.json")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return exe, nil
		}
	}
}

func stdPackages() ([]string, error) {
	cmd := exec.Command("go", "list", "std")
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Env = os.Environ()
	if err := cmd.Run(); err != nil {
		return nil, err
	}
	var pkgs []string
	for _, line := range strings.Split(out.String(), "\n") {
		p := strings.TrimSpace(line)
		if p == "" {
			continue
		}
		if strings.HasPrefix(p, "cmd/") || strings.HasPrefix(p, "vendor/") || strings.HasPrefix(p, "internal/") {
			continue
		}
		// Internal packages (log/internal, net/http/internal, ...) can't be
		// imported from user code.
		if strings.Contains(p, "/internal/") || strings.HasSuffix(p, "/internal") || strings.Contains(p, "/vendor/") {
			continue
		}
		pkgs = append(pkgs, p)
	}
	sort.Strings(pkgs)
	return pkgs, nil
}

func isExcluded(path string) bool {
	return excludeReason(path) != ""
}

// Packages that can't work in a TypeNative program (🚫 in conformance.md).
func excludeReason(path string) string {
	switch path {
	case "plugin":
		return "Loads plugins with `dlopen`: needs cgo and `-buildmode=plugin` (no Windows support)"
	case "unsafe":
		return "Raw pointer arithmetic and memory reinterpretation; TS values have no addresses"
	case "runtime/race":
		return "No public API: the race detector is a build mode (`-race`) that needs cgo"
	case "runtime/cgo":
		return "Links only with cgo and a C toolchain; `Handle` exists to pass Go values to C"
	}
	return ""
}
