import { fileURLToPath, pathToFileURL } from 'node:url';
const url = String(pathToFileURL(process.cwd()));
assert(url.startsWith('file://') && fileURLToPath(url).length > 0, 'node:url');
