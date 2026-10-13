function pad(x: number): string;
function pad(x: string): string;
function pad(x: number | string): string { return '[' + x + ']'; }
assert(pad(1) === '[1]' && pad('a') === '[a]', 'overloads');
