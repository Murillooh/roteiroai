const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Remove callGeminiDirect usage
html = html.replace(/if \(localKey\) \{\s*return await callGeminiDirect\([^)]+\);\s*\}/g, '');

// 2. Remove localKey assignment entirely and set it to null
html = html.replace(/const localKey = \(localStorage\.getItem\('google_api_key'\) \|\| '[^']+'\);/g, 'const localKey = null;');
html = html.replace(/const localKey = localStorage\.getItem\('google_api_key'\);/g, 'const localKey = null;');
html = html.replace(/const existing = \(localStorage\.getItem\('google_api_key'\) \|\| '[^']+'\) \|\| '';/g, "const existing = '';");

// 3. Remove the entire `if (!serverHasKey && !localKey) { alert(...); showModal(); return; }` block
html = html.replace(/if \(!serverHasKey && !localKey\) \{\s*alert\([^)]+\);\s*showModal\(\);\s*return;\s*\}/g, '');
html = html.replace(/if \(!serverHasKey && !localKey\) \{\s*addAIMessage\([^)]+\);\s*showModal\(\);\s*return;\s*\}/g, '');

// 4. Remove `if (!serverHasKey && !localKey) return fallback;`
html = html.replace(/if \(!serverHasKey && !localKey\) return fallback;/g, '');

// 5. checkAIStatus fix
html = html.replace(/const isReady\s*=\s*serverHasKey\s*\|\|\s*!!localKey;/g, 'const isReady = serverHasKey;');
html = html.replace(/const isReady\s*=\s*isAIReady\s*\|\|\s*!!localKey;/g, 'const isReady = isAIReady;');

fs.writeFileSync('scratch/test_clean.html', html);
console.log('Test file created.');
