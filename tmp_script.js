
// Apply saved configurations and theme on page load
(function() {
  const savedColor = localStorage.getItem('roteiroai_theme_color');
  const savedGlow = localStorage.getItem('roteiroai_theme_glow');
  if (savedColor) {
    document.documentElement.style.setProperty('--ai', savedColor);
  }
  if (savedGlow) {
    document.documentElement.style.setProperty('--ai-glow', savedGlow);
  }
  
  // Light Theme
  const isLightTheme = localStorage.getItem('roteiroai_light_theme') === 'true';
  if (isLightTheme) {
    document.body.classList.add('light-theme');
  }

  // Text Size
  const size = localStorage.getItem('roteiroai_text_size') || 'medium';
  const sizeMap = { 'small': '12.5px', 'medium': '14px', 'large': '16px' };
  document.documentElement.style.setProperty('--base-font-size', sizeMap[size]);

  // Accessibility (Animations)
  const noAnims = localStorage.getItem('roteiroai_no_animations') === 'true';
  if (noAnims) {
    document.body.classList.add('no-animations');
  }

  // Detect and tag native Capacitor app
  const isCapacitor = !!(window.Capacitor && window.Capacitor.isNative);
  if (isCapacitor) {
    document.body.classList.add('is-capacitor');
  }
})();

// ── Supabase Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://aozyeuhfqqnsrfkbrsre.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pad-SAGpdApE85PEIU0ucw_BIfTK_7X';

let _supabase;
try {
  if (typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase SDK not loaded. Using fallback mock.');
    _supabase = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => {}
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
        insert: () => Promise.resolve({ data: null }),
        update: () => Promise.resolve({ data: null }),
        delete: () => Promise.resolve({ data: null }),
        upsert: () => Promise.resolve({ data: null })
      })
    };
  }
} catch (e) {
  console.error('Error initializing Supabase:', e);
}

// ── Config ───────────────────────────────────────────────────────────────────
const PRODUCTION_API_URL = 'https://roteiroai-beta.vercel.app'; // Sua URL de produção na Vercel
const LOCAL_API_URL = 'http://192.168.1.106:3000'; // IP local do seu computador para testes no Wi-Fi
const isCapacitorApp = !!(window.Capacitor && window.Capacitor.isNative);
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
  window.location.href.includes('localhost') ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'ionic:';
const BASE_URL = isCapacitorApp
  ? (isLocalHost ? LOCAL_API_URL : PRODUCTION_API_URL)
  : '';
const API_ENDPOINT = `${BASE_URL}/api/chat`;

// Função auxiliar para chamar a API do Gemini diretamente do cliente caso exista chave local
async function callGeminiDirect(systemPrompt, userMessageOrContents, apiKey) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt || '' }]
    },
    contents: Array.isArray(userMessageOrContents)
      ? userMessageOrContents.map(m => ({
          ...m,
          role: m.role === 'model' ? 'assistant' : m.role
        }))
      : [
          { role: 'user', parts: [{ text: userMessageOrContents }] }
        ],
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    }
  };

  const response = await fetch(geminiUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const apiMessage = data?.error?.message || data?.error?.code || 'Erro desconhecido na API do Gemini.';
    let userMessage = apiMessage;

    if (response.status === 401 || response.status === 403) {
      userMessage = '🔑 Chave do Google inválida ou expirada. Verifique sua chave no painel de API.';
    } else if (response.status === 429) {
      userMessage = '⏳ Limite de requisições do Gemini atingido. Aguarde e tente novamente.';
    } else if (response.status >= 500) {
      userMessage = '💡 Erro no servidor do Gemini. Tente novamente mais tarde.';
    }

    throw new Error(userMessage);
  }
  return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.' };
}

async function callGeminiProxy(body) {
  const sessionRes = await _supabase.auth.getSession();
  const token = sessionRes.data.session ? sessionRes.data.session.access_token : '';
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-api-key': '',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error || data?.detail || 'Erro desconhecido da API.';
    const error = new Error(errMsg);
    error.status = res.status;
    error.body = data;
    throw error;
  }

  return data;
}

async function callGeminiWithProxyFallback(systemPrompt, messageOrContents, localKey, useContents = false) {
  const body = {
    systemPrompt,
    ...(useContents ? { contents: messageOrContents } : { userMessage: messageOrContents }),
  };

  if (localKey) {
    try {
      return await callGeminiDirect(systemPrompt, messageOrContents, localKey);
    } catch (directError) {
      console.warn('Chamada direta do Gemini falhou, tentando proxy:', directError.message);
      return await callGeminiProxy(body);
    }
  } else {
    try {
      return await callGeminiProxy(body);
    } catch (proxyError) {
      throw proxyError;
    }
  }
}

// ── Date Utilities ───────────────────────────────────────────────────────────
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateBR(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}/${m}`;
}

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeekdayLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return names[d.getDay()];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ── Data ─────────────────────────────────────────────────────────────────────
const DAYS = [
  { id:'seg', name:'Segunda-feira', dest:'', tipo:'VISITA',           color:'#b197fc', special:false, shortName:'Seg' },
  { id:'ter', name:'Terça-feira',   dest:'', tipo:'VISITA',           color:'#69db7c', special:false, shortName:'Ter' },
  { id:'qua', name:'Quarta-feira',  dest:'', tipo:'DEMANDAS DIÁRIAS', color:'#ffd43b', special:true,  shortName:'Qua' },
  { id:'qui', name:'Quinta-feira',  dest:'', tipo:'VISITA',           color:'#ffa94d', special:false, shortName:'Qui' },
  { id:'sex', name:'Sexta-feira',   dest:'', tipo:'VISITA',           color:'#74c0fc', special:false, shortName:'Sex' },
  { id:'sáb', name:'Sábado',        dest:'', tipo:'OUTROS',           color:'#ff8787', special:false, shortName:'Sáb' },
  { id:'dom', name:'Domingo',       dest:'', tipo:'OUTROS',           color:'#ff8787', special:false, shortName:'Dom' }
];

let tasks = {}; // tasks map indexed by dateStr YYYY-MM-DD
let customDestinations = {}; // custom destinations map indexed by dateStr or short dayId
let activeDay = formatDateISO(new Date());
let currentWeekStart = getMonday(new Date());
let currentCalendarMonth = new Date(currentWeekStart);

let isAIReady = false;
let currentUser = null;
let _initialized = false;
let chatHistory = [];

// Initialize dynamic days of week dates
updateDaysOfWeek();

// ── Deep Link Handler (Capacitor) ───────────────────────────────────────────
function setupDeepLinks() {
  if (isCapacitorApp && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    const App = window.Capacitor.Plugins.App;
    
    App.addListener('appUrlOpen', async (data) => {
      console.log('Link de redirecionamento detectado:', data.url);
      
      // Fecha o navegador nativo se ele estiver aberto
      if (window.Capacitor.Plugins.Browser) {
        try {
          await window.Capacitor.Plugins.Browser.close();
        } catch (e) {
          console.warn('Não foi possível fechar o navegador nativo:', e);
        }
      }
      
      if (data.url && data.url.includes('access_token')) {
        try {
          // Obtém os tokens do hash da URL
          // com.roteiroai.app://login-callback#access_token=...&refresh_token=...
          const hashIndex = data.url.indexOf('#');
          if (hashIndex === -1) return;
          
          const hash = data.url.substring(hashIndex + 1);
          const params = new URLSearchParams(hash);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            const preloader = document.getElementById('preloader');
            const statusEl = document.getElementById('preloaderStatus');
            const ringFill = document.getElementById('preloaderRingFill');
            const barFill = document.getElementById('preloaderBarFill');
            const pctEl = document.getElementById('preloaderPct');
            
            if (preloader) {
              preloader.classList.remove('fade-out');
              if (ringFill) ringFill.style.strokeDashoffset = 0;
              if (barFill) barFill.style.width = '100%';
              if (pctEl) pctEl.textContent = '100%';
              if (statusEl) statusEl.textContent = 'Autenticando sessão...';
            }
            
            const { error } = await _supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('Erro ao definir sessão via deep link:', error);
              alert('Erro de autenticação: ' + error.message);
              if (preloader) preloader.classList.add('fade-out');
            } else {
              console.log('Sessão configurada com sucesso via deep link!');
              
              // Recarrega os dados e sessão
              const user = await checkSession();
              if (user) {
                _initialized = true;
                await Promise.all([
                  loadDestinationsFromSupabase(user.id),
                  loadTasksFromSupabase(user.id)
                ]);
                updateDaysOfWeek();
                renderCalendar();
                setActiveDay('dashboard');
                if (preloader) preloader.classList.add('fade-out');
              }
            }
          }
        } catch (err) {
          console.error('Erro ao analisar os tokens do deep link:', err);
        }
      }
    });
  }
}

setupDeepLinks();

function updateDaysOfWeek() {
  const shortNames = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    const dateStr = formatDateISO(d);
    DAYS[i].id = dateStr;
    DAYS[i].dateLabel = formatDateBR(d);
    
    // Sincroniza localidade customizada (data específica ou genérica histórica)
    const custom = customDestinations[dateStr] || customDestinations[shortNames[i]];
    DAYS[i].dest = custom || '';
  }
}

// ── Auth Logic (Supabase) ─────────────────────────────────────────────────────
async function checkSession() {
  try {
    if (!_supabase || !_supabase.auth) return null;
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) throw error;
    if (session) {
      currentUser = session.user;
      document.body.classList.remove('logged-out');
      return session.user;
    }
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
  }
  currentUser = null;
  document.body.classList.add('logged-out');
  return null;
}

async function loginWithGoogle() {
  const btn = document.getElementById('googleOAuthBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.65';
    btn.textContent = 'Redirecionando para o Google...';
  }
  
  const redirectTo = isCapacitorApp 
    ? 'com.roteiroai.app://login-callback' 
    : window.location.origin + window.location.pathname;

  try {
    if (isCapacitorApp) {
      // Fluxo Capacitor Mobile (Google OAuth com skipBrowserRedirect para abrir em navegador nativo)
      const { data, error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' }
        }
      });

      if (error) throw error;

      if (data && data.url) {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
          await window.Capacitor.Plugins.Browser.open({ url: data.url });
        } else {
          window.open(data.url, '_system');
        }
      }
    } else {
      // Fluxo Web normal
      const { error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error('Erro no login Google:', error);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Entrar com Google';
    }
    alert('Erro ao iniciar login: ' + error.message);
  }
}

function showLogoutConfirmModal() {
  document.getElementById('logoutConfirmModal').style.display = 'flex';
}

function closeLogoutConfirmModal() {
  document.getElementById('logoutConfirmModal').style.display = 'none';
}

function confirmLogout() {
  closeLogoutConfirmModal();
  logout();
}

async function logout() {
  await _supabase.auth.signOut();
  _initialized = false;
  currentUser = null;
  tasks = {};
  document.getElementById('aiMessages').innerHTML = '';
  document.body.classList.add('logged-out');
  setTimeout(initGoogleOneTap, 1000);
}

// ── Google One Tap Integration ───────────────────────────────────────────────
function initGoogleOneTap() {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: '164170592494-gpgvajupb8om0f52kqc513tn5l22jk4m.apps.googleusercontent.com',
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.prompt((notification) => {
      console.log('Google One Tap notification:', notification);
    });
  }
}

async function handleCredentialResponse(response) {
  const jwt = response.credential;
  const preloader = document.getElementById('preloader');
  const ringFill  = document.getElementById('preloaderRingFill');
  const barFill   = document.getElementById('preloaderBarFill');
  const pctEl     = document.getElementById('preloaderPct');
  const statusEl  = document.getElementById('preloaderStatus');

  if (preloader) {
    preloader.classList.remove('fade-out');
    ringFill.style.strokeDashoffset = 0;
    barFill.style.width = '100%';
    pctEl.textContent = '100%';
    statusEl.textContent = 'Autenticando com o Google...';
  }

  const { data, error } = await _supabase.auth.signInWithIdToken({
    provider: 'google',
    token: jwt
  });

  if (error) {
    console.error('Erro ao fazer login com ID Token no Supabase:', error);
    alert('Erro no login do Google: ' + error.message);
    if (preloader) {
      preloader.classList.add('fade-out');
    }
  }
}

// ── Supabase: Carregar localidades customizadas do banco de dados ──────────────
async function loadDestinationsFromSupabase(userId) {
  const { data, error } = await _supabase
    .from('custom_destinations')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao carregar localidades:', error);
    return;
  }

  customDestinations = {};
  if (data) {
    data.forEach(item => {
      customDestinations[item.day_id] = item.dest;
    });
  }
  updateDaysOfWeek();
}

// ── Lógica de Edição de Localidade ───────────────────────────────────────────
async function editCurrentLocation() {
  const d = DAYS.find(x => x.id === activeDay);
  if (!d) return;

  const newDest = prompt(`Digite a nova localidade/destino para ${d.name} (deixe em branco para remover):`, d.dest);
  if (newDest === null) return;
  const trimmed = newDest.trim();

  const statusEl = document.getElementById('statusText');

  if (!trimmed) {
    // Se o usuário limpou o texto, remove a localidade do banco de dados (Supabase)
    if (statusEl) statusEl.textContent = 'Removendo localidade...';
    
    const { error } = await _supabase
      .from('custom_destinations')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('day_id', activeDay);

    if (error) {
      console.error('Erro ao remover localidade no Supabase:', error);
      alert('Erro ao remover do banco de dados: ' + error.message);
      if (statusEl) statusEl.textContent = 'IA conectada';
      return;
    }
    
    customDestinations[activeDay] = '';
    d.dest = '';
  } else {
    // Caso contrário, salva/atualiza a localidade
    if (statusEl) statusEl.textContent = 'Salvando localidade...';

    const { error } = await _supabase
      .from('custom_destinations')
      .upsert({
        user_id: currentUser.id,
        day_id: activeDay,
        dest: trimmed
      }, { onConflict: 'user_id,day_id' });

    if (error) {
      console.error('Erro ao salvar localidade no Supabase:', error);
      alert('Erro ao salvar no banco de dados: ' + error.message);
      if (statusEl) statusEl.textContent = 'IA conectada';
      return;
    }

    customDestinations[activeDay] = trimmed;
    d.dest = trimmed;
  }

  setActiveDay(activeDay);

  if (statusEl) statusEl.textContent = 'IA conectada';
}

// ── Supabase: Carregar tarefas do banco de dados ──────────────────────────────
async function loadTasksFromSupabase(userId) {
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
        done: t.done || false,
        details: t.details || ''
      });
    });
  }
}

// ── Sincronização Periódica em Segundo Plano (Auto-Refresh) ───────────────────
async function refreshTasksPeriodically() {
  if (!currentUser) return;
  try {
    // Carrega destinos e tarefas em segundo plano do Supabase
    await Promise.all([
      loadDestinationsFromSupabase(currentUser.id),
      loadTasksFromSupabase(currentUser.id)
    ]);
    
    // Atualiza a interface com os novos dados
    updateDaysOfWeek();
    renderCalendar();
    renderSidebar();
    
    if (activeDay === 'dashboard') {
      renderDashboard();
    } else {
      renderTasks();
    }
    console.log('🔄 Sincronização periódica concluída com o Supabase.');
  } catch (e) {
    console.error('Erro na sincronização periódica:', e);
  }
}

// Inicia o loop de sincronização automática a cada 1 minuto (60000ms)
setInterval(refreshTasksPeriodically, 60000);

// ── Auth State Change (trata retorno do OAuth do Google) ──────────────────────
_supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session && !_initialized) {
    _initialized = true;
    currentUser = session.user;
    document.body.classList.remove('logged-out');

    const preloader = document.getElementById('preloader');
    const ringFill  = document.getElementById('preloaderRingFill');
    const barFill   = document.getElementById('preloaderBarFill');
    const pctEl     = document.getElementById('preloaderPct');
    const statusEl  = document.getElementById('preloaderStatus');

    preloader.classList.remove('fade-out');
    const CIRC = 2 * Math.PI * 44;
    ringFill.style.strokeDasharray  = CIRC;
    ringFill.style.strokeDashoffset = 0;
    barFill.style.width = '100%';
    pctEl.textContent = '100%';
    statusEl.textContent = 'Sincronizando suas tarefas...';

    try {
      await Promise.race([
        Promise.all([
          loadDestinationsFromSupabase(session.user.id),
          loadTasksFromSupabase(session.user.id)
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database Timeout')), 3000))
      ]);
    } catch (err) {
      console.error('Erro ou timeout ao sincronizar dados:', err);
    }

    statusEl.textContent = 'Tudo pronto!';
    setTimeout(() => {
      preloader.classList.add('fade-out');
      init();
    }, 800);

  } else if (event === 'SIGNED_OUT') {
    _initialized = false;
    currentUser = null;
    tasks = {};
    document.body.classList.add('logged-out');
  }
});

// ── Modal (API Key) ───────────────────────────────────────────────────────────
function showModal() {
  document.getElementById('apiModal').style.display = 'flex';
  const existing = (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw') || '';
  document.getElementById('apiKeyInput').value = existing ? '•'.repeat(20) : '';
  document.getElementById('apiKeyInput').placeholder = existing ? 'Chave salva (clique para alterar)' : 'AIzaSy...';
  document.getElementById('modalSkipBtn').style.display = existing ? 'block' : 'none';
}

function closeModal() {
  document.getElementById('apiModal').style.display = 'none';
}

function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val || val.startsWith('•')) { closeModal(); return; }
  localStorage.setItem('google_api_key', val);
  closeModal();
  setStatus(true);
  addAIMessage('assistant', '✅ Chave do Google configurada! Agora posso te ajudar com seu roteiro usando o Gemini. Tente um dos botões rápidos ou me faça uma pergunta.');
}

// ── Status ────────────────────────────────────────────────────────────────────
function setStatus(connected) {
  isAIReady = connected;
  const st = document.getElementById('topbarStatus');
  const tx = document.getElementById('statusText');
  if (connected) {
    st.className = 'topbar-status';
    tx.textContent = 'IA conectada';
  } else {
    st.className = 'topbar-status error';
    tx.textContent = 'API Key ausente';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Inicializa o seletor na Visão Geral (Dashboard)
  setActiveDay('dashboard');

  // Verifica se o servidor já tem a chave configurada no .env
  let serverHasKey = false;
  try {
    let headers = {};
    if (typeof _supabase !== 'undefined') {
      const sessionRes = await _supabase.auth.getSession();
      const token = sessionRes.data.session ? sessionRes.data.session.access_token : '';
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const res = await fetch(`${BASE_URL}/api/status`, { headers });
    const data = await res.json();
    serverHasKey = data.serverHasKey === true;
  } catch (e) {
    console.warn('Não foi possível verificar status do servidor:', e.message);
  }

  const localKey = (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw');
  const isReady  = serverHasKey || !!localKey;
  setStatus(isReady);

  if (serverHasKey) {
    const configBtn = document.getElementById('configBtn');
    if (configBtn) configBtn.style.display = 'none';
  }

  // Carrega o histórico de mensagens salvas
  loadChatHistory();

  if (!isReady) {
    setTimeout(showModal, 800);
  }
}

function showWelcomeMessage() {
  const localKey = (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw');
  const isReady = isAIReady || !!localKey;
  
  if (!isReady) {
    addAIMessage('assistant',
      'Olá! 👋 Para usar o assistente IA, clique em <strong>⚙ API</strong> no topo e insira sua chave do Google (Gemini).\n\nA chave é gratuita — obtenha em aistudio.google.com/apikey\n\nEnquanto isso, você já pode registrar suas tarefas normalmente.',
      false, false, null, true
    );
  } else {
    addAIMessage('assistant',
      `Olá! 👋 Sou seu assistente de roteiro com Google Gemini.

Posso planejar reuniões, analisar suas produtividade semanal, e gerenciar seu calendário completo de visitas.

💡 **Agendamento por IA**: Experimente digitar no chat: *"Criar uma tarefa para o dia 25/06 às 8 horas da manhã e me lembrar"* que eu agendarei e posicionarei a tarefa diretamente no seu calendário!`,
      false, false, null, true
    );
  }
}

function loadChatHistory() {
  const msgs = document.getElementById('aiMessages');
  if (!msgs) return;
  msgs.innerHTML = '';
  chatHistory = [];

  if (!currentUser) return;
  const saved = localStorage.getItem(`chat_history_${currentUser.id}`);
  if (saved) {
    try {
      chatHistory = JSON.parse(saved);
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        chatHistory = chatHistory.map(m => {
          if (m && Array.isArray(m.parts)) {
            return {
              role: m.role === 'assistant' ? 'model' : m.role,
              parts: m.parts,
              isReport: m.isReport,
              fileConfig: m.fileConfig
            };
          }
          return {
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.text || '' }],
            isReport: m.isReport,
            fileConfig: m.fileConfig
          };
        });

        chatHistory.forEach(m => {
          const displayRole = m.role === 'model' ? 'assistant' : m.role;
          const text = m.parts.map(p => p.text || '').join('');
          addAIMessage(displayRole, text, false, m.isReport, m.fileConfig, true);
        });
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }

  if (chatHistory.length === 0) {
    showWelcomeMessage();
  }

  updateChatHistoryCounter();
}

function clearChatHistory() {
  if (!currentUser) return;
  if (!confirm('Deseja limpar todo o histórico de conversas do chat?')) return;
  
  localStorage.removeItem(`chat_history_${currentUser.id}`);
  chatHistory = [];
  
  const msgs = document.getElementById('aiMessages');
  if (msgs) msgs.innerHTML = '';
  
  showWelcomeMessage();
  updateChatHistoryCounter();
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('dayList');
  list.innerHTML = '';

  // 1. Inserir botão de Visão Geral (Dashboard)
  const dbItem = document.createElement('div');
  dbItem.className = 'day-item' + (activeDay === 'dashboard' ? ' active' : '');
  dbItem.style.setProperty('--accent-color', 'var(--ai)');
  dbItem.style.borderLeftColor = activeDay === 'dashboard' ? 'var(--ai)' : 'transparent';
  dbItem.innerHTML = `
    <div class="day-dot" style="background:var(--ai); box-shadow: 0 0 8px var(--ai)"></div>
    <div class="day-info">
      <div class="day-name">Visão Geral</div>
      <div class="day-dest">Painel consolidado</div>
    </div>
    <div class="day-badge" style="color:var(--ai); border:1px solid var(--ai)22; background:var(--ai)11">
      📊
    </div>
  `;
  dbItem.onclick = () => setActiveDay('dashboard');
  list.appendChild(dbItem);

  // 1.5. Inserir botão de Pesquisar (Search)
  const searchItem = document.createElement('div');
  searchItem.className = 'day-item' + (activeDay === 'search' ? ' active' : '');
  searchItem.style.setProperty('--accent-color', 'var(--blue)');
  searchItem.style.borderLeftColor = activeDay === 'search' ? 'var(--blue)' : 'transparent';
  searchItem.innerHTML = `
    <div class="day-dot" style="background:var(--blue); box-shadow: 0 0 8px var(--blue)"></div>
    <div class="day-info">
      <div class="day-name">Pesquisar</div>
      <div class="day-dest">Buscar no histórico</div>
    </div>
    <div class="day-badge" style="color:var(--blue); border:1px solid var(--blue)22; background:var(--blue)11">
      🔍
    </div>
  `;
  searchItem.onclick = () => setActiveDay('search');
  list.appendChild(searchItem);

  // 2. Inserir os dias da semana dinâmicos
  DAYS.forEach(d => {
    const dayTasks = tasks[d.id] || [];
    const done     = dayTasks.filter(t => t.done).length;
    const total    = dayTasks.length;
    const el = document.createElement('div');
    el.className = 'day-item' + (d.id === activeDay ? ' active' : '');
    el.style.setProperty('--accent-color', d.color);
    el.style.borderLeftColor = d.id === activeDay ? d.color : 'transparent';
    el.innerHTML = `
      <div class="day-dot" style="background:${d.color}"></div>
      <div class="day-info">
        <div class="day-name">${d.name} <span style="font-size:10px; color:var(--sub); font-weight:400">(${d.dateLabel})</span></div>
        <div class="day-dest">${d.dest ? d.dest + ' · ' : ''}${total > 0 ? done + '/' + total + ' tarefas' : 'Sem tarefas'}</div>
      </div>
      <div class="day-badge" style="color:${d.color};border:1px solid ${d.color}22;background:${d.color}11">
        ${d.special ? '⚡' : '📍'}
      </div>
    `;
    el.onclick = () => {
      activeDay = d.id;
      currentCalendarMonth = new Date(d.id + 'T00:00:00');
      renderCalendar();
      setActiveDay(d.id);
    };
    list.appendChild(el);
  });

  // 3. Inserir botão de Configurações (Settings) no final
  const configItem = document.createElement('div');
  configItem.className = 'day-item' + (activeDay === 'config' ? ' active' : '');
  configItem.style.setProperty('--accent-color', 'var(--purple)');
  configItem.style.borderLeftColor = activeDay === 'config' ? 'var(--purple)' : 'transparent';
  configItem.innerHTML = `
    <div class="day-dot" style="background:var(--purple); box-shadow: 0 0 8px var(--purple)"></div>
    <div class="day-info">
      <div class="day-name">Configurações</div>
      <div class="day-dest">Perfil e Preferências</div>
    </div>
    <div class="day-badge" style="color:var(--purple); border:1px solid var(--purple)22; background:var(--purple)11">
      ⚙️
    </div>
  `;
  configItem.onclick = () => setActiveDay('config');
  list.appendChild(configItem);
  
  updateStats();

  // Sincroniza labels das datas
  const startStr = formatDateBR(currentWeekStart);
  const endStr = formatDateBR(addDays(currentWeekStart, 6));
  document.getElementById('weekNavLabel').textContent = `${startStr} - ${endStr}`;
  
  const opts = { day:'2-digit', month:'long', year:'numeric' };
  const weekEnd = addDays(currentWeekStart, 6);
  document.getElementById('weekLabel').textContent =
    `Roteiro de ${currentWeekStart.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} a ${weekEnd.toLocaleDateString('pt-BR', opts)}`;
}

function updateStats() {
  let total = 0, done = 0;
  DAYS.forEach(d => {
    const t = tasks[d.id] || [];
    total += t.length;
    done  += t.filter(x => x.done).length;
  });
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent  = done;
  document.getElementById('statPct').textContent   = total ? Math.round(done/total*100)+'%' : '0%';
}

// ── Mobile View Switching ─────────────────────────────────────────────────────
function switchMobileView(view) {
  document.body.setAttribute('data-mobile-view', view);
  
  const buttons = document.querySelectorAll('.bottom-nav-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  if (view === 'agenda' || view === 'tasks') {
    document.getElementById('btnNavAgenda')?.classList.add('active');
  } else if (view === 'search') {
    document.getElementById('btnNavSearch')?.classList.add('active');
  } else if (view === 'dashboard') {
    document.getElementById('btnNavDashboard')?.classList.add('active');
  } else if (view === 'chat') {
    document.getElementById('btnNavChat')?.classList.add('active');
  } else if (view === 'config') {
    document.getElementById('btnNavConfig')?.classList.add('active');
  }
}

// ── Active Day ────────────────────────────────────────────────────────────────
function setActiveDay(id) {
  activeDay = id;
  renderSidebar();

  const dailyView = document.getElementById('dailyView');
  const dashboardView = document.getElementById('dashboardView');
  const searchView = document.getElementById('searchView');
  const configView = document.getElementById('configView');

  if (id === 'dashboard') {
    dailyView.style.display = 'none';
    dashboardView.style.display = 'flex';
    if (searchView) searchView.style.display = 'none';
    if (configView) configView.style.display = 'none';
    renderDashboard();
    if (window.innerWidth <= 992) {
      switchMobileView('dashboard');
    }
  } else if (id === 'search') {
    dailyView.style.display = 'none';
    dashboardView.style.display = 'none';
    if (configView) configView.style.display = 'none';
    if (searchView) {
      searchView.style.display = 'flex';
      renderRecentSearches();
    }
    if (window.innerWidth <= 992) {
      switchMobileView('search');
    }
  } else if (id === 'config') {
    dailyView.style.display = 'none';
    dashboardView.style.display = 'none';
    if (searchView) searchView.style.display = 'none';
    if (configView) {
      configView.style.display = 'flex';
      showConfigMain();
      renderConfigScreen();
    }
    if (window.innerWidth <= 992) {
      switchMobileView('config');
    }
  } else {
    dailyView.style.display = 'flex';
    dashboardView.style.display = 'none';
    if (searchView) searchView.style.display = 'none';
    if (configView) configView.style.display = 'none';
    if (window.innerWidth <= 992) {
      switchMobileView('tasks');
    }

    const d = DAYS.find(x => x.id === id);
    if (!d) return;

    document.getElementById('accentBar').style.background       = d.color;
    document.getElementById('dayTitle').textContent              = d.name;
    document.getElementById('daySubtitle').textContent           = d.dest ? '📍 ' + d.dest : '📍 Sem localidade definida';
    document.getElementById('progressFill').style.background     = d.color;
    document.getElementById('progressPct').style.color           = d.color;
    const pill = document.getElementById('tipoPill');
    pill.textContent       = d.tipo;
    pill.style.color       = d.color;
    pill.style.background  = d.color + '18';
    pill.style.border      = `1px solid ${d.color}44`;
    renderTasks();
  }
}

// ── Configurations View Logic ──────────────────────────────────────────────────
const THEME_COLORS = {
  '#a9e34b': 'rgba(169, 227, 75, 0.35)',  // Lime Green
  '#74c0fc': 'rgba(116, 192, 252, 0.35)', // Holographic Blue
  '#ff85a2': 'rgba(255, 133, 162, 0.35)', // Hot Pink
  '#ffa94d': 'rgba(255, 169, 77, 0.35)',  // Neon Orange
  '#b197fc': 'rgba(177, 151, 252, 0.35)', // Electric Purple
  '#69db7c': 'rgba(105, 219, 124, 0.35)', // Emerald Green
  '#ff8787': 'rgba(255, 135, 135, 0.35)', // Coral Red
  '#9e9e9e': 'rgba(158, 158, 158, 0.35)'  // Muted Gray
};

function calculateConfigStats() {
  let totalTasks = 0;
  let doneTasks = 0;
  const uniqueWeeks = new Set();

  Object.keys(tasks).forEach(dateStr => {
    // Make sure we only process calendar dates YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const dayTasks = tasks[dateStr] || [];
      if (dayTasks.length > 0) {
        totalTasks += dayTasks.length;
        doneTasks += dayTasks.filter(t => t.done).length;
        
        // Calculate week start for this date
        try {
          const date = new Date(dateStr + 'T00:00:00');
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const weekStart = new Date(date.setDate(diff));
          const weekStr = formatDateISO(weekStart);
          uniqueWeeks.add(weekStr);
        } catch (e) {
          console.warn('Erro ao processar semana para a data:', dateStr);
        }
      }
    }
  });

  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const weeksCount = uniqueWeeks.size;

  return {
    done: doneTasks,
    weeks: weeksCount,
    pct: pct
  };
}

function renderConfigScreen() {
  const avatarEl = document.getElementById('configUserAvatar');
  const initialsEl = document.getElementById('configUserInitials');
  const nameEl = document.getElementById('configUserName');
  const emailEl = document.getElementById('configUserEmail');
  
  if (avatarEl) avatarEl.style.display = 'block';
  if (initialsEl) initialsEl.style.display = 'none';
  
  if (currentUser) {
    const meta = currentUser.user_metadata || {};
    const name = meta.full_name || currentUser.email || 'Usuário RoteiroAI';
    const email = currentUser.email || '';
    const avatar = meta.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.src = avatar;
  } else {
    if (nameEl) nameEl.textContent = 'Visitante';
    if (emailEl) emailEl.textContent = 'Não autenticado';
    if (avatarEl) avatarEl.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  }

  // Calculate and display dynamic stats
  const stats = calculateConfigStats();
  document.getElementById('configStatDone').textContent = stats.done;
  document.getElementById('configStatWeeks').textContent = stats.weeks;
  document.getElementById('configStatPct').textContent = stats.pct + '%';

  // Select the active color in picker and add checkmark
  const savedColor = localStorage.getItem('roteiroai_theme_color') || '#a9e34b';
  const buttons = document.querySelectorAll('.color-picker-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.textContent = '';
    if (btn.getAttribute('data-color') === savedColor) {
      btn.classList.add('active');
      btn.textContent = '✓';
    }
  });

  // Sync Dark/Light theme toggle
  const isLight = document.body.classList.contains('light-theme');
  const darkToggle = document.getElementById('darkThemeToggle');
  if (darkToggle) darkToggle.checked = !isLight;
  const darkSub = document.getElementById('darkThemeSubtitle');
  if (darkSub) darkSub.textContent = isLight ? 'Modo claro ativado' : 'Modo noturno ativado';

  // Sync Text Size Subtitle
  const size = localStorage.getItem('roteiroai_text_size') || 'medium';
  const sizeLabels = { 'small': 'Pequeno', 'medium': 'Médio', 'large': 'Grande' };
  const sizeSub = document.getElementById('textSizeSubtitle');
  if (sizeSub) sizeSub.textContent = sizeLabels[size] || 'Médio';

  // Sync Accessibility/Animations Subtitle
  const noAnims = document.body.classList.contains('no-animations');
  const accessSub = document.getElementById('accessibilitySubtitle');
  if (accessSub) accessSub.textContent = noAnims ? 'Animações desativadas' : 'Contraste e animações';

  // Sync Notification Toggles
  const notifTypes = ['tasks', 'daily', 'push'];
  const notifSubtitles = {
    tasks: { el: 'notifTasksSubtitle', on: 'Avisar antes do prazo', off: 'Desativado' },
    daily: { el: 'notifDailySubtitle', on: 'Toda manhã às 8h', off: 'Desativado' },
    push:  { el: 'notifPushSubtitle',  on: 'Notificações instantâneas', off: 'Desativado' }
  };
  notifTypes.forEach(type => {
    const isOn = localStorage.getItem(`roteiroai_notif_${type}`) === 'true';
    const toggle = document.getElementById(`notif${type.charAt(0).toUpperCase() + type.slice(1)}Toggle`);
    if (toggle) toggle.checked = isOn;
    const cfg = notifSubtitles[type];
    const subEl = document.getElementById(cfg.el);
    if (subEl) subEl.textContent = isOn ? cfg.on : cfg.off;
  });
}

function changeAppThemeColor(color, element) {
  const glow = THEME_COLORS[color] || 'rgba(255, 255, 255, 0.2)';
  document.documentElement.style.setProperty('--ai', color);
  document.documentElement.style.setProperty('--ai-glow', glow);
  
  localStorage.setItem('roteiroai_theme_color', color);
  localStorage.setItem('roteiroai_theme_glow', glow);
  
  // Update active state in color picker
  const buttons = document.querySelectorAll('.color-picker-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.textContent = '';
  });
  
  if (element) {
    element.classList.add('active');
    element.textContent = '✓';
  } else {
    const btn = document.querySelector(`.color-picker-btn[data-color="${color}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.textContent = '✓';
    }
  }

  // Update accentBar and dashboard elements if open
  const accentBar = document.getElementById('accentBar');
  if (accentBar && activeDay === 'dashboard') {
    accentBar.style.background = color;
  }
}

function toggleDarkTheme(isDark) {
  const subtitle = document.getElementById('darkThemeSubtitle');
  if (isDark) {
    document.body.classList.remove('light-theme');
    localStorage.setItem('roteiroai_light_theme', 'false');
    if (subtitle) subtitle.textContent = 'Modo noturno ativado';
  } else {
    document.body.classList.add('light-theme');
    localStorage.setItem('roteiroai_light_theme', 'true');
    if (subtitle) subtitle.textContent = 'Modo claro ativado';
  }
}

function cycleTextSize() {
  const size = localStorage.getItem('roteiroai_text_size') || 'medium';
  let nextSize = 'medium';
  if (size === 'small') nextSize = 'medium';
  else if (size === 'medium') nextSize = 'large';
  else if (size === 'large') nextSize = 'small';

  const sizeMap = { 'small': '12.5px', 'medium': '14px', 'large': '16px' };
  const sizeLabels = { 'small': 'Pequeno', 'medium': 'Médio', 'large': 'Grande' };
  
  document.documentElement.style.setProperty('--base-font-size', sizeMap[nextSize]);
  localStorage.setItem('roteiroai_text_size', nextSize);
  
  const subtitle = document.getElementById('textSizeSubtitle');
  if (subtitle) subtitle.textContent = sizeLabels[nextSize];
}

function toggleAccessibilitySettings() {
  const noAnims = document.body.classList.contains('no-animations');
  const nextNoAnims = !noAnims;
  
  if (nextNoAnims) {
    document.body.classList.add('no-animations');
    localStorage.setItem('roteiroai_no_animations', 'true');
  } else {
    document.body.classList.remove('no-animations');
    localStorage.setItem('roteiroai_no_animations', 'false');
  }

  const subtitle = document.getElementById('accessibilitySubtitle');
  if (subtitle) subtitle.textContent = nextNoAnims ? 'Animações desativadas' : 'Contraste e animações';
}

// ── Notifications Toggle ──────────────────────────────────────────────────────
function toggleNotification(type, isEnabled) {
  localStorage.setItem(`roteiroai_notif_${type}`, isEnabled ? 'true' : 'false');
  
  const subtitles = {
    tasks: { el: 'notifTasksSubtitle', on: 'Avisar antes do prazo', off: 'Desativado' },
    daily: { el: 'notifDailySubtitle', on: 'Toda manhã às 8h', off: 'Desativado' },
    push:  { el: 'notifPushSubtitle',  on: 'Notificações instantâneas', off: 'Desativado' }
  };
  
  const cfg = subtitles[type];
  if (cfg) {
    const el = document.getElementById(cfg.el);
    if (el) el.textContent = isEnabled ? cfg.on : cfg.off;
  }
}

function handleAvatarError() {
  const avatarEl = document.getElementById('configUserAvatar');
  const initialsEl = document.getElementById('configUserInitials');
  if (avatarEl) avatarEl.style.display = 'none';
  if (initialsEl) {
    initialsEl.style.display = 'flex';
    const nameEl = document.getElementById('configUserName');
    const name = nameEl ? nameEl.textContent : 'U';
    initialsEl.textContent = getInitials(name);
  }
}

function getInitials(name) {
  if (!name || name === 'Carregando...' || name === 'Visitante') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// ── Account Settings ──────────────────────────────────────────────────────────
// ── Helper Navigation for Configurations ──────────────────────────────────────
function showConfigMain() {
  document.getElementById('configMainContent').style.display = 'flex';
  document.getElementById('configDetailsContent').style.display = 'none';
}

function showConfigDetails(title, bodyHTML) {
  document.getElementById('configDetailsTitle').innerHTML = title;
  document.getElementById('configDetailsBody').innerHTML = bodyHTML;
  document.getElementById('configMainContent').style.display = 'none';
  document.getElementById('configDetailsContent').style.display = 'flex';
}

function submitFeedbackForm() {
  const textarea = document.getElementById('feedbackTextarea');
  const text = textarea ? textarea.value.trim() : '';
  if (!text) {
    alert('Por favor, digite seu feedback antes de enviar.');
    return;
  }
  
  showConfigDetails('💬 Feedback Enviado', `
    <div style="text-align: center; padding: 24px 0;">
      <span style="font-size: 40px; display: block; margin-bottom: 12px;">✅</span>
      <h4 style="font-size: 15px; margin-bottom: 8px; color: var(--text); font-family: 'Goldman', sans-serif;">Feedback recebido!</h4>
      <p style="color: var(--sub); font-size: 12px; margin-bottom: 20px; max-width: 280px; margin-left: auto; margin-right: auto; line-height: 1.5;">Obrigado por nos ajudar a melhorar o TarefasIA. Nossa equipe analisará sua sugestão.</p>
      <button class="btn-modal secondary" onclick="showConfigMain()" style="padding: 8px 16px; border-radius: 8px; font-size: 11px;">Voltar para Configurações</button>
    </div>
  `);
}

// ── Account Settings ──────────────────────────────────────────────────────────
function openSecuritySettings() {
  showConfigDetails('🔒 Segurança', `
    <p style="margin-bottom: 12px;">Sua conta e seus dados estão totalmente protegidos no TarefasIA:</p>
    <ul style="list-style-type: none; padding-left: 0; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
      <li style="display: flex; gap: 8px;"><span style="color: var(--ai);">✦</span> <span><strong>Autenticação Segura:</strong> Acesso autenticado de ponta a ponta usando a infraestrutura do Google OAuth 2.0.</span></li>
      <li style="display: flex; gap: 8px;"><span style="color: var(--ai);">✦</span> <span><strong>Armazenamento Criptografado:</strong> Todos os seus dados são guardados no Supabase com Row Level Security (RLS) ativo.</span></li>
    </ul>
    <p style="padding: 12px; background: rgba(255, 169, 77, 0.08); border-left: 3px solid var(--orange); border-radius: 6px; font-size: 12px; color: var(--orange); line-height: 1.5; margin-bottom: 16px;">
      <strong>Nota sobre alteração de senha:</strong> Como você utiliza sua conta do Google para fazer login, para alterar sua senha ou configurar a autenticação de dois fatores, você deve acessar diretamente o painel de segurança da sua conta Google.
    </p>
    <div style="display: flex; gap: 8px;">
      <a href="https://myaccount.google.com/security" target="_blank" class="btn-modal primary" style="text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 11px; display: inline-flex; align-items: center;">Acessar Conta Google</a>
      <button class="btn-modal secondary" onclick="showConfigMain()" style="padding: 10px 16px; border-radius: 8px; font-size: 11px;">Voltar</button>
    </div>
  `);
}

function openIntegrationsSettings() {
  showConfigDetails('🔗 Integrações Ativas', `
    <p style="margin-bottom: 14px;">TarefasIA está integrado com ferramentas externas para otimizar seu fluxo de trabalho:</p>
    <ul style="list-style-type: none; padding-left: 0; display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
      <li style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 14px; line-height: 1;">🟢</span>
        <div>
          <strong>Google OAuth & Calendar:</strong>
          <p style="font-size: 11.5px; color: var(--sub); margin-top: 2px;">Permite login rápido com um clique e sincronização automatizada de rotas diretamente na sua agenda.</p>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 14px; line-height: 1;">🟢</span>
        <div>
          <strong>Notion Sync:</strong>
          <p style="font-size: 11.5px; color: var(--sub); margin-top: 2px;">Exporta e espelha o seu roteiro de tarefas em blocos e tabelas dentro do seu workspace do Notion.</p>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 14px; line-height: 1;">🟢</span>
        <div>
          <strong>Slack Channel:</strong>
          <p style="font-size: 11.5px; color: var(--sub); margin-top: 2px;">Envia notificações automáticas e resumos de atividades do dia diretamente em canais de equipes do Slack.</p>
        </div>
      </li>
    </ul>
    <p style="font-size: 11px; color: var(--sub); margin-bottom: 16px; line-height: 1.4;">
      * Para gerenciar as chaves de conexão destas integrações ou configurar novos canais de webhook personalizados, por favor contate o suporte.
    </p>
    <button class="btn-modal secondary" onclick="showConfigMain()" style="padding: 8px 16px; border-radius: 8px; font-size: 11px;">Voltar para Configurações</button>
  `);
}

function exportUserData() {
  if (!currentUser) {
    alert('Faça login para exportar seus dados.');
    return;
  }
  
  const exportObj = {
    exportedAt: new Date().toISOString(),
    user: {
      id: currentUser.id,
      email: currentUser.email,
      name: (currentUser.user_metadata || {}).full_name || ''
    },
    tasks: tasks,
    customDestinations: customDestinations || {},
    settings: {
      themeColor: localStorage.getItem('roteiroai_theme_color') || '#a9e34b',
      lightTheme: localStorage.getItem('roteiroai_light_theme') === 'true',
      textSize: localStorage.getItem('roteiroai_text_size') || 'medium',
      noAnimations: localStorage.getItem('roteiroai_no_animations') === 'true'
    }
  };
  
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tarefasia_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  const sub = document.getElementById('exportDataSubtitle');
  if (sub) {
    sub.textContent = '✅ Exportado com sucesso!';
    setTimeout(() => { sub.textContent = 'Baixar backup completo'; }, 3000);
  }
}

// ── Support Settings ──────────────────────────────────────────────────────────
function openHelpCenter() {
  showConfigDetails('📖 Central de Ajuda', `
    <p style="margin-bottom: 14px; font-weight: 500;">Guia rápido para aproveitar ao máximo o TarefasIA:</p>
    <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
      <div>
        <h5 style="color: var(--ai); font-size: 13px; font-family: 'Goldman', sans-serif; margin-bottom: 4px;">📅 Agenda e Calendário</h5>
        <p style="font-size: 12px; color: var(--sub); line-height: 1.4;">Use a aba <strong>Agenda</strong> na navegação inferior para se movimentar pelos dias da semana. Toque em qualquer tarefa para ver notas extras ou para definir horários detalhados.</p>
      </div>
      <div>
        <h5 style="color: var(--ai); font-size: 13px; font-family: 'Goldman', sans-serif; margin-bottom: 4px;">✦ Inteligência Artificial (Chat)</h5>
        <p style="font-size: 12px; color: var(--sub); line-height: 1.4;">O painel da IA auxilia na análise de roteiros. Você pode digitar mensagens, usar comandos por voz ou tocar nos botões de ação rápida para resumir as atividades do seu dia.</p>
      </div>
      <div>
        <h5 style="color: var(--ai); font-size: 13px; font-family: 'Goldman', sans-serif; margin-bottom: 4px;">📊 Dashboard e Relatórios</h5>
        <p style="font-size: 12px; color: var(--sub); line-height: 1.4;">A aba <strong>Dash</strong> traz dados consolidados da sua semana, gráficos de produtividade por dia e possibilita exportar lindos relatórios em formato PDF.</p>
      </div>
      <div>
        <h5 style="color: var(--ai); font-size: 13px; font-family: 'Goldman', sans-serif; margin-bottom: 4px;">⚙ Personalização</h5>
        <p style="font-size: 12px; color: var(--sub); line-height: 1.4;">Nas Configurações você pode escolher sua cor de destaque favorita para o painel, ligar ou desligar o modo escuro, e ajustar o tamanho dos textos das tarefas.</p>
      </div>
    </div>
    <button class="btn-modal secondary" onclick="showConfigMain()" style="padding: 8px 16px; border-radius: 8px; font-size: 11px;">Voltar para Configurações</button>
  `);
}

function openFeedbackForm() {
  showConfigDetails('💬 Enviar Feedback', `
    <p style="margin-bottom: 12px; line-height: 1.5;">O que você gostaria de nos dizer? Seu feedback é fundamental para o aprimoramento constante do TarefasIA.</p>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
      <textarea id="feedbackTextarea" placeholder="Escreva aqui sua sugestão, crítica, elogio ou reporte de erro..." style="width: 100%; height: 120px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; color: var(--text); padding: 12px; font-family: inherit; font-size: 12.5px; outline: none; resize: none; box-sizing: border-box; line-height: 1.5; transition: border-color .15s;" onfocus="this.style.borderColor='var(--ai)'" onblur="this.style.borderColor='var(--border)'"></textarea>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-modal primary" onclick="submitFeedbackForm()" style="padding: 10px 18px; border-radius: 8px; font-size: 11px;">Enviar Mensagem</button>
      <button class="btn-modal secondary" onclick="showConfigMain()" style="padding: 10px 18px; border-radius: 8px; font-size: 11px;">Cancelar</button>
    </div>
  `);
}

function openTermsAndPrivacy() {
  showConfigDetails('📄 Termos e Privacidade', `
    <p style="margin-bottom: 12px; font-weight: bold; color: var(--ai); font-family: 'Goldman', sans-serif;">TarefasIA V1.0 · Munago Desenvolvedora de Software</p>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; font-size: 12.5px; color: var(--sub); line-height: 1.5; max-height: 250px; overflow-y: auto; padding-right: 8px;">
      <p><strong>1. Armazenamento de Dados:</strong> Suas informações são guardadas de forma segura em servidores na nuvem (Supabase). Seus dados não são vendidos ou expostos.</p>
      <p><strong>2. Uso do Google Gemini:</strong> Para gerar as análises inteligentes de rotas e resumos diários, enviamos o texto de suas tarefas aos servidores do Google Gemini por meio de conexões criptografadas seguras.</p>
      <p><strong>3. Integração com Calendar:</strong> O acesso solicitado à sua conta Google destina-se exclusivamente para autenticação de usuário e, quando habilitado, para inserção de eventos em sua agenda pessoal.</p>
      <p><strong>4. Exportação e Exclusão:</strong> Você tem total autonomia para exportar um backup JSON de todas as suas informações de tarefas e configurações locais. Caso queira deletar permanentemente seus dados do nosso banco de dados, você pode acionar a remoção de conta.</p>
    </div>
    <p style="font-size: 10px; color: var(--muted); margin-bottom: 16px;">© 2024-2026 TarefasIA · Munago Desenvolvedora de Software. Todos os direitos reservados.</p>
    <button class="btn-modal secondary" onclick="showConfigMain()" style="padding: 8px 16px; border-radius: 8px; font-size: 11px;">Voltar para Configurações</button>
  `);
}

// ── Renderização do Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
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

    // Renderiza a barra do gráfico semanal
    chartHTML += `
      <div class="db-chart-bar-wrapper">
        <div class="db-chart-value" style="color: ${d.color}">${pct}%</div>
        <div class="db-chart-bar-bg" title="${d.name}: ${dCount}/${tCount} concluídas">
          <div class="db-chart-bar-fill" style="height: ${pct}%; background: ${d.color}; --bar-color: ${d.color}"></div>
        </div>
        <div class="db-chart-label">${d.shortName}</div>
      </div>
    `;

    // Renderiza a lista de progresso das bases
    basesHTML += `
      <div class="db-base-item">
        <div class="db-base-info">
          <span class="db-base-name" style="color: ${d.color}">${d.name} (${d.dest})</span>
          <span style="color: var(--sub)">${dCount}/${tCount}</span>
        </div>
        <div class="db-base-progress-bg">
          <div class="db-base-progress-fill" style="width: ${pct}%; background: ${d.color}"></div>
        </div>
      </div>
    `;

    // Renderiza as tarefas pendentes da semana divididas por dia
    const pendingTasks = t.filter(x => !x.done);
    if (pendingTasks.length > 0) {
      pendingHTML += `
        <div class="db-pending-group" style="--group-color: ${d.color}">
          <div class="db-pending-day" style="color: ${d.color}">${d.name} (${d.dest})</div>
      `;
      pendingTasks.forEach(x => {
        pendingHTML += `
          <div class="db-pending-item">
            <div class="task-check" onclick="toggleTask(${x.id})"></div>
            <span class="db-pending-text">${x.text}</span>
            ${x.time ? `<span class="db-pending-time">${x.time}</span>` : ''}
          </div>
        `;
      });
      pendingHTML += `</div>`;
    }
  });

  const overallPct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('dbTotal').textContent = total;
  document.getElementById('dbDone').textContent = done;
  document.getElementById('dbPct').textContent = overallPct + '%';

  document.getElementById('dbChart').innerHTML = chartHTML;
  document.getElementById('dbBasesList').innerHTML = basesHTML;
  document.getElementById('dbPendingTasks').innerHTML = pendingHTML || `
    <div class="empty-state" style="border: none; padding: 20px;">
      🎉 Excelente! Todas as tarefas da semana foram concluídas!
    </div>
  `;
}

// ── Mini Calendário Logic ────────────────────────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const title = document.getElementById('calMonthTitle');
  if (!grid || !title) return;

  grid.innerHTML = '';

  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  title.textContent = `${monthNames[month]} ${year}`;

  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  weekdays.forEach(w => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = w;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const startDayIndex = firstDay.getDay(); 
  
  const prevMonthLast = new Date(year, month, 0);
  const prevMonthDays = prevMonthLast.getDate();

  const currentMonthLast = new Date(year, month + 1, 0);
  const totalDays = currentMonthLast.getDate();

  const cells = [];

  for (let i = startDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    cells.push({ date: d, isCurrentMonth: false });
  }

  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    cells.push({ date: d, isCurrentMonth: true });
  }

  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({ date: d, isCurrentMonth: false });
  }

  const todayStr = formatDateISO(new Date());

  cells.forEach(cell => {
    const dateStr = formatDateISO(cell.date);
    const cellEl = document.createElement('div');
    cellEl.className = 'cal-cell';
    cellEl.textContent = cell.date.getDate();

    if (cell.isCurrentMonth) {
      cellEl.classList.add('current-month');
    }
    if (dateStr === todayStr) {
      cellEl.classList.add('today');
    }
    if (dateStr === activeDay) {
      cellEl.classList.add('active');
    }
    if (tasks[dateStr] && tasks[dateStr].length > 0) {
      cellEl.classList.add('has-tasks');
    }

    cellEl.onclick = () => {
      currentWeekStart = getMonday(cell.date);
      activeDay = dateStr;
      currentCalendarMonth = new Date(cell.date);
      
      updateDaysOfWeek();
      renderCalendar();
      setActiveDay(dateStr);
    };

    grid.appendChild(cellEl);
  });
}

function navigateMonth(direction) {
  currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + direction);
  renderCalendar();
}

function navigateWeek(direction) {
  currentWeekStart.setDate(currentWeekStart.getDate() + direction * 7);
  updateDaysOfWeek();
  
  // Mantém a seleção do mesmo dia da semana na nova semana
  const prevActiveDate = new Date(activeDay + 'T00:00:00');
  const dayOffset = isNaN(prevActiveDate.getTime()) ? 0 : (prevActiveDate.getDay() + 6) % 7; 
  
  const newActiveDate = new Date(currentWeekStart);
  newActiveDate.setDate(currentWeekStart.getDate() + dayOffset);
  const newActiveDayStr = formatDateISO(newActiveDate);
  
  activeDay = newActiveDayStr;
  currentCalendarMonth = new Date(newActiveDate);
  
  renderCalendar();
  setActiveDay(newActiveDayStr);
}

// ── CRUD Operações ────────────────────────────────────────────────────────────
async function addTask() {
  if (!currentUser) return;
  const input = document.getElementById('taskInput');
  const timeI = document.getElementById('taskTime');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  const { data, error } = await _supabase
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
  }

  if (!tasks[activeDay]) tasks[activeDay] = [];
  tasks[activeDay].push({
    id: data.id,
    text: data.text,
    time: data.time || '',
    done: data.done,
    details: data.details || ''
  });

  input.value = '';
  timeI.value = '';
  
  renderCalendar();
  renderTasks();
  renderSidebar();
}

async function toggleTask(id) {
  let targetTask = null;
  let targetDayId = null;
  for (const dateKey in tasks) {
    const t = tasks[dateKey].find(x => x.id === id);
    if (t) {
      targetTask = t;
      targetDayId = dateKey;
      break;
    }
  }
  if (!targetTask) return;

  const newDone = !targetTask.done;
  const { error } = await _supabase
    .from('tasks')
    .update({ done: newDone })
    .eq('id', id);

  if (error) { console.error('Erro ao atualizar tarefa:', error); return; }

  targetTask.done = newDone;

  if (activeDay === 'dashboard') {
    renderDashboard();
    renderSidebar();
  } else {
    renderTasks();
    renderSidebar();
  }
}

async function deleteTask(id) {
  const { error } = await _supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) { console.error('Erro ao deletar tarefa:', error); return; }

  for (const dateKey in tasks) {
    if (tasks[dateKey]) {
      tasks[dateKey] = tasks[dateKey].filter(x => x.id !== id);
    }
  }

  renderCalendar();
  if (activeDay === 'dashboard') {
    renderDashboard();
    renderSidebar();
  } else {
    renderTasks();
    renderSidebar();
  }
}

function renderTasks() {
  const list  = tasks[activeDay] || [];
  const el    = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');
  const done  = list.filter(t => t.done).length;
  const pct   = list.length ? Math.round(done / list.length * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent  = pct + '%';
  empty.style.display = list.length ? 'none' : 'block';
  el.innerHTML = '';
  list.forEach(t => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.done ? ' done' : '');
    
    if (t.done) {
      item.style.cursor = 'pointer';
      item.title = 'Clique para ver detalhes do chamado';
      item.onclick = () => openTaskDetails(t.id);
    }

    item.innerHTML = `
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTask(${t.id})">
        ${t.done ? '✓' : ''}
      </div>
      <div class="task-text" style="${t.done ? 'text-decoration:line-through' : ''}">
        ${t.text} ${t.done ? '<span style="font-size:10px; color:var(--ai); margin-left:6px; font-style:normal; font-weight:600; opacity:0.85;">📝 Ver Detalhes</span>' : ''}
      </div>
      ${t.time ? `<div class="task-time">${t.time}</div>` : ''}
      <button class="task-delete" onclick="event.stopPropagation(); deleteTask(${t.id})">✕</button>
    `;
    el.appendChild(item);
  });
}

function saveTasks() { /* no-op: salvo via Supabase */ }

async function resetToDefaultTasks() {
  if (!currentUser) return;
  if (!confirm("Deseja gerar 25 tarefas de teste? Elas serão salvas na sua conta no Supabase na semana atual.")) return;

  const rows = [
    { day_id: DAYS[0].id, text:"Alinhamento matinal com gerente da Zona Sul", time:"08:30", done:true },
    { day_id: DAYS[0].id, text:"Visitar filial de Santo Amaro e auditar estoque físico", time:"10:00", done:true },
    { day_id: DAYS[0].id, text:"Almoço com coordenador de operações locais", time:"12:30", done:true },
    { day_id: DAYS[0].id, text:"Vistoria técnica na nova instalação em Interlagos", time:"14:30", done:false },
    { day_id: DAYS[0].id, text:"Preencher e enviar relatório de visitas da Zona Sul", time:"17:00", done:false },
    { day_id: DAYS[1].id, text:"Check-in presencial na base Limão", time:"09:00", done:true },
    { day_id: DAYS[1].id, text:"Reunião de alinhamento de rotas com logística", time:"10:30", done:true },
    { day_id: DAYS[1].id, text:"Auditoria preventiva nos sistemas de segurança predial", time:"13:30", done:false },
    { day_id: DAYS[1].id, text:"Entrevistar novo candidato para vaga de supervisor regional", time:"15:00", done:false },
    { day_id: DAYS[1].id, text:"Consolidar pendências administrativas da base Limão", time:"17:30", done:false },
    { day_id: DAYS[2].id, text:"Monitoramento semanal das metas globais do time", time:"08:00", done:true },
    { day_id: DAYS[2].id, text:"Videoconferência mensal de alinhamento com todas as bases", time:"10:00", done:true },
    { day_id: DAYS[2].id, text:"Revisão e atualização da planilha financeira", time:"11:30", done:true },
    { day_id: DAYS[2].id, text:"Aprovar orçamentos pendentes de insumos corporativos", time:"14:00", done:false },
    { day_id: DAYS[2].id, text:"Verificar e responder chamados urgentes do Service Desk", time:"16:00", done:false },
    { day_id: DAYS[3].id, text:"Reunião de abertura e auditoria na base Canindé", time:"09:15", done:true },
    { day_id: DAYS[3].id, text:"Acompanhar workshop presencial de segurança operacional", time:"11:00", done:false },
    { day_id: DAYS[3].id, text:"Negociação de reajustes de contrato com fornecedores", time:"14:00", done:false },
    { day_id: DAYS[3].id, text:"Visita externa de relacionamento com parceiro estratégico", time:"15:30", done:false },
    { day_id: DAYS[3].id, text:"Definir cronograma das manutenções prediais pendentes", time:"17:00", done:false },
    { day_id: DAYS[4].id, text:"Inspeção geral e testes do plano de evacuação em Barueri", time:"08:30", done:true },
    { day_id: DAYS[4].id, text:"Reunião final de status semanal com diretoria de operações", time:"10:30", done:true },
    { day_id: DAYS[4].id, text:"Estruturação dos planos de ação emergenciais", time:"13:30", done:false },
    { day_id: DAYS[4].id, text:"Redigir e arquivar relatórios semanais consolidados", time:"15:00", done:false },
    { day_id: DAYS[4].id, text:"Café com a equipe e encerramento da jornada da semana", time:"17:00", done:false },
  ].map(t => ({ ...t, user_id: currentUser.id, details: '' }));

  const { error } = await _supabase.from('tasks').insert(rows);
  if (error) { alert('Erro: ' + error.message); return; }

  await loadTasksFromSupabase(currentUser.id);
  renderCalendar();
  setActiveDay(activeDay);
  addAIMessage('assistant', '⚡ As 25 tarefas fictícias foram geradas com sucesso no Supabase na semana atual!');
}

// ── Funções de Detalhes dos Chamados (Modal e IA) ─────────────────────────────
let currentDetailTaskId = null;

function openTaskDetails(id) {
  currentDetailTaskId = id;
  
  let targetTask = null;
  let targetDayId = null;
  for (const dateKey in tasks) {
    const found = tasks[dateKey].find(x => x.id === id);
    if (found) {
      targetTask = found;
      targetDayId = dateKey;
      break;
    }
  }

  if (!targetTask) return;

  document.getElementById('detailTaskText').textContent = targetTask.text;
  
  const statusEl = document.getElementById('detailTaskStatus');
  statusEl.textContent = targetTask.done ? 'CONCLUÍDO' : 'PENDENTE';
  statusEl.style.color = targetTask.done ? 'var(--green)' : 'var(--yellow)';
  statusEl.style.background = targetTask.done ? 'rgba(105, 219, 124, 0.1)' : 'rgba(255, 212, 59, 0.1)';
  statusEl.style.borderColor = targetTask.done ? 'rgba(105, 219, 124, 0.3)' : 'rgba(255, 212, 59, 0.3)';

  const d = DAYS.find(x => x.id === targetDayId);
  const dayName = d ? d.name : formatWeekdayLong(targetDayId);
  const dayDest = d ? d.dest : (customDestinations[targetDayId] || 'Sem escala');

  document.getElementById('detailTaskTime').textContent = 
    `Rota: ${dayName} (${dayDest}) ${targetTask.time ? '· Horário: ' + targetTask.time : ''}`;
  
  document.getElementById('detailTaskNotes').value = targetTask.details || '';
  
  document.getElementById('taskDetailsModal').style.display = 'flex';
}

function closeTaskDetailsModal() {
  document.getElementById('taskDetailsModal').style.display = 'none';
  currentDetailTaskId = null;
}

async function saveTaskDetails() {
  if (!currentDetailTaskId) return;
  const notesVal = document.getElementById('detailTaskNotes').value.trim();

  const { error } = await _supabase
    .from('tasks')
    .update({ details: notesVal })
    .eq('id', currentDetailTaskId);

  if (error) {
    console.error('Erro ao salvar detalhes:', error);
    alert('Erro ao salvar: ' + error.message);
    return;
  }

  for (const dateKey in tasks) {
    if (tasks[dateKey]) {
      tasks[dateKey] = tasks[dateKey].map(t => {
        if (t.id === currentDetailTaskId) {
          return { ...t, details: notesVal };
        }
        return t;
      });
    }
  }

  closeTaskDetailsModal();
  renderTasks();

  if (activeDay === 'dashboard') {
    renderDashboard();
  } else if (activeDay === 'search') {
    const query = document.getElementById('searchInput').value;
    performSearch(query);
  }
}

async function generateTaskDetailsWithIA() {
  if (!currentDetailTaskId) return;

  let targetTask = null;
  let targetDayId = null;
  for (const dateKey in tasks) {
    const found = tasks[dateKey].find(x => x.id === currentDetailTaskId);
    if (found) {
      targetTask = found;
      targetDayId = dateKey;
      break;
    }
  }

  if (!targetTask) return;

  const localKey = (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw');
  let serverHasKey = false;
  
  if (!localKey) {
    try {
      const statusRes = await fetch(`${BASE_URL}/api/status`);
      const statusData = await statusRes.json();
      serverHasKey = statusData.serverHasKey === true;
    } catch (e) {
      console.warn('Erro ao checar status do servidor:', e);
    }
  }

  if (!serverHasKey && !localKey) {
    alert('Por favor, configure sua chave do Google (Gemini) clicando em ⚙ API no topo da página.');
    showModal();
    return;
  }

  const btnIA = document.getElementById('btnGenerateIA');
  const textarea = document.getElementById('detailTaskNotes');
  
  btnIA.disabled = true;
  btnIA.textContent = '✦ Escrevendo detalhes com IA...';
  
  const systemPrompt = `Você é um analista de operações corporativas encarregado de documentar chamados técnicos e atividades finalizadas.
Escreva um detalhamento técnico conciso, profissional e formal (1 ou 2 parágrafos curtos) simulando o que foi feito na atividade.
Responda diretamente com a descrição das tarefas realizadas, sem preâmbulos, cumprimentos ou explicações adicionais. Responda em português brasileiro.`;

  const d = DAYS.find(x => x.id === targetDayId);
  const dayName = d ? d.name : formatWeekdayLong(targetDayId);
  const dayDest = d ? d.dest : (customDestinations[targetDayId] || 'Sem escala');

  const userMessage = `Por favor, elabore um detalhamento profissional para a seguinte atividade finalizada no meu roteiro:
Atividade: "${targetTask.text}"
Data/Base operacional visitada: "${dayName} (${dayDest})"
${targetTask.time ? 'Horário programado: ' + targetTask.time : ''}`;

  try {
    const data = await callGeminiWithProxyFallback(systemPrompt, userMessage, localKey, false);
    const reply = data.text || '';
    textarea.value = reply;
  } catch (e) {
    console.error('Erro ao gerar detalhes com IA:', e);
    alert('Erro ao contatar IA: ' + e.message);
  } finally {
    btnIA.disabled = false;
    btnIA.innerHTML = '✦ Gerar Detalhamento Técnico com IA';
  }
}

// ── AI Panel ──────────────────────────────────────────────────────────────────
function buildContext() {
  let ctx = 'Contexto do roteiro semanal selecionado:\n';
  const endWeekDate = addDays(currentWeekStart, 6);
  ctx += `Período: de ${formatDateBR(currentWeekStart)} a ${formatDateBR(endWeekDate)}\n\n`;

  DAYS.forEach(d => {
    const t = tasks[d.id] || [];
    ctx += `${d.name} (${d.dateLabel}) → ${d.dest} (${d.tipo})\n`;
    if (t.length) {
      t.forEach(x => ctx += `  ${x.done ? '[✓]' : '[ ]'} ${x.text}${x.time ? ' às '+x.time : ''}\n`);
    } else {
      ctx += '  Sem tarefas registradas.\n';
    }
    ctx += '\n';
  });
  return ctx;
}

async function sendMessage() {
  const input = document.getElementById('aiInput');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';
  addAIMessage('user', msg);
  await callAI(msg);
}

// ── Reconhecimento de Voz (Microfone da IA) ───────────────────────────────────
let recognition = null;
let isListening = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Speech Recognition API not supported in this browser.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    const micBtn = document.getElementById('aiMicBtn');
    if (micBtn) {
      micBtn.classList.add('listening');
      micBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>`;
    }
    const input = document.getElementById('aiInput');
    if (input) {
      input.placeholder = 'Ouvindo... Fale agora.';
    }
  };

  recognition.onend = () => {
    isListening = false;
    const micBtn = document.getElementById('aiMicBtn');
    if (micBtn) {
      micBtn.classList.remove('listening');
      micBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>`;
    }
    const input = document.getElementById('aiInput');
    if (input) {
      input.placeholder = 'Pergunte algo sobre sua semana...';
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById('aiInput');
    if (input) {
      input.value = (input.value + ' ' + transcript).trim();
      input.focus();
    }
  };

  recognition.onerror = (event) => {
    console.error('Erro no reconhecimento de voz:', event.error);
    if (event.error === 'not-allowed') {
      alert('Permissão de microfone negada. Certifique-se de autorizar o uso do microfone nas configurações do seu celular.');
    }
  };
}

function toggleSpeechRecognition() {
  if (!recognition) {
    initSpeechRecognition();
  }

  if (!recognition) {
    alert('Desculpe, o reconhecimento de voz não é suportado pelo seu celular/navegador.');
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.error('Falha ao iniciar gravação:', e);
    }
  }
}

async function quickPrompt(type) {
  const d    = DAYS.find(x => x.id === activeDay);
  const t    = d ? (tasks[activeDay] || []) : [];
  const done = t.filter(x => x.done).length;
  
  let prompt = '';
  
  if (type === 'resumir') {
    if (activeDay === 'dashboard') {
      prompt = `Resuma minha produtividade da semana. Diga quantas tarefas concluí e faça um resumo motivador de todas as bases.`;
    } else {
      prompt = `Resuma meu dia de ${d.name} (${d.dest}). Tenho ${t.length} tarefa(s), ${done} concluída(s). Seja direto e motivador.`;
    }
  } else if (type === 'proximos') {
    prompt = `Com base no meu roteiro semanal, quais são os próximos passos mais importantes? Priorize e seja objetivo.`;
  } else if (type === 'analise') {
    prompt = `Analise minha produtividade desta semana com base nas tarefas registradas. Dê um panorama geral e identifique pontos de atenção.`;
  } else if (type === 'relatorio') {
    prompt = `Gere um relatório executivo curto da semana para eu enviar ao meu gestor. Use formato profissional e objetivo.`;
  } else if (type === 'pdf_dia') {
    const targetDayName = d ? `${d.name} (${d.dateLabel})` : formatDateBR(new Date());
    prompt = `Gere um relatório diário em PDF para o dia de hoje (${targetDayName}).`;
  } else if (type === 'pdf_semana') {
    prompt = `Gere um relatório semanal em PDF com o resumo das atividades da semana atual.`;
  } else if (type === 'pdf_mes') {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dateObj = (activeDay && activeDay !== 'dashboard') ? new Date(activeDay + 'T00:00:00') : new Date();
    const monthName = monthNames[dateObj.getMonth()];
    prompt = `Gere um relatório mensal em PDF com o resumo das atividades do mês de ${monthName} de ${dateObj.getFullYear()}.`;
  }

  addAIMessage('user', prompt);
  await callAI(prompt);
}

function addAIMessage(role, text, isTyping = false, isReport = false, fileConfig = null, skipSave = false) {
  const msgs = document.getElementById('aiMessages');
  const div  = document.createElement('div');
  div.className = `ai-msg ${role}`;
  if (isTyping) {
    div.id = 'aiTyping';
    div.innerHTML = `<div class="ai-msg-label">IA</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
  } else {
    const label = role === 'assistant' ? 'IA' : role === 'error' ? 'ERRO' : 'VOCÊ';
    div.innerHTML = `<div class="ai-msg-label">${label}</div>${text.replace(/\n/g,'<br>')}`;

    if (isReport || fileConfig) {
      const btn = document.createElement('button');
      btn.className = 'btn-modal primary';
      btn.style.marginTop = '12px';
      btn.style.width = '100%';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.gap = '8px';
      btn.style.fontSize = '11px';
      btn.style.padding = '8px 12px';
      
      if (fileConfig) {
        btn.innerHTML = `📥 Baixar PDF (${fileConfig.title})`;
        btn.onclick = function() {
          downloadCustomPeriodPDF(fileConfig.type, fileConfig.date, fileConfig.title, text);
        };
      } else {
        btn.innerHTML = '📥 Baixar Relatório em PDF';
        btn.dataset.rawText = text;
        btn.onclick = function() {
          downloadReportPDF(this.dataset.rawText);
        };
      }
      div.appendChild(btn);
    }
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;

  // Persiste a mensagem no histórico do chat do usuário
  if (!isTyping && !skipSave && currentUser) {
    const storedRole = role === 'assistant' ? 'model' : role;
    chatHistory.push({ role: storedRole, parts: [{ text }], isReport, fileConfig });
    localStorage.setItem(`chat_history_${currentUser.id}`, JSON.stringify(chatHistory));
    updateChatHistoryCounter();
  }

  return div;
}

function updateChatHistoryCounter() {
  const counter = document.getElementById('aiHistoryCount');
  if (!counter) return;
  const count = chatHistory.filter(m => m.role === 'user' || m.role === 'model').length;
  counter.textContent = `${count} / 20 mensagens`;
}

// ── Geração do PDF Corporativo Elegante com Dashboard Integrado ──────────────────
async function downloadReportPDF(aiText) {
  const element = document.createElement('div');
  element.style.width = '210mm';
  element.style.fontFamily = "'Inter', sans-serif";
  element.style.color = '#e8e8e8';
  element.style.backgroundColor = '#000000';
  element.style.lineHeight = '1.5';
  element.style.fontSize = '12px';
  element.style.fontWeight = '400';

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const headerHTML = `
    <div style="background: linear-gradient(135deg, #111111, #161616); border: 1px solid #1f1f1f; border-radius: 12px; padding: 25px 30px; margin-bottom: 25px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
      <div>
        <h1 style="margin: 0; font-family: 'Goldman', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">DA<span style="color:#a9e34b">SH</span></h1>
        <p style="margin: 4px 0 0 0; color: #666666; font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Relatório de Desempenho Executivo</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 8px; color: #666666; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px;">Data de Emissão</div>
        <div style="font-size: 12px; color: #ffffff; font-weight: 700;">${dateStr} às ${timeStr}</div>
      </div>
    </div>
  `;

  let totalTasks = 0;
  let doneTasks = 0;
  DAYS.forEach(d => {
    const t = tasks[d.id] || [];
    totalTasks += t.length;
    doneTasks  += t.filter(x => x.done).length;
  });
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statsHTML = `
    <div style="display: flex; gap: 15px; margin-bottom: 25px;">
      <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #7c3aed; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        <div style="font-size: 24px; font-weight: 800; color: #b197fc; line-height: 1;">${totalTasks}</div>
        <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Mapeadas</div>
      </div>
      <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #10b981; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        <div style="font-size: 24px; font-weight: 800; color: #69db7c; line-height: 1;">${doneTasks}</div>
        <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Concluídas</div>
      </div>
      <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #f59e0b; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        <div style="font-size: 24px; font-weight: 800; color: #ffd43b; line-height: 1;">${pct}%</div>
        <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Taxa de Eficiência</div>
      </div>
    </div>
  `;

  let dbChartBarsHTML = '';
  let dbBasesProgressHTML = '';

  DAYS.forEach(d => {
    const t = tasks[d.id] || [];
    const dCount = t.filter(x => x.done).length;
    const tCount = t.length;
    const dayPct = tCount ? Math.round((dCount / tCount) * 100) : 0;

    dbChartBarsHTML += `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; max-width: 45px;">
        <div style="font-family: 'Goldman', sans-serif; font-size: 10px; color: ${d.color}; font-weight: 700; margin-bottom: 2px;">${dayPct}%</div>
        <div style="width: 24px; height: 70px; background: #1f1f1f; border-radius: 5px; position: relative; overflow: hidden;">
          <div style="width: 100%; height: ${dayPct}%; background: ${d.color}; position: absolute; bottom: 0; border-radius: 5px; box-shadow: 0 0 8px ${d.color}cc;"></div>
        </div>
        <div style="font-family: 'Goldman', sans-serif; font-size: 10px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 2px;">${d.shortName}</div>
      </div>
    `;

    dbBasesProgressHTML += `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px;">
          <span style="font-weight: 700; color: #e8e8e8;">${d.name} (${d.dest})</span>
          <span style="font-weight: 700; color: ${d.color};">${dCount}/${tCount}</span>
        </div>
        <div style="height: 6px; background: #1f1f1f; border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${dayPct}%; background: ${d.color}; border-radius: 3px;"></div>
        </div>
      </div>
    `;
  });

  const dashboardSectionHTML = `
    <div style="margin-bottom: 15px; border-bottom: 2px solid #1f1f1f; padding-bottom: 8px;">
      <span style="font-size: 12px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Painel de Métricas (Dashboard)</span>
    </div>
    
    <div style="display: flex; gap: 20px; margin-bottom: 25px; page-break-inside: avoid;">
      <div style="flex: 1.2; border: 1px solid #1f1f1f; border-radius: 10px; padding: 15px; background: #111111;">
        <h4 style="margin: 0 0 15px 0; font-size: 9px; color: #666666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Desempenho Geral por Dia</h4>
        <div style="display: flex; justify-content: center; gap: 12px; align-items: flex-end; height: 100px;">
          ${dbChartBarsHTML}
        </div>
      </div>
      
      <div style="flex: 1; border: 1px solid #1f1f1f; border-radius: 10px; padding: 15px; background: #111111; display: flex; flex-direction: column; justify-content: center;">
        <h4 style="margin: 0 0 15px 0; font-size: 9px; color: #666666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Aproveitamento por Base</h4>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${dbBasesProgressHTML}
        </div>
      </div>
    </div>
  `;

  const aiFormatted = aiText.replace(/\n/g, '<br>');
  const aiHTML = `
    <div style="background: #111111; border: 1px solid #1f1f1f; border-left: 5px solid #7c3aed; padding: 18px; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 16px; color: #7c3aed; font-weight: bold; line-height: 1;">✦</span>
        <span style="font-size: 10px; color: #7c3aed; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">ANÁLISE ESTATÍSTICA (IA GEMINI)</span>
      </div>
      <div style="font-size: 11.5px; color: #e8e8e8; line-height: 1.6; font-style: italic;">
        "${aiFormatted}"
      </div>
    </div>
  `;

  const footer1HTML = `
    <div style="margin-top: 25px; border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
      <span>TarefasIA • Inteligência e Controle Operacional</span>
      <span>Página 1 de 2</span>
    </div>
  `;

  let leftColHTML = '';
  let rightColHTML = '';
  DAYS.forEach((d, idx) => {
    const dayTasks = tasks[d.id] || [];
    let dayTasksHTML = '';

    if (dayTasks.length === 0) {
      dayTasksHTML = `<p style="font-size: 10px; color: #666666; font-style: italic; margin: 4px 0; text-align: center;">Nenhuma atividade registrada.</p>`;
    } else {
      dayTasks.forEach(t => {
        const checkIcon = t.done ? 
          `<div style="width: 12px; height: 12px; border-radius: 50%; background: rgba(105, 219, 124, 0.15); border: 1.2px solid #69db7c; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #69db7c; font-weight: bold; margin-right: 8px; flex-shrink: 0;">✓</div>` : 
          `<div style="width: 12px; height: 12px; border-radius: 50%; border: 1.2px solid #333333; margin-right: 8px; flex-shrink: 0;"></div>`;
        const textStyle = t.done ? 'text-decoration: line-through; color: #666666; font-style: italic;' : 'color: #e8e8e8; font-weight: 500;';
        
        let detailsHTML = '';
        if (t.details) {
          detailsHTML = `<div style="font-size: 8.5px; color: #a9e34b; margin-left: 20px; margin-top: 4px; padding: 4px 8px; border-left: 2px solid rgba(169, 227, 75, 0.2); background: #161616; font-style: normal; line-height: 1.3; border-radius: 2px;">${t.details.replace(/\n/g, '<br>')}</div>`;
        }

        dayTasksHTML += `
          <div style="font-size: 10px; padding: 4px 0; border-bottom: 1px solid #1f1f1f;">
            <div style="display: flex; align-items: center;">
              ${checkIcon}
              <div style="${textStyle} flex: 1; word-break: break-word;">${t.text}</div>
              ${t.time ? `<div style="font-size: 8px; color: #666666; margin-left: 8px; font-family: monospace; font-weight: 600; background: #161616; padding: 2px 4px; border-radius: 3px; flex-shrink: 0;">${t.time}</div>` : ''}
            </div>
            ${detailsHTML}
          </div>
        `;
      });
    }

    const cardHTML = `
      <div style="margin-bottom: 12px; border: 1px solid #1f1f1f; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.2); page-break-inside: avoid;">
        <div style="display: flex; align-items: center; justify-content: space-between; background: #161616; padding: 8px 12px; border-bottom: 1px solid #1f1f1f; border-left: 4px solid ${d.color};">
          <span style="font-weight: 700; font-size: 11px; color: #e8e8e8;">${d.name} <span style="font-weight: 400; color: #666666; margin-left: 4px; font-size: 9.5px;">(${d.dateLabel}) • 📍 ${d.dest}</span></span>
          <span style="font-size: 7px; padding: 2px 6px; border-radius: 10px; background: ${d.color}15; color: ${d.color}; font-weight: 800; border: 1px solid ${d.color}25; text-transform: uppercase; letter-spacing: 0.5px;">${d.tipo}</span>
        </div>
        <div style="padding: 6px 12px; background: #111111;">
          ${dayTasksHTML}
        </div>
      </div>
    `;

    // Distribui em 2 colunas equilibradas (4 dias na esquerda, 3 na direita)
    if (idx < 4) {
      leftColHTML += cardHTML;
    } else {
      rightColHTML += cardHTML;
    }
  });

  const footer2HTML = `
    <div style="margin-top: 25px; border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
      <span>TarefasIA • Inteligência e Controle Operacional</span>
      <span>Página 2 de 2</span>
    </div>
  `;

  const page1HTML = `
    <div style="box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        ${headerHTML}
        ${statsHTML}
        ${dashboardSectionHTML}
        ${aiHTML}
      </div>
      ${footer1HTML}
    </div>
  `;

  const page2HTML = `
    <div style="page-break-before: always; box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="margin-bottom: 15px; border-bottom: 2px solid #1f1f1f; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Cronograma Detalhado de Atividades</span>
        </div>
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1; width: 50%; display: flex; flex-direction: column;">
            ${leftColHTML}
          </div>
          <div style="flex: 1; width: 50%; display: flex; flex-direction: column;">
            ${rightColHTML}
          </div>
        </div>
      </div>
      ${footer2HTML}
    </div>
  `;

  element.innerHTML = page1HTML + page2HTML;
  document.body.appendChild(element);

  const opt = {
    margin:       0,
    filename:     `relatorio_tarefas_ia_${now.toISOString().slice(0,10)}.pdf`,
    image:        { type: 'jpeg', quality: 0.99 },
    html2canvas:  { scale: 3, useCORS: true, letterRendering: true, antialiasing: true, backgroundColor: '#000000' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await exportPDFElement(element, opt);
}

async function exportPDFElement(element, opt, loadingModal = null, originalTitle = '', originalDesc = '') {
  const cleanup = () => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    if (loadingModal) {
      loadingModal.style.display = 'none';
      const modalTitle = loadingModal.querySelector('.modal-title');
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalTitle && originalTitle) modalTitle.innerHTML = originalTitle;
      if (modalDesc && originalDesc) modalDesc.innerHTML = originalDesc;
    }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.warn('html2pdf save falhou, tentando fallback...', err);
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (fallbackErr) {
      console.error('Erro no fallback de PDF:', fallbackErr);
      alert('Não foi possível gerar o PDF no seu dispositivo. Tente usar o app no navegador ou outro dispositivo.');
    }
  } finally {
    cleanup();
  }
}

async function downloadCustomPeriodPDF(type, date, title, aiText) {
  // Show a loading indicator
  const loadingModal = document.getElementById('loadingModal');
  let originalTitle = '';
  let originalDesc = '';
  if (loadingModal) {
    const modalTitle = loadingModal.querySelector('.modal-title');
    const modalDesc = loadingModal.querySelector('.modal-desc');
    if (modalTitle) {
      originalTitle = modalTitle.innerHTML;
      modalTitle.innerHTML = `Gerando <span>PDF</span>`;
    }
    if (modalDesc) {
      originalDesc = modalDesc.innerHTML;
      modalDesc.innerHTML = `Aguarde, a IA está organizando suas informações e formatando o PDF executivo...`;
    }
    loadingModal.style.display = 'flex';
  }

  const element = document.createElement('div');
  element.style.width = '210mm';
  element.style.fontFamily = "'Inter', sans-serif";
  element.style.color = '#e8e8e8';
  element.style.backgroundColor = '#000000';
  element.style.lineHeight = '1.5';
  element.style.fontSize = '12px';
  element.style.fontWeight = '400';

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Header HTML
  const headerHTML = `
    <div style="background: linear-gradient(135deg, #111111, #161616); border: 1px solid #1f1f1f; border-radius: 12px; padding: 25px 30px; margin-bottom: 25px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
      <div>
        <h1 style="margin: 0; font-family: 'Goldman', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">DA<span style="color:#a9e34b">SH</span></h1>
        <p style="margin: 4px 0 0 0; color: #666666; font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${title || 'Relatório de Atividades'}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 8px; color: #666666; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px;">Data de Emissão</div>
        <div style="font-size: 12px; color: #ffffff; font-weight: 700;">${dateStr} às ${timeStr}</div>
      </div>
    </div>
  `;

  // AI Analysis Section
  const aiFormatted = aiText.replace(/\n/g, '<br>');
  const aiHTML = `
    <div style="background: #111111; border: 1px solid #1f1f1f; border-left: 5px solid #7c3aed; padding: 18px; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 16px; color: #7c3aed; font-weight: bold; line-height: 1;">✦</span>
        <span style="font-size: 10px; color: #7c3aed; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">ANÁLISE ESTATÍSTICA (IA GEMINI)</span>
      </div>
      <div style="font-size: 11.5px; color: #e8e8e8; line-height: 1.6; font-style: italic;">
        "${aiFormatted}"
      </div>
    </div>
  `;

  if (type === 'day') {
    // Daily report
    const dayTasks = tasks[date] || [];
    const totalTasks = dayTasks.length;
    const doneTasks = dayTasks.filter(x => x.done).length;
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const d = DAYS.find(x => x.id === date);
    const dayLongName = d ? d.name : formatWeekdayLong(date);
    const dateLabel = d ? d.dateLabel : formatDateBR(new Date(date + 'T00:00:00'));
    const dayDest = d ? d.dest : (customDestinations[date] || 'Sem localidade');
    const dayTipo = d ? d.tipo : 'VISITA';
    const dayColor = d ? d.color : '#b197fc';

    const statsHTML = `
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid ${dayColor}; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: ${dayColor}; line-height: 1;">${totalTasks}</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Mapeadas</div>
        </div>
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #10b981; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #69db7c; line-height: 1;">${doneTasks}</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Concluídas</div>
        </div>
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #f59e0b; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #ffd43b; line-height: 1;">${pct}%</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Taxa de Eficiência</div>
        </div>
      </div>
    `;

    let tasksListHTML = '';
    if (dayTasks.length === 0) {
      tasksListHTML = `<p style="font-size: 11px; color: #666666; font-style: italic; margin: 15px 0; text-align: center;">Nenhuma atividade registrada para este dia.</p>`;
    } else {
      dayTasks.forEach(t => {
        const checkIcon = t.done ? 
          `<div style="width: 14px; height: 14px; border-radius: 50%; background: rgba(105, 219, 124, 0.15); border: 1.2px solid #69db7c; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #69db7c; font-weight: bold; margin-right: 10px; flex-shrink: 0;">✓</div>` : 
          `<div style="width: 14px; height: 14px; border-radius: 50%; border: 1.2px solid #333333; margin-right: 10px; flex-shrink: 0;"></div>`;
        const textStyle = t.done ? 'text-decoration: line-through; color: #666666; font-style: italic;' : 'color: #e8e8e8; font-weight: 500;';
        
        let detailsHTML = '';
        if (t.details) {
          detailsHTML = `<div style="font-size: 9px; color: #a9e34b; margin-left: 24px; margin-top: 6px; padding: 6px 10px; border-left: 2px solid rgba(169, 227, 75, 0.2); background: #161616; font-style: normal; line-height: 1.4; border-radius: 3px;">${t.details.replace(/\n/g, '<br>')}</div>`;
        }

        tasksListHTML += `
          <div style="font-size: 11px; padding: 8px 0; border-bottom: 1px solid #1f1f1f;">
            <div style="display: flex; align-items: center;">
              ${checkIcon}
              <div style="${textStyle} flex: 1; word-break: break-word;">${t.text}</div>
              ${t.time ? `<div style="font-size: 9px; color: #666666; margin-left: 8px; font-family: monospace; font-weight: 600; background: #161616; padding: 2px 5px; border-radius: 3px; flex-shrink: 0;">${t.time}</div>` : ''}
            </div>
            ${detailsHTML}
          </div>
        `;
      });
    }

    const dayDetailsHTML = `
      <div style="margin-bottom: 15px; border-bottom: 2px solid #1f1f1f; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Cronograma do Dia</span>
        <span style="font-size: 9px; padding: 2px 8px; border-radius: 12px; background: ${dayColor}15; color: ${dayColor}; font-weight: 800; border: 1px solid ${dayColor}25;">${dayTipo}</span>
      </div>
      
      <div style="border: 1px solid #1f1f1f; border-radius: 8px; overflow: hidden; background: #111111; margin-bottom: 25px;">
        <div style="background: #161616; padding: 12px 16px; border-bottom: 1px solid #1f1f1f; font-weight: 700; font-size: 12px; color: #ffffff;">
          📍 ${dayLongName} (${dateLabel}) • Localidade: ${dayDest}
        </div>
        <div style="padding: 10px 16px;">
          ${tasksListHTML}
        </div>
      </div>
    `;

    const pageHTML = `
      <div style="box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          ${headerHTML}
          ${statsHTML}
          ${dayDetailsHTML}
          ${aiHTML}
        </div>
        <div style="border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
          <span>TarefasIA • Relatório Diário Operacional</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    `;
    element.innerHTML = pageHTML;

  } else if (type === 'week') {
    // Weekly report
    const weekStart = getMonday(new Date(date + 'T00:00:00'));
    const localDays = [];
    const shortNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const names = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    const colors = ['#b197fc', '#69db7c', '#ffd43b', '#ffa94d', '#74c0fc', '#ff8787', '#ff8787'];
    const tipos = ['VISITA', 'VISITA', 'DEMANDAS DIÁRIAS', 'VISITA', 'VISITA', 'OUTROS', 'OUTROS'];
    
    let totalTasks = 0;
    let doneTasks = 0;

    for (let i = 0; i < 7; i++) {
      const currentDayDate = addDays(weekStart, i);
      const currentDayStr = formatDateISO(currentDayDate);
      const customDest = customDestinations[currentDayStr] || '';
      const dayTasks = tasks[currentDayStr] || [];
      totalTasks += dayTasks.length;
      doneTasks += dayTasks.filter(x => x.done).length;

      localDays.push({
        id: currentDayStr,
        name: names[i],
        shortName: shortNames[i],
        dateLabel: formatDateBR(currentDayDate),
        dest: customDest,
        color: colors[i],
        tipo: tipos[i],
        tasks: dayTasks
      });
    }

    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const statsHTML = `
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #7c3aed; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #b197fc; line-height: 1;">${totalTasks}</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Mapeadas</div>
        </div>
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #10b981; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #69db7c; line-height: 1;">${doneTasks}</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Concluídas</div>
        </div>
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #f59e0b; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #ffd43b; line-height: 1;">${pct}%</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Taxa de Eficiência</div>
        </div>
      </div>
    `;

    let dbChartBarsHTML = '';
    let dbBasesProgressHTML = '';

    localDays.forEach(d => {
      const dCount = d.tasks.filter(x => x.done).length;
      const tCount = d.tasks.length;
      const dayPct = tCount ? Math.round((dCount / tCount) * 100) : 0;

      dbChartBarsHTML += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; max-width: 45px;">
          <div style="font-family: 'Goldman', sans-serif; font-size: 10px; color: ${d.color}; font-weight: 700; margin-bottom: 2px;">${dayPct}%</div>
          <div style="width: 24px; height: 70px; background: #1f1f1f; border-radius: 5px; position: relative; overflow: hidden;">
            <div style="width: 100%; height: ${dayPct}%; background: ${d.color}; position: absolute; bottom: 0; border-radius: 5px; box-shadow: 0 0 8px ${d.color}cc;"></div>
          </div>
          <div style="font-family: 'Goldman', sans-serif; font-size: 10px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 2px;">${d.shortName}</div>
        </div>
      `;

      dbBasesProgressHTML += `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px;">
            <span style="font-weight: 700; color: #e8e8e8;">${d.name} (${d.dest || 'Sem localidade'})</span>
            <span style="font-weight: 700; color: ${d.color};">${dCount}/${tCount}</span>
          </div>
          <div style="height: 6px; background: #1f1f1f; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${dayPct}%; background: ${d.color}; border-radius: 3px;"></div>
          </div>
        </div>
      `;
    });

    const dashboardSectionHTML = `
      <div style="margin-bottom: 15px; border-bottom: 2px solid #1f1f1f; padding-bottom: 8px;">
        <span style="font-size: 12px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Painel de Métricas (Dashboard)</span>
      </div>
      
      <div style="display: flex; gap: 20px; margin-bottom: 25px; page-break-inside: avoid;">
        <div style="flex: 1.2; border: 1px solid #1f1f1f; border-radius: 10px; padding: 15px; background: #111111;">
          <h4 style="margin: 0 0 15px 0; font-size: 9px; color: #666666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Desempenho Geral por Dia</h4>
          <div style="display: flex; justify-content: center; gap: 12px; align-items: flex-end; height: 100px;">
            ${dbChartBarsHTML}
          </div>
        </div>
        
        <div style="flex: 1; border: 1px solid #1f1f1f; border-radius: 10px; padding: 15px; background: #111111; display: flex; flex-direction: column; justify-content: center;">
          <h4 style="margin: 0 0 15px 0; font-size: 9px; color: #666666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Aproveitamento por Base</h4>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${dbBasesProgressHTML}
          </div>
        </div>
      </div>
    `;

    let leftColHTML = '';
    let rightColHTML = '';
    localDays.forEach((d, idx) => {
      let dayTasksHTML = '';

      if (d.tasks.length === 0) {
        dayTasksHTML = `<p style="font-size: 10px; color: #666666; font-style: italic; margin: 4px 0; text-align: center;">Nenhuma atividade registrada.</p>`;
      } else {
        d.tasks.forEach(t => {
          const checkIcon = t.done ? 
            `<div style="width: 12px; height: 12px; border-radius: 50%; background: rgba(105, 219, 124, 0.15); border: 1.2px solid #69db7c; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #69db7c; font-weight: bold; margin-right: 8px; flex-shrink: 0;">✓</div>` : 
            `<div style="width: 12px; height: 12px; border-radius: 50%; border: 1.2px solid #333333; margin-right: 8px; flex-shrink: 0;"></div>`;
          const textStyle = t.done ? 'text-decoration: line-through; color: #666666; font-style: italic;' : 'color: #e8e8e8; font-weight: 500;';
          
          let detailsHTML = '';
          if (t.details) {
            detailsHTML = `<div style="font-size: 8.5px; color: #a9e34b; margin-left: 20px; margin-top: 4px; padding: 4px 8px; border-left: 2px solid rgba(169, 227, 75, 0.2); background: #161616; font-style: normal; line-height: 1.3; border-radius: 2px;">${t.details.replace(/\n/g, '<br>')}</div>`;
          }

          dayTasksHTML += `
            <div style="font-size: 10px; padding: 4px 0; border-bottom: 1px solid #1f1f1f;">
              <div style="display: flex; align-items: center;">
                ${checkIcon}
                <div style="${textStyle} flex: 1; word-break: break-word;">${t.text}</div>
                ${t.time ? `<div style="font-size: 8px; color: #666666; margin-left: 8px; font-family: monospace; font-weight: 600; background: #161616; padding: 2px 4px; border-radius: 3px; flex-shrink: 0;">${t.time}</div>` : ''}
              </div>
              ${detailsHTML}
            </div>
          `;
        });
      }

      const cardHTML = `
        <div style="margin-bottom: 12px; border: 1px solid #1f1f1f; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.2); page-break-inside: avoid;">
          <div style="display: flex; align-items: center; justify-content: space-between; background: #161616; padding: 8px 12px; border-bottom: 1px solid #1f1f1f; border-left: 4px solid ${d.color};">
            <span style="font-weight: 700; font-size: 11px; color: #e8e8e8;">${d.name} <span style="font-weight: 400; color: #666666; margin-left: 4px; font-size: 9.5px;">(${d.dateLabel}) • 📍 ${d.dest || 'Sem localidade'}</span></span>
            <span style="font-size: 7px; padding: 2px 6px; border-radius: 10px; background: ${d.color}15; color: ${d.color}; font-weight: 800; border: 1px solid ${d.color}25; text-transform: uppercase; letter-spacing: 0.5px;">${d.tipo}</span>
          </div>
          <div style="padding: 6px 12px; background: #111111;">
            ${dayTasksHTML}
          </div>
        </div>
      `;

      if (idx < 4) {
        leftColHTML += cardHTML;
      } else {
        rightColHTML += cardHTML;
      }
    });

    const page1HTML = `
      <div style="box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          ${headerHTML}
          ${statsHTML}
          ${dashboardSectionHTML}
          ${aiHTML}
        </div>
        <div style="border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
          <span>TarefasIA • Relatório Semanal Operacional</span>
          <span>Página 1 de 2</span>
        </div>
      </div>
    `;

    const page2HTML = `
      <div style="page-break-before: always; box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="margin-bottom: 15px; border-bottom: 2px solid #1f1f1f; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Cronograma Detalhado da Semana</span>
          </div>
          <div style="display: flex; gap: 16px;">
            <div style="flex: 1; width: 50%; display: flex; flex-direction: column;">
              ${leftColHTML}
            </div>
            <div style="flex: 1; width: 50%; display: flex; flex-direction: column;">
              ${rightColHTML}
            </div>
          </div>
        </div>
        <div style="border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
          <span>TarefasIA • Relatório Semanal Operacional</span>
          <span>Página 2 de 2</span>
        </div>
      </div>
    `;

    element.innerHTML = page1HTML + page2HTML;

  } else if (type === 'month') {
    // Monthly report
    const monthDates = new Set([
      ...Object.keys(tasks).filter(k => k.startsWith(date)),
      ...Object.keys(customDestinations).filter(k => k.startsWith(date))
    ]);
    const sortedMonthDates = Array.from(monthDates).sort();

    let totalTasks = 0;
    let doneTasks = 0;

    const monthDays = sortedMonthDates.map(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const weekdayName = weekdayNames[d.getDay()];
      const weekdayColors = ['#ff8787', '#b197fc', '#69db7c', '#ffd43b', '#ffa94d', '#74c0fc', '#ff8787'];
      const weekdayColor = weekdayColors[d.getDay()];
      const dayTasks = tasks[dateStr] || [];

      totalTasks += dayTasks.length;
      doneTasks += dayTasks.filter(x => x.done).length;

      return {
        dateStr,
        weekdayName,
        dateLabel: formatDateBR(d),
        color: weekdayColor,
        dest: customDestinations[dateStr] || '',
        tasks: dayTasks
      };
    });

    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const statsHTML = `
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #7c3aed; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #b197fc; line-height: 1;">${totalTasks}</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas no Mês</div>
        </div>
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #10b981; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #69db7c; line-height: 1;">${doneTasks}</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Tarefas Concluídas</div>
        </div>
        <div style="flex: 1; background: #111111; border: 1px solid #1f1f1f; border-top: 4px solid #f59e0b; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          <div style="font-size: 24px; font-weight: 800; color: #ffd43b; line-height: 1;">${pct}%</div>
          <div style="font-size: 9px; color: #666666; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px;">Aproveitamento Mensal</div>
        </div>
      </div>
    `;

    // Group cards to print in columns/pages
    let monthCardsHTML = '';
    if (monthDays.length === 0) {
      monthCardsHTML = `<div class="empty-state" style="padding: 30px; text-align: center; color: var(--sub);">Nenhuma tarefa ou localidade registrada neste mês.</div>`;
    } else {
      monthDays.forEach(d => {
        let dayTasksHTML = '';
        if (d.tasks.length === 0) {
          dayTasksHTML = `<p style="font-size: 9.5px; color: #555; font-style: italic; margin: 4px 0; text-align: center;">Apenas localidade definida (sem tarefas).</p>`;
        } else {
          d.tasks.forEach(t => {
            const checkIcon = t.done ? 
              `<div style="width: 11px; height: 11px; border-radius: 50%; background: rgba(105, 219, 124, 0.15); border: 1px solid #69db7c; display: flex; align-items: center; justify-content: center; font-size: 6.5px; color: #69db7c; font-weight: bold; margin-right: 6px; flex-shrink: 0;">✓</div>` : 
              `<div style="width: 11px; height: 11px; border-radius: 50%; border: 1px solid #333333; margin-right: 6px; flex-shrink: 0;"></div>`;
            const textStyle = t.done ? 'text-decoration: line-through; color: #555; font-style: italic;' : 'color: #dddddd;';
            
            let detailsHTML = '';
            if (t.details) {
              detailsHTML = `<div style="font-size: 8px; color: #a9e34b; margin-left: 17px; margin-top: 3px; padding: 3px 6px; border-left: 1.5px solid rgba(169, 227, 75, 0.2); background: #161616; font-style: normal; line-height: 1.2; border-radius: 2px;">${t.details.replace(/\n/g, '<br>')}</div>`;
            }

            dayTasksHTML += `
              <div style="font-size: 9.5px; padding: 3px 0; border-bottom: 1px solid #1f1f1f;">
                <div style="display: flex; align-items: center;">
                  ${checkIcon}
                  <div style="${textStyle} flex: 1; word-break: break-word;">${t.text}</div>
                  ${t.time ? `<div style="font-size: 7.5px; color: #555; margin-left: 6px; font-family: monospace; background: #161616; padding: 1px 3px; border-radius: 2px; flex-shrink: 0;">${t.time}</div>` : ''}
                </div>
                ${detailsHTML}
              </div>
            `;
          });
        }

        monthCardsHTML += `
          <div style="margin-bottom: 12px; border: 1px solid #1f1f1f; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.2); page-break-inside: avoid; background: #111111;">
            <div style="display: flex; align-items: center; justify-content: space-between; background: #161616; padding: 6px 12px; border-bottom: 1px solid #1f1f1f; border-left: 3px solid ${d.color};">
              <span style="font-weight: 700; font-size: 10px; color: #e8e8e8;">${d.weekdayName} (${d.dateLabel})</span>
              <span style="font-size: 9px; color: var(--sub); font-weight: 500;">📍 ${d.dest || 'Sem localidade'}</span>
            </div>
            <div style="padding: 6px 12px;">
              ${dayTasksHTML}
            </div>
          </div>
        `;
      });
    }

    const page1HTML = `
      <div style="box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          ${headerHTML}
          ${statsHTML}
          ${aiHTML}
          <div style="margin-bottom: 10px; border-bottom: 2px solid #1f1f1f; padding-bottom: 6px;">
            <span style="font-size: 11px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Resumo Operacional Mensal</span>
          </div>
          <p style="font-size: 11px; color: var(--sub); line-height: 1.6;">
            Este documento consolida as atividades executadas e programadas para o mês correspondente. As páginas a seguir contêm o detalhamento diário de chamados, visitas de rotina e resoluções técnicas documentadas.
          </p>
        </div>
        <div style="border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
          <span>TarefasIA • Relatório Mensal Operacional</span>
          <span>Página 1 de 2</span>
        </div>
      </div>
    `;

    const page2HTML = `
      <div style="page-break-before: always; box-sizing: border-box; width: 210mm; height: 296mm; padding: 12mm 15mm; background-color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="margin-bottom: 12px; border-bottom: 2px solid #1f1f1f; padding-bottom: 6px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; color: #e8e8e8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Detalhamento Cronológico das Atividades</span>
          </div>
          <div style="column-count: 2; column-gap: 16px; width: 100%;">
            ${monthCardsHTML}
          </div>
        </div>
        <div style="border-top: 1px solid #1f1f1f; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #666666; font-weight: 500;">
          <span>TarefasIA • Relatório Mensal Operacional</span>
          <span>Página 2 de 2</span>
        </div>
      </div>
    `;

    element.innerHTML = page1HTML + page2HTML;
  }

  document.body.appendChild(element);

  const opt = {
    margin:       0,
    filename:     `relatorio_tarefas_ia_${type}_${date}.pdf`,
    image:        { type: 'jpeg', quality: 0.99 },
    html2canvas:  { scale: 3, useCORS: true, letterRendering: true, antialiasing: true, backgroundColor: '#000000' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await exportPDFElement(element, opt, loadingModal, originalTitle, originalDesc);
}

// ── Exportação Rápida com IA via Dashboard ──────────────────────────────────────
async function exportDashboardPDF() {
  const localKey = (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw');
  let serverHasKey = false;
  
  if (!localKey) {
    try {
      const statusRes = await fetch(`${BASE_URL}/api/status`);
      const statusData = await statusRes.json();
      serverHasKey = statusData.serverHasKey === true;
    } catch (e) {
      console.warn('Erro ao checar status do servidor:', e);
    }
  }

  if (!serverHasKey && !localKey) {
    alert('Por favor, configure sua chave do Google (Gemini) clicando em ⚙ API no topo da página antes de exportar.');
    showModal();
    return;
  }

  const loadingModal = document.getElementById('loadingModal');
  loadingModal.style.display = 'flex';

  const context = buildContext();
  const systemPrompt = `Você é um analista de dados e operações.
Gere uma análise operacional executiva concisa (máximo de 2 parágrafos curtos) para o relatório semanal.
Foque no progresso consolidado, bases visitadas e pontos de atenção.
Responda em português brasileiro de forma profissional e direta.`;

  try {
    const promptMessage = context + '\n\nPor favor, faça a análise operacional do meu roteiro semanal.';
    const data = await callGeminiWithProxyFallback(systemPrompt, promptMessage, localKey, false);
    const reply = data.text || 'Resumo operacional concluído com base nos dados do sistema.';
    downloadReportPDF(reply);
  } catch (e) {
    console.error('Erro na exportação automática:', e);
    let done = 0, total = 0;
    DAYS.forEach(d => {
      const list = tasks[d.id] || [];
      total += list.length;
      done += list.filter(t => t.done).length;
    });
    const fallbackText = `Análise gerada automaticamente: A semana conta com um total de ${total} tarefas planejadas, das quais ${done} foram concluídas (aproveitamento de ${total ? Math.round(done/total*100) : 0}%). As rotas diárias cobriram bases estratégicas com localidades coordenadas em tempo real no calendário.`;
    downloadReportPDF(fallbackText);
  } finally {
    loadingModal.style.display = 'none';
  }
}

async function callAI(userMsg) {
  const localKey = (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw');
  let serverHasKey = false;
  
  if (!localKey) {
    try {
      const statusRes = await fetch(`${BASE_URL}/api/status`);
      const statusData = await statusRes.json();
      serverHasKey = statusData.serverHasKey === true;
    } catch (e) {
      console.warn('Erro ao checar status do servidor:', e);
    }
  }

  if (!serverHasKey && !localKey) {
    addAIMessage('error', 'Configure sua chave do Google (Gemini) clicando em <strong>⚙ API</strong> no topo da página.');
    showModal();
    return;
  }

  const btn = document.getElementById('aiSendBtn');
  btn.disabled = true;

  const typingEl = addAIMessage('assistant', '', true);

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const context = buildContext();
  
  const systemPrompt = `Você é um assistente de produtividade integrado a um sistema de roteiro semanal e calendário de visitas e demandas.
Você tem acesso ao roteiro completo do usuário e às tarefas registradas por ele.
A data atual hoje é: ${currentDateStr} (ISO: ${formatDateISO(now)}).
Responda sempre em português brasileiro, de forma direta, prática e profissional.
Mantenha respostas concisas (máx 4 parágrafos). Use emojis com moderação.

REGRAS DE CADASTRAR TAREFAS (AGENDAMENTO):
Se o usuário pedir para criar, agendar, adicionar ou marcar uma tarefa (ex: 'criar tarefa...', 'agendar reunião...', 'me lembrar de visitar Santo Amaro no dia 25/06'), você deve identificar:
1. O texto descritivo da tarefa.
2. A data em formato ISO 'AAAA-MM-DD'. Se o usuário citar datas curtas como '25/06', assuma o ano corrente (2026). Se falar 'hoje', 'amanhã', 'daqui a uma semana', calcule baseado na data atual informada acima.
3. O horário em formato 'HH:MM' (se não especificado, deixe em branco).

Se identificar uma solicitação de criação, você DEVE incluir OBRIGATORIAMENTE esta marcação em JSON na primeira linha da sua resposta:
[TASK_CREATE: {"text": "descrição", "date": "AAAA-MM-DD", "time": "HH:MM"}]
Em seguida, escreva a sua resposta normal confirmando a criação da tarefa de maneira amigável. Exemplo de retorno:
[TASK_CREATE: {"text": "Visita filial Santo Amaro", "date": "2026-06-25", "time": "08:00"}]
Tarefa agendada com sucesso para Quinta-feira, 25 de junho de 2026 às 08:00.

REGRAS PARA GERAR RELATÓRIOS/ARQUIVOS:
Se o usuário pedir para gerar, baixar ou exportar um relatório, arquivo ou PDF (seja de um dia, de uma semana ou de um mês completo), você deve identificar:
1. O tipo de período: "day", "week" ou "month".
2. A data/mês de referência em formato ISO:
   - Para "day": 'AAAA-MM-DD'
   - Para "week": 'AAAA-MM-DD' (o dia correspondente, de preferência o início daquela semana)
   - Para "month": 'AAAA-MM'
3. O título do relatório (curto, profissional e em português brasileiro).

Se identificar uma solicitação de relatório/geração de arquivo, você DEVE incluir OBRIGATORIAMENTE esta marcação em JSON na primeira linha da sua resposta:
[FILE_GENERATE: {"type": "day"|"week"|"month", "date": "AAAA-MM-DD"|"AAAA-MM", "title": "título do relatório"}]
Em seguida, escreva o texto normal da sua análise ou resumo correspondente ao período solicitado. Exemplo de retorno:
[FILE_GENERATE: {"type": "month", "date": "2026-06", "title": "Relatório Operacional de Junho de 2026"}]
Aqui está o relatório mensal detalhado para Junho de 2026...`;

  try {
    // Constrói o histórico de mensagens formatado para a API do Gemini usando o campo contents
    // e limita o histórico a no máximo 20 mensagens para evitar estouro de tokens.
    const contents = [];
    const historyForAPI = chatHistory.filter(m => m.role === 'user' || m.role === 'model').slice(-20);
    
    historyForAPI.forEach((m, idx) => {
      const isLast = idx === historyForAPI.length - 1;
      const text = m.parts.map(p => p.text || '').join('');
      let messageText = text;
      
      // Injeta o contexto semanal completo na última mensagem do usuário
      if (isLast && m.role === 'user') {
        messageText = context + '\n\nPergunta do usuário: ' + text;
      }
      
      contents.push({
        role: m.role === 'model' ? 'assistant' : m.role,
        parts: [{ text: messageText }]
      });
    });

    // Fallback: se o histórico de API estiver vazio, adiciona a mensagem atual
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: context + '\n\nPergunta do usuário: ' + userMsg }]
      });
    }

    let data;
    try {
      data = await callGeminiWithProxyFallback(systemPrompt, contents, localKey, true);
    } catch (proxyError) {
      const errMsg = proxyError?.message || 'Erro desconhecido da API.';
      typingEl.remove();
      if (proxyError.status === 401 || proxyError.status === 403) {
        addAIMessage('error', '🔑 Chave do Google inválida ou expirada. Clique em <strong>⚙ API</strong> e insira uma chave válida.');
        setStatus(false);
      } else if (proxyError.status === 429) {
        addAIMessage('error', '⏳ Muitas requisições ao servidor de IA. Aguarde alguns segundos e tente novamente.');
      } else if (proxyError.status >= 500) {
        addAIMessage('error', '💡 Erro no servidor de IA. Tente novamente mais tarde.');
      } else {
        addAIMessage('error', `Erro ao chamar o servidor de IA: ${errMsg}`);
      }
      btn.disabled = false;
      return;
    }

    const reply = data.text || 'Não consegui processar a resposta.';
    typingEl.remove();
    
    // Processamento da tag de criação de tarefa ou geração de arquivo por IA
    const taskMatch = reply.match(/\[TASK_CREATE:\s*({[\s\S]*?})\s*\]/);
    const fileMatch = reply.match(/\[FILE_GENERATE:\s*({[\s\S]*?})\s*\]/);
    
    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1]);
        const cleanReply = reply.replace(/\[TASK_CREATE:\s*({[\s\S]*?})\s*\]/, '').trim();
        addAIMessage('assistant', cleanReply, false, false);
        await executeAITaskCreate(taskData);
      } catch (e) {
        console.error('Erro ao analisar JSON da tarefa da IA:', e);
        addAIMessage('assistant', reply, false, false);
      }
    } else if (fileMatch) {
      try {
        const fileData = JSON.parse(fileMatch[1]);
        const cleanReply = reply.replace(/\[FILE_GENERATE:\s*({[\s\S]*?})\s*\]/, '').trim();
        addAIMessage('assistant', cleanReply, false, false, fileData);
      } catch (e) {
        console.error('Erro ao analisar JSON de geração de arquivo da IA:', e);
        addAIMessage('assistant', reply, false, false);
      }
    } else {
      const isReport = userMsg.toLowerCase().includes('relatorio') || userMsg.toLowerCase().includes('relatório');
      addAIMessage('assistant', reply, false, isReport);
    }
  } catch (e) {
    typingEl.remove();
    const message = e?.message || 'Não foi possível conectar ao servidor de IA.';
    addAIMessage('error', `⚠️ ${message}`);
    console.error('Erro de conexão:', e);
  }

  btn.disabled = false;
}

async function executeAITaskCreate(taskData) {
  if (!currentUser) return;
  const { text, date, time } = taskData;
  if (!text || !date) return;

  const statusEl = document.getElementById('statusText');
  if (statusEl) statusEl.textContent = 'Criando tarefa via IA...';

  const { data, error } = await _supabase
    .from('tasks')
    .insert({
      user_id: currentUser.id,
      day_id: date,
      text,
      time: time || '',
      done: false,
      details: ''
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar tarefa via IA:', error);
    alert('Erro ao criar tarefa via IA: ' + error.message);
    if (statusEl) statusEl.textContent = 'IA conectada';
    return;
  }

  if (!tasks[date]) tasks[date] = [];
  tasks[date].push({
    id: data.id,
    text: data.text,
    time: data.time || '',
    done: data.done,
    details: data.details || ''
  });

  const targetDate = new Date(date + 'T00:00:00');
  currentWeekStart = getMonday(targetDate);
  activeDay = date;
  currentCalendarMonth = new Date(targetDate);

  updateDaysOfWeek();
  renderCalendar();
  setActiveDay(date);

  if (statusEl) {
    statusEl.textContent = 'Tarefa criada!';
    setTimeout(() => { statusEl.textContent = 'IA conectada'; }, 3000);
  }
}

// ── Algoritmo de Busca e Histórico de Pesquisas ────────────────────────────────
function getRecentSearches() {
  if (!currentUser) return [];
  const key = `recent_searches_${currentUser.id}`;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading recent searches:', e);
    return [];
  }
}

function saveRecentSearch(query) {
  if (!currentUser || !query || !query.trim()) return;
  const cleanQuery = query.trim();
  const key = `recent_searches_${currentUser.id}`;
  let searches = getRecentSearches();
  
  // Remove duplicates and add to start
  searches = searches.filter(s => s.toLowerCase() !== cleanQuery.toLowerCase());
  searches.unshift(cleanQuery);
  
  // Keep only the 5 most recent searches
  if (searches.length > 5) {
    searches = searches.slice(0, 5);
  }
  
  localStorage.setItem(key, JSON.stringify(searches));
  renderRecentSearches();
}

function clearRecentSearches() {
  if (!currentUser) return;
  const key = `recent_searches_${currentUser.id}`;
  localStorage.removeItem(key);
  renderRecentSearches();
}

function renderRecentSearches() {
  const container = document.getElementById('recentSearchesList');
  if (!container) return;
  
  const searches = getRecentSearches();
  if (searches.length === 0) {
    container.innerHTML = `<span style="font-size: 11px; color: var(--sub);">Nenhuma pesquisa recente.</span>`;
    return;
  }
  
  container.innerHTML = '';
  searches.forEach(search => {
    const btn = document.createElement('button');
    btn.className = 'ai-quick-btn';
    btn.style.fontSize = '10px';
    btn.style.padding = '4px 10px';
    btn.style.borderRadius = '4px';
    btn.style.borderColor = 'rgba(116, 192, 252, 0.3)';
    btn.style.color = 'var(--blue)';
    btn.textContent = search;
    btn.onclick = () => {
      const input = document.getElementById('searchInput');
      if (input) input.value = search;
      performSearch(search);
    };
    container.appendChild(btn);
  });
}

function performSearch(query) {
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;

  if (!query || !query.trim()) {
    resultsContainer.innerHTML = `
      <div class="empty-state" style="border: none; padding: 20px;">
        Digite uma palavra-chave acima para buscar em todas as suas tarefas.
      </div>
    `;
    return;
  }

  const cleanQuery = query.trim().toLowerCase();
  saveRecentSearch(cleanQuery);

  // Filter tasks
  const matchedGroups = [];
  
  // Sort date keys chronologically
  const sortedDates = Object.keys(tasks).sort();
  
  sortedDates.forEach(dateStr => {
    const dayTasks = tasks[dateStr] || [];
    const filtered = dayTasks.filter(t => {
      const textMatch = t.text && t.text.toLowerCase().includes(cleanQuery);
      const detailsMatch = t.details && t.details.toLowerCase().includes(cleanQuery);
      return textMatch || detailsMatch;
    });

    if (filtered.length > 0) {
      // Find or build day info
      const d = DAYS.find(x => x.id === dateStr);
      const dayName = d ? d.name : formatWeekdayLong(dateStr);
      const dateLabel = d ? d.dateLabel : formatDateBR(new Date(dateStr + 'T00:00:00'));
      const dayDest = d ? d.dest : (customDestinations[dateStr] || 'Sem localidade');
      const dayColor = d ? d.color : '#b197fc';

      matchedGroups.push({
        dateStr,
        dayName,
        dateLabel,
        dayDest,
        dayColor,
        tasks: filtered
      });
    }
  });

  if (matchedGroups.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state" style="border: none; padding: 32px;">
        🔍 Nenhuma tarefa encontrada para "${query}".
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = '';
  matchedGroups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'db-pending-group';
    groupDiv.style.setProperty('--group-color', group.dayColor);
    groupDiv.style.marginBottom = '16px';

    // Header of the day
    const groupHeader = document.createElement('div');
    groupHeader.style.display = 'flex';
    groupHeader.style.justifyContent = 'space-between';
    groupHeader.style.alignItems = 'center';
    groupHeader.style.cursor = 'pointer';
    groupHeader.style.padding = '4px 0 8px';
    groupHeader.title = 'Ir para este dia';
    groupHeader.innerHTML = `
      <span style="font-size: 11px; font-weight: 700; color: ${group.dayColor}">
        📅 ${group.dayName} (${group.dateLabel}) · Rota: ${group.dayDest || 'Sem localidade'}
      </span>
      <span style="font-size: 10px; color: var(--sub); text-decoration: underline;">Ir para o dia</span>
    `;
    groupHeader.onclick = () => {
      // Navigate to selected day
      currentWeekStart = getMonday(new Date(group.dateStr + 'T00:00:00'));
      activeDay = group.dateStr;
      currentCalendarMonth = new Date(group.dateStr + 'T00:00:00');
      updateDaysOfWeek();
      renderCalendar();
      setActiveDay(group.dateStr);
    };
    groupDiv.appendChild(groupHeader);

    // Tasks list
    group.tasks.forEach(t => {
      const item = document.createElement('div');
      item.className = 'task-item' + (t.done ? ' done' : '');
      item.style.fontSize = '12px';
      item.style.padding = '8px 12px';
      
      if (t.done) {
        item.style.cursor = 'pointer';
        item.title = 'Clique para ver detalhes do chamado';
        item.onclick = () => openTaskDetails(t.id);
      }

      item.innerHTML = `
        <div class="task-check ${t.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTaskAndRefreshSearch(${t.id}, '${query.replace(/'/g, "\\'")}')">
          ${t.done ? '✓' : ''}
        </div>
        <div class="task-text" style="${t.done ? 'text-decoration:line-through' : ''}">
          ${t.text} ${t.done ? '<span style="font-size:10px; color:var(--ai); margin-left:6px; font-style:normal; font-weight:600; opacity:0.85;">📝 Ver Detalhes</span>' : ''}
        </div>
        ${t.time ? `<div class="task-time">${t.time}</div>` : ''}
        <button class="task-delete" onclick="event.stopPropagation(); deleteTaskAndRefreshSearch(${t.id}, '${query.replace(/'/g, "\\'")}')">✕</button>
      `;
      groupDiv.appendChild(item);
    });

    resultsContainer.appendChild(groupDiv);
  });
}

async function toggleTaskAndRefreshSearch(id, query) {
  await toggleTask(id);
  performSearch(query);
}

async function deleteTaskAndRefreshSearch(id, query) {
  if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
    await deleteTask(id);
    performSearch(query);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

document.getElementById('apiModal').addEventListener('click', function(e) {
  if (e.target === this && (localStorage.getItem('google_api_key') || 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw')) closeModal();
});

document.getElementById('logoutConfirmModal').addEventListener('click', function(e) {
  if (e.target === this) closeLogoutConfirmModal();
});

// Inicialização com Pre-load Premium (autenticação via Supabase)
function startPreloader() {
  const preloader = document.getElementById('preloader');
  const ringFill  = document.getElementById('preloaderRingFill');
  const barFill   = document.getElementById('preloaderBarFill');
  const pctEl     = document.getElementById('preloaderPct');
  const statusEl  = document.getElementById('preloaderStatus');

  if (!preloader || !ringFill || !barFill || !pctEl || !statusEl) {
    console.error('Preloader HTML elements not found.');
    return;
  }

  const CIRCUMFERENCE = 2 * Math.PI * 44;
  ringFill.style.strokeDasharray  = CIRCUMFERENCE;
  ringFill.style.strokeDashoffset = CIRCUMFERENCE;

  const messages = [
    'Inicializando sistemas...',
    'Verificando autenticação...',
    'Conectando ao banco de dados...',
    'Preparando painel de controle...',
    'Tudo pronto!',
  ];

  let progress = 0;
  const interval      = 25;
  let tick = 0;
  let sessionChecked = false;
  let user = null;

  // Realiza a verificação de sessão em paralelo
  checkSession().then(usr => {
    user = usr;
    sessionChecked = true;
  }).catch(err => {
    console.error('Falha ao verificar sessão no carregamento:', err);
    sessionChecked = true;
  });

  const timer = setInterval(() => {
    tick++;
    
    // O progresso avança normalmente até 90%. Só vai para 100% quando a sessão terminar de checar.
    const totalDuration = user ? 2000 : 2500;
    const ticks = totalDuration / interval;
    const step = 100 / ticks;
    
    let targetProgress = Math.min(100, Math.round(tick * step));
    if (!sessionChecked && targetProgress > 90) {
      targetProgress = 90;
    }
    progress = targetProgress;

    const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = offset;
    barFill.style.width = progress + '%';
    pctEl.textContent = progress + '%';

    const msgIdx = Math.min(
      Math.floor((progress / 100) * messages.length),
      messages.length - 1
    );
    statusEl.textContent = messages[msgIdx];

    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(async () => {
        if (user && !_initialized) {
          _initialized = true;
          try {
            await Promise.race([
              Promise.all([
                loadDestinationsFromSupabase(user.id),
                loadTasksFromSupabase(user.id)
              ]),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Database Timeout')), 3000))
            ]);
          } catch (err) {
            console.error('Erro ou timeout no preloader:', err);
          }
          
          updateDaysOfWeek();
          renderCalendar();
          
          preloader.classList.add('fade-out');
          init();
        } else {
          preloader.classList.add('fade-out');
          if (!user) {
            initGoogleOneTap();
          }
        }
      }, 250);
    }
  }, interval);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startPreloader);
} else {
  startPreloader();
}

