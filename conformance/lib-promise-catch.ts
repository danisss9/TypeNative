async function main(): Promise<void> {
  let caught = '';
  let done = false;
  await Promise.reject(new Error('bad'))
    .catch((e: Error) => { caught = e.message; })
    .finally(() => { done = true; });
  assert(caught === 'bad' && done, 'reject / catch / finally');
}
main();
