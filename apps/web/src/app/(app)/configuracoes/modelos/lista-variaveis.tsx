'use client';

import { useState } from 'react';

/** Cada variavel copia o marcador pronto, evitando erro de digitacao nas chaves duplas. */
export function ListaVariaveis({ variaveis }: { variaveis: string[] }) {
  const [copiada, setCopiada] = useState<string>();

  async function copiar(variavel: string) {
    await navigator.clipboard.writeText(`{{${variavel}}}`);
    setCopiada(variavel);
    setTimeout(() => setCopiada(undefined), 1500);
  }

  return (
    <div className="cartao">
      <h2>Variáveis disponíveis</h2>
      <p className="texto-suave">
        Clique para copiar. Use no assunto ou no corpo. No corpo, o seletor da barra de ferramentas
        insere direto no cursor.
      </p>

      <div className="variaveis">
        {variaveis.map((variavel) => (
          <button
            key={variavel}
            type="button"
            className={copiada === variavel ? 'variavel copiada' : 'variavel'}
            title="Copiar"
            onClick={() => copiar(variavel)}
          >
            {copiada === variavel ? 'copiado' : `{{${variavel}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}
