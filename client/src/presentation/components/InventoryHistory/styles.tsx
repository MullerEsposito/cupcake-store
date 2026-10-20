import { styled } from 'styled-components';

export const Container = styled.section`
  padding-block: 36px 56px;
  h1 { font-size: clamp(32px, 4vw, 46px); letter-spacing: -1px; }
  > .eyebrow { margin-top: 24px; }
`;

export const Filters = styled.form`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 20px;
  margin-block: 24px;
  padding: 20px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  label { min-width: 0; }
  input, select { width: 100%; min-height: 44px; padding: 12px; margin-top: 8px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: white; }
  button { margin-block: 12px; }
  @media(max-width: 900px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media(max-width: 520px) { grid-template-columns: 1fr; }
`;

export const MovementCard = styled.article`
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 24px;
  margin-block: 20px;
  background: #fffdf9;
  overflow-wrap: anywhere;
  header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  h2 { font-size: 26px; }
  .eyebrow { margin-bottom: 10px; }
  .incoming { color: #285640; white-space: nowrap; }
  .outgoing { color: #8c303e; white-space: nowrap; }
  dl { display: flex; flex-wrap: wrap; gap: 32px; padding-block: 16px; border-block: 1px solid var(--line); }
  dt { font-size: 12px; color: var(--muted); }
  dd { margin: 8px 0 0; font-size: 24px; }
  p { line-height: 1.6; }
  @media(max-width: 520px) { padding: 18px; header { flex-wrap: wrap; } }
`;

export const Pagination = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-block: 24px;
`;
