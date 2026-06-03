const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// ── CSS REPLACEMENTS ──
content = content.replace(
  /\.day-item \{[\s\S]*?position: relative;\s*\}/,
  `.day-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all .15s;
    position: relative;
    margin: 4px 12px;
    border-radius: 8px;
  }`
);

// Replace active ::after with ::before and fix background
content = content.replace(
  /\.day-item\.active \{ background: var\(--card\); \}/,
  `.day-item.active { background: var(--active-bg, rgba(255,255,255,0.05)); }`
);

content = content.replace(
  /\.day-item\.active::after \{[\s\S]*?background: var\(--accent-color, var\(--purple\)\);\s*\}/,
  `.day-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 50%;
    transform: translateY(-50%);
    width: 3px; height: 50%;
    border-radius: 0 4px 4px 0;
    background: var(--accent-color, var(--purple));
  }`
);

// Replace .day-name font
content = content.replace(
  /\.day-name \{[\s\S]*?color: var\(--text\);\s*\}/,
  `.day-name {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 15px;
    color: var(--text);
  }`
);

// Replace .day-dest color
content = content.replace(
  /\.day-dest \{[\s\S]*?text-overflow: ellipsis;\s*\}/,
  `.day-dest {
    font-size: 12px;
    color: #999;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }`
);

// Replace .day-badge to be the new left icon
content = content.replace(
  /\.day-badge \{[\s\S]*?background: transparent;\s*\}/,
  `.day-badge {
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    flex-shrink: 0;
  }`
);

// Remove the old .day-dot
content = content.replace(
  /\.day-dot \{[\s\S]*?flex-shrink: 0;\s*\}/,
  `/* removed day-dot */`
);

// ── JS REPLACEMENTS ──
// Dashboard
const dbOrig = `dbItem.innerHTML = \`
    <div class="day-dot" style="background:var(--ai); box-shadow: 0 0 8px var(--ai)"></div>
    <div class="day-info">
      <div class="day-name">Visão Geral</div>
      <div class="day-dest">Painel consolidado</div>
    </div>
    <div class="day-badge" style="color:var(--ai); border:1px solid var(--ai)22; background:var(--ai)11">
      📊
    </div>
  \`;`;
const dbNew = `dbItem.style.setProperty('--active-bg', 'rgba(169, 227, 75, 0.1)');
  dbItem.innerHTML = \`
    <div class="day-badge" style="color:var(--ai); background:rgba(169, 227, 75, 0.15)">📊</div>
    <div class="day-info">
      <div class="day-name">Visão Geral</div>
      <div class="day-dest">Painel consolidado</div>
    </div>
  \`;`;
content = content.replace(dbOrig, dbNew);

// Search
const searchOrig = `searchItem.innerHTML = \`
    <div class="day-dot" style="background:var(--blue); box-shadow: 0 0 8px var(--blue)"></div>
    <div class="day-info">
      <div class="day-name">Pesquisar</div>
      <div class="day-dest">Buscar no histórico</div>
    </div>
    <div class="day-badge" style="color:var(--blue); border:1px solid var(--blue)22; background:var(--blue)11">
      🔍
    </div>
  \`;`;
const searchNew = `searchItem.style.setProperty('--active-bg', 'rgba(116, 192, 252, 0.1)');
  searchItem.innerHTML = \`
    <div class="day-badge" style="color:var(--blue); background:rgba(116, 192, 252, 0.15)">🔍</div>
    <div class="day-info">
      <div class="day-name">Pesquisar</div>
      <div class="day-dest">Buscar no histórico</div>
    </div>
  \`;`;
content = content.replace(searchOrig, searchNew);

// Days
const daysOrig = `el.innerHTML = \`
      <div class="day-dot" style="background:\${d.color}"></div>
      <div class="day-info">
        <div class="day-name">\${d.name} <span style="font-size:10px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>
        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>
      </div>
      <div class="day-badge" style="color:\${d.color};border:1px solid \${d.color}22;background:\${d.color}11">
        \${d.special ? '⚡' : '📍'}
      </div>
    \`;`;
const daysNew = `el.style.setProperty('--active-bg', d.color + '1A'); // ~10% opacity
    el.innerHTML = \`
      <div class="day-badge" style="color:\${d.color}; background:\${d.color}1A">
        \${d.special ? '⚡' : '📍'}
      </div>
      <div class="day-info">
        <div class="day-name">\${d.name} <span style="font-size:12px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>
        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>
      </div>
    \`;`;
content = content.replace(daysOrig, daysNew);

// Config (if exists)
const confOrig = `confItem.innerHTML = \`
    <div class="day-dot" style="background:var(--purple); box-shadow: 0 0 8px var(--purple)"></div>
    <div class="day-info">
      <div class="day-name">Configurações</div>
      <div class="day-dest">Perfil e Preferências</div>
    </div>
    <div class="day-badge" style="color:var(--purple); border:1px solid var(--purple)22; background:var(--purple)11">
      ⚙
    </div>
  \`;`;
const confNew = `confItem.style.setProperty('--active-bg', 'rgba(177, 151, 252, 0.1)');
  confItem.innerHTML = \`
    <div class="day-badge" style="color:var(--purple); background:rgba(177, 151, 252, 0.15)">⚙</div>
    <div class="day-info">
      <div class="day-name">Configurações</div>
      <div class="day-dest">Perfil e Preferências</div>
    </div>
  \`;`;
content = content.replace(confOrig, confNew);

fs.writeFileSync('public/index.html', content);
console.log('UI UPGRADED');
