const fs = require('fs');
const code = `
<!-- APP CONFIG MODAL (NOTIFICATIONS) -->
<div class="modal-overlay" id="appConfigModal" style="display:none">
  <div class="modal">
    <div class="modal-title">Configurações do <span>App</span></div>
    <div class="modal-desc">
      Gerencie suas preferências de notificações e lembretes.
    </div>
    
    <div style="margin-bottom: 20px;">
      <div class="modal-label" style="display:flex; justify-content:space-between; align-items:center;">
        <span>NOTIFICAÇÕES PUSH (GERAIS)</span>
        <label class="switch">
          <input type="checkbox" id="pushToggle" onchange="togglePushNotifications(this.checked)">
          <span class="slider round"></span>
        </label>
      </div>
      <div class="modal-hint" style="margin-top: 4px;">Receba atualizações importantes do TarefasIA remotamente.</div>
    </div>

    <div style="margin-bottom: 20px;">
      <div class="modal-label" style="display:flex; justify-content:space-between; align-items:center;">
        <span>RESUMO DIÁRIO (8H)</span>
        <label class="switch">
          <input type="checkbox" id="dailySummaryToggle" onchange="toggleDailySummary(this.checked)">
          <span class="slider round"></span>
        </label>
      </div>
      <div class="modal-hint" style="margin-top: 4px;">Notificação local diária às 8:00 com suas tarefas do dia.</div>
    </div>

    <div style="margin-bottom: 24px;">
      <div class="modal-label" style="display:flex; justify-content:space-between; align-items:center;">
        <span>LEMBRETE DE TAREFAS (30 MIN)</span>
        <label class="switch">
          <input type="checkbox" id="taskReminderToggle" onchange="toggleTaskReminders(this.checked)">
          <span class="slider round"></span>
        </label>
      </div>
      <div class="modal-hint" style="margin-top: 4px;">Aviso 30 minutos antes do horário da tarefa.</div>
    </div>

    <div class="modal-actions">
      <button class="btn-modal primary" onclick="closeAppConfigModal()">Fechar</button>
    </div>
  </div>
</div>
<style>
.switch { position: relative; display: inline-block; width: 34px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--muted); transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: var(--text); transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--ai); }
input:checked + .slider:before { transform: translateX(14px); background-color: #000; }
</style>
<script>
// ── NOTIFICATIONS (Push & Local) ─────────────────────────────────────────
let pushEnabled = false;
let dailySummaryEnabled = false;
let taskReminderEnabled = false;

function showAppConfigModal() {
  document.getElementById('appConfigModal').style.display = 'flex';
  document.getElementById('pushToggle').checked = pushEnabled;
  document.getElementById('dailySummaryToggle').checked = dailySummaryEnabled;
  document.getElementById('taskReminderToggle').checked = taskReminderEnabled;
}

function closeAppConfigModal() {
  document.getElementById('appConfigModal').style.display = 'none';
}

setTimeout(() => {
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const btn = document.createElement('button');
    btn.className = 'btn-modal';
    btn.style.fontSize = '10px';
    btn.style.padding = '5px 12px';
    btn.style.marginLeft = '8px';
    btn.title = 'Configurações do App';
    btn.innerHTML = '⚙ App';
    btn.onclick = showAppConfigModal;
    const logoutBtn = [...topbar.children].find(el => el.textContent.includes('Sair'));
    if (logoutBtn) {
      topbar.insertBefore(btn, logoutBtn);
    } else {
      topbar.appendChild(btn);
    }
  }
}, 1000);

async function loadNotificationPrefs() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  const key = 'notif_prefs_' + currentUser.id;
  let saved = localStorage.getItem(key);
  if (saved) {
    try {
      const p = JSON.parse(saved);
      pushEnabled = !!p.push;
      dailySummaryEnabled = !!p.dailySummary;
      taskReminderEnabled = !!p.taskReminder;
    } catch(e) {}
  } else {
    try {
      if (typeof _supabase !== 'undefined') {
        const { data, error } = await _supabase.from('profiles').select('notification_preferences').eq('id', currentUser.id).single();
        if (!error && data && data.notification_preferences) {
          const p = data.notification_preferences;
          pushEnabled = !!p.push;
          dailySummaryEnabled = !!p.dailySummary;
          taskReminderEnabled = !!p.taskReminder;
        }
      }
    } catch(e) {}
  }
  
  if (pushEnabled) setupPushNotifications();
  if (dailySummaryEnabled) scheduleDailySummary();
  if (taskReminderEnabled) syncLocalReminders();
}

async function saveNotificationPrefs() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  const p = { push: pushEnabled, dailySummary: dailySummaryEnabled, taskReminder: taskReminderEnabled };
  localStorage.setItem('notif_prefs_' + currentUser.id, JSON.stringify(p));
  try {
    if (typeof _supabase !== 'undefined') {
      await _supabase.from('profiles').update({ notification_preferences: p }).eq('id', currentUser.id);
    }
  } catch(e) { console.error(e); }
}

async function togglePushNotifications(enabled) {
  pushEnabled = enabled;
  saveNotificationPrefs();
  if (enabled) {
    setupPushNotifications();
  }
}

async function toggleDailySummary(enabled) {
  dailySummaryEnabled = enabled;
  saveNotificationPrefs();
  if (enabled) {
    scheduleDailySummary();
  } else if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins.LocalNotifications) {
    await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 999 }] });
  }
}

async function toggleTaskReminders(enabled) {
  taskReminderEnabled = enabled;
  saveNotificationPrefs();
  syncLocalReminders();
}

async function setupPushNotifications() {
  if (!window.Capacitor || !window.Capacitor.isNative) return;
  const PushNotifications = window.Capacitor.Plugins.PushNotifications;
  if (!PushNotifications) return;

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') {
    console.warn('Push Notifications denied.');
    document.getElementById('pushToggle').checked = false;
    pushEnabled = false;
    saveNotificationPrefs();
    return;
  }
  await PushNotifications.register();
  
  try {
    await PushNotifications.removeAllListeners();
  } catch(e) {}
  
  PushNotifications.addListener('registration', (token) => {
    console.log('Push Token:', token.value);
    if (typeof currentUser !== 'undefined' && currentUser && typeof _supabase !== 'undefined') {
      _supabase.from('profiles').update({ push_token: token.value }).eq('id', currentUser.id);
    }
  });
  PushNotifications.addListener('registrationError', (err) => console.error('Push error:', err));
  PushNotifications.addListener('pushNotificationReceived', (n) => console.log('Push received:', n));
}

async function scheduleDailySummary() {
  if (!window.Capacitor || !window.Capacitor.isNative) return;
  const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
  if (!LocalNotifications) return;
  
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'prompt') {
    perm = await LocalNotifications.requestPermissions();
  }
  if (perm.display !== 'granted') {
    dailySummaryEnabled = false;
    document.getElementById('dailySummaryToggle').checked = false;
    saveNotificationPrefs();
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Resumo Diário 📋',
        body: 'Bom dia! Confira suas tarefas para hoje no TarefasIA.',
        id: 999,
        schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true }
      }
    ]
  });
}

async function syncLocalReminders() {
  if (!window.Capacitor || !window.Capacitor.isNative) return;
  const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
  if (!LocalNotifications) return;
  
  try {
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter(n => n.id !== 999);
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch(e) {}

  if (!taskReminderEnabled || typeof tasks === 'undefined' || !tasks) return;
  
  const notifs = [];
  for (const day of Object.keys(tasks)) {
    const taskList = tasks[day];
    if (!taskList) continue;
    
    for (const t of taskList) {
      if (!t.time || t.done) continue;
      
      const [yyyy, mm, dd] = day.split('-');
      const [hour, min] = t.time.split(':');
      const taskDate = new Date(yyyy, mm - 1, dd, hour, min, 0);
      
      const reminderDate = new Date(taskDate.getTime() - 30 * 60000);
      
      if (reminderDate.getTime() > Date.now()) {
        const strId = String(t.id);
        const numId = Math.abs(strId.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 100000;
        notifs.push({
          title: 'Lembrete de Tarefa ⏰',
          body: \`Sua tarefa "\${t.text}" começa em 30 minutos!\`,
          id: numId,
          schedule: { at: reminderDate, allowWhileIdle: true }
        });
      }
    }
  }

  if (notifs.length > 0) {
    await LocalNotifications.schedule({ notifications: notifs });
  }
}

// Hook logic
setTimeout(() => {
  if (typeof init === 'function') {
    const originalInit = init;
    init = async function() {
      await originalInit();
      await loadNotificationPrefs();
    }
  }
  
  if (typeof renderTasks === 'function') {
    const origRenderTasks = renderTasks;
    renderTasks = function() {
      origRenderTasks();
      if (taskReminderEnabled) {
        syncLocalReminders();
      }
    }
  }
}, 500);
</script>
`;
let content = fs.readFileSync('public/index.html', 'utf8');
if (!content.includes('appConfigModal')) {
  content = content.replace('</body>', code + '\n</body>');
  fs.writeFileSync('public/index.html', content);
  console.log('INJECTED');
} else {
  console.log('ALREADY INJECTED');
}
