import { Container } from './styles';
import { useId, useState } from 'react';
import { validateCartQuantity } from './validate-cart-quantity';
import type { CartLine } from '../../../contracts/storefront';
import type { useCart } from '../../hooks/use-cart';
import { formatPrice } from '../../format-price';

function CartRow({ item, busy, onQuantity, onRemove }: {
  item: CartLine; busy: boolean; onQuantity(quantity: number, onError: (message: string) => void): void; onRemove(): void;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [quantityError, setQuantityError] = useState('');
  const errorId = useId();
  return <li className="cart-line">
    <div><strong>{item.name}</strong><p>{formatPrice(item.unitPrice)} por unidade</p>
      {!item.available && <p className="error">Quantidade indisponível. Ajuste ou remova este produto.</p>}</div>
    <form noValidate onSubmit={event => {
      event.preventDefault();
      if (busy || item.stock === 0) return;
      const message = validateCartQuantity(quantity, item);
      setQuantityError(message);
      if (message) {
        event.currentTarget.querySelector('input')?.focus();
        return;
      }
      onQuantity(Number(quantity), serverMessage => setQuantityError(`${item.name}: ${serverMessage}`));
    }}>
      <div className="cart-quantity-controls">
        <label>Quantidade de {item.name}<input type="number" min="1" max={Math.min(99, item.stock)} step="1" required
          disabled={busy || item.stock === 0} value={quantity} aria-invalid={Boolean(quantityError)}
          aria-describedby={quantityError ? errorId : undefined} onChange={event => {
            setQuantity(event.target.value);
            setQuantityError('');
          }} /></label>
        <button className="button outline" disabled={busy || item.stock === 0} type="submit">Atualizar</button>
      </div>
      {quantityError && <p className="error cart-quantity-error" id={errorId} role="alert">{quantityError}</p>}
    </form>
    <strong>{formatPrice(item.lineTotal)}</strong>
    <button type="button" className="detail-button" disabled={busy} onClick={onRemove} aria-label={`Remover ${item.name}`}>Remover</button>
  </li>;
}

export function CartView({ cart, signedIn, onCheckout }: { cart: ReturnType<typeof useCart>; signedIn: boolean; onCheckout(): void }) {
  return <Container><section id="carrinho" className="cart-section wrap" aria-labelledby="cart-title">
    <p className="eyebrow">SEU MOMENTO DOCE</p><h1 id="cart-title">Meu carrinho</h1>
    <p>{signedIn ? 'Carrinho salvo na sua conta.' : 'Você pode montar seu carrinho sem entrar. Os itens serão incorporados à sua conta após o login.'}</p>
    {cart.loading && <p role="status">Carregando o carrinho…</p>}
    {cart.error && <div role="alert"><p className="error">{cart.error}</p><button className="button outline" disabled={cart.pending} onClick={cart.retry}>Atualizar carrinho</button></div>}
    {cart.data?.warnings.map((warning, index) => <p role="status" key={`${index}-${warning}`}>{warning}</p>)}
    {!cart.loading && cart.data && !cart.data.items.length && <p role="status">Seu carrinho está vazio. Escolha um cupcake na vitrine.</p>}
    {cart.data && cart.data.items.length > 0 && <>
      <ul className="cart-lines">{cart.data.items.map(item => <CartRow key={`${item.productId}-${item.quantity}`} item={item} busy={cart.busy}
        onQuantity={(quantity, onError) => { void cart.setQuantity(item.productId, quantity, onError); }}
        onRemove={() => { void cart.remove(item.productId); }} />)}</ul>
      <div className="cart-summary" aria-live="polite"><span>{cart.data.totalQuantity} unidade(s)</span><strong>Subtotal: {formatPrice(cart.data.total)}</strong></div>
      <p className="hint">Preços atualizados pelo servidor. Os itens não reservam estoque. Frete gratuito nesta simulação acadêmica.</p>
      <button className="button primary" disabled={cart.busy || cart.data.items.some(item => !item.available)} onClick={onCheckout}>
        {signedIn ? 'Continuar para o checkout' : 'Entrar para finalizar'}
      </button>
    </>}
  </section></Container>;
}
