import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
writeFileSync('tn-probe.txt', 'hi');
assert(existsSync('tn-probe.txt') && readFileSync('tn-probe.txt', 'utf-8') === 'hi', 'fs');
rmSync('tn-probe.txt');
