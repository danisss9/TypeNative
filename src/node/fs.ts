// node:fs — the synchronous file system API. Errors are Node's system errors
// (err.code 'ENOENT', err.syscall, err.path, Node's message format).

import {
  NodeRegistry,
  NodeCall,
  defineClass,
  defineHelper,
  defineModule,
  setResults,
  encodingOf,
  getOption,
  optionIsTrue,
  isObjectLiteral,
  isStringNode
} from './registry.js';

const fsErrorsHelper = `// Node-style system errors from Go errors: code, errno, syscall, path
var tnErrnoCodes = map[string]float64{
	"EPERM": -1, "ENOENT": -2, "EIO": -5, "EBADF": -9, "EACCES": -13, "EBUSY": -16, "EEXIST": -17,
	"EXDEV": -18, "ENOTDIR": -20, "EISDIR": -21, "EINVAL": -22, "EMFILE": -24, "ENOSPC": -28,
	"ENOTEMPTY": -39, "ELOOP": -40,
}

var tnErrnoDescriptions = map[string]string{
	"EPERM": "operation not permitted", "ENOENT": "no such file or directory", "EIO": "i/o error",
	"EBADF": "bad file descriptor", "EACCES": "permission denied", "EBUSY": "resource busy or locked",
	"EEXIST": "file already exists", "EXDEV": "cross-device link not permitted", "ENOTDIR": "not a directory",
	"EISDIR": "illegal operation on a directory", "EINVAL": "invalid argument", "EMFILE": "too many open files",
	"ENOSPC": "no space left on device", "ENOTEMPTY": "directory not empty", "ELOOP": "too many symbolic links encountered",
}

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
	_, err := os.Stat(path)
	return err == nil
}

func TnRename(from string, to string) {
	tnFsCheck(os.Rename(from, to), "rename", from, to)
}

// rmSync(path, { recursive, force })
func TnRm(path string, recursive bool, force bool) {
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
	info, err := os.Lstat(path)
	tnFsCheck(err, "unlink", path)
	if info.IsDir() {
		panic(TnSysError(errors.New("operation not permitted"), "unlink", path))
	}
	tnFsCheck(os.Remove(path), "unlink", path)
}

// copyFileSync(src, dest, mode): mode 1 (COPYFILE_EXCL) fails if dest exists
func TnCopyFile(src string, dst string, mode float64) {
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
	TnCopyFile(src, dst, 0)
}

func TnRealpath(path string) string {
	abs, err := filepath.Abs(path)
	tnFsCheck(err, "realpath", path)
	real, err := filepath.EvalSymlinks(abs)
	tnFsCheck(err, "realpath", path)
	return real
}

func TnMkdtemp(prefix string) string {
	dir, base := filepath.Split(prefix)
	if dir == "" {
		dir = "."
	}
	created, err := os.MkdirTemp(dir, base+"*")
	tnFsCheck(err, "mkdtemp", prefix+"XXXXXX")
	return created
}

func TnTruncate(path string, length float64) {
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
	tnFsCheck(os.Chtimes(path, tnTimeArg(atime), tnTimeArg(mtime)), "utime", path)
}

func TnSymlink(target string, path string) {
	tnFsCheck(os.Symlink(target, path), "symlink", target, path)
}

func TnReadlink(path string) string {
	target, err := os.Readlink(path)
	tnFsCheck(err, "readlink", path)
	return target
}

func TnLink(existing string, path string) {
	tnFsCheck(os.Link(existing, path), "link", existing, path)
}

// accessSync(path, mode): F_OK 0, R_OK 4, W_OK 2, X_OK 1
func TnAccess(path string, mode float64) {
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
			if p, ok := TnGet(a, "position").(float64); ok {
				position = int64(p)
			}
			if o, ok := TnGet(a, "offset").(float64); ok {
				offset = int(o)
			}
			if l, ok := TnGet(a, "length").(float64); ok {
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
function dataArg(call: NodeCall, index: number, enc: string): string {
  const type = call.types[index];
  if (type === '[]byte') return call.args[index];
  if (type === 'string' && (enc === '' || enc === 'utf8' || enc === 'utf-8')) return `[]byte(${call.args[index]})`;
  return `TnFsData(${call.args[index]}, ${JSON.stringify(enc)})`;
}

// The `flag` option of writeFileSync
function flagArg(node: any): string {
  const flag = getOption(node, 'flag');
  return flag && isStringNode(flag) ? JSON.stringify(String(flag.text)) : '""';
}

// The result type of readFileSync-like calls: a string when an encoding is given
export function readResultType(call: NodeCall, index: number): string {
  const node = call.nodes[index];
  if (!node || node.kind === 'NullKeyword') return '[]byte';
  if (isStringNode(node)) return 'string';
  if (isObjectLiteral(node)) return encodingOf(node) ? 'string' : '[]byte';
  return call.types[index] === 'string' ? 'string' : '[]byte';
}

const FS_CONSTANTS: Record<string, number> = {
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

export function registerFs(r: NodeRegistry): void {
  defineModule(r, 'fs');
  defineHelper(r, 'fsErrors', ['errors', 'io/fs', 'strings'], ['error'], fsErrorsHelper);
  defineHelper(
    r,
    'nodeFs',
    ['errors', 'fmt', 'io', 'io/fs', 'math', 'os', 'path/filepath', 'runtime', 'strconv', 'strings', 'sync', 'time'],
    ['fsErrors', 'buffer', 'dynamic'],
    fsHelper
  );
  defineClass(
    r,
    'fs.Stats',
    '*TnStats',
    'class',
    'isFile=bool; isDirectory=bool; isSymbolicLink=bool; isFIFO=bool; isSocket=bool; isBlockDevice=bool; isCharacterDevice=bool',
    'dev=float64; ino=float64; mode=float64; nlink=float64; uid=float64; gid=float64; rdev=float64; size=float64; blksize=float64; blocks=float64; atimeMs=float64; mtimeMs=float64; ctimeMs=float64; birthtimeMs=float64; atime=time.Time; mtime=time.Time; ctime=time.Time; birthtime=time.Time',
    '',
    ''
  );
  defineClass(
    r,
    'fs.Dirent',
    '*TnDirent',
    'class',
    'isFile=bool; isDirectory=bool; isSymbolicLink=bool; isFIFO=bool; isSocket=bool; isBlockDevice=bool; isCharacterDevice=bool',
    'name=string; parentPath=string; path=string',
    '',
    ''
  );
  const use = () => r.helper('nodeFs');
  const fn = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.functions[`fs.${name}`] = (call: NodeCall) => {
      use();
      return emit(call);
    };
    r.results[`fs.${name}`] = result;
  };

  fn('readFileSync', '', (c: NodeCall) => {
    const enc = encodingOf(c.nodes[1]);
    if (readResultType(c, 1) === 'string') {
      const encExpr = enc ? JSON.stringify(enc) : c.types[1] === 'string' ? c.args[1] : '""';
      return `TnReadFileString(${c.args[0]}, ${encExpr})`;
    }
    return `TnReadFileBytes(${c.args[0]})`;
  });
  r.typers['fs.readFileSync'] = (c: NodeCall) => readResultType(c, 1);
  fn('writeFileSync', '', (c: NodeCall) => `TnWriteFile(${c.args[0]}, ${dataArg(c, 1, encodingOf(c.nodes[2]))}, ${flagArg(c.nodes[2])})`);
  fn('appendFileSync', '', (c: NodeCall) => `TnWriteFile(${c.args[0]}, ${dataArg(c, 1, encodingOf(c.nodes[2]))}, "a")`);
  fn('existsSync', 'bool', (c: NodeCall) => `TnExists(${c.args[0]})`);
  fn('mkdirSync', '', (c: NodeCall) => `TnMkdir(${c.args[0]}, ${optionIsTrue(c.nodes[1], 'recursive')})`);
  fn('readdirSync', '', (c: NodeCall) => {
    const recursive = optionIsTrue(c.nodes[1], 'recursive');
    if (optionIsTrue(c.nodes[1], 'withFileTypes')) return `TnReadDirents(${c.args[0]}, ${recursive})`;
    return `TnReadDirNames(${c.args[0]}, ${recursive})`;
  });
  r.typers['fs.readdirSync'] = (c: NodeCall) => (optionIsTrue(c.nodes[1], 'withFileTypes') ? '[]*TnDirent' : '[]string');
  const stat = (lstat: boolean) => (c: NodeCall) => {
    const option = getOption(c.nodes[1], 'throwIfNoEntry');
    const throwIfNoEntry = option && option.kind === 'FalseKeyword' ? 'false' : 'true';
    return `TnStat(${c.args[0]}, ${lstat}, ${throwIfNoEntry})`;
  };
  fn('statSync', '*TnStats', stat(false));
  fn('lstatSync', '*TnStats', stat(true));
  fn('fstatSync', '*TnStats', (c: NodeCall) => `TnFstat(${c.args[0]})`);
  fn('renameSync', '', (c: NodeCall) => `TnRename(${c.args[0]}, ${c.args[1]})`);
  fn('rmSync', '', (c: NodeCall) => `TnRm(${c.args[0]}, ${optionIsTrue(c.nodes[1], 'recursive')}, ${optionIsTrue(c.nodes[1], 'force')})`);
  fn('rmdirSync', '', (c: NodeCall) => `TnRmdir(${c.args[0]}, ${optionIsTrue(c.nodes[1], 'recursive')})`);
  fn('unlinkSync', '', (c: NodeCall) => `TnUnlink(${c.args[0]})`);
  fn('copyFileSync', '', (c: NodeCall) => `TnCopyFile(${c.args[0]}, ${c.args[1]}, ${c.args[2] ?? '0'})`);
  fn('cpSync', '', (c: NodeCall) => {
    const force = getOption(c.nodes[2], 'force');
    return `TnCp(${c.args[0]}, ${c.args[1]}, ${optionIsTrue(c.nodes[2], 'recursive')}, ${force && force.kind === 'FalseKeyword' ? 'false' : 'true'})`;
  });
  fn('realpathSync', 'string', (c: NodeCall) => `TnRealpath(${c.args[0]})`);
  fn('realpathSync.native', 'string', (c: NodeCall) => `TnRealpath(${c.args[0]})`);
  r.objects['fs.realpathSync'] = true;
  fn('mkdtempSync', 'string', (c: NodeCall) => `TnMkdtemp(${c.args[0]})`);
  fn('truncateSync', '', (c: NodeCall) => `TnTruncate(${c.args[0]}, ${c.args[1] ?? '0'})`);
  fn('chmodSync', '', (c: NodeCall) => `TnChmod(${c.args[0]}, ${c.args[1]})`);
  fn('utimesSync', '', (c: NodeCall) => `TnUtimes(${c.args[0]}, ${c.args[1]}, ${c.args[2]})`);
  fn('symlinkSync', '', (c: NodeCall) => `TnSymlink(${c.args[0]}, ${c.args[1]})`);
  fn('readlinkSync', 'string', (c: NodeCall) => `TnReadlink(${c.args[0]})`);
  fn('linkSync', '', (c: NodeCall) => `TnLink(${c.args[0]}, ${c.args[1]})`);
  fn('accessSync', '', (c: NodeCall) => `TnAccess(${c.args[0]}, ${c.args[1] ?? '0'})`);
  fn('openSync', 'float64', (c: NodeCall) => `TnOpen(${c.args[0]}, ${c.args[1] ?? '"r"'}${c.args[2] ? `, ${c.args[2]}` : ''})`);
  fn('closeSync', '', (c: NodeCall) => `TnClose(${c.args[0]})`);
  fn('readSync', 'float64', (c: NodeCall) => `TnReadSync(${c.args.join(', ')})`);
  fn('writeSync', 'float64', (c: NodeCall) => `TnWriteSync(${c.args.join(', ')})`);
  fn('fsyncSync', '', (c: NodeCall) => `TnFsync(${c.args[0]})`);
  fn('ftruncateSync', '', (c: NodeCall) => `TnFtruncate(${c.args[0]}, ${c.args[1] ?? '0'})`);
  setResults(r, 'fs', '');

  r.objects['fs.constants'] = true;
  for (const name of Object.keys(FS_CONSTANTS)) {
    const value = FS_CONSTANTS[name];
    r.values[`fs.constants.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`fs.constants.${name}`] = 'float64';
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
		exists := TnExists(path)
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() { TnInvoke(cb, exists) })
		})
	}()
}

// fs/promises FileHandle
type TnFileHandle struct {
	fd float64
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

func (h *TnFileHandle) close() chan struct{} {
	return TnFsPromiseVoid(func() { TnClose(h.fd) })
}`;

// Async names → their sync emitters
const FS_ASYNC: string[] = [
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
  'link'
];

// The call without its trailing callback
function withoutCallback(call: NodeCall): NodeCall {
  let end = call.nodes.length;
  if (end > 0 && (call.nodes[end - 1].kind === 'ArrowFunction' || call.nodes[end - 1].kind === 'FunctionExpression' || call.types[end - 1].startsWith('func('))) {
    end--;
  }
  return { args: call.args.slice(0, end), nodes: call.nodes.slice(0, end), types: call.types.slice(0, end), recv: call.recv };
}

// The Go result type of a sync fs function for these arguments ('' = none)
function syncResultType(r: NodeRegistry, syncKey: string, call: NodeCall): string {
  const typer = r.typers[syncKey];
  if (typer) return typer(call);
  return r.results[syncKey] ?? '';
}

function registerFsAsync(r: NodeRegistry): void {
  defineModule(r, 'fs/promises');
  r.namespaces['fs.promises'] = 'fs/promises';
  defineHelper(r, 'nodeFsAsync', ['fmt', 'io'], ['nodeFs', 'eventLoop', 'promise', 'nodeInvoke'], fsAsyncHelper);
  defineClass(
    r,
    'fs/promises.FileHandle',
    '*TnFileHandle',
    'class',
    'writeFile=chan struct{}; appendFile=chan struct{}; read=chan *TnFsReadResult; write=chan *TnFsWriteResult; stat=chan *TnStats; truncate=chan struct{}; sync=chan struct{}; close=chan struct{}',
    '',
    'fd=float64',
    ''
  );
  defineClass(r, 'fs.ReadResult', '*TnFsReadResult', 'class', '', 'bytesRead=float64; buffer=[]byte', '', '');
  defineClass(r, 'fs.WriteResult', '*TnFsWriteResult', 'class', '', 'bytesWritten=float64; buffer=interface{}', '', '');
  r.methods['fs/promises.FileHandle#readFile'] = (c: NodeCall) => {
    const enc = encodingOf(c.nodes[0]);
    if (enc) return `${c.recv}.readFileString(${JSON.stringify(enc)})`;
    if (c.types[0] === 'string') return `${c.recv}.readFileString(${c.args[0]})`;
    return `${c.recv}.readFileBytes()`;
  };
  r.typers['fs/promises.FileHandle#readFile'] = (c: NodeCall) => (encodingOf(c.nodes[0]) || c.types[0] === 'string' ? 'chan string' : 'chan []byte');

  for (const name of FS_ASYNC) {
    const syncKey = `fs.${name}Sync`;
    // Callback form: fs.readFile(path, [options], (err, data) => …)
    r.functions[`fs.${name}`] = (call: NodeCall) => {
      r.helper('nodeFsAsync');
      const sub = withoutCallback(call);
      const expr = r.functions[syncKey](sub);
      const type = syncResultType(r, syncKey, sub);
      const cb = sub.args.length < call.args.length ? call.args[call.args.length - 1] : 'nil';
      if (!type) return `TnFsCallbackVoid(func() { ${expr} }, ${cb})`;
      return `TnFsCallback(func() ${type} { return ${expr} }, ${cb})`;
    };
    r.results[`fs.${name}`] = '';
    r.paramTypers[`fs.${name}`] = (nodes: any[]) => {
      const sub: NodeCall = { args: [], nodes: nodes.slice(0, nodes.length - 1), types: [], recv: '' };
      const types: string[] = [];
      for (const n of sub.nodes) types.push(r.typeOf(n));
      sub.types = types;
      const type = syncResultType(r, syncKey, sub);
      return type ? ['*TnError', type] : ['*TnError'];
    };
    // Promise form: fs/promises / fs.promises
    r.functions[`fs/promises.${name}`] = (call: NodeCall) => {
      r.helper('nodeFsAsync');
      const expr = r.functions[syncKey](call);
      const type = syncResultType(r, syncKey, call);
      if (!type) return `TnFsPromiseVoid(func() { ${expr} })`;
      return `TnFsPromise(func() ${type} { return ${expr} })`;
    };
    r.typers[`fs/promises.${name}`] = (call: NodeCall) => {
      const type = syncResultType(r, syncKey, call);
      return type ? `chan ${type}` : 'chan struct{}';
    };
  }
  r.functions['fs.exists'] = (call: NodeCall) => {
    r.helper('nodeFsAsync');
    return `TnFsExists(${call.args[0]}, ${call.args[1]})`;
  };
  r.paramTypers['fs.exists'] = (_n: any[]) => ['bool'];
  r.functions['fs/promises.open'] = (call: NodeCall) => {
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
