// node:fs — the synchronous file system API. Errors are Node's system errors
// (err.code 'ENOENT', err.syscall, err.path, Node's message format).
import { defineClass, defineHelper, defineModule, setResults, encodingOf, getOption, optionIsTrue, isObjectLiteral, isStringNode } from './registry.js';
import { uvErrorMessages, uvErrnoTable } from './errno_tables.js';
// libuv's error names and messages (util.getSystemErrorMap / err.message)
const uvErrnoHelper = `var tnUvErrorList = [][2]string{${uvErrorMessages}}

var tnErrnoDescriptions = func() map[string]string {
	m := map[string]string{}
	for _, e := range tnUvErrorList {
		m[e[0]] = e[1]
	}
	return m
}()`;
const fsErrorsHelper = `// Node-style system errors from Go errors: code, errno, syscall, path
// Node's errno numbers for the target OS (see errno_tables.ts)
var tnErrnoCodes = tnUvErrnos

func tnErrnoCode(err error) string {
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "not a directory"):
		return "ENOTDIR"
	case strings.Contains(msg, "is a directory") || strings.Contains(msg, "incorrect function"):
		return "EISDIR"
	case strings.Contains(msg, "directory not empty") || strings.Contains(msg, "directory is not empty"):
		return "ENOTEMPTY"
	case errors.Is(err, fs.ErrNotExist):
		return "ENOENT"
	case errors.Is(err, fs.ErrExist):
		return "EEXIST"
	case strings.Contains(msg, "operation not permitted"):
		return "EPERM"
	case errors.Is(err, fs.ErrPermission):
		return "EACCES"
	case strings.Contains(msg, "bad file descriptor") || errors.Is(err, fs.ErrClosed):
		return "EBADF"
	case strings.Contains(msg, "too many open files"):
		return "EMFILE"
	case strings.Contains(msg, "invalid argument"):
		return "EINVAL"
	case strings.Contains(msg, "cross-device") || strings.Contains(msg, "different disk drive"):
		return "EXDEV"
	case strings.Contains(msg, "being used by another process"):
		return "EBUSY"
	case strings.Contains(msg, "too many levels of symbolic links"):
		return "ELOOP"
	}
	return "EIO"
}

// ENOENT: no such file or directory, open 'x' (dest: rename 'a' -> 'b')
func TnSysError(err error, syscall string, path string, dest ...string) *TnError {
	code := tnErrnoCode(err)
	msg := code + ": " + tnErrnoDescriptions[code] + ", " + syscall
	if path != "" {
		msg += " '" + path + "'"
	}
	if len(dest) > 0 {
		msg += " -> '" + dest[0] + "'"
	}
	e := TnNodeError("Error", code, msg)
	e.props["errno"] = tnErrnoCodes[code]
	e.props["syscall"] = syscall
	if path != "" {
		e.props["path"] = path
	}
	if len(dest) > 0 {
		e.props["dest"] = dest[0]
	}
	return e
}

func tnFsCheck(err error, syscall string, path string, dest ...string) {
	if err != nil {
		panic(TnSysError(err, syscall, path, dest...))
	}
}`;
const fsHelper = `// node:fs (sync)
func TnReadFileBytes(path string) []byte {
	tnPermRequire("fs.read", path)
	data, err := os.ReadFile(path)
	if err != nil {
		if tnErrnoCode(err) == "EISDIR" {
			panic(TnSysError(err, "read", ""))
		}
		tnFsCheck(err, "open", path)
	}
	return data
}

func TnReadFileString(path string, enc string) string {
	return TnBufferToString(TnReadFileBytes(path), enc)
}

// File contents from a string (in an encoding), a Buffer or any value
func TnFsData(v interface{}, enc string) []byte {
	switch x := v.(type) {
	case string:
		return TnBufferFromString(x, enc)
	case []byte:
		return x
	}
	return []byte(fmt.Sprint(v))
}

func tnOpenFlags(flag string) int {
	switch flag {
	case "r+", "rs+":
		return os.O_RDWR
	case "w":
		return os.O_WRONLY | os.O_CREATE | os.O_TRUNC
	case "wx", "xw":
		return os.O_WRONLY | os.O_CREATE | os.O_EXCL
	case "w+":
		return os.O_RDWR | os.O_CREATE | os.O_TRUNC
	case "wx+", "xw+":
		return os.O_RDWR | os.O_CREATE | os.O_EXCL
	case "a", "as":
		return os.O_WRONLY | os.O_CREATE | os.O_APPEND
	case "ax", "xa":
		return os.O_WRONLY | os.O_CREATE | os.O_APPEND | os.O_EXCL
	case "a+", "as+":
		return os.O_RDWR | os.O_CREATE | os.O_APPEND
	case "ax+", "xa+":
		return os.O_RDWR | os.O_CREATE | os.O_APPEND | os.O_EXCL
	}
	return os.O_RDONLY
}

func TnWriteFile(path string, data []byte, flag string) {
	tnPermRequire("fs.write", path)
	if flag == "" {
		flag = "w"
	}
	f, err := os.OpenFile(path, tnOpenFlags(flag), 0o666)
	tnFsCheck(err, "open", path)
	defer f.Close()
	_, err = f.Write(data)
	tnFsCheck(err, "write", path)
}

func TnMkdir(path string, recursive bool) {
	tnPermRequire("fs.write", path)
	if recursive {
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			panic(TnSysError(fs.ErrExist, "mkdir", path))
		}
		tnFsCheck(os.MkdirAll(path, 0o777), "mkdir", path)
		return
	}
	tnFsCheck(os.Mkdir(path, 0o777), "mkdir", path)
}

type TnDirent struct {
	name       string
	parentPath string
	path       string
	mode       fs.FileMode
}

func (d *TnDirent) isFile() bool          { return d.mode.IsRegular() }
func (d *TnDirent) isDirectory() bool     { return d.mode.IsDir() }
func (d *TnDirent) isSymbolicLink() bool  { return d.mode&fs.ModeSymlink != 0 }
func (d *TnDirent) isFIFO() bool          { return d.mode&fs.ModeNamedPipe != 0 }
func (d *TnDirent) isSocket() bool        { return d.mode&fs.ModeSocket != 0 }
func (d *TnDirent) isBlockDevice() bool   { return d.mode&fs.ModeDevice != 0 && d.mode&fs.ModeCharDevice == 0 }
func (d *TnDirent) isCharacterDevice() bool { return d.mode&fs.ModeCharDevice != 0 }

func tnReadDirEntries(dir string, recursive bool) []*TnDirent {
	tnPermRequire("fs.read", dir)
	entries, err := os.ReadDir(dir)
	tnFsCheck(err, "scandir", dir)
	out := []*TnDirent{}
	for _, e := range entries {
		out = append(out, &TnDirent{name: e.Name(), parentPath: dir, path: dir, mode: e.Type()})
		if recursive && e.IsDir() {
			for _, child := range tnReadDirEntries(filepath.Join(dir, e.Name()), true) {
				out = append(out, child)
			}
		}
	}
	return out
}

func TnReadDirents(dir string, recursive bool) []*TnDirent {
	return tnReadDirEntries(dir, recursive)
}

// readFileSync(path, { buffer }): the file read into the given buffer (its
// leading bytes, a view of the same memory)
func TnReadFileInto(path string, options interface{}) []byte {
	buf, _ := TnGetValue(options, "buffer").([]byte)
	data := TnReadFileBytes(path)
	if len(buf) < len(data) {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.buffer.byteLength' is smaller than the file size of "+strconv.Itoa(len(data))+" bytes. Received "+strconv.Itoa(len(buf))))
	}
	n := copy(buf, data)
	return buf[:n]
}

// An options object's AbortSignal, already aborted: its reason is thrown
func TnFsCheckSignal(options interface{}) {
	if options == nil {
		return
	}
	signal := TnGetValue(options, "signal")
	if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
		panic(TnGetValue(signal, "reason"))
	}
}

// readdirSync names; recursive names are relative to dir
func TnReadDirNames(dir string, recursive bool) []string {
	names := []string{}
	for _, e := range tnReadDirEntries(dir, recursive) {
		rel, err := filepath.Rel(dir, filepath.Join(e.parentPath, e.name))
		if err != nil {
			rel = e.name
		}
		names = append(names, rel)
	}
	return names
}

type TnStats struct {
	dev         float64
	ino         float64
	mode        float64
	nlink       float64
	uid         float64
	gid         float64
	rdev        float64
	size        float64
	blksize     float64
	blocks      float64
	atimeMs     float64
	mtimeMs     float64
	ctimeMs     float64
	birthtimeMs float64
	atime       time.Time
	mtime       time.Time
	ctime       time.Time
	birthtime   time.Time
	fileMode    fs.FileMode
}

func (s *TnStats) isFile() bool          { return s.fileMode.IsRegular() }
func (s *TnStats) isDirectory() bool     { return s.fileMode.IsDir() }
func (s *TnStats) isSymbolicLink() bool  { return s.fileMode&fs.ModeSymlink != 0 }
func (s *TnStats) isFIFO() bool          { return s.fileMode&fs.ModeNamedPipe != 0 }
func (s *TnStats) isSocket() bool        { return s.fileMode&fs.ModeSocket != 0 }
func (s *TnStats) isBlockDevice() bool   { return s.fileMode&fs.ModeDevice != 0 && s.fileMode&fs.ModeCharDevice == 0 }
func (s *TnStats) isCharacterDevice() bool { return s.fileMode&fs.ModeCharDevice != 0 }

// Node's st_mode: file type bits | permission bits
func tnStatMode(m fs.FileMode) float64 {
	mode := uint32(m.Perm())
	switch {
	case m.IsDir():
		mode |= 0o040000
	case m&fs.ModeSymlink != 0:
		mode |= 0o120000
	case m&fs.ModeNamedPipe != 0:
		mode |= 0o010000
	case m&fs.ModeSocket != 0:
		mode |= 0o140000
	case m&fs.ModeCharDevice != 0:
		mode |= 0o020000
	case m&fs.ModeDevice != 0:
		mode |= 0o060000
	default:
		mode |= 0o100000
	}
	if m&fs.ModeSetuid != 0 {
		mode |= 0o4000
	}
	if m&fs.ModeSetgid != 0 {
		mode |= 0o2000
	}
	if m&fs.ModeSticky != 0 {
		mode |= 0o1000
	}
	return float64(mode)
}

// Stats from a FileInfo (Go exposes the modification time portably; the
// other timestamps report it too)
func tnStatsOf(info fs.FileInfo) *TnStats {
	mtime := info.ModTime()
	ms := float64(mtime.UnixNano()) / 1e6
	return &TnStats{
		mode: tnStatMode(info.Mode()), nlink: 1, size: float64(info.Size()), blksize: 4096,
		blocks: math.Ceil(float64(info.Size()) / 512),
		atimeMs: ms, mtimeMs: ms, ctimeMs: ms, birthtimeMs: ms,
		atime: mtime, mtime: mtime, ctime: mtime, birthtime: mtime, fileMode: info.Mode(),
	}
}

func TnStat(path string, lstat bool, throwIfNoEntry bool) *TnStats {
	tnPermRequire("fs.read", path)
	var info fs.FileInfo
	var err error
	syscall := "stat"
	if lstat {
		info, err = os.Lstat(path)
		syscall = "lstat"
	} else {
		info, err = os.Stat(path)
	}
	if err != nil {
		if !throwIfNoEntry && tnErrnoCode(err) == "ENOENT" {
			return nil
		}
		panic(TnSysError(err, syscall, path))
	}
	return tnStatsOf(info)
}

func TnExists(path string) bool {
	tnPermRequire("fs.read", path)
	_, err := os.Stat(path)
	return err == nil
}

func TnRename(from string, to string) {
	tnPermRequire("fs.write", from)
	tnPermRequire("fs.write", to)
	tnFsCheck(os.Rename(from, to), "rename", from, to)
}

// rmSync(path, { recursive, force })
func TnRm(path string, recursive bool, force bool) {
	tnPermRequire("fs.write", path)
	info, err := os.Lstat(path)
	if err != nil {
		if force && tnErrnoCode(err) == "ENOENT" {
			return
		}
		panic(TnSysError(err, "rm", path))
	}
	if info.IsDir() {
		if !recursive {
			panic(TnNodeError("SystemError", "ERR_FS_EISDIR", "Path is a directory: rm returned EISDIR (is a directory) "+path))
		}
		tnFsCheck(os.RemoveAll(path), "rm", path)
		return
	}
	tnFsCheck(os.Remove(path), "rm", path)
}

func TnRmdir(path string, recursive bool) {
	tnPermRequire("fs.write", path)
	if recursive {
		tnFsCheck(os.RemoveAll(path), "rmdir", path)
		return
	}
	info, err := os.Stat(path)
	tnFsCheck(err, "rmdir", path)
	if !info.IsDir() {
		panic(TnSysError(errors.New("not a directory"), "rmdir", path))
	}
	tnFsCheck(os.Remove(path), "rmdir", path)
}

func TnUnlink(path string) {
	tnPermRequire("fs.write", path)
	info, err := os.Lstat(path)
	tnFsCheck(err, "unlink", path)
	if info.IsDir() {
		panic(TnSysError(errors.New("operation not permitted"), "unlink", path))
	}
	tnFsCheck(os.Remove(path), "unlink", path)
}

// copyFileSync(src, dest, mode): mode 1 (COPYFILE_EXCL) fails if dest exists
func TnCopyFile(src string, dst string, mode float64) {
	tnPermRequire("fs.read", src)
	tnPermRequire("fs.write", dst)
	in, err := os.Open(src)
	tnFsCheck(err, "copyfile", src, dst)
	defer in.Close()
	flags := os.O_WRONLY | os.O_CREATE | os.O_TRUNC
	if int(mode)&1 != 0 {
		flags = os.O_WRONLY | os.O_CREATE | os.O_EXCL
	}
	info, _ := in.Stat()
	perm := fs.FileMode(0o666)
	if info != nil {
		perm = info.Mode().Perm()
	}
	out, err := os.OpenFile(dst, flags, perm)
	tnFsCheck(err, "copyfile", src, dst)
	defer out.Close()
	_, err = io.Copy(out, in)
	tnFsCheck(err, "copyfile", src, dst)
}

// cpSync(src, dest, { recursive, force, errorOnExist })
func TnCp(src string, dst string, recursive bool, force bool) {
	tnPermRequire("fs.read", src)
	tnPermRequire("fs.write", dst)
	info, err := os.Stat(src)
	tnFsCheck(err, "cp", src)
	if info.IsDir() {
		if !recursive {
			panic(TnNodeError("SystemError", "ERR_FS_EISDIR", "Recursive option is required to copy a directory: cp returned EISDIR ("+src+" is a directory (not copied)) "+src))
		}
		tnFsCheck(os.MkdirAll(dst, info.Mode().Perm()|0o700), "cp", dst)
		entries, err := os.ReadDir(src)
		tnFsCheck(err, "cp", src)
		for _, e := range entries {
			TnCp(filepath.Join(src, e.Name()), filepath.Join(dst, e.Name()), true, force)
		}
		return
	}
	if !force && TnExists(dst) {
		return
	}
	// like Node, a file copied into a missing directory creates it
	tnFsCheck(os.MkdirAll(filepath.Dir(dst), 0o777), "cp", dst)
	TnCopyFile(src, dst, 0)
}

func TnRealpath(path string) string {
	tnPermRequire("fs.read", path)
	abs, err := filepath.Abs(path)
	tnFsCheck(err, "realpath", path)
	real, err := filepath.EvalSymlinks(abs)
	tnFsCheck(err, "realpath", path)
	return real
}

func TnMkdtemp(prefix string) string {
	tnPermRequire("fs.write", prefix)
	dir, base := filepath.Split(prefix)
	if dir == "" {
		dir = "."
	}
	created, err := os.MkdirTemp(dir, base+"*")
	tnFsCheck(err, "mkdtemp", prefix+"XXXXXX")
	return created
}

func TnTruncate(path string, length float64) {
	tnPermRequire("fs.write", path)
	tnFsCheck(os.Truncate(path, int64(length)), "open", path)
}

func tnFileMode(mode interface{}) fs.FileMode {
	switch m := mode.(type) {
	case float64:
		return fs.FileMode(int(m))
	case string:
		n, _ := strconv.ParseInt(m, 8, 32)
		return fs.FileMode(n)
	}
	return 0o666
}

func TnChmod(path string, mode interface{}) {
	tnPermRequire("fs.write", path)
	tnFsCheck(os.Chmod(path, tnFileMode(mode)), "chmod", path)
}

func tnTimeArg(v interface{}) time.Time {
	switch t := v.(type) {
	case time.Time:
		return t
	case float64:
		return time.Unix(0, int64(t*1e9))
	case string:
		f, _ := strconv.ParseFloat(t, 64)
		return time.Unix(0, int64(f*1e9))
	}
	return time.Now()
}

func TnUtimes(path string, atime interface{}, mtime interface{}) {
	tnPermRequire("fs.write", path)
	tnFsCheck(os.Chtimes(path, tnTimeArg(atime), tnTimeArg(mtime)), "utime", path)
}

func TnSymlink(target string, path string) {
	// (Node needs full read and write access for symlinks)
	tnPermRequire("fs.read", "")
	tnPermRequire("fs.write", "")
	tnFsCheck(os.Symlink(target, path), "symlink", target, path)
}

func TnReadlink(path string) string {
	tnPermRequire("fs.read", path)
	target, err := os.Readlink(path)
	tnFsCheck(err, "readlink", path)
	return target
}

func TnLink(existing string, path string) {
	tnPermRequire("fs.read", existing)
	tnPermRequire("fs.write", path)
	tnFsCheck(os.Link(existing, path), "link", existing, path)
}

// accessSync(path, mode): F_OK 0, R_OK 4, W_OK 2, X_OK 1
func TnAccess(path string, mode float64) {
	tnPermRequire("fs.read", path)
	info, err := os.Stat(path)
	tnFsCheck(err, "access", path)
	perm := info.Mode().Perm()
	m := int(mode)
	if runtime.GOOS == "windows" {
		if m&2 != 0 && perm&0o200 == 0 {
			panic(TnSysError(fs.ErrPermission, "access", path))
		}
		return
	}
	if (m&4 != 0 && perm&0o444 == 0) || (m&2 != 0 && perm&0o222 == 0) || (m&1 != 0 && perm&0o111 == 0) {
		panic(TnSysError(fs.ErrPermission, "access", path))
	}
}

// File descriptors: Node-style integers mapped to Go files
var tnFds = map[int]*os.File{}
var tnNextFd = 3
var tnFdsMu sync.Mutex

func tnFile(fd float64) *os.File {
	tnFdsMu.Lock()
	defer tnFdsMu.Unlock()
	switch int(fd) {
	case 0:
		return os.Stdin
	case 1:
		return os.Stdout
	case 2:
		return os.Stderr
	}
	f, ok := tnFds[int(fd)]
	if !ok {
		panic(TnSysError(fs.ErrClosed, "fstat", ""))
	}
	return f
}

func TnOpen(path string, flags interface{}, mode ...interface{}) float64 {
	flag := "r"
	if s, ok := flags.(string); ok && s != "" {
		flag = s
	}
	// --permission: reads and writes through open() are gated separately
	if flag == "r" || flag == "rs" {
		tnPermRequire("fs.read", path)
	} else {
		tnPermRequire("fs.write", path)
		if strings.Contains(flag, "+") {
			tnPermRequire("fs.read", path)
		}
	}
	perm := fs.FileMode(0o666)
	if len(mode) > 0 && mode[0] != nil {
		perm = tnFileMode(mode[0])
	}
	f, err := os.OpenFile(path, tnOpenFlags(flag), perm)
	tnFsCheck(err, "open", path)
	tnFdsMu.Lock()
	defer tnFdsMu.Unlock()
	fd := tnNextFd
	tnNextFd++
	tnFds[fd] = f
	return float64(fd)
}

func TnClose(fd float64) {
	f := tnFile(fd)
	tnFdsMu.Lock()
	delete(tnFds, int(fd))
	tnFdsMu.Unlock()
	tnFsCheck(f.Close(), "close", "")
}

// readSync(fd, buffer, offset?, length?, position?) → bytes read (0 at EOF)
func TnReadSync(fd float64, buf []byte, args ...interface{}) float64 {
	f := tnFile(fd)
	offset, length := 0, len(buf)
	position := int64(-1)
	nums := []float64{}
	for _, a := range args {
		if n, ok := a.(float64); ok {
			nums = append(nums, n)
		} else if a != nil {
			if p, ok := TnGetValue(a, "position").(float64); ok {
				position = int64(p)
			}
			if o, ok := TnGetValue(a, "offset").(float64); ok {
				offset = int(o)
			}
			if l, ok := TnGetValue(a, "length").(float64); ok {
				length = int(l)
			}
		}
	}
	if len(nums) > 0 {
		offset = int(nums[0])
		length = len(buf) - offset
	}
	if len(nums) > 1 {
		length = int(nums[1])
	}
	if len(nums) > 2 && nums[2] >= 0 {
		position = int64(nums[2])
	}
	if offset+length > len(buf) {
		length = len(buf) - offset
	}
	var n int
	var err error
	if position >= 0 {
		n, err = f.ReadAt(buf[offset:offset+length], position)
	} else {
		n, err = f.Read(buf[offset : offset+length])
	}
	if err != nil && err != io.EOF {
		panic(TnSysError(err, "read", ""))
	}
	return float64(n)
}

// writeSync(fd, string | Buffer, …) → bytes written
func TnWriteSync(fd float64, data interface{}, args ...interface{}) float64 {
	f := tnFile(fd)
	var b []byte
	switch x := data.(type) {
	case string:
		b = []byte(x)
		if len(args) > 0 {
			if pos, ok := args[0].(float64); ok {
				n, err := f.WriteAt(b, int64(pos))
				tnFsCheck(err, "write", "")
				return float64(n)
			}
		}
	case []byte:
		b = x
		nums := []float64{}
		for _, a := range args {
			if n, ok := a.(float64); ok {
				nums = append(nums, n)
			}
		}
		if len(nums) > 0 {
			end := len(b)
			if len(nums) > 1 && int(nums[0]+nums[1]) < end {
				end = int(nums[0] + nums[1])
			}
			b = b[int(nums[0]):end]
		}
		if len(nums) > 2 {
			n, err := f.WriteAt(b, int64(nums[2]))
			tnFsCheck(err, "write", "")
			return float64(n)
		}
	default:
		b = []byte(fmt.Sprint(x))
	}
	n, err := f.Write(b)
	tnFsCheck(err, "write", "")
	return float64(n)
}

func TnFstat(fd float64) *TnStats {
	info, err := tnFile(fd).Stat()
	tnFsCheck(err, "fstat", "")
	return tnStatsOf(info)
}

func TnFsync(fd float64) {
	tnFsCheck(tnFile(fd).Sync(), "fsync", "")
}

func TnFtruncate(fd float64, length float64) {
	tnFsCheck(tnFile(fd).Truncate(int64(length)), "ftruncate", "")
}`;
// Go expression of a file-content argument
function dataArg(call, index, enc) {
    const type = call.types[index];
    if (type === '[]byte')
        return call.args[index];
    if (type === 'string' && (enc === '' || enc === 'utf8' || enc === 'utf-8'))
        return `[]byte(${call.args[index]})`;
    return `TnFsData(${call.args[index]}, ${JSON.stringify(enc)})`;
}
// The `flag` option of writeFileSync
function flagArg(node) {
    const flag = getOption(node, 'flag');
    return flag && isStringNode(flag) ? JSON.stringify(String(flag.text)) : '""';
}
// The result type of readFileSync-like calls: a string when an encoding is given
export function readResultType(call, index) {
    const node = call.nodes[index];
    if (!node || node.kind === 'NullKeyword')
        return '[]byte';
    if (isStringNode(node))
        return 'string';
    if (isObjectLiteral(node))
        return encodingOf(node) ? 'string' : '[]byte';
    return call.types[index] === 'string' ? 'string' : '[]byte';
}
const statfsHelper = `// fs.statfs: the file system holding path
type TnStatFs struct {
	type_  float64
	bsize  float64
	frsize float64
	blocks float64
	bfree  float64
	bavail float64
	files  float64
	ffree  float64
}

func (s *TnStatFs) Get_type_() float64 { return s.type_ }

func TnStatfs(path string) *TnStatFs {
	tnPermRequire("fs.read", path)
	s, err := tnStatfsOS(path)
	tnFsCheck(err, "statfs", path)
	return s
}`;
const statfsOSHelpers = {
    linux: `func tnStatfsOS(path string) (*TnStatFs, error) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return nil, err
	}
	return &TnStatFs{type_: float64(st.Type), bsize: float64(st.Bsize), frsize: float64(st.Frsize), blocks: float64(st.Blocks), bfree: float64(st.Bfree), bavail: float64(st.Bavail), files: float64(st.Files), ffree: float64(st.Ffree)}, nil
}`,
    bsd: `func tnStatfsOS(path string) (*TnStatFs, error) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return nil, err
	}
	return &TnStatFs{type_: float64(st.Type), bsize: float64(st.Bsize), frsize: float64(st.Bsize), blocks: float64(st.Blocks), bfree: float64(st.Bfree), bavail: float64(st.Bavail), files: float64(st.Files), ffree: float64(st.Ffree)}, nil
}`,
    windows: `func tnStatfsOS(path string) (*TnStatFs, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(abs); err != nil {
		return nil, err
	}
	root := filepath.VolumeName(abs) + "\\\\"
	p, err := syscall.UTF16PtrFromString(root)
	if err != nil {
		return nil, err
	}
	var sectorsPerCluster, bytesPerSector, freeClusters, totalClusters uint32
	proc := syscall.NewLazyDLL("kernel32.dll").NewProc("GetDiskFreeSpaceW")
	r, _, callErr := proc.Call(uintptr(unsafe.Pointer(p)), uintptr(unsafe.Pointer(&sectorsPerCluster)), uintptr(unsafe.Pointer(&bytesPerSector)), uintptr(unsafe.Pointer(&freeClusters)), uintptr(unsafe.Pointer(&totalClusters)))
	if r == 0 {
		return nil, callErr
	}
	var freeToCaller, total, free uint64
	procEx := syscall.NewLazyDLL("kernel32.dll").NewProc("GetDiskFreeSpaceExW")
	procEx.Call(uintptr(unsafe.Pointer(p)), uintptr(unsafe.Pointer(&freeToCaller)), uintptr(unsafe.Pointer(&total)), uintptr(unsafe.Pointer(&free)))
	bsize := uint64(sectorsPerCluster) * uint64(bytesPerSector)
	if bsize == 0 {
		bsize = 4096
	}
	return &TnStatFs{bsize: float64(bsize), frsize: float64(bsize), blocks: float64(totalClusters), bfree: float64(freeClusters), bavail: float64(freeToCaller / bsize)}, nil
}`,
    other: `func tnStatfsOS(path string) (*TnStatFs, error) {
	if _, err := os.Stat(path); err != nil {
		return nil, err
	}
	return &TnStatFs{}, nil
}`
};
const globHelper = `// fs.glob: the paths under cwd matching any pattern (minimatch syntax, as
// path.matchesGlob), relative and with the platform's separators
type tnGlobMatch struct {
	rel   string
	entry *TnDirent
}

func tnGlobPatterns(patterns interface{}) []string {
	switch p := patterns.(type) {
	case string:
		return []string{p}
	case []string:
		return p
	case []interface{}:
		out := []string{}
		for _, v := range p {
			out = append(out, TnJSString(v))
		}
		return out
	}
	return nil
}

func tnGlob(patterns interface{}, options interface{}) []tnGlobMatch {
	cwd := "."
	maxDepth := -1
	followSymlinks := false
	var excludeFn interface{}
	var excludeGlobs []string
	if options != nil {
		if c, ok := TnGetValue(options, "cwd").(string); ok && c != "" {
			cwd = c
		}
		if d, ok := TnGetValue(options, "maxDepth").(float64); ok {
			maxDepth = int(d)
		}
		followSymlinks = TnTruthy(TnGetValue(options, "followSymlinks"))
		switch ex := TnGetValue(options, "exclude").(type) {
		case nil:
		case string, []string, []interface{}:
			excludeGlobs = tnGlobPatterns(ex)
		default:
			excludeFn = ex
		}
	}
	type compiled struct{ alts []*regexp.Regexp }
	compile := func(globs []string) []compiled {
		out := []compiled{}
		for _, g := range globs {
			g = strings.ReplaceAll(g, "\\\\", "/")
			c := compiled{}
			for _, alt := range tnExpandBraces(g) {
				if re, err := regexp.Compile(tnGlobRegexp(alt, false)); err == nil {
					c.alts = append(c.alts, re)
				}
			}
			out = append(out, c)
		}
		return out
	}
	includes := compile(tnGlobPatterns(patterns))
	excludes := compile(excludeGlobs)
	matches := func(set []compiled, rel string) bool {
		for _, c := range set {
			for _, re := range c.alts {
				if re.MatchString(rel) {
					return true
				}
			}
		}
		return false
	}
	excluded := func(rel string, name string) bool {
		if excludeFn != nil && (TnTruthy(TnInvoke(excludeFn, name)) || (rel != name && TnTruthy(TnInvoke(excludeFn, filepath.FromSlash(rel))))) {
			return true
		}
		return matches(excludes, rel)
	}
	out := []tnGlobMatch{}
	root, _ := filepath.Abs(cwd)
	if matches(includes, ".") || matches(includes, "") {
		if info, err := os.Stat(cwd); err == nil {
			out = append(out, tnGlobMatch{rel: ".", entry: &TnDirent{name: filepath.Base(root), parentPath: filepath.Dir(root), path: filepath.Dir(root), mode: info.Mode().Type()}})
		}
	}
	var walk func(dir string, relDir string, depth int)
	walk = func(dir string, relDir string, depth int) {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return
		}
		for _, e := range entries {
			rel := e.Name()
			if relDir != "" {
				rel = relDir + "/" + e.Name()
			}
			if excluded(rel, e.Name()) {
				continue
			}
			mode := e.Type()
			isDir := e.IsDir()
			if mode&fs.ModeSymlink != 0 && followSymlinks {
				if info, err := os.Stat(filepath.Join(dir, e.Name())); err == nil && info.IsDir() {
					isDir = true
				}
			}
			if (maxDepth < 0 || depth <= maxDepth) && matches(includes, rel) {
				out = append(out, tnGlobMatch{rel: filepath.FromSlash(rel), entry: &TnDirent{name: e.Name(), parentPath: dir, path: dir, mode: mode}})
			}
			if isDir && (maxDepth < 0 || depth < maxDepth) {
				walk(filepath.Join(dir, e.Name()), rel, depth+1)
			}
		}
	}
	walk(cwd, "", 1)
	return out
}

func TnGlobSync(patterns interface{}, options ...interface{}) []string {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	out := []string{}
	for _, m := range tnGlob(patterns, opts) {
		out = append(out, m.rel)
	}
	return out
}

func TnGlobDirentsSync(patterns interface{}, options interface{}) []*TnDirent {
	out := []*TnDirent{}
	for _, m := range tnGlob(patterns, options) {
		out = append(out, m.entry)
	}
	return out
}

// fs/promises glob: an async iterable of the matches
func TnGlobIter[T any](matches []T) chan T {
	ch := make(chan T, len(matches))
	for _, m := range matches {
		ch <- m
	}
	close(ch)
	return ch
}`;
const FS_CONSTANTS = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4,
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 0o170000,
    S_IFREG: 0o100000,
    S_IFDIR: 0o040000,
    S_IFLNK: 0o120000
};
export function registerFs(r) {
    defineModule(r, 'fs');
    for (const goos of ['linux', 'darwin', 'freebsd', 'openbsd', 'netbsd', 'dragonfly', 'solaris', 'illumos', 'aix']) {
        defineHelper(r, `uvErrnoOS@${goos}`, ['syscall'], [], uvErrnoTable(goos === 'illumos' ? 'solaris' : goos));
    }
    defineHelper(r, 'uvErrnoOS@other', [], [], uvErrnoTable(''));
    defineHelper(r, 'uvErrno', [], ['uvErrnoOS@os'], uvErrnoHelper);
    defineHelper(r, 'fsErrors', ['errors', 'io/fs', 'strings'], ['error', 'uvErrno'], fsErrorsHelper);
    defineHelper(r, 'nodeFs', ['errors', 'fmt', 'io', 'io/fs', 'math', 'os', 'path/filepath', 'runtime', 'strconv', 'strings', 'sync', 'time'], ['fsErrors', 'buffer', 'dynamic', 'nodePerm'], fsHelper);
    defineHelper(r, 'nodeFsStatfsOS@linux', ['syscall'], [], statfsOSHelpers.linux);
    for (const goos of ['darwin', 'freebsd', 'openbsd', 'netbsd', 'dragonfly'])
        defineHelper(r, `nodeFsStatfsOS@${goos}`, ['syscall'], [], statfsOSHelpers.bsd);
    defineHelper(r, 'nodeFsStatfsOS@windows', ['os', 'path/filepath', 'syscall', 'unsafe'], [], statfsOSHelpers.windows);
    defineHelper(r, 'nodeFsStatfsOS@other', ['os'], [], statfsOSHelpers.other);
    defineHelper(r, 'nodeFsStatfs', [], ['nodeFs', 'nodeFsStatfsOS@os'], statfsHelper);
    defineHelper(r, 'nodeFsGlob', ['io/fs', 'os', 'path/filepath', 'regexp', 'strings'], ['nodeFs', 'nodePath', 'nodeInvoke', 'dynamic'], globHelper);
    defineClass(r, 'fs.StatsFs', '*TnStatFs', 'class', '', 'bsize=float64; frsize=float64; blocks=float64; bfree=float64; bavail=float64; files=float64; ffree=float64', 'type=float64', '');
    defineClass(r, 'fs.Stats', '*TnStats', 'class', 'isFile=bool; isDirectory=bool; isSymbolicLink=bool; isFIFO=bool; isSocket=bool; isBlockDevice=bool; isCharacterDevice=bool', 'dev=float64; ino=float64; mode=float64; nlink=float64; uid=float64; gid=float64; rdev=float64; size=float64; blksize=float64; blocks=float64; atimeMs=float64; mtimeMs=float64; ctimeMs=float64; birthtimeMs=float64; atime=time.Time; mtime=time.Time; ctime=time.Time; birthtime=time.Time', 'atimeInstant=*TnTemporalInstant; mtimeInstant=*TnTemporalInstant; ctimeInstant=*TnTemporalInstant; birthtimeInstant=*TnTemporalInstant', '');
    defineClass(r, 'fs.Dirent', '*TnDirent', 'class', 'isFile=bool; isDirectory=bool; isSymbolicLink=bool; isFIFO=bool; isSocket=bool; isBlockDevice=bool; isCharacterDevice=bool', 'name=string; parentPath=string; path=string', '', '');
    const use = () => r.helper('nodeFs');
    const fn = (name, result, emit) => {
        r.functions[`fs.${name}`] = (call) => {
            use();
            return emit(call);
        };
        r.results[`fs.${name}`] = result;
    };
    fn('readFileSync', '', (c) => {
        const enc = encodingOf(c.nodes[1]);
        // (options.buffer: read into that buffer, a view of its leading bytes)
        if (getOption(c.nodes[1], 'buffer')) {
            const read = `TnReadFileInto(${c.args[0]}, ${c.args[1]})`;
            return readResultType(c, 1) === 'string' ? `TnBufferToString(${read}, ${JSON.stringify(enc)})` : read;
        }
        if (readResultType(c, 1) === 'string') {
            const encExpr = enc ? JSON.stringify(enc) : c.types[1] === 'string' ? c.args[1] : '""';
            return `TnReadFileString(${c.args[0]}, ${encExpr})`;
        }
        return `TnReadFileBytes(${c.args[0]})`;
    });
    r.typers['fs.readFileSync'] = (c) => readResultType(c, 1);
    fn('writeFileSync', '', (c) => `TnWriteFile(${c.args[0]}, ${dataArg(c, 1, encodingOf(c.nodes[2]))}, ${flagArg(c.nodes[2])})`);
    fn('appendFileSync', '', (c) => `TnWriteFile(${c.args[0]}, ${dataArg(c, 1, encodingOf(c.nodes[2]))}, "a")`);
    fn('existsSync', 'bool', (c) => `TnExists(${c.args[0]})`);
    fn('mkdirSync', '', (c) => `TnMkdir(${c.args[0]}, ${optionIsTrue(c.nodes[1], 'recursive')})`);
    fn('readdirSync', '', (c) => {
        const recursive = optionIsTrue(c.nodes[1], 'recursive');
        if (optionIsTrue(c.nodes[1], 'withFileTypes'))
            return `TnReadDirents(${c.args[0]}, ${recursive})`;
        return `TnReadDirNames(${c.args[0]}, ${recursive})`;
    });
    r.typers['fs.readdirSync'] = (c) => (optionIsTrue(c.nodes[1], 'withFileTypes') ? '[]*TnDirent' : '[]string');
    const stat = (lstat) => (c) => {
        const option = getOption(c.nodes[1], 'throwIfNoEntry');
        const throwIfNoEntry = option && option.kind === 'FalseKeyword' ? 'false' : 'true';
        // (an aborted options.signal rejects the call)
        if (getOption(c.nodes[1], 'signal'))
            return `func() *TnStats { TnFsCheckSignal(${c.args[1]}); return TnStat(${c.args[0]}, ${lstat}, ${throwIfNoEntry}) }()`;
        return `TnStat(${c.args[0]}, ${lstat}, ${throwIfNoEntry})`;
    };
    fn('statSync', '*TnStats', stat(false));
    fn('lstatSync', '*TnStats', stat(true));
    fn('fstatSync', '*TnStats', (c) => (getOption(c.nodes[1], 'signal') ? `func() *TnStats { TnFsCheckSignal(${c.args[1]}); return TnFstat(${c.args[0]}) }()` : `TnFstat(${c.args[0]})`));
    fn('statfsSync', '*TnStatFs', (c) => {
        r.helper('nodeFsStatfs');
        return `TnStatfs(${c.args[0]})`;
    });
    // openAsBlobSync(path, { type }): the file's bytes as a Blob
    fn('openAsBlobSync', '*TnBlob', (c) => {
        r.helper('nodeStreamWeb');
        const type = getOption(c.nodes[1], 'type');
        return `&TnBlob{data: TnReadFileBytes(${c.args[0]}), type_: ${type ? `TnJSString(TnGetValue(${c.args[1]}, "type"))` : '""'}}`;
    });
    // glob / globSync(pattern | patterns, { cwd, exclude, withFileTypes, followSymlinks, maxDepth })
    fn('globSync', '', (c) => {
        r.helper('nodeFsGlob');
        if (optionIsTrue(c.nodes[1], 'withFileTypes'))
            return `TnGlobDirentsSync(${c.args[0]}, ${c.args[1]})`;
        return `TnGlobSync(${c.args.join(', ')})`;
    });
    r.typers['fs.globSync'] = (c) => (optionIsTrue(c.nodes[1], 'withFileTypes') ? '[]*TnDirent' : '[]string');
    fn('renameSync', '', (c) => `TnRename(${c.args[0]}, ${c.args[1]})`);
    fn('rmSync', '', (c) => `TnRm(${c.args[0]}, ${optionIsTrue(c.nodes[1], 'recursive')}, ${optionIsTrue(c.nodes[1], 'force')})`);
    // (rmdir's recursive option is gone in Node 25: rmSync({ recursive }) removes trees)
    fn('rmdirSync', '', (c) => `TnRmdir(${c.args[0]}, false)`);
    fn('unlinkSync', '', (c) => `TnUnlink(${c.args[0]})`);
    fn('copyFileSync', '', (c) => `TnCopyFile(${c.args[0]}, ${c.args[1]}, ${c.args[2] ?? '0'})`);
    fn('cpSync', '', (c) => {
        const force = getOption(c.nodes[2], 'force');
        return `TnCp(${c.args[0]}, ${c.args[1]}, ${optionIsTrue(c.nodes[2], 'recursive')}, ${force && force.kind === 'FalseKeyword' ? 'false' : 'true'})`;
    });
    fn('realpathSync', 'string', (c) => `TnRealpath(${c.args[0]})`);
    fn('realpathSync.native', 'string', (c) => `TnRealpath(${c.args[0]})`);
    r.objects['fs.realpathSync'] = true;
    fn('mkdtempSync', 'string', (c) => `TnMkdtemp(${c.args[0]})`);
    fn('truncateSync', '', (c) => `TnTruncate(${c.args[0]}, ${c.args[1] ?? '0'})`);
    fn('chmodSync', '', (c) => `TnChmod(${c.args[0]}, ${c.args[1]})`);
    fn('utimesSync', '', (c) => `TnUtimes(${c.args[0]}, ${c.args[1]}, ${c.args[2]})`);
    fn('symlinkSync', '', (c) => `TnSymlink(${c.args[0]}, ${c.args[1]})`);
    fn('readlinkSync', 'string', (c) => `TnReadlink(${c.args[0]})`);
    fn('linkSync', '', (c) => `TnLink(${c.args[0]}, ${c.args[1]})`);
    fn('accessSync', '', (c) => `TnAccess(${c.args[0]}, ${c.args[1] ?? '0'})`);
    fn('openSync', 'float64', (c) => `TnOpen(${c.args[0]}, ${c.args[1] ?? '"r"'}${c.args[2] ? `, ${c.args[2]}` : ''})`);
    fn('closeSync', '', (c) => `TnClose(${c.args[0]})`);
    fn('readSync', 'float64', (c) => `TnReadSync(${c.args.join(', ')})`);
    fn('writeSync', 'float64', (c) => `TnWriteSync(${c.args.join(', ')})`);
    fn('fsyncSync', '', (c) => `TnFsync(${c.args[0]})`);
    fn('ftruncateSync', '', (c) => `TnFtruncate(${c.args[0]}, ${c.args[1] ?? '0'})`);
    setResults(r, 'fs', '');
    r.objects['fs.constants'] = true;
    for (const name of Object.keys(FS_CONSTANTS)) {
        const value = FS_CONSTANTS[name];
        r.values[`fs.constants.${name}`] = (_c) => `float64(${value})`;
        r.valueTypes[`fs.constants.${name}`] = 'float64';
        if (name.endsWith('_OK'))
            continue;
        r.values[`fs.${name}`] = r.values[`fs.constants.${name}`];
        r.valueTypes[`fs.${name}`] = 'float64';
    }
    registerFsAsync(r);
}
const fsAsyncHelper = `// fs callbacks and promises: the work runs on a goroutine; callbacks run on
// the event loop, which stays alive until they have
func tnFsRun[T any](work func() T) (result T, err *TnError) {
	defer func() {
		if rec := recover(); rec != nil {
			if e, ok := rec.(*TnError); ok {
				err = e
			} else {
				err = TnNewError(fmt.Sprint(rec))
			}
		}
	}()
	result = work()
	return
}

func TnFsCallback[T any](work func() T, cb interface{}) {
	TnLoopRef()
	ctx := TnAsyncSnapshot()
	go func() {
		result, err := tnFsRun(work)
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() {
				if err != nil {
					TnInvoke(cb, err)
				} else {
					TnInvoke(cb, nil, result)
				}
			})
		})
	}()
}

func TnFsCallbackVoid(work func(), cb interface{}) {
	TnFsCallback(func() bool { work(); return true }, func(err *TnError, _ bool) { TnInvoke(cb, err) })
}

func TnFsPromise[T any](work func() T) chan T {
	ch := make(chan T, 1)
	TnLoopRef()
	go func() {
		defer TnLoopUnref()
		result, err := tnFsRun(work)
		if err != nil {
			TnReject(ch, err)
			return
		}
		TnAsyncSend(ch, result)
	}()
	return ch
}

func TnFsPromiseVoid(work func()) chan struct{} {
	return TnFsPromise(func() struct{} { work(); return struct{}{} })
}

// fs.exists(path, cb(exists)) (deprecated): no error argument
func TnFsExists(path string, cb interface{}) {
	TnLoopRef()
	ctx := TnAsyncSnapshot()
	go func() {
		// (a path the permission model denies doesn't exist for the callback)
		exists := !tnPermDenied("fs.read", path) && TnExists(path)
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() { TnInvoke(cb, exists) })
		})
	}()
}

// fs/promises FileHandle
type TnFileHandle struct {
	fd     float64
	mu     sync.Mutex
	closed bool
	locked bool
}

type TnFsReadResult struct {
	bytesRead float64
	buffer    []byte
}

type TnFsWriteResult struct {
	bytesWritten float64
	buffer       interface{}
}

func TnOpenHandle(path string, flags interface{}, mode ...interface{}) *TnFileHandle {
	return &TnFileHandle{fd: TnOpen(path, flags, mode...)}
}

func (h *TnFileHandle) Get_fd() float64 { return h.fd }

func (h *TnFileHandle) readAll() []byte {
	f := tnFile(h.fd)
	data, err := io.ReadAll(f)
	tnFsCheck(err, "read", "")
	return data
}

func (h *TnFileHandle) readFileBytes(options ...interface{}) chan []byte {
	return TnFsPromise(func() []byte { return h.readAll() })
}

func (h *TnFileHandle) readFileString(enc string) chan string {
	return TnFsPromise(func() string { return TnBufferToString(h.readAll(), enc) })
}

func (h *TnFileHandle) writeFile(data interface{}, options ...interface{}) chan struct{} {
	return TnFsPromiseVoid(func() { TnWriteSync(h.fd, data) })
}

func (h *TnFileHandle) appendFile(data interface{}, options ...interface{}) chan struct{} {
	return TnFsPromiseVoid(func() { TnWriteSync(h.fd, data) })
}

func (h *TnFileHandle) read(buf []byte, args ...interface{}) chan *TnFsReadResult {
	return TnFsPromise(func() *TnFsReadResult {
		return &TnFsReadResult{bytesRead: TnReadSync(h.fd, buf, args...), buffer: buf}
	})
}

func (h *TnFileHandle) write(data interface{}, args ...interface{}) chan *TnFsWriteResult {
	return TnFsPromise(func() *TnFsWriteResult {
		return &TnFsWriteResult{bytesWritten: TnWriteSync(h.fd, data, args...), buffer: data}
	})
}

func (h *TnFileHandle) stat(options ...interface{}) chan *TnStats {
	return TnFsPromise(func() *TnStats { return TnFstat(h.fd) })
}

func (h *TnFileHandle) truncate(length ...float64) chan struct{} {
	n := 0.0
	if len(length) > 0 {
		n = length[0]
	}
	return TnFsPromiseVoid(func() { TnFtruncate(h.fd, n) })
}

func (h *TnFileHandle) sync() chan struct{} {
	return TnFsPromiseVoid(func() { TnFsync(h.fd) })
}

func (h *TnFileHandle) closeSync() {
	h.mu.Lock()
	if h.closed {
		h.mu.Unlock()
		return
	}
	fd := h.fd
	h.closed = true
	h.fd = -1
	h.mu.Unlock()
	if fd >= 0 {
		TnClose(fd)
	}
}

func (h *TnFileHandle) close() chan struct{} {
	return TnFsPromiseVoid(func() { h.closeSync() })
}

func (h *TnFileHandle) checkAvailable() {
	h.mu.Lock()
	closed, locked := h.closed || h.fd < 0, h.locked
	h.mu.Unlock()
	if closed {
		panic(TnNodeError("Error", "ERR_INVALID_STATE", "The FileHandle is closed"))
	}
	if locked {
		panic(TnNodeError("Error", "ERR_INVALID_STATE", "The FileHandle is locked"))
	}
}

func (h *TnFileHandle) lockForIteration() float64 {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.closed || h.fd < 0 {
		panic(TnNodeError("Error", "ERR_INVALID_STATE", "The FileHandle is closed"))
	}
	if h.locked {
		panic(TnNodeError("Error", "ERR_INVALID_STATE", "The FileHandle is locked"))
	}
	h.locked = true
	return h.fd
}

func (h *TnFileHandle) unlock() {
	h.mu.Lock()
	h.locked = false
	h.mu.Unlock()
}

// FileHandle pull / pullSync / writer (stream/iter)
const tnFsDefaultChunkSize = 131072

type tnFileIterOpts struct {
	autoClose bool
	chunkSize int
	start     int64
	limit     int64
	signal    interface{}
}

func tnFsParseIterOpts(opts interface{}, allowSignal bool) tnFileIterOpts {
	res := tnFileIterOpts{
		chunkSize: tnFsDefaultChunkSize,
		start:     -1,
		limit:     -1,
	}
	if opts == nil {
		return res
	}
	if v := TnGetValue(opts, "autoClose"); v != nil {
		b, ok := v.(bool)
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.autoClose\\" property must be of type boolean"))
		}
		res.autoClose = b
	}
	if v := TnGetValue(opts, "start"); v != nil {
		f, ok := v.(float64)
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.start\\" property must be of type number"))
		}
		if math.IsNaN(f) || math.IsInf(f, 0) || math.Trunc(f) != f || f < 0 {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \\"options.start\\" is out of range. It must be >= 0. Received %v", f)))
		}
		res.start = int64(f)
	}
	if v := TnGetValue(opts, "limit"); v != nil {
		f, ok := v.(float64)
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.limit\\" property must be of type number"))
		}
		if math.IsNaN(f) || math.IsInf(f, 0) || math.Trunc(f) != f || f < 1 {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \\"options.limit\\" is out of range. It must be >= 1. Received %v", f)))
		}
		res.limit = int64(f)
	}
	if v := TnGetValue(opts, "chunkSize"); v != nil {
		f, ok := v.(float64)
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.chunkSize\\" property must be of type number"))
		}
		if math.IsNaN(f) || math.IsInf(f, 0) || math.Trunc(f) != f || f < 1 {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \\"options.chunkSize\\" is out of range. It must be >= 1. Received %v", f)))
		}
		res.chunkSize = int(f)
	}
	if allowSignal {
		if v := TnGetValue(opts, "signal"); v != nil {
			res.signal = v
		}
	}
	return res
}

func tnFsParsePullArgs(args []interface{}, allowSignal bool) ([]interface{}, tnFileIterOpts) {
	var transforms []interface{}
	var optsArg interface{}
	for i, a := range args {
		if a == nil {
			continue
		}
		if reflect.ValueOf(a).Kind() == reflect.Func {
			transforms = append(transforms, a)
			continue
		}
		if i == len(args)-1 {
			optsArg = a
		}
	}
	return transforms, tnFsParseIterOpts(optsArg, allowSignal)
}

func tnFsReadChunk(fd float64, toRead int, pos int64) []byte {
	f := tnFile(fd)
	buf := make([]byte, toRead)
	var n int
	var err error
	if pos >= 0 {
		n, err = f.ReadAt(buf, pos)
	} else {
		n, err = f.Read(buf)
	}
	if err != nil && err != io.EOF {
		tnFsCheck(err, "read", "")
	}
	if n == 0 {
		return nil
	}
	return buf[:n]
}

func tnFsToBytes(v interface{}) ([]byte, *TnError) {
	switch x := v.(type) {
	case []byte:
		return x, nil
	case string:
		return []byte(x), nil
	}
	return nil, TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"chunk\\" argument must be an instance of Uint8Array or a string")
}

func tnFsToByteSlice(v interface{}) ([][]byte, *TnError) {
	switch x := v.(type) {
	case [][]byte:
		return x, nil
	case []string:
		out := make([][]byte, len(x))
		for i, s := range x {
			out[i] = []byte(s)
		}
		return out, nil
	case []interface{}:
		out := make([][]byte, len(x))
		for i, el := range x {
			b, err := tnFsToBytes(el)
			if err != nil {
				return nil, err
			}
			out[i] = b
		}
		return out, nil
	}
	return nil, TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"chunks\\" argument must be an array of Uint8Array or string")
}

func tnFsNormalizeBatch(v interface{}) [][]byte {
	if v == nil {
		return nil
	}
	switch x := v.(type) {
	case [][]byte:
		if len(x) == 0 {
			return nil
		}
		return x
	case []byte:
		return [][]byte{x}
	case string:
		return [][]byte{[]byte(x)}
	case []string:
		if len(x) == 0 {
			return nil
		}
		out := make([][]byte, len(x))
		for i, s := range x {
			out[i] = []byte(s)
		}
		return out
	case []interface{}:
		if len(x) == 0 {
			return nil
		}
		out := make([][]byte, 0, len(x))
		for _, el := range x {
			if b, err := tnFsToBytes(el); err == nil {
				out = append(out, b)
			}
		}
		if len(out) == 0 {
			return nil
		}
		return out
	}
	return nil
}

func tnFsApplyTransforms(transforms []interface{}, batch [][]byte, async bool, signal interface{}) [][]byte {
	if len(transforms) == 0 {
		return batch
	}
	cur := batch
	var arg interface{}
	if cur != nil {
		arg = cur
	}
	for _, tr := range transforms {
		var res interface{}
		if async && signal != nil {
			res = TnInvoke(tr, arg, map[string]interface{}{"signal": signal})
		} else {
			res = TnInvoke(tr, arg)
		}
		if async {
			res = TnAwaitValue(res, false)
		}
		cur = tnFsNormalizeBatch(res)
		if cur == nil {
			return nil
		}
		arg = cur
	}
	return cur
}

func tnFsFlushTransforms(transforms []interface{}, async bool, signal interface{}, emit func([][]byte) bool) {
	for i, tr := range transforms {
		var res interface{}
		if async && signal != nil {
			res = TnInvoke(tr, nil, map[string]interface{}{"signal": signal})
		} else {
			res = TnInvoke(tr, nil)
		}
		if async {
			res = TnAwaitValue(res, false)
		}
		cur := tnFsNormalizeBatch(res)
		if cur != nil && i+1 < len(transforms) {
			cur = tnFsApplyTransforms(transforms[i+1:], cur, async, signal)
		}
		if len(cur) > 0 {
			if !emit(cur) {
				return
			}
		}
	}
}

type TnFilePull struct {
	handle     *TnFileHandle
	opts       tnFileIterOpts
	transforms []interface{}
}

func (h *TnFileHandle) pull(args ...interface{}) *TnFilePull {
	h.checkAvailable()
	transforms, opts := tnFsParsePullArgs(args, true)
	return &TnFilePull{handle: h, opts: opts, transforms: transforms}
}

func (p *TnFilePull) tnIterator() iter.Seq[[][]byte] {
	return func(yield func([][]byte) bool) {
		fd := p.handle.lockForIteration()
		TnLoopRef()
		defer func() {
			p.handle.unlock()
			TnLoopUnref()
			if p.opts.autoClose {
				p.handle.closeSync()
			}
		}()
		pos := p.opts.start
		remaining := p.opts.limit
		readSize := p.opts.chunkSize
		signal := p.opts.signal
		for remaining != 0 {
			if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
				panic(TnGetValue(signal, "reason"))
			}
			toRead := readSize
			if remaining > 0 && int64(toRead) > remaining {
				toRead = int(remaining)
			}
			curPos := pos
			chunk := TnAwait(TnFsPromise(func() []byte {
				return tnFsReadChunk(fd, toRead, curPos)
			}))
			if len(chunk) == 0 {
				break
			}
			if pos >= 0 {
				pos += int64(len(chunk))
			}
			if remaining > 0 {
				remaining -= int64(len(chunk))
			}
			batch := tnFsApplyTransforms(p.transforms, [][]byte{chunk}, true, signal)
			if len(batch) > 0 {
				if !yield(batch) {
					return
				}
			}
		}
		if len(p.transforms) > 0 {
			tnFsFlushTransforms(p.transforms, true, signal, yield)
		}
	}
}

type TnFilePullSync struct {
	handle     *TnFileHandle
	opts       tnFileIterOpts
	transforms []interface{}
}

func (h *TnFileHandle) pullSync(args ...interface{}) *TnFilePullSync {
	h.checkAvailable()
	transforms, opts := tnFsParsePullArgs(args, false)
	return &TnFilePullSync{handle: h, opts: opts, transforms: transforms}
}

func (p *TnFilePullSync) tnIterator() iter.Seq[[][]byte] {
	return func(yield func([][]byte) bool) {
		fd := p.handle.lockForIteration()
		defer func() {
			p.handle.unlock()
			if p.opts.autoClose {
				p.handle.closeSync()
			}
		}()
		pos := p.opts.start
		remaining := p.opts.limit
		readSize := p.opts.chunkSize
		for remaining != 0 {
			toRead := readSize
			if remaining > 0 && int64(toRead) > remaining {
				toRead = int(remaining)
			}
			chunk := tnFsReadChunk(fd, toRead, pos)
			if len(chunk) == 0 {
				break
			}
			if pos >= 0 {
				pos += int64(len(chunk))
			}
			if remaining > 0 {
				remaining -= int64(len(chunk))
			}
			batch := tnFsApplyTransforms(p.transforms, [][]byte{chunk}, false, nil)
			if len(batch) > 0 {
				if !yield(batch) {
					return
				}
			}
		}
		if len(p.transforms) > 0 {
			tnFsFlushTransforms(p.transforms, false, nil, yield)
		}
	}
}

type TnFileWriter struct {
	handle            *TnFileHandle
	fd                float64
	mu                sync.Mutex
	autoClose         bool
	pos               int64
	bytesRemaining    int64
	syncThreshold     int
	totalBytesWritten int64
	closed            bool
	closing           bool
	errored           bool
	released          bool
	errVal            interface{}
	asyncPending      int
	writeTail         chan struct{}
	endDone           chan struct{}
}

func (h *TnFileHandle) writer(options ...interface{}) *TnFileWriter {
	h.checkAvailable()
	var optsArg interface{}
	if len(options) > 0 {
		optsArg = options[0]
	}
	opts := tnFsParseIterOpts(optsArg, false)
	fd := h.lockForIteration()
	TnLoopRef()
	return &TnFileWriter{
		handle:         h,
		fd:             fd,
		autoClose:      opts.autoClose,
		pos:            opts.start,
		bytesRemaining: opts.limit,
		syncThreshold:  opts.chunkSize,
	}
}

func (w *TnFileWriter) releaseLocked() {
	if w.released {
		return
	}
	w.released = true
	w.handle.unlock()
	TnLoopUnref()
	if w.autoClose {
		w.handle.closeSync()
	}
}

func (w *TnFileWriter) writeBufAll(b []byte, position int64) (int64, error) {
	f := tnFile(w.fd)
	var written int64
	for len(b) > 0 {
		var n int
		var err error
		if position >= 0 {
			n, err = f.WriteAt(b, position)
		} else {
			n, err = f.Write(b)
		}
		written += int64(n)
		if position >= 0 {
			position += int64(n)
		}
		b = b[n:]
		if err != nil {
			return written, err
		}
		if n == 0 {
			return written, io.ErrShortWrite
		}
	}
	return written, nil
}

func tnFsWriterSignal(options []interface{}) interface{} {
	if len(options) > 0 && options[0] != nil {
		return TnGetValue(options[0], "signal")
	}
	return nil
}

func tnFsReject[T any](reason interface{}) chan T {
	ch := make(chan T, 1)
	TnReject(ch, reason)
	return ch
}

func (w *TnFileWriter) write(chunk interface{}, options ...interface{}) chan struct{} {
	b, typeErr := tnFsToBytes(chunk)
	if typeErr != nil {
		panic(typeErr)
	}
	signal := tnFsWriterSignal(options)
	w.mu.Lock()
	if w.errored {
		reason := w.errVal
		w.mu.Unlock()
		return tnFsReject[struct{}](reason)
	}
	if w.closed {
		w.mu.Unlock()
		return tnFsReject[struct{}](TnNodeError("TypeError", "ERR_INVALID_STATE", "The writer is closed"))
	}
	if w.closing {
		w.mu.Unlock()
		return tnFsReject[struct{}](TnNodeError("TypeError", "ERR_INVALID_STATE", "The writer is closing"))
	}
	if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
		w.mu.Unlock()
		return tnFsReject[struct{}](TnGetValue(signal, "reason"))
	}
	if w.bytesRemaining >= 0 && int64(len(b)) > w.bytesRemaining {
		rem := w.bytesRemaining
		w.mu.Unlock()
		return tnFsReject[struct{}](TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \\"write\\" is out of range. It must be <= %d bytes. Received %d", rem, len(b))))
	}
	if w.bytesRemaining > 0 {
		w.bytesRemaining -= int64(len(b))
	}
	position := w.pos
	if w.pos >= 0 {
		w.pos += int64(len(b))
	}
	prev := w.writeTail
	next := make(chan struct{})
	w.writeTail = next
	w.asyncPending++
	w.mu.Unlock()

	ch := make(chan struct{}, 1)
	TnLoopRef()
	go func() {
		defer TnLoopUnref()
		if prev != nil {
			<-prev
		}
		defer func() {
			w.mu.Lock()
			w.asyncPending--
			if w.errored && w.asyncPending == 0 {
				w.releaseLocked()
			}
			w.mu.Unlock()
			close(next)
		}()
		w.mu.Lock()
		if w.errored {
			reason := w.errVal
			w.mu.Unlock()
			TnReject(ch, reason)
			return
		}
		w.mu.Unlock()
		if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
			TnReject(ch, TnGetValue(signal, "reason"))
			return
		}
		written, err := w.writeBufAll(b, position)
		w.mu.Lock()
		w.totalBytesWritten += written
		w.mu.Unlock()
		if err != nil {
			TnReject(ch, TnSysError(err, "write", ""))
			return
		}
		TnAsyncSend(ch, struct{}{})
	}()
	return ch
}

func (w *TnFileWriter) writev(chunks interface{}, options ...interface{}) chan struct{} {
	list, typeErr := tnFsToByteSlice(chunks)
	if typeErr != nil {
		panic(typeErr)
	}
	totalSize := 0
	for _, b := range list {
		totalSize += len(b)
	}
	signal := tnFsWriterSignal(options)
	w.mu.Lock()
	if w.errored {
		reason := w.errVal
		w.mu.Unlock()
		return tnFsReject[struct{}](reason)
	}
	if w.closed {
		w.mu.Unlock()
		return tnFsReject[struct{}](TnNodeError("TypeError", "ERR_INVALID_STATE", "The writer is closed"))
	}
	if w.closing {
		w.mu.Unlock()
		return tnFsReject[struct{}](TnNodeError("TypeError", "ERR_INVALID_STATE", "The writer is closing"))
	}
	if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
		w.mu.Unlock()
		return tnFsReject[struct{}](TnGetValue(signal, "reason"))
	}
	if w.bytesRemaining >= 0 && int64(totalSize) > w.bytesRemaining {
		rem := w.bytesRemaining
		w.mu.Unlock()
		return tnFsReject[struct{}](TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \\"writev\\" is out of range. It must be <= %d bytes. Received %d", rem, totalSize)))
	}
	if w.bytesRemaining > 0 {
		w.bytesRemaining -= int64(totalSize)
	}
	position := w.pos
	if w.pos >= 0 {
		w.pos += int64(totalSize)
	}
	prev := w.writeTail
	next := make(chan struct{})
	w.writeTail = next
	w.asyncPending++
	w.mu.Unlock()

	joined := make([]byte, 0, totalSize)
	for _, b := range list {
		joined = append(joined, b...)
	}
	ch := make(chan struct{}, 1)
	TnLoopRef()
	go func() {
		defer TnLoopUnref()
		if prev != nil {
			<-prev
		}
		defer func() {
			w.mu.Lock()
			w.asyncPending--
			if w.errored && w.asyncPending == 0 {
				w.releaseLocked()
			}
			w.mu.Unlock()
			close(next)
		}()
		w.mu.Lock()
		if w.errored {
			reason := w.errVal
			w.mu.Unlock()
			TnReject(ch, reason)
			return
		}
		w.mu.Unlock()
		if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
			TnReject(ch, TnGetValue(signal, "reason"))
			return
		}
		written, err := w.writeBufAll(joined, position)
		w.mu.Lock()
		w.totalBytesWritten += written
		w.mu.Unlock()
		if err != nil {
			TnReject(ch, TnSysError(err, "write", ""))
			return
		}
		TnAsyncSend(ch, struct{}{})
	}()
	return ch
}

func (w *TnFileWriter) writeSync(chunk interface{}) bool {
	b, typeErr := tnFsToBytes(chunk)
	if typeErr != nil {
		panic(typeErr)
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.errored || w.closed || w.closing || w.asyncPending > 0 {
		return false
	}
	if len(b) > w.syncThreshold {
		return false
	}
	if len(b) == 0 {
		return true
	}
	if w.bytesRemaining >= 0 && int64(len(b)) > w.bytesRemaining {
		return false
	}
	written, err := w.writeBufAll(b, w.pos)
	w.totalBytesWritten += written
	if w.pos >= 0 {
		w.pos += written
	}
	if err != nil {
		if written == 0 {
			return false
		}
		panic(TnSysError(err, "write", ""))
	}
	if w.bytesRemaining > 0 {
		w.bytesRemaining -= int64(len(b))
	}
	return true
}

func (w *TnFileWriter) writevSync(chunks interface{}) bool {
	list, typeErr := tnFsToByteSlice(chunks)
	if typeErr != nil {
		panic(typeErr)
	}
	totalSize := 0
	for _, b := range list {
		totalSize += len(b)
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.errored || w.closed || w.closing || w.asyncPending > 0 {
		return false
	}
	if totalSize > w.syncThreshold {
		return false
	}
	if totalSize == 0 {
		return true
	}
	if w.bytesRemaining >= 0 && int64(totalSize) > w.bytesRemaining {
		return false
	}
	joined := make([]byte, 0, totalSize)
	for _, b := range list {
		joined = append(joined, b...)
	}
	written, err := w.writeBufAll(joined, w.pos)
	w.totalBytesWritten += written
	if w.pos >= 0 {
		w.pos += written
	}
	if err != nil {
		if written == 0 {
			return false
		}
		panic(TnSysError(err, "write", ""))
	}
	if w.bytesRemaining > 0 {
		w.bytesRemaining -= int64(totalSize)
	}
	return true
}

func (w *TnFileWriter) end(options ...interface{}) chan float64 {
	signal := tnFsWriterSignal(options)
	w.mu.Lock()
	if w.errored {
		reason := w.errVal
		w.mu.Unlock()
		return tnFsReject[float64](reason)
	}
	if w.closed {
		total := float64(w.totalBytesWritten)
		w.mu.Unlock()
		ch := make(chan float64, 1)
		TnAsyncSend(ch, total)
		return ch
	}
	if w.closing {
		done := w.endDone
		w.mu.Unlock()
		ch := make(chan float64, 1)
		TnLoopRef()
		go func() {
			defer TnLoopUnref()
			<-done
			w.mu.Lock()
			errored, reason, total := w.errored, w.errVal, float64(w.totalBytesWritten)
			w.mu.Unlock()
			if errored {
				TnReject(ch, reason)
			} else {
				TnAsyncSend(ch, total)
			}
		}()
		return ch
	}
	if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
		w.mu.Unlock()
		return tnFsReject[float64](TnGetValue(signal, "reason"))
	}
	w.closing = true
	prev := w.writeTail
	done := make(chan struct{})
	w.endDone = done
	w.mu.Unlock()

	ch := make(chan float64, 1)
	TnLoopRef()
	go func() {
		defer TnLoopUnref()
		if prev != nil {
			<-prev
		}
		w.mu.Lock()
		if w.errored {
			reason := w.errVal
			w.mu.Unlock()
			close(done)
			TnReject(ch, reason)
			return
		}
		w.releaseLocked()
		w.closing = false
		w.closed = true
		total := float64(w.totalBytesWritten)
		w.mu.Unlock()
		close(done)
		TnAsyncSend(ch, total)
	}()
	return ch
}

func (w *TnFileWriter) endSync() float64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.errored || w.closing || w.asyncPending > 0 {
		return -1
	}
	if w.closed {
		return float64(w.totalBytesWritten)
	}
	w.closed = true
	w.releaseLocked()
	return float64(w.totalBytesWritten)
}

func (w *TnFileWriter) fail(reason ...interface{}) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.closed || w.errored {
		return
	}
	w.errored = true
	w.closing = false
	w.closed = true
	if len(reason) > 0 && reason[0] != nil {
		w.errVal = reason[0]
	} else {
		w.errVal = TnNodeError("Error", "ERR_INVALID_STATE", "The writer has failed")
	}
	if w.asyncPending == 0 {
		w.releaseLocked()
	}
}

func (w *TnFileWriter) __dispose() {
	w.fail()
}

func (w *TnFileWriter) __asyncDispose() chan struct{} {
	w.mu.Lock()
	closing, done := w.closing, w.endDone
	w.mu.Unlock()
	if closing && done != nil {
		ch := make(chan struct{}, 1)
		TnLoopRef()
		go func() {
			defer TnLoopUnref()
			<-done
			TnAsyncSend(ch, struct{}{})
		}()
		return ch
	}
	w.fail()
	ch := make(chan struct{}, 1)
	TnAsyncSend(ch, struct{}{})
	return ch
}`;
// Async names → their sync emitters
const FS_ASYNC = [
    'readFile',
    'writeFile',
    'appendFile',
    'mkdir',
    'readdir',
    'stat',
    'lstat',
    'unlink',
    'rm',
    'rmdir',
    'rename',
    'copyFile',
    'cp',
    'access',
    'realpath',
    'mkdtemp',
    'truncate',
    'chmod',
    'utimes',
    'symlink',
    'readlink',
    'link',
    'fstat',
    'statfs',
    'glob'
];
// The call without its trailing callback
function withoutCallback(call) {
    let end = call.nodes.length;
    if (end > 0 && (call.nodes[end - 1].kind === 'ArrowFunction' || call.nodes[end - 1].kind === 'FunctionExpression' || call.types[end - 1].startsWith('func('))) {
        end--;
    }
    return { args: call.args.slice(0, end), nodes: call.nodes.slice(0, end), types: call.types.slice(0, end), recv: call.recv };
}
// The Go result type of a sync fs function for these arguments ('' = none)
function syncResultType(r, syncKey, call) {
    const typer = r.typers[syncKey];
    if (typer)
        return typer(call);
    return r.results[syncKey] ?? '';
}
function registerFsAsync(r) {
    defineModule(r, 'fs/promises');
    r.namespaces['fs.promises'] = 'fs/promises';
    defineHelper(r, 'nodeFsAsync', ['fmt', 'io', 'iter', 'math', 'reflect', 'sync'], ['nodeFs', 'eventLoop', 'promise', 'nodeInvoke'], fsAsyncHelper);
    defineClass(r, 'fs/promises.FileHandle', '*TnFileHandle', 'class', 'writeFile=chan struct{}; appendFile=chan struct{}; read=chan *TnFsReadResult; write=chan *TnFsWriteResult; stat=chan *TnStats; truncate=chan struct{}; sync=chan struct{}; close=chan struct{}; pull=*TnFilePull; pullSync=*TnFilePullSync; writer=*TnFileWriter', '', 'fd=float64', '');
    defineClass(r, 'fs/promises.FilePull', '*TnFilePull', 'class', 'tnIterator=iter.Seq[[][]byte]', '', '', '');
    defineClass(r, 'fs/promises.FilePullSync', '*TnFilePullSync', 'class', 'tnIterator=iter.Seq[[][]byte]', '', '', '');
    defineClass(r, 'fs/promises.FileWriter', '*TnFileWriter', 'class', 'write=chan struct{}; writev=chan struct{}; writeSync=bool; writevSync=bool; end=chan float64; endSync=float64; fail=; __dispose=; __asyncDispose=chan struct{}', '', '', '');
    r.iterators['*TnFilePull'] = 'tnIterator';
    r.iterators['*TnFilePullSync'] = 'tnIterator';
    defineClass(r, 'fs.ReadResult', '*TnFsReadResult', 'class', '', 'bytesRead=float64; buffer=[]byte', '', '');
    defineClass(r, 'fs.WriteResult', '*TnFsWriteResult', 'class', '', 'bytesWritten=float64; buffer=interface{}', '', '');
    r.methods['fs/promises.FileHandle#readFile'] = (c) => {
        const enc = encodingOf(c.nodes[0]);
        if (enc)
            return `${c.recv}.readFileString(${JSON.stringify(enc)})`;
        if (c.types[0] === 'string')
            return `${c.recv}.readFileString(${c.args[0]})`;
        return `${c.recv}.readFileBytes()`;
    };
    r.typers['fs/promises.FileHandle#readFile'] = (c) => (encodingOf(c.nodes[0]) || c.types[0] === 'string' ? 'chan string' : 'chan []byte');
    for (const name of FS_ASYNC) {
        const syncKey = `fs.${name}Sync`;
        // Callback form: fs.readFile(path, [options], (err, data) => …)
        r.functions[`fs.${name}`] = (call) => {
            r.helper('nodeFsAsync');
            const sub = withoutCallback(call);
            const expr = r.functions[syncKey](sub);
            const type = syncResultType(r, syncKey, sub);
            const cb = sub.args.length < call.args.length ? call.args[call.args.length - 1] : 'nil';
            if (!type)
                return `TnFsCallbackVoid(func() { ${expr} }, ${cb})`;
            return `TnFsCallback(func() ${type} { return ${expr} }, ${cb})`;
        };
        r.results[`fs.${name}`] = '';
        r.paramTypers[`fs.${name}`] = (nodes) => {
            const sub = { args: [], nodes: nodes.slice(0, nodes.length - 1), types: [], recv: '' };
            const types = [];
            for (const n of sub.nodes)
                types.push(r.typeOf(n));
            sub.types = types;
            const type = syncResultType(r, syncKey, sub);
            return type ? ['*TnError', type] : ['*TnError'];
        };
        // Promise form: fs/promises / fs.promises
        r.functions[`fs/promises.${name}`] = (call) => {
            r.helper('nodeFsAsync');
            const expr = r.functions[syncKey](call);
            const type = syncResultType(r, syncKey, call);
            if (!type)
                return `TnFsPromiseVoid(func() { ${expr} })`;
            return `TnFsPromise(func() ${type} { return ${expr} })`;
        };
        r.typers[`fs/promises.${name}`] = (call) => {
            const type = syncResultType(r, syncKey, call);
            return type ? `chan ${type}` : 'chan struct{}';
        };
    }
    // fs.openAsBlob(path, options): a promise (no callback form)
    r.functions['fs.openAsBlob'] = (call) => {
        r.helper('nodeFsAsync');
        return `TnFsPromise(func() *TnBlob { return ${r.functions['fs.openAsBlobSync'](call)} })`;
    };
    r.results['fs.openAsBlob'] = 'chan *TnBlob';
    r.functions['fs/promises.glob'] = (call) => {
        r.helper('nodeFsAsync');
        return `TnGlobIter(${r.functions['fs.globSync'](call)})`;
    };
    r.typers['fs/promises.glob'] = (call) => (optionIsTrue(call.nodes[1], 'withFileTypes') ? 'chan *TnDirent' : 'chan string');
    r.functions['fs.exists'] = (call) => {
        r.helper('nodeFsAsync');
        return `TnFsExists(${call.args[0]}, ${call.args[1]})`;
    };
    r.paramTypers['fs.exists'] = (_n) => ['bool'];
    r.functions['fs/promises.open'] = (call) => {
        r.helper('nodeFsAsync');
        return `TnFsPromise(func() *TnFileHandle { return TnOpenHandle(${call.args[0]}, ${call.args[1] ?? '"r"'}${call.args[2] ? `, ${call.args[2]}` : ''}) })`;
    };
    r.results['fs/promises.open'] = 'chan *TnFileHandle';
    r.objects['fs/promises.constants'] = true;
    for (const key of Object.keys(r.values)) {
        if (key.startsWith('fs.constants.')) {
            const name = key.slice('fs.constants.'.length);
            r.values[`fs/promises.constants.${name}`] = r.values[key];
            r.valueTypes[`fs/promises.constants.${name}`] = r.valueTypes[key];
        }
    }
}
