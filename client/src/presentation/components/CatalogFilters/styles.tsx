import { styled } from 'styled-components';

export const FilterForm = styled.form`
& {
display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr; gap: 14px; align-items: end; margin: 24px 0;
}
& label {
display: flex; flex-direction: column; gap: 7px; font-size: 14px;
}
& input, & select {
width: 100%; min-width: 0; padding: 12px; border: 1px solid #cbb8b5; border-radius: 8px; background: #fff; color: #3c242b; font: inherit;
}
& .button {
min-height: 44px;
}
@media (max-width: 900px) {
& {
grid-template-columns: 1fr 1fr;
}
}
@media (max-width: 520px) {
&, .cart-line {
grid-template-columns: 1fr;
}
}
`;
