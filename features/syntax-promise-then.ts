const p = new Promise<number>((resolve) => resolve(2));
p.then((v) => assert(v === 2, 'then'));
