import { styled } from 'styled-components';

export const Container = styled.div`
.about {
display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 70px;
  align-items: center;
  padding: 55px 70px;
  background: #f2e9df;
  border-radius: 12px;
  margin-bottom: 45px
}
.about-mark {
font: 140px Georgia;
  text-align: center;
  color: #b57778
}
.about h2 {
font-size: 33px;
  line-height: 1.2
}
.about p:last-child {
font-size: 13px;
  color: var(--muted);
  line-height: 1.8;
  max-width: 460px
}
.about .eyebrow {
margin-bottom: 16px
}
@media(max-width:900px) {
.about {
padding: 40px;
    gap: 30px
}
}
@media(max-width:600px) {
.about {
display: block;
    padding: 30px
}
.about-mark {
display: none
}
.about h2 {
font-size: 30px
}
}

.about { margin-top: 40px; }
.about h1 { font-size: clamp(32px, 4vw, 48px); }
.about p { line-height: 1.8; color: var(--muted); }
`;
