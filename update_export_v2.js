const fs = require('fs');

const newFunc = `async function exportPDFElement(element, opt, loadingModal = null, originalTitle = '', originalDesc = '') {
  // Tentar encontrar o modal se não foi passado (caso do botão de enviar da IA)
  if (!loadingModal) {
    loadingModal = document.getElementById('loadingPdfModal');
  }

  const updateStatus = (text) => {
    if (loadingModal) {
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalDesc) modalDesc.innerText = text;
    }
    console.log('PDF Status:', text);
  };

  const cleanup = () => {
    // Não precisamos remover o element do DOM porque nem vamos anexá-lo!
    if (loadingModal) {
      loadingModal.style.display = 'none';
      const modalTitle = loadingModal.querySelector('.modal-title');
      const modalDesc = loadingModal.querySelector('.modal-desc');
      if (modalTitle && originalTitle) modalTitle.innerHTML = originalTitle;
      if (modalDesc && originalDesc) modalDesc.innerHTML = originalDesc;
    }
  };

  try {
    updateStatus('Preparando documento visual...');

    // Garantir que a largura está em px e não em mm para evitar bug do html2canvas
    if (element.style.width && element.style.width.includes('mm')) {
       element.style.width = '800px';
    }

    // NÃO anexamos o elemento ao document.body!
    // Usaremos outerHTML para que o html2pdf renderize num iframe seguro internamente.
    const htmlString = element.outerHTML;

    await new Promise(resolve => setTimeout(resolve, 300));

    updateStatus('Iniciando conversão...');
    
    const isNative = window.Capacitor && window.Capacitor.isNative;
    
    opt.html2canvas = {
      ...opt.html2canvas,
      scale: 2,
      useCORS: true,
      logging: false
    };

    if (!isNative) {
      updateStatus('Gerando PDF Web...');
      await html2pdf().set(opt).from(htmlString).save();
      cleanup();
      return;
    }

    updateStatus('Renderizando páginas...');
    const dataUri = await html2pdf().set(opt).from(htmlString).outputPdf('datauristring');

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
const startIdx = html.indexOf('async function exportPDFElement');
const endIdx = html.indexOf('async function downloadCustomPeriodPDF');

if (startIdx > -1 && endIdx > -1) {
  html = html.substring(0, startIdx) + newFunc + '\n\n' + html.substring(endIdx);
  // Remover qualquer document.body.appendChild(element); de downloadReportPDF etc.
  html = html.replace(/document\.body\.appendChild\(element\);/g, '// document.body.appendChild(element); removed for safe HTML rendering');
  
  fs.writeFileSync('public/index.html', html);
  console.log('public/index.html updated successfully.');
  
  if (fs.existsSync('android/app/src/main/assets/public/index.html')) {
     fs.writeFileSync('android/app/src/main/assets/public/index.html', html);
     console.log('android index.html updated successfully.');
  }
} else {
  console.error('Could not find function bounds.');
}
