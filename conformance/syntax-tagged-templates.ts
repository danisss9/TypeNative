function tag(s: TemplateStringsArray, v: number): string { return s[0] + (v * 2); }
assert(tag`x${2}` === 'x4', 'tagged');
