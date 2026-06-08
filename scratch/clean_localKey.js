const fs = require('fs');

function cleanLocalKeyLogic(html) {
  // We will find lines with `const localKey =` and remove the whole block until `return; }` or `return fallback;`

  // 1. callGeminiWithProxyFallback: remove `if (localKey) { return await callGeminiDirect(...) }`
  html = html.replace(/if \(localKey\) \{\s*return await callGeminiDirect\([^)]+\);\s*\}/, '');

  // 2. Remove all `const localKey = ...` and the `if (!localKey)` and `if (!serverHasKey)` blocks.
  // We can do this safely by matching:
  // const localKey = [...];
  // let serverHasKey = false;
  // ...
  // if (!serverHasKey && !localKey) { ... }
  
  const regexBlocks = /const localKey = [^;]+;\s*let serverHasKey = false;\s*(?:if \(!localKey\) \{[\s\S]*?\}|try \{[\s\S]*?\} catch[^}]+\})\s*if \(!serverHasKey(?: && !localKey)?\) \{[\s\S]*?return;\s*\}/g;
  
  html = html.replace(regexBlocks, '');
  
  // For buildMonthlyAISummary (returns fallback):
  const regexFallback = /const localKey = [^;]+;\s*let serverHasKey = false;\s*try \{[\s\S]*?\} catch[^}]+\}\s*if \(!serverHasKey(?: && !localKey)?\) return fallback;/g;
  html = html.replace(regexFallback, '');

  // For checkAIStatus
  html = html.replace(/const localKey = [^;]+;\s*const isReady\s*=\s*serverHasKey\s*\|\|\s*!!localKey;\s*setStatus\(isReady\);/g, 'setStatus(serverHasKey);');
  
  // For the AI UI update
  html = html.replace(/const localKey = [^;]+;\s*const isReady = isAIReady \|\| !!localKey;\s*if \(isReady\) \{/g, 'if (isAIReady) {');

  // For the callGeminiWithProxyFallback calls, we need to pass null for localKey
  html = html.replace(/callGeminiWithProxyFallback\(([^,]+),\s*([^,]+),\s*localKey/g, 'callGeminiWithProxyFallback($1, $2, null');

  return html;
}

let html = fs.readFileSync('public/index.html', 'utf8');

// The regex might not match if there's subtle formatting differences.
// Let's do it manually by finding `const localKey =` and removing lines.
const lines = html.split('\n');
const newLines = [];
let skipMode = 0; // 0: normal, 1: skipping block

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("const localKey = (localStorage.getItem('google_api_key')") || line.includes("const localKey = localStorage.getItem('google_api_key')")) {
    // Start skipping
    skipMode = 1;
    continue;
  }
  
  if (skipMode === 1) {
    // If we hit the end of the check block
    if (line.includes('if (!serverHasKey && !localKey) {') || line.includes('if (!serverHasKey && !localKey) return fallback;')) {
      skipMode = 2; // wait for closing brace or just next line
      if (line.includes('return fallback;')) {
        skipMode = 0;
      }
      continue;
    }
    // Also skip checkAIStatus blocks
    if (line.includes('const isReady') && line.includes('serverHasKey || !!localKey')) {
      newLines.push(line.replace('const isReady  = serverHasKey || !!localKey;', 'const isReady = serverHasKey;').replace('const isReady = isAIReady || !!localKey;', 'const isReady = isAIReady;'));
      skipMode = 0;
      continue;
    }
    // If we are just skipping the status check:
    continue;
  }
  
  if (skipMode === 2) {
    if (line.trim() === '}') {
      skipMode = 0;
    }
    continue;
  }
  
  // Remove direct call
  if (line.includes('if (localKey) {') && lines[i+1].includes('callGeminiDirect')) {
    i += 2; // skip this and next line, and the closing brace
    continue;
  }
  
  // Replace `localKey` variable usage with `null`
  if (line.includes('callGeminiWithProxyFallback(')) {
     let mod = line.replace(/,\s*localKey/, ', null');
     newLines.push(mod);
     continue;
  }
  
  newLines.push(line);
}

fs.writeFileSync('public/index.html', newLines.join('\n'));
console.log('Cleaned localKey logic manually.');
