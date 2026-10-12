class Account { private balance = 10; protected owner = 'me'; public deposit(n: number): number { this.balance += n; return this.balance; } }
assert(new Account().deposit(5) === 15, 'access modifiers');
