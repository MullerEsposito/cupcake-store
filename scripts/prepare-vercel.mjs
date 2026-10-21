import { rename } from 'node:fs/promises';

await rename(new URL('../dist/index.html', import.meta.url), new URL('../build/server/index.html', import.meta.url));
