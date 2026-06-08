const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Remove Modal HTML
html = html.replace(/<!-- API KEY MODAL -->[\s\S]*?<div class="modal-overlay" id="apiModal" style="display:none">[\s\S]*?<\/div>\s*<\/div>/, '');

// 2. Remove Button in Settings
html = html.replace(/<!-- Item: Chave da API -->[\s\S]*?<div style="display: flex; align-items: center; padding: 14px 16px; cursor: pointer;" onclick="showModal\(\)">[\s\S]*?<\/div>\s*<\/div>/, '');

// 3. Remove Modal functions
html = html.replace(/function showModal\(\) \{[\s\S]*?function saveApiKey\(\) \{[\s\S]*?\}\n/, '');

// 4. Remove localKey logic from function callAI
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*let serverHasKey = false;\s*if \(\!localKey\) \{[\s\S]*?if \(\!serverHasKey && \!localKey\) \{[\s\S]*?return;\s*\}/, '');

// 5. Remove localKey logic from function analyzeWeek
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*let serverHasKey = false;\s*if \(\!localKey\) \{[\s\S]*?if \(\!serverHasKey && \!localKey\) \{[\s\S]*?return;\s*\}/, '');

// 6. Remove localKey logic from function analyzeDay
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*let serverHasKey = false;\s*if \(\!localKey\) \{[\s\S]*?if \(\!serverHasKey && \!localKey\) \{[\s\S]*?return;\s*\}/, '');

// 7. Remove localKey logic from function buildMonthlyAISummary
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*let serverHasKey = false;\s*try \{[\s\S]*?if \(\!serverHasKey && \!localKey\) return fallback;/, '');

// 8. Update checkAIStatus
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*const isReady  = serverHasKey \|\| \!\!localKey;\s*setStatus\(isReady\);/, 'setStatus(serverHasKey);');
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);\s*const isReady = isAIReady \|\| \!\!localKey;\s*if \(isReady\) \{/, 'if (isAIReady) {');

// 9. Update callGeminiWithProxyFallback calls to remove localKey parameter passing
html = html.replace(/callGeminiWithProxyFallback\(([^,]+), ([^,]+), localKey/g, 'callGeminiWithProxyFallback($1, $2, null');

// 10. Remove apiModal click listener
html = html.replace(/document\.getElementById\('apiModal'\)\.addEventListener\('click', function\(e\) \{[\s\S]*?\}\);/, '');

fs.writeFileSync('public/index.html', html);
console.log('Cleaned up index.html');
