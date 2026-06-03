const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Safe CSS update: Replace .day-item rules explicitly
const oldDayItem = `.day-item {
    gap: 12px;
    padding: 14px 20px;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: all .15s;
    position: relative;
  }`;
const newDayItem = `.day-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all .15s;
    position: relative;
    margin: 4px 12px;
    border-radius: 8px;
  }`;
if (content.includes(oldDayItem)) {
  content = content.replace(oldDayItem, newDayItem);
} else {
  // Try without windows line endings
  const oldDayItemLF = oldDayItem.replace(/\r\n/g, '\n');
  if (content.includes(oldDayItemLF)) {
    content = content.replace(oldDayItemLF, newDayItem);
  }
}

// 2. Add new CSS classes before PRELOADER
const newCss = `
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
if (!content.includes('.day-item.active::before')) {
  content = content.replace('/* ── PRELOADER ── */', newCss + '\n  /* ── PRELOADER ── */');
}

// 3. Update HTML Templates safely
const dbOrig = `  dbItem.style.borderLeftColor = activeDay === 'dashboard' ? '#a9e34b' : 'transparent';\n  dbItem.innerHTML = \`\n    <div class="day-dot" style="background:#a9e34b; box-shadow: 0 0 8px #a9e34b"></div>\n    <div class="day-info">\n      <div class="day-name">Visão Geral</div>\n      <div class="day-dest">Painel consolidado</div>\n    </div>\n    <div class="day-badge" style="color:#a9e34b; border:1px solid rgba(169, 227, 75, 0.2); background:rgba(169, 227, 75, 0.1)">\n      📊\n    </div>\n  \`;`;
const dbNew = `  dbItem.style.borderLeftColor = activeDay === 'dashboard' ? '#a9e34b' : 'transparent';\n  dbItem.style.setProperty('--active-bg', 'rgba(169, 227, 75, 0.1)');\n  dbItem.innerHTML = \`\n    <div class="day-badge" style="color:#a9e34b; background:rgba(169, 227, 75, 0.15)">📊</div>\n    <div class="day-info">\n      <div class="day-name">Visão Geral</div>\n      <div class="day-dest">Painel consolidado</div>\n    </div>\n  \`;`;
content = content.replace(dbOrig, dbNew).replace(dbOrig.replace(/\n/g, '\r\n'), dbNew);

const searchOrig = `  searchItem.style.borderLeftColor = activeDay === 'search' ? '#4dabf7' : 'transparent';\n  searchItem.innerHTML = \`\n    <div class="day-dot" style="background:#4dabf7; box-shadow: 0 0 8px #4dabf7"></div>\n    <div class="day-info">\n      <div class="day-name">Pesquisar</div>\n      <div class="day-dest">Buscar no histórico</div>\n    </div>\n    <div class="day-badge" style="color:#4dabf7; border:1px solid rgba(77, 171, 247, 0.2); background:rgba(77, 171, 247, 0.1)">\n      🔍\n    </div>\n  \`;`;
const searchNew = `  searchItem.style.borderLeftColor = activeDay === 'search' ? '#4dabf7' : 'transparent';\n  searchItem.style.setProperty('--active-bg', 'rgba(77, 171, 247, 0.1)');\n  searchItem.innerHTML = \`\n    <div class="day-badge" style="color:#4dabf7; background:rgba(77, 171, 247, 0.15)">🔍</div>\n    <div class="day-info">\n      <div class="day-name">Pesquisar</div>\n      <div class="day-dest">Buscar no histórico</div>\n    </div>\n  \`;`;
content = content.replace(searchOrig, searchNew).replace(searchOrig.replace(/\n/g, '\r\n'), searchNew);

const daysOrig = `    el.style.borderLeftColor = d.id === activeDay ? d.color : 'transparent';\n    el.innerHTML = \`\n      <div class="day-dot" style="background:\${d.color}"></div>\n      <div class="day-info">\n        <div class="day-name">\${d.name} <span style="font-size:10px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>\n        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>\n      </div>\n      <div class="day-badge" style="color:\${d.color};border:1px solid \${d.color}22;background:\${d.color}11">\n        \${d.special ? '⚡' : '📍'}\n      </div>\n    \`;`;
const daysNew = `    el.style.borderLeftColor = d.id === activeDay ? d.color : 'transparent';\n    el.style.setProperty('--active-bg', d.color + '1A');\n    el.innerHTML = \`\n      <div class="day-badge" style="color:\${d.color}; background:\${d.color}1A">\n        \${d.special ? '⚡' : '📍'}\n      </div>\n      <div class="day-info">\n        <div class="day-name">\${d.name} <span style="font-size:12px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>\n        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>\n      </div>\n    \`;`;
content = content.replace(daysOrig, daysNew).replace(daysOrig.replace(/\n/g, '\r\n'), daysNew);

const confOrig = `  configItem.style.borderLeftColor = activeDay === 'config' ? 'var(--purple)' : 'transparent';\n  configItem.innerHTML = \`\n    <div class="day-dot" style="background:var(--purple); box-shadow: 0 0 8px var(--purple)"></div>\n    <div class="day-info">\n      <div class="day-name">Configurações</div>\n      <div class="day-dest">Perfil e Preferências</div>\n    </div>\n    <div class="day-badge" style="color:var(--purple); border:1px solid var(--purple)22; background:var(--purple)11">\n      ⚙️\n    </div>\n  \`;`;
const confNew = `  configItem.style.borderLeftColor = activeDay === 'config' ? 'var(--purple)' : 'transparent';\n  configItem.style.setProperty('--active-bg', 'rgba(177, 151, 252, 0.1)');\n  configItem.innerHTML = \`\n    <div class="day-badge" style="color:var(--purple); background:rgba(177, 151, 252, 0.15)">⚙️</div>\n    <div class="day-info">\n      <div class="day-name">Configurações</div>\n      <div class="day-dest">Perfil e Preferências</div>\n    </div>\n  \`;`;
content = content.replace(confOrig, confNew).replace(confOrig.replace(/\n/g, '\r\n'), confNew);

fs.writeFileSync('public/index.html', content);
console.log('Safe upgrade complete!');
