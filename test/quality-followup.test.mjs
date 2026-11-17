import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { validateCartQuantity } from '../client/src/presentation/components/CartView/validate-cart-quantity.ts';
import { CartView } from '../client/src/presentation/components/CartView/index.tsx';
import { OrderListEntry } from '../client/src/presentation/components/CheckoutView/index.tsx';

const line = { productId: '1', name: 'Baunilha da casa', quantity: 1, unitPrice: '11.90', lineTotal: '11.90', stock: 3, available: true };

test('validates quantities locally with Portuguese messages identifying the product', () => {
  for (const value of ['', '0', '-1', '1.5', 'inválido']) {
    assert.match(validateCartQuantity(value, line), /Baunilha da casa: informe uma quantidade inteira/);
  }
  assert.match(validateCartQuantity('4', line), /Baunilha da casa: a quantidade máxima disponível é 3/);
  assert.match(validateCartQuantity('100', { ...line, stock: 120 }), /disponível é 99/);
  assert.equal(validateCartQuantity('3', line), '');
});

test('cart quantity form leaves validation messages to the application', () => {
  const cart = { data: { items: [line], total: '11.90', totalQuantity: 1, warnings: [] }, busy: false };
  const markup = renderToStaticMarkup(React.createElement(CartView, { cart, signedIn: false, onCheckout() {} }));
  assert.match(markup, /<form noValidate="">/i);
  assert.match(markup, /Quantidade de Baunilha da casa/);
});

test('order entries show date and items while retaining their links and status', () => {
  const order = {
    id: 'abc', number: 'P-123', status: 'AGUARDANDO_PAGAMENTO', total: '48.00',
    createdAt: '2026-11-17T01:30:00.000Z',
    items: [line, ...['Morango', 'Chocolate', 'Red velvet'].map(name => ({ name, quantity: 2 }))]
  };
  const secondOrder = { ...order, id: 'def', number: 'P-124', status: 'ENTREGUE', items: [{ name: 'Limão', quantity: 3 }] };
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement('ul', null,
    React.createElement(OrderListEntry, { order }), React.createElement(OrderListEntry, { order: secondOrder }))));
  assert.match(markup, /1 × Baunilha da casa, 2 × Morango, 2 × Chocolate \+ 1 item/);
  assert.doesNotMatch(markup, /Red velvet/);
  assert.match(markup, /3 × Limão/);
  assert.match(markup, /16\/11\/2026/);
  assert.match(markup, /Pedido P-123/);
  assert.match(markup, /href="\/pedidos\/abc"[^>]*>Retomar pagamento/);
  assert.match(markup, /href="\/pedidos\/def"[^>]*>Ver resumo/);
});
