const fs = require('fs');

const newFunc = `async function exportPDFElement(element, opt, loadingModal = null, originalTitle = '', originalDesc = '') {
  if (!loadingModal) {
    loadingModal = document.getElementById('loadingPdfModal');
  }

  let originalBg = '';
  if (loadingModal) {
    originalBg = loadingModal.style.backgroundColor;
    loadingModal.style.backgroundColor = '#1a1a1a'; // Solid background to hide PDF
  }

  const updateStatus = (text) => {
    if (loadingModal) {
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalDesc) modalDesc.innerText = text;
    }
    console.log('PDF Status:', text);
  };

  const cleanup = () => {
    if (element && element.parentNode) element.parentNode.removeChild(element);
    if (loadingModal) {
      loadingModal.style.display = 'none';
      loadingModal.style.backgroundColor = originalBg;
      const modalTitle = loadingModal.querySelector('.modal-title');
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalTitle && originalTitle) modalTitle.innerHTML = originalTitle;
      if (modalDesc && originalDesc) modalDesc.innerHTML = originalDesc;
    }
  };

  try {
    updateStatus('Preparando documento visual...');

    // Substituir dimensões mm por px para evitar crash no html2canvas
    if (element.style.width && element.style.width.includes('mm')) element.style.width = '800px';
    
    // Configuração crucial para NÃO travar a memória (OOM):
    // Tem que estar no DOM visível, na coordenada 0,0.
    // Usamos z-index: 1 (fica atrás do modal que tem z-index alto e fundo sólido).
    element.style.position = 'absolute';
    element.style.top = '0px';
    element.style.left = '0px';
    element.style.zIndex = '1';
    
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 500));

    updateStatus('Iniciando conversão...');
    
    const isNative = window.Capacitor && window.Capacitor.isNative;
    
    opt.html2canvas = {
      ...opt.html2canvas,
      scale: 2,
      useCORS: true,
      scrollY: 0,
      scrollX: 0,
      windowWidth: 800
    };

    if (!isNative) {
      updateStatus('Gerando PDF Web...');
      await html2pdf().set(opt).from(element).save();
      cleanup();
      return;
    }

    updateStatus('Renderizando páginas...');
    const dataUri = await html2pdf().set(opt).from(element).outputPdf('datauristring');

    if (!dataUri || dataUri.length < 100) {
      throw new Error('PDF vazio ou falha na conversão.');
    }

    updateStatus('Salvando PDF no dispositivo...');

    const { Filesystem, Share } = window.Capacitor.Plugins;
    const base64 = dataUri.split(',')[1];
    
    const writeResult = await Filesystem.writeFile({
      path: opt.filename || 'relatorio.pdf',
      data: base64,
      directory: 'CACHE',
      recursive: true
    });

    updateStatus('Abrindo menu de envio...');

    await Share.share({
      title: opt.filename || 'Relatório PDF',
      url: writeResult.uri,
      dialogTitle: 'Visualizar Relatório'
    });

    cleanup();
  } catch (err) {
    console.error('Erro detalhado PDF:', err);
    alert('❌ Erro ao gerar PDF: ' + err.message);
    cleanup();
  }
}`;

let html = fs.readFileSync('public/index.html', 'utf8');

// Replace all mm heights
html = html.replace(/296mm/g, '1120px');
html = html.replace(/297mm/g, '1120px');

const startIdx = html.indexOf('async function exportPDFElement');
const endIdx = html.indexOf('async function downloadCustomPeriodPDF');

if (startIdx > -1 && endIdx > -1) {
  html = html.substring(0, startIdx) + newFunc + '\n\n' + html.substring(endIdx);
  fs.writeFileSync('public/index.html', html);
  console.log('public/index.html updated successfully.');
  
  if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
     fs.writeFileSync('android/app/src/main/assets/public/index.html', html);
     console.log('android index.html updated successfully.');
  }
} else {
  console.error('Could not find function bounds.');
}
