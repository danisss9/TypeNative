// An arrow function assigned to a const can call itself
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
assert(factorial(5) === 120, 'recursive arrow function');
