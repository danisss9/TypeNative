class A { name(): string { return 'a'; } }
class B extends A { override name(): string { return 'b'; } }
assert(new B().name() === 'b', 'override');
