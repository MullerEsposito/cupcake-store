import { lstat, rm } from 'node:fs/promises';

const buildDirectory = new URL('../build/', import.meta.url);
const serverDirectory = new URL('server/', buildDirectory);

for (const directory of [buildDirectory, serverDirectory]) {
  const entry = await lstat(directory).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return undefined;
  });
  if (entry?.isSymbolicLink()) {
    throw new Error('A limpeza do backend não aceita diretórios vinculados.');
  }
}

await rm(serverDirectory, { recursive: true, force: true });
