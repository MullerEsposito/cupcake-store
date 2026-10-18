const select = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
let mode = 'login';
let toastTimer;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Cupcake-Request': '1', ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function productImage(product, className) {
  const img = element('img', className);
  const value = typeof product.image === 'string' ? product.image : '';
  img.src = /^https:\/\//.test(value) || /^\/(?!\/)/.test(value) ? value : '/cupcake.svg';
  img.alt = product.name;
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => { img.src = '/cupcake.svg'; }, { once: true });
  return img;
}

function toast(message) {
  clearTimeout(toastTimer);
  select('#toast').textContent = message;
  select('#toast').hidden = false;
  toastTimer = setTimeout(() => { select('#toast').hidden = true; }, 5000);
}

function account(user) {
  select('#greeting').hidden = !user;
  select('#greeting').textContent = user ? `Olá, ${user.name.split(' ')[0]}!` : '';
  select('#account-button').hidden = Boolean(user);
  select('#logout').hidden = !user;
}

function authMode(next) {
  mode = next;
  const register = mode === 'register';
  select('#login-tab').setAttribute('aria-pressed', String(!register));
  select('#register-tab').setAttribute('aria-pressed', String(register));
  select('#name-field').hidden = !register;
  select('[name=name]').required = register;
  select('#password-help').hidden = !register;
  select('[name=password]').minLength = register ? 12 : 1;
  select('[name=password]').autocomplete = register ? 'new-password' : 'current-password';
  select('#auth-description').textContent = register ? 'Seu cadastro começa com nome, e-mail e senha.' : 'Entre para acessar sua conta.';
  select('#auth-submit').textContent = register ? 'Criar minha conta' : 'Entrar na minha conta';
  select('#auth-error').textContent = '';
}

async function detail(id) {
  const dialog = select('#product-dialog');
  const area = select('#product-detail');
  area.replaceChildren(element('p', '', 'Carregando os detalhes…'));
  dialog.showModal();
  try {
    const { product } = await api(`/api/products/${id}`);
    area.replaceChildren(productImage(product, 'detail-image'), element('p', 'category', product.category));
    const title = element('h2', '', product.name);
    title.id = 'product-title';
    area.append(title, element('p', 'detail-info', product.description), element('p', 'detail-price', money(product.price)),
      element('p', 'hint', `Peso: ${Number(product.weight)} g · ${Number(product.stock) > 0 ? 'Disponível' : 'Temporariamente esgotado'}`),
      element('p', 'hint', 'Compras serão disponibilizadas na próxima etapa do projeto.'));
  } catch (error) { area.replaceChildren(element('p', 'error', error.message)); }
}

async function loadProducts() {
  const area = select('#products');
  const state = select('#catalog-state');
  state.hidden = false;
  state.textContent = 'Preparando a vitrine…';
  area.replaceChildren();
  try {
    const { products } = await api('/api/products');
    if (!products.length) {
      state.textContent = 'Nossa vitrine está sendo preparada. Nenhum produto ativo cadastrado no momento.';
      return;
    }
    for (const product of products) {
      const card = element('article', 'product');
      const content = element('div', 'product-content');
      content.append(element('p', 'category', product.category), element('h3', '', product.name), element('p', 'product-description', product.description));
      const bottom = element('div', 'product-bottom');
      const button = element('button', 'detail-button', 'Ver detalhes ↗');
      button.setAttribute('aria-label', `Ver detalhes de ${product.name}`);
      button.addEventListener('click', () => detail(product.id));
      bottom.append(element('span', 'price', money(product.price)), button);
      content.append(bottom, element('p', 'stock', Number(product.stock) > 0 ? 'Disponível' : 'Temporariamente esgotado'));
      card.append(productImage(product, 'product-image'), content);
      area.append(card);
    }
    state.hidden = true;
  } catch (error) {
    state.replaceChildren(element('p', '', error.message));
    const retry = element('button', 'button outline', 'Tentar novamente');
    retry.addEventListener('click', loadProducts);
    state.append(retry);
  }
}

select('#account-button').addEventListener('click', () => {
  authMode('login');
  select('#auth-dialog').showModal();
});
select('#login-tab').addEventListener('click', () => authMode('login'));
select('#register-tab').addEventListener('click', () => authMode('register'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
select('#auth-dialog').addEventListener('close', () => { select('#auth-form').reset(); select('#auth-error').textContent = ''; });
select('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = select('#auth-submit');
  button.disabled = true;
  select('#login-tab').disabled = true;
  select('#register-tab').disabled = true;
  select('#auth-error').textContent = '';
  const submittedMode = mode;
  try {
    const values = Object.fromEntries(new FormData(event.target));
    const { user } = await api(`/api/${submittedMode}`, { method: 'POST', body: JSON.stringify(values) });
    account(user);
    select('#auth-dialog').close();
    toast(submittedMode === 'register' ? 'Sua conta foi criada. Bem-vindo!' : 'Você entrou na sua conta.');
  } catch (error) { select('#auth-error').textContent = error.message; }
  finally { button.disabled = false; select('#login-tab').disabled = false; select('#register-tab').disabled = false; }
});
select('#logout').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }); account(null); toast('Você saiu da sua conta.'); }
  catch (error) { toast(error.message); }
});

api('/api/session').then(({ user }) => account(user)).catch(() => account(null));
loadProducts();
