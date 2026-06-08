const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Fix Modal ID so we can actually see the loading steps
html = html.replace(/loadingPdfModal/g, "loadingModal");

// Clean up html2canvas options that could cause hanging
html = html.replace(/letterRendering: true, /g, '');
html = html.replace(/antialiasing: true, /g, '');
html = html.replace(/windowWidth: 800/g, '');

fs.writeFileSync('public/index.html', html);
if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
  fs.writeFileSync('android/app/src/main/assets/public/index.html', html);
}
console.log('Fixed Modal ID and removed problematic html2canvas options.');
