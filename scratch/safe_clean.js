const fs = require('fs');

function replaceBetween(str, startStr, endStr, replacement = '') {
  const startIndex = str.indexOf(startStr);
  if (startIndex === -1) return str;
  const endIndex = str.indexOf(endStr, startIndex + startStr.length);
  if (endIndex === -1) return str;
  return str.substring(0, startIndex) + replacement + str.substring(endIndex + endStr.length);
}

let html = fs.readFileSync('public/index.html', 'utf8');

// Update to gemini-2.0-flash
html = html.replace(/gemini-1\.5-flash/g, 'gemini-2.0-flash');

// Remove API Key Modal
html = replaceBetween(html, '<!-- API KEY MODAL -->', '</div>\r\n</div>\r\n\r\n\r\n<!-- BOTTOM NAVIGATION -->');
if (html.includes('<!-- API KEY MODAL -->')) {
  // Try with \n instead of \r\n
  html = replaceBetween(html, '<!-- API KEY MODAL -->', '</div>\n</div>\n\n\n<!-- BOTTOM NAVIGATION -->');
}

// Remove Settings Button for API Key
const btnStart = '<!-- Item: Chave da API -->';
const btnEnd = '</div>\n        </div>\n      </div>\n\n      <!-- Notifications Panel -->';
html = replaceBetween(html, btnStart, btnEnd);
if (html.includes('<!-- Item: Chave da API -->')) {
  html = replaceBetween(html, '<!-- Item: Chave da API -->', '</div>\r\n        </div>\r\n      </div>\r\n\r\n      <!-- Notifications Panel -->');
}
html = html + '\n      <!-- Notifications Panel -->'; // wait, if I replace till btnEnd, I need to restore the Notifications Panel start
// Better approach:
html = html.replace(/<!-- Item: Chave da API -->[\s\S]*?(?=<!-- Notifications Panel -->)/, '');
html = html.replace(/<!-- API KEY MODAL -->[\s\S]*?(?=<!-- BOTTOM NAVIGATION -->)/, '');

// Remove showModal / closeModal / saveApiKey
html = html.replace(/function showModal\(\) \{[\s\S]*?function saveApiKey\(\) \{[\s\S]*?\}\n/, '');

// Remove localKey check from callAI
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*let serverHasKey = false;\s*if \(\!localKey\) \{[\s\S]*?if \(\!serverHasKey && \!localKey\) \{[\s\S]*?return;\s*\}/, '');

// Remove localKey check from buildMonthlyAISummary
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*let serverHasKey = false;\s*try \{[\s\S]*?if \(\!serverHasKey && \!localKey\) return fallback;/, '');

// Replace old error message
html = html.replace(/Clique em <strong>⚙ API<\/strong> e insira uma chave válida\./g, 'Verifique se a variável GEMINI_API_KEY está configurada na Vercel.');

// Remove click listener
html = html.replace(/document\.getElementById\('apiModal'\)\.addEventListener\('click', function\(e\) \{[\s\S]*?\}\);/, '');

// In callGeminiWithProxyFallback definition, replace localKey with null? No, just keep localKey and ignore it
// The syntax error was from replacing `localKey` with `null`.
// Let's just avoid replacing `localKey` parameter entirely!

fs.writeFileSync('public/index.html', html);
console.log('Done');
