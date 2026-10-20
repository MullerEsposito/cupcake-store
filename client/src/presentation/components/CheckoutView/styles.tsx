import { styled } from 'styled-components';

export const Container = styled.div`
.checkout-section {
padding-block: 36px 55px; border-top: 1px solid #e6d6d3;
}
.checkout-content {
text-align: left;
}
.checkout-content h2 {
margin-top: 8px;
}
.checkout-content .button {
margin-top: 12px;
}
.checkout-label, .address-fields label {
display: flex; flex-direction: column; gap: 7px; font-size: 14px; margin-block: 14px;
}
.checkout-content input, .checkout-content select {
width: 100%; min-width: 0; padding: 12px; border: 1px solid #cbb8b5; border-radius: 8px; background: #fff; color: #3c242b; font: inherit;
}
.checkout-form fieldset {
border: 1px solid #e6d6d3; border-radius: 12px; padding: 16px; margin-block: 20px; min-width: 0;
}
.address-fields {
display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px;
}
.order-list {
list-style: none; padding: 0;
}
.order-list li {
display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding-block: 18px; border-bottom: 1px solid #e6d6d3;
}
.order-list strong, .order-number {
overflow-wrap: anywhere;
}
@media (max-width: 520px) {
.address-fields {
grid-template-columns: 1fr;
}
}

.checkout-content { max-width: 780px; padding-block: 12px; }
.checkout-section { border-top: none; }
h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
`;
