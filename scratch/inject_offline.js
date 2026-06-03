const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Inject script tag if not exists
if (!content.includes('<script src="offline-db.js"></script>')) {
  // Find supabase script to insert after
  const supIdx = content.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>');
  if (supIdx > -1) {
    const endScript = content.indexOf('</script>', supIdx) + 9;
    content = content.substring(0, endScript) + '\n<!-- Banco de dados offline -->\n<script src="offline-db.js"></script>' + content.substring(endScript);
  } else {
    // fallback to just inside <head>
    content = content.replace('</head>', '<script src="offline-db.js"></script>\n</head>');
  }
}

// 2. Add Offline Banners HTML & CSS
const bannerHtml = `
<!-- OFFLINE BANNERS -->
<div id="offlineBanner" style="display:none; position:fixed; top:0; left:0; width:100%; background:var(--orange); color:#000; text-align:center; padding:8px; font-weight:600; font-size:12px; z-index:9999; box-shadow:0 2px 10px rgba(0,0,0,0.5);">
  ⚠️ Você está offline — trabalhando localmente
</div>
<div id="syncedBanner" style="display:none; position:fixed; top:0; left:0; width:100%; background:var(--ai); color:#000; text-align:center; padding:8px; font-weight:600; font-size:12px; z-index:9999; box-shadow:0 2px 10px rgba(0,0,0,0.5);">
  ✅ Sincronizado!
</div>
`;
if (!content.includes('<!-- OFFLINE BANNERS -->')) {
  content = content.replace('<div class="app">', bannerHtml + '\n<div class="app">');
}

// 3. Add offline events logic
const offlineEventsJs = `
// ── OFFLINE STATUS LOGIC ──
window.addEventListener('offline', () => {
  document.getElementById('offlineBanner').style.display = 'block';
  document.getElementById('syncedBanner').style.display = 'none';
});

window.addEventListener('online', async () => {
  document.getElementById('offlineBanner').style.display = 'none';
  if (window.offlineDB && typeof window.offlineDB.syncWithSupabase === 'function') {
    await window.offlineDB.syncWithSupabase();
    document.getElementById('syncedBanner').style.display = 'block';
    setTimeout(() => {
      document.getElementById('syncedBanner').style.display = 'none';
    }, 3000);
  }
});
`;
if (!content.includes('// ── OFFLINE STATUS LOGIC ──')) {
  content = content.replace('</script>\n</body>', offlineEventsJs + '\n</script>\n</body>');
}

// 4. Hook loadTasksFromSupabase
if (!content.includes('// CARREGAR DO CACHE OFFLINE')) {
  // Replace the original loadTasksFromSupabase body
  const origFunc = `async function loadTasksFromSupabase(userId) {
  const { data, error } = await _supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao carregar tarefas:', error);
    return;
  }

  tasks = {};
  if (data) {
    data.forEach(t => {
      if (!tasks[t.day_id]) tasks[t.day_id] = [];
      tasks[t.day_id].push({
        id: t.id,
        text: t.text,
        time: t.time || '',
        done: t.done,
        details: t.details || ''
      });
    });
  }
}`;
  
  const newFunc = `async function loadTasksFromSupabase(userId) {
  let data = null;
  
  if (navigator.onLine) {
    const { data: onlineData, error } = await _supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar tarefas:', error);
    } else {
      data = onlineData;
      // Cache local
      if (window.offlineDB) await window.offlineDB.saveTasksLocally(data);
    }
  }

  // CARREGAR DO CACHE OFFLINE (se falhou ou offline)
  if (!data) {
    if (window.offlineDB) {
      data = await window.offlineDB.loadTasksLocally();
      console.log('Carregadas tarefas do IndexedDB (offline)');
    }
  }

  tasks = {};
  if (data) {
    data.forEach(t => {
      if (!tasks[t.day_id]) tasks[t.day_id] = [];
      // Prevent duplicates in view if somehow needed
      if (!tasks[t.day_id].find(x => x.id === t.id)) {
        tasks[t.day_id].push({
          id: t.id,
          text: t.text,
          time: t.time || '',
          done: t.done,
          details: t.details || '',
          sync_pending: t.sync_pending || false
        });
      }
    });
  }
}`;
  content = content.replace(origFunc, newFunc);
}

// 5. Hook addTask
if (!content.includes('// LÓGICA OFFLINE ADD')) {
  const origAdd = `  const { data, error } = await _supabase
    .from('tasks')
    .insert({
      user_id: currentUser.id,
      day_id: activeDay,
      text,
      time: timeI.value || '',
      done: false,
      details: ''
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar tarefa:', error);
    alert('Erro ao adicionar tarefa: ' + error.message);
    return;
  }`;
  
  const newAdd = `  // LÓGICA OFFLINE ADD
  let data = null;
  const payload = {
    user_id: currentUser.id,
    day_id: activeDay,
    text,
    time: timeI.value || '',
    done: false,
    details: ''
  };

  if (navigator.onLine) {
    const { data: onlineData, error } = await _supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('Erro ao adicionar tarefa:', error);
      alert('Erro ao adicionar tarefa: ' + error.message);
      return;
    }
    data = onlineData;
    // Cache
    if (window.offlineDB) window.offlineDB.saveTasksLocally([data]);
  } else {
    // Offline Create
    data = { ...payload, id: 'temp_' + Date.now(), sync_pending: true };
    if (window.offlineDB) await window.offlineDB.savePendingAction({ task_id: data.id, action: 'create', payload: data });
  }`;
  content = content.replace(origAdd, newAdd);
}

// 6. Hook toggleTask
if (!content.includes('// LÓGICA OFFLINE TOGGLE')) {
  const origToggle = `  const { error } = await _supabase
    .from('tasks')
    .update({ done: newStatus })
    .eq('id', taskId);

  if (error) {
    console.error('Erro ao atualizar tarefa:', error);
    t.done = !newStatus; // revert
    renderTasks();
    return;
  }`;

  const newToggle = `  // LÓGICA OFFLINE TOGGLE
  if (navigator.onLine && !String(taskId).startsWith('temp_')) {
    const { error } = await _supabase
      .from('tasks')
      .update({ done: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      t.done = !newStatus; // revert
      renderTasks();
      return;
    }
    // Update local DB cache (naïve approach: full resync later or just let local DB fetch handle next reload)
  } else {
    t.sync_pending = true;
    if (window.offlineDB) await window.offlineDB.savePendingAction({ task_id: taskId, action: 'update', payload: { done: newStatus } });
  }`;
  content = content.replace(origToggle, newToggle);
}

// 7. Hook deleteTask
if (!content.includes('// LÓGICA OFFLINE DELETE')) {
  const origDel = `  const { error } = await _supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Erro ao deletar tarefa:', error);
    alert('Erro ao excluir tarefa: ' + error.message);
    return;
  }`;

  const newDel = `  // LÓGICA OFFLINE DELETE
  if (navigator.onLine && !String(taskId).startsWith('temp_')) {
    const { error } = await _supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao deletar tarefa:', error);
      alert('Erro ao excluir tarefa: ' + error.message);
      return;
    }
  } else {
    if (window.offlineDB) await window.offlineDB.savePendingAction({ task_id: taskId, action: 'delete', payload: null });
  }`;
  content = content.replace(origDel, newDel);
}

// Also hook saveTaskDetails (for editing notes)
if (!content.includes('// LÓGICA OFFLINE DETAILS')) {
  const origDetails = `  const { error } = await _supabase
    .from('tasks')
    .update({ details: newNotes })
    .eq('id', currentDetailTaskId);

  if (error) {
    alert('Erro ao salvar detalhes: ' + error.message);
    return;
  }`;

  const newDetails = `  // LÓGICA OFFLINE DETAILS
  if (navigator.onLine && !String(currentDetailTaskId).startsWith('temp_')) {
    const { error } = await _supabase
      .from('tasks')
      .update({ details: newNotes })
      .eq('id', currentDetailTaskId);

    if (error) {
      alert('Erro ao salvar detalhes: ' + error.message);
      return;
    }
  } else {
    if (window.offlineDB) await window.offlineDB.savePendingAction({ task_id: currentDetailTaskId, action: 'update', payload: { details: newNotes } });
    const dayTasks = tasks[activeDay];
    if (dayTasks) {
      const t = dayTasks.find(x => x.id === currentDetailTaskId);
      if (t) t.sync_pending = true;
    }
  }`;
  content = content.replace(origDetails, newDetails);
}

fs.writeFileSync('public/index.html', content);
console.log('INJECTED OFFLINE LOGIC');
