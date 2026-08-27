'use client';

import { useState, useTransition } from 'react';
import { ativarContrato, encerrarContrato, reajustarContrato } from '../acoes';

export function AcoesContrato({ id, situacao }: { id: string; situacao: string }) {
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

  function pedirReajuste() {
    const informado = prompt('Percentual de reajuste (ex.: 4.5 para 4,5%)');

    if (informado === null) {
      return;
    }

    const percentual = Number(informado.replace(',', '.'));

    if (Number.isNaN(percentual)) {
      setErro('Percentual inválido');
      return;
    }

    executar(() => reajustarContrato(id, percentual));
  }

  return (
    <div className="acoes-cabecalho">
      {erro ? <p className="alerta-erro">{erro}</p> : null}

      {situacao === 'RASCUNHO' ? (
        <button
          type="button"
          className="botao botao-primario"
          disabled={pendente}
          onClick={() =>
            executar(
              () => ativarContrato(id),
              'Ativar o contrato? O imóvel passa a constar como alugado e as cobranças começam a ser geradas.',
            )
          }
        >
          Ativar contrato
        </button>
      ) : null}

      {situacao === 'ATIVO' ? (
        <>
          <button type="button" className="botao" disabled={pendente} onClick={pedirReajuste}>
            Reajustar
          </button>
          <button
            type="button"
            className="botao"
            disabled={pendente}
            onClick={() =>
              executar(
                () => encerrarContrato(id, new Date().toISOString().slice(0, 10)),
                'Encerrar o contrato hoje? As cobranças futuras pendentes serão canceladas.',
              )
            }
          >
            Encerrar
          </button>
        </>
      ) : null}
    </div>
  );
}
