import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await sourceFiles(location));
    else if (entry.name.endsWith('.ts')) files.push(location);
  }
  return files;
}

test('serviços, DTOs e regras não importam HTTP, persistência ou bibliotecas externas', async () => {
  const files = await sourceFiles(new URL('../src/modules/', import.meta.url));
  const core = files.filter(file => /Service\.ts$|\/dtos\/|\/validators\/|\/contracts\/|\/entities\/(?:credentials|login-policy)\.ts$/.test(file.pathname));
  assert.ok(core.length >= 9);
  for (const file of core) {
    const source = await readFile(file, 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
    assert.ok(imports.every(value => (value.startsWith('.') || value.startsWith('#shared/') || /^#repositories\/I(?:Products|Users)Repository$/.test(value)) && !/infrastructure|adapters|implementations|Controller|express|react|composition|typeorm/.test(value)), file.pathname);
    assert.doesNotMatch(source, /\b(?:SELECT|INSERT|UPDATE|DELETE)\s/);
  }
});

test('controllers não acessam repositórios nem implementam regras de negócio', async () => {
  const files = await sourceFiles(new URL('../src/modules/', import.meta.url));
  const controllers = files.filter(file => /Controller\.ts$/.test(file.pathname));
  assert.equal(controllers.length, 6);
  for (const file of controllers) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source.replace(/import type[\s\S]*?;\n/g, ''), /from\s+['"][^'"]*(?:repositories|infrastructure|entities|Service|node:|pg)[^'"]*['"]/);
    assert.doesNotMatch(source, /\b(?:SELECT|INSERT|UPDATE|DELETE)\s/);
  }
});

test('cada caso de uso possui serviço, controlador e composição', async () => {
  for (const [module, cases] of Object.entries({
    users: ['registerUser', 'authenticateUser', 'getCurrentUser', 'logoutUser'],
    catalog: ['listProducts', 'getProduct']
  })) {
    for (const useCase of cases) {
      const directory = new URL(`../src/modules/${module}/useCases/${useCase}/`, import.meta.url);
      const files = await readdir(directory);
      assert.ok(files.includes('index.ts'), useCase);
      assert.ok(files.some(file => file.endsWith('Service.ts')), useCase);
      assert.ok(files.some(file => file.endsWith('Controller.ts')), useCase);
    }
  }
});

test('fábricas instanciam serviços sem depender de request ou app.locals', async () => {
  const files = await sourceFiles(new URL('../src/modules/', import.meta.url));
  const factories = files.filter(file => /\/useCases\/[^/]+\/index\.ts$/.test(file.pathname));
  assert.equal(factories.length, 6);
  for (const file of factories) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\brequest\b|app\.locals/);
    assert.match(source, /new \w+Service\(/);
    assert.match(source, /new \w+Controller\(\w+Service|new \w+Controller\(service/);
  }
});

test('fábricas com persistência instanciam repositórios sem argumentos', async () => {
  const files = await sourceFiles(new URL('../src/modules/', import.meta.url));
  const factories = files.filter(file => /\/useCases\/[^/]+\/index\.ts$/.test(file.pathname)
    && !file.pathname.includes('/logoutUser/'));
  assert.equal(factories.length, 5);
  for (const file of factories) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\bdataSource\b|\.getRepository\(/);
    assert.match(source, /new \w*Repository\(\)/);
    assert.ok(source.search(/new \w*Repository\(\)/) < source.search(/new \w+Service\(/), file.pathname);
  }
});

test('adaptadores TypeORM têm construtores sem parâmetros e getter centralizado', async () => {
  const files = await sourceFiles(new URL('../src/modules/', import.meta.url));
  const adapters = files.filter(file => /\/implementations\/typeorm\/[^/]+Repository\.ts$/.test(file.pathname));
  assert.equal(adapters.length, 2);
  for (const file of adapters) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\bDataSource\b|this\.dataSource/);
    assert.match(source, /constructor\(\)/);
    assert.match(source, /this\.repository = getRepository\((?:User|Product)\)/);
  }
});

test('há somente uma classe por entidade, localizada no módulo', async () => {
  const files = await sourceFiles(new URL('../src/modules/', import.meta.url));
  for (const [module, name] of [['users', 'User'], ['catalog', 'Product'], ['catalog', 'Category']]) {
    const matches = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (new RegExp(`export class ${name}\\b`).test(source)) matches.push(file.pathname);
    }
    assert.equal(matches.length, 1, name);
    assert.ok(matches[0].endsWith(`/${module}/entities/${name}.ts`));
  }
});
