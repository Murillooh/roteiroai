const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const regex = /const pdfBlob = await html2pdf\(\)\.set\(opt\)\.from\(element\)\.outputPdf\('blob'\);[\s\S]*?const base64 = await blobToBase64\(pdfBlob\);/;
const replacement = `const dataUri = await html2pdf().set(opt).from(element).outputPdf('datauristring');

    if (!dataUri || dataUri.length < 100) {
      throw new Error('PDF vazio.');
    }

    updateStatus('Salvando...');

    const { Filesystem, Share } = window.Capacitor.Plugins;
    const base64 = dataUri.split(',')[1];`;

html = html.replace(regex, replacement);

fs.writeFileSync('public/index.html', html);
if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
  fs.writeFileSync('android/app/src/main/assets/public/index.html', html);
}
console.log('Replaced blob with datauristring');
