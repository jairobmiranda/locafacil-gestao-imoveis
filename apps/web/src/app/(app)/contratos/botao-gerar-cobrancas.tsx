'use client';

import { useState, useTransition } from 'react';
import { gerarCobrancasAgora } from './acoes';

export function BotaoGerarCobrancas() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  return (
    <>
      {erro ? <p className="alerta-erro">{erro}</p> : null}
      <button
        type="button"
        className="botao"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(undefined);
            try {
              await gerarCobrancasAgora();
            } catch (falha) {
              setErro((falha as Error).message);
            }
          })
        }
      >
        {pendente ? 'Gerando...' : 'Gerar cobranças agora'}
      </button>
    </>
  );
}
