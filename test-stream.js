const https = require('https');
require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`;
const payload = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Oi' }] }] });
const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
});
req.write(payload);
req.end();
