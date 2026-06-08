
  // Early error catching
  window.onerror = function(msg, url, line, col, error) {
    console.error("Critical Error:", msg, "at", url, ":", line);
    const status = document.getElementById('preloaderStatus');
    if (status) status.innerHTML = '<span style="color:#ff8787">Erro crítico ao iniciar. Tente recarregar.</span>';
    const skip = document.getElementById('skipPreloader');
    if (skip) skip.style.display = 'block';
    return false;
  };
