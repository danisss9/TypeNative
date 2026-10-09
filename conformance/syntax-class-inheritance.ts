class A { name(): string { return 'a'; } }
class B extends A { name(): string { return 'b' + super.name(); } }
assert(new B().name() === 'ba', 'inheritance');
