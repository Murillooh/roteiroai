const fs = require('fs');

const path = 'public/index.html';
let html = fs.readFileSync(path, 'utf8');

const oldLogic = `if (!isNative) {
      updateStatus('Gerando PDF Web...');
      await html2pdf().set(opt).from(element).save();
      cleanup();
      return;
    }`;

const newLogic = `if (!isNative) {
      updateStatus('Gerando PDF Web...');
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      
      const file = new File([pdfBlob], opt.filename || 'relatorio.pdf', { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        updateStatus('Abrindo menu de envio...');
        try {
          await navigator.share({
            files: [file],
            title: opt.filename || 'Relatório PDF',
            text: 'Aqui está o relatório em PDF.'
          });
        } catch (shareErr) {
          console.warn('Share failed or cancelled:', shareErr);
          // Fallback to download
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = opt.filename || 'relatorio.pdf';
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename || 'relatorio.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
      cleanup();
      return;
    }`;

if (html.includes(oldLogic)) {
  html = html.replace(oldLogic, newLogic);
  fs.writeFileSync(path, html);
  console.log("Web logic replaced successfully.");
} else {
  console.log("Could not find old web logic block.");
}

const androidPath = 'android/app/src/main/assets/public/index.html';
if (fs.existsSync(androidPath)) {
  let androidHtml = fs.readFileSync(androidPath, 'utf8');
  if (androidHtml.includes(oldLogic)) {
    androidHtml = androidHtml.replace(oldLogic, newLogic);
    fs.writeFileSync(androidPath, androidHtml);
    console.log("Web logic replaced in Android assets.");
  }
}
