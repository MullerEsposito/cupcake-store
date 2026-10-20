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

.product-details { padding-block: 48px; max-width: 780px; }
.detail-image { height: 320px; margin-top: 24px; }

h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
`;
