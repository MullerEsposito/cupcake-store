import { styled } from 'styled-components';

export const Container = styled.div`
.admin-section {
padding-block: 36px 55px; border-top: 1px solid #e6d6d3;
}
.admin-actions, .admin-pagination {
display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-block: 16px;
}
.admin-actions [aria-pressed=true] {
background: #78404d; color: #fff;
}
.admin-form {
margin-block: 24px;
}
.admin-form fieldset {
border: 1px solid #cbb8b5; border-radius: 12px; padding: 20px; min-width: 0;
}
.admin-form label, .admin-filter {
display: flex; flex-direction: column; gap: 8px; margin-block: 12px;
}
.admin-fields {
display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px;
}
.admin-form input:not([type=checkbox]), .admin-form select, .admin-filter select {
width: 100%; min-width: 0; padding: 12px; border: 1px solid #cbb8b5; border-radius: 8px; background: #fff; color: #3c242b; font: inherit;
}
.admin-form .admin-checkbox {
flex-direction: row; align-items: center;
}
.admin-form input[type=checkbox] {
width: 20px; height: 20px;
}
.admin-list {
list-style: none; padding: 0;
}
.admin-list li {
display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-block: 16px; border-bottom: 1px solid #e6d6d3;
}
.admin-order {
border: 1px solid #e6d6d3; border-radius: 12px; padding: 24px; margin-block: 20px; overflow-wrap: anywhere;
}
.admin-order details {
margin-block: 20px;
}
@media (max-width: 600px) {
.admin-fields {
grid-template-columns: 1fr;
}
}

h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
`;
