async function main(): Promise<void> { const v = await Promise.resolve(3); assert(v === 3, 'resolve'); }
main();
