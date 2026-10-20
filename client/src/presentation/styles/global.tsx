import { createGlobalStyle, css } from 'styled-components';
import { theme } from './theme';

export const GlobalStyle = createGlobalStyle`
:root {
--ink: ${theme.colors.ink};
  --rose: ${theme.colors.rose};
  --cream: ${theme.colors.cream};
  --soft: #efe3dc;
  --muted: ${theme.colors.muted};
  --line: ${theme.colors.line};
  font-family: Arial, Helvetica, sans-serif;
  color: var(--ink);
  background: var(--cream);
  font-synthesis: none;
  scroll-behavior: smooth
}
* {
box-sizing: border-box
}
body {
margin: 0
}
button,
input {
font: inherit
}
button,
a {
-webkit-tap-highlight-color: transparent
}
button {
cursor: pointer
}
a {
color: inherit;
  text-decoration: none
}
[hidden] {
display: none !important
}
h1,
h2,
h3 {
font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400
}
h1 {
font-size: clamp(44px, 5.1vw, 68px);
  line-height: 1.08;
  letter-spacing: -2px;
  margin: 0 0 24px
}
h1 em {
color: var(--rose);
  font-weight: 400
}
h2 {
font-size: 39px;
  letter-spacing: -1px;
  margin: 0
}
@media(max-width:600px) {
h1 {
font-size: 51px
}
}
@media(prefers-reduced-motion:reduce) {
:root {
scroll-behavior: auto
}
* {
transition: none !important
}
}
:root {
overflow-x: clip
}

body { min-width: 320px; }
#root { min-height: 100vh; }
select, textarea { font: inherit; }
select:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 3px solid var(--rose); outline-offset: 4px; }
`;

export const sharedStyles = css`
button:focus-visible,
a:focus-visible,
input:focus-visible {
outline: 3px solid #a44759;
  outline-offset: 4px
}
.wrap {
width: min(1180px, calc(100% - 72px));
  margin: auto
}
.button {
border: 1px solid transparent;
  border-radius: 5px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  font-size: 13px;
  font-weight: 600;
  padding: 15px 22px;
  transition: background .2s
}
.button.primary {
background: var(--rose);
  color: white
}
.button.primary:hover {
background: #843748
}
.button.outline {
border-color: #c6aaa3;
  color: var(--ink);
  background: transparent;
  padding: 12px 18px
}
.button:disabled {
opacity: .6;
  cursor: wait
}
.eyebrow {
font-size: 10px;
  letter-spacing: 2px;
  font-weight: 700;
  color: var(--rose);
  margin: 0 0 24px;
  line-height: 1.6
}
.eyebrow span {
display: inline-block;
  width: 7px;
  height: 7px;
  background: var(--rose);
  border-radius: 50%;
  margin-right: 8px
}
.category {
font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--rose);
  margin: 0 0 10px
}
.price {
font-size: 16px;
  font-weight: 600
}
.detail-button {
border: 0;
  background: transparent;
  color: var(--rose);
  font-size: 11px;
  font-weight: bold;
  padding: 10px 0
}
.stock {
font-size: 10px;
  color: var(--muted);
  margin: 12px 0 0
}
.state {
padding: 35px;
  border: 1px dashed #ccb9ad;
  border-radius: 8px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7
}
.state button {
margin-top: 15px
}
form label {
display: block;
  font-size: 12px;
  margin: 17px 0
}
input {
display: block;
  width: 100%;
  margin-top: 8px;
  border: 1px solid #cdb7ae;
  border-radius: 5px;
  background: white;
  padding: 12px;
  font-size: 14px;
  color: var(--ink)
}
form .button {
width: 100%
}
.hint {
font-size: 11px;
  line-height: 1.5;
  color: var(--muted)
}
.error {
color: #9e1b32;
  font-size: 12px;
  line-height: 1.6;
  min-height: 16px
}
.toast {
position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: white;
  padding: 15px 24px;
  border-radius: 8px;
  z-index: 10;
  font-size: 13px;
  max-width: 90vw
}
@media(max-width:600px) {
.wrap {
width: calc(100% - 36px)
}
.button.outline {
font-size: 11px;
    padding: 11px
}
.price {
font-size: 15px
}
}
button:disabled {
cursor: not-allowed; opacity: .6;
}

form label { display: block; font-size: 13px; margin: 17px 0; }
input:not([type=checkbox]), select { max-width: 100%; }
input[type=checkbox] { width: 20px; height: 20px; }
.button { gap: 10px; min-height: 44px; }
a.button { text-align: center; }
`;
