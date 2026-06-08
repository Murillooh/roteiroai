const fs = require('fs');

let indexHtml = fs.readFileSync('public/index.html', 'utf8');
indexHtml = indexHtml.replace(/gemini-2\.5-flash/g, 'gemini-1.5-flash');
fs.writeFileSync('public/index.html', indexHtml);

if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
  fs.writeFileSync('android/app/src/main/assets/public/index.html', indexHtml);
}

let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = serverJs.replace(/gemini-2\.5-flash/g, 'gemini-1.5-flash');
fs.writeFileSync('server.js', serverJs);

console.log('Replaced gemini-2.5-flash with gemini-1.5-flash');
