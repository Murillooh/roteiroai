const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(/container\.style\.left = '-9999px';/g, `container.style.left = '0px';
    container.style.width = '0px';
    container.style.height = '0px';
    container.style.overflow = 'hidden';`);
html = html.replace(/container\.style\.top = '-9999px';/g, `container.style.top = '0px';`);

fs.writeFileSync('public/index.html', html);
if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
  fs.writeFileSync('android/app/src/main/assets/public/index.html', html);
}
console.log('Fixed container position');
