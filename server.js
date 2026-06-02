// server.js — Proxy seguro para a API do Google Gemini
// A chave pode ser definida via .env (produção) ou enviada pelo cliente (desenvolvimento local).

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const fetch      = require('node-fetch');
const path       = require('path');
const { createClient } = require('@supabase/supabase-js');
const rateLimit  = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuração do cliente Supabase (usando a Service Role Key para validar JWTs do Auth)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('aqui')) {
  console.warn('\n⚠️  AVISO: Credenciais do Supabase não configuradas corretamente no arquivo .env.');
  console.warn('   A autenticação de segurança das rotas /api irá falhar até que sejam preenchidas.\n');
}

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder'
);

// ── Rate Limiting (Máximo de 30 requisições por minuto por IP na rota /api/chat) ──
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // limite de 30 requisições
  message: { error: 'Limite de requisições excedido. Por favor, aguarde um minuto antes de tentar novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/chat', chatLimiter);

// ── Middleware de Validação do JWT do Supabase ──────────────────────────────
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação ausente ou inválido.' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  req.user = user; // Anexa o usuário à requisição
  next();
};

app.use('/api', authMiddleware);

// Serve os arquivos estáticos (public/index.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ── Endpoint proxy para o Google Gemini ──────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  // Prioridade: GEMINI_API_KEY > GOOGLE_API_KEY > header do cliente
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || req.headers['x-client-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Chave de API do Gemini não configurada no servidor. Defina GEMINI_API_KEY no arquivo .env.'
    });
  }

  const { systemPrompt, userMessage, contents } = req.body;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt || '' }]
    },
    contents: contents || [
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    }
  };

  try {
    const response = await fetch(geminiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || 'Erro desconhecido.';
      return res.status(response.status).json({ error: errMsg, status: response.status });
    }

    // Extrai o texto da resposta do Gemini
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
    res.json({ text });

  } catch (err) {
    console.error('❌ Erro ao chamar Gemini:', err.message);
    res.status(500).json({ error: 'Falha ao conectar com a API do Google: ' + err.message });
  }
});

// ── Status: informa ao frontend se a chave já está no servidor ───────────────
app.get('/api/status', (req, res) => {
  res.json({ serverHasKey: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) });
});

// Fallback: qualquer rota desconhecida retorna o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const keySource = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? '.env' : 'interface do usuário';
  console.log(`\n✅ TarefasIA rodando em http://localhost:${PORT}`);
  console.log(`   Modelo: Google Gemini 3.1 Flash Lite`);
  console.log(`   Chave de API: configurada via ${keySource}`);
  console.log(`   Pressione Ctrl+C para parar.\n`);
});
