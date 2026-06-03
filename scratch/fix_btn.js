const fs = require('fs');
let c = fs.readFileSync('public/index.html', 'utf8');
c = c.replace('btn.onclick = showAppConfigModal;', 'btn.onclick = () => { setActiveDay("config"); };');
fs.writeFileSync('public/index.html', c);
console.log('Button fixed!');
