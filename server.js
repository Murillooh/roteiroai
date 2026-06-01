// server.js — Proxy seguro para a API do Google Gemini
// A chave pode ser definida via .env (produção) ou enviada pelo cliente (desenvolvimento local).

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos (public/index.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ── Endpoint proxy para o Google Gemini ──────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  // Prioridade: .env (mais seguro) > header do cliente (desenvolvimento local)
  const apiKey = process.env.GOOGLE_API_KEY || req.headers['x-client-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Chave de API não configurada. Defina GOOGLE_API_KEY no arquivo .env ou configure via interface.'
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
  res.json({ serverHasKey: !!process.env.GOOGLE_API_KEY });
});

// Fallback: qualquer rota desconhecida retorna o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const keySource = process.env.GOOGLE_API_KEY ? '.env' : 'interface do usuário';
  console.log(`\n✅ RoteiroAI rodando em http://localhost:${PORT}`);
  console.log(`   Modelo: Google Gemini 3.1 Flash Lite`);
  console.log(`   Chave de API: configurada via ${keySource}`);
  console.log(`   Pressione Ctrl+C para parar.\n`);
});
