class C { #secret = 42; reveal(): number { return this.#secret; } }
assert(new C().reveal() === 42, 'private field');
