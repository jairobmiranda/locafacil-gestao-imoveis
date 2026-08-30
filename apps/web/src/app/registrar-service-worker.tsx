'use client';

import { useEffect } from 'react';

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
      return;
    }

    // Depois do load: registrar durante a hidratacao concorre com o download dos chunks.
    const registrar = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Falha no registro nao pode derrubar a aplicacao.
      });
    };

    if (document.readyState === 'complete') {
      registrar();
      return;
    }

    window.addEventListener('load', registrar);

    return () => window.removeEventListener('load', registrar);
  }, []);

  return null;
}
