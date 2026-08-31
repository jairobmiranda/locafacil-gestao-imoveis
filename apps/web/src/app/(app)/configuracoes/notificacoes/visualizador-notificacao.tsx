'use client';

import { useEffect, useState } from 'react';
import { formatarDataHora } from '@/lib/formato';
import { obterNotificacao, type NotificacaoDetalhe } from '../acoes';

export function VisualizadorNotificacao({ id, aoFechar }: { id: string; aoFechar: () => void }) {
  const [detalhe, setDetalhe] = useState<NotificacaoDetalhe>();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    let ativo = true;

    obterNotificacao(id)
      .then((dados) => ativo && setDetalhe(dados))
      .catch((falha: Error) => ativo && setErro(falha.message));

    return () => {
      ativo = false;
    };
  }, [id]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        aoFechar();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div className="sobreposicao" onClick={aoFechar}>
      <div
        className="janela"
        role="dialog"
        aria-modal="true"
        aria-label="Conteúdo enviado"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="janela-cabecalho">
          <div>
            <h2>{detalhe?.assunto ?? 'Conteúdo enviado'}</h2>
            {detalhe ? (
              <p className="texto-suave">
                Para {detalhe.destinatario}
                {detalhe.copia ? ` · cópia para ${detalhe.copia}` : ''}
                {detalhe.enviadoEm
                  ? ` · enviado em ${formatarDataHora(detalhe.enviadoEm)}`
                  : ` · ainda não enviado (agendado para ${formatarDataHora(detalhe.agendadoPara)})`}
              </p>
            ) : null}
          </div>
          <button type="button" className="botao botao-texto" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        <div className="janela-corpo">
          {erro ? <p className="alerta-erro">{erro}</p> : null}
          {detalhe?.mensagemErro ? <p className="alerta-erro">{detalhe.mensagemErro}</p> : null}

          {!detalhe && !erro ? <p className="texto-suave">Carregando...</p> : null}

          {detalhe ? (
            // sandbox vazio: o HTML do e-mail é exibido sem script nem acesso à sessão.
            <iframe
              className="previa-email"
              title="Corpo do e-mail"
              sandbox=""
              srcDoc={detalhe.corpoRenderizado}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
