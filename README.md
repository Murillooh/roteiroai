# 📋 TarefasIA — Gestão de Tarefas com Inteligência Artificial

O **TarefasIA** é uma plataforma moderna e robusta para gerenciamento de tarefas potencializada por inteligência artificial. O projeto possui suporte multiplataforma (Web e Mobile) através do Capacitor, integrações seguras com a API do Google Gemini (`gemini-2.5-flash`) e autenticação de usuários via Supabase.

---

## 🚀 Recursos Principais

- **Proxy Seguro para Gemini**: Roteamento seguro de requisições de IA através de um servidor Express, protegendo as chaves de API do lado do cliente.
- **Respostas em Tempo Real (Streaming/SSE)**: Integração via Server-Sent Events (SSE) com a API do Gemini 2.5 Flash para geração de conteúdo instantânea.
- **Autenticação Segura**: Validação de segurança nas rotas da API utilizando tokens JWT do **Supabase Auth**.
- **Controle de Vazão (Rate Limiting)**: Proteção contra abusos com limite máximo de 30 requisições por minuto por IP na rota de chat.
- **Suporte Mobile Nativo**: Empacotamento para Android e iOS utilizando o **Capacitor**.
- **Desenvolvimento Fluido (LiveReload)**: Atualização automática em tempo real do frontend no navegador durante o desenvolvimento local.
- **Script de Sincronização e Deploy Automatizado**: Script de automação que realiza a sincronização com plataformas mobile nativas, adiciona arquivos ao Git, faz commit e realiza o push para o GitHub/Vercel de forma unificada.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** & **Express**: Servidor HTTP e API proxy.
- **Supabase JS Client**: Validação e integração com o banco de dados e autenticação.
- **Express Rate Limit**: Controle de taxa e segurança.
- **dotenv**: Gerenciamento de variáveis de ambiente de forma segura.

### Frontend
- **HTML5** & **CSS3**: Interface rica, fluida e responsiva.
- **JavaScript (Vanilla)**: Lógica do cliente e interação com o servidor.

### Mobile & Build
- **Capacitor (CLI, Core, Android, iOS)**: Envelopamento híbrido nativo para dispositivos móveis.
- **Nodemon**: Reinício automático do servidor local durante o desenvolvimento.
- **LiveReload** & **Connect-LiveReload**: Atualização do navegador em tempo real ao modificar arquivos do frontend.

---

## ⚙️ Pré-requisitos e Configuração

Antes de começar, certifique-se de ter instalado em sua máquina:
1. **Node.js** (versão 18 ou superior recomendada).
2. **Git**.
3. **Android Studio** (se deseja compilar para Android).
4. **Xcode** (se deseja compilar para iOS - necessário macOS).

### Configurando o arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example` preenchendo as seguintes informações:

```env
# Porta do servidor local (padrão: 3000)
PORT=3000

# Chave de API do Google Gemini
# Obtenha uma chave gratuita em: https://aistudio.google.com/apikey
GEMINI_API_KEY=sua_chave_gemini_aqui

# Credenciais do Supabase (para autenticação de rotas protegidas)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

---

## 💻 Como Executar (Localmente)

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie em modo de desenvolvimento (com nodemon e LiveReload):**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em [http://localhost:3000](http://localhost:3000). Qualquer alteração na pasta `public/` atualizará o navegador automaticamente.

3. **Inicie em modo de produção:**
   ```bash
   npm start
   ```

---

## 📱 Versão Mobile (Capacitor)

O projeto está configurado para gerar aplicativos móveis nativos de forma simples.

- **Sincronizar arquivos web com as pastas nativas:**
  ```bash
  npm run cap:sync
  ```

- **Android:**
  - Abrir o projeto no Android Studio:
    ```bash
    npm run cap:android
    ```
  - Executar o app diretamente em um dispositivo/emulador Android conectado:
    ```bash
    npm run cap:run:android
    ```

- **iOS:**
  - Abrir o projeto no Xcode (necessário macOS):
    ```bash
    npm run cap:ios
    ```
  - Executar o app diretamente em um dispositivo/emulador iOS conectado:
    ```bash
    npm run cap:run:ios
    ```

---

## 🌐 Deploy e Sincronização

O script de deploy automatiza a sincronização do Capacitor, faz commit no repositório Git e envia as alterações para o GitHub, o que por sua vez aciona o build automático na Vercel (se configurado).

Para executar o script de deploy rápido, rode o comando:

```bash
npm run deploy
```

Você também pode passar uma mensagem de commit personalizada:
```bash
npm run deploy -- "sua mensagem de commit aqui"
```

Se nenhuma mensagem for fornecida, o commit será criado com o padrão: `update: auto-sync [data e hora]`.

---

## 📁 Estrutura do Projeto

```text
├── android/                   # Pasta nativa do projeto Android (Capacitor)
├── ios/                       # Pasta nativa do projeto iOS (Capacitor) (opcional)
├── public/                    # Arquivos estáticos do frontend (HTML, CSS, JS)
│   ├── index.html             # Interface principal da aplicação
│   ├── offline-db.js          # Lógica de banco de dados offline/local
│   └── vazio.html             # Página auxiliar em branco
├── scripts/
│   └── deploy.js              # Script automatizado de deploy e sincronização Git/Mobile
├── server.js                  # Ponto de entrada do servidor Node.js/Express e Proxy da API
├── capacitor.config.json      # Configurações do Capacitor (App ID, Nome, SplashScreen, etc.)
├── vercel.json                # Configuração de rotas e build para deploy na Vercel
├── package.json               # Dependências e scripts do projeto
├── .env                       # Variáveis de ambiente locais (não versionado)
└── README.md                  # Documentação do projeto
```
