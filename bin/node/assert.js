// node:assert (+ node:assert/strict): failures throw an AssertionError
// (code 'ERR_ASSERTION', actual / expected / operator) that try/catch sees
import { defineClass, defineHelper, defineModule, setResults, isFunctionNode, isObjectLiteral } from './registry.js';
const assertHelper = `// node:assert
func tnAssertionError(message interface{}, generated string, actual interface{}, expected interface{}, operator string) *TnError {
	if e, ok := message.(*TnError); ok {
		panic(e)
	}
	// (a message function: called with actual and expected, Node 26)
	if message != nil && reflect.ValueOf(message).Kind() == reflect.Func {
		message = TnJSString(TnInvoke(message, actual, expected))
	}
	text, isGenerated := generated, true
	if s, ok := message.(string); ok {
		text, isGenerated = s, false
	}
	err := TnNodeError("AssertionError", "ERR_ASSERTION", text)
	err.props["actual"] = actual
	err.props["expected"] = expected
	err.props["operator"] = operator
	err.props["generatedMessage"] = isGenerated
	return err
}

// The message arguments: a printf-style format and its values (Node 26), or
// one message (a string, an Error or a function)
func tnAssertMessage(msg []interface{}) interface{} {
	if len(msg) > 1 {
		if _, isString := msg[0].(string); isString {
			return TnUtilFormat(msg...)
		}
	}
	if len(msg) > 0 {
		return msg[0]
	}
	return nil
}

// The first message argument as is (fail / throws / rejects don't format, as in Node)
func tnAssertFirst(msg []interface{}) interface{} {
	if len(msg) > 0 {
		return msg[0]
	}
	return nil
}

// assert.partialDeepStrictEqual(actual, expected)
func TnAssertPartialDeepEqual(actual interface{}, expected interface{}, msg ...interface{}) {
	if !TnPartialDeepEqual(actual, expected) {
		panic(tnAssertionError(tnAssertMessage(msg), "Expected values to be partially and strictly deep-equal:\\n"+TnInspect(actual)+"\\n\\nshould contain\\n\\n"+TnInspect(expected), actual, expected, "partialDeepStrictEqual"))
	}
}

func TnAssertOk(value interface{}, msg ...interface{}) {
	if !TnTruthy(value) {
		panic(tnAssertionError(tnAssertMessage(msg), "The expression evaluated to a falsy value", value, true, "=="))
	}
}

// Object.is
func tnObjectIs(a interface{}, b interface{}) bool {
	if x, ok := a.(float64); ok {
		if y, ok := b.(float64); ok {
			if math.IsNaN(x) && math.IsNaN(y) {
				return true
			}
			if x == 0 && y == 0 {
				return math.Signbit(x) == math.Signbit(y)
			}
			return x == y
		}
		return false
	}
	return TnSame(a, b)
}

// ==, for assert.equal
func tnLooseEqual(a interface{}, b interface{}) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	if TnSame(a, b) {
		x, isFloat := a.(float64)
		return !isFloat || !math.IsNaN(x)
	}
	_, aStr := a.(string)
	_, bStr := b.(string)
	_, aNum := a.(float64)
	_, bNum := b.(float64)
	_, aBool := a.(bool)
	_, bBool := b.(bool)
	if (aStr || aNum || aBool) && (bStr || bNum || bBool) {
		return TnNumber(a) == TnNumber(b)
	}
	return false
}

func TnAssertStrictEqual(actual interface{}, expected interface{}, msg ...interface{}) {
	if !tnObjectIs(actual, expected) {
		// (Node 26: a custom message is followed by the comparison)
		message := tnAssertMessage(msg)
		if message != nil && reflect.ValueOf(message).Kind() == reflect.Func {
			message = TnJSString(TnInvoke(message, actual, expected))
		}
		if text, ok := message.(string); ok {
			message = text + "\\n\\n" + TnInspect(actual) + " !== " + TnInspect(expected) + "\\n"
		}
		panic(tnAssertionError(message, "Expected values to be strictly equal:\\n\\n"+TnInspect(actual)+" !== "+TnInspect(expected)+"\\n", actual, expected, "strictEqual"))
	}
}

func TnAssertNotStrictEqual(actual interface{}, expected interface{}, msg ...interface{}) {
	if tnObjectIs(actual, expected) {
		panic(tnAssertionError(tnAssertMessage(msg), "Expected \\"actual\\" to be strictly unequal to: "+TnInspect(expected), actual, expected, "notStrictEqual"))
	}
}

func TnAssertEqual(actual interface{}, expected interface{}, msg ...interface{}) {
	if !tnLooseEqual(actual, expected) {
		panic(tnAssertionError(tnAssertMessage(msg), TnInspect(actual)+" == "+TnInspect(expected), actual, expected, "=="))
	}
}

func TnAssertNotEqual(actual interface{}, expected interface{}, msg ...interface{}) {
	if tnLooseEqual(actual, expected) {
		panic(tnAssertionError(tnAssertMessage(msg), TnInspect(actual)+" != "+TnInspect(expected), actual, expected, "!="))
	}
}

func TnAssertDeepEqual(actual interface{}, expected interface{}, strict bool, msg ...interface{}) {
	if !TnDeepEqual(actual, expected, strict) {
		operator, label := "deepEqual", "Expected values to be loosely deep-equal:"
		if strict {
			operator, label = "deepStrictEqual", "Expected values to be strictly deep-equal:"
		}
		panic(tnAssertionError(tnAssertMessage(msg), label+"\\n\\n"+TnInspect(actual)+"\\n\\nshould equal\\n\\n"+TnInspect(expected), actual, expected, operator))
	}
}

func TnAssertNotDeepEqual(actual interface{}, expected interface{}, strict bool, msg ...interface{}) {
	if TnDeepEqual(actual, expected, strict) {
		operator := "notDeepEqual"
		if strict {
			operator = "notDeepStrictEqual"
		}
		panic(tnAssertionError(tnAssertMessage(msg), "Expected \\"actual\\" not to be deep-equal to: "+TnInspect(expected), actual, expected, operator))
	}
}

// The text an error is matched against by a RegExp: "Name: message"
func TnErrorText(e interface{}) string {
	if err, ok := e.(*TnError); ok {
		return err.Get_name() + ": " + err.message
	}
	if s, ok := e.(string); ok {
		return s
	}
	if msg, ok := TnGetValue(e, "message").(string); ok {
		return "Error: " + msg
	}
	return fmt.Sprint(e)
}

// { message, code, name } validation objects: every listed property must match
func TnErrorMatches(e interface{}, expected map[string]interface{}) bool {
	for key, want := range expected {
		got := TnGet(e, key)
		if key == "message" {
			if _, ok := e.(*TnError); !ok {
				if m, ok := TnGetValue(e, "message").(string); ok {
					got = m
				}
			}
		}
		if re, ok := want.(*regexp.Regexp); ok {
			s, _ := got.(string)
			if !re.MatchString(s) {
				return false
			}
			continue
		}
		if !TnDeepEqual(got, want, true) {
			return false
		}
	}
	return true
}

func tnAssertRun(fn func()) (thrown interface{}, didThrow bool) {
	defer func() {
		if r := recover(); r != nil {
			thrown, didThrow = r, true
		}
	}()
	fn()
	return nil, false
}

func TnAssertThrows(fn func(), check func(interface{}) bool, msg ...interface{}) {
	thrown, didThrow := tnAssertRun(fn)
	if !didThrow {
		generated := "Missing expected exception."
		if s, ok := tnAssertFirst(msg).(string); ok {
			generated = "Missing expected exception: " + s
		}
		panic(tnAssertionError(nil, generated, nil, nil, "throws"))
	}
	if check != nil && !check(thrown) {
		panic(thrown)
	}
}

func TnAssertDoesNotThrow(fn func(), msg ...interface{}) {
	thrown, didThrow := tnAssertRun(fn)
	if didThrow {
		generated := "Got unwanted exception.\\nActual message: \\"" + TnErrorText(thrown) + "\\""
		panic(tnAssertionError(tnAssertFirst(msg), generated, thrown, nil, "doesNotThrow"))
	}
}

// assert.rejects / doesNotReject: promises settle on their own goroutine
func TnAssertRejects[T any](p chan T, check func(interface{}) bool, msg ...interface{}) chan struct{} {
	out := make(chan struct{}, 1)
	go func() {
		defer close(out)
		defer TnRejectOnPanic(out)
		_, reason, rejected := tnSettle(p)
		if !rejected {
			generated := "Missing expected rejection."
			if s, ok := tnAssertFirst(msg).(string); ok {
				generated = "Missing expected rejection: " + s
			}
			panic(tnAssertionError(nil, generated, nil, nil, "rejects"))
		}
		if check != nil && !check(reason) {
			panic(reason)
		}
		TnAsyncSend(out, struct{}{})
	}()
	return out
}

func TnAssertDoesNotReject[T any](p chan T, msg ...interface{}) chan struct{} {
	out := make(chan struct{}, 1)
	go func() {
		defer close(out)
		defer TnRejectOnPanic(out)
		_, reason, rejected := tnSettle(p)
		if rejected {
			panic(tnAssertionError(tnAssertFirst(msg), "Got unwanted rejection.\\nActual message: \\""+TnErrorText(reason)+"\\"", reason, nil, "doesNotReject"))
		}
		TnAsyncSend(out, struct{}{})
	}()
	return out
}

func TnAssertMatch(s string, re *regexp.Regexp, negate bool, msg ...interface{}) {
	if re.MatchString(s) == negate {
		generated := "The input did not match the regular expression /" + re.String() + "/. Input:\\n\\n" + TnInspect(s) + "\\n"
		operator := "match"
		if negate {
			generated = "The input was expected to not match the regular expression /" + re.String() + "/. Input:\\n\\n" + TnInspect(s) + "\\n"
			operator = "doesNotMatch"
		}
		panic(tnAssertionError(tnAssertMessage(msg), generated, s, re, operator))
	}
}

func TnAssertFail(msg ...interface{}) {
	panic(tnAssertionError(tnAssertFirst(msg), "Failed", nil, nil, "fail"))
}

func TnAssertIfError(v interface{}) {
	if v != nil {
		panic(tnAssertionError(nil, "ifError got unwanted exception: "+TnErrorText(v), v, nil, "ifError"))
	}
}`;
// The error validator of throws / rejects: (e) => bool in Go, or 'nil'
function errorCheck(r, node, arg, type) {
    if (!node)
        return 'nil';
    if (type === '*regexp.Regexp')
        return `func(e interface{}) bool { return ${arg}.MatchString(TnErrorText(e)) }`;
    if (isFunctionNode(node))
        return `func(e interface{}) bool { return TnTruthy((${arg})(e)) }`;
    if (isObjectLiteral(node)) {
        const fields = [];
        for (const prop of node.properties ?? []) {
            if (prop.kind !== 'PropertyAssignment' || !prop.name)
                continue;
            fields.push(`${JSON.stringify(String(prop.name.text))}: ${r.visit(prop.initializer)}`);
        }
        return `func(e interface{}) bool { return TnErrorMatches(e, map[string]interface{}{${fields.join(', ')}}) }`;
    }
    if (node.kind === 'Identifier') {
        const name = String(node.text);
        if (name === 'Error')
            return 'func(e interface{}) bool { return TnIsNativeError(e) }';
        if (['TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError'].includes(name)) {
            return `func(e interface{}) bool { err, ok := e.(*TnError); return ok && err.Get_name() == ${JSON.stringify(name)} }`;
        }
        return `func(e interface{}) bool { _, ok := e.(*${name}); return ok }`;
    }
    return 'nil';
}
// The message argument of throws(fn, [expected], [message]) when expected is a string
function throwsArgs(r, call, from) {
    const node = call.nodes[from];
    if (node && call.types[from] === 'string') {
        return `nil, ${call.args.slice(from).join(', ')}`;
    }
    const check = errorCheck(r, node, call.args[from] ?? '', call.types[from]);
    const messages = call.args.slice(from + 1);
    return messages.length > 0 ? `${check}, ${messages.join(', ')}` : check;
}
export function registerAssert(r) {
    defineModule(r, 'assert');
    defineModule(r, 'assert/strict');
    defineHelper(r, 'nodeAssert', ['fmt', 'math', 'reflect', 'regexp'], ['error', 'dynamic', 'nodeUtil', 'promise', 'nodeInvoke'], assertHelper);
    // AssertionError is a TnError (see NodeJS.ErrnoException); keep that the class of *TnError
    const errnoKey = r.classByGoType['*TnError'];
    defineClass(r, 'assert.AssertionError', '*TnError', 'class', '', 'message=string; code=string', 'name=string; actual=interface{}; expected=interface{}; operator=string; generatedMessage=bool', '');
    if (errnoKey)
        r.classByGoType['*TnError'] = errnoKey;
    r.classes['assert/strict.AssertionError'] = r.classes['assert.AssertionError'];
    r.namespaces['assert.strict'] = 'assert/strict';
    r.namespaces['assert/strict.strict'] = 'assert/strict';
    for (const mod of ['assert', 'assert/strict']) {
        const strict = mod === 'assert/strict';
        const fn = (name, emit) => {
            r.functions[`${mod}.${name}`] = (call) => {
                r.helper('nodeAssert');
                return emit(call);
            };
            r.results[`${mod}.${name}`] = '';
        };
        const ok = (call) => `TnAssertOk(${call.args.join(', ')})`;
        r.functions[mod] = (call) => {
            r.helper('nodeAssert');
            return ok(call);
        };
        fn('ok', ok);
        fn('equal', (c) => (strict ? `TnAssertStrictEqual(${c.args.join(', ')})` : `TnAssertEqual(${c.args.join(', ')})`));
        fn('notEqual', (c) => (strict ? `TnAssertNotStrictEqual(${c.args.join(', ')})` : `TnAssertNotEqual(${c.args.join(', ')})`));
        fn('strictEqual', (c) => `TnAssertStrictEqual(${c.args.join(', ')})`);
        fn('notStrictEqual', (c) => `TnAssertNotStrictEqual(${c.args.join(', ')})`);
        const deep = (s, negate) => (c) => {
            const rest = c.args.slice(2);
            const tail = rest.length > 0 ? `, ${rest.join(', ')}` : '';
            return `${negate ? 'TnAssertNotDeepEqual' : 'TnAssertDeepEqual'}(${c.args[0]}, ${c.args[1]}, ${s ? 'true' : 'false'}${tail})`;
        };
        fn('deepEqual', deep(strict, false));
        fn('notDeepEqual', deep(strict, true));
        fn('deepStrictEqual', deep(true, false));
        fn('notDeepStrictEqual', deep(true, true));
        fn('throws', (c) => `TnAssertThrows(func() { (${c.args[0]})() }, ${throwsArgs(r, c, 1)})`);
        const restMessages = (c) => {
            const from = c.types[1] === 'string' ? 1 : 2;
            return c.args.length > from ? `, ${c.args.slice(from).join(', ')}` : '';
        };
        fn('doesNotThrow', (c) => {
            const message = restMessages(c);
            return `TnAssertDoesNotThrow(func() { (${c.args[0]})() }${message})`;
        });
        const promiseArg = (c) => (isFunctionNode(c.nodes[0]) || c.types[0].startsWith('func(') ? `(${c.args[0]})()` : c.args[0]);
        fn('rejects', (c) => `TnAssertRejects(${promiseArg(c)}, ${throwsArgs(r, c, 1)})`);
        fn('doesNotReject', (c) => {
            const message = restMessages(c);
            return `TnAssertDoesNotReject(${promiseArg(c)}${message})`;
        });
        r.results[`${mod}.rejects`] = 'chan struct{}';
        r.results[`${mod}.doesNotReject`] = 'chan struct{}';
        fn('match', (c) => `TnAssertMatch(${[c.args[0], c.args[1], 'false', ...c.args.slice(2)].join(', ')})`);
        fn('doesNotMatch', (c) => `TnAssertMatch(${[c.args[0], c.args[1], 'true', ...c.args.slice(2)].join(', ')})`);
        fn('fail', (c) => `TnAssertFail(${c.args.join(', ')})`);
        fn('partialDeepStrictEqual', (c) => `TnAssertPartialDeepEqual(${c.args.join(', ')})`);
        fn('ifError', (c) => `TnAssertIfError(${c.args[0]})`);
        for (const name of ['throws', 'rejects', 'doesNotThrow', 'doesNotReject']) {
            r.paramTypers[`${mod}.${name}`] = (_n) => ['interface{}'];
        }
        setResults(r, mod, '');
    }
}
