const fs = require('fs');
let c = fs.readFileSync('public/index.html', 'utf8');

const target1 = '<div class="db-box">\n          <div class="db-box-title">PRODUTIVIDADE POR DIA</div>';
const replacement1 = '<div class="db-box" style="display:flex; flex-direction:column;">\n          <div class="db-box-title">PRODUTIVIDADE POR DIA</div>';

c = c.replace(target1, replacement1).replace(target1.replace(/\n/g, '\r\n'), replacement1.replace(/\n/g, '\r\n'));

const target2 = '<div class="db-chart-container" id="dbChart"></div>';
const replacement2 = '<div class="db-chart-container" id="dbChart" style="margin: auto 0;"></div>';

c = c.replace(target2, replacement2).replace(target2.replace(/\n/g, '\r\n'), replacement2.replace(/\n/g, '\r\n'));

fs.writeFileSync('public/index.html', c);
console.log('Fixed chart centering!');
