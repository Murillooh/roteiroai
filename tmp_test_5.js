
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
          body: `Sua tarefa "${t.text}" começa em 30 minutos!`,
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

// Hook logic removed and integrated into preloader/init flow
if (typeof renderTasks === 'function') {
  const origRenderTasks = renderTasks;
  renderTasks = function() {
    origRenderTasks();
    if (typeof taskReminderEnabled !== 'undefined' && taskReminderEnabled && typeof syncLocalReminders === 'function') {
      syncLocalReminders();
    }
  }
}
