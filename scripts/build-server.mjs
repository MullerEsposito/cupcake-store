import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['src/main.ts'],
  tsconfig: 'tsconfig.server.json',
  outfile: 'build/server/main.js',
  bundle: true,
  platform: 'node',
  target: 'node20.19',
  format: 'esm',
  packages: 'external',
  keepNames: true,
  sourcemap: true
});
