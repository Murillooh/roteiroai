const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const settingsCSS = `
/* Settings Premium UI */
.settings-group-card {
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  animation: bentoFadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  margin-bottom: 24px;
}
.settings-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  transition: background 0.2s, transform 0.2s;
  background: transparent;
}
.settings-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.settings-item.clickable:hover {
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}
.settings-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.1);
}
.settings-item-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}
.settings-item-subtitle {
  font-size: 12px;
  color: var(--sub);
}
.settings-section-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--sub);
  text-transform: uppercase;
  margin-bottom: 10px;
  margin-left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.settings-section-title::before {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sub);
  opacity: 0.4;
}
.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #000;
  font-weight: bold;
}
.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 0 15px currentColor;
}
.color-swatch.active {
  transform: scale(1.1);
  border-color: rgba(255,255,255,0.8);
  box-shadow: 0 0 20px currentColor;
}
`;

if(!html.includes('.settings-group-card')) {
    html = html.replace('/* ── PRELOADER ── */', settingsCSS + '\n/* ── PRELOADER ── */');
}

const startConfig = html.indexOf('<div id="configMainContent"');
const endConfig = html.indexOf('<!-- Seção de Detalhes da Configuração (Subtelas) -->');

const newConfigHTML = `<div id="configMainContent" style="display:flex; flex-direction:column; gap:8px; width:100%;">
        <div class="db-header" style="margin-bottom: 12px;">
          <h2 class="db-title">Configurações</h2>
          <p class="db-subtitle">Gerencie seu perfil e personalize o aplicativo com a nova interface</p>
        </div>

      <!-- Statistics Row -->
      <div style="display: flex; gap: 16px; margin-bottom: 16px;">
        <div class="settings-group-card" style="flex: 1; padding: 20px; align-items:center; text-align:center; animation-delay: 0.1s; margin-bottom:0;">
          <div id="configStatDone" style="font-size: 28px; font-weight: 800; font-family: 'Goldman', sans-serif; color: var(--text); line-height: 1; text-shadow: 0 0 10px rgba(255,255,255,0.2);">0</div>
          <div style="font-size: 9px; color: var(--sub); font-weight: 800; text-transform: uppercase; margin-top: 8px; letter-spacing: 1px;">Tarefas Feitas</div>
        </div>
        <div class="settings-group-card" style="flex: 1; padding: 20px; align-items:center; text-align:center; animation-delay: 0.15s; margin-bottom:0;">
          <div id="configStatWeeks" style="font-size: 28px; font-weight: 800; font-family: 'Goldman', sans-serif; color: var(--text); line-height: 1; text-shadow: 0 0 10px rgba(255,255,255,0.2);">0</div>
          <div style="font-size: 9px; color: var(--sub); font-weight: 800; text-transform: uppercase; margin-top: 8px; letter-spacing: 1px;">Semanas Ativas</div>
        </div>
        <div class="settings-group-card" style="flex: 1; padding: 20px; align-items:center; text-align:center; animation-delay: 0.2s; margin-bottom:0;">
          <div id="configStatPct" style="font-size: 28px; font-weight: 800; font-family: 'Goldman', sans-serif; color: var(--purple); line-height: 1; text-shadow: 0 0 15px rgba(177,151,252,0.4);">0%</div>
          <div style="font-size: 9px; color: var(--sub); font-weight: 800; text-transform: uppercase; margin-top: 8px; letter-spacing: 1px;">Aproveitamento</div>
        </div>
      </div>

      <!-- Profile Card -->
      <div class="settings-group-card" style="padding: 24px; flex-direction: row; align-items: center; justify-content: space-between; animation-delay: 0.25s;">
        <div style="display: flex; align-items: center; gap: 16px; text-align: left;">
          <div style="position: relative; width: 64px; height: 64px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--ai), var(--purple)); box-shadow: 0 0 20px rgba(169, 227, 75, 0.3); display: flex; align-items: center; justify-content: center;">
            <img id="configUserAvatar" src="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" alt="Foto de Perfil" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid #111;" onerror="handleAvatarError()" />
            <div id="configUserInitials" style="display: none; width: 100%; height: 100%; border-radius: 50%; background: #222; border: 3px solid #111; color: var(--ai); align-items: center; justify-content: center; font-size: 20px; font-weight: bold; font-family: 'Goldman', sans-serif;"></div>
          </div>
          <div>
            <h3 id="configUserName" style="font-family: 'Goldman', sans-serif; font-size: 18px; color: #fff; margin-bottom: 4px; letter-spacing:0.5px;">Carregando...</h3>
            <p id="configUserEmail" style="font-size: 12px; color: var(--sub); font-weight:500;">...</p>
          </div>
        </div>
        <button class="btn-modal" style="background: rgba(255, 50, 50, 0.1); border:1px solid rgba(255,50,50,0.3); color: #ff6b6b; padding: 10px 20px; font-size: 12px; border-radius: 12px; font-weight:700;" onclick="showLogoutConfirmModal()">Sair</button>
      </div>

      <!-- Theme Color Picker -->
      <div class="settings-group-card" style="padding: 24px; animation-delay: 0.3s;">
        <div style="font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 16px; text-align: left; display:flex; align-items:center; gap:10px;">
          <div style="width:28px;height:28px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎨</div>
          Cor de destaque
        </div>
        <div class="theme-color-grid" style="display: flex; flex-wrap: wrap; gap: 16px;">
          <button class="color-swatch active" data-color="#a9e34b" style="background: #a9e34b; color: #000;" onclick="changeAppThemeColor('#a9e34b', this)">✓</button>
          <button class="color-swatch" data-color="#74c0fc" style="background: #74c0fc; color: #000;" onclick="changeAppThemeColor('#74c0fc', this)"></button>
          <button class="color-swatch" data-color="#ff85a2" style="background: #ff85a2; color: #000;" onclick="changeAppThemeColor('#ff85a2', this)"></button>
          <button class="color-swatch" data-color="#ffa94d" style="background: #ffa94d; color: #000;" onclick="changeAppThemeColor('#ffa94d', this)"></button>
          <button class="color-swatch" data-color="#b197fc" style="background: #b197fc; color: #000;" onclick="changeAppThemeColor('#b197fc', this)"></button>
          <button class="color-swatch" data-color="#69db7c" style="background: #69db7c; color: #000;" onclick="changeAppThemeColor('#69db7c', this)"></button>
          <button class="color-swatch" data-color="#ff8787" style="background: #ff8787; color: #000;" onclick="changeAppThemeColor('#ff8787', this)"></button>
          <button class="color-swatch" data-color="#9e9e9e" style="background: #9e9e9e; color: #000;" onclick="changeAppThemeColor('#9e9e9e', this)"></button>
        </div>
      </div>

      <!-- Appearance Panel -->
      <div class="settings-section-title" style="animation: bentoFadeIn 0.5s backwards; animation-delay:0.35s;">Aparência</div>
      <div class="settings-group-card" style="animation-delay: 0.4s;">
        <!-- Item 1: Tema Escuro -->
        <div class="settings-item">
          <div class="settings-item-icon" style="background: rgba(169, 227, 75, 0.1); color: var(--ai);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Tema escuro</div>
            <div class="settings-item-subtitle" id="darkThemeSubtitle">Modo noturno ativado</div>
          </div>
          <label class="theme-switch" style="position: relative; display: inline-block; width: 50px; height: 28px; cursor: pointer;">
            <input type="checkbox" id="darkThemeToggle" style="opacity: 0; width: 0; height: 0;" checked onchange="toggleDarkTheme(this.checked)" />
            <span class="theme-slider" style="position: absolute; cursor: pointer; inset: 0; background-color: #333; border-radius: 24px; transition: .3s; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);"></span>
          </label>
        </div>

        <!-- Item 2: Tamanho do texto -->
        <div class="settings-item clickable" onclick="cycleTextSize()">
          <div class="settings-item-icon" style="background: rgba(177, 151, 252, 0.1); color: var(--purple);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Tamanho do texto</div>
            <div class="settings-item-subtitle" id="textSizeSubtitle">Médio</div>
          </div>
          <div style="color: var(--sub); display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        <!-- Item 3: Acessibilidade -->
        <div class="settings-item clickable" onclick="toggleAccessibilitySettings()">
          <div class="settings-item-icon" style="background: rgba(116, 192, 252, 0.1); color: var(--blue);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8a2 2 0 1 0 0 4 2 2 0 1 0 0-4z"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M6.34 17.66l-1.41 1.41"></path><path d="M19.07 4.93l-1.41 1.41"></path></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Acessibilidade</div>
            <div class="settings-item-subtitle" id="accessibilitySubtitle">Contraste e animações</div>
          </div>
          <div style="color: var(--sub); display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      </div>

      <!-- Notifications Panel -->
      <div class="settings-section-title" style="animation: bentoFadeIn 0.5s backwards; animation-delay:0.45s;">Notificações</div>
      <div class="settings-group-card" style="animation-delay: 0.5s;">
        <!-- Item: Lembretes de tarefas -->
        <div class="settings-item">
          <div class="settings-item-icon" style="background: rgba(255, 169, 77, 0.1); color: var(--orange);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Lembretes de tarefas</div>
            <div class="settings-item-subtitle" id="notifTasksSubtitle">Avisar antes do prazo</div>
          </div>
          <label class="theme-switch" style="position: relative; display: inline-block; width: 50px; height: 28px; cursor: pointer;">
            <input type="checkbox" id="notifTasksToggle" style="opacity: 0; width: 0; height: 0;" onchange="toggleNotification('tasks', this.checked)" />
            <span class="theme-slider" style="position: absolute; cursor: pointer; inset: 0; background-color: #333; border-radius: 24px; transition: .3s; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);"></span>
          </label>
        </div>

        <!-- Item: Resumo diário -->
        <div class="settings-item">
          <div class="settings-item-icon" style="background: rgba(177, 151, 252, 0.1); color: var(--purple);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Resumo diário</div>
            <div class="settings-item-subtitle" id="notifDailySubtitle">Toda manhã às 8h</div>
          </div>
          <label class="theme-switch" style="position: relative; display: inline-block; width: 50px; height: 28px; cursor: pointer;">
            <input type="checkbox" id="notifDailyToggle" style="opacity: 0; width: 0; height: 0;" onchange="toggleNotification('daily', this.checked)" />
            <span class="theme-slider" style="position: absolute; cursor: pointer; inset: 0; background-color: #333; border-radius: 24px; transition: .3s; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);"></span>
          </label>
        </div>

        <!-- Item: Push no celular -->
        <div class="settings-item">
          <div class="settings-item-icon" style="background: rgba(105, 219, 124, 0.1); color: var(--green);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Push no celular</div>
            <div class="settings-item-subtitle" id="notifPushSubtitle">Notificações instantâneas</div>
          </div>
          <label class="theme-switch" style="position: relative; display: inline-block; width: 50px; height: 28px; cursor: pointer;">
            <input type="checkbox" id="notifPushToggle" style="opacity: 0; width: 0; height: 0;" onchange="toggleNotification('push', this.checked)" />
            <span class="theme-slider" style="position: absolute; cursor: pointer; inset: 0; background-color: #333; border-radius: 24px; transition: .3s; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);"></span>
          </label>
        </div>
      </div>

      <!-- Account Panel -->
      <div class="settings-section-title" style="animation: bentoFadeIn 0.5s backwards; animation-delay:0.55s;">Conta</div>
      <div class="settings-group-card" style="animation-delay: 0.6s;">
        <!-- Item: Segurança -->
        <div class="settings-item clickable" onclick="openSecuritySettings()">
          <div class="settings-item-icon" style="background: rgba(116, 192, 252, 0.1); color: var(--blue);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Segurança</div>
            <div class="settings-item-subtitle">Senha e autenticação</div>
          </div>
          <div style="color: var(--sub); display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <!-- Item: Integrações -->
        <div class="settings-item clickable" onclick="openIntegrationsSettings()">
          <div class="settings-item-icon" style="background: rgba(169, 227, 75, 0.1); color: var(--ai);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Integrações</div>
            <div class="settings-item-subtitle">Google, Notion, Slack</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="integrationsCount" style="font-size: 11px; font-weight: 700; color: var(--ai); background: rgba(169, 227, 75, 0.1); border: 1px solid rgba(169, 227, 75, 0.25); border-radius: 20px; padding: 2px 8px;">3 ativas</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <!-- Item: Exportar dados -->
        <div class="settings-item clickable" onclick="exportUserData()">
          <div class="settings-item-icon" style="background: rgba(255, 169, 77, 0.1); color: var(--orange);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Exportar dados</div>
            <div class="settings-item-subtitle" id="exportDataSubtitle">Baixar backup completo</div>
          </div>
          <div style="color: var(--sub); display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>
      
      <!-- Support Panel -->
      <div class="settings-section-title" style="animation: bentoFadeIn 0.5s backwards; animation-delay:0.65s;">Suporte</div>
      <div class="settings-group-card" style="animation-delay: 0.7s;">
        <!-- Item: Central de ajuda -->
        <div class="settings-item clickable" onclick="openHelpCenter()">
          <div class="settings-item-icon" style="background: rgba(177, 151, 252, 0.1); color: var(--purple);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Central de ajuda</div>
          </div>
          <div style="color: var(--sub); display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <!-- Item: Enviar feedback -->
        <div class="settings-item clickable" onclick="openFeedbackForm()">
          <div class="settings-item-icon" style="background: rgba(177, 151, 252, 0.1); color: var(--purple);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Enviar feedback</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; font-weight: 800; color: var(--ai); background: rgba(169, 227, 75, 0.15); border: 1px solid rgba(169, 227, 75, 0.3); border-radius: 20px; padding: 3px 10px; text-transform:uppercase;">Novo</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <!-- Item: Termos e privacidade -->
        <div class="settings-item clickable" onclick="openTermsAndPrivacy()">
          <div class="settings-item-icon" style="background: rgba(177, 151, 252, 0.1); color: var(--purple);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div style="flex: 1; text-align: left;">
            <div class="settings-item-title">Termos e privacidade</div>
          </div>
          <div style="color: var(--sub); display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>

        <!-- App Version -->
        <div style="text-align: center; padding: 16px 0 10px; color: var(--sub); font-size: 11px; font-weight:600; opacity: 0.5; animation: bentoFadeIn 0.5s backwards; animation-delay:0.8s;">TarefasIA V2.0 Premium · Munago Desenvolvedora</div>
      </div>\n`;

html = html.substring(0, startConfig) + newConfigHTML + html.substring(endConfig);

fs.writeFileSync('public/index.html', html);
console.log('Settings Redesign Applied Successfully!');
