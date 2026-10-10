// go:fmt — print family, Sprint family, Errorf, Fprintf to Stdout
import { Print, Printf, Println, Sprint, Sprintf, Sprintln, Errorf, Fprintf } from 'go:fmt';
import { Stdout } from 'go:os';

Println('go-fmt: print family');
Print('a', 'b');
Printf('%s=%d %q\n', 'x', 42, 'str');

const s1 = Sprint('a', 1, true);
assert(s1 === 'a1 true', `Sprint: ${s1}`);

const s2 = Sprintf('%05.1f|%v|%v', 3.14, 255, 'z');
assert(s2 === '003.1|255|z', `Sprintf: ${s2}`);

const s3 = Sprintln('a', 1);
assert(s3 === 'a 1\n', `Sprintln: ${JSON.stringify(s3)}`);

const err = Errorf('code=%v', 7);
assert(err.message === 'code=7', `Errorf: ${err.message}`);

Fprintf(Stdout, 'fmt-stdout-ok\n');
console.log('done');
