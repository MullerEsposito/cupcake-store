import { styled } from 'styled-components';

export const Container = styled.div`
.cart-section {
padding-top: 55px; padding-bottom: 55px; scroll-margin-top: 24px;
}
.cart-section h2 {
margin: 10px 0 16px;
}
.cart-lines {
list-style: none; padding: 0; margin: 24px 0;
}
.cart-line {
display: grid; grid-template-columns: 2fr 2fr 1fr auto; gap: 20px; align-items: center; padding: 20px 0; border-bottom: 1px solid #e6d6d3;
}
.cart-line form {
display: flex; align-items: end; gap: 10px;
}
.cart-line input {
max-width: 100px;
}
.cart-line p {
margin: 8px 0;
}
.cart-summary {
display: flex; justify-content: space-between; gap: 16px; font-size: 20px; padding: 18px 0;
}
@media (max-width: 900px) {
.cart-line {
grid-template-columns: 1fr 1fr;
}
}
@media (max-width: 520px) {
.cart-summary {
flex-direction: column;
}
}

h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }

.cart-line label { display: flex; flex-direction: column; gap: 8px; }
.cart-line input { min-width: 0; }
`;
