// Core compiler logic — kept free of Node-only dependencies (inquirer, execa,
// fs-extra) so this module transpiles with TypeNative itself.
// Node-only interactive prompting lives in src/cli.ts; the self-hosted entry
// point is src/main.ts.
import path from 'node:path';
import * as fs from 'node:fs';
import { platform } from 'node:os';
// TypeNative maps node:child_process to a synchronous Go API whose shape differs
// from Node's; under Node these functions are never called (the CLI wrapper does
// not reach them), so they're accessed through `any` casts for type-checking.
import * as childProcess from 'node:child_process';
import { transpileToNative, GENERATED_HEADER } from './transpiler.js';
import { VERSION } from './version.js';
// The minimum Go toolchain generated code needs
const MIN_GO_MAJOR = 1;
const MIN_GO_MINOR = 26;
export function usage() {
    return `Usage: typenative [options] [file.ts]

Compiles a TypeScript program to a native executable (through Go).

Options:
  --source <file>      The program's entry file (or pass it as the last argument)
  --output <file>      Where to write the executable
  --script             Build and run the program (prompts for code without --source)
  --new                Create a new TypeNative project
  --target <os/arch>   Cross-compile, e.g. linux/amd64, linux/arm64, darwin/arm64,
                       windows/amd64 ('go tool dist list' shows every pair)
  --release            Smaller binary: drop symbols and file paths
  --cover              Build with coverage counters, for go:runtime/coverage
                       (set GOCOVERDIR to also write a profile at exit)
  --emit-go <dir>      Write the generated Go (and go.mod) to <dir> instead of building
  --no-typecheck       Skip type-checking
  -h, --help           Show this help
  -v, --version        Show the TypeNative version

Examples:
  typenative --source main.ts --output bin/app
  typenative main.ts --script
  typenative --source main.ts --output app-linux --target linux/arm64 --release`;
}
// Parses argv (without the executable and script): --flag value and
// --flag=value; one bare argument is the entry file
export function parseCliArgs(argv) {
    const args = {
        help: false,
        version: false,
        newProject: false,
        script: false,
        noTypeCheck: false,
        release: false,
        cover: false,
        source: null,
        output: null,
        target: null,
        emitGo: null,
        error: ''
    };
    for (let i = 0; i < argv.length; i++) {
        let arg = argv[i];
        let value = null;
        const eq = arg.indexOf('=');
        if (arg.startsWith('--') && eq > 0) {
            value = arg.substring(eq + 1);
            arg = arg.substring(0, eq);
        }
        if (arg === '-h' || arg === '--help')
            args.help = true;
        else if (arg === '-v' || arg === '--version')
            args.version = true;
        else if (arg === '--new')
            args.newProject = true;
        else if (arg === '--script')
            args.script = true;
        else if (arg === '--no-typecheck')
            args.noTypeCheck = true;
        else if (arg === '--release')
            args.release = true;
        else if (arg === '--cover')
            args.cover = true;
        else if (arg === '--source' || arg === '--output' || arg === '--target' || arg === '--emit-go') {
            if (value === null) {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    args.error = `${arg} needs a value`;
                    return args;
                }
                i++;
                value = argv[i];
            }
            if (arg === '--source')
                args.source = value;
            else if (arg === '--output')
                args.output = value;
            else if (arg === '--target')
                args.target = value;
            else
                args.emitGo = value;
        }
        else if (arg.startsWith('-')) {
            args.error = `Unknown option: ${arg}`;
            return args;
        }
        else if (args.source === null) {
            // (a typed local: the self-hosted build boxes it into the string | null field)
            const entry = arg;
            args.source = entry;
        }
        else {
            args.error = `Unexpected argument: ${arg}`;
            return args;
        }
    }
    if (args.target !== null && !/^[a-z0-9]+\/[a-z0-9]+$/.test(args.target)) {
        args.error = `--target expects os/arch (like linux/arm64), got '${args.target}'`;
    }
    return args;
}
// This machine's os/arch, as Go names them
function hostTarget() {
    const result = runCommand('go', ['env', 'GOHOSTOS', 'GOHOSTARCH']);
    const lines = (result.stdout ?? '').trim().split('\n');
    return lines.length === 2 ? `${lines[0].trim()}/${lines[1].trim()}` : '';
}
// Checks the Go toolchain on the PATH (and a --target against the pairs it
// supports); returns an error message, '' when usable
export function checkGo(target) {
    const version = runCommand('go', ['version']);
    const found = (version.stdout ?? '').match(/go(\d+)\.(\d+)/);
    if (version.status !== 0 || !found) {
        return `TypeNative needs Go ${MIN_GO_MAJOR}.${MIN_GO_MINOR} or newer on the PATH (https://go.dev/dl/)`;
    }
    const major = Number(found[1]);
    const minor = Number(found[2]);
    if (major < MIN_GO_MAJOR || (major === MIN_GO_MAJOR && minor < MIN_GO_MINOR)) {
        return `TypeNative needs Go ${MIN_GO_MAJOR}.${MIN_GO_MINOR} or newer; found go${major}.${minor} (https://go.dev/dl/)`;
    }
    if (target !== null) {
        const list = runCommand('go', ['tool', 'dist', 'list']);
        const targets = (list.stdout ?? '').split('\n').map((line) => line.trim());
        if (!targets.includes(target)) {
            return `Go can't build for '${target}' ('go tool dist list' shows the os/arch pairs it supports)`;
        }
    }
    return '';
}
// A source path as diagnostics and Go line directives show it: relative to
// the working directory when inside it, else absolute; forward slashes
function displayPath(file) {
    const absolute = path.resolve(file);
    const relative = path.relative(process.cwd(), absolute);
    const inside = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
    return (inside ? relative : absolute).split('\\').join('/');
}
// file:line:column: <label>: message (the position Go's own errors use)
function printDiagnostic(file, line, column, label, message) {
    const position = line > 0 ? `${displayPath(file)}:${line}:${column}` : displayPath(file);
    console.error(`${file ? position + ': ' : ''}${label}: ${message.split('\n').join('\n    ')}`);
}
function plural(count, noun) {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
// golang.org/x/text's transform and unicode/norm packages (String.normalize),
// copied from GOROOT/src/vendor
function vendorXText(outDir) {
    const goroot = runCommand('go', ['env', 'GOROOT']).stdout.trim();
    const source = path.join(goroot, 'src', 'vendor', 'golang.org', 'x', 'text');
    for (const pkg of ['transform', path.join('unicode', 'norm')]) {
        const target = path.join(outDir, 'tnvendor', 'x-text', pkg);
        fs.mkdirSync(target, { recursive: true });
        for (const file of fs.readdirSync(path.join(source, pkg))) {
            if (file.endsWith('.go') && !file.endsWith('_test.go')) {
                fs.writeFileSync(path.join(target, file), fs.readFileSync(path.join(source, pkg, file), 'utf-8'));
            }
        }
    }
    fs.writeFileSync(path.join(outDir, 'tnvendor', 'x-text', 'go.mod'), 'module golang.org/x/text\n\ngo 1.23\n');
    return { path: 'golang.org/x/text', version: 'v0.0.0', dir: './tnvendor/x-text' };
}
// golang.org/x/net's dns/dnsmessage (node:dns record queries), copied from
// GOROOT/src/vendor
function vendorXNet(outDir) {
    const goroot = runCommand('go', ['env', 'GOROOT']).stdout.trim();
    const pkg = path.join('dns', 'dnsmessage');
    const source = path.join(goroot, 'src', 'vendor', 'golang.org', 'x', 'net', pkg);
    const target = path.join(outDir, 'tnvendor', 'x-net', pkg);
    fs.mkdirSync(target, { recursive: true });
    for (const file of fs.readdirSync(source)) {
        if (file.endsWith('.go') && !file.endsWith('_test.go')) {
            fs.writeFileSync(path.join(target, file), fs.readFileSync(path.join(source, file), 'utf-8'));
        }
    }
    fs.writeFileSync(path.join(outDir, 'tnvendor', 'x-net', 'go.mod'), 'module golang.org/x/net\n\ngo 1.23\n');
    return { path: 'golang.org/x/net', version: 'v0.0.0', dir: './tnvendor/x-net' };
}
// node:sqlite's driver, the Brotli codec, fsnotify and their dependencies,
// copied from the package's govendor/ (listed in govendor/manifest.txt); the
// copy is skipped while dist/tnvendor already holds the same version. Returns
// the modules and the Go version their go.mod files declare.
function vendorGoModules(vendorDir, outDir) {
    const manifest = fs.readFileSync(path.join(vendorDir, 'manifest.txt'), 'utf-8');
    let version = '';
    let goVersion = `${MIN_GO_MAJOR}.${MIN_GO_MINOR}`;
    const modules = [];
    for (const line of manifest.split('\n')) {
        const parts = line.trim().split(' ');
        if (parts[0] === 'version')
            version = parts[1];
        if (parts[0] === 'go')
            goVersion = parts[1];
        if (parts[0] === 'module') {
            modules.push({ path: parts[1], version: parts[2], dir: './tnvendor/' + parts[1] });
        }
    }
    const stamp = path.join(outDir, 'tnvendor', 'govendor.version');
    const current = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf-8') : '';
    if (current !== version) {
        for (const mod of modules) {
            const target = path.join(outDir, 'tnvendor', mod.path);
            fs.rmSync(target, { recursive: true, force: true });
            fs.cpSync(path.join(vendorDir, mod.path), target, { recursive: true });
        }
        fs.writeFileSync(stamp, version);
    }
    return { modules: modules, goVersion: goVersion };
}
// Whether generated Go imports a package of a module in govendor/ (node:sqlite's
// driver, zlib's Brotli codec, fs.watch's fsnotify)
function importsVendoredModule(content, vendorDir) {
    const manifest = fs.readFileSync(path.join(vendorDir, 'manifest.txt'), 'utf-8');
    for (const line of manifest.split('\n')) {
        const parts = line.trim().split(' ');
        if (parts[0] !== 'module')
            continue;
        if (content.includes(`"${parts[1]}"`) || content.includes(`"${parts[1]}/`))
            return true;
    }
    return false;
}
function writeGoMod(modules, goVersion, outDir) {
    let requires = '';
    let replaces = '';
    for (const mod of modules) {
        requires += `\t${mod.path} ${mod.version}\n`;
        replaces += `\t${mod.path} => ${mod.dir}\n`;
    }
    const deps = modules.length > 0 ? `\nrequire (\n${requires})\n\nreplace (\n${replaces})\n` : '';
    fs.writeFileSync(path.join(outDir, 'go.mod'), `module tnapp\n\ngo ${goVersion}\n${deps}`);
}
// Run a command and capture its output. Uses Node's spawnSync under Node and a
// Go helper (os/exec) once transpiled — both synchronous, same result shape.
export function runCommand(name, args) {
    const result = childProcess.spawnSync(name, args, { encoding: 'utf-8' });
    return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}
// Run a command with the parent's stdio, returns the exit code.
export function runInherit(name, args = []) {
    const result = childProcess.spawnSync(name, args, { stdio: 'inherit' });
    return result.status;
}
export function createProject(projectName, installDependencies) {
    fs.mkdirSync(projectName, { recursive: true });
    fs.writeFileSync(path.join(projectName, 'main.ts'), `// Write your TypeScript code here\nconsole.log('Hello, World!');\n`);
    fs.writeFileSync(path.join(projectName, 'tsconfig.json'), getTsConfig());
    fs.writeFileSync(path.join(projectName, 'package.json'), getPackageJson(projectName));
    fs.writeFileSync(path.join(projectName, '.gitignore'), getGitIgnore());
    fs.writeFileSync(path.join(projectName, 'README.md'), getReadMe(projectName));
    console.log(`Project "${projectName}" created successfully!`);
    if (installDependencies) {
        console.log('Installing dependencies...');
        // npm --prefix avoids needing cwd support in the subprocess binding
        const result = runCommand('npm', ['install', '--prefix', projectName]);
        if (result.stdout)
            console.log(result.stdout.trim());
        if (result.status !== 0) {
            if (result.stderr)
                console.error(result.stderr.trim());
            process.exit(result.status);
        }
        console.log('Dependencies installed successfully!');
    }
}
// go:embed files are copied next to the Go sources at their paths relative
// to the entry file; this manifest lists the copies for the next build to remove
const EMBED_MANIFEST = '.tnembed';
// A go:embed path from a source file's directory → the pattern relative to
// rootDir (the entry file's directory), or null when nothing matches or it
// leaves rootDir. An `all:` prefix (dotfiles too) is kept.
function resolveEmbedPattern(pattern, fromDir, rootDir) {
    const all = pattern.startsWith('all:');
    const spec = all ? pattern.slice(4) : pattern;
    const rel = path.relative(rootDir, path.resolve(fromDir, spec)).split(path.sep).join('/');
    if (!rel || rel === '..' || rel.startsWith('../') || path.isAbsolute(rel))
        return null;
    if (embedMatches(rootDir, rel).length === 0)
        return null;
    return all ? `all:${rel}` : rel;
}
// The paths under rootDir an embed pattern names: itself, or for a glob
// (* ? [...], in the last element) the matching entries of its directory
function embedMatches(rootDir, rel) {
    const slash = rel.lastIndexOf('/');
    const dir = slash < 0 ? '' : rel.slice(0, slash);
    const base = rel.slice(slash + 1);
    if (!/[*?[]/.test(base))
        return fs.existsSync(path.join(rootDir, rel)) ? [rel] : [];
    if (/[*?[]/.test(dir))
        return [];
    const glob = globRegExp(base);
    let names = [];
    try {
        names = fs.readdirSync(path.join(rootDir, dir));
    }
    catch {
        return [];
    }
    return names.filter((name) => glob.test(name)).map((name) => (dir ? `${dir}/${name}` : name));
}
// Go path.Match syntax for one path element: * ? and [...] ([^...] negates)
function globRegExp(glob) {
    let source = '';
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        const close = c === '[' ? glob.indexOf(']', i + 1) : -1;
        if (c === '*')
            source += '.*';
        else if (c === '?')
            source += '.';
        else if (close > i) {
            source += `[${glob.slice(i + 1, close)}]`;
            i = close;
        }
        else
            source += /[\\^$.|+(){}[\]]/.test(c) ? `\\${c}` : c;
    }
    return new RegExp(`^${source}$`);
}
// Removes the go:embed copies the previous build listed
function removeEmbedCopies(outDir) {
    const manifest = path.join(outDir, EMBED_MANIFEST);
    if (!fs.existsSync(manifest))
        return;
    for (const line of fs.readFileSync(manifest, 'utf-8').split('\n')) {
        if (line.trim())
            fs.rmSync(path.join(outDir, line.trim()), { recursive: true, force: true });
    }
    fs.rmSync(manifest);
}
// Copies the go:embed files into outDir, where go build resolves the
// directives (embed paths can't leave the package directory)
function copyEmbeds(rootDir, patterns, outDir) {
    const copied = [];
    for (const pattern of patterns) {
        const rel = pattern.startsWith('all:') ? pattern.slice(4) : pattern;
        for (const match of embedMatches(rootDir, rel)) {
            const top = match.split('/')[0];
            if ((top === match && match.endsWith('.go')) || ['go.mod', 'go.sum', 'tnvendor', EMBED_MANIFEST].includes(top)) {
                console.error(`error: can't embed '${match}': the generated Go files use that name`);
                process.exit(1);
            }
            fs.cpSync(path.join(rootDir, match), path.join(outDir, match), { recursive: true });
            if (!copied.includes(top))
                copied.push(top);
        }
    }
    if (copied.length > 0)
        fs.writeFileSync(path.join(outDir, EMBED_MANIFEST), `${copied.join('\n')}\n`);
}
export function run(opts) {
    const goError = checkGo(opts.target);
    if (goError) {
        console.error(`error: ${goError}`);
        process.exit(1);
    }
    if (opts.target && opts.scriptMode && opts.target !== hostTarget()) {
        console.error(`error: --script can't run a program built for ${opts.target} on ${hostTarget()}; use --output`);
        process.exit(1);
    }
    const sourcePath = opts.tsCode ? null : opts.source;
    const tsCode = opts.tsCode ? opts.tsCode : fs.readFileSync(sourcePath, 'utf-8');
    fs.mkdirSync('dist', { recursive: true });
    // Code typed into the prompt is saved as dist/script.ts, so it is
    // type-checked and errors point at a real file
    const entryPath = sourcePath ?? 'dist/script.ts';
    if (!sourcePath)
        fs.writeFileSync(entryPath, tsCode);
    if (opts.typeCheck) {
        const typeErrors = opts.typeCheck(entryPath);
        if (typeErrors.length > 0) {
            for (const d of typeErrors)
                printDiagnostic(d.file, d.line, d.column, `error TS${d.code}`, d.message);
            console.error(`\n${plural(typeErrors.length, 'type error')} (--no-typecheck skips the check)`);
            process.exit(1);
        }
    }
    const sourceDir = sourcePath ? path.dirname(path.resolve(sourcePath)) : null;
    // Node's platform names are GOOS names, except win32; OS-specific runtime
    // helpers follow the --target
    const goos = platform() === 'win32' ? 'windows' : platform();
    // (typed locals: the self-hosted build boxes them into the optional fields)
    const goFile = displayPath(path.join(opts.emitGo ?? 'dist', 'code.go'));
    const targetOs = opts.target ? opts.target.split('/')[0] : goos;
    const transpileOptions = {
        parse: opts.parse,
        tsx: !!sourcePath && sourcePath.endsWith('.tsx'),
        fileName: displayPath(entryPath),
        goFile: goFile,
        goos: targetOs,
        cwd: process.cwd().split('\\').join('/')
    };
    if (sourceDir) {
        transpileOptions.readFile = (specifier, fromDir) => {
            const baseDir = fromDir ?? sourceDir;
            // Relative or absolute path → resolve from baseDir
            if (specifier.startsWith('.') || specifier.startsWith('/')) {
                // ES convention: ./x.js may refer to x.ts
                const tsSpecifier = specifier.endsWith('.js')
                    ? specifier.replace(/\.js$/, '.ts')
                    : specifier;
                const tsxSpecifier = specifier.endsWith('.js')
                    ? specifier.replace(/\.js$/, '.tsx')
                    : specifier + '.tsx';
                for (const candidate of [tsSpecifier + '.ts', tsxSpecifier, tsSpecifier, specifier]) {
                    try {
                        const fullPath = path.resolve(baseDir, candidate);
                        return {
                            content: fs.readFileSync(fullPath, 'utf-8'),
                            dir: path.dirname(fullPath),
                            tsx: fullPath.endsWith('.tsx'),
                            path: displayPath(fullPath)
                        };
                    }
                    catch {
                        /* not found */
                    }
                }
                return null;
            }
            // npm package — walk up from baseDir looking for node_modules/<name>
            const resolved = resolveNpmPackage(baseDir, specifier);
            if (!resolved)
                return null;
            let { content, dir } = resolved;
            // Normalize CommonJS to ES module syntax
            if (!content.includes('export ') &&
                (content.includes('module.exports') || content.includes('exports.'))) {
                content = normalizeCjsContent(content);
            }
            // Inject types from a local ambient .d.ts if available
            const typed = tryInjectDtsTypes(content, specifier, sourceDir);
            if (typed)
                content = typed;
            return { content, dir, path: displayPath(resolved.path) };
        };
        transpileOptions.resolveEmbed = (pattern, fromDir) => resolveEmbedPattern(pattern, fromDir ?? sourceDir, sourceDir);
    }
    const transpileResult = transpileToNative(tsCode, transpileOptions);
    if (transpileResult.diagnostics.length > 0) {
        for (const d of transpileResult.diagnostics)
            printDiagnostic(d.file, d.line, d.column, 'error', d.message);
        console.error(`\n${plural(transpileResult.diagnostics.length, 'error')}: TypeNative can't compile this yet`);
        process.exit(1);
    }
    // --emit-go writes to its own directory; builds happen in dist/
    const outDir = opts.emitGo ?? 'dist';
    fs.mkdirSync(outDir, { recursive: true });
    if (opts.emitGo && fs.existsSync(path.join(outDir, 'go.mod'))) {
        const existingMod = fs.readFileSync(path.join(outDir, 'go.mod'), 'utf-8');
        if (!existingMod.startsWith('module tnapp')) {
            console.error(`error: ${outDir}/go.mod belongs to another Go module; --emit-go needs a directory of its own`);
            process.exit(1);
        }
    }
    // Clean up stale Go files from previous runs before writing new ones (in an
    // --emit-go directory, only files TypeNative generated)
    removeEmbedCopies(outDir);
    for (const existing of fs.readdirSync(outDir)) {
        const file = path.join(outDir, existing);
        if (existing === 'go.mod' || existing === 'go.sum')
            fs.rmSync(file);
        else if (existing.endsWith('.go') && (!opts.emitGo || fs.readFileSync(file, 'utf-8').startsWith(GENERATED_HEADER)))
            fs.rmSync(file);
    }
    fs.writeFileSync(path.join(outDir, 'code.go'), transpileResult.main);
    const goFiles = ['code.go'];
    for (const [filename, content] of transpileResult.files) {
        fs.writeFileSync(path.join(outDir, filename), content);
        goFiles.push(filename);
    }
    if (sourceDir)
        copyEmbeds(sourceDir, transpileResult.embeds, outDir);
    // Third-party Go modules the program imports (see vendorXText / vendorGoModules)
    const generated = [transpileResult.main];
    for (const content of transpileResult.files.values())
        generated.push(content);
    const xTextImport = /^import (\w+ )?"golang\.org\/x\/text\//m;
    const modules = [];
    let goVersion = `${MIN_GO_MAJOR}.${MIN_GO_MINOR}`;
    if (generated.some((content) => xTextImport.test(content)))
        modules.push(vendorXText(outDir));
    const xNetImport = /^import (\w+ )?"golang\.org\/x\/net\//m;
    if (generated.some((content) => xNetImport.test(content)))
        modules.push(vendorXNet(outDir));
    if (generated.some((content) => importsVendoredModule(content, opts.vendorDir))) {
        const vendored = vendorGoModules(opts.vendorDir, outDir);
        for (const mod of vendored.modules)
            modules.push(mod);
        goVersion = vendored.goVersion;
    }
    writeGoMod(modules, goVersion, outDir);
    if (opts.emitGo) {
        console.log(`Wrote the Go sources to ${outDir} (build them with: go build -C ${outDir})`);
        return;
    }
    // GOOS / GOARCH for --target: set on this process, which go build inherits
    // (--script only runs host builds, so the program never sees them changed)
    if (opts.target) {
        const pair = opts.target.split('/');
        process.env.GOOS = pair[0];
        process.env.GOARCH = pair[1];
    }
    const exeName = targetOs === 'windows' ? 'native.exe' : 'native';
    const exePath = `dist/${exeName}`;
    const buildArgs = ['build', '-C', 'dist', '-o', exeName];
    // -trimpath gives path-independent cache keys: the vendored packages (sqlite
    // is ~5 MB of Go) compile once, not again for every project directory
    if (opts.release || modules.length > 0)
        buildArgs.push('-trimpath');
    if (opts.release)
        buildArgs.push('-ldflags=-s -w');
    // atomic counters: coverage.ClearCounters refuses the default 'set' mode
    if (opts.cover)
        buildArgs.push('-cover', '-covermode=atomic');
    for (const file of goFiles)
        buildArgs.push(file);
    const buildResult = runCommand('go', buildArgs);
    if (buildResult.status !== 0) {
        // Positions in .ts files come from line directives in the generated Go
        console.error('go build failed:');
        if (buildResult.stderr)
            console.error(buildResult.stderr.trim());
        process.exit(1);
    }
    if (opts.scriptMode) {
        process.exit(runInherit(exePath));
    }
    else if (opts.output) {
        fs.copyFileSync(exePath, opts.output);
        console.log(`Created native executable at: ${opts.output}`);
    }
}
function normalizeCjsContent(code) {
    code = code.replace(/['"]use strict['"];?\n?/g, '');
    code = code.replace(/(?:module\.exports|exports)\.(\w+)\s*=\s*function\s*\w*\s*\(/g, 'export function $1(');
    return code;
}
function tryInjectDtsTypes(jsContent, packageName, searchDir) {
    if (!searchDir)
        return null;
    // Look for *.d.ts files in searchDir that declare the module
    let dtsBody = null;
    try {
        const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        for (const file of fs.readdirSync(searchDir)) {
            if (!file.endsWith('.d.ts'))
                continue;
            const content = fs.readFileSync(path.join(searchDir, file), 'utf-8');
            const match = content.match(new RegExp(`declare module ['"]${escaped}['"][^{]*\\{([\\s\\S]*?)\\}`));
            if (match) {
                dtsBody = match[1];
                break;
            }
        }
    }
    catch {
        return null;
    }
    if (!dtsBody)
        return null;
    // Extract typed function signatures from the .d.ts module body
    const signatures = new Map();
    const sigRegex = /export function (\w+)\(([^)]*)\)\s*:\s*([^\n;]+)/g;
    for (const m of dtsBody.matchAll(sigRegex)) {
        signatures.set(m[1], { params: m[2].trim(), returnType: m[3].trim() });
    }
    if (signatures.size === 0)
        return null;
    // Replace untyped signatures in the normalized JS with typed ones from .d.ts
    return jsContent.replace(/export function (\w+)\s*\(([^)]*)\)/g, (match, name) => {
        const sig = signatures.get(name);
        if (!sig)
            return match;
        return `export function ${name}(${sig.params}): ${sig.returnType}`;
    });
}
function resolveNpmPackage(fromDir, packageName) {
    // Walk up the directory tree looking for node_modules/<packageName>
    let searchDir = fromDir;
    while (true) {
        const pkgDir = path.join(searchDir, 'node_modules', packageName);
        const pkgJsonPath = path.join(pkgDir, 'package.json');
        try {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
            // Build candidate entry points: TypeScript preferred, JavaScript as fallback
            const tsCandidates = [];
            const jsCandidates = [];
            for (const field of ['source', 'main', 'module']) {
                const entry = pkgJson[field];
                if (!entry)
                    continue;
                if (entry.endsWith('.ts'))
                    tsCandidates.push(entry);
                else if (entry.endsWith('.js')) {
                    tsCandidates.push(entry.replace(/\.js$/, '.ts'));
                    jsCandidates.push(entry);
                }
            }
            tsCandidates.push('index.ts', 'src/index.ts');
            jsCandidates.push('index.js', 'src/index.js');
            const candidates = [...tsCandidates, ...jsCandidates];
            for (const candidate of candidates) {
                const fullPath = path.resolve(pkgDir, candidate);
                try {
                    return { content: fs.readFileSync(fullPath, 'utf-8'), dir: path.dirname(fullPath), path: fullPath };
                }
                catch {
                    /* try next candidate */
                }
            }
        }
        catch {
            /* no package.json here, keep walking up */
        }
        const parent = path.dirname(searchDir);
        if (parent === searchDir)
            break; // filesystem root
        searchDir = parent;
    }
    return null;
}
function getPackageJson(projectName) {
    const exeName = platform() === 'win32' ? `${projectName}.exe` : projectName;
    const pckg = {
        name: projectName,
        version: '1.0.0',
        scripts: {
            execute: 'npx typenative --source main.ts --script',
            build: `npx typenative --source main.ts --output bin/${exeName}`
        },
        devDependencies: {
            typenative: `^${VERSION}`
        }
    };
    return JSON.stringify(pckg, null, 2);
}
function getTsConfig() {
    const tsConfig = {
        include: ['**/*.ts'],
        compilerOptions: {
            target: 'es2020',
            lib: [],
            types: ['typenative', 'typenative/go', 'typenative/npm'],
            rootDir: '.',
            strict: true,
            noImplicitAny: true,
            allowSyntheticDefaultImports: true,
            skipLibCheck: true
        }
    };
    return JSON.stringify(tsConfig, null, 2);
}
function getGitIgnore() {
    return `# TypeNative generated files
node_modules/
dist/
bin/
`;
}
function getReadMe(projectName) {
    const exeName = platform() === 'win32' ? `${projectName}.exe` : projectName;
    return `# ${projectName}

This project was created using TypeNative, a tool to transpile TypeScript code to native Go code.

## How to Run

You can write your TypeScript code in the \`main.ts\` file. The code will be transpiled to Go and compiled into a native executable.
You can also run the code directly in script mode using \`npm run execute\`.

## How to Build

1. Install dependencies: \`npm install\` (if not done already)
2. Build the project: \`npm run build\`
3. Run the executable: \`./bin/${exeName}\`
`;
}
