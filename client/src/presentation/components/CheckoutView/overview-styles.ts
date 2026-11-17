import { styled } from 'styled-components';

export const Overview = styled.div`
& {
display: grid; gap: 16px; margin-block: 18px;
}
.order-card {
background: #fffdf9; border: 1px solid #e6d6d3; border-radius: 14px; padding: clamp(14px, 3vw, 24px); min-width: 0; overflow-wrap: anywhere;
}
.order-card h2 {
font-size: 21px; margin: 0 0 12px;
}
.order-card p {
margin-block: 8px;
}
.order-card .order-number {
color: #67525a; font-size: 14px; margin-top: 0;
}
.order-badge {
display: inline-flex; gap: 6px; align-items: center; padding: 5px 12px; border-radius: 24px; background: #eee6ee; color: #56354e; font-weight: 700;
}
.order-badge[data-tone="danger"] { background: #f8e5e7; color: #84263b; }
.order-badge[data-tone="success"] { background: #e4f2e9; color: #23573c; }
.order-badge[data-tone="warning"] { background: #fcf0d8; color: #6d480e; }
.order-method { margin-inline-start: 6px; }
.order-detail-items { list-style: none; padding: 0; margin: 0 0 16px; }
.order-detail-items li, .order-totals div {
display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; padding-block: 8px;
}
.order-detail-items li { border-bottom: 1px solid #eee2de; }
.order-item-quantity { color: #67525a; }
.order-totals { margin: 0; }
.order-totals dd { margin: 0; }
.order-total { border-top: 1px solid #e6d6d3; font-size: 18px; font-weight: 700; }
`;
