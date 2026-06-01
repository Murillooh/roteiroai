const https = require('https');

require('dotenv').config();
const apiKey = process.env.GOOGLE_API_KEY || '';

const testModel = (modelName) => {
  return new Promise((resolve) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const payload = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Oi' }] }]
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve({ model: modelName, success: true, text: json.candidates?.[0]?.content?.parts?.[0]?.text });
          } else {
            resolve({ model: modelName, success: false, error: json.error?.message || `Status: ${res.statusCode}` });
          }
        } catch (e) {
          resolve({ model: modelName, success: false, error: 'JSON Parse Error' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ model: modelName, success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
};

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];

async function run() {
  console.log('Testing models to find a working one...');
  for (const model of modelsToTest) {
    const result = await testModel(model);
    if (result.success) {
      console.log(`✅ ${model} works! Response: "${result.text.trim().substring(0, 30)}..."`);
    } else {
      console.log(`❌ ${model} failed: ${result.error}`);
    }
  }
}

run();
