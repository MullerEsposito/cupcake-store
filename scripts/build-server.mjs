import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: { main: 'src/main.ts', vercel: 'src/vercel.ts' },
  tsconfig: 'tsconfig.server.json',
  outdir: 'build/server',
  bundle: true,
  platform: 'node',
  target: 'node20.19',
  format: 'esm',
  packages: 'external',
  keepNames: true,
  sourcemap: true
});
