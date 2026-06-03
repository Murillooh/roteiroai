const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Replace Dashboard HTML
const oldDashboardStart = '<!-- Dashboard View Container -->';
const oldDashboardEnd = '<!-- Search View Container -->';

const dashboardStartIndex = html.indexOf(oldDashboardStart);
const dashboardEndIndex = html.indexOf(oldDashboardEnd);

if (dashboardStartIndex === -1 || dashboardEndIndex === -1) {
    console.error("Could not find dashboard boundaries");
    process.exit(1);
}

const newDashboardHTML = `<!-- Dashboard View Container -->
    <div id="dashboardView" style="display:none; flex-direction:column; gap:24px;" class="dashboard-container">
      <div class="db-header" style="flex-direction: column; align-items: flex-start; gap: 8px;">
        <h2 class="db-title">Visão Geral</h2>
        <p class="db-subtitle">Acompanhe seu desempenho semanal com a nova interface premium</p>
      </div>

      <div class="bento-grid">
        <!-- Stats Row -->
        <div class="bento-card stat-card glow-ai">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <div class="stat-val" id="dbTotal">0</div>
            <div class="stat-lbl">Tarefas Criadas</div>
          </div>
        </div>
        <div class="bento-card stat-card glow-yellow">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-val" id="dbDone">0</div>
            <div class="stat-lbl">Concluídas</div>
          </div>
        </div>
        <div class="bento-card stat-card glow-purple progress-card">
          <div class="progress-circle-wrap">
            <svg class="progress-circle" viewBox="0 0 36 36">
              <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="circle-path" id="dbPctCircle" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div class="progress-val" id="dbPct">0%</div>
          </div>
          <div class="stat-lbl" style="color:var(--purple); margin-top:8px;">Taxa de Sucesso</div>
        </div>

        <!-- Chart -->
        <div class="bento-card chart-card">
          <div class="bento-title">PRODUTIVIDADE POR DIA</div>
          <div class="db-chart-container" id="dbChart" style="margin: auto 0; height: 180px;"></div>
        </div>

        <!-- Bases -->
        <div class="bento-card bases-card">
          <div class="bento-title">DESEMPENHO DAS BASES</div>
          <div class="db-bases-list" id="dbBasesList" style="flex:1; overflow-y:auto; padding-right:10px;"></div>
        </div>

        <!-- Pending -->
        <div class="bento-card pending-card">
          <div class="bento-title">ATIVIDADES PENDENTES</div>
          <div class="db-pending-tasks" id="dbPendingTasks" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px;"></div>
        </div>
      </div>
    </div>
    
    `;

html = html.substring(0, dashboardStartIndex) + newDashboardHTML + html.substring(dashboardEndIndex);


// 2. Replace renderDashboard() JS
const oldJSStart = 'function renderDashboard() {';
const oldJSEnd = 'function renderCalendar() {';

const jsStartIndex = html.indexOf(oldJSStart);
const jsEndIndex = html.indexOf(oldJSEnd);

if (jsStartIndex === -1 || jsEndIndex === -1) {
    console.error("Could not find JS boundaries");
    process.exit(1);
}

const newJS = `function renderDashboard() {
  let total = 0, done = 0;
  let chartHTML = '';
  let basesHTML = '';
  let pendingHTML = '';

  DAYS.forEach(d => {
    const t = tasks[d.id] || [];
    const dCount = t.filter(x => x.done).length;
    const tCount = t.length;
    const pct = tCount ? Math.round((dCount / tCount) * 100) : 0;

    total += tCount;
    done  += dCount;

    // Renderiza a barra do gráfico semanal (mantém o visual premium atualizado)
    chartHTML += \`
      <div class="db-chart-bar-wrapper">
        <div class="db-chart-value" style="color: \${d.color}">\${pct}%</div>
        <div class="db-chart-bar-bg" title="\${d.name}: \${dCount}/\${tCount} concluídas">
          <div class="db-chart-bar-fill" style="height: \${pct}%; --bar-color: \${d.color}"></div>
        </div>
        <div class="db-chart-label">\${d.shortName}</div>
      </div>
    \`;

    // Renderiza a lista de progresso das bases (novo estilo premium)
    basesHTML += \`
      <div class="db-base-item" style="padding:12px; background:rgba(255,255,255,0.03); border-radius:12px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05); transition:transform 0.2s;">
        <div class="db-base-info" style="margin-bottom:8px;">
          <span class="db-base-name" style="color: \${d.color}; font-weight:600; font-size:13px;">\${d.name} <span style="opacity:0.6;font-size:11px;">(\${d.dest})</span></span>
          <span style="color: var(--sub); font-family:'Goldman'; font-size:12px;">\${dCount}/\${tCount}</span>
        </div>
        <div class="db-base-progress-bg" style="height:6px; background:rgba(0,0,0,0.3); border-radius:10px; overflow:hidden; box-shadow:inset 0 1px 3px rgba(0,0,0,0.5);">
          <div class="db-base-progress-fill" style="height:100%; width: \${pct}%; background: \${d.color}; border-radius:10px; box-shadow:0 0 10px \${d.color}; transition:width 1s ease;"></div>
        </div>
      </div>
    \`;

    // Renderiza as tarefas pendentes da semana (Bento grid mode)
    const pendingTasks = t.filter(x => !x.done);
    if (pendingTasks.length > 0) {
      pendingHTML += \`
        <div class="bento-pending-group" style="background:rgba(\${hexToRgb(d.color)},0.05); border:1px solid rgba(\${hexToRgb(d.color)},0.2); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px;">
          <div class="db-pending-day" style="color: \${d.color}; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:\${d.color};box-shadow:0 0 8px \${d.color}"></div>
            \${d.name} <span style="opacity:0.5;font-weight:500">(\${d.dest})</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
      \`;
      pendingTasks.forEach(x => {
        pendingHTML += \`
          <div class="db-pending-item" style="background:rgba(0,0,0,0.2); border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,0.05);">
            <div class="task-check" onclick="toggleTask(\${x.id})" style="border-color:\${d.color}"></div>
            <span class="db-pending-text" style="flex:1; font-size:13px; color:#eee;">\${x.text}</span>
            \${x.time ? \`<span class="db-pending-time" style="font-size:11px; background:rgba(\${hexToRgb(d.color)},0.15); color:\${d.color}; padding:2px 6px; border-radius:4px;">\${x.time}</span>\` : ''}
          </div>
        \`;
      });
      pendingHTML += \`</div></div>\`;
    }
  });

  const overallPct = total ? Math.round((done / total) * 100) : 0;
  
  // Animate numbers
  animateValue("dbTotal", parseInt(document.getElementById('dbTotal').textContent)||0, total, 1000);
  animateValue("dbDone", parseInt(document.getElementById('dbDone').textContent)||0, done, 1000);
  
  const pctEl = document.getElementById('dbPct');
  const oldPct = parseInt(pctEl.textContent) || 0;
  animateValue("dbPct", oldPct, overallPct, 1000, '%');

  // Animate Circle
  const circle = document.getElementById('dbPctCircle');
  if(circle) {
      circle.style.strokeDasharray = \`\${overallPct}, 100\`;
  }

  document.getElementById('dbChart').innerHTML = chartHTML;
  document.getElementById('dbBasesList').innerHTML = basesHTML;
  document.getElementById('dbPendingTasks').innerHTML = pendingHTML || \`
    <div class="empty-state" style="border: none; padding: 40px; text-align:center; background:rgba(255,255,255,0.02); border-radius:16px;">
      <div style="font-size:40px; margin-bottom:10px;">🎉</div>
      <div style="color:var(--ai); font-weight:600; font-size:16px;">Excelente! Todas as tarefas pendentes da semana foram concluídas!</div>
    </div>
  \`;
}

// Helper to get RGB from HEX for RGBA colors
function hexToRgb(hex) {
    if(!hex) return "255,255,255";
    if(hex.startsWith('var')) return "255,255,255"; // Fallback for CSS vars if used
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
    }
    return +(r) + "," + +(g) + "," + +(b);
}

// Helper to animate numbers
function animateValue(id, start, end, duration, suffix='') {
    if (start === end) {
        document.getElementById(id).textContent = end + suffix;
        return;
    }
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        obj.textContent = Math.floor(easeProgress * (end - start) + start) + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end + suffix;
        }
    };
    window.requestAnimationFrame(step);
}

`;

html = html.substring(0, jsStartIndex) + newJS + html.substring(jsEndIndex);


// 3. Append Bento CSS before PRELOADER
const bentoCSS = `

/* Bento Grid System */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(130px, auto);
  gap: 20px;
}
.bento-card {
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  animation: bentoFadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s;
}
.bento-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.15);
}
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.stat-card { flex-direction: row; align-items: center; gap: 24px; grid-column: span 1; justify-content: flex-start; }
.stat-icon { font-size: 38px; filter: drop-shadow(0 0 16px currentColor); }
.stat-content { display: flex; flex-direction: column; }
.stat-val { font-family: 'Goldman', sans-serif; font-size: 38px; font-weight: 700; line-height: 1.1; }
.stat-lbl { font-size: 13px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-top: 6px; }

.glow-ai .stat-icon, .glow-ai .stat-val { color: var(--ai); text-shadow: 0 0 24px rgba(169,227,75,0.4); }
.glow-yellow .stat-icon, .glow-yellow .stat-val { color: var(--yellow); text-shadow: 0 0 24px rgba(255,212,59,0.4); }

.progress-card { justify-content: center; flex-direction: column; text-align: center; gap: 0; padding: 20px;}
.progress-circle-wrap { position: relative; width: 85px; height: 85px; margin: 0 auto; }
.progress-circle { transform: rotate(-90deg); width: 100%; height: 100%; }
.circle-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 2.5; }
.circle-path { fill: none; stroke: var(--purple); stroke-width: 2.5; stroke-linecap: round; transition: stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); filter: drop-shadow(0 0 8px var(--purple)); }
.progress-val { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Goldman', sans-serif; font-size: 18px; font-weight: 700; color: #fff; text-shadow: 0 0 10px var(--purple); }

.bento-title { font-size: 12px; letter-spacing: 1.5px; color: var(--sub); text-transform: uppercase; font-weight: 800; margin-bottom: 24px; display:flex; align-items:center; gap:8px;}
.bento-title::before { content:''; display:inline-block; width:8px; height:8px; border-radius:50%; background:currentColor; opacity:0.5; }

.chart-card { grid-column: span 2; grid-row: span 2; display: flex; flex-direction: column;}
.bases-card { grid-column: span 1; grid-row: span 2; display: flex; flex-direction: column; max-height:430px; }
.pending-card { grid-column: span 3; }

/* Scrollbar para bases list */
.db-bases-list::-webkit-scrollbar { width: 6px; }
.db-bases-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
.db-bases-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.db-bases-list::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

/* Responsive */
@media(max-width: 900px) {
  .bento-grid { grid-template-columns: 1fr; }
  .chart-card, .bases-card, .pending-card, .stat-card { grid-column: span 1; grid-row: auto; }
}

/* Stagger animation delays */
.bento-grid > :nth-child(1) { animation-delay: 0.05s; }
.bento-grid > :nth-child(2) { animation-delay: 0.1s; }
.bento-grid > :nth-child(3) { animation-delay: 0.15s; }
.bento-grid > :nth-child(4) { animation-delay: 0.25s; }
.bento-grid > :nth-child(5) { animation-delay: 0.35s; }
.bento-grid > :nth-child(6) { animation-delay: 0.45s; }

`;

html = html.replace('/* ── PRELOADER ── */', bentoCSS + '\n  /* ── PRELOADER ── */');

fs.writeFileSync('public/index.html', html);
console.log('Bento Redesign Applied Successfully!');
