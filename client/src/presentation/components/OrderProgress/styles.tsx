import { styled } from 'styled-components';

export const Progress = styled.ol`
& {
list-style: none; display: grid; gap: 12px; padding: 0; margin-block: 22px;
}
& li {
display: flex; align-items: center; gap: 10px; color: #706368;
}
& li.reached {
color: #78404d;
}
& li[aria-current] {
font-weight: 700;
}
& li span {
display: inline-flex; justify-content: center; align-items: center; width: 30px; height: 30px; flex-shrink: 0; border: 1px solid currentColor; border-radius: 50%;
}
@media (max-width: 600px) {
& li {
flex-wrap: wrap;
}
}
`;
