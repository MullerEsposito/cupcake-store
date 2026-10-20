import { styled } from 'styled-components';

export const Container = styled.div`
.tabs {
display: flex;
  gap: 8px;
  margin: 25px 0
}
.tabs button {
flex: 1;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  padding: 11px;
  border-radius: 5px;
  font-size: 12px
}
.tabs button[aria-pressed=true] {
background: var(--soft);
  border-color: #bd8f8c;
  color: var(--ink);
  font-weight: bold
}

max-width: 480px; margin: 40px auto; padding: 32px; border: 1px solid var(--line); border-radius: 16px; background: #fffdf9;
@media(max-width: 520px) { margin: 24px 18px; padding: 24px; }

h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
`;
