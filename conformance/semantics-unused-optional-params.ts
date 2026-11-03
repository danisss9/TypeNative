// Optional parameters after a defaulted one are unpacked from the variadic tail; unused ones must still compile
class E {
  cond(a: string, b: string | null = null, span?: string | null, comments?: string[]): string {
    return a + (b ?? '-');
  }
}
assert(new E().cond('x') === 'x-', 'unused optional array param');
