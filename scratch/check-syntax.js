const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('public/index.html', 'utf8');

// Simple regex to extract script blocks (ignoring external scripts)
const scriptRegex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

console.log('Extracting and checking syntax of inline scripts...');

while ((match = scriptRegex.exec(html)) !== null) {
  const code = match[1];
  count++;
  try {
    new vm.Script(code);
    console.log(`Script block #${count} syntax is OK`);
  } catch (err) {
    console.error(`❌ Syntax Error in Script block #${count}:`, err.message);
    
    // Print lines around the error if line numbers are in the error
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

console.log(`Checked ${count} inline script blocks.`);
