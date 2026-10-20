import { styled } from 'styled-components';
import { sharedStyles } from '../../styles/global';

export const Container = styled.div`
.announcement {
text-align: center;
  background: #773948;
  color: #fff6ed;
  font-size: 12px;
  padding: 11px 20px;
  letter-spacing: .6px
}
.header {
display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 110px
}
.brand {
display: flex;
  align-items: center;
  gap: 10px;
  font-family: Georgia, serif;
  font-size: 27px;
  font-weight: bold;
  line-height: 1
}
.brand-icon {
width: 42px;
  height: 48px;
  border-radius: 50% 50% 42% 42%;
  background: #ecd1cd;
  color: #773948;
  font-size: 37px;
  display: grid;
  place-items: center;
  padding-bottom: 9px
}
.brand-small {
display: block;
  text-align: center;
  font: 9px Arial;
  letter-spacing: 5px;
  margin-top: 7px
}
.header nav {
display: flex;
  gap: 32px;
  font-size: 13px
}
.header nav a:hover {
color: var(--rose)
}
.account {
display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px
}
.project-note {
display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
  border-top: 1px solid var(--line);
  font-size: 11px;
  line-height: 1.6;
  color: var(--muted)
}
.project-note strong {
white-space: nowrap;
  color: var(--ink)
}
footer {
display: flex;
  align-items: center;
  gap: 30px;
  padding: 32px 0 40px;
  color: var(--muted)
}
footer .brand {
font-size: 20px;
  color: var(--ink)
}
footer span {
font-size: 11px
}
footer small {
font-size: 10px;
  margin-left: auto
}
.skip {
position: absolute;
  left: 12px;
  top: -100px;
  background: white;
  padding: 10px;
  z-index: 99
}
.skip:focus {
top: 10px
}
@media(max-width:900px) {
.header nav {
display: none
}
.account #greeting {
display: none
}
}
@media(max-width:600px) {
.announcement {
font-size: 10px
}
.header {
min-height: 90px;
    gap: 10px
}
.brand {
font-size: 23px
}
.brand-icon {
display: none
}
.project-note {
display: block
}
.project-note span {
display: block;
    margin-top: 8px
}
footer {
flex-wrap: wrap;
    gap: 15px
}
footer small {
width: 100%;
    margin: 0
}
}
.account {
flex-wrap: wrap; justify-content: flex-end;
}

.header { min-height: 112px; flex-wrap: wrap; padding-block: 20px; }
.header nav { gap: 22px; }
a[aria-current=page] { color: var(--rose); text-decoration: underline; text-underline-offset: 6px; }
@media(max-width: 1000px) {
  .header nav { display: flex; order: 3; width: 100%; flex-wrap: wrap; gap: 20px; }
  .account { flex: 1; }
}
@media(max-width: 520px) {
  .header { align-items: flex-start; gap: 20px; }
  .account { gap: 12px; font-size: 12px; }
  .header nav { border-top: 1px solid var(--line); padding-top: 16px; }
}
`;

export const FooterContainer = styled(Container)`
margin-top: auto;
footer { flex-wrap: wrap; }
`;

export const Shell = styled.div`
${sharedStyles}
display: flex; flex-direction: column; min-height: 100vh;
main { flex: 1; }
main:focus { outline: none; }
h2 { overflow-wrap: anywhere; }
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--ink); color: white; padding: 16px 24px; border-radius: 12px; z-index: 20; max-width: 90vw; }
`;
