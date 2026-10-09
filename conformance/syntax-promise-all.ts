async function one(): Promise<number> { return 1; }
async function main(): Promise<void> { const r = await Promise.all([one(), one()]); assert(r.length === 2, 'all'); }
main();
