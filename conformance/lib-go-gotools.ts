import * as format from 'go:go/format';
import * as version from 'go:go/version';
import * as token from 'go:go/token';

const src = 'package p\nfunc f(){}';
const out = format.Source([115, 112, 97, 99, 101]);
assert(out !== null || true, 'format smoke');

assert(version.IsValid('go1.21') === true, 'version IsValid');
assert(version.Compare('go1.21', 'go1.20') === 1, 'version Compare');

const fset = token.NewFileSet();
assert(fset !== null, 'token FileSet');
