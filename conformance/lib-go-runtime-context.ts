// go:runtime + go:runtime/debug + go:context — environment introspection
import { GOOS, GOARCH, NumCPU, Version, GOROOT, NumGoroutine, GC } from 'go:runtime';
import { Compiler } from 'go:runtime';
import { SetGCPercent, FreeOSMemory, Stack, PrintStack } from 'go:runtime/debug';
import { Background, TODO, WithValue } from 'go:context';

assert(GOOS === 'windows' || GOOS === 'linux' || GOOS === 'darwin', `GOOS: ${GOOS}`);
assert(GOARCH === 'amd64' || GOARCH === 'arm64', `GOARCH: ${GOARCH}`);
assert(NumCPU() >= 1, 'NumCPU');
assert(Version().startsWith('go1.'), `Version: ${Version()}`);
assert(Compiler === 'gc', `Compiler: ${Compiler}`);
assert(NumGoroutine() >= 1, 'NumGoroutine');
assert(GOROOT().length >= 0, 'GOROOT');
GC();

const before = SetGCPercent(100);
SetGCPercent(before);
FreeOSMemory();
const stack = Stack();
assert(stack.length > 0, 'Stack bytes');
PrintStack();

const ctx = Background();
assert(ctx !== null, 'Background');
const todo = TODO();
assert(todo !== null, 'TODO');
const child = WithValue(ctx, 'key', 'value');
assert(child !== null, 'WithValue');
console.log(`go-runtime-context ok ${GOOS}/${GOARCH}`);
