async function main(): Promise<void> {
  const m = await import('./dynamic-import-helper');
  assert(m.half(8) === 4, 'dynamic import');
}
main();
