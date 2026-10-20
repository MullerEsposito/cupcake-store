import { styled } from 'styled-components';

export const Container = styled.div`
.cancellation-form {
margin-block: 24px;
}
.cancellation-form fieldset {
border: 1px solid #bb7e83; border-radius: 12px; padding: 20px; min-width: 0;
}
.cancellation-form label {
display: flex; flex-direction: column; gap: 8px; margin-block: 16px;
}
.cancellation-form input:not([type=checkbox]) {
width: 100%; min-width: 0; padding: 12px; border: 1px solid #cbb8b5; border-radius: 8px; font: inherit;
}
.cancellation-form .cancellation-confirm {
flex-direction: row; align-items: center;
}
.cancellation-confirm input {
width: 20px; height: 20px; flex-shrink: 0;
}
.cancellation-form .danger {
background: #8c303e; color: #fff; white-space: normal;
}
.cancellation-summary {
padding: 18px; margin-block: 20px; border-left: 4px solid #8c303e; background: #f6e8e6; overflow-wrap: anywhere;
}
`;
