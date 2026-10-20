import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { ViaCepProvider } from '../src/infrastructure/postal-code/ViaCepProvider.ts';
import { validatePostalCode } from '../src/modules/addresses/validators/validatePostalCode.ts';
import { LookupPostalCodeService } from '../src/modules/addresses/useCases/lookupPostalCode/LookupPostalCodeService.ts';
import { CreateAddressService } from '../src/modules/addresses/useCases/createAddress/CreateAddressService.ts';
import { OrderEvents, announceOrderAfterResponse } from '../src/adapters/http/events/order-events.ts';
import { CheckoutController } from '../src/modules/orders/useCases/checkout/CheckoutController.ts';
import { createApp } from '../src/adapters/http/server.ts';
import { createTypeOrmFixture } from '../test-support/typeorm.mjs';
import { Sessions } from '../src/infrastructure/security/primitives.ts';
import { createStorefrontApi } from '../client/src/infrastructure/storefront-api.ts';
import { applyPostalAddress, AddressForm } from '../client/src/presentation/components/AddressForm/index.tsx';
import { Catalog } from '../client/src/presentation/components/Catalog/index.tsx';
import { IbgeCitiesProvider } from '../src/infrastructure/postal-code/IbgeCitiesProvider.ts';
import { ListCitiesService } from '../src/modules/addresses/useCases/listCities/ListCitiesService.ts';

const resolved = { postalCode: '01001000', street: 'Praça da Sé', district: 'Sé', city: 'São Paulo', state: 'SP' };
const upstream = { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' };
const input = { ...resolved, recipient: 'Cliente Teste', number: '10', complement: 'Casa' };
const users = { findActiveById: async id => ({ id, active: true }) };
const failure = code => error => error.code === code;

test('CEP admite somente oito dígitos ou máscara exata e rejeita URL/injeção antes da consulta', async () => {
  assert.equal(validatePostalCode('01001-000'), '01001000');
  let calls = 0;
  const provider = new ViaCepProvider({ get: async () => { calls++; return { data: upstream }; } });
  for (const value of [null, [], 1001000, '123', '123456789', '0100-1000', 'https://externo', '../12345', '01001000?x=1']) {
    assert.throws(() => validatePostalCode(value), failure('VALIDATION'));
    await assert.rejects(provider.lookup(value), failure('VALIDATION'));
  }
  assert.equal(calls, 0);
});

test('ViaCEP valida resposta, usa caminho fixo e permite CEP geral sem rua/bairro', async () => {
  let captured;
  const provider = new ViaCepProvider({ get: async (...args) => { captured = args; return { data: upstream }; } });
  assert.deepEqual(await provider.lookup('01001-000'), resolved);
  assert.equal(captured[0], '01001000/json/');
  assert.ok(captured[1].signal instanceof AbortSignal);
  const general = new ViaCepProvider({ get: async () => ({ data: { ...upstream, logradouro: '', bairro: '' } }) });
  assert.equal((await general.lookup('01001000')).street, '');
});

test('ViaCEP diferencia inexistente de timeout, rede e payload inválido sem expor dados internos', async () => {
  for (const erro of [true, 'true']) {
    await assert.rejects(new ViaCepProvider({ get: async () => ({ data: { erro } }) }).lookup('99999999'), failure('NOT_FOUND'));
  }
  for (const data of [null, {}, { ...upstream, cep: '22222-222' }, { ...upstream, uf: 'XX' }, { ...upstream, localidade: '' }]) {
    await assert.rejects(new ViaCepProvider({ get: async () => ({ data }) }).lookup('01001000'), failure('UNAVAILABLE'));
  }
  await assert.rejects(new ViaCepProvider({ get: async () => { throw new Error('SEGREDO INTERNO'); } }).lookup('01001000'),
    error => error.code === 'UNAVAILABLE' && !error.message.includes('SEGREDO'));
});

test('consulta exige conta ativa antes de acessar provedor', async () => {
  let calls = 0;
  const provider = { lookup: async () => { calls++; return resolved; } };
  const inactive = new LookupPostalCodeService(provider, { findActiveById: async () => null });
  await assert.rejects(inactive.execute('1', '01001000'), failure('UNAUTHORIZED'));
  await assert.rejects(inactive.execute(null, '01001000'), failure('UNAUTHORIZED'));
  assert.equal(calls, 0);
  assert.deepEqual(await new LookupPostalCodeService(provider, users).execute('1', '01001-000'), resolved);
});

test('salvar endereço verifica CEP e cidade/UF fora da persistência e não grava em falhas', async () => {
  const writes = [];
  const repository = { create: async (...args) => { writes.push(args); return args[1]; } };
  const service = new CreateAddressService(repository, users, { lookup: async () => resolved });
  assert.equal((await service.execute('1', { ...input, city: 'sao paulo' })).city, 'São Paulo');
  assert.equal(writes[0][0], '1');
  for (const changes of [{ city: 'Campinas' }, { state: 'RJ' }]) {
    await assert.rejects(service.execute('1', { ...input, ...changes }), failure('VALIDATION'));
  }
  const offline = new CreateAddressService(repository, users, { lookup: async () => { throw new Error('offline'); } });
  await assert.rejects(offline.execute('1', input), /offline/);
  assert.equal(writes.length, 1);
});

test('atendimento simulado aceita todas as UFs do Brasil quando correspondem ao CEP', async () => {
  for (const state of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) {
    const service = new CreateAddressService({ create: async (userId, address) => address }, users,
      { lookup: async () => ({ ...resolved, state }) });
    assert.equal((await service.execute('1', { ...input, state })).state, state);
  }
});

test('preenchimento conserva destinatário, número, complemento e alterações manuais durante a consulta', () => {
  const snapshot = { ...input, street: '', district: '', city: '', state: '' };
  const edited = { ...snapshot, street: 'Rua digitada durante consulta', number: '25' };
  const filled = applyPostalAddress(edited, snapshot, resolved);
  assert.equal(filled.street, edited.street);
  assert.equal(filled.city, resolved.city);
  assert.equal(filled.recipient, input.recipient);
  assert.equal(filled.number, '25');
  assert.equal(filled.complement, 'Casa');
});

test('formulário apresenta consulta, política nacional simulada e não salva antes de verificar CEP', () => {
  const markup = renderToStaticMarkup(React.createElement(AddressForm, { api: {}, busy: false, onSave: async () => {} }));
  assert.match(markup, /ViaCEP/);
  assert.match(markup, /Consultar CEP novamente/);
  assert.match(markup, /disabled=""[^>]*>Salvar endereço/);
  assert.match(markup, /Nenhum nome ou número/);
  assert.match(markup, /<select name="state"/);
  assert.match(markup, /<select name="city"/);
  assert.match(markup, /SP — São Paulo/);
  assert.equal((markup.match(/<option value="[A-Z]{2}"/g) ?? []).length, 27);
  assert.doesNotMatch(markup, /<input[^>]+name="(?:state|city)"/);
});

test('IBGE consulta municípios por UF, ordena e rejeita UF inválida sem rede', async () => {
  let captured;
  const provider = new IbgeCitiesProvider({ get: async (...args) => {
    captured = args;
    return { data: [{ id: 3550308, nome: 'São Paulo' }, { id: 3509502, nome: 'Campinas' }] };
  } });
  assert.deepEqual(await provider.listByState('sp'), [{ id: '3509502', name: 'Campinas' }, { id: '3550308', name: 'São Paulo' }]);
  assert.equal(captured[0], 'SP/municipios');
  assert.deepEqual(captured[1].params, { orderBy: 'nome' });
  for (const state of ['XX', 'SP/../../', '', null]) await assert.rejects(provider.listByState(state), failure('VALIDATION'));
  for (const data of [null, {}, [], [{ id: 1, nome: '' }], [{ id: '1', nome: 'Cidade' }]]) {
    await assert.rejects(new IbgeCitiesProvider({ get: async () => ({ data }) }).listByState('SP'), failure('UNAVAILABLE'));
  }
});

test('lista de municípios exige sessão ativa e encaminha apenas UF validada', async () => {
  const calls = [];
  const provider = { listByState: async state => { calls.push(state); return []; } };
  await assert.rejects(new ListCitiesService(provider, users).execute(null, 'SP'), failure('UNAUTHORIZED'));
  assert.equal(calls.length, 0);
  assert.deepEqual(await new ListCitiesService(provider, users).execute('1', 'rs'), []);
  assert.deepEqual(calls, ['RS']);
});

test('vitrine inicial permite produtos reais sem duplicar h1 ou montar filtros', () => {
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Catalog, {
    showcase: true, resource: { data: [{ id: '1', name: 'Chocolate', price: '12.00', stock: 1, category: 'Clássicos' }], loading: false, error: '', retry() {} },
    categories: [], filters: {}, filtered: false, onFilter() {}, onSelect() {}, onAdd() {}, cartBusy: false
  })));
  assert.match(markup, /id="vitrine"/);
  assert.match(markup, /<h2 id="showcase-title"/);
  assert.match(markup, /Chocolate/);
  assert.doesNotMatch(markup, /<h1|Buscar produtos/);
});

test('Axios encaminha CEP e cancelamento e EventSource fecha no descarte da página', async () => {
  let captured;
  const api = createStorefrontApi({ get: async (...args) => { captured = args; return { data: { address: resolved } }; } });
  const controller = new AbortController();
  assert.deepEqual(await api.lookupPostalCode('01001000', controller.signal), resolved);
  assert.equal(captured[0], '/addresses/postal-codes/01001000');
  assert.equal(captured[1].signal, controller.signal);
  await api.cities('SP', controller.signal);
  assert.equal(captured[0], '/addresses/states/SP/cities');
  assert.equal(captured[1].signal, controller.signal);
  const previous = globalThis.EventSource;
  let source;
  globalThis.EventSource = class {
    listeners = new Map();
    constructor(url) { this.url = url; source = this; }
    addEventListener(name, handler) { this.listeners.set(name, handler); }
    close() { this.closed = true; }
  };
  try {
    let changes = 0;
    const stop = api.watchOrders(() => { changes++; });
    source.listeners.get('orders-changed')();
    source.listeners.get('connected')();
    assert.equal(changes, 2);
    assert.equal(source.url, '/api/orders/events');
    stop();
    assert.equal(source.closed, true);
  } finally { globalThis.EventSource = previous; }
});

test('eventos são isolados por usuário e aplicação e limitados por sessão de uso', () => {
  const hub = new OrderEvents();
  let first = 0;
  let second = 0;
  const stop = hub.subscribe('1', () => { first++; });
  hub.subscribe('2', () => { second++; });
  hub.publish('1');
  new OrderEvents().publish('1');
  assert.equal(first, 1);
  assert.equal(second, 0);
  stop();
  hub.publish('1');
  assert.equal(first, 1);
  for (let index = 0; index < 3; index++) hub.subscribe('1', () => {});
  assert.throws(() => hub.subscribe('1', () => {}), failure('RATE_LIMIT'));
});

test('notificação de pedido ocorre somente após operação bem-sucedida e resposta concluída', async () => {
  const hub = new OrderEvents();
  let changes = 0;
  hub.subscribe('1', () => { changes++; });
  const request = { authentication: { userId: '9' }, body: {}, app: { locals: {
    orderEvents: hub, dependencies: { dataSource: { getRepository: () => ({ findOneBy: async () => ({ userId: '1' }) }) } }
  } } };
  const response = new EventEmitter();
  response.statusCode = 200;
  response.json = payload => payload;
  await new CheckoutController({ execute: async () => ({ id: '5' }) }).handle(request, response);
  assert.equal(changes, 0);
  response.emit('finish');
  assert.equal(changes, 1);
  const failed = new EventEmitter();
  failed.statusCode = 409;
  await announceOrderAfterResponse(request, failed, '5');
  failed.emit('finish');
  assert.equal(changes, 1);
  await assert.rejects(new CheckoutController({ execute: async () => { throw new Error('rollback'); } }).handle(request, response), /rollback/);
  assert.equal(changes, 1);
});

test('SSE HTTP exige sessão ativa, não expõe IDs e encerra após revogação', async context => {
  const sessions = new Sessions();
  const token = sessions.create('1');
  const app = createApp({ dataSource: createTypeOrmFixture(), sessions, passwords: {} }, { logger: { error() {} } });
  const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  context.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(url + '/api/orders/events')).status, 401);
  assert.equal((await fetch(url + '/api/addresses/postal-codes/01001000')).status, 401);
  assert.equal((await fetch(url + '/api/addresses/states/SP/cities')).status, 401);
  const headers = { Cookie: 'cupcake_session=' + token };
  const invalid = await fetch(url + '/api/addresses/postal-codes/123', { headers });
  assert.equal(invalid.status, 400);
  assert.equal((await fetch(url + '/api/addresses/states/XX/cities', { headers })).status, 400);
  const response = await fetch(url + '/api/orders/events', { headers, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  const initial = new TextDecoder().decode((await reader.read()).value);
  assert.match(initial, /event: connected/);
  app.locals.orderEvents.publish('1');
  const event = new TextDecoder().decode((await reader.read()).value);
  assert.match(event, /event: orders-changed\ndata: \{\}/);
  assert.doesNotMatch(event, /userId|email|pedido|address/);
  sessions.delete(token);
  app.locals.orderEvents.publish('1');
  const expired = new TextDecoder().decode((await reader.read()).value);
  assert.match(expired, /event: session-ended/);
  await reader.cancel();
});
