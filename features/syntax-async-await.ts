async function get(): Promise<number> { return 1; }
async function main(): Promise<void> { const v = await get(); assert(v === 1, 'await'); }
main();
