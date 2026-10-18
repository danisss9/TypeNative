// Type-checking for the self-hosted compiler (`tsparser --check`): the same
// program the Node CLI checks with the typescript package (src/typecheck-node.ts),
// built with typescript-go. Prints the errors as a JSON array.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/buke/typescript-go-internal/pkg/ast"
	"github.com/buke/typescript-go-internal/pkg/bundled"
	"github.com/buke/typescript-go-internal/pkg/compiler"
	"github.com/buke/typescript-go-internal/pkg/core"
	"github.com/buke/typescript-go-internal/pkg/diagnostics"
	"github.com/buke/typescript-go-internal/pkg/diagnosticwriter"
	"github.com/buke/typescript-go-internal/pkg/locale"
	"github.com/buke/typescript-go-internal/pkg/scanner"
	"github.com/buke/typescript-go-internal/pkg/tsoptions"
	"github.com/buke/typescript-go-internal/pkg/tspath"
	"github.com/buke/typescript-go-internal/pkg/vfs"
	"github.com/buke/typescript-go-internal/pkg/vfs/osvfs"
)

// checkDiagnostic is one error, in the shape src/parse-native.ts reads
// (file is absolute; line and column are 1-based, 0 for global errors)
type checkDiagnostic struct {
	File    string `json:"file"`
	Line    int    `json:"line"`
	Column  int    `json:"column"`
	Code    int32  `json:"code"`
	Message string `json:"message"`
}

type configHost struct {
	fs  vfs.FS
	cwd string
}

func (h configHost) FS() vfs.FS                 { return h.fs }
func (h configHost) GetCurrentDirectory() string { return h.cwd }

// The bundled declarations that replace the default lib (types/ in the package)
var typenativeTypes = []string{"typenative.d.ts", "typenative-go.d.ts", "typenative-npm.d.ts"}

// TS18003: "No inputs were found in config file" (only the entry is checked)
const noInputsFound = 18003

// runCheck type-checks entry with the nearest tsconfig.json's options (or
// TypeNative's defaults) and prints the errors. The program's roots are the
// entry plus the config's .d.ts files, so other entry points in the same
// project don't redeclare each other's globals.
func runCheck(entry string, typesDir string) {
	wd, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, "getwd:", err)
		os.Exit(1)
	}
	cwd := tspath.NormalizePath(wd)
	fs := bundled.WrapFS(osvfs.FS())
	entryPath := tspath.GetNormalizedAbsolutePath(entry, cwd)
	roots := []string{entryPath}
	out := []checkDiagnostic{}

	var options *core.CompilerOptions
	if configPath := findConfigFile(fs, tspath.GetDirectoryPath(entryPath)); configPath != "" {
		parsed, errs := tsoptions.GetParsedCommandLineOfConfigFile(configPath, &core.CompilerOptions{}, nil, configHost{fs, cwd}, nil)
		for _, d := range errs {
			out = append(out, toCheckDiagnostic(d))
		}
		if parsed == nil {
			printDiagnostics(out)
			return
		}
		for _, d := range parsed.Errors {
			if d.Code() != noInputsFound {
				out = append(out, toCheckDiagnostic(d))
			}
		}
		options = parsed.CompilerOptions()
		for _, name := range parsed.FileNames() {
			if tspath.IsDeclarationFileName(name) && name != entryPath {
				roots = append(roots, name)
			}
		}
	} else {
		options = &core.CompilerOptions{
			Target:                       core.ScriptTargetES2020,
			Module:                       core.ModuleKindESNext,
			ModuleResolution:             core.ModuleResolutionKindBundler,
			Lib:                          []string{},
			Types:                        []string{},
			Strict:                       core.TSTrue,
			NoImplicitAny:                core.TSTrue,
			AllowSyntheticDefaultImports: core.TSTrue,
			AllowImportingTsExtensions:   core.TSTrue,
			Jsx:                          core.JsxEmitPreserve,
			SkipLibCheck:                 core.TSTrue,
		}
		typesPath := tspath.GetNormalizedAbsolutePath(typesDir, cwd)
		for _, name := range typenativeTypes {
			roots = append(roots, tspath.CombinePaths(typesPath, name))
		}
	}
	options.NoEmit = core.TSTrue

	config := tsoptions.NewParsedCommandLine(options, roots, tspath.ComparePathsOptions{
		UseCaseSensitiveFileNames: fs.UseCaseSensitiveFileNames(),
		CurrentDirectory:          cwd,
	})
	host := compiler.NewCompilerHost(cwd, fs, bundled.LibPath(), nil, nil)
	program := compiler.NewProgram(compiler.ProgramOptions{Config: config, Host: host})
	ctx := context.Background()
	for _, d := range compiler.GetDiagnosticsOfAnyProgram(ctx, program, nil, false, program.GetBindDiagnostics, program.GetSemanticDiagnostics) {
		if d.Category() == diagnostics.CategoryError {
			out = append(out, toCheckDiagnostic(d))
		}
	}
	printDiagnostics(out)
}

// findConfigFile walks up from dir to the nearest tsconfig.json
func findConfigFile(fs vfs.FS, dir string) string {
	for {
		candidate := tspath.CombinePaths(dir, "tsconfig.json")
		if fs.FileExists(candidate) {
			return candidate
		}
		parent := tspath.GetDirectoryPath(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}

func toCheckDiagnostic(d *ast.Diagnostic) checkDiagnostic {
	out := checkDiagnostic{
		Code:    d.Code(),
		Message: diagnosticwriter.FlattenDiagnosticMessage(&diagnosticwriter.ASTDiagnostic{Diagnostic: d}, "\n", locale.Default),
	}
	if file := d.File(); file != nil {
		line, character := scanner.GetECMALineAndUTF16CharacterOfPosition(file, d.Pos())
		out.File = file.FileName()
		out.Line = line + 1
		out.Column = int(character) + 1
	}
	return out
}

func printDiagnostics(out []checkDiagnostic) {
	if err := json.NewEncoder(os.Stdout).Encode(out); err != nil {
		fmt.Fprintln(os.Stderr, "encode:", err)
		os.Exit(1)
	}
}
