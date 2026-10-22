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

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

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
	switch v := TnGet(options, key).(type) {
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
	switch v := TnGet(options, key).(type) {
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
	switch v := TnGet(options, key).(type) {
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
		if href, ok := TnGet(path, "href").(string); ok && path != nil {
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
			if v, ok := TnGet(db.limitOptions, name).(float64); ok {
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
		rv := reflect.ValueOf(v)
		switch {
		case rv.Kind() >= reflect.Int && rv.Kind() <= reflect.Float64 && rv.Kind() != reflect.Uintptr:
			ctx.ResultFloat(rv.Convert(reflect.TypeOf(float64(0))).Float())
		case rv.Kind() == reflect.Chan:
			panic(TnNodeError("Error", "ERR_SQLITE_ERROR", "Asynchronous user-defined functions are not supported"))
		case (rv.Kind() == reflect.Pointer || rv.Kind() == reflect.Func || rv.Kind() == reflect.Slice || rv.Kind() == reflect.Map) && rv.IsNil():
			ctx.ResultNull()
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

func (db *TnSqliteDb) createSession(options ...interface{}) interface{} {
	db.requireOpen()
	panic(TnNodeError("Error", "ERR_SQLITE_ERROR", "Sessions are not supported: the bundled SQLite has no session extension"))
}

func (db *TnSqliteDb) applyChangeset(changeset []byte, options ...interface{}) bool {
	db.requireOpen()
	panic(TnNodeError("Error", "ERR_SQLITE_ERROR", "Changesets are not supported: the bundled SQLite has no session extension"))
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
		if s, ok := TnGet(options[0], "dbName").(string); ok {
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

export function registerSqlite(r: NodeRegistry): void {
  defineModule(r, 'sqlite');
  defineHelper(
    r,
    'nodeSqlite',
    ['github.com/ncruces/go-sqlite3', 'errors', 'fmt', 'math', 'math/big', 'os', 'reflect', 'runtime', 'sort', 'strconv', 'strings', 'time', 'unsafe'],
    ['dynamic', 'orderedMap', 'nodeInvoke', 'eventLoop', 'promise'],
    sqliteHelper
  );
  const use = () => r.helper('nodeSqlite');
  defineClass(
    r,
    'sqlite.DatabaseSync',
    '*TnSqliteDb',
    'class',
    'open=; close=; exec=; prepare=*TnSqliteStmt; location=*string; function=; aggregate=; enableLoadExtension=; enableDefensive=; loadExtension=; setAuthorizer=; createTagStore=*TnSqliteTagStore; createSession=interface{}; applyChangeset=bool; serialize=[]byte; deserialize=',
    '',
    'isOpen=bool; isTransaction=bool; limits=*TnSqliteLimits',
    ''
  );
  defineClass(
    r,
    'sqlite.StatementSync',
    '*TnSqliteStmt',
    'class',
    'run=*TnSqliteRunResult; get=interface{}; all=[]interface{}; iterate=*TnSqliteIterator; columns=[]interface{}; setReadBigInts=; setReturnArrays=; setAllowBareNamedParameters=; setAllowUnknownNamedParameters=',
    '',
    'sourceSQL=string; expandedSQL=string',
    ''
  );
  defineClass(r, 'sqlite.StatementResultingChanges', '*TnSqliteRunResult', 'class', '', 'changes=interface{}; lastInsertRowid=interface{}', '', '');
  defineClass(
    r,
    'sqlite.SQLTagStore',
    '*TnSqliteTagStore',
    'class',
    'get=interface{}; all=[]interface{}; iterate=*TnSqliteIterator; run=*TnSqliteRunResult; clear=',
    '',
    'size=float64; capacity=float64; db=*TnSqliteDb',
    ''
  );
  const limitNames = ['length', 'sqlLength', 'column', 'exprDepth', 'compoundSelect', 'vdbeOp', 'functionArg', 'attach', 'likePatternLength', 'variableNumber', 'triggerDepth'];
  defineClass(r, 'sqlite.DatabaseLimits', '*TnSqliteLimits', 'class', '', '', limitNames.map((n) => `${n}=float64`).join('; '), limitNames.join('; '));
  defineClass(r, 'sqlite.StatementIterator', '*TnSqliteIterator', 'class', 'next=*TnSqliteIteratorResult; TnRows=[]interface{}', '', '', '');
  defineClass(r, 'sqlite.StatementIteratorResult', '*TnSqliteIteratorResult', 'class', '', 'done=bool; value=interface{}', '', '');
  defineClass(r, 'sqlite.BackupProgressInfo', '*TnSqliteBackupProgress', 'class', '', 'totalPages=float64; remainingPages=float64', '', '');
  r.iterators['*TnSqliteIterator'] = 'TnRows';
  r.constructors['sqlite.DatabaseSync'] = (c: NodeCall) => {
    use();
    return `TnNewSqliteDb(${c.args.join(', ')})`;
  };
  r.functions['sqlite.backup'] = (c: NodeCall) => {
    use();
    return `TnSqliteBackup(${c.args.join(', ')})`;
  };
  r.paramTypers['sqlite.backup'] = (_n: any[]) => ['*TnSqliteBackupProgress'];
  setResults(r, 'sqlite', 'backup=chan float64');

  // sqlite.constants: applyChangeset conflict values and setAuthorizer codes
  const constants: Record<string, number> = {
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
    r.values[`sqlite.constants.${name}`] = (_c: NodeCall) => `float64(${constants[name]})`;
    r.valueTypes[`sqlite.constants.${name}`] = 'float64';
  }
}
