import { styled } from 'styled-components';

export const Container = styled.div`
.hero {
display: grid;
  grid-template-columns: 1.05fr 1fr;
  align-items: center;
  min-height: 540px;
  padding-top: 20px;
  padding-bottom: 60px;
  gap: 40px
}
.hero-description {
font-size: 15px;
  line-height: 1.8;
  color: var(--muted);
  margin: 0 0 28px
}
.hero-note {
font-size: 11px;
  color: var(--muted);
  margin-top: 25px
}
.hero-note span {
font-size: 19px;
  color: var(--rose);
  margin-right: 6px
}
.hero-art {
position: relative;
  min-height: 430px;
  display: grid;
  place-items: center;
  background: #f0e0d9;
  border-radius: 48% 48% 42% 42%;
  isolation: isolate
}
.hero-art>img {
width: 85%;
  height: auto;
  filter: drop-shadow(0 24px 14px #70432b22);
  transform: rotate(-8deg)
}
.orbit {
position: absolute;
  border: 1px solid #cba89d7a;
  width: 95%;
  height: 88%;
  border-radius: 50%;
  z-index: -1;
  transform: rotate(-25deg)
}
.orbit-two {
width: 80%;
  height: 100%;
  transform: rotate(30deg)
}
.art-label {
position: absolute;
  top: 35px;
  left: 26px;
  font: 18px Georgia;
  line-height: 1.4;
  transform: rotate(-9deg);
  z-index: 1
}
.art-label em {
font-size: 26px;
  color: var(--rose)
}
.art-stamp {
position: absolute;
  right: -18px;
  bottom: 20px;
  transform: rotate(10deg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px solid #aa6c74;
  border-radius: 50%;
  width: 123px;
  height: 123px;
  background: var(--cream);
  font-size: 7px;
  letter-spacing: 1px;
  text-align: center;
  line-height: 1.5;
  color: var(--rose)
}
.art-stamp span {
font: italic 32px Georgia;
  letter-spacing: 0
}
.benefits {
border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: #f5ece4
}
.benefits>.wrap {
display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 0;
  font-size: 12px;
  color: #76554c
}
@media(max-width:900px) {
.hero {
gap: 20px;
    min-height: 450px
}
.hero-art {
min-height: 340px
}
.art-stamp {
width: 100px;
    height: 100px;
    right: -10px
}
}
@media(max-width:600px) {
.hero {
grid-template-columns: 1fr;
    padding-top: 20px;
    padding-bottom: 35px;
    gap: 30px
}
.hero-copy {
padding-top: 8px
}
.hero-art {
min-height: 320px;
    margin: 0 20px
}
.hero-art>img {
width: 85%;
    max-width: 350px
}
.art-label {
top: 15px;
    left: 0
}
.benefits>.wrap {
font-size: 10px;
    justify-content: center
}
.benefits span:last-child {
display: none
}
.hero-note {
font-size: 10px
}
}
.cart-shortcut {
white-space: nowrap; font-weight: 600; color: var(--rose);
}
`;
