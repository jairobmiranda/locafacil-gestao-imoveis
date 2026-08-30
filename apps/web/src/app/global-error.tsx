'use client';

import { useEffect } from 'react';

/**
 * Rede instavel ou deploy no meio da navegacao deixam chunks orfaos. Em vez da
 * tela crua do Next, recarregar uma vez costuma resolver sem o usuario perceber.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const falhaDeCarregamento = /chunk|dynamically imported module|Failed to fetch/i.test(
      error.message,
    );

    if (!falhaDeCarregamento || sessionStorage.getItem('recarregou-por-erro')) {
      return;
    }

    sessionStorage.setItem('recarregou-por-erro', '1');
    location.reload();
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="tela-login">
          <div className="cartao formulario-login">
            <h1>Algo deu errado</h1>
            <p className="texto-suave">
              A página não carregou por completo. Tente de novo; se insistir, saia e entre
              novamente.
            </p>
            <div className="acoes-formulario">
              <button type="button" className="botao botao-primario" onClick={() => reset()}>
                Tentar de novo
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
