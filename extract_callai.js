const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const start = html.indexOf('const reportMatch = reply.match');
if (start === -1) {
  console.log("NOT FOUND by exact string. Trying regex...");
  const m = html.match(/const\s+reportMatch[\s\S]*?\n\s*\}/);
  if (m) console.log(m[0]);
  else console.log("Still not found");
} else {
  console.log(html.substring(start, start + 1000));
}

const callAiStart = html.indexOf('async function callAI');
const callAiEnd = html.indexOf('// ── Util', callAiStart);
console.log(html.substring(callAiStart + 4500, callAiStart + 6000));
