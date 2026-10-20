import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execute = promisify(execFile);

async function temporaryProject(context) {
  const directory = await mkdtemp(join(tmpdir(), 'cupcake-clean-server-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'scripts'));
  const script = join(directory, 'scripts', 'clean-server.mjs');
  await copyFile(new URL('../scripts/clean-server.mjs', import.meta.url), script);
  return { directory, script };
}

test('limpeza remove somente o backend compilado, independentemente do diretório atual', async context => {
  const { directory, script } = await temporaryProject(context);
  await mkdir(join(directory, 'build', 'server', 'legacy'), { recursive: true });
  await writeFile(join(directory, 'build', 'server', 'legacy', 'obsolete.js'), 'obsolete');
  await writeFile(join(directory, 'build', 'keep.txt'), 'preservado');
  await mkdir(join(directory, 'src'));
  await writeFile(join(directory, 'src', 'main.ts'), 'original');
  await execute(process.execPath, [script], { cwd: tmpdir() });
  await assert.rejects(stat(join(directory, 'build', 'server')), { code: 'ENOENT' });
  assert.equal(await readFile(join(directory, 'build', 'keep.txt'), 'utf8'), 'preservado');
  assert.equal(await readFile(join(directory, 'src', 'main.ts'), 'utf8'), 'original');
});

test('limpeza pode ser repetida antes da primeira compilação', async context => {
  const { script } = await temporaryProject(context);
  await execute(process.execPath, [script]);
  await execute(process.execPath, [script]);
});
