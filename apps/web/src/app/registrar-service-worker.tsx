'use client';

import { useEffect } from 'react';

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falha no registro nao pode derrubar a aplicacao.
    });
  }, []);

  return null;
}
