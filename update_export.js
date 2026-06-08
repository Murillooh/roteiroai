const fs = require('fs');

const newFunc = `async function exportPDFElement(element, opt, loadingModal = null, originalTitle = '', originalDesc = '') {
  const updateStatus = (text) => {
    if (loadingModal) {
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalDesc) modalDesc.innerText = text;
    }
  };

  const cleanup = () => {
    if (element && element.parentNode) element.parentNode.removeChild(element);
    if (loadingModal) {
      loadingModal.style.display = 'none';
      const modalTitle = loadingModal.querySelector('.modal-title');
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalTitle && originalTitle) modalTitle.innerHTML = originalTitle;
      if (modalDesc && originalDesc) modalDesc.innerHTML = originalDesc;
    }
  };

  try {
    updateStatus('Preparando documento...');

    // Limpa propriedades que causavam travamento no html2canvas
    element.style.position = 'relative';
    element.style.top = 'auto';
    element.style.left = 'auto';
    element.style.zIndex = 'auto';
    
    // Adicionar temporariamente a um container invisível mas renderizável
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.appendChild(element);
    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 500));

    updateStatus('Lendo HTML...');
    
    const isNative = window.Capacitor && window.Capacitor.isNative;
    
    opt.html2canvas = {
      ...opt.html2canvas,
      scale: 2,
      useCORS: true,
      scrollY: 0,
      scrollX: 0
    };

    if (!isNative) {
      console.log('🔵 Tentando html2pdf().save()...');
      await html2pdf().set(opt).from(element).save();
      container.remove();
      cleanup();
      return;
    }

    updateStatus('Convertendo (Mobile)...');
    const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');

    if (!pdfBlob || pdfBlob.size < 1000) {
      throw new Error('PDF vazio.');
    }

    updateStatus('Salvando...');

    const { Filesystem, Share } = window.Capacitor.Plugins;
    const base64 = await blobToBase64(pdfBlob);
    
    const writeResult = await Filesystem.writeFile({
      path: opt.filename || 'relatorio.pdf',
      data: base64,
      directory: 'CACHE',
      recursive: true
    });

    updateStatus('Compartilhando...');

    await Share.share({
      title: opt.filename || 'Relatório PDF',
      url: writeResult.uri,
      dialogTitle: 'Visualizar Relatório'
    });

    container.remove();
    cleanup();
  } catch (err) {
    console.error('Erro detalhado PDF:', err);
    if (typeof container !== 'undefined') container.remove();
    alert('❌ Erro ao gerar PDF: ' + err.message);
    cleanup();
  }
}`;

let html = fs.readFileSync('public/index.html', 'utf8');
const startIdx = html.indexOf('async function exportPDFElement');
const endIdx = html.indexOf('async function downloadCustomPeriodPDF');

if (startIdx > -1 && endIdx > -1) {
  html = html.substring(0, startIdx) + newFunc + '\n\n' + html.substring(endIdx);
  fs.writeFileSync('public/index.html', html);
  console.log('public/index.html updated successfully.');
  
  // Update android/app/src/main/assets/public/index.html as well
  if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
     fs.writeFileSync('android/app/src/main/assets/public/index.html', html);
     console.log('android index.html updated successfully.');
  }
} else {
  console.error('Could not find function bounds.');
}
