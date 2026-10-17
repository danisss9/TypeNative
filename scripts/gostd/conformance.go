package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Rewrite the Go bridges table in conformance.md between
// <!-- go-bridges:start --> and <!-- go-bridges:end --> markers.
// Status per package: ✅ when conformance/lib-go-<path with / → ->.ts
// exists, ⚠️ typed-only, ❌ excluded with the reason from overrides.

var typedOnlyNotes = map[string]string{
	"syscall":                 "Linux types; per-arch constants dropped",
	"log/syslog":              "Unix syslog; no portable probe",
	"database/sql":            "No std driver; needs an external driver",
	"database/sql/driver":     "Driver interfaces; no std driver",
	"crypto/tls":              "TLS client/server; loopback probe is a later phase",
	"crypto/hpke":             "HPKE encryption (RFC 9180)",
	"crypto/mlkem/mlkemtest":  "ML-KEM test vectors helper",
	"debug/buildinfo":         "Build info from executables",
	"debug/dwarf":             "DWARF debug info parsing",
	"debug/elf":               "ELF object files",
	"debug/gosym":             "Go symbol tables",
	"debug/macho":             "Mach-O object files",
	"debug/pe":                "PE (Windows) object files",
	"debug/plan9obj":          "Plan 9 object files",
	"go/types":                "Go type checker",
	"go/importer":             "Export-data type importer",
	"go/build":                "Go package build metadata",
	"go/doc":                  "Go doc extraction",
	"go/doc/comment":          "Doc comment parse/print",
	"go/printer":              "Go AST printer",
	"go/constant":             "Untyped constant values",
	"net/http/cgi":            "CGI handler",
	"net/http/fcgi":           "FastCGI handler",
	"net/http/httptrace":      "HTTP tracing hooks",
	"net/http/pprof":          "pprof HTTP handlers",
	"net/rpc":                 "RPC client/server",
	"net/rpc/jsonrpc":         "JSON-RPC codec",
	"net/smtp":                "SMTP client; needs a server",
	"runtime/metrics":         "Runtime metrics sampling",
	"runtime/pprof":           "Profiling data",
	"runtime/trace":           "Execution tracing",
	"testing":                 "No `go test` harness",
	"testing/cryptotest":      "No `go test` harness",
	"testing/fstest":          "No `go test` harness",
	"testing/iotest":          "No `go test` harness",
	"testing/quick":           "No `go test` harness",
	"testing/slogtest":        "No `go test` harness",
	"testing/synctest":        "No `go test` harness",
	"encoding":                "Shared encoding interfaces",
	"structs":                 "Struct field helpers",
	"io/ioutil":               "Deprecated I/O helpers (Go 1.16)",
	"text/template/parse":     "Template parse trees",
	"log/internal":            "Internal log support",
	"log/slog/internal":       "Internal slog support",
	"net/http/internal":       "Internal HTTP support",
	"reflect":                 "Runtime reflection",
	"hash":                    "Hash function interface",
	"crypto":                  "Crypto constants and algorithm selection",
	"image":                   "2D image interface",
	"index/suffixarray":       "Suffix-array substring search",
	"mime":                    "MIME media types",
	"net/textproto":           "Text protocol I/O",
	"path":                    "Slash-separated paths",
	"regexp/syntax":           "Regexp parse trees",
	"time/tzdata":             "Embedded timezone database",
	"unicode":                 "Unicode tables",
	"unicode/utf16":           "UTF-16 encoding",
	"unicode/utf8":            "UTF-8 encoding",
	"unique":                  "Canonical values",
	"weak":                    "Weak pointers",
	"cmp":                     "Ordered comparison primitives",
	"iter":                    "Range-over-func iterator types",
	"maps":                    "Generic map helpers",
	"slices":                  "Generic slice helpers",
	"expvar":                  "Public process variables",
	"flag":                    "Command-line flag parsing",
	"log":                     "Logging to stderr",
	"context":                 "Cancellation and deadlines",
	"errors":                  "Error creation / wrapping / inspection",
	"fmt":                     "Formatted I/O",
	"io":                      "Core I/O interfaces (Reader/Writer)",
	"io/fs":                   "Filesystem abstraction",
	"sync":                    "Mutexes and wait groups",
	"sync/atomic":             "Atomic operations",
	"time":                    "Time and durations",
	"os":                      "OS files and processes",
	"os/exec":                 "External commands",
	"os/signal":               "Signal notification (`Notify` + `Stop`)",
	"os/user":                 "User lookup",
	"runtime":                 "Runtime introspection",
	"runtime/debug":           "Stack traces and GC stats",
	"sort":                    "Sorting",
	"strconv":                 "String conversions",
	"strings":                 "String utilities",
	"bytes":                   "Byte-slice utilities",
	"bufio":                   "Buffered I/O",
	"path/filepath":           "File paths",
	"regexp":                  "Regular expressions",
	"encoding/base32":         "base32 encoding",
	"encoding/base64":         "base64 encoding",
	"encoding/hex":            "hex encoding",
	"encoding/ascii85":        "ascii85 encoding",
	"encoding/binary":         "Binary packing / varints",
	"encoding/csv":            "CSV read/write",
	"encoding/json":           "JSON encode/decode",
	"encoding/xml":            "XML read/write",
	"encoding/pem":            "PEM encoding",
	"encoding/asn1":           "ASN.1 DER encoding",
	"encoding/gob":            "Go binary serialization",
	"hash/adler32":            "Adler-32 checksum",
	"hash/crc32":              "CRC-32 checksum",
	"hash/crc64":              "CRC-64 checksum",
	"hash/fnv":                "FNV-1 / FNV-1a hash",
	"hash/maphash":            "Seeded string hashing",
	"crypto/md5":              "MD5 hash",
	"crypto/sha1":             "SHA-1 hash",
	"crypto/sha256":           "SHA-224 / SHA-256 hashes",
	"crypto/sha512":           "SHA-384 / SHA-512 family hashes",
	"crypto/sha3":             "SHA-3 / SHAKE hashes",
	"crypto/hmac":             "HMAC keyed hashing",
	"crypto/hkdf":             "HKDF key derivation",
	"crypto/pbkdf2":           "PBKDF2 key derivation",
	"crypto/subtle":           "Constant-time comparison primitives",
	"crypto/rand":             "Cryptographically secure random bytes",
	"crypto/aes":              "AES encryption",
	"crypto/cipher":           "Block cipher modes (GCM, CBC, CTR)",
	"crypto/des":              "DES / triple DES (deprecated)",
	"crypto/rc4":              "RC4 stream cipher (deprecated)",
	"crypto/ed25519":          "Ed25519 signatures",
	"crypto/ecdh":             "ECDH key exchange",
	"crypto/ecdsa":            "ECDSA signatures",
	"crypto/rsa":              "RSA signatures / encryption",
	"crypto/mlkem":            "ML-KEM post-quantum key encapsulation",
	"crypto/x509":             "X.509 certificates and revocation",
	"crypto/x509/pkix":        "X.509 ASN.1/PKIX structures",
	"crypto/elliptic":         "Elliptic curves (legacy; use ecdh/ecdsa)",
	"crypto/fips140":          "FIPS 140-3 mode controls",
	"crypto/dsa":              "DSA signatures (deprecated)",
	"compress/gzip":           "gzip read/write",
	"compress/flate":          "DEFLATE compression",
	"compress/zlib":           "zlib read/write",
	"compress/lzw":            "LZW compression (GIF/PDF/TIFF)",
	"compress/bzip2":          "bzip2 decompression (read-only)",
	"archive/zip":             "ZIP archive read/write",
	"archive/tar":             "tar archive read/write",
	"text/template":           "Text templating",
	"text/tabwriter":          "Aligned text columns",
	"text/scanner":            "Text scanner",
	"html":                    "HTML escaping",
	"html/template":           "HTML templating (auto-escaped)",
	"net/url":                 "URL parsing",
	"net/mail":                "Mail address parsing",
	"net/netip":               "IP address types",
	"mime/multipart":          "Multipart forms",
	"mime/quotedprintable":    "Quoted-printable encoding",
	"net":                     "Sockets (loopback listener)",
	"net/http":                "HTTP client/server (loopback)",
	"net/http/cookiejar":      "Cookie jars (loopback)",
	"net/http/httptest":       "HTTP test servers (loopback)",
	"net/http/httputil":       "HTTP utilities (loopback)",
	"image/color":             "Color types",
	"image/color/palette":     "Standard color palettes",
	"image/draw":              "Image compositing",
	"image/png":               "PNG decode/encode",
	"image/jpeg":              "JPEG decode/encode",
	"image/gif":               "GIF decode/encode",
	"go/format":               "Go source formatting",
	"go/version":              "Go version comparison",
	"go/token":                "Go tokens / positions",
	"go/scanner":              "Go tokenizer",
	"go/parser":               "Go source parser",
	"go/ast":                  "Go syntax tree",
	"go/build/constraint":     "Build-tag constraint parsing",
	"container/list":          "Doubly linked list",
	"container/ring":          "Circular list",
	"container/heap":          "Heap / priority queue",
	"math":                    "Math functions",
	"math/bits":               "Bit operations",
	"math/big":                "Arbitrary-precision arithmetic",
	"math/rand":               "Pseudo-random numbers",
	"math/rand/v2":            "Pseudo-random numbers (v2 API)",
	"math/cmplx":              "Complex math",
	"log/slog":                "Structured logging",
}

func probeName(path string) string {
	return "lib-go-" + strings.ReplaceAll(path, "/", "->") + ".ts"
}

// Probes covering multiple packages: package path → probe files.
var probeMap = map[string][]string{
	"strings":                 {"lib-go-strings.ts"},
	"strconv":                 {"lib-go-strconv.ts"},
	"math":                    {"lib-go-math.ts"},
	"unicode":                 {"lib-go-unicode.ts"},
	"unicode/utf8":            {"lib-go-unicode.ts"},
	"errors":                  {"lib-go-errors.ts"},
	"slices":                  {"lib-go-slices.ts"},
	"cmp":                     {"lib-go-slices.ts"},
	"sort":                    {"lib-go-sort.ts"},
	"time":                    {"lib-go-time.ts"},
	"encoding/base64":         {"lib-go-encoding.ts"},
	"encoding/hex":            {"lib-go-encoding.ts"},
	"crypto/sha256":           {"lib-go-hash.ts", "lib-go-crypto-hash.ts"},
	"hash/crc32":              {"lib-go-hash.ts"},
	"hash/fnv":                {"lib-go-hash.ts"},
	"bytes":                   {"lib-go-bytes.ts"},
	"crypto/sha512":           {"lib-go-crypto-hash.ts"},
	"crypto/md5":              {"lib-go-crypto-hash.ts"},
	"crypto/sha1":             {"lib-go-crypto-hash.ts"},
	"crypto/hmac":             {"lib-go-crypto-hash.ts"},
	"compress/gzip":           {"lib-go-compress-gzip.ts"},
	"io":                      {"lib-go-compress-gzip.ts"},
	"os":                      {"lib-go-os.ts"},
	"path/filepath":           {"lib-go-os.ts", "lib-go-regexp.ts"},
	"context":                 {"lib-go-sync.ts"},
	"sync":                    {"lib-go-sync.ts"},
	"sync/atomic":             {"lib-go-sync.ts"},
	"text/template":           {"lib-go-template.ts"},
	"regexp":                  {"lib-go-regexp.ts"},
	"bufio":                   {"lib-go-bufio.ts"},
	"container/list":          {"lib-go-containers.ts"},
	"container/ring":          {"lib-go-containers.ts"},
	"math/bits":               {"lib-go-math-extra.ts"},
	"math/rand":               {"lib-go-math-extra.ts"},
	"math/rand/v2":            {"lib-go-math-extra.ts"},
	"encoding/csv":            {"lib-go-csv.ts"},
	"log":                     {"lib-go-log.ts"},
	"log/slog":                {"lib-go-log.ts"},
	"net/url":                 {"lib-go-url.ts"},
	"html":                    {"lib-go-url.ts"},
	"image":                   {"lib-go-image.ts"},
	"image/png":               {"lib-go-image.ts"},
	"go/format":               {"lib-go-gotools.ts"},
	"go/version":              {"lib-go-gotools.ts"},
	"go/token":                {"lib-go-gotools.ts"},
	"archive/zip":             {"lib-go-archive.ts"},
	"net/http":                {"lib-go-http.ts"},
	"net/http/httptest":       {"lib-go-http.ts"},
	"index/suffixarray":       {"lib-go-text.ts"},
	"text/tabwriter":          {"lib-go-text.ts"},
	"text/scanner":            {"lib-go-text.ts"},
	"runtime":                 {"lib-go-runtime.ts"},
	"runtime/debug":           {"lib-go-runtime.ts"},
	"expvar":                  {"lib-go-runtime.ts"},
	"crypto/aes":              {"lib-go-crypto-aes.ts"},
	"crypto/cipher":           {"lib-go-crypto-aes.ts"},
	"crypto/rand":             {"lib-go-crypto-aes.ts"},
	"crypto/subtle":           {"lib-go-crypto-aes.ts"},
	"crypto/ed25519":          {"lib-go-ed25519.ts"},
	"encoding/binary":         {"lib-go-encoding-extra.ts"},
	"encoding/pem":            {"lib-go-encoding-extra.ts"},
	"encoding/xml":            {"lib-go-encoding-extra.ts"},
	"mime":                    {"lib-go-encoding-extra.ts"},
	"net/netip":               {"lib-go-encoding-extra.ts"},
	"net/mail":                {"lib-go-encoding-extra.ts"},
	"os/exec":                 {"lib-go-exec.ts"},
	"flag":                    {"lib-go-exec.ts"},
	"encoding/gob":            {"lib-go-gob.ts"},
	"mime/multipart":          {"lib-go-misc.ts"},
	"os/signal":               {"lib-go-misc.ts"},
	"crypto/rsa":              {"lib-go-rsa.ts"},
}

func updateConformance(root string, models []pkgModel) error {
	mdPath := filepath.Join(root, "conformance.md")
	data, err := os.ReadFile(mdPath)
	if err != nil {
		return err
	}
	content := string(data)
	start := "<!-- go-bridges:start -->"
	end := "<!-- go-bridges:end -->"
	si := strings.Index(content, start)
	ei := strings.Index(content, end)
	if si < 0 || ei < 0 || ei < si {
		// Markers absent: leave the file alone.
		return nil
	}
	var b strings.Builder
	b.WriteString("\n| Module | Status | Probe | Notes |\n")
	b.WriteString("| ------ | :----: | ----- | ----- |\n")
	// Sort by path for determinism.
	sort.Slice(models, func(i, j int) bool { return models[i].path < models[j].path })
	for _, m := range models {
		// Probes: the exact file, or a covering multi-package probe.
		candidates := append([]string{probeName(m.path)}, probeMap[m.path]...)
		probeCell := "—"
		status := "⚠️"
		notes := typedOnlyNotes[m.path]
		if notes == "" {
			notes = "Typed and bridged; no probe yet"
		}
		for _, probe := range candidates {
			if _, err := os.Stat(filepath.Join(root, "conformance", probe)); err == nil {
				status = "✅"
				probeCell = fmt.Sprintf("[%s](conformance/%s)", probe, probe)
				break
			}
		}
		fmt.Fprintf(&b, "| `go:%s` | %s | %s | %s |\n", m.path, status, probeCell, notes)
	}
	// Excluded packages.
	for _, p := range []string{"plugin", "unsafe", "runtime/race", "runtime/coverage", "embed"} {
		fmt.Fprintf(&b, "| `go:%s` | ❌ | — | %s |\n", p, excludeReason(p))
	}
	block := b.String()
	content = content[:si+len(start)] + block + content[ei:]
	return os.WriteFile(mdPath, []byte(content), 0644)
}
