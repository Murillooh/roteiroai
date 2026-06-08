const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const m = html.match(/const\s+(API_ENDPOINT|BASE_URL|geminiUrl)\s*=[^;]+/g);
console.log(m);

const start = html.indexOf('callGeminiDirect');
console.log(html.substring(start, start + 300));
