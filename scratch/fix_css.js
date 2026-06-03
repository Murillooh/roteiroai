const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

const missingCss = `
  .day-item.active { background: var(--active-bg, rgba(255,255,255,0.05)); }
  .day-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 50%;
    transform: translateY(-50%);
    width: 3px; height: 50%;
    border-radius: 0 4px 4px 0;
    background: var(--accent-color, var(--purple));
  }
  .day-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
  }
  .day-name {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 15px;
    color: var(--text);
  }
  .day-dest {
    font-size: 12px;
    color: #999;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .day-badge {
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    flex-shrink: 0;
  }
`;

// Insert right before /* ── PRELOADER ── */
if (content.includes('/* ── PRELOADER ── */')) {
  content = content.replace('/* ── PRELOADER ── */', missingCss + '\n  /* ── PRELOADER ── */');
  fs.writeFileSync('public/index.html', content);
  console.log('CSS Fixed');
} else {
  console.log('PRELOADER comment not found.');
}
