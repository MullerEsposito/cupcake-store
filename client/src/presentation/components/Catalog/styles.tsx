import { styled } from 'styled-components';

export const Container = styled.div`
.catalog {
padding-top: 65px;
  padding-bottom: 65px;
  scroll-margin-top: 24px
}
.section-top {
display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 32px;
  gap: 20px
}
.section-top .eyebrow {
margin-bottom: 12px
}
.catalog-note {
font-size: 12px;
  color: var(--muted);
  padding-bottom: 5px
}
.products {
display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 23px
}
.product {
border: 1px solid var(--line);
  background: #fffdf9;
  border-radius: 9px;
  overflow: hidden;
  display: flex;
  flex-direction: column
}
.product-image {
width: 100%;
  height: 215px;
  object-fit: contain;
  background: #f0e4dc;
  padding: 18px
}
.product:nth-child(3n+2) .product-image {
background: #f2e2e3
}
.product:nth-child(3n) .product-image {
background: #eae9dc
}
.product-content {
padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1
}
.product h3 {
font-size: 23px;
  margin: 0 0 12px
}
.product-description {
font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
  margin: 0 0 18px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden
}
.product-bottom {
display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto
}
@media(max-width:900px) {
.products {
grid-template-columns: repeat(2, 1fr)
}
.catalog-note {
display: none
}
}
@media(max-width:600px) {
.catalog {
padding: 42px 0
}
.products {
gap: 12px
}
.product-image {
height: 165px;
    padding: 12px
}
.product-content {
padding: 14px
}
.product h3 {
font-size: 21px
}
.product-bottom {
flex-direction: column;
    align-items: start;
    gap: 2px
}
}

h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
`;
