'use client';

import { useEffect } from 'react';

export default function ErroPagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="cartao vazio">
      <h2>Não foi possível carregar esta tela</h2>
      <p className="texto-suave">{error.message}</p>
      {error.digest ? <p className="texto-suave">Referência: {error.digest}</p> : null}

      <div className="acoes-formulario" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button type="button" className="botao botao-primario" onClick={reset}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
