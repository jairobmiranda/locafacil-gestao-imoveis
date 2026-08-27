'use client';

import { useState, useTransition } from 'react';
import { cancelarLancamento, estornarLancamento, gerarPix } from '../acoes';

export function AcoesLancamento({
  id,
  situacao,
  natureza,
}: {
  id: string;
  situacao: string;
  natureza: 'ENTRADA' | 'SAIDA';
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  function executar(acao: () => Promise<void>, confirmacao?: string) {
    if (confirmacao && !confirm(confirmacao)) {
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      try {
        await acao();
      } catch (falha) {
        setErro((falha as Error).message);
      }
    });
  }

  const pago = situacao === 'PAGO' || situacao === 'PARCIAL';
  const aberto = situacao === 'PENDENTE' || situacao === 'ATRASADO';

  return (
    <div className="acoes-cabecalho">
      {erro ? <p className="alerta-erro">{erro}</p> : null}

      {aberto && natureza === 'ENTRADA' ? (
        <button
          type="button"
          className="botao"
          disabled={pendente}
          onClick={() => executar(() => gerarPix(id))}
        >
          Gerar Pix
        </button>
      ) : null}

      {pago ? (
        <button
          type="button"
          className="botao"
          disabled={pendente}
          onClick={() =>
            executar(
              () => estornarLancamento(id),
              'Estornar o pagamento? O lançamento volta para pendente.',
            )
          }
        >
          Estornar
        </button>
      ) : null}

      {aberto ? (
        <button
          type="button"
          className="botao"
          disabled={pendente}
          onClick={() =>
            executar(
              () => cancelarLancamento(id),
              'Cancelar o lançamento? As cobranças na fila também serão canceladas.',
            )
          }
        >
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
