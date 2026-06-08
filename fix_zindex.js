const fs = require('fs');
const files = ['android/app/src/main/assets/public/index.html', 'public/index.html'];
files.forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  html = html.split("zIndex = '1'").join("zIndex = '-1'");
  html = html.split("z-index', '1'").join("z-index', '-1'");
  fs.writeFileSync(file, html);
  console.log('Updated ' + file);
});
