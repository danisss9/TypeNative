// node:sqlite — DatabaseSync / StatementSync on github.com/ncruces/go-sqlite3
// (SQLite compiled to Wasm and translated to Go: no cgo). The driver is
// vendored in the package's govendor/ and wired into dist/go.mod by
// src/index.ts when a program imports it.
//
// Rows are string-keyed TnMaps held in dynamic values: `row.name`,
// `row as Row` and `rows as Row[]` read them through TnGet / TnAs, and
// console.log prints their columns in order. SQL NULL is nil (JS null).
// A JS throw inside a user-defined function is caught, turned into an SQLite
// error, and rethrown once the statement returns, as Node does.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
const sqliteHelper = `// node:sqlite
type TnSqliteDb struct {
	conn         *sqlite3.Conn
	path         string
	readOnly     bool
	fkeys        bool
	dqs          bool
	allowExt     bool
	timeout      float64
	readBigInts  bool
	returnArrays bool
	allowBare    bool
	allowUnknown bool
	defensive    bool
	limitOptions interface{}
	// prepared statements not finalized yet; the JS objects are not kept, so
	// one that becomes unreachable is finalized on the event loop
	live   map[*sqlite3.Stmt]bool
	limits       *TnSqliteLimits
	// A JS throw inside a user-defined function, rethrown after the statement
	pending    interface{}
	hasPending bool
	// Active sessions sharing this connection's preupdate hook
	sessions []*TnSqliteSession
}

type TnSqliteStmt struct {
	db           *TnSqliteDb
	s            *sqlite3.Stmt
	sql          string
	readBigInts  bool
	returnArrays bool
	allowBare    bool
	allowUnknown bool
}

type TnSqliteRunResult struct {
	changes         interface{}
	lastInsertRowid interface{}
}

type TnSqliteIterator struct {
	stmt *TnSqliteStmt
	done bool
}

type TnSqliteIteratorResult struct {
	done  bool
	value interface{}
}

type TnSqliteBackupProgress struct {
	totalPages     float64
	remainingPages float64
}

func tnSqliteState(message string) *TnError {
	return TnNodeError("Error", "ERR_INVALID_STATE", message)
}

func tnSqliteArgType(message string) *TnError {
	return TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", message)
}

// An SQLite failure as Node reports it: SQLite's message, code
// ERR_SQLITE_ERROR, errcode (the extended result code) and errstr
func tnSqliteError(err error) *TnError {
	var se *sqlite3.Error
	if !errors.As(err, &se) {
		if code, ok := err.(sqlite3.ErrorCode); ok {
			return tnSqliteCodeError(int(code), "")
		}
		if code, ok := err.(sqlite3.ExtendedErrorCode); ok {
			return tnSqliteCodeError(int(code), "")
		}
		return TnNodeError("Error", "ERR_SQLITE_ERROR", err.Error())
	}
	// "sqlite3: <errstr>: <message>[: <OS error>]" → SQLite's own message
	full := se.Error()
	if sys := errors.Unwrap(se); sys != nil {
		full = strings.TrimSuffix(full, ": "+sys.Error())
	}
	prefix := se.ExtendedCode().Error()
	message := ""
	if strings.HasPrefix(full, prefix+": ") {
		message = full[len(prefix)+2:]
	}
	return tnSqliteCodeError(int(se.ExtendedCode()), message)
}

func tnSqliteCodeError(code int, message string) *TnError {
	errstr := strings.TrimPrefix(sqlite3.ExtendedErrorCode(code).Error(), "sqlite3: ")
	if message == "" {
		message = errstr
	}
	e := TnNodeError("Error", "ERR_SQLITE_ERROR", message)
	e.props["errcode"] = float64(code)
	e.props["errstr"] = errstr
	return e
}

// A boolean option: absent (or not a boolean) keeps the default
func tnSqliteFlag(options interface{}, key string, def bool) bool {
	if options == nil {
		return def
	}
	switch v := TnGetValue(options, key).(type) {
	case bool:
		return v
	case *bool:
		if v != nil {
			return *v
		}
	}
	return def
}

func tnSqliteNumber(options interface{}, key string, def float64) float64 {
	if options == nil {
		return def
	}
	switch v := TnGetValue(options, key).(type) {
	case float64:
		return v
	case *float64:
		if v != nil {
			return *v
		}
	}
	return def
}

func tnSqliteString(options interface{}, key string, def string) string {
	if options == nil {
		return def
	}
	switch v := TnGetValue(options, key).(type) {
	case string:
		return v
	case *string:
		if v != nil {
			return *v
		}
	}
	return def
}

func tnSqliteIsFunc(v interface{}) bool {
	if v == nil {
		return false
	}
	rv := reflect.ValueOf(v)
	return rv.Kind() == reflect.Func && !rv.IsNil()
}

// fn.length: the declared parameters, without a rest parameter
func tnSqliteArity(fn interface{}) int {
	t := reflect.TypeOf(fn)
	if t.IsVariadic() {
		return t.NumIn() - 1
	}
	return t.NumIn()
}

// new DatabaseSync(path, options?)
func TnNewSqliteDb(path interface{}, opts ...interface{}) *TnSqliteDb {
	var options interface{}
	if len(opts) > 0 {
		options = opts[0]
	}
	db := &TnSqliteDb{}
	switch p := path.(type) {
	case string:
		db.path = p
	case []byte:
		db.path = string(p)
	default:
		if href, ok := TnGetValue(path, "href").(string); ok && path != nil {
			db.path = href
		} else {
			panic(tnSqliteArgType("The \\"path\\" argument must be a string, Uint8Array, or URL without null bytes."))
		}
	}
	if strings.ContainsRune(db.path, 0) {
		panic(tnSqliteArgType("The \\"path\\" argument must be a string, Uint8Array, or URL without null bytes."))
	}
	db.readOnly = tnSqliteFlag(options, "readOnly", false)
	db.fkeys = tnSqliteFlag(options, "enableForeignKeyConstraints", true)
	db.dqs = tnSqliteFlag(options, "enableDoubleQuotedStringLiterals", false)
	db.allowExt = tnSqliteFlag(options, "allowExtension", false)
	db.timeout = tnSqliteNumber(options, "timeout", 0)
	db.readBigInts = tnSqliteFlag(options, "readBigInts", false)
	db.returnArrays = tnSqliteFlag(options, "returnArrays", false)
	db.allowBare = tnSqliteFlag(options, "allowBareNamedParameters", true)
	db.allowUnknown = tnSqliteFlag(options, "allowUnknownNamedParameters", false)
	db.defensive = tnSqliteFlag(options, "defensive", false)
	if options != nil {
		db.limitOptions = TnGet(options, "limits")
	}
	db.limits = &TnSqliteLimits{db: db}
	if tnSqliteFlag(options, "open", true) {
		db.open()
	}
	return db
}

func (db *TnSqliteDb) requireOpen() {
	if db.conn == nil {
		panic(tnSqliteState("database is not open"))
	}
}

// Rethrows a JS error from a user-defined function, then an SQLite error
func (db *TnSqliteDb) check(err error) {
	if db.hasPending {
		pending := db.pending
		db.pending, db.hasPending = nil, false
		panic(pending)
	}
	if err != nil {
		panic(tnSqliteError(err))
	}
}

func (db *TnSqliteDb) open() {
	if db.conn != nil {
		panic(tnSqliteState("database is already open"))
	}
	flags := sqlite3.OPEN_URI
	if db.readOnly {
		flags |= sqlite3.OPEN_READONLY
	} else {
		flags |= sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
	}
	conn, err := sqlite3.OpenFlags(db.path, flags)
	if err != nil {
		// Node reports the primary code of a failed open (14, not 782)
		var se *sqlite3.Error
		if errors.As(err, &se) {
			panic(tnSqliteCodeError(int(se.Code()), ""))
		}
		panic(tnSqliteError(err))
	}
	db.conn = conn
	for _, setting := range []struct {
		op sqlite3.DBConfig
		on bool
	}{{sqlite3.DBCONFIG_DQS_DML, db.dqs}, {sqlite3.DBCONFIG_DQS_DDL, db.dqs}, {sqlite3.DBCONFIG_ENABLE_FKEY, db.fkeys}, {sqlite3.DBCONFIG_DEFENSIVE, db.defensive}} {
		if _, err := conn.Config(setting.op, setting.on); err != nil {
			panic(tnSqliteError(err))
		}
	}
	if db.timeout > 0 {
		conn.BusyTimeout(time.Duration(db.timeout) * time.Millisecond)
	}
	if db.limitOptions != nil {
		for i, name := range tnSqliteLimitNames {
			if v, ok := TnGetValue(db.limitOptions, name).(float64); ok {
				db.limits.set(i, v)
			}
		}
	}
}

func (db *TnSqliteDb) enableDefensive(active bool) {
	db.requireOpen()
	db.defensive = active
	_, err := db.conn.Config(sqlite3.DBCONFIG_DEFENSIVE, active)
	db.check(err)
}

// db.limits: live getters / setters over sqlite3_limit, in Node's order
var tnSqliteLimitNames = []string{"length", "sqlLength", "column", "exprDepth", "compoundSelect", "vdbeOp", "functionArg", "attach", "likePatternLength", "variableNumber", "triggerDepth"}

type TnSqliteLimits struct {
	db *TnSqliteDb
}

func (l *TnSqliteLimits) get(id int) float64 {
	l.db.requireOpen()
	return float64(l.db.conn.Limit(sqlite3.LimitCategory(id), -1))
}

// Infinity restores the compile-time maximum
func (l *TnSqliteLimits) set(id int, value float64) {
	l.db.requireOpen()
	if math.IsInf(value, 1) {
		value = math.MaxInt32
	}
	if value < 0 || value != math.Trunc(value) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The \\"value\\" argument must be a non-negative integer or Infinity."))
	}
	l.db.conn.Limit(sqlite3.LimitCategory(id), int(min(value, math.MaxInt32)))
}

func (l *TnSqliteLimits) Entries() [][]interface{} {
	entries := [][]interface{}{}
	for i, name := range tnSqliteLimitNames {
		entries = append(entries, []interface{}{name, l.get(i)})
	}
	return entries
}

func (l *TnSqliteLimits) Get_length() float64            { return l.get(0) }
func (l *TnSqliteLimits) Set_length(v float64)           { l.set(0, v) }
func (l *TnSqliteLimits) Get_sqlLength() float64         { return l.get(1) }
func (l *TnSqliteLimits) Set_sqlLength(v float64)        { l.set(1, v) }
func (l *TnSqliteLimits) Get_column() float64            { return l.get(2) }
func (l *TnSqliteLimits) Set_column(v float64)           { l.set(2, v) }
func (l *TnSqliteLimits) Get_exprDepth() float64         { return l.get(3) }
func (l *TnSqliteLimits) Set_exprDepth(v float64)        { l.set(3, v) }
func (l *TnSqliteLimits) Get_compoundSelect() float64    { return l.get(4) }
func (l *TnSqliteLimits) Set_compoundSelect(v float64)   { l.set(4, v) }
func (l *TnSqliteLimits) Get_vdbeOp() float64            { return l.get(5) }
func (l *TnSqliteLimits) Set_vdbeOp(v float64)           { l.set(5, v) }
func (l *TnSqliteLimits) Get_functionArg() float64       { return l.get(6) }
func (l *TnSqliteLimits) Set_functionArg(v float64)      { l.set(6, v) }
func (l *TnSqliteLimits) Get_attach() float64            { return l.get(7) }
func (l *TnSqliteLimits) Set_attach(v float64)           { l.set(7, v) }
func (l *TnSqliteLimits) Get_likePatternLength() float64 { return l.get(8) }
func (l *TnSqliteLimits) Set_likePatternLength(v float64) { l.set(8, v) }
func (l *TnSqliteLimits) Get_variableNumber() float64    { return l.get(9) }
func (l *TnSqliteLimits) Set_variableNumber(v float64)   { l.set(9, v) }
func (l *TnSqliteLimits) Get_triggerDepth() float64      { return l.get(10) }
func (l *TnSqliteLimits) Set_triggerDepth(v float64)     { l.set(10, v) }

func (db *TnSqliteDb) Get_limits() *TnSqliteLimits { return db.limits }

// setAuthorizer(callback | null): the callback's SQLITE_OK / DENY / IGNORE
// decides each action while statements are prepared
func (db *TnSqliteDb) setAuthorizer(callback interface{}) {
	db.requireOpen()
	if !tnSqliteIsFunc(callback) {
		db.check(db.conn.SetAuthorizer(nil))
		return
	}
	db.check(db.conn.SetAuthorizer(func(action sqlite3.AuthorizerActionCode, name3rd, name4th, schema, inner string) (code sqlite3.AuthorizerReturnCode) {
		defer func() {
			if r := recover(); r != nil {
				if !db.hasPending {
					db.pending, db.hasPending = r, true
				}
				code = sqlite3.AUTH_DENY
			}
		}()
		result := TnInvoke(callback, float64(action), tnSqliteNullable(name3rd), tnSqliteNullable(name4th), tnSqliteNullable(schema), tnSqliteNullable(inner))
		n, ok := result.(float64)
		if !ok || (n != 0 && n != 1 && n != 2) {
			panic(TnNodeError("RangeError", "ERR_INVALID_RETURN_VALUE", "Authorizer callback returned a invalid authorization code"))
		}
		return sqlite3.AuthorizerReturnCode(n)
	}))
}

func (db *TnSqliteDb) close() {
	db.requireOpen()
	for _, sess := range db.sessions {
		sess.open = false
	}
	db.sessions = nil
	db.conn.PreUpdateHook(nil)
	for s := range db.live {
		s.Close()
	}
	db.live = nil
	err := db.conn.Close()
	db.conn = nil
	if err != nil {
		panic(tnSqliteError(err))
	}
}

func (db *TnSqliteDb) Get_isOpen() bool { return db.conn != nil }

func (db *TnSqliteDb) Get_isTransaction() bool {
	db.requireOpen()
	return !db.conn.GetAutocommit()
}

// location(dbName = 'main'): the database file, null in memory
func (db *TnSqliteDb) location(name ...interface{}) *string {
	db.requireOpen()
	schema := "main"
	if len(name) > 0 {
		if s, ok := name[0].(string); ok {
			schema = s
		}
	}
	file := db.conn.Filename(schema).String()
	if file == "" {
		return nil
	}
	return &file
}

func (db *TnSqliteDb) exec(sql string) {
	db.requireOpen()
	db.check(db.conn.Exec(sql))
}

func (db *TnSqliteDb) prepare(sql string, opts ...interface{}) *TnSqliteStmt {
	db.requireOpen()
	s, _, err := db.conn.Prepare(sql)
	db.check(err)
	if s == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The SQL query contains no statements."))
	}
	st := &TnSqliteStmt{db: db, s: s, sql: sql, readBigInts: db.readBigInts, returnArrays: db.returnArrays, allowBare: db.allowBare, allowUnknown: db.allowUnknown}
	if len(opts) > 0 && opts[0] != nil {
		st.readBigInts = tnSqliteFlag(opts[0], "readBigInts", st.readBigInts)
		st.returnArrays = tnSqliteFlag(opts[0], "returnArrays", st.returnArrays)
		st.allowBare = tnSqliteFlag(opts[0], "allowBareNamedParameters", st.allowBare)
		st.allowUnknown = tnSqliteFlag(opts[0], "allowUnknownNamedParameters", st.allowUnknown)
	}
	if db.live == nil {
		db.live = map[*sqlite3.Stmt]bool{}
	}
	db.live[s] = true
	runtime.AddCleanup(st, func(s *sqlite3.Stmt) {
		TnLoopPost(func() {
			if db.live[s] {
				delete(db.live, s)
				s.Close()
			}
		})
	}, s)
	return st
}

// Runs a user-defined function's JS code: a throw becomes the statement's error
func (db *TnSqliteDb) callJS(ctx sqlite3.Context, fn func()) {
	defer func() {
		if r := recover(); r != nil {
			if !db.hasPending {
				db.pending, db.hasPending = r, true
			}
			ctx.ResultError(errors.New(fmt.Sprint(r)))
		}
	}()
	fn()
}

// An SQLite value passed to a user-defined function
func (db *TnSqliteDb) argValue(v sqlite3.Value, bigInts bool) interface{} {
	switch v.Type() {
	case sqlite3.INTEGER:
		return tnSqliteInteger(v.Int64(), bigInts)
	case sqlite3.FLOAT:
		return v.Float()
	case sqlite3.TEXT:
		return v.Text()
	case sqlite3.BLOB:
		return append([]byte{}, v.RawBlob()...)
	}
	return nil
}

func tnSqliteInteger(n int64, bigInts bool) interface{} {
	if bigInts {
		return new(tnbig.Int).SetInt64(n)
	}
	if n > 9007199254740991 || n < -9007199254740991 {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("Value is too large to be represented as a JavaScript number: %d", n)))
	}
	return float64(n)
}

// A user-defined function's JS result as the SQL result
func tnSqliteResult(ctx sqlite3.Context, v interface{}) {
	switch x := v.(type) {
	case nil:
		ctx.ResultNull()
	case float64:
		ctx.ResultFloat(x)
	case string:
		ctx.ResultText(x)
	case []byte:
		ctx.ResultBlob(x)
	case *tnbig.Int:
		if x == nil {
			ctx.ResultNull()
		} else if !x.IsInt64() {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "BigInt value is too large for SQLite"))
		} else {
			ctx.ResultInt64(x.Int64())
		}
	default:
		if _, isNull := v.(interface{ TnIsNullValue() }); isNull {
			ctx.ResultNull()
			return
		}
		rv := reflect.ValueOf(v)
		switch {
		case rv.Kind() >= reflect.Int && rv.Kind() <= reflect.Float64 && rv.Kind() != reflect.Uintptr:
			ctx.ResultFloat(rv.Convert(reflect.TypeOf(float64(0))).Float())
		case rv.Kind() == reflect.Chan:
			panic(TnNodeError("Error", "ERR_SQLITE_ERROR", "Asynchronous user-defined functions are not supported"))
		case (rv.Kind() == reflect.Pointer || rv.Kind() == reflect.Func || rv.Kind() == reflect.Slice || rv.Kind() == reflect.Map) && rv.IsNil():
			ctx.ResultNull()
		case rv.Kind() == reflect.Pointer && rv.Elem().Kind() != reflect.Struct:
			tnSqliteResult(ctx, rv.Elem().Interface())
		default:
			panic(TnNodeError("Error", "ERR_SQLITE_ERROR", "Returned JavaScript value cannot be converted to a SQLite value"))
		}
	}
}

func tnSqliteFunctionFlags(options interface{}) sqlite3.FunctionFlag {
	var flags sqlite3.FunctionFlag
	if tnSqliteFlag(options, "deterministic", false) {
		flags |= sqlite3.DETERMINISTIC
	}
	if tnSqliteFlag(options, "directOnly", false) {
		flags |= sqlite3.DIRECTONLY
	}
	return flags
}

// function(name, options?, fn)
func (db *TnSqliteDb) function(name string, rest ...interface{}) {
	db.requireOpen()
	var options, fn interface{}
	if len(rest) > 1 {
		options, fn = rest[0], rest[1]
	} else if len(rest) == 1 {
		fn = rest[0]
	}
	if !tnSqliteIsFunc(fn) {
		panic(tnSqliteArgType("The \\"function\\" argument must be a function."))
	}
	bigInts := tnSqliteFlag(options, "useBigIntArguments", false)
	nArg := tnSqliteArity(fn)
	if tnSqliteFlag(options, "varargs", false) {
		nArg = -1
	}
	err := db.conn.CreateFunction(name, nArg, tnSqliteFunctionFlags(options), func(ctx sqlite3.Context, arg ...sqlite3.Value) {
		db.callJS(ctx, func() {
			args := make([]interface{}, len(arg))
			for i, v := range arg {
				args[i] = db.argValue(v, bigInts)
			}
			tnSqliteResult(ctx, TnInvoke(fn, args...))
		})
	})
	db.check(err)
}

// aggregate(name, { start, step, result?, inverse? }): one accumulator per group
type tnSqliteAggregate struct {
	db      *TnSqliteDb
	options interface{}
	bigInts bool
	acc     interface{}
}

type tnSqliteWindow struct{ *tnSqliteAggregate }

func (a *tnSqliteAggregate) call(ctx sqlite3.Context, key string, arg []sqlite3.Value) {
	a.db.callJS(ctx, func() {
		args := []interface{}{a.acc}
		for _, v := range arg {
			args = append(args, a.db.argValue(v, a.bigInts))
		}
		a.acc = TnInvoke(TnGet(a.options, key), args...)
	})
}

func (a *tnSqliteAggregate) Step(ctx sqlite3.Context, arg ...sqlite3.Value) { a.call(ctx, "step", arg) }

func (a *tnSqliteAggregate) Value(ctx sqlite3.Context) {
	a.db.callJS(ctx, func() {
		value := a.acc
		if result := TnGet(a.options, "result"); tnSqliteIsFunc(result) {
			value = TnInvoke(result, a.acc)
		}
		tnSqliteResult(ctx, value)
	})
}

func (w tnSqliteWindow) Inverse(ctx sqlite3.Context, arg ...sqlite3.Value) { w.call(ctx, "inverse", arg) }

func (db *TnSqliteDb) aggregate(name string, options interface{}) {
	db.requireOpen()
	step := TnGet(options, "step")
	if !tnSqliteIsFunc(step) {
		panic(tnSqliteArgType("The \\"options.step\\" argument must be a function."))
	}
	inverse := TnGet(options, "inverse")
	bigInts := tnSqliteFlag(options, "useBigIntArguments", false)
	nArg := tnSqliteArity(step) - 1
	if tnSqliteIsFunc(inverse) {
		nArg = max(nArg, tnSqliteArity(inverse)-1)
	}
	if tnSqliteFlag(options, "varargs", false) {
		nArg = -1
	}
	err := db.conn.CreateWindowFunction(name, nArg, tnSqliteFunctionFlags(options), func() sqlite3.AggregateFunction {
		a := &tnSqliteAggregate{db: db, options: options, bigInts: bigInts}
		start := TnGet(options, "start")
		if tnSqliteIsFunc(start) {
			start = TnInvoke(start)
		}
		a.acc = start
		if tnSqliteIsFunc(inverse) {
			return tnSqliteWindow{a}
		}
		return a
	})
	db.check(err)
}

// createModule(name, options): virtual-table module backed by JS callbacks
type tnSqliteVTabCol struct {
	name       string
	typ        string
	hidden     bool
	hiddenIdx  int
	visibleIdx int
}

type tnSqliteVTab struct {
	db      *TnSqliteDb
	cols    []tnSqliteVTabCol
	nHidden int
	rowsFn  interface{}
	bigInts bool
}

type tnSqliteVTabCursor struct {
	vt       *tnSqliteVTab
	args     []interface{}
	rowid    int64
	eof      bool
	curRow   interface{}
	isSlice  bool
	rvSlice  reflect.Value
	sliceIdx int
	isChan   bool
	chanVal  interface{}
	rvChan   reflect.Value
	nextFn   interface{}
	returnFn interface{}
}

func tnSqliteIsObject(v interface{}) bool {
	if v == nil {
		return false
	}
	switch v.(type) {
	case string, float64, bool, *tnbig.Int:
		return false
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Slice, reflect.Array, reflect.Func, reflect.Chan:
		return false
	case reflect.Pointer:
		if rv.IsNil() || rv.Elem().Kind() == reflect.Slice {
			return false
		}
	}
	if rv.Kind() >= reflect.Int && rv.Kind() <= reflect.Complex128 {
		return false
	}
	return true
}

func tnSqliteOptBool(obj interface{}, key string, errMsg string) bool {
	v := TnGetValue(obj, key)
	if v == nil {
		return false
	}
	switch b := v.(type) {
	case bool:
		return b
	case *bool:
		if b == nil {
			return false
		}
		return *b
	}
	panic(tnSqliteArgType(errMsg))
}

func (db *TnSqliteDb) callVTab(fn func() error) (err error) {
	defer func() {
		if r := recover(); r != nil {
			if !db.hasPending {
				db.pending, db.hasPending = r, true
			}
			err = errors.New(fmt.Sprint(r))
		}
	}()
	return fn()
}

func (vt *tnSqliteVTab) BestIndex(idx *sqlite3.IndexInfo) error {
	var used []string
	seen := make([]bool, vt.nHidden)
	argv := 1
	for i, c := range idx.Constraint {
		if c.Op != sqlite3.INDEX_CONSTRAINT_EQ {
			continue
		}
		if c.Column < 0 || c.Column >= len(vt.cols) || !vt.cols[c.Column].hidden {
			continue
		}
		if !c.Usable {
			return sqlite3.CONSTRAINT
		}
		hIdx := vt.cols[c.Column].hiddenIdx
		if seen[hIdx] {
			continue
		}
		seen[hIdx] = true
		idx.ConstraintUsage[i].ArgvIndex = argv
		idx.ConstraintUsage[i].Omit = true
		used = append(used, strconv.Itoa(hIdx))
		argv++
	}
	idx.IdxStr = strings.Join(used, ",")
	idx.EstimatedCost = 1000.0 / float64(1+len(used))
	return nil
}

func (vt *tnSqliteVTab) Open() (sqlite3.VTabCursor, error) {
	return &tnSqliteVTabCursor{vt: vt, eof: true}, nil
}

func (cur *tnSqliteVTabCursor) closeIter() {
	if !cur.eof {
		if cur.isChan {
			if c, ok := tnGenCtrls.Load(cur.chanVal); ok {
				ctrl := c.(*tnGenCtrl)
				ctrl.mu.Lock()
				done := ctrl.done
				ctrl.mu.Unlock()
				if !done {
					ctrl.in <- tnGenCmd{kind: tnGenCmdReturn}
					for {
						if _, ok := cur.rvChan.Recv(); !ok {
							break
						}
					}
					ctrl.mu.Lock()
					hasErr := ctrl.hasErr
					errVal := ctrl.errVal
					ctrl.hasErr = false
					ctrl.mu.Unlock()
					if hasErr && !cur.vt.db.hasPending {
						if _, isNil := errVal.(tnGenNilErr); isNil {
							cur.vt.db.pending, cur.vt.db.hasPending = nil, true
						} else {
							cur.vt.db.pending, cur.vt.db.hasPending = errVal, true
						}
					}
				}
			}
		} else if cur.returnFn != nil {
			_ = cur.vt.db.callVTab(func() error {
				TnInvoke(cur.returnFn)
				return nil
			})
		}
	}
	cur.eof = true
	cur.curRow = nil
	cur.isSlice = false
	cur.rvSlice = reflect.Value{}
	cur.sliceIdx = 0
	cur.isChan = false
	cur.chanVal = nil
	cur.rvChan = reflect.Value{}
	cur.nextFn = nil
	cur.returnFn = nil
}

func (cur *tnSqliteVTabCursor) Close() error {
	cur.closeIter()
	return nil
}

func (cur *tnSqliteVTabCursor) initIter(res interface{}) error {
	if res == nil {
		return errors.New("The \\"options.rows\\" function must return an iterable object")
	}
	rv := reflect.ValueOf(res)
	if m := rv.MethodByName("Symbol_iterator"); m.IsValid() && m.Type().NumIn() == 0 && m.Type().NumOut() >= 1 {
		res = m.Call(nil)[0].Interface()
		if res == nil {
			return errors.New("The \\"options.rows\\" function must return an iterable object")
		}
		rv = reflect.ValueOf(res)
	}
	if m, ok := res.(interface{ Entries() [][]interface{} }); ok {
		res = m.Entries()
		rv = reflect.ValueOf(res)
	} else if s, ok := res.(interface{ TnItems() *[]interface{} }); ok {
		res = *s.TnItems()
		rv = reflect.ValueOf(res)
	}
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
		cur.isSlice = true
		cur.rvSlice = rv
		cur.sliceIdx = 0
		return nil
	}
	if rv.Kind() == reflect.Chan {
		cur.isChan = true
		cur.chanVal = res
		cur.rvChan = rv
		return nil
	}
	if nextFn := TnGet(res, "next"); tnSqliteIsFunc(nextFn) {
		cur.nextFn = nextFn
		if retFn := TnGet(res, "return"); tnSqliteIsFunc(retFn) {
			cur.returnFn = retFn
		}
		return nil
	}
	return errors.New("The \\"options.rows\\" function must return an iterable object")
}

func (cur *tnSqliteVTabCursor) advance() {
	cur.curRow = nil
	if cur.isSlice {
		if cur.sliceIdx >= cur.rvSlice.Len() {
			cur.eof = true
			return
		}
		cur.curRow = cur.rvSlice.Index(cur.sliceIdx).Interface()
		cur.sliceIdx++
		cur.rowid++
		return
	}
	if cur.isChan {
		if c, ok := tnGenCtrls.Load(cur.chanVal); ok {
			ctrl := c.(*tnGenCtrl)
			ctrl.mu.Lock()
			done := ctrl.done
			ctrl.mu.Unlock()
			if done {
				cur.eof = true
				return
			}
			ctrl.in <- tnGenCmd{kind: tnGenCmdNext}
			v, ok := cur.rvChan.Recv()
			if ok {
				cur.curRow = v.Interface()
				cur.rowid++
				return
			}
			ctrl.mu.Lock()
			hasErr := ctrl.hasErr
			errVal := ctrl.errVal
			ctrl.hasErr = false
			ctrl.mu.Unlock()
			cur.eof = true
			if hasErr {
				if _, isNil := errVal.(tnGenNilErr); isNil {
					panic(nil)
				}
				panic(errVal)
			}
			return
		}
		v, ok := cur.rvChan.Recv()
		if ok {
			cur.curRow = v.Interface()
			cur.rowid++
			return
		}
		cur.eof = true
		return
	}
	if cur.nextFn != nil {
		step := TnInvoke(cur.nextFn)
		if tnSqliteFlag(step, "done", false) {
			cur.eof = true
			return
		}
		cur.curRow = TnGetValue(step, "value")
		cur.rowid++
		return
	}
	cur.eof = true
}

func (cur *tnSqliteVTabCursor) Filter(idxNum int, idxStr string, arg ...sqlite3.Value) error {
	cur.closeIter()
	cur.rowid = 0
	cur.eof = false
	cur.args = make([]interface{}, cur.vt.nHidden)
	return cur.vt.db.callVTab(func() error {
		if idxStr != "" {
			parts := strings.Split(idxStr, ",")
			for i, p := range parts {
				if i >= len(arg) {
					break
				}
				hIdx, err := strconv.Atoi(p)
				if err == nil && hIdx >= 0 && hIdx < len(cur.args) {
					cur.args[hIdx] = cur.vt.db.argValue(arg[i], cur.vt.bigInts)
				}
			}
		}
		res := TnInvoke(cur.vt.rowsFn, cur.args...)
		if err := cur.initIter(res); err != nil {
			cur.eof = true
			return err
		}
		cur.advance()
		return nil
	})
}

func (cur *tnSqliteVTabCursor) Next() error {
	return cur.vt.db.callVTab(func() error {
		cur.advance()
		return nil
	})
}

func (cur *tnSqliteVTabCursor) EOF() bool {
	return cur.eof
}

func (cur *tnSqliteVTabCursor) Column(ctx sqlite3.Context, n int) error {
	if n < 0 || n >= len(cur.vt.cols) {
		ctx.ResultNull()
		return nil
	}
	col := cur.vt.cols[n]
	return cur.vt.db.callVTab(func() error {
		if col.hidden {
			if col.hiddenIdx < len(cur.args) {
				tnSqliteResult(ctx, cur.args[col.hiddenIdx])
			} else {
				ctx.ResultNull()
			}
			return nil
		}
		if cur.curRow == nil {
			ctx.ResultNull()
			return nil
		}
		rv := reflect.ValueOf(cur.curRow)
		if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
			rv = rv.Elem()
		}
		if (rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array) && col.visibleIdx < rv.Len() {
			tnSqliteResult(ctx, rv.Index(col.visibleIdx).Interface())
		} else {
			ctx.ResultNull()
		}
		return nil
	})
}

func (cur *tnSqliteVTabCursor) RowID() (int64, error) {
	return cur.rowid, nil
}

func (db *TnSqliteDb) createModule(name interface{}, opts ...interface{}) {
	db.requireOpen()
	nameStr, ok := name.(string)
	if !ok {
		panic(tnSqliteArgType("The \\"name\\" argument must be a string."))
	}
	var options interface{}
	if len(opts) > 0 {
		options = opts[0]
	}
	if !tnSqliteIsObject(options) {
		panic(tnSqliteArgType("The \\"options\\" argument must be an object."))
	}
	colsVal := TnGetValue(options, "columns")
	if colsVal == nil {
		panic(tnSqliteArgType("The \\"options.columns\\" argument must be an array."))
	}
	colsRV := reflect.ValueOf(colsVal)
	if colsRV.Kind() == reflect.Pointer && !colsRV.IsNil() && colsRV.Elem().Kind() == reflect.Slice {
		colsRV = colsRV.Elem()
	}
	if colsRV.Kind() != reflect.Slice && colsRV.Kind() != reflect.Array {
		panic(tnSqliteArgType("The \\"options.columns\\" argument must be an array."))
	}
	if colsRV.Len() == 0 {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The \\"options.columns\\" array must not be empty."))
	}
	cols := make([]tnSqliteVTabCol, colsRV.Len())
	defs := make([]string, colsRV.Len())
	nHidden := 0
	nVisible := 0
	for i := 0; i < colsRV.Len(); i++ {
		c := colsRV.Index(i).Interface()
		if !tnSqliteIsObject(c) {
			panic(tnSqliteArgType("Each column in \\"options.columns\\" must be an object."))
		}
		cName, ok := TnGetValue(c, "name").(string)
		if !ok {
			panic(tnSqliteArgType("The column \\"name\\" property must be a string."))
		}
		cType, ok := TnGetValue(c, "type").(string)
		if !ok {
			panic(tnSqliteArgType("The column \\"type\\" property must be a string."))
		}
		switch cType {
		case "INTEGER", "TEXT", "REAL", "BLOB", "ANY":
		default:
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The column \\"type\\" property must be one of 'INTEGER', 'TEXT', 'REAL', 'BLOB', or 'ANY'."))
		}
		hidden := tnSqliteOptBool(c, "hidden", "The column \\"hidden\\" property must be a boolean.")
		col := tnSqliteVTabCol{name: cName, typ: cType, hidden: hidden}
		def := tnSqliteQuoteIdent(cName) + " " + cType
		if hidden {
			col.hiddenIdx = nHidden
			nHidden++
			def += " HIDDEN"
		} else {
			col.visibleIdx = nVisible
			nVisible++
		}
		cols[i] = col
		defs[i] = def
	}
	rowsFn := TnGet(options, "rows")
	if !tnSqliteIsFunc(rowsFn) {
		panic(tnSqliteArgType("The \\"options.rows\\" argument must be a function."))
	}
	directOnly := tnSqliteOptBool(options, "directOnly", "The \\"options.directOnly\\" argument must be a boolean.")
	bigInts := tnSqliteOptBool(options, "useBigIntArguments", "The \\"options.useBigIntArguments\\" argument must be a boolean.")
	createSQL := "CREATE TABLE x(" + strings.Join(defs, ", ") + ")"
	ctor := func(conn *sqlite3.Conn, module, schema, table string, arg ...string) (*tnSqliteVTab, error) {
		if err := conn.DeclareVTab(createSQL); err != nil {
			return nil, err
		}
		if directOnly {
			if err := conn.VTabConfig(sqlite3.VTAB_DIRECTONLY); err != nil {
				return nil, err
			}
		}
		return &tnSqliteVTab{
			db:      db,
			cols:    cols,
			nHidden: nHidden,
			rowsFn:  rowsFn,
			bigInts: bigInts,
		}, nil
	}
	db.check(sqlite3.CreateModule(db.conn, nameStr, nil, ctor))
}

func (db *TnSqliteDb) enableLoadExtension(allow bool) {
	db.requireOpen()
	if !db.allowExt {
		panic(tnSqliteState("Cannot enable extension loading because it was disabled at database creation."))
	}
	if allow {
		panic(tnSqliteState("Loading SQLite extensions is not supported: SQLite runs as Wasm inside the program"))
	}
}

func (db *TnSqliteDb) loadExtension(path string, entry ...interface{}) {
	db.requireOpen()
	panic(tnSqliteState("Loading SQLite extensions is not supported: SQLite runs as Wasm inside the program"))
}

// Session / changeset / patchset emulation over SQLite's preupdate hook.
// Produces and consumes SQLite's official binary changeset ('T') and patchset
// ('P') formats so buffers are wire-compatible with SQLite's session extension.
type tnSqliteSessVal struct {
	kind byte // 0=undefined, 1=INTEGER, 2=FLOAT, 3=TEXT, 4=BLOB, 5=NULL
	i64  int64
	f64  float64
	str  string
	blob []byte
}

type tnSqliteTableInfo struct {
	cols   []string
	pk     []byte // 0 if non-PK, else 1-based PK position
	pkCols []int  // column indices where pk[i] != 0, in table column order
}

type tnSqliteSessRow struct {
	key           string
	pkVals        []tnSqliteSessVal
	existedBefore bool
	origOld       []tnSqliteSessVal
	indirect      bool
}

type tnSqliteSessTable struct {
	name  string
	info  tnSqliteTableInfo
	rows  map[string]*tnSqliteSessRow
	order []string
}

type TnSqliteSession struct {
	db         *TnSqliteDb
	dbName     string
	table      string
	open       bool
	tables     map[string]*tnSqliteSessTable
	tableOrder []string
}

func tnSqliteQuoteIdent(name string) string {
	return "\\"" + strings.ReplaceAll(name, "\\"", "\\"\\"") + "\\""
}

func tnSqliteValFromSQLite(v sqlite3.Value) tnSqliteSessVal {
	switch v.Type() {
	case sqlite3.INTEGER:
		return tnSqliteSessVal{kind: 1, i64: v.Int64()}
	case sqlite3.FLOAT:
		return tnSqliteSessVal{kind: 2, f64: v.Float()}
	case sqlite3.TEXT:
		return tnSqliteSessVal{kind: 3, str: v.Text()}
	case sqlite3.BLOB:
		return tnSqliteSessVal{kind: 4, blob: append([]byte(nil), v.RawBlob()...)}
	default:
		return tnSqliteSessVal{kind: 5}
	}
}

func tnSqliteValFromStmt(s *sqlite3.Stmt, col int) tnSqliteSessVal {
	switch s.ColumnType(col) {
	case sqlite3.INTEGER:
		return tnSqliteSessVal{kind: 1, i64: s.ColumnInt64(col)}
	case sqlite3.FLOAT:
		return tnSqliteSessVal{kind: 2, f64: s.ColumnFloat(col)}
	case sqlite3.TEXT:
		return tnSqliteSessVal{kind: 3, str: s.ColumnText(col)}
	case sqlite3.BLOB:
		return tnSqliteSessVal{kind: 4, blob: append([]byte(nil), s.ColumnRawBlob(col)...)}
	default:
		return tnSqliteSessVal{kind: 5}
	}
}

func tnSqliteBindSessVal(s *sqlite3.Stmt, idx int, v tnSqliteSessVal) error {
	switch v.kind {
	case 1:
		return s.BindInt64(idx, v.i64)
	case 2:
		return s.BindFloat(idx, v.f64)
	case 3:
		return s.BindText(idx, v.str)
	case 4:
		return s.BindBlob(idx, v.blob)
	default:
		return s.BindNull(idx)
	}
}

func tnSqliteSessValEqual(a, b tnSqliteSessVal) bool {
	if a.kind != b.kind {
		return false
	}
	switch a.kind {
	case 0, 5:
		return true
	case 1:
		return a.i64 == b.i64
	case 2:
		return math.Float64bits(a.f64) == math.Float64bits(b.f64)
	case 3:
		return a.str == b.str
	case 4:
		return len(a.blob) == len(b.blob) && string(a.blob) == string(b.blob)
	}
	return false
}

func tnSqliteAppendVarint(buf []byte, v uint64) []byte {
	if v < 0x80 {
		return append(buf, byte(v))
	}
	if v >= (1 << 56) {
		return append(buf,
			byte(v>>57)|0x80, byte(v>>50)|0x80, byte(v>>43)|0x80, byte(v>>36)|0x80,
			byte(v>>29)|0x80, byte(v>>22)|0x80, byte(v>>15)|0x80, byte(v>>8)|0x80,
			byte(v),
		)
	}
	var tmp [9]byte
	n := 0
	for {
		tmp[n] = byte(v & 0x7f)
		n++
		v >>= 7
		if v == 0 {
			break
		}
	}
	for i := n - 1; i > 0; i-- {
		buf = append(buf, tmp[i]|0x80)
	}
	return append(buf, tmp[0])
}

func tnSqliteReadVarint(b []byte, pos int) (uint64, int, bool) {
	if pos >= len(b) {
		return 0, pos, false
	}
	var v uint64
	for i := 0; i < 8; i++ {
		if pos+i >= len(b) {
			return 0, pos, false
		}
		c := b[pos+i]
		v = (v << 7) | uint64(c&0x7f)
		if c&0x80 == 0 {
			return v, pos + i + 1, true
		}
	}
	if pos+8 >= len(b) {
		return 0, pos, false
	}
	v = (v << 8) | uint64(b[pos+8])
	return v, pos + 9, true
}

func tnSqliteAppendVal(buf []byte, v tnSqliteSessVal) []byte {
	buf = append(buf, v.kind)
	switch v.kind {
	case 1:
		var tmp [8]byte
		binary.BigEndian.PutUint64(tmp[:], uint64(v.i64))
		buf = append(buf, tmp[:]...)
	case 2:
		var tmp [8]byte
		binary.BigEndian.PutUint64(tmp[:], math.Float64bits(v.f64))
		buf = append(buf, tmp[:]...)
	case 3:
		buf = tnSqliteAppendVarint(buf, uint64(len(v.str)))
		buf = append(buf, v.str...)
	case 4:
		buf = tnSqliteAppendVarint(buf, uint64(len(v.blob)))
		buf = append(buf, v.blob...)
	}
	return buf
}

func tnSqliteReadVal(b []byte, pos int) (tnSqliteSessVal, int, bool) {
	if pos >= len(b) {
		return tnSqliteSessVal{}, pos, false
	}
	kind := b[pos]
	pos++
	switch kind {
	case 0, 5:
		return tnSqliteSessVal{kind: kind}, pos, true
	case 1:
		if pos+8 > len(b) {
			return tnSqliteSessVal{}, pos, false
		}
		u := binary.BigEndian.Uint64(b[pos : pos+8])
		return tnSqliteSessVal{kind: 1, i64: int64(u)}, pos + 8, true
	case 2:
		if pos+8 > len(b) {
			return tnSqliteSessVal{}, pos, false
		}
		u := binary.BigEndian.Uint64(b[pos : pos+8])
		return tnSqliteSessVal{kind: 2, f64: math.Float64frombits(u)}, pos + 8, true
	case 3:
		n, next, ok := tnSqliteReadVarint(b, pos)
		if !ok || n > uint64(len(b)-next) {
			return tnSqliteSessVal{}, pos, false
		}
		return tnSqliteSessVal{kind: 3, str: string(b[next : next+int(n)])}, next + int(n), true
	case 4:
		n, next, ok := tnSqliteReadVarint(b, pos)
		if !ok || n > uint64(len(b)-next) {
			return tnSqliteSessVal{}, pos, false
		}
		blob := append([]byte(nil), b[next:next+int(n)]...)
		return tnSqliteSessVal{kind: 4, blob: blob}, next + int(n), true
	default:
		return tnSqliteSessVal{}, pos, false
	}
}

func tnSqliteEncodePK(vals []tnSqliteSessVal) (string, bool) {
	var buf []byte
	for _, v := range vals {
		if v.kind == 5 || v.kind == 0 {
			return "", false
		}
		buf = tnSqliteAppendVal(buf, v)
	}
	return string(buf), true
}

func (db *TnSqliteDb) tableInfo(schema, table string) (tnSqliteTableInfo, error) {
	q := fmt.Sprintf("PRAGMA %s.table_info(%s)", tnSqliteQuoteIdent(schema), tnSqliteQuoteIdent(table))
	st, _, err := db.conn.Prepare(q)
	if err != nil {
		return tnSqliteTableInfo{}, err
	}
	defer st.Close()
	var info tnSqliteTableInfo
	for st.Step() {
		name := st.ColumnText(1)
		pk := byte(st.ColumnInt(5))
		idx := len(info.cols)
		info.cols = append(info.cols, name)
		info.pk = append(info.pk, pk)
		if pk != 0 {
			info.pkCols = append(info.pkCols, idx)
		}
	}
	if err := st.Err(); err != nil {
		return tnSqliteTableInfo{}, err
	}
	return info, nil
}

func tnSqliteIsConstraint(err error) bool {
	var se *sqlite3.Error
	if errors.As(err, &se) {
		return se.Code() == sqlite3.CONSTRAINT
	}
	if code, ok := err.(sqlite3.ErrorCode); ok {
		return code == sqlite3.CONSTRAINT
	}
	if code, ok := err.(sqlite3.ExtendedErrorCode); ok {
		return sqlite3.ErrorCode(code&0xff) == sqlite3.CONSTRAINT
	}
	return false
}

func (db *TnSqliteDb) onPreUpdate(pud sqlite3.PreUpdateData) {
	if len(db.sessions) == 0 {
		return
	}
	nCol := pud.Count()
	indirect := pud.Depth() > 0
	var oldVals []tnSqliteSessVal
	var newVals []tnSqliteSessVal
	readOld := func() []tnSqliteSessVal {
		if oldVals == nil {
			oldVals = make([]tnSqliteSessVal, nCol)
			for i := 0; i < nCol; i++ {
				if v, err := pud.Old(i); err == nil {
					oldVals[i] = tnSqliteValFromSQLite(v)
				} else {
					oldVals[i] = tnSqliteSessVal{kind: 5}
				}
			}
		}
		return oldVals
	}
	readNew := func() []tnSqliteSessVal {
		if newVals == nil {
			newVals = make([]tnSqliteSessVal, nCol)
			for i := 0; i < nCol; i++ {
				if v, err := pud.New(i); err == nil {
					newVals[i] = tnSqliteValFromSQLite(v)
				} else {
					newVals[i] = tnSqliteSessVal{kind: 5}
				}
			}
		}
		return newVals
	}
	for _, sess := range db.sessions {
		if !sess.open {
			continue
		}
		if !strings.EqualFold(pud.Schema, sess.dbName) {
			continue
		}
		if sess.table != "" && !strings.EqualFold(pud.Table, sess.table) {
			continue
		}
		tKey := strings.ToLower(pud.Table)
		tbl, ok := sess.tables[tKey]
		if !ok || len(tbl.info.cols) != nCol {
			info, err := db.tableInfo(pud.Schema, pud.Table)
			if err != nil || len(info.pkCols) == 0 {
				continue
			}
			if !ok {
				tbl = &tnSqliteSessTable{
					name: pud.Table,
					info: info,
					rows: map[string]*tnSqliteSessRow{},
				}
				sess.tables[tKey] = tbl
				sess.tableOrder = append(sess.tableOrder, tKey)
			} else {
				tbl.info = info
			}
		}
		if len(tbl.info.pkCols) == 0 {
			continue
		}
		extractPK := func(vals []tnSqliteSessVal) ([]tnSqliteSessVal, string, bool) {
			pkVals := make([]tnSqliteSessVal, len(tbl.info.pkCols))
			for i, colIdx := range tbl.info.pkCols {
				if colIdx < len(vals) {
					pkVals[i] = vals[colIdx]
				} else {
					pkVals[i] = tnSqliteSessVal{kind: 5}
				}
			}
			key, valid := tnSqliteEncodePK(pkVals)
			return pkVals, key, valid
		}
		recordKey := func(key string, pkVals []tnSqliteSessVal, existed bool, orig []tnSqliteSessVal) {
			if row, exists := tbl.rows[key]; exists {
				if !indirect {
					row.indirect = false
				}
				return
			}
			var saved []tnSqliteSessVal
			if existed {
				saved = append([]tnSqliteSessVal(nil), orig...)
			}
			tbl.rows[key] = &tnSqliteSessRow{
				key:           key,
				pkVals:        pkVals,
				existedBefore: existed,
				origOld:       saved,
				indirect:      indirect,
			}
			tbl.order = append(tbl.order, key)
		}
		switch pud.Op {
		case sqlite3.AUTH_INSERT:
			nv := readNew()
			if pkVals, key, valid := extractPK(nv); valid {
				recordKey(key, pkVals, false, nil)
			}
		case sqlite3.AUTH_DELETE:
			ov := readOld()
			if pkVals, key, valid := extractPK(ov); valid {
				recordKey(key, pkVals, true, ov)
			}
		case sqlite3.AUTH_UPDATE:
			ov := readOld()
			nv := readNew()
			oldPK, oldKey, oldValid := extractPK(ov)
			newPK, newKey, newValid := extractPK(nv)
			if oldValid {
				recordKey(oldKey, oldPK, true, ov)
			}
			if newValid && (!oldValid || newKey != oldKey) {
				recordKey(newKey, newPK, false, nil)
			}
		}
	}
}

func (db *TnSqliteDb) createSession(options ...interface{}) *TnSqliteSession {
	db.requireOpen()
	dbName := "main"
	table := ""
	if len(options) > 0 && options[0] != nil {
		if s := tnSqliteString(options[0], "db", ""); s != "" {
			dbName = s
		}
		table = tnSqliteString(options[0], "table", "")
	}
	sess := &TnSqliteSession{
		db:     db,
		dbName: dbName,
		table:  table,
		open:   true,
		tables: map[string]*tnSqliteSessTable{},
	}
	if len(db.sessions) == 0 {
		db.conn.PreUpdateHook(db.onPreUpdate)
	}
	db.sessions = append(db.sessions, sess)
	return sess
}

func (s *TnSqliteSession) requireOpen() {
	s.db.requireOpen()
	if !s.open {
		panic(tnSqliteState("session is not open"))
	}
}

func (s *TnSqliteSession) close() {
	s.requireOpen()
	s.open = false
	for i, cur := range s.db.sessions {
		if cur == s {
			s.db.sessions = append(s.db.sessions[:i], s.db.sessions[i+1:]...)
			break
		}
	}
	if len(s.db.sessions) == 0 {
		s.db.conn.PreUpdateHook(nil)
	}
}

func (s *TnSqliteSession) __dispose() {
	if s.open && s.db.conn != nil {
		s.close()
	}
}

func (s *TnSqliteSession) buildSet(isPatchset bool) []byte {
	s.requireOpen()
	out := []byte{}
	for _, tKey := range s.tableOrder {
		tbl := s.tables[tKey]
		info, err := s.db.tableInfo(s.dbName, tbl.name)
		if err != nil || len(info.cols) == 0 || len(info.pkCols) == 0 {
			continue
		}
		nCol := len(info.cols)
		colList := make([]string, nCol)
		for i, c := range info.cols {
			colList[i] = tnSqliteQuoteIdent(c)
		}
		whereParts := make([]string, len(info.pkCols))
		for i, colIdx := range info.pkCols {
			whereParts[i] = tnSqliteQuoteIdent(info.cols[colIdx]) + " = ?"
		}
		selSQL := fmt.Sprintf("SELECT %s FROM %s.%s WHERE %s",
			strings.Join(colList, ", "),
			tnSqliteQuoteIdent(s.dbName),
			tnSqliteQuoteIdent(tbl.name),
			strings.Join(whereParts, " AND "),
		)
		st, _, err := s.db.conn.Prepare(selSQL)
		if err != nil {
			continue
		}
		var tableBuf []byte
		for _, rKey := range tbl.order {
			row := tbl.rows[rKey]
			if len(row.pkVals) != len(info.pkCols) {
				continue
			}
			for i, pv := range row.pkVals {
				tnSqliteBindSessVal(st, i+1, pv)
			}
			existsNow := st.Step()
			var curVals []tnSqliteSessVal
			if existsNow {
				curVals = make([]tnSqliteSessVal, nCol)
				for i := 0; i < nCol; i++ {
					curVals[i] = tnSqliteValFromStmt(st, i)
				}
			}
			st.Reset()
			st.ClearBindings()
			var ind byte
			if row.indirect {
				ind = 1
			}
			if !row.existedBefore && !existsNow {
				continue
			}
			if !row.existedBefore && existsNow {
				tableBuf = append(tableBuf, 18, ind)
				for i := 0; i < nCol; i++ {
					tableBuf = tnSqliteAppendVal(tableBuf, curVals[i])
				}
				continue
			}
			orig := row.origOld
			if len(orig) < nCol {
				padded := make([]tnSqliteSessVal, nCol)
				copy(padded, orig)
				for i := len(orig); i < nCol; i++ {
					padded[i] = tnSqliteSessVal{kind: 5}
				}
				orig = padded
			}
			if row.existedBefore && !existsNow {
				tableBuf = append(tableBuf, 9, ind)
				if isPatchset {
					for _, colIdx := range info.pkCols {
						tableBuf = tnSqliteAppendVal(tableBuf, orig[colIdx])
					}
				} else {
					for i := 0; i < nCol; i++ {
						tableBuf = tnSqliteAppendVal(tableBuf, orig[i])
					}
				}
				continue
			}
			// Both existed before and exists now -> UPDATE if any column differs
			changed := make([]bool, nCol)
			anyChanged := false
			for i := 0; i < nCol; i++ {
				if !tnSqliteSessValEqual(orig[i], curVals[i]) {
					changed[i] = true
					anyChanged = true
				}
			}
			if !anyChanged {
				continue
			}
			tableBuf = append(tableBuf, 23, ind)
			if isPatchset {
				for i := 0; i < nCol; i++ {
					if changed[i] || info.pk[i] != 0 {
						tableBuf = tnSqliteAppendVal(tableBuf, curVals[i])
					} else {
						tableBuf = append(tableBuf, 0)
					}
				}
			} else {
				for i := 0; i < nCol; i++ {
					if info.pk[i] != 0 || changed[i] {
						tableBuf = tnSqliteAppendVal(tableBuf, orig[i])
					} else {
						tableBuf = append(tableBuf, 0)
					}
				}
				for i := 0; i < nCol; i++ {
					if changed[i] {
						tableBuf = tnSqliteAppendVal(tableBuf, curVals[i])
					} else {
						tableBuf = append(tableBuf, 0)
					}
				}
			}
		}
		st.Close()
		if len(tableBuf) > 0 {
			if isPatchset {
				out = append(out, 'P')
			} else {
				out = append(out, 'T')
			}
			out = tnSqliteAppendVarint(out, uint64(nCol))
			out = append(out, info.pk...)
			out = append(out, tbl.name...)
			out = append(out, 0)
			out = append(out, tableBuf...)
		}
	}
	return out
}

func (s *TnSqliteSession) changeset() []byte { return s.buildSet(false) }
func (s *TnSqliteSession) patchset() []byte  { return s.buildSet(true) }

func (db *TnSqliteDb) applyChangeset(changeset []byte, options ...interface{}) bool {
	db.requireOpen()
	var filterFn, conflictFn interface{}
	if len(options) > 0 && options[0] != nil {
		if v := TnGet(options[0], "filter"); v != nil {
			if !tnSqliteIsFunc(v) {
				panic(tnSqliteArgType("The \\"options.filter\\" argument must be a function."))
			}
			filterFn = v
		}
		if v := TnGet(options[0], "onConflict"); v != nil {
			if !tnSqliteIsFunc(v) {
				panic(tnSqliteArgType("The \\"options.onConflict\\" argument must be a function."))
			}
			conflictFn = v
		}
	}
	if len(changeset) == 0 {
		return true
	}
	callConflict := func(kind int) int {
		if conflictFn == nil {
			return 2 // SQLITE_CHANGESET_ABORT
		}
		res := TnInvoke(conflictFn, float64(kind))
		n, ok := res.(float64)
		if !ok || (n != 0 && n != 1 && n != 2) {
			panic(tnSqliteCodeError(21, "bad parameter or other API misuse"))
		}
		action := int(n)
		if action == 1 && kind != 1 && kind != 3 {
			// SQLITE_CHANGESET_REPLACE is only valid for DATA (1) and CONFLICT (3)
			panic(tnSqliteCodeError(21, "bad parameter or other API misuse"))
		}
		return action
	}
	corrupt := func() {
		panic(tnSqliteCodeError(11, "database disk image is malformed"))
	}

	fkeyEnabled, _ := db.conn.Config(sqlite3.DBCONFIG_ENABLE_FKEY)
	trigEnabled, _ := db.conn.Config(sqlite3.DBCONFIG_ENABLE_TRIGGER)
	if fkeyEnabled {
		db.conn.Config(sqlite3.DBCONFIG_ENABLE_FKEY, false)
	}
	if trigEnabled {
		db.conn.Config(sqlite3.DBCONFIG_ENABLE_TRIGGER, false)
	}
	db.check(db.conn.Exec("SAVEPOINT __tn_changeset"))
	committed := false
	defer func() {
		if !committed {
			db.conn.Exec("ROLLBACK TO SAVEPOINT __tn_changeset")
			db.conn.Exec("RELEASE SAVEPOINT __tn_changeset")
		}
		if fkeyEnabled {
			db.conn.Config(sqlite3.DBCONFIG_ENABLE_FKEY, true)
		}
		if trigEnabled {
			db.conn.Config(sqlite3.DBCONFIG_ENABLE_TRIGGER, true)
		}
	}()

	pos := 0
	for pos < len(changeset) {
		hdr := changeset[pos]
		if hdr != 'T' && hdr != 'P' {
			corrupt()
		}
		isPatchset := hdr == 'P'
		pos++
		nColU, nextPos, ok := tnSqliteReadVarint(changeset, pos)
		if !ok || nColU == 0 || nColU > 32767 {
			corrupt()
		}
		nCol := int(nColU)
		pos = nextPos
		if pos+nCol > len(changeset) {
			corrupt()
		}
		pkFlags := changeset[pos : pos+nCol]
		pos += nCol
		var pkCols []int
		for i := 0; i < nCol; i++ {
			if pkFlags[i] != 0 {
				pkCols = append(pkCols, i)
			}
		}
		if len(pkCols) == 0 {
			corrupt()
		}
		nul := -1
		for i := pos; i < len(changeset); i++ {
			if changeset[i] == 0 {
				nul = i
				break
			}
		}
		if nul < 0 {
			corrupt()
		}
		tableName := string(changeset[pos:nul])
		pos = nul + 1

		applyTable := true
		if filterFn != nil {
			applyTable = TnTruthy(TnInvoke(filterFn, tableName))
		}
		var targetInfo tnSqliteTableInfo
		if applyTable {
			info, err := db.tableInfo("main", tableName)
			db.check(err)
			if len(info.cols) == 0 {
				applyTable = false
			} else {
				if len(info.cols) < nCol {
					panic(tnSqliteCodeError(17, "database schema has changed"))
				}
				for i := 0; i < nCol; i++ {
					if (info.pk[i] != 0) != (pkFlags[i] != 0) {
						panic(tnSqliteCodeError(17, "database schema has changed"))
					}
				}
				for i := nCol; i < len(info.cols); i++ {
					if info.pk[i] != 0 {
						panic(tnSqliteCodeError(17, "database schema has changed"))
					}
				}
				targetInfo = info
			}
		}

		var qTable string
		var colNames []string
		var whereClause string
		if applyTable {
			qTable = tnSqliteQuoteIdent(tableName)
			colNames = make([]string, nCol)
			for i := 0; i < nCol; i++ {
				colNames[i] = tnSqliteQuoteIdent(targetInfo.cols[i])
			}
			whereParts := make([]string, len(pkCols))
			for i, colIdx := range pkCols {
				whereParts[i] = colNames[colIdx] + " = ?"
			}
			whereClause = strings.Join(whereParts, " AND ")
		}

		selectRow := func(pkVals []tnSqliteSessVal) ([]tnSqliteSessVal, bool) {
			selSQL := fmt.Sprintf("SELECT %s FROM %s WHERE %s", strings.Join(colNames, ", "), qTable, whereClause)
			st, _, err := db.conn.Prepare(selSQL)
			db.check(err)
			defer st.Close()
			for i, v := range pkVals {
				db.check(tnSqliteBindSessVal(st, i+1, v))
			}
			if !st.Step() {
				db.check(st.Err())
				return nil, false
			}
			vals := make([]tnSqliteSessVal, nCol)
			for i := 0; i < nCol; i++ {
				vals[i] = tnSqliteValFromStmt(st, i)
			}
			return vals, true
		}

		for pos < len(changeset) && changeset[pos] != 'T' && changeset[pos] != 'P' {
			if pos+2 > len(changeset) {
				corrupt()
			}
			op := changeset[pos]
			indirect := changeset[pos+1]
			if indirect > 1 {
				corrupt()
			}
			pos += 2
			var oldVals, newVals, delPK []tnSqliteSessVal
			switch op {
			case 18: // INSERT
				newVals = make([]tnSqliteSessVal, nCol)
				for i := 0; i < nCol; i++ {
					v, next, ok := tnSqliteReadVal(changeset, pos)
					if !ok || v.kind == 0 {
						corrupt()
					}
					newVals[i] = v
					pos = next
				}
			case 9: // DELETE
				if isPatchset {
					delPK = make([]tnSqliteSessVal, len(pkCols))
					for i := 0; i < len(pkCols); i++ {
						v, next, ok := tnSqliteReadVal(changeset, pos)
						if !ok || v.kind == 0 {
							corrupt()
						}
						delPK[i] = v
						pos = next
					}
				} else {
					oldVals = make([]tnSqliteSessVal, nCol)
					for i := 0; i < nCol; i++ {
						v, next, ok := tnSqliteReadVal(changeset, pos)
						if !ok || v.kind == 0 {
							corrupt()
						}
						oldVals[i] = v
						pos = next
					}
				}
			case 23: // UPDATE
				if isPatchset {
					newVals = make([]tnSqliteSessVal, nCol)
					for i := 0; i < nCol; i++ {
						v, next, ok := tnSqliteReadVal(changeset, pos)
						if !ok {
							corrupt()
						}
						newVals[i] = v
						pos = next
					}
				} else {
					oldVals = make([]tnSqliteSessVal, nCol)
					for i := 0; i < nCol; i++ {
						v, next, ok := tnSqliteReadVal(changeset, pos)
						if !ok {
							corrupt()
						}
						oldVals[i] = v
						pos = next
					}
					newVals = make([]tnSqliteSessVal, nCol)
					for i := 0; i < nCol; i++ {
						v, next, ok := tnSqliteReadVal(changeset, pos)
						if !ok {
							corrupt()
						}
						newVals[i] = v
						pos = next
					}
				}
			default:
				corrupt()
			}
			if !applyTable {
				continue
			}

			switch op {
			case 18: // INSERT
				placeholders := make([]string, nCol)
				for i := 0; i < nCol; i++ {
					placeholders[i] = "?"
				}
				insSQL := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", qTable, strings.Join(colNames, ", "), strings.Join(placeholders, ", "))
				st, _, err := db.conn.Prepare(insSQL)
				db.check(err)
				for i, v := range newVals {
					db.check(tnSqliteBindSessVal(st, i+1, v))
				}
				err = st.Exec()
				st.Close()
				if err != nil {
					if !tnSqliteIsConstraint(err) {
						db.check(err)
					}
					pkVals := make([]tnSqliteSessVal, len(pkCols))
					for i, colIdx := range pkCols {
						pkVals[i] = newVals[colIdx]
					}
					_, pkExists := selectRow(pkVals)
					if pkExists {
						action := callConflict(3) // SQLITE_CHANGESET_CONFLICT
						if action == 2 {
							return false
						}
						if action == 1 {
							var setParts []string
							var setVals []tnSqliteSessVal
							for i := 0; i < nCol; i++ {
								if pkFlags[i] == 0 {
									setParts = append(setParts, colNames[i]+" = ?")
									setVals = append(setVals, newVals[i])
								}
							}
							if len(setParts) > 0 {
								updSQL := fmt.Sprintf("UPDATE %s SET %s WHERE %s", qTable, strings.Join(setParts, ", "), whereClause)
								ust, _, uerr := db.conn.Prepare(updSQL)
								db.check(uerr)
								for i, v := range setVals {
									db.check(tnSqliteBindSessVal(ust, i+1, v))
								}
								for i, v := range pkVals {
									db.check(tnSqliteBindSessVal(ust, len(setVals)+i+1, v))
								}
								uerr = ust.Exec()
								ust.Close()
								if uerr != nil {
									if !tnSqliteIsConstraint(uerr) {
										db.check(uerr)
									}
									if callConflict(4) == 2 {
										return false
									}
								}
							}
						}
					} else {
						if callConflict(4) == 2 { // SQLITE_CHANGESET_CONSTRAINT
							return false
						}
					}
				}

			case 9: // DELETE
				pkVals := delPK
				if !isPatchset {
					pkVals = make([]tnSqliteSessVal, len(pkCols))
					for i, colIdx := range pkCols {
						pkVals[i] = oldVals[colIdx]
					}
				}
				curVals, exists := selectRow(pkVals)
				if !exists {
					if callConflict(2) == 2 { // SQLITE_CHANGESET_NOTFOUND
						return false
					}
					continue
				}
				if !isPatchset {
					mismatch := false
					for i := 0; i < nCol; i++ {
						if !tnSqliteSessValEqual(curVals[i], oldVals[i]) {
							mismatch = true
							break
						}
					}
					if mismatch {
						action := callConflict(1) // SQLITE_CHANGESET_DATA
						if action == 2 {
							return false
						}
						if action == 0 {
							continue
						}
					}
				}
				delSQL := fmt.Sprintf("DELETE FROM %s WHERE %s", qTable, whereClause)
				dst, _, derr := db.conn.Prepare(delSQL)
				db.check(derr)
				for i, v := range pkVals {
					db.check(tnSqliteBindSessVal(dst, i+1, v))
				}
				derr = dst.Exec()
				dst.Close()
				if derr != nil {
					if !tnSqliteIsConstraint(derr) {
						db.check(derr)
					}
					if callConflict(4) == 2 {
						return false
					}
				}

			case 23: // UPDATE
				pkVals := make([]tnSqliteSessVal, len(pkCols))
				if isPatchset {
					for i, colIdx := range pkCols {
						pkVals[i] = newVals[colIdx]
					}
				} else {
					for i, colIdx := range pkCols {
						pkVals[i] = oldVals[colIdx]
					}
				}
				curVals, exists := selectRow(pkVals)
				if !exists {
					if callConflict(2) == 2 { // SQLITE_CHANGESET_NOTFOUND
						return false
					}
					continue
				}
				if !isPatchset {
					mismatch := false
					for i := 0; i < nCol; i++ {
						if oldVals[i].kind != 0 && !tnSqliteSessValEqual(curVals[i], oldVals[i]) {
							mismatch = true
							break
						}
					}
					if mismatch {
						action := callConflict(1) // SQLITE_CHANGESET_DATA
						if action == 2 {
							return false
						}
						if action == 0 {
							continue
						}
					}
				}
				var setParts []string
				var setVals []tnSqliteSessVal
				for i := 0; i < nCol; i++ {
					if newVals[i].kind != 0 && (!isPatchset || pkFlags[i] == 0) {
						setParts = append(setParts, colNames[i]+" = ?")
						setVals = append(setVals, newVals[i])
					}
				}
				if len(setParts) > 0 {
					updSQL := fmt.Sprintf("UPDATE %s SET %s WHERE %s", qTable, strings.Join(setParts, ", "), whereClause)
					ust, _, uerr := db.conn.Prepare(updSQL)
					db.check(uerr)
					for i, v := range setVals {
						db.check(tnSqliteBindSessVal(ust, i+1, v))
					}
					for i, v := range pkVals {
						db.check(tnSqliteBindSessVal(ust, len(setVals)+i+1, v))
					}
					uerr = ust.Exec()
					ust.Close()
					if uerr != nil {
						if !tnSqliteIsConstraint(uerr) {
							db.check(uerr)
						}
						if callConflict(4) == 2 {
							return false
						}
					}
				}
			}
		}
	}

	if fkeyEnabled {
		st, _, err := db.conn.Prepare("PRAGMA foreign_key_check")
		db.check(err)
		hasFKViolation := st.Step()
		st.Close()
		if hasFKViolation {
			action := callConflict(5) // SQLITE_CHANGESET_FOREIGN_KEY
			if action == 2 {
				panic(tnSqliteCodeError(19, "constraint failed"))
			}
		}
	}
	db.check(db.conn.Exec("RELEASE SAVEPOINT __tn_changeset"))
	committed = true
	return true
}

// serialize(dbName = 'main') / deserialize(buffer, { dbName }): the database
// image goes through a temporary file and SQLite's backup API (the driver
// has no sqlite3_serialize binding)
func tnSqliteTempFile() string {
	f, err := os.CreateTemp("", "tnsqlite-*.db")
	if err != nil {
		panic(tnSqliteError(err))
	}
	f.Close()
	return f.Name()
}

func (db *TnSqliteDb) serialize(name ...interface{}) []byte {
	db.requireOpen()
	schema := "main"
	if len(name) > 0 {
		if s, ok := name[0].(string); ok {
			schema = s
		}
	}
	path := tnSqliteTempFile()
	defer os.Remove(path)
	os.Remove(path)
	db.check(db.conn.Backup(schema, path))
	data, err := os.ReadFile(path)
	if err != nil {
		panic(tnSqliteError(err))
	}
	return data
}

func (db *TnSqliteDb) deserialize(data []byte, options ...interface{}) {
	db.requireOpen()
	schema := "main"
	if len(options) > 0 && options[0] != nil {
		if s, ok := TnGetValue(options[0], "dbName").(string); ok {
			schema = s
		}
	}
	path := tnSqliteTempFile()
	defer os.Remove(path)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		panic(tnSqliteError(err))
	}
	db.check(db.conn.Restore(schema, path))
}

// statement.close() / [Symbol.dispose](): finalized now (later calls throw)
func (st *TnSqliteStmt) close() {
	if st.s != nil && st.db.live[st.s] {
		delete(st.db.live, st.s)
		st.s.Close()
	}
}

func (st *TnSqliteStmt) __dispose() { st.close() }

// statement.stat(counter): one of SQLite's statement counters
var tnSqliteStatCounters = map[string]sqlite3.StmtStatus{
	"fullscanStep": sqlite3.STMTSTATUS_FULLSCAN_STEP, "sort": sqlite3.STMTSTATUS_SORT,
	"autoindex": sqlite3.STMTSTATUS_AUTOINDEX, "vmStep": sqlite3.STMTSTATUS_VM_STEP,
	"reprepare": sqlite3.STMTSTATUS_REPREPARE, "run": sqlite3.STMTSTATUS_RUN,
	"filterMiss": sqlite3.STMTSTATUS_FILTER_MISS, "filterHit": sqlite3.STMTSTATUS_FILTER_HIT,
	"memused": sqlite3.STMTSTATUS_MEMUSED,
}

func (st *TnSqliteStmt) stat(counter interface{}) float64 {
	st.requireLive()
	name, isString := counter.(string)
	if !isString {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"counter\\" argument must be a string."))
	}
	op, ok := tnSqliteStatCounters[name]
	if !ok {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The \\"counter\\" argument is not a valid statistic name."))
	}
	return float64(st.s.Status(op, false))
}

// statement.resetStats(): every counter back to 0
func (st *TnSqliteStmt) resetStats() {
	st.requireLive()
	for _, op := range tnSqliteStatCounters {
		if op != sqlite3.STMTSTATUS_MEMUSED {
			st.s.Status(op, true)
		}
	}
}

func (st *TnSqliteStmt) requireLive() {
	// db.close() (or a reopen) finalized it
	if st.s == nil || !st.db.live[st.s] {
		panic(tnSqliteState("statement has been finalized"))
	}
	st.db.requireOpen()
}

// A JS value bound to a statement parameter
func (st *TnSqliteStmt) bindValue(index int, v interface{}) {
	var err error
	switch x := v.(type) {
	case nil:
		err = st.s.BindNull(index)
	case float64:
		err = st.s.BindFloat(index, x)
	case bool:
		err = st.s.BindBool(index, x)
	case string:
		err = st.s.BindText(index, x)
	case []byte:
		err = st.s.BindBlob(index, x)
	case *tnbig.Int:
		if x == nil {
			err = st.s.BindNull(index)
		} else if !x.IsInt64() {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "BigInt value is too large to bind."))
		} else {
			err = st.s.BindInt64(index, x.Int64())
		}
	default:
		rv := reflect.ValueOf(v)
		switch {
		case rv.Kind() >= reflect.Int && rv.Kind() <= reflect.Float64 && rv.Kind() != reflect.Uintptr:
			err = st.s.BindFloat(index, rv.Convert(reflect.TypeOf(float64(0))).Float())
		case (rv.Kind() == reflect.Pointer || rv.Kind() == reflect.Slice || rv.Kind() == reflect.Map) && rv.IsNil():
			err = st.s.BindNull(index)
		case rv.Kind() == reflect.Pointer && rv.Elem().Kind() != reflect.Struct:
			st.bindValue(index, rv.Elem().Interface())
			return
		default:
			panic(tnSqliteArgType(fmt.Sprintf("Provided value cannot be bound to SQLite parameter %d.", index)))
		}
	}
	st.db.check(err)
}

// Whether the first argument holds named parameters (a plain object)
func tnSqliteIsNamed(v interface{}) bool {
	switch v.(type) {
	case nil, string, float64, bool, []byte, *tnbig.Int:
		return false
	case map[string]interface{}, []interface{}:
		return true
	}
	if _, ok := v.(interface{ Entries() [][]interface{} }); ok {
		return true
	}
	rv := reflect.ValueOf(v)
	return rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct
}

// The keys and values of a named-parameters object, in order
func tnSqliteEntries(v interface{}) ([]string, []interface{}) {
	keys := []string{}
	values := []interface{}{}
	// An array binds its indices as names ('0', '1', …), as in Node
	if a, ok := v.([]interface{}); ok {
		for i, value := range a {
			keys = append(keys, strconv.Itoa(i))
			values = append(values, value)
		}
		return keys, values
	}
	if m, ok := v.(map[string]interface{}); ok {
		for k := range m {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			values = append(values, m[k])
		}
		return keys, values
	}
	if e, ok := v.(interface{ Entries() [][]interface{} }); ok {
		for _, entry := range e.Entries() {
			if k, isString := entry[0].(string); isString {
				keys = append(keys, k)
				values = append(values, entry[1])
			}
		}
		return keys, values
	}
	rv := reflect.ValueOf(v).Elem()
	for i := 0; i < rv.NumField(); i++ {
		f := rv.Field(i)
		keys = append(keys, strings.TrimSuffix(rv.Type().Field(i).Name, "_"))
		values = append(values, reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface())
	}
	return keys, values
}

// Binds run / get / all / iterate arguments: an optional named-parameters
// object, then anonymous parameters into the unnamed slots, as Node does
func (st *TnSqliteStmt) bind(args []interface{}) {
	st.s.Reset()
	st.s.ClearBindings()
	anon := args
	if len(args) > 0 && tnSqliteIsNamed(args[0]) {
		anon = args[1:]
		// Bare names (\`{ id }\` for :id / $id / @id), built on first use
		var bare map[string]string
		bareNames := func() map[string]string {
			if bare == nil {
				bare = map[string]string{}
				for i := 1; i <= st.s.BindCount(); i++ {
					full := st.s.BindName(i)
					if len(full) < 2 {
						continue
					}
					name := full[1:]
					if prev, seen := bare[name]; seen && prev != full {
						panic(tnSqliteState(fmt.Sprintf("Cannot create bare named parameter '%s' because of conflicting names '%s' and '%s'.", name, prev, full)))
					}
					bare[name] = full
				}
			}
			return bare
		}
		keys, values := tnSqliteEntries(args[0])
		for i, key := range keys {
			index := st.s.BindIndex(key)
			if index == 0 && st.allowBare {
				bare := bareNames()
				if full, ok := bare[key]; ok {
					index = st.s.BindIndex(full)
				}
			}
			if index == 0 {
				if st.allowUnknown {
					continue
				}
				panic(tnSqliteState(fmt.Sprintf("Unknown named parameter '%s'", key)))
			}
			st.bindValue(index, values[i])
		}
	}
	index := 1
	for _, v := range anon {
		for st.s.BindName(index) != "" {
			index++
		}
		st.bindValue(index, v)
		index++
	}
}

func (st *TnSqliteStmt) column(i int) interface{} {
	switch st.s.ColumnType(i) {
	case sqlite3.INTEGER:
		return tnSqliteInteger(st.s.ColumnInt64(i), st.readBigInts)
	case sqlite3.FLOAT:
		return st.s.ColumnFloat(i)
	case sqlite3.TEXT:
		return st.s.ColumnText(i)
	case sqlite3.BLOB:
		return append([]byte{}, st.s.ColumnRawBlob(i)...)
	}
	return nil
}

// The current row: an object keyed by column name, or an array (returnArrays)
func (st *TnSqliteStmt) row() interface{} {
	n := st.s.ColumnCount()
	if st.returnArrays {
		values := make([]interface{}, n)
		for i := 0; i < n; i++ {
			values[i] = st.column(i)
		}
		return values
	}
	row := TnNewMap[string, interface{}]()
	for i := 0; i < n; i++ {
		row.Set(st.s.ColumnName(i), st.column(i))
	}
	return row
}

func (st *TnSqliteStmt) run(args ...interface{}) *TnSqliteRunResult {
	st.requireLive()
	st.bind(args)
	defer st.s.Reset()
	for st.s.Step() {
	}
	st.db.check(st.s.Err())
	conn := st.db.conn
	return &TnSqliteRunResult{
		changes:         tnSqliteInteger(conn.Changes(), st.readBigInts),
		lastInsertRowid: tnSqliteInteger(conn.LastInsertRowID(), st.readBigInts),
	}
}

func (st *TnSqliteStmt) get(args ...interface{}) interface{} {
	st.requireLive()
	st.bind(args)
	defer st.s.Reset()
	if st.s.Step() {
		return st.row()
	}
	st.db.check(st.s.Err())
	return nil
}

func (st *TnSqliteStmt) all(args ...interface{}) []interface{} {
	st.requireLive()
	st.bind(args)
	defer st.s.Reset()
	rows := []interface{}{}
	for st.s.Step() {
		rows = append(rows, st.row())
	}
	st.db.check(st.s.Err())
	return rows
}

func (st *TnSqliteStmt) iterate(args ...interface{}) *TnSqliteIterator {
	st.requireLive()
	st.bind(args)
	return &TnSqliteIterator{stmt: st}
}

func (it *TnSqliteIterator) next() *TnSqliteIteratorResult {
	if it.done {
		return &TnSqliteIteratorResult{done: true}
	}
	st := it.stmt
	st.requireLive()
	if st.s.Step() {
		return &TnSqliteIteratorResult{value: st.row()}
	}
	it.done = true
	err := st.s.Err()
	st.s.Reset()
	st.db.check(err)
	return &TnSqliteIteratorResult{done: true}
}

// for...of over iterate(): the remaining rows
func (it *TnSqliteIterator) TnRows() []interface{} {
	rows := []interface{}{}
	for {
		r := it.next()
		if r.done {
			return rows
		}
		rows = append(rows, r.value)
	}
}

func tnSqliteNullable(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (st *TnSqliteStmt) columns() []interface{} {
	st.requireLive()
	out := []interface{}{}
	for i := 0; i < st.s.ColumnCount(); i++ {
		out = append(out, TnNewMap[string, interface{}]().
			Set("column", tnSqliteNullable(st.s.ColumnOriginName(i))).
			Set("database", tnSqliteNullable(st.s.ColumnDatabaseName(i))).
			Set("name", st.s.ColumnName(i)).
			Set("table", tnSqliteNullable(st.s.ColumnTableName(i))).
			Set("type", tnSqliteNullable(st.s.ColumnDeclType(i))))
	}
	return out
}

func (st *TnSqliteStmt) Get_sourceSQL() string {
	st.requireLive()
	return st.sql
}

func (st *TnSqliteStmt) Get_expandedSQL() string {
	st.requireLive()
	return st.s.ExpandedSQL()
}

func (st *TnSqliteStmt) setReadBigInts(on bool) {
	st.requireLive()
	st.readBigInts = on
}

func (st *TnSqliteStmt) setReturnArrays(on bool) {
	st.requireLive()
	st.returnArrays = on
}

func (st *TnSqliteStmt) setAllowBareNamedParameters(on bool) {
	st.requireLive()
	st.allowBare = on
}

func (st *TnSqliteStmt) setAllowUnknownNamedParameters(on bool) {
	st.requireLive()
	st.allowUnknown = on
}

// createTagStore(maxSize = 1000): sql\`SELECT … \${x}\` prepares (and caches,
// least recently used first out) one statement per template
type TnSqliteTagStore struct {
	db       *TnSqliteDb
	capacity int
	order    []string
	cache    map[string]*TnSqliteStmt
}

func (db *TnSqliteDb) createTagStore(maxSize ...interface{}) *TnSqliteTagStore {
	db.requireOpen()
	capacity := 1000
	if len(maxSize) > 0 {
		if n, ok := maxSize[0].(float64); ok {
			capacity = int(n)
		}
	}
	return &TnSqliteTagStore{db: db, capacity: capacity, cache: map[string]*TnSqliteStmt{}}
}

func (ts *TnSqliteTagStore) stmt(parts []string) *TnSqliteStmt {
	sql := strings.Join(parts, "?")
	for i, key := range ts.order {
		if key == sql {
			ts.order = append(append(ts.order[:i:i], ts.order[i+1:]...), sql)
			break
		}
	}
	if st, ok := ts.cache[sql]; ok && st.s != nil {
		return st
	}
	st := ts.db.prepare(sql)
	if _, cached := ts.cache[sql]; !cached {
		ts.order = append(ts.order, sql)
	}
	ts.cache[sql] = st
	for len(ts.order) > ts.capacity {
		delete(ts.cache, ts.order[0])
		ts.order = ts.order[1:]
	}
	return st
}

func (ts *TnSqliteTagStore) get(parts []string, args ...interface{}) interface{} {
	return ts.stmt(parts).get(args...)
}

func (ts *TnSqliteTagStore) all(parts []string, args ...interface{}) []interface{} {
	return ts.stmt(parts).all(args...)
}

func (ts *TnSqliteTagStore) iterate(parts []string, args ...interface{}) *TnSqliteIterator {
	return ts.stmt(parts).iterate(args...)
}

func (ts *TnSqliteTagStore) run(parts []string, args ...interface{}) *TnSqliteRunResult {
	return ts.stmt(parts).run(args...)
}

func (ts *TnSqliteTagStore) clear() {
	ts.order = nil
	ts.cache = map[string]*TnSqliteStmt{}
}

func (ts *TnSqliteTagStore) Get_size() float64     { return float64(len(ts.cache)) }
func (ts *TnSqliteTagStore) Get_capacity() float64 { return float64(ts.capacity) }
func (ts *TnSqliteTagStore) Get_db() *TnSqliteDb   { return ts.db }

// backup(db, path, { source, target, rate, progress }): copies rate pages per
// event-loop turn (the connection stays on the loop's goroutine); resolves
// with the number of pages copied
func TnSqliteBackup(db *TnSqliteDb, path string, opts ...interface{}) chan float64 {
	ch := make(chan float64, 1)
	var options interface{}
	if len(opts) > 0 {
		options = opts[0]
	}
	if db.conn == nil {
		TnReject(ch, tnSqliteState("database is not open"))
		return ch
	}
	rate := int(tnSqliteNumber(options, "rate", 100))
	if rate == 0 {
		rate = -1
	}
	progress := TnGet(options, "progress")
	b, err := db.conn.BackupInit(tnSqliteString(options, "source", "main"), path)
	if err != nil {
		TnReject(ch, tnSqliteError(err))
		return ch
	}
	TnLoopRef()
	var step func()
	step = func() {
		done, err := b.Step(rate)
		if err != nil {
			b.Close()
			TnLoopUnref()
			TnReject(ch, tnSqliteError(err))
			return
		}
		if !done {
			if options != nil && tnSqliteIsFunc(progress) {
				TnInvoke(progress, &TnSqliteBackupProgress{totalPages: float64(b.PageCount()), remainingPages: float64(b.Remaining())})
			}
			TnLoopPost(step)
			return
		}
		total := b.PageCount()
		err = b.Close()
		TnLoopUnref()
		if err != nil {
			TnReject(ch, tnSqliteError(err))
			return
		}
		ch <- float64(total)
	}
	TnLoopPost(step)
	return ch
}`;
export function registerSqlite(r) {
    defineModule(r, 'sqlite');
    defineHelper(r, 'nodeSqlite', ['github.com/ncruces/go-sqlite3', 'encoding/binary', 'errors', 'fmt', 'math', 'math/big', 'os', 'reflect', 'runtime', 'sort', 'strconv', 'strings', 'time', 'unsafe'], ['dynamic', 'orderedMap', 'nodeInvoke', 'eventLoop', 'promise', 'generatorStep'], sqliteHelper);
    const use = () => r.helper('nodeSqlite');
    defineClass(r, 'sqlite.DatabaseSync', '*TnSqliteDb', 'class', 'open=; close=; exec=; prepare=*TnSqliteStmt; location=*string; function=; aggregate=; createModule=; enableLoadExtension=; enableDefensive=; loadExtension=; setAuthorizer=; createTagStore=*TnSqliteTagStore; createSession=*TnSqliteSession; applyChangeset=bool; serialize=[]byte; deserialize=', '', 'isOpen=bool; isTransaction=bool; limits=*TnSqliteLimits', '');
    defineClass(r, 'sqlite.Session', '*TnSqliteSession', 'class', 'changeset=[]byte; patchset=[]byte; close=; __dispose=', '', '', '');
    defineClass(r, 'sqlite.StatementSync', '*TnSqliteStmt', 'class', 'run=*TnSqliteRunResult; get=interface{}; all=[]interface{}; iterate=*TnSqliteIterator; columns=[]interface{}; setReadBigInts=; setReturnArrays=; setAllowBareNamedParameters=; setAllowUnknownNamedParameters=; close=; __dispose=; stat=float64; resetStats=', '', 'sourceSQL=string; expandedSQL=string', '');
    defineClass(r, 'sqlite.StatementResultingChanges', '*TnSqliteRunResult', 'class', '', 'changes=interface{}; lastInsertRowid=interface{}', '', '');
    defineClass(r, 'sqlite.SQLTagStore', '*TnSqliteTagStore', 'class', 'get=interface{}; all=[]interface{}; iterate=*TnSqliteIterator; run=*TnSqliteRunResult; clear=', '', 'size=float64; capacity=float64; db=*TnSqliteDb', '');
    const limitNames = ['length', 'sqlLength', 'column', 'exprDepth', 'compoundSelect', 'vdbeOp', 'functionArg', 'attach', 'likePatternLength', 'variableNumber', 'triggerDepth'];
    const limitSpecs = [];
    for (const name of limitNames)
        limitSpecs.push(`${name}=float64`);
    defineClass(r, 'sqlite.DatabaseLimits', '*TnSqliteLimits', 'class', '', '', limitSpecs.join('; '), limitNames.join('; '));
    defineClass(r, 'sqlite.StatementIterator', '*TnSqliteIterator', 'class', 'next=*TnSqliteIteratorResult; TnRows=[]interface{}', '', '', '');
    defineClass(r, 'sqlite.StatementIteratorResult', '*TnSqliteIteratorResult', 'class', '', 'done=bool; value=interface{}', '', '');
    defineClass(r, 'sqlite.BackupProgressInfo', '*TnSqliteBackupProgress', 'class', '', 'totalPages=float64; remainingPages=float64', '', '');
    r.iterators['*TnSqliteIterator'] = 'TnRows';
    r.constructors['sqlite.DatabaseSync'] = (c) => {
        use();
        return `TnNewSqliteDb(${c.args.join(', ')})`;
    };
    // Database / Statement: Node 26's names (DatabaseSync / StatementSync stay, deprecated)
    r.classes['sqlite.Database'] = r.classes['sqlite.DatabaseSync'];
    r.classes['sqlite.Statement'] = r.classes['sqlite.StatementSync'];
    r.constructors['sqlite.Database'] = r.constructors['sqlite.DatabaseSync'];
    r.functions['sqlite.backup'] = (c) => {
        use();
        return `TnSqliteBackup(${c.args.join(', ')})`;
    };
    r.paramTypers['sqlite.backup'] = (_n) => ['*TnSqliteBackupProgress'];
    setResults(r, 'sqlite', 'backup=chan float64');
    // sqlite.constants: applyChangeset conflict values and setAuthorizer codes
    const constants = {
        SQLITE_CHANGESET_OMIT: 0,
        SQLITE_CHANGESET_REPLACE: 1,
        SQLITE_CHANGESET_ABORT: 2,
        SQLITE_CHANGESET_DATA: 1,
        SQLITE_CHANGESET_NOTFOUND: 2,
        SQLITE_CHANGESET_CONFLICT: 3,
        SQLITE_CHANGESET_CONSTRAINT: 4,
        SQLITE_CHANGESET_FOREIGN_KEY: 5,
        // setAuthorizer results and action codes
        SQLITE_OK: 0,
        SQLITE_DENY: 1,
        SQLITE_IGNORE: 2,
        SQLITE_COPY: 0,
        SQLITE_CREATE_INDEX: 1,
        SQLITE_CREATE_TABLE: 2,
        SQLITE_CREATE_TEMP_INDEX: 3,
        SQLITE_CREATE_TEMP_TABLE: 4,
        SQLITE_CREATE_TEMP_TRIGGER: 5,
        SQLITE_CREATE_TEMP_VIEW: 6,
        SQLITE_CREATE_TRIGGER: 7,
        SQLITE_CREATE_VIEW: 8,
        SQLITE_DELETE: 9,
        SQLITE_DROP_INDEX: 10,
        SQLITE_DROP_TABLE: 11,
        SQLITE_DROP_TEMP_INDEX: 12,
        SQLITE_DROP_TEMP_TABLE: 13,
        SQLITE_DROP_TEMP_TRIGGER: 14,
        SQLITE_DROP_TEMP_VIEW: 15,
        SQLITE_DROP_TRIGGER: 16,
        SQLITE_DROP_VIEW: 17,
        SQLITE_INSERT: 18,
        SQLITE_PRAGMA: 19,
        SQLITE_READ: 20,
        SQLITE_SELECT: 21,
        SQLITE_TRANSACTION: 22,
        SQLITE_UPDATE: 23,
        SQLITE_ATTACH: 24,
        SQLITE_DETACH: 25,
        SQLITE_ALTER_TABLE: 26,
        SQLITE_REINDEX: 27,
        SQLITE_ANALYZE: 28,
        SQLITE_CREATE_VTABLE: 29,
        SQLITE_DROP_VTABLE: 30,
        SQLITE_FUNCTION: 31,
        SQLITE_SAVEPOINT: 32,
        SQLITE_RECURSIVE: 33
    };
    r.objects['sqlite.constants'] = true;
    for (const name of Object.keys(constants)) {
        r.values[`sqlite.constants.${name}`] = (_c) => `float64(${constants[name]})`;
        r.valueTypes[`sqlite.constants.${name}`] = 'float64';
    }
}
