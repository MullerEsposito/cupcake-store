import { styled } from 'styled-components';

export const Container = styled.div`
.detail-image {
width: 100%;
  height: 220px;
  object-fit: contain;
  background: var(--soft);
  border-radius: 8px;
  margin-bottom: 25px
}
.detail-info {
font-size: 14px;
  line-height: 1.8;
  color: var(--muted);
  white-space: pre-line
}
.detail-price {
font-size: 24px;
  font-weight: bold;
  margin: 20px 0
}

.product-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.stock-badge {
display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px;
font-size: 13px; color: #22553c; background: #e4f2e9;
}
.stock-dot { width: 7px; height: 7px; background: currentColor; border-radius: 50%; }
.stock-badge[data-stock="low"] { color: #704500; background: #ffebbd; }
.stock-badge[data-stock="last"] { color: #8a2538; background: #f9dce2; }
.stock-badge[data-stock="sold-out"] { color: #584b50; background: #ece7e9; }

.product-details { padding-block: 48px; max-width: 780px; }
.detail-image { height: 320px; margin-top: 24px; }

h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
`;
