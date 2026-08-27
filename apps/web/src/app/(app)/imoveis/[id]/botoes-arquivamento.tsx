'use client';

import { useTransition } from 'react';
import { arquivarImovel, restaurarImovel } from '../acoes';

export function BotoesArquivamento({ id, arquivado }: { id: string; arquivado: boolean }) {
  const [pendente, iniciar] = useTransition();

  function alternar() {
    if (!arquivado && !confirm('Arquivar este imóvel? Ele sai das listagens padrão.')) {
      return;
    }

    iniciar(async () => {
      await (arquivado ? restaurarImovel(id) : arquivarImovel(id));
    });
  }

  return (
    <button type="button" className="botao" onClick={alternar} disabled={pendente}>
      {arquivado ? 'Restaurar' : 'Arquivar'}
    </button>
  );
}
