const fs = require('fs');

let content = fs.readFileSync('public/index.html', 'utf8');

const oldTarget = `        <div class="stat-val" id="statDone" style="color:var(--ai)">0</div>
        <div class="stat-lbl">FEITAS</div>
      </div>
    </div>
  </aside>`;

const newTarget = `        <div class="stat-val" id="statDone" style="color:var(--ai)">0</div>
        <div class="stat-lbl">FEITAS</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" id="statPct" style="color:var(--yellow)">0%</div>
        <div class="stat-lbl">PROGRESSO</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" id="statDays" style="color:var(--orange)">7</div>
        <div class="stat-lbl">DIAS</div>
      </div>
    </div>
  </aside>`;

content = content.replace(oldTarget, newTarget).replace(oldTarget.replace(/\n/g, '\r\n'), newTarget.replace(/\n/g, '\r\n'));

fs.writeFileSync('public/index.html', content);
console.log('RESTORED STATS');
