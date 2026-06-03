const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// Days
const daysOrig = `    el.style.borderLeftColor = d.id === activeDay ? d.color : 'transparent';\r\n    el.innerHTML = \`\r\n      <div class="day-dot" style="background:\${d.color}"></div>\r\n      <div class="day-info">\r\n        <div class="day-name">\${d.name} <span style="font-size:10px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>\r\n        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>\r\n      </div>\r\n      <div class="day-badge" style="color:\${d.color};border:1px solid \${d.color}22;background:\${d.color}11">\r\n        \${d.special ? '⚡' : '📍'}\r\n      </div>\r\n    \`;`;

const daysOrigLF = `    el.style.borderLeftColor = d.id === activeDay ? d.color : 'transparent';\n    el.innerHTML = \`\n      <div class="day-dot" style="background:\${d.color}"></div>\n      <div class="day-info">\n        <div class="day-name">\${d.name} <span style="font-size:10px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>\n        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>\n      </div>\n      <div class="day-badge" style="color:\${d.color};border:1px solid \${d.color}22;background:\${d.color}11">\n        \${d.special ? '⚡' : '📍'}\n      </div>\n    \`;`;

const daysNew = `    el.style.borderLeftColor = d.id === activeDay ? d.color : 'transparent';\n    el.style.setProperty('--active-bg', d.color + '1A'); // ~10% opacity\n    el.innerHTML = \`\n      <div class="day-badge" style="color:\${d.color}; background:\${d.color}1A">\n        \${d.special ? '⚡' : '📍'}\n      </div>\n      <div class="day-info">\n        <div class="day-name">\${d.name} <span style="font-size:12px; color:var(--sub); font-weight:400">(\${d.dateLabel})</span></div>\n        <div class="day-dest">\${d.dest ? d.dest + ' · ' : ''}\${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>\n      </div>\n    \`;`;

if(content.includes(daysOrig)) content = content.replace(daysOrig, daysNew);
else if(content.includes(daysOrigLF)) content = content.replace(daysOrigLF, daysNew);


// Config
const confOrig = `  configItem.style.borderLeftColor = activeDay === 'config' ? 'var(--purple)' : 'transparent';\r\n  configItem.innerHTML = \`\r\n    <div class="day-dot" style="background:var(--purple); box-shadow: 0 0 8px var(--purple)"></div>\r\n    <div class="day-info">\r\n      <div class="day-name">Configurações</div>\r\n      <div class="day-dest">Perfil e Preferências</div>\r\n    </div>\r\n    <div class="day-badge" style="color:var(--purple); border:1px solid var(--purple)22; background:var(--purple)11">\r\n      ⚙️\r\n    </div>\r\n  \`;`;

const confOrigLF = `  configItem.style.borderLeftColor = activeDay === 'config' ? 'var(--purple)' : 'transparent';\n  configItem.innerHTML = \`\n    <div class="day-dot" style="background:var(--purple); box-shadow: 0 0 8px var(--purple)"></div>\n    <div class="day-info">\n      <div class="day-name">Configurações</div>\n      <div class="day-dest">Perfil e Preferências</div>\n    </div>\n    <div class="day-badge" style="color:var(--purple); border:1px solid var(--purple)22; background:var(--purple)11">\n      ⚙️\n    </div>\n  \`;`;

const confNew = `  configItem.style.borderLeftColor = activeDay === 'config' ? 'var(--purple)' : 'transparent';\n  configItem.style.setProperty('--active-bg', 'rgba(177, 151, 252, 0.1)');\n  configItem.innerHTML = \`\n    <div class="day-badge" style="color:var(--purple); background:rgba(177, 151, 252, 0.15)">⚙️</div>\n    <div class="day-info">\n      <div class="day-name">Configurações</div>\n      <div class="day-dest">Perfil e Preferências</div>\n    </div>\n  \`;`;

if(content.includes(confOrig)) content = content.replace(confOrig, confNew);
else if(content.includes(confOrigLF)) content = content.replace(confOrigLF, confNew);

fs.writeFileSync('public/index.html', content);
console.log('Fixed Sidebar.');
