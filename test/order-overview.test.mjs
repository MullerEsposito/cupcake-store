import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderOverview } from '../client/src/presentation/components/CheckoutView/OrderOverview.tsx';

const order = {
  number: 'CC-123', status: 'CANCELADO',
  items: [{ productId: '1', name: 'Baunilha', quantity: 2, lineTotal: '23.80' }],
  address: { recipient: 'Cliente de teste', street: 'Rua de teste', number: '1', district: 'Centro', city: 'Aracaju', state: 'SE', postalCode: '49000000' },
  subtotal: '23.80', shipping: '0.00', total: '23.80',
  payments: [{ status: 'APROVADO', method: 'CARTAO', reason: 'Aprovação simulada.' }]
};

const render = (data, trackingError = '') =>
  renderToStaticMarkup(React.createElement(OrderOverview, { order: data, busy: false, trackingError, onRefresh() {} }));

test('shows one cancelled state and separates it from historical payment', () => {
  const markup = render(order);
  assert.equal((markup.match(/Cancelado/g) ?? []).length, 1);
  assert.doesNotMatch(markup, /Etapas do pedido/);
  assert.match(markup, /data-tone="success"[^>]*>.*Aprovado/);
  assert.match(markup, /Cartão/);
  assert.match(markup, /última tentativa de pagamento, não a situação atual do pedido/);
});

test('organizes order items, delivery, and amounts under clear headings', () => {
  const markup = render(order);
  for (const heading of ['Itens do pedido', 'Entrega simulada', 'Pagamento simulado']) {
    assert.ok(markup.includes(`<h2>${heading}</h2>`));
  }
  assert.match(markup, /Baunilha.*× 2/);
  assert.match(markup, /Total do pedido.*23,80/);
});

test('keeps active order stages and distinguishes refused and failed payments', () => {
  for (const [status, label] of [['RECUSADO', 'Recusado'], ['FALHA', 'Falha no pagamento']]) {
    const markup = render({ ...order, status: 'AGUARDANDO_PAGAMENTO', payments: [{ status, method: 'PIX' }] }, 'Não foi possível atualizar.');
    assert.match(markup, /aria-current="step"/);
    assert.match(markup, new RegExp(`data-tone="danger"[^>]*>.*${label}`));
    assert.match(markup, /Não foi possível atualizar/);
    assert.ok(!markup.includes(status));
  }
});
