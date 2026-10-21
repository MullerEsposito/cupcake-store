import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const origin = process.argv[2];
if (!origin || !new URL(origin).hostname.endsWith('.vercel.app') || !new URL(origin).hostname.startsWith('cupcake-store')) throw new Error('Informe a origem Vercel da demonstração.');
const results = [];
function client() {
  const cookies = new Map();
  return async (path, input, expected = 200) => {
    const response = await fetch(origin + path, {
      method: input === undefined ? 'GET' : 'POST',
      headers: { Origin: origin, 'X-Cupcake-Request': '1', ...(input === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: [...cookies].map(([key, value]) => key + '=' + value).join('; ') },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      signal: AbortSignal.timeout(30000)
    });
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(';');
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      if (pair.startsWith('cupcake_session=') && !header.includes('Max-Age=0')) assert.match(header, /Secure/);
    }
    assert.equal(response.status, expected, path + ' retornou HTTP ' + response.status);
    return response.json();
  };
}

for (const path of ['/', '/produtos', '/entrar', '/checkout', '/administracao/estoque']) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-security-policy') || '', /nonce-/);
  const html = await response.text();
  assert.doesNotMatch(html, /__CSP_NONCE__/);
  const asset = html.match(/src="(\/assets\/[^\"]+)"/);
  assert.ok(asset);
  assert.equal((await fetch(origin + asset[1])).status, 200);
}
results.push('páginas diretas, assets e CSP');
const anonymous = client();
await anonymous('/api/orders', undefined, 401);
const { products } = await anonymous('/api/products');
assert.equal(products.length, 4);
const product = products[0];
const customer = client();
const email = 'avaliacao-' + randomUUID() + '@example.com';
const registered = await customer('/api/register', { name: 'Cliente Fictício Avaliação Técnica', email, password: randomBytes(24).toString('base64url') }, 201);
assert.equal(registered.user.role, 'CLIENTE');
assert.equal((await customer('/api/session')).user.id, registered.user.id);
await customer('/api/admin/catalog', undefined, 403);
results.push('cadastro, sessão compartilhada e autorização');
const { address: postal } = await customer('/api/addresses/postal-codes/01001000');
assert.equal(postal.state, 'SP');
const { cities } = await customer('/api/addresses/states/SP/cities');
assert.ok(cities.some(city => city.name === 'São Paulo'));
const { address } = await customer('/api/addresses', { ...postal, recipient: 'Destinatário Fictício', number: '0', complement: 'Simulação acadêmica' }, 201);
results.push('CEP e municípios');
const { cart } = await customer('/api/cart/items', { productId: product.id, quantity: 1 });
const checkoutInput = { addressId: address.id, method: 'PIX', expectedSubtotal: cart.total, idempotencyKey: randomUUID() };
const { order } = await customer('/api/orders/checkout', checkoutInput);
assert.equal(order.status, 'AGUARDANDO_PAGAMENTO');
assert.equal((await anonymous('/api/products/' + product.id)).product.stock, product.stock);
await customer('/api/orders/' + order.id + '/payments', { method: 'PIX', outcome: 'RECUSADO', idempotencyKey: checkoutInput.idempotencyKey });
assert.equal((await anonymous('/api/products/' + product.id)).product.stock, product.stock);
const payment = { method: 'PIX', outcome: 'APROVADO', idempotencyKey: randomUUID() };
const paid = await customer('/api/orders/' + order.id + '/payments', payment);
assert.equal(paid.order.status, 'PAGAMENTO_APROVADO');
await customer('/api/orders/' + order.id + '/payments', payment);
assert.equal((await anonymous('/api/products/' + product.id)).product.stock, product.stock - 1);
const cancellation = { reason: 'Validação técnica do ambiente de demonstração', expectedStatus: 'PAGAMENTO_APROVADO', idempotencyKey: randomUUID() };
const canceled = await customer('/api/orders/' + order.id + '/cancel', cancellation);
assert.equal(canceled.order.status, 'CANCELADO');
assert.equal(canceled.order.cancellation.simulated, true);
await customer('/api/orders/' + order.id + '/cancel', cancellation);
assert.equal((await anonymous('/api/products/' + product.id)).product.stock, product.stock);
results.push('checkout, recusa, aprovação e estorno simulados com idempotência');
if (!process.env.DEMO_ADMIN_EMAIL || !process.env.DEMO_ADMIN_PASSWORD) throw new Error('Conta ADMIN de demonstração não configurada.');
const admin = client();
const logged = await admin('/api/login', { email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD });
assert.equal(logged.user.role, 'ADMIN');
await admin('/api/admin/catalog');
await admin('/api/admin/stock-movements?page=1');
results.push('ADMIN e auditoria');
await customer('/api/logout', {});
assert.equal((await customer('/api/session')).user, null);
await admin('/api/logout', {});
results.push('logout');
console.log(JSON.stringify({ origin, checks: results, stockRestored: true, onlyFictionalDemoData: true }));
