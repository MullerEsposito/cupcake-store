import { styled } from 'styled-components';

export const Container = styled.form`
  margin-top: 24px;
  fieldset { border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
  legend { padding: 0 8px; font-weight: 600; }
  .address-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 16px 0; }
  label { display: grid; gap: 8px; font-size: 14px; }
  input, select { min-width: 0; width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 6px; background: white; }
  .lookup { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  @media (max-width: 600px) { .address-fields { grid-template-columns: 1fr; } }
`;
