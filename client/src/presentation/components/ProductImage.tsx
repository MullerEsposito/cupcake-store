import type { Product } from '../../contracts/storefront';
import { useState } from 'react';

export function safeImageSource(value: unknown): string {
  return typeof value === 'string' && (/^https:\/\//.test(value) || /^\/(?!\/)/.test(value)) ? value : '/cupcake.svg';
}

export function ProductImage({ product, className }: { product: Product; className: string }) {
  const [failed, setFailed] = useState(false);
  return <img className={className} src={failed ? '/cupcake.svg' : safeImageSource(product.image)}
    alt={product.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
