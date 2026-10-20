import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { ServerStyleSheet } from 'styled-components';
import { App } from '../client/src/presentation/App.tsx';
import { SessionAccess, safeReturnTo } from '../client/src/presentation/routes/RequireSession.tsx';
import { HomePage } from '../client/src/presentation/pages/HomePage/index.tsx';
import { AuthForm } from '../client/src/presentation/components/AuthForm/index.tsx';
import { CheckoutView } from '../client/src/presentation/components/CheckoutView/index.tsx';
import { createApp } from '../src/adapters/http/server.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import { Sessions } from '../src/infrastructure/security/primitives.ts';

const api = new Proxy({}, { get: () => () => { throw new Error('Renderização não pode executar requisições ou mutações.'); } });
const user = { id: '1', name: 'Cliente Teste', email: 'cliente@example.com', role: 'CLIENTE' };
const render = (element, path = '/') => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] }, element));

test('início não monta catálogo, carrinho, pedidos ou administração', () => {
  const markup = render(React.createElement(App, { api }));
  assert.match(markup, /id="hero-title"/);
  for (const id of ['catalogo', 'carrinho', 'pedidos', 'administracao']) assert.doesNotMatch(markup, new RegExp(`id="${id}"`));
  for (const path of ['/produtos', '/carrinho', '/sobre', '/entrar']) assert.ok(markup.includes(`href="${path}"`));
  assert.match(markup, /<main id="conteudo" tabindex="-1"/);
});

for (const [path, expected] of [['/produtos', 'id="catalogo"'], ['/carrinho', 'id="carrinho"'], ['/sobre', 'id="about-title"'], ['/inexistente', 'Página não encontrada']]) {
  test(`rota ${path} apresenta somente sua página e não o início`, () => {
    const markup = render(React.createElement(App, { api }), path);
    assert.ok(markup.includes(expected));
    assert.doesNotMatch(markup, /id="hero-title"/);
  });
}

test('guarda espera sessão, bloqueia visitante e impede acesso ADMIN por cliente', () => {
  const child = React.createElement('p', null, 'CONTEUDO_RESTRITO');
  const gate = props => render(React.createElement(SessionAccess, props, child), '/administracao');
  assert.match(gate({ user: null, loading: true }), /Verificando sua sessão/);
  assert.doesNotMatch(gate({ user: null, loading: false }), /CONTEUDO_RESTRITO/);
  const denied = gate({ user, loading: false, admin: true });
  assert.match(denied, /Acesso restrito/);
  assert.doesNotMatch(denied, /CONTEUDO_RESTRITO/);
  assert.match(gate({ user, loading: false }), /CONTEUDO_RESTRITO/);
  assert.match(gate({ user: { ...user, role: 'ADMIN' }, loading: false, admin: true }), /CONTEUDO_RESTRITO/);
});

test('retorno do login aceita caminho interno e rejeita destinos externos ou de autenticação', () => {
  for (const value of ['/checkout', '/pedidos/1', '/produtos?q=chocolate']) assert.equal(safeReturnTo(value), value);
  for (const value of [undefined, null, '', '//externo.example', 'https://externo.example', '/\\externo.example', '/entrar', '/entrar?next=1', '/cadastro', '/pedidos\n/1', '/\t/externo.example', '/pedidos\u0000/1']) {
    assert.equal(safeReturnTo(value), '/carrinho');
  }
});

test('autenticação é conteúdo de página, mantendo cadastro, validações e sem diálogo', () => {
  const markup = renderToStaticMarkup(React.createElement(AuthForm, { authenticate: async () => {}, onSuccess() {} }));
  assert.doesNotMatch(markup, /<dialog/);
  assert.match(markup, /id="auth-title"/);
  assert.match(markup, /type="password"/);
  assert.match(markup, /Criar conta/);
  assert.match(markup, /role="alert"/);
});

test('lista de pedidos e checkout são apresentações distintas e não disparam operações ao renderizar', () => {
  const props = { api, cart: { total: '12.00', items: [{ productId: '1' }] }, onChanged() {} };
  const orders = render(React.createElement(CheckoutView, { ...props, mode: 'orders' }), '/pedidos');
  assert.match(orders, /Meus pedidos/);
  assert.doesNotMatch(orders, /Novo endereço de entrega|Confirmar pedido e ir ao pagamento/);
  const checkout = render(React.createElement(CheckoutView, { ...props, mode: 'checkout' }), '/checkout');
  assert.match(checkout, /Finalizar pedido/);
  assert.match(checkout, /Novo endereço de entrega/);
  assert.doesNotMatch(checkout, /Atualizar pedidos|<dialog/);
});

test('styled-components encapsula estilos da página sem depender da antiga folha global', () => {
  const sheet = new ServerStyleSheet();
  try {
    const markup = render(sheet.collectStyles(React.createElement(HomePage)));
    const styles = sheet.getStyleTags();
    assert.match(markup, /class="sc-/);
    assert.match(styles, /data-styled/);
    assert.match(styles, /\.hero/);
    assert.doesNotMatch(styles, /\.admin-form|\.cart-line|\.cancellation-form/);
  } finally { sheet.seal(); }
});

async function httpFixture(context) {
  const directory = await mkdtemp(join(tmpdir(), 'cupcake-sprint6-'));
  await mkdir(join(directory, 'assets'));
  await writeFile(join(directory, 'index.html'), '<!doctype html><html><head><meta name="sc-nonce" content="__CSP_NONCE__"></head><body><div id="root"></div></body></html>');
  await writeFile(join(directory, 'assets', 'app-test.js'), 'export const page = true;');
  const app = createApp({ dataSource: createTypeOrmFixture(), sessions: new Sessions(), passwords: {} }, { staticDirectory: directory, logger: { error() {} } });
  const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  context.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('Express entrega todas as páginas e links diretos com nonce correspondente e único', async context => {
  const url = await httpFixture(context);
  const nonces = new Set();
  for (const path of ['/', '/index.html', '/produtos', '/produtos/1', '/sobre', '/carrinho', '/entrar', '/checkout', '/pedidos', '/pedidos/1', '/administracao']) {
    const response = await fetch(url + path, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const html = await response.text();
    const nonce = html.match(/name="sc-nonce" content="([^"]+)"/)?.[1];
    assert.ok(nonce && nonce !== '__CSP_NONCE__');
    assert.ok(!nonces.has(nonce));
    nonces.add(nonce);
    const policy = response.headers.get('content-security-policy');
    assert.ok(policy.includes(`style-src 'self' 'nonce-${nonce}'`));
    assert.match(policy, /script-src 'self';/);
    assert.doesNotMatch(policy, /unsafe-inline/);
  }
});

test('fallback não mascara APIs, arquivos, caminhos privados ou métodos desconhecidos', async context => {
  const url = await httpFixture(context);
  for (const path of ['/api/nao-existe', '/api', '/assets/ausente.js', '/.env', '/src/main.tsx', '/inexistente', '/produtos/1/extra']) {
    const response = await fetch(url + path, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(await response.text(), /id="root"/);
  }
  const asset = await fetch(url + '/assets/app-test.js');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.match(await asset.text(), /export const page/);
  assert.equal((await fetch(url + '/pedidos', { method: 'POST' })).status, 403);
});
