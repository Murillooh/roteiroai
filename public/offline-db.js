const DB_NAME = 'TarefasIA_DB';
const DB_VERSION = 1;

let db;

// Initialize IndexedDB
function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Store for caching tasks from Supabase
      if (!database.objectStoreNames.contains('tasks')) {
        database.createObjectStore('tasks', { keyPath: 'id' });
      }

      // Store for offline pending actions (create, update, delete)
      if (!database.objectStoreNames.contains('pending_actions')) {
        const pendingStore = database.createObjectStore('pending_actions', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('task_id', 'task_id', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB', event);
      reject(event);
    };
  });
}

// Ensure DB is initialized before executing queries
async function getDB() {
  if (db) return db;
  return await initOfflineDB();
}

// ── TASKS CACHE (READ) ──
async function saveTasksLocally(tasksArray) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');
    
    // Clear old cache first? 
    // It's safer to just overwrite existing IDs and maybe clear first if we want full fresh state.
    // For simplicity, let's clear and then insert to ensure no orphaned deleted tasks stay.
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      tasksArray.forEach(task => {
        store.put(task);
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e);
  });
}

async function loadTasksLocally() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['tasks'], 'readonly');
    const store = transaction.objectStore('tasks');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

// ── PENDING ACTIONS (WRITE OFFLINE) ──
async function savePendingAction(actionData) {
  // actionData format: { task_id, action: 'create'|'update'|'delete', payload: {...task data} }
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending_actions', 'tasks'], 'readwrite');
    const pendingStore = transaction.objectStore('pending_actions');
    const tasksStore = transaction.objectStore('tasks');

    // 1. Add to pending queue
    pendingStore.put(actionData);

    // 2. Optimistic update in local cache
    if (actionData.action === 'create' || actionData.action === 'update') {
      tasksStore.put(actionData.payload);
    } else if (actionData.action === 'delete') {
      tasksStore.delete(actionData.task_id);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e);
  });
}

async function getPendingActions() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending_actions'], 'readonly');
    const store = transaction.objectStore('pending_actions');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

async function clearPendingAction(id) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e);
  });
}

// ── SYNC LOGIC ──
async function syncWithSupabase() {
  if (!navigator.onLine) return;

  const pendingActions = await getPendingActions();
  if (pendingActions.length === 0) return;

  console.log('🔄 Iniciando sincronização de', pendingActions.length, 'tarefas offline...');

  for (const item of pendingActions) {
    try {
      if (item.action === 'create') {
        // If it's a temporary ID, we should remove the ID from payload so supabase generates one
        const payload = { ...item.payload };
        // We know it's temporary if it starts with 'temp_' or similar, 
        // but if UUID, Supabase accepts it as valid UUID. 
        // If we generated a number/string, it will fail UUID casting on Supabase.
        // Best approach: do not send the temporary ID.
        if (payload.id && String(payload.id).startsWith('temp_')) {
          delete payload.id;
        }
        
        // Remove the sync_pending flag before sending
        delete payload.sync_pending;

        const { error } = await window._supabase.from('tasks').insert(payload);
        if (!error) await clearPendingAction(item.id);

      } else if (item.action === 'update') {
        const payload = { ...item.payload };
        delete payload.sync_pending;
        delete payload.id; // Usually we don't update ID

        const { error } = await window._supabase.from('tasks').update(payload).eq('id', item.task_id);
        if (!error) await clearPendingAction(item.id);

      } else if (item.action === 'delete') {
        const { error } = await window._supabase.from('tasks').delete().eq('id', item.task_id);
        if (!error) await clearPendingAction(item.id);
      }
    } catch (err) {
      console.error('Erro ao sincronizar item:', item, err);
      // Fails silently for this item, will retry next time
    }
  }

  // Reload tasks from Supabase to ensure everything is consistent
  if (window.currentUser) {
    if (typeof window.loadTasksFromSupabase === 'function') {
      await window.loadTasksFromSupabase(window.currentUser.id);
      if (typeof window.renderTasks === 'function') window.renderTasks();
    }
  }
}

// Auto init
initOfflineDB();

window.offlineDB = {
  saveTasksLocally,
  loadTasksLocally,
  savePendingAction,
  syncWithSupabase
};
