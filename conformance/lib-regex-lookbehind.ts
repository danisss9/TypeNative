assert('price: 10'.replace(/(?<=price: )\d+/, 'X') === 'price: X', 'lookbehind');
