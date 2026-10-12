const d = new Date(Date.UTC(2020, 1, 3, 4, 5, 6));
assert(d.getUTCFullYear() === 2020 && d.getUTCMonth() === 1 && d.getUTCDate() === 3 && d.getUTCHours() === 4, 'date getters');
